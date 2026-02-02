/**
 * CDC Event Processor for Redis Streams
 * Processes TimescaleDB changes and updates Supabase in real-time
 */

import Redis, { Redis as RedisClient } from 'ioredis'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { EventEmitter } from 'events'
import pino from 'pino'

// Initialize logger
const logger = pino({
  name: 'cdc-event-processor',
  level: process.env.LOG_LEVEL || 'info'
})

// Type definitions
export interface CDCEvent {
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  before?: any
  after?: any
  timestamp: string
  lsn?: string
  transaction_id?: string
}

export interface ProcessedEvent {
  eventId: string
  streamName: string
  operation: string
  table: string
  data: any
  processedAt: Date
  processingTime: number
  success: boolean
  error?: string
}

export interface CDCProcessorConfig {
  redis: {
    host: string
    port: number
    password?: string
    db?: number
  }
  supabase: {
    url: string
    serviceKey: string
  }
  streams: {
    sensorReadings: string
    pipelineMetrics: string
    bearingData: string
  }
  processing: {
    batchSize: number
    maxRetries: number
    retryDelay: number
    consumerGroup: string
    consumerName: string
  }
}

export interface CDCMetrics {
  eventsProcessed: number
  eventsSucceeded: number
  eventsFailed: number
  avgProcessingTime: number
  lastEventTime?: Date
  uptimeSeconds: number
  streamsActive: number
}

/**
 * CDC Event Processor Service
 */
export class CDCEventProcessor extends EventEmitter {
  private redis: RedisClient
  private supabase: SupabaseClient
  private config: CDCProcessorConfig
  private metrics: CDCMetrics
  private startTime: Date
  private isRunning = false
  private processingIntervals: NodeJS.Timeout[] = []

