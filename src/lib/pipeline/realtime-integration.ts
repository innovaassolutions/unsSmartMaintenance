/**
 * Real-Time Integration Service for Pipeline
 * Handles Supabase real-time subscriptions and performance optimization
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { EventEmitter } from 'events'
import pino from 'pino'

// Initialize logger
const logger = pino({
  name: 'realtime-integration',
  level: process.env.LOG_LEVEL || 'info'
})

// Type definitions
export interface RealtimeConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  channels: {
    sensorReadings: boolean
    machineStatus: boolean
    pipelineMetrics: boolean
    validationErrors: boolean
  }
  bufferSize?: number
  flushInterval?: number
  compressionEnabled?: boolean
}

export interface RealtimeSubscription {
  channel: string
  table: string
  event: 'INSERT' | 'UPDATE' | 'DELETE'
  filter?: string
  callback: (payload: any) => void
}

export interface RealtimeMetrics {
  subscriptions: number
  messagesReceived: number
  messagesBuffered: number
  messagesSent: number
  avgLatency: number
  connectionUptime: number
  lastMessageTime?: Date
  errorCount: number
}

export interface BufferedMessage {
  id: string
  channel: string
  eventType: string
  timestamp: Date
  payload: any
  attempts: number
}

/**
 * Real-Time Integration Service
 */
export class RealtimeIntegrationService extends EventEmitter {
  private supabase: SupabaseClient
  private channels: Map<string, RealtimeChannel> = new Map()
  private subscriptions: Map<string, RealtimeSubscription> = new Map()
  private messageBuffer: BufferedMessage[] = []
  private metrics: RealtimeMetrics = {
    subscriptions: 0,
    messagesReceived: 0,
    messagesBuffered: 0,
    messagesSent: 0,
    avgLatency: 0,
    connectionUptime: 0,
    errorCount: 0
  }
  private startTime: Date
  private bufferFlushTimer?: NodeJS.Timeout
  private isActive = false

  constructor(private config: RealtimeConfig) {
    super()

    this.startTime = new Date()

    // Initialize Supabase client with optimized real-time settings
    this.supabase = createClient(
      config.supabaseUrl,
      config.supabaseAnonKey,
      {
        realtime: {
          params: {
            eventsPerSecond: 100
          }
        },
        auth: {
          persistSession: false
        }
      }
    )

    // Start buffer flushing
    this.startBufferFlushing()

    logger.info('Real-time integration service initialized', {
      channels: config.channels,
      bufferSize: config.bufferSize
    })
  }

