/**
 * Dual Database Integration Service
 * Routes data between Supabase (metadata) and TimescaleDB (time-series)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Pool, PoolClient } from 'pg'
import pino from 'pino'
import { EventEmitter } from 'events'

// Initialize logger
const logger = pino({
  name: 'dual-database-integration',
  level: process.env.LOG_LEVEL || 'info'
})

// Type definitions
export interface DualDatabaseConfig {
  supabase: {
    url: string
    serviceKey: string
  }
  timescale: {
    connectionString: string
    poolSize?: number
  }
  batchSize?: number
  batchFlushInterval?: number
  maxRetries?: number
  retryDelay?: number
}

export interface SensorReading {
  machine_id: string
  sensor_type: string
  topic_path: string
  value_numeric?: number
  value_text?: string
  value_boolean?: boolean
  unit?: string
  timestamp: Date
  quality_code?: number
}

export interface PipelineMetric {
  metric_type: string
  metric_name: string
  value: number
  unit?: string
  tags?: Record<string, any>
  timestamp: Date
}

export interface ValidationError {
  machine_id?: string
  topic_path: string
  error_type: string
  error_message: string
  raw_payload?: string
  attempted_at: Date
}

export interface BatchResult {
  success: boolean
  insertedCount: number
  processingTime: number
  errors?: string[]
}

export interface HealthStatus {
  isHealthy: boolean
  supabaseStatus: 'connected' | 'disconnected' | 'error'
  timescaleStatus: 'connected' | 'disconnected' | 'error'
  pendingBatches: {
    sensorReadings: number
    pipelineMetrics: number
    validationErrors: number
  }
  lastError?: string | undefined
}

/**
 * Dual Database Integration Service
 */
export class DualDatabaseIntegrationService extends EventEmitter {
  private supabaseClient: SupabaseClient
  private timescalePool: Pool
  private config: DualDatabaseConfig
  
  // Batch queues
  private sensorReadingsBatch: SensorReading[] = []
  private pipelineMetricsBatch: PipelineMetric[] = []
  private validationErrorsBatch: ValidationError[] = []
  
  // Timers
  private batchFlushTimer?: NodeJS.Timeout
  private isShuttingDown = false

  constructor(config: DualDatabaseConfig) {
    super()
    this.config = config

    // Initialize Supabase client
    this.supabaseClient = createClient(
      config.supabase.url,
      config.supabase.serviceKey
    )

    // Initialize TimescaleDB connection pool
    this.timescalePool = new Pool({
      connectionString: config.timescale.connectionString,
      max: config.timescale.poolSize || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })

    // Set up batch flush timer
    this.startBatchFlushTimer()

    // Initialize TimescaleDB schema
    this.initializeTimescaleSchema()

    logger.info('Dual database integration service initialized')
  }

