/**
 * Lightweight CDC Capture Service
 * Uses PostgreSQL LISTEN/NOTIFY for change capture (no Debezium needed)
 */

import { Pool, PoolClient } from 'pg'
import Redis from 'ioredis'
import { EventEmitter } from 'events'
import pino from 'pino'

// Initialize logger
const logger = pino({
  name: 'lightweight-cdc-capture',
  level: process.env.LOG_LEVEL || 'info'
})

// Type definitions
export interface CDCCaptureConfig {
  timescaleDb: {
    connectionString: string
    maxConnections: number
  }
  redis: {
    url: string
  }
  capture: {
    tables: string[]
    batchSize: number
    flushInterval: number
  }
}

export interface DatabaseChange {
  operation: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  data: any
  oldData?: any
  timestamp: Date
  transactionId?: string
}

export interface CaptureMetrics {
  changesCaptures: number
  eventsPublished: number
  errors: number
  avgLatency: number
  lastChangeTime?: Date
  uptime: number
}

/**
 * Lightweight CDC Capture Service
 * Alternative to Debezium for simple use cases
 */
export class LightweightCDCCapture extends EventEmitter {
  private pgPool: Pool
  private redis: Redis
  private config: CDCCaptureConfig
  private metrics: CaptureMetrics
  private startTime: Date
  private isRunning = false
  private listenerClient?: PoolClient
  private pollingInterval?: NodeJS.Timeout

  constructor(config: CDCCaptureConfig) {
    super()
    this.config = config
    this.startTime = new Date()
    this.metrics = this.initializeMetrics()

    // Initialize PostgreSQL pool
    this.pgPool = new Pool({
      connectionString: config.timescaleDb.connectionString,
      max: config.timescaleDb.maxConnections,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    // Initialize Redis client
    this.redis = new Redis(config.redis.url)

    this.setupEventHandlers()
    logger.info('Lightweight CDC Capture initialized', { tables: config.capture.tables })
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): CaptureMetrics {
    return {
      changesCaptures: 0,
      eventsPublished: 0,
      errors: 0,
      avgLatency: 0,
      uptime: 0
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
      logger.error('Redis error', { error: error.message })
      this.emit('redisError', error)
    })

    this.pgPool.on('connect', () => {
      logger.debug('New PostgreSQL connection established')
    })

    this.pgPool.on('error', (error) => {
      logger.error('PostgreSQL pool error', { error: error.message })
      this.emit('pgError', error)
    })
  }

  /**
   * Start CDC capture
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('CDC capture is already running')
    }

    logger.info('Starting Lightweight CDC Capture')

    try {
      // Setup database triggers and functions
      await this.setupDatabaseTriggers()

      // Start listening for notifications
      await this.startListening()

      // Start polling for missed changes (fallback)
      this.startPolling()

      this.isRunning = true
      logger.info('Lightweight CDC Capture started successfully')
      this.emit('started')

    } catch (error) {
      logger.error('Failed to start CDC capture', { error: error.message })
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Setup database triggers for change capture
   */
  private async setupDatabaseTriggers(): Promise<void> {
    const client = await this.pgPool.connect()
    
    try {
      // Create notification function
      await client.query(`
        CREATE OR REPLACE FUNCTION notify_cdc_change()
        RETURNS trigger AS $$
        DECLARE
          change_data json;
        BEGIN
          -- Create change data payload
          IF TG_OP = 'DELETE' THEN
            change_data = json_build_object(
              'operation', TG_OP,
              'table', TG_TABLE_NAME,
              'schema', TG_TABLE_SCHEMA,
              'timestamp', extract(epoch from now()) * 1000,
              'old_data', row_to_json(OLD)
            );
            PERFORM pg_notify('cdc_changes', change_data::text);
            RETURN OLD;
          ELSE
            change_data = json_build_object(
              'operation', TG_OP,
              'table', TG_TABLE_NAME,
              'schema', TG_TABLE_SCHEMA,
              'timestamp', extract(epoch from now()) * 1000,
              'data', row_to_json(NEW),
              'old_data', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
            );
            PERFORM pg_notify('cdc_changes', change_data::text);
            RETURN NEW;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `)

      // Create triggers for each monitored table
      for (const table of this.config.capture.tables) {
        const triggerName = `cdc_trigger_${table}`
        
        // Drop existing trigger if exists
        await client.query(`
          DROP TRIGGER IF EXISTS ${triggerName} ON ${table}
        `)

        // Create new trigger
        await client.query(`
          CREATE TRIGGER ${triggerName}
            AFTER INSERT OR UPDATE OR DELETE ON ${table}
            FOR EACH ROW
            EXECUTE FUNCTION notify_cdc_change()
        `)

        logger.debug('Created CDC trigger', { table, trigger: triggerName })
      }

      logger.info('Database triggers setup complete')

    } finally {
      client.release()
    }
  }

  /**
   * Start listening for PostgreSQL notifications
   */
  private async startListening(): Promise<void> {
    this.listenerClient = await this.pgPool.connect()

    // Set up notification handler
    this.listenerClient.on('notification', async (notification) => {
      if (notification.channel === 'cdc_changes' && notification.payload) {
        await this.handleDatabaseChange(notification.payload)
      }
    })

    // Start listening
    await this.listenerClient.query('LISTEN cdc_changes')
    logger.info('Started listening for database changes')
  }

  /**
   * Handle database change notification
   */
  private async handleDatabaseChange(payload: string): Promise<void> {
    const startTime = Date.now()

    try {
      const change = JSON.parse(payload) as DatabaseChange
      change.timestamp = new Date(change.timestamp)

      logger.debug('Received database change', {
        operation: change.operation,
        table: change.table
      })

      // Publish to Redis Stream
      await this.publishToRedisStream(change)

      // Update metrics
      this.metrics.changesCaptures++
      this.metrics.eventsPublished++
      this.metrics.lastChangeTime = new Date()
      
      const latency = Date.now() - startTime
      this.updateLatencyMetrics(latency)

      this.emit('changeCaptures', change)

    } catch (error) {
      this.metrics.errors++
      logger.error('Failed to handle database change', {
        error: error.message,
        payload: payload.substring(0, 200) // Truncate for logging
      })
      this.emit('error', error)
    }
  }

  /**
   * Publish change to Redis Stream
   */
  private async publishToRedisStream(change: DatabaseChange): Promise<void> {
    const streamName = `stream:${change.table}`
    
    const streamData = {
      operation: change.operation,
      table: change.table,
      schema: change.schema,
      timestamp: change.timestamp.toISOString(),
      data: JSON.stringify(change.data),
      old_data: change.oldData ? JSON.stringify(change.oldData) : null,
      capture_time: new Date().toISOString()
    }

    // Add to Redis Stream
    await this.redis.xadd(
      streamName,
      '*', // Auto-generate ID
      ...Object.entries(streamData).flat().filter(Boolean)
    )

    // Trim stream to prevent unlimited growth (keep last 10k messages)
    await this.redis.xtrim(streamName, 'MAXLEN', '~', 10000)

    logger.debug('Published to Redis Stream', {
      stream: streamName,
      operation: change.operation
    })
  }

  /**
   * Start polling for missed changes (fallback mechanism)
   */
  private startPolling(): void {
    const pollInterval = this.config.capture.flushInterval || 30000 // 30 seconds

    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollForMissedChanges()
      } catch (error) {
        logger.warn('Polling for missed changes failed', {
          error: error.message
        })
      }
    }, pollInterval)
  }

  /**
   * Poll for changes that might have been missed by notifications
   */
  private async pollForMissedChanges(): Promise<void> {
    // Simple implementation: check for recent changes based on timestamps
    // This is a fallback mechanism in case notifications are missed
    
    const client = await this.pgPool.connect()
    
    try {
      for (const table of this.config.capture.tables) {
        // Check for recent changes (last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
        
        const result = await client.query(`
          SELECT COUNT(*) as recent_changes
          FROM ${table}
          WHERE time > $1
        `, [fiveMinutesAgo])

        const recentChanges = parseInt(result.rows[0].recent_changes)
        
        if (recentChanges > 0) {
          logger.debug('Detected recent changes via polling', {
            table,
            count: recentChanges
          })
        }
      }
    } finally {
      client.release()
    }
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    const totalCaptures = this.metrics.changesCaptures
    this.metrics.avgLatency = (
      (this.metrics.avgLatency * (totalCaptures - 1) + latency) / totalCaptures
    )
  }

  /**
   * Get current metrics
   */
  getMetrics(): CaptureMetrics {
    const uptime = Date.now() - this.startTime.getTime()
    return {
      ...this.metrics,
      uptime: Math.floor(uptime / 1000)
    }
  }

  /**
   * Get Redis stream information
   */
  async getStreamInfo(): Promise<{
    streamName: string
    length: number
    lastId: string
  }[]> {
    const streams = this.config.capture.tables.map(table => `stream:${table}`)
    const streamInfo = []

    for (const streamName of streams) {
      try {
        const info = await this.redis.xinfo('STREAM', streamName)
        streamInfo.push({
          streamName,
          length: info[1] as number,
          lastId: info[3] as string
        })
      } catch (error) {
        // Stream might not exist yet
        streamInfo.push({
          streamName,
          length: 0,
          lastId: '0-0'
        })
      }
    }

    return streamInfo
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy'
    postgres: boolean
    redis: boolean
    listening: boolean
    lastChange?: Date
  }> {
    let postgresHealthy = false
    let redisHealthy = false

    // Check PostgreSQL
    try {
      const client = await this.pgPool.connect()
      await client.query('SELECT 1')
      client.release()
      postgresHealthy = true
    } catch (error) {
      logger.warn('PostgreSQL health check failed', { error: error.message })
    }

    // Check Redis
    try {
      await this.redis.ping()
      redisHealthy = true
    } catch (error) {
      logger.warn('Redis health check failed', { error: error.message })
    }

    const isListening = !!this.listenerClient && !this.listenerClient.processID

    return {
      status: (postgresHealthy && redisHealthy && isListening) ? 'healthy' : 'unhealthy',
      postgres: postgresHealthy,
      redis: redisHealthy,
      listening: isListening,
      lastChange: this.metrics.lastChangeTime
    }
  }

  /**
   * Stop CDC capture
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    logger.info('Stopping Lightweight CDC Capture')

    this.isRunning = false

    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = undefined
    }

    // Stop listening
    if (this.listenerClient) {
      try {
        await this.listenerClient.query('UNLISTEN cdc_changes')
        this.listenerClient.release()
        this.listenerClient = undefined
      } catch (error) {
        logger.warn('Error stopping listener', { error: error.message })
      }
    }

    // Close connections
    await Promise.all([
      this.pgPool.end(),
      this.redis.quit()
    ])

    logger.info('Lightweight CDC Capture stopped')
    this.emit('stopped')
  }
}

/**
 * Create Lightweight CDC Capture with environment configuration
 */
export function createLightweightCDCCapture(config?: Partial<CDCCaptureConfig>): LightweightCDCCapture {
  const defaultConfig: CDCCaptureConfig = {
    timescaleDb: {
      connectionString: process.env.TIMESCALEDB_URL || 'postgres://localhost/tsdb',
      maxConnections: 5
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    capture: {
      tables: ['sensor_readings', 'pipeline_metrics', 'bearing_vibration_data'],
      batchSize: 100,
      flushInterval: 30000
    }
  }

  const finalConfig = {
    ...defaultConfig,
    ...config,
    timescaleDb: { ...defaultConfig.timescaleDb, ...config?.timescaleDb },
    redis: { ...defaultConfig.redis, ...config?.redis },
    capture: { ...defaultConfig.capture, ...config?.capture }
  }

  return new LightweightCDCCapture(finalConfig)
}

export default LightweightCDCCapture