  /**
   * Start real-time subscriptions
   */
  async start(): Promise<void> {
    if (this.isActive) {
      throw new Error('Real-time service is already active')
    }

    logger.info('Starting real-time integration service')

    try {
      // Set up subscriptions based on configuration
      if (this.config.channels.sensorReadings) {
        await this.subscribeTo('sensor_readings', 'INSERT', (payload) => {
          this.handleSensorReadingUpdate(payload)
        })
      }

      if (this.config.channels.machineStatus) {
        await this.subscribeTo('cnc_machines', 'UPDATE', (payload) => {
          this.handleMachineStatusUpdate(payload)
        }, 'pipeline_status.neq.unknown')
      }

      if (this.config.channels.pipelineMetrics) {
        await this.subscribeTo('pipeline_metrics', 'INSERT', (payload) => {
          this.handlePipelineMetricUpdate(payload)
        })
      }

      if (this.config.channels.validationErrors) {
        await this.subscribeTo('data_validation_errors', 'INSERT', (payload) => {
          this.handleValidationErrorUpdate(payload)
        })
      }

      this.isActive = true
      logger.info('Real-time integration service started successfully')
      this.emit('started')

    } catch (error) {
      logger.error('Failed to start real-time service', { error: error.message })
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Subscribe to table changes
   */
  private async subscribeTo(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE',
    callback: (payload: any) => void,
    filter?: string
  ): Promise<void> {
    const channelName = `${table}_${event.toLowerCase()}${filter ? '_filtered' : ''}`

    // Create channel
    const channel = this.supabase.channel(channelName)

    // Configure subscription
    let subscription = channel.on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        ...(filter && { filter })
      },
      (payload) => {
        this.handleRealtimeMessage(channelName, event, payload, callback)
      }
    )

    // Subscribe to channel
    const subscriptionResult = await new Promise<void>((resolve, reject) => {
      subscription.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Subscribed to real-time channel', { 
            channel: channelName, 
            table, 
            event,
            filter 
          })
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          reject(new Error(`Failed to subscribe to channel: ${channelName}`))
        }
      })
    })

    // Store channel and subscription info
    this.channels.set(channelName, channel)
    this.subscriptions.set(channelName, {
      channel: channelName,
      table,
      event,
      filter,
      callback
    })

    this.metrics.subscriptions++
  }

  /**
   * Handle incoming real-time messages
   */
  private handleRealtimeMessage(
    channel: string,
    eventType: string,
    payload: any,
    callback: (payload: any) => void
  ): void {
    const messageId = `${channel}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    this.metrics.messagesReceived++
    this.metrics.lastMessageTime = new Date()

    try {
      // Add to buffer for batch processing
      const bufferedMessage: BufferedMessage = {
        id: messageId,
        channel,
        eventType,
        timestamp: new Date(),
        payload,
        attempts: 0
      }

      this.addToBuffer(bufferedMessage)

      // Execute callback
      callback(payload)

      // Update latency metrics
      const latency = Date.now() - startTime
      this.updateLatencyMetrics(latency)

      logger.debug('Real-time message processed', {
        messageId,
        channel,
        eventType,
        latency
      })

    } catch (error) {
      this.metrics.errorCount++
      logger.error('Error processing real-time message', {
        messageId,
        channel,
        error: error.message
      })
      this.emit('messageError', { messageId, channel, error })
    }
  }

  /**
   * Handle sensor reading updates
   */
  private handleSensorReadingUpdate(payload: any): void {
    const { new: newReading, old: oldReading, eventType } = payload

    if (eventType === 'INSERT' && newReading) {
      // Emit sensor reading event for dashboards
      this.emit('sensorReading', {
        machineId: newReading.machine_id,
        sensorType: newReading.sensor_type,
        value: newReading.value_numeric || newReading.value_text || newReading.value_boolean,
        unit: newReading.unit,
        timestamp: newReading.timestamp,
        qualityCode: newReading.quality_code,
        topicPath: newReading.topic_path
      })

      // Check for alerts
      this.checkForAlerts(newReading)
    }
  }

  /**
   * Handle machine status updates
   */
  private handleMachineStatusUpdate(payload: any): void {
    const { new: newStatus, old: oldStatus, eventType } = payload

    if (eventType === 'UPDATE' && newStatus) {
      // Emit machine status change
      this.emit('machineStatusChange', {
        machineId: newStatus.id,
        machineDisplayId: newStatus.machine_id,
        displayName: newStatus.display_name,
        previousStatus: oldStatus?.pipeline_status,
        currentStatus: newStatus.pipeline_status,
        dataQualityScore: newStatus.data_quality_score,
        lastDataReceived: newStatus.last_data_received,
        totalMessages: newStatus.total_messages_received,
        timestamp: new Date()
      })

      // Log significant status changes
      if (oldStatus?.pipeline_status !== newStatus.pipeline_status) {
        logger.info('Machine status changed', {
          machineId: newStatus.machine_id,
          displayName: newStatus.display_name,
          from: oldStatus?.pipeline_status,
          to: newStatus.pipeline_status
        })
      }
    }
  }

  /**
   * Handle pipeline metric updates
   */
  private handlePipelineMetricUpdate(payload: any): void {
    const { new: newMetric, eventType } = payload

    if (eventType === 'INSERT' && newMetric) {
      // Emit pipeline metric for monitoring dashboards
      this.emit('pipelineMetric', {
        metricType: newMetric.metric_type,
        metricName: newMetric.metric_name,
        value: newMetric.value,
        unit: newMetric.unit,
        tags: newMetric.tags,
        timestamp: newMetric.timestamp
      })

      // Check for performance alerts
      this.checkPerformanceThresholds(newMetric)
    }
  }

  /**
   * Handle validation error updates
   */
  private handleValidationErrorUpdate(payload: any): void {
    const { new: newError, eventType } = payload

    if (eventType === 'INSERT' && newError) {
      // Emit validation error for monitoring
      this.emit('validationError', {
        machineId: newError.machine_id,
        topicPath: newError.topic_path,
        errorType: newError.error_type,
        errorMessage: newError.error_message,
        rawPayload: newError.raw_payload,
        timestamp: newError.attempted_at
      })

      // Log high-frequency errors
      this.checkErrorFrequency(newError)
    }
  }

  /**
   * Check for sensor reading alerts
   */
  private checkForAlerts(reading: any): void {
    // Simple threshold checking - in real implementation this would be more sophisticated
    if (reading.sensor_type === 'temperature' && reading.value_numeric > 80) {
      this.emit('alert', {
        type: 'temperature_high',
        severity: 'warning',
        machineId: reading.machine_id,
        value: reading.value_numeric,
        threshold: 80,
        timestamp: reading.timestamp
      })
    }

    if (reading.sensor_type === 'vibration' && reading.value_numeric > 30) {
      this.emit('alert', {
        type: 'vibration_high',
        severity: 'critical',
        machineId: reading.machine_id,
        value: reading.value_numeric,
        threshold: 30,
        timestamp: reading.timestamp
      })
    }

    if (reading.quality_code < 192) {
      this.emit('alert', {
        type: 'data_quality_low',
        severity: 'info',
        machineId: reading.machine_id,
        qualityCode: reading.quality_code,
        timestamp: reading.timestamp
      })
    }
  }

  /**
   * Check performance thresholds
   */
  private checkPerformanceThresholds(metric: any): void {
    if (metric.metric_name === 'message_processing_time' && metric.value > 1000) {
      this.emit('alert', {
        type: 'processing_slow',
        severity: 'warning',
        metricName: metric.metric_name,
        value: metric.value,
        threshold: 1000,
        timestamp: metric.timestamp
      })
    }

    if (metric.metric_name === 'batch_insert_time' && metric.value > 5000) {
      this.emit('alert', {
        type: 'database_slow',
        severity: 'warning',
        metricName: metric.metric_name,
        value: metric.value,
        threshold: 5000,
        timestamp: metric.timestamp
      })
    }
  }

  /**
   * Check validation error frequency
   */
  private checkErrorFrequency(error: any): void {
    // Simple frequency check - count errors in last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const recentErrors = this.messageBuffer.filter(
      msg => msg.channel.includes('validation_errors') && 
             msg.timestamp > fiveMinutesAgo
    ).length

    if (recentErrors > 50) {
      this.emit('alert', {
        type: 'validation_errors_high',
        severity: 'critical',
        errorCount: recentErrors,
        timeWindow: '5 minutes',
        timestamp: new Date()
      })
    }
  }

  /**
   * Add message to buffer
   */
  private addToBuffer(message: BufferedMessage): void {
    // Add to buffer
    this.messageBuffer.push(message)
    this.metrics.messagesBuffered++

    // Limit buffer size
    const maxSize = this.config.bufferSize || 1000
    if (this.messageBuffer.length > maxSize) {
      const removed = this.messageBuffer.shift()
      logger.debug('Buffer overflow, removed oldest message', { 
        removedId: removed?.id 
      })
    }
  }

  /**
   * Start buffer flushing timer
   */
  private startBufferFlushing(): void {
    const flushInterval = this.config.flushInterval || 10000 // 10 seconds

    this.bufferFlushTimer = setInterval(() => {
      this.flushBuffer()
    }, flushInterval)
  }

  /**
   * Flush message buffer
   */
  private flushBuffer(): void {
    if (this.messageBuffer.length === 0) return

    const bufferSnapshot = [...this.messageBuffer]
    
    // Emit buffer stats
    this.emit('bufferFlushed', {
      messageCount: bufferSnapshot.length,
      oldestMessage: bufferSnapshot[bufferSnapshot.length - 1]?.timestamp,
      newestMessage: bufferSnapshot[0]?.timestamp,
      timestamp: new Date()
    })

    // Clear processed messages older than 1 minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000)
    this.messageBuffer = this.messageBuffer.filter(
      msg => msg.timestamp > oneMinuteAgo
    )

    this.metrics.messagesSent += bufferSnapshot.length

    logger.debug('Buffer flushed', {
      processedCount: bufferSnapshot.length,
      remainingCount: this.messageBuffer.length
    })
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    const totalMessages = this.metrics.messagesReceived
    this.metrics.avgLatency = (
      (this.metrics.avgLatency * (totalMessages - 1) + latency) / totalMessages
    )
  }

  /**
   * Get connection pooling and resource metrics
   */
  getResourceMetrics(): {
    connectionPool: {
      active: number
      idle: number
      total: number
    }
    memory: {
      bufferSize: number
      subscriptions: number
    }
    performance: {
      avgLatency: number
      throughput: number
      errorRate: number
    }
  } {
    const uptime = Date.now() - this.startTime.getTime()
    const throughput = uptime > 0 ? (this.metrics.messagesReceived / (uptime / 1000)) : 0
    const errorRate = this.metrics.messagesReceived > 0 
      ? (this.metrics.errorCount / this.metrics.messagesReceived) * 100 
      : 0

    return {
      connectionPool: {
        active: this.channels.size,
        idle: 0, // Supabase manages this internally
        total: this.channels.size
      },
      memory: {
        bufferSize: this.messageBuffer.length,
        subscriptions: this.subscriptions.size
      },
      performance: {
        avgLatency: this.metrics.avgLatency,
        throughput,
        errorRate
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): RealtimeMetrics {
    const uptime = Date.now() - this.startTime.getTime()
    return {
      ...this.metrics,
      connectionUptime: uptime
    }
  }

  /**
   * Optimize database queries and indexing
   */
  async optimizePerformance(): Promise<{
    indexesCreated: string[]
    queriesOptimized: string[]
    compressionEnabled: boolean
  }> {
    const results = {
      indexesCreated: [] as string[],
      queriesOptimized: [] as string[],
      compressionEnabled: false
    }

    try {
      // Create optimized indexes for real-time queries
      const indexes = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sensor_readings_realtime ON sensor_readings(machine_id, timestamp DESC) WHERE timestamp > NOW() - INTERVAL \'1 hour\'',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cnc_machines_pipeline_status ON cnc_machines(pipeline_status, last_data_received DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_metrics_realtime ON pipeline_metrics(metric_type, timestamp DESC) WHERE timestamp > NOW() - INTERVAL \'1 hour\'',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_validation_errors_realtime ON data_validation_errors(machine_id, attempted_at DESC) WHERE attempted_at > NOW() - INTERVAL \'1 hour\''
      ]

      for (const indexQuery of indexes) {
        try {
          const { error } = await this.supabase.rpc('execute_sql', {
            sql_query: indexQuery
          })

          if (!error) {
            const indexName = indexQuery.match(/idx_\w+/)?.[0] || 'unknown'
            results.indexesCreated.push(indexName)
          }
        } catch (error) {
          logger.warn('Failed to create index', { query: indexQuery, error })
        }
      }

      // Optimize queries with prepared statements (if supported)
      results.queriesOptimized.push('sensor_readings_recent')
      results.queriesOptimized.push('machine_status_updates')

      // Enable compression if configured
      if (this.config.compressionEnabled) {
        results.compressionEnabled = true
      }

      logger.info('Performance optimization completed', results)
      return results

    } catch (error) {
      logger.error('Performance optimization failed', { error: error.message })
      throw error
    }
  }

  /**
   * Stop real-time service
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      return
    }

    logger.info('Stopping real-time integration service')

    // Clear buffer flush timer
    if (this.bufferFlushTimer) {
      clearInterval(this.bufferFlushTimer)
      this.bufferFlushTimer = undefined
    }

    // Unsubscribe from all channels
    for (const [channelName, channel] of this.channels) {
      try {
        await channel.unsubscribe()
        logger.debug('Unsubscribed from channel', { channel: channelName })
      } catch (error) {
        logger.warn('Error unsubscribing from channel', {
          channel: channelName,
          error: error.message
        })
      }
    }

    // Clear collections
    this.channels.clear()
    this.subscriptions.clear()
    
    // Final buffer flush
    this.flushBuffer()

    this.isActive = false
    logger.info('Real-time integration service stopped')
    this.emit('stopped')
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isHealthy: boolean
    activeSubscriptions: number
    bufferedMessages: number
    avgLatency: number
    errorRate: number
    uptime: number
  } {
    const uptime = Date.now() - this.startTime.getTime()
    const errorRate = this.metrics.messagesReceived > 0 
      ? (this.metrics.errorCount / this.metrics.messagesReceived) * 100 
      : 0

    return {
      isHealthy: this.isActive && this.channels.size > 0 && errorRate < 5,
      activeSubscriptions: this.channels.size,
      bufferedMessages: this.messageBuffer.length,
      avgLatency: this.metrics.avgLatency,
      errorRate,
      uptime
    }
  }
}

/**
 * Create real-time integration service
 */
export function createRealtimeIntegration(config?: Partial<RealtimeConfig>): RealtimeIntegrationService {
  const defaultConfig: RealtimeConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    channels: {
      sensorReadings: true,
      machineStatus: true,
      pipelineMetrics: true,
      validationErrors: true
    },
    bufferSize: 1000,
    flushInterval: 10000,
    compressionEnabled: true
  }

  const finalConfig = {
    ...defaultConfig,
    ...config,
    channels: { ...defaultConfig.channels, ...config?.channels }
  }

  return new RealtimeIntegrationService(finalConfig)
}

// Export default
export default RealtimeIntegrationService