  /**
   * Initialize TimescaleDB schema and hypertables
   */
  private async initializeTimescaleSchema(): Promise<void> {
    try {
      const client = await this.timescalePool.connect()
      
      try {
        // Create sensor_readings hypertable
        await client.query(`
          CREATE TABLE IF NOT EXISTS sensor_readings (
            time TIMESTAMPTZ NOT NULL,
            machine_id TEXT NOT NULL,
            sensor_type TEXT NOT NULL,
            topic_path TEXT NOT NULL,
            value_numeric DOUBLE PRECISION,
            value_text TEXT,
            value_boolean BOOLEAN,
            unit TEXT,
            quality_code INTEGER DEFAULT 192
          )
        `)

        // Create hypertable (only if not already exists)
        await client.query(`
          SELECT create_hypertable('sensor_readings', 'time', if_not_exists => TRUE)
        `)

        // Create pipeline_metrics hypertable
        await client.query(`
          CREATE TABLE IF NOT EXISTS pipeline_metrics (
            time TIMESTAMPTZ NOT NULL,
            metric_type TEXT NOT NULL,
            metric_name TEXT NOT NULL,
            value DOUBLE PRECISION NOT NULL,
            unit TEXT,
            tags JSONB
          )
        `)

        await client.query(`
          SELECT create_hypertable('pipeline_metrics', 'time', if_not_exists => TRUE)
        `)

        // Create indexes for common queries
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_sensor_readings_machine_time 
          ON sensor_readings (machine_id, time DESC)
        `)

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_type 
          ON sensor_readings (sensor_type, time DESC)
        `)

        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_pipeline_metrics_type_name 
          ON pipeline_metrics (metric_type, metric_name, time DESC)
        `)

        logger.info('TimescaleDB schema initialized successfully')
      } finally {
        client.release()
      }
    } catch (error: any) {
      logger.error('Failed to initialize TimescaleDB schema', { error: error.message })
      throw error
    }
  }

  /**
   * Add sensor reading to batch (routes to TimescaleDB)
   */
  async addSensorReading(reading: SensorReading): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down')
    }

    this.sensorReadingsBatch.push(reading)

    // Flush batch if it reaches the configured size
    if (this.sensorReadingsBatch.length >= (this.config.batchSize || 100)) {
      await this.flushSensorReadingsBatch()
    }
  }

  /**
   * Add pipeline metric to batch (routes to TimescaleDB)
   */
  async addPipelineMetric(metric: PipelineMetric): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down')
    }

    this.pipelineMetricsBatch.push(metric)

    if (this.pipelineMetricsBatch.length >= (this.config.batchSize || 100)) {
      await this.flushPipelineMetricsBatch()
    }
  }

  /**
   * Add validation error to batch (routes to Supabase)
   */
  async addValidationError(error: ValidationError): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down')
    }

    this.validationErrorsBatch.push(error)

    if (this.validationErrorsBatch.length >= (this.config.batchSize || 100)) {
      await this.flushValidationErrorsBatch()
    }
  }

  /**
   * Flush sensor readings batch to TimescaleDB
   */
  private async flushSensorReadingsBatch(): Promise<void> {
    if (this.sensorReadingsBatch.length === 0) return

    const batch = [...this.sensorReadingsBatch]
    this.sensorReadingsBatch = []

    const startTime = Date.now()

    try {
      const client = await this.timescalePool.connect()
      
      try {
        await client.query('BEGIN')

        const insertQuery = `
          INSERT INTO sensor_readings 
          (time, machine_id, sensor_type, topic_path, value_numeric, value_text, value_boolean, unit, quality_code)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `

        for (const reading of batch) {
          await client.query(insertQuery, [
            reading.timestamp,
            reading.machine_id,
            reading.sensor_type,
            reading.topic_path,
            reading.value_numeric || null,
            reading.value_text || null,
            reading.value_boolean || null,
            reading.unit || null,
            reading.quality_code || 192
          ])
        }

        await client.query('COMMIT')

        const processingTime = Date.now() - startTime
        const result: BatchResult = {
          success: true,
          insertedCount: batch.length,
          processingTime
        }

        logger.debug('Sensor readings batch processed', {
          count: batch.length,
          processingTime
        })

        this.emit('batchProcessed', 'sensor_readings', result)

      } catch (error: any) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }

    } catch (error: any) {
      logger.error('Failed to flush sensor readings batch', {
        error: error.message,
        batchSize: batch.length
      })

      // Re-add failed items to batch for retry
      this.sensorReadingsBatch.unshift(...batch)
      
      const result: BatchResult = {
        success: false,
        insertedCount: 0,
        processingTime: Date.now() - startTime,
        errors: [error.message]
      }

      this.emit('batchProcessed', 'sensor_readings', result)
    }
  }

  /**
   * Flush pipeline metrics batch to TimescaleDB
   */
  private async flushPipelineMetricsBatch(): Promise<void> {
    if (this.pipelineMetricsBatch.length === 0) return

    const batch = [...this.pipelineMetricsBatch]
    this.pipelineMetricsBatch = []

    const startTime = Date.now()

    try {
      const client = await this.timescalePool.connect()
      
      try {
        await client.query('BEGIN')

        const insertQuery = `
          INSERT INTO pipeline_metrics 
          (time, metric_type, metric_name, value, unit, tags)
          VALUES ($1, $2, $3, $4, $5, $6)
        `

        for (const metric of batch) {
          await client.query(insertQuery, [
            metric.timestamp,
            metric.metric_type,
            metric.metric_name,
            metric.value,
            metric.unit || null,
            metric.tags ? JSON.stringify(metric.tags) : null
          ])
        }

        await client.query('COMMIT')

        const processingTime = Date.now() - startTime
        const result: BatchResult = {
          success: true,
          insertedCount: batch.length,
          processingTime
        }

        this.emit('batchProcessed', 'pipeline_metrics', result)

      } catch (error: any) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }

    } catch (error: any) {
      logger.error('Failed to flush pipeline metrics batch', {
        error: error.message,
        batchSize: batch.length
      })

      this.pipelineMetricsBatch.unshift(...batch)
      
      const result: BatchResult = {
        success: false,
        insertedCount: 0,
        processingTime: Date.now() - startTime,
        errors: [error.message]
      }

      this.emit('batchProcessed', 'pipeline_metrics', result)
    }
  }

  /**
   * Flush validation errors batch to Supabase
   */
  private async flushValidationErrorsBatch(): Promise<void> {
    if (this.validationErrorsBatch.length === 0) return

    const batch = [...this.validationErrorsBatch]
    this.validationErrorsBatch = []

    const startTime = Date.now()

    try {
      const { error: supabaseError } = await this.supabaseClient
        .from('pipeline_validation_errors')
        .insert(batch)

      if (supabaseError) {
        throw supabaseError
      }

      const processingTime = Date.now() - startTime
      const result: BatchResult = {
        success: true,
        insertedCount: batch.length,
        processingTime
      }

      this.emit('batchProcessed', 'validation_errors', result)

    } catch (error: any) {
      logger.error('Failed to flush validation errors batch', {
        error: error.message,
        batchSize: batch.length
      })

      this.validationErrorsBatch.unshift(...batch)
      
      const result: BatchResult = {
        success: false,
        insertedCount: 0,
        processingTime: Date.now() - startTime,
        errors: [error.message]
      }

      this.emit('batchProcessed', 'validation_errors', result)
    }
  }

  /**
   * Start batch flush timer
   */
  private startBatchFlushTimer(): void {
    const interval = this.config.batchFlushInterval || 5000 // 5 seconds default

    this.batchFlushTimer = setInterval(async () => {
      try {
        await Promise.all([
          this.flushSensorReadingsBatch(),
          this.flushPipelineMetricsBatch(),
          this.flushValidationErrorsBatch()
        ])
      } catch (error) {
        logger.error('Error during batch flush', { error: error.message })
      }
    }, interval)
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    let supabaseStatus: 'connected' | 'disconnected' | 'error' = 'disconnected'
    let timescaleStatus: 'connected' | 'disconnected' | 'error' = 'disconnected'
    let lastError: string | undefined

    // Test Supabase connection
    try {
      const { error } = await this.supabaseClient.from('cnc_machines').select('count').limit(1)
      supabaseStatus = error ? 'error' : 'connected'
      if (error) lastError = error.message
    } catch (error: any) {
      supabaseStatus = 'error'
      lastError = error.message
    }

    // Test TimescaleDB connection
    try {
      const client = await this.timescalePool.connect()
      await client.query('SELECT 1')
      client.release()
      timescaleStatus = 'connected'
    } catch (error: any) {
      timescaleStatus = 'error'
      if (!lastError) lastError = error.message
    }

    const isHealthy = supabaseStatus === 'connected' && timescaleStatus === 'connected'

    return {
      isHealthy,
      supabaseStatus,
      timescaleStatus,
      pendingBatches: {
        sensorReadings: this.sensorReadingsBatch.length,
        pipelineMetrics: this.pipelineMetricsBatch.length,
        validationErrors: this.validationErrorsBatch.length
      },
      lastError
    }
  }

  /**
   * Force flush all batches
   */
  async flushAll(): Promise<void> {
    await Promise.all([
      this.flushSensorReadingsBatch(),
      this.flushPipelineMetricsBatch(),
      this.flushValidationErrorsBatch()
    ])
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down dual database integration service')
    this.isShuttingDown = true

    // Clear timer
    if (this.batchFlushTimer) {
      clearInterval(this.batchFlushTimer)
      this.batchFlushTimer = undefined
    }

    // Flush remaining batches
    await this.flushAll()

    // Close TimescaleDB pool
    await this.timescalePool.end()

    logger.info('Dual database integration service shutdown complete')
    this.emit('shutdown')
  }
}

/**
 * Create dual database integration service with environment configuration
 */
export function createDualDatabaseIntegration(config?: Partial<DualDatabaseConfig>): DualDatabaseIntegrationService {
  const defaultConfig: DualDatabaseConfig = {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    },
    timescale: {
      connectionString: process.env.TIMESCALEDB_URL || 'postgres://localhost/tsdb',
      poolSize: 10
    },
    batchSize: 100,
    batchFlushInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000
  }

  const finalConfig = {
    ...defaultConfig,
    ...config,
    supabase: { ...defaultConfig.supabase, ...config?.supabase },
    timescale: { ...defaultConfig.timescale, ...config?.timescale }
  }

  return new DualDatabaseIntegrationService(finalConfig)
}

export default DualDatabaseIntegrationService