  constructor(config: CDCProcessorConfig) {
    super()
    this.config = config
    this.startTime = new Date()
    this.metrics = this.initializeMetrics()

    // Initialize Redis client
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    })

    // Initialize Supabase client
    this.supabase = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    )

    this.setupEventHandlers()
    logger.info('CDC Event Processor initialized', { 
      streams: config.streams,
      consumerGroup: config.processing.consumerGroup
    })
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): CDCMetrics {
    return {
      eventsProcessed: 0,
      eventsSucceeded: 0,
      eventsFailed: 0,
      avgProcessingTime: 0,
      uptimeSeconds: 0,
      streamsActive: 0
    }
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      logger.info('Connected to Redis')
      this.emit('redisConnected')
    })

    this.redis.on('error', (error) => {
      logger.error('Redis connection error', { error: error.message })
      this.emit('redisError', error)
    })

    this.redis.on('close', () => {
      logger.warn('Redis connection closed')
      this.emit('redisDisconnected')
    })
  }

  /**
   * Start processing CDC events
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('CDC processor is already running')
    }

    logger.info('Starting CDC Event Processor')

    try {
      // Create consumer groups for each stream
      await this.createConsumerGroups()

      // Start processing each stream
      this.startStreamProcessing(this.config.streams.sensorReadings, 'sensor_readings')
      this.startStreamProcessing(this.config.streams.pipelineMetrics, 'pipeline_metrics')
      this.startStreamProcessing(this.config.streams.bearingData, 'bearing_vibration_data')

      this.isRunning = true
      this.metrics.streamsActive = 3

      logger.info('CDC Event Processor started successfully')
      this.emit('started')

    } catch (error) {
      logger.error('Failed to start CDC processor', { error: error.message })
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Create consumer groups for streams
   */
  private async createConsumerGroups(): Promise<void> {
    const streams = Object.values(this.config.streams)
    
    for (const streamName of streams) {
      try {
        await this.redis.xgroup(
          'CREATE',
          streamName,
          this.config.processing.consumerGroup,
          '$',
          'MKSTREAM'
        )
        logger.debug('Created consumer group', { 
          stream: streamName, 
          group: this.config.processing.consumerGroup 
        })
      } catch (error: any) {
        // Group might already exist
        if (!error.message.includes('BUSYGROUP')) {
          logger.warn('Failed to create consumer group', { 
            stream: streamName, 
            error: error.message 
          })
        }
      }
    }
  }

  /**
   * Start processing a specific stream
   */
  private startStreamProcessing(streamName: string, tableName: string): void {
    const processStream = async () => {
      if (!this.isRunning) return

      try {
        const messages = await this.redis.xreadgroup(
          'GROUP',
          this.config.processing.consumerGroup,
          this.config.processing.consumerName,
          'COUNT',
          this.config.processing.batchSize,
          'BLOCK',
          1000,
          'STREAMS',
          streamName,
          '>'
        )

        if (messages && messages.length > 0) {
          for (const [stream, streamMessages] of messages) {
            for (const [messageId, fields] of streamMessages) {
              await this.processEvent(stream, messageId, fields, tableName)
            }
          }
        }
      } catch (error: any) {
        logger.error('Error processing stream', { 
          stream: streamName, 
          error: error.message 
        })
      }
    }

    // Start continuous processing
    const interval = setInterval(processStream, 100) // 100ms polling
    this.processingIntervals.push(interval)
  }

  /**
   * Process individual CDC event
   */
  private async processEvent(
    streamName: string,
    messageId: string,
    fields: string[],
    tableName: string
  ): Promise<void> {
    const startTime = Date.now()
    let success = false
    let error: string | undefined

    try {
      // Parse Redis stream message
      const eventData = this.parseStreamMessage(fields)
      const cdcEvent = this.parseCDCEvent(eventData)

      logger.debug('Processing CDC event', {
        stream: streamName,
        messageId,
        operation: cdcEvent.operation,
        table: cdcEvent.table
      })

      // Route to appropriate handler based on table
      switch (tableName) {
        case 'sensor_readings':
          await this.processSensorReading(cdcEvent)
          break
        case 'pipeline_metrics':
          await this.processPipelineMetric(cdcEvent)
          break
        case 'bearing_vibration_data':
          await this.processBearingData(cdcEvent)
          break
        default:
          logger.warn('Unknown table for CDC event', { table: tableName })
      }

      // Acknowledge message
      await this.redis.xack(streamName, this.config.processing.consumerGroup, messageId)
      
      success = true
      this.metrics.eventsSucceeded++

    } catch (err: any) {
      error = err.message
      this.metrics.eventsFailed++
      logger.error('Failed to process CDC event', {
        stream: streamName,
        messageId,
        error: err.message
      })

      // TODO: Implement retry logic or dead letter queue
    } finally {
      const processingTime = Date.now() - startTime
      this.updateProcessingMetrics(processingTime)

      const processedEvent: ProcessedEvent = {
        eventId: messageId,
        streamName,
        operation: 'UNKNOWN',
        table: tableName,
        data: fields,
        processedAt: new Date(),
        processingTime,
        success,
        error
      }

      this.emit('eventProcessed', processedEvent)
    }
  }

  /**
   * Parse Redis stream message fields
   */
  private parseStreamMessage(fields: string[]): any {
    const data: any = {}
    for (let i = 0; i < fields.length; i += 2) {
      const key = fields[i]
      const value = fields[i + 1]
      
      try {
        // Try to parse as JSON
        data[key] = JSON.parse(value)
      } catch {
        // Keep as string if not JSON
        data[key] = value
      }
    }
    return data
  }

  /**
   * Parse CDC event from stream data
   */
  private parseCDCEvent(eventData: any): CDCEvent {
    return {
      operation: eventData.op || 'INSERT',
      table: eventData.table || 'unknown',
      before: eventData.before,
      after: eventData.after,
      timestamp: eventData.ts_ms ? new Date(eventData.ts_ms).toISOString() : new Date().toISOString(),
      lsn: eventData.lsn,
      transaction_id: eventData.transaction_id
    }
  }

  /**
   * Process sensor reading CDC event
   */
  private async processSensorReading(cdcEvent: CDCEvent): Promise<void> {
    if (cdcEvent.operation === 'INSERT' && cdcEvent.after) {
      const sensorData = cdcEvent.after

      // Update or insert into Supabase sensor_readings view/table
      const { error } = await this.supabase
        .from('sensor_readings_realtime')
        .upsert({
          machine_id: sensorData.machine_id,
          sensor_type: sensorData.sensor_type,
          topic_path: sensorData.topic_path,
          value_numeric: sensorData.value_numeric,
          value_text: sensorData.value_text,
          value_boolean: sensorData.value_boolean,
          unit: sensorData.unit,
          timestamp: sensorData.time,
          quality_code: sensorData.quality_code,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'machine_id,sensor_type'
        })

      if (error) {
        throw new Error(`Failed to update sensor reading: ${error.message}`)
      }

      // Also update machine status
      await this.updateMachineStatus(sensorData.machine_id, {
        last_data_received: new Date(sensorData.time),
        pipeline_status: 'connected'
      })

      logger.debug('Processed sensor reading CDC event', {
        machineId: sensorData.machine_id,
        sensorType: sensorData.sensor_type
      })
    }
  }

  /**
   * Process pipeline metric CDC event
   */
  private async processPipelineMetric(cdcEvent: CDCEvent): Promise<void> {
    if (cdcEvent.operation === 'INSERT' && cdcEvent.after) {
      const metricData = cdcEvent.after

      // Store in Supabase for dashboard display
      const { error } = await this.supabase
        .from('pipeline_metrics_realtime')
        .insert({
          metric_type: metricData.metric_type,
          metric_name: metricData.metric_name,
          value: metricData.value,
          unit: metricData.unit,
          tags: metricData.tags,
          timestamp: metricData.time,
          created_at: new Date().toISOString()
        })

      if (error) {
        throw new Error(`Failed to insert pipeline metric: ${error.message}`)
      }
    }
  }

  /**
   * Process bearing data CDC event (for ML training)
   */
  private async processBearingData(cdcEvent: CDCEvent): Promise<void> {
    if (cdcEvent.operation === 'INSERT' && cdcEvent.after) {
      // This is primarily for ML training data
      // Could trigger ML model updates or feature engineering
      
      this.emit('bearingDataReceived', {
        bearingId: cdcEvent.after.bearing_id,
        channel: cdcEvent.after.channel,
        value: cdcEvent.after.value,
        timestamp: cdcEvent.after.time
      })
    }
  }

  /**
   * Update machine status in Supabase
   */
  private async updateMachineStatus(
    machineId: string,
    status: {
      last_data_received?: Date
      pipeline_status?: string
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('cnc_machines')
      .update({
        ...status,
        updated_at: new Date().toISOString()
      })
      .eq('machine_id', machineId)

    if (error) {
      logger.warn('Failed to update machine status', {
        machineId,
        error: error.message
      })
    }
  }

  /**
   * Update processing metrics
   */
  private updateProcessingMetrics(processingTime: number): void {
    this.metrics.eventsProcessed++
    this.metrics.lastEventTime = new Date()
    
    // Update average processing time
    const totalEvents = this.metrics.eventsProcessed
    this.metrics.avgProcessingTime = (
      (this.metrics.avgProcessingTime * (totalEvents - 1) + processingTime) / totalEvents
    )
  }

  /**
   * Get current metrics
   */
  getMetrics(): CDCMetrics {
    const uptime = Date.now() - this.startTime.getTime()
    return {
      ...this.metrics,
      uptimeSeconds: Math.floor(uptime / 1000)
    }
  }

  /**
   * Get stream information
   */
  async getStreamInfo(): Promise<{
    streamName: string
    length: number
    groups: number
    consumers: number
    lastId: string
  }[]> {
    const streams = Object.values(this.config.streams)
    const streamInfo = []

    for (const streamName of streams) {
      try {
        const info = await this.redis.xinfo('STREAM', streamName)
        const groups = await this.redis.xinfo('GROUPS', streamName)
        
        streamInfo.push({
          streamName,
          length: info[1] as number,
          groups: groups.length,
          consumers: groups.reduce((total: number, group: any) => total + (group[7] as number), 0),
          lastId: info[3] as string
        })
      } catch (error) {
        logger.warn('Failed to get stream info', { stream: streamName, error: error.message })
      }
    }

    return streamInfo
  }

  /**
   * Stop CDC processor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    logger.info('Stopping CDC Event Processor')

    this.isRunning = false

    // Clear all processing intervals
    this.processingIntervals.forEach(interval => clearInterval(interval))
    this.processingIntervals = []

    // Close Redis connection
    await this.redis.quit()

    this.metrics.streamsActive = 0

    logger.info('CDC Event Processor stopped')
    this.emit('stopped')
  }
}

/**
 * Create CDC Event Processor with environment configuration
 */
export function createCDCEventProcessor(config?: Partial<CDCProcessorConfig>): CDCEventProcessor {
  const defaultConfig: CDCProcessorConfig = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    },
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    },
    streams: {
      sensorReadings: 'stream:sensor_readings',
      pipelineMetrics: 'stream:pipeline_metrics',
      bearingData: 'stream:bearing_vibration_data'
    },
    processing: {
      batchSize: 50,
      maxRetries: 3,
      retryDelay: 5000,
      consumerGroup: 'uns-cdc-group',
      consumerName: 'uns-cdc-consumer'
    }
  }

  const finalConfig = {
    ...defaultConfig,
    ...config,
    redis: { ...defaultConfig.redis, ...config?.redis },
    supabase: { ...defaultConfig.supabase, ...config?.supabase },
    streams: { ...defaultConfig.streams, ...config?.streams },
    processing: { ...defaultConfig.processing, ...config?.processing }
  }

  return new CDCEventProcessor(finalConfig)
}

export default CDCEventProcessor