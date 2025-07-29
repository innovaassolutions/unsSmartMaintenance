/**
 * Database Integration Service for MQTT to Supabase Pipeline
 * Handles batch processing, connection pooling, and optimized sensor data storage
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import pino from 'pino'
import { EventEmitter } from 'events'

// Initialize logger
const logger = pino({
  name: 'database-integration',
  level: process.env.LOG_LEVEL || 'info'
})

// Type definitions
export interface DatabaseConfig {
  supabaseUrl: string
  supabaseServiceKey: string
  batchSize?: number
  batchFlushInterval?: number
  maxRetries?: number
  retryDelay?: number
  connectionPoolSize?: number
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
  raw_payload?: any
  attempted_at: Date
}

export interface BatchResult {
  success: boolean
  insertedCount: number
  errors: Array<{
    item: any
    error: string
  }>
  processingTime: number
}

export interface DatabaseMetrics {
  totalInserts: number
  successfulInserts: number
  failedInserts: number
  avgBatchSize: number
  avgProcessingTime: number
  connectionPoolStatus: {
    active: number
    idle: number
    total: number
  }
  lastInsertTime?: Date
}

/**
 * Database Integration Service with batch processing and connection pooling
 */
export class DatabaseIntegrationService extends EventEmitter {
  private supabase: SupabaseClient
  private sensorReadingsBatch: SensorReading[] = []
  private pipelineMetricsBatch: PipelineMetric[] = []
  private validationErrorsBatch: ValidationError[] = []
  private batchFlushTimer?: NodeJS.Timeout
  private metrics: DatabaseMetrics = {
    totalInserts: 0,
    successfulInserts: 0,
    failedInserts: 0,
    avgBatchSize: 0,
    avgProcessingTime: 0,
    connectionPoolStatus: {
      active: 0,
      idle: 0,
      total: 1
    }
  }
  private isShuttingDown = false

  constructor(private config: DatabaseConfig) {
    super()

    // Initialize Supabase client with optimized settings
    this.supabase = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        realtime: {
          params: {
            eventsPerSecond: 100
          }
        },
        db: {
          schema: 'public'
        }
      }
    )

    // Start batch flush timer
    this.startBatchFlushTimer()

    logger.info('Database integration service initialized', {
      batchSize: config.batchSize,
      flushInterval: config.batchFlushInterval
    })
  }

  /**
   * Add sensor reading to batch for processing
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
   * Add pipeline metric to batch for processing
   */
  async addPipelineMetric(metric: PipelineMetric): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down')
    }

    this.pipelineMetricsBatch.push(metric)

    // Flush batch if it reaches the configured size
    if (this.pipelineMetricsBatch.length >= (this.config.batchSize || 100)) {
      await this.flushPipelineMetricsBatch()
    }
  }

  /**
   * Add validation error to batch for processing
   */
  async addValidationError(error: ValidationError): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Service is shutting down')
    }

    this.validationErrorsBatch.push(error)

    // Flush batch if it reaches the configured size
    if (this.validationErrorsBatch.length >= (this.config.batchSize || 100)) {
      await this.flushValidationErrorsBatch()
    }
  }

  /**
   * Flush sensor readings batch to database
   */
  private async flushSensorReadingsBatch(): Promise<BatchResult> {
    if (this.sensorReadingsBatch.length === 0) {
      return {
        success: true,
        insertedCount: 0,
        errors: [],
        processingTime: 0
      }
    }

    const startTime = Date.now()
    const batch = [...this.sensorReadingsBatch]
    this.sensorReadingsBatch = []

    logger.debug('Flushing sensor readings batch', { count: batch.length })

    try {
      const { data, error } = await this.supabase
        .from('sensor_readings')
        .insert(batch)
        .select('id')

      const processingTime = Date.now() - startTime
      this.updateMetrics(batch.length, processingTime, !error)

      if (error) {
        logger.error('Failed to insert sensor readings batch', {
          error: error.message,
          batchSize: batch.length,
          processingTime
        })

        // Try to reprocess failed items individually
        const individualResults = await this.reprocessBatchIndividually(
          batch,
          'sensor_readings'
        )

        const result: BatchResult = {
          success: false,
          insertedCount: individualResults.successCount,
          errors: individualResults.errors,
          processingTime
        }

        this.emit('batchProcessed', 'sensor_readings', result)
        return result
      }

      const result: BatchResult = {
        success: true,
        insertedCount: data?.length || batch.length,
        errors: [],
        processingTime
      }

      logger.debug('Sensor readings batch processed successfully', {
        insertedCount: result.insertedCount,
        processingTime
      })

      this.emit('batchProcessed', 'sensor_readings', result)
      return result

    } catch (error) {
      const processingTime = Date.now() - startTime
      this.updateMetrics(batch.length, processingTime, false)

      logger.error('Unexpected error processing sensor readings batch', {
        error: error.message,
        batchSize: batch.length,
        processingTime
      })

      const result: BatchResult = {
        success: false,
        insertedCount: 0,
        errors: [{ item: batch, error: error.message }],
        processingTime
      }

      this.emit('batchProcessed', 'sensor_readings', result)
      return result
    }
  }

  /**
   * Flush pipeline metrics batch to database
   */
  private async flushPipelineMetricsBatch(): Promise<BatchResult> {
    if (this.pipelineMetricsBatch.length === 0) {
      return {
        success: true,
        insertedCount: 0,
        errors: [],
        processingTime: 0
      }
    }

    const startTime = Date.now()
    const batch = [...this.pipelineMetricsBatch]
    this.pipelineMetricsBatch = []

    logger.debug('Flushing pipeline metrics batch', { count: batch.length })

    try {
      const { data, error } = await this.supabase
        .from('pipeline_metrics')
        .insert(batch)
        .select('id')

      const processingTime = Date.now() - startTime
      this.updateMetrics(batch.length, processingTime, !error)

      if (error) {
        logger.error('Failed to insert pipeline metrics batch', {
          error: error.message,
          batchSize: batch.length,
          processingTime
        })

        const result: BatchResult = {
          success: false,
          insertedCount: 0,
          errors: [{ item: batch, error: error.message }],
          processingTime
        }

        this.emit('batchProcessed', 'pipeline_metrics', result)
        return result
      }

      const result: BatchResult = {
        success: true,
        insertedCount: data?.length || batch.length,
        errors: [],
        processingTime
      }

      this.emit('batchProcessed', 'pipeline_metrics', result)
      return result

    } catch (error) {
      const processingTime = Date.now() - startTime
      this.updateMetrics(batch.length, processingTime, false)

      logger.error('Unexpected error processing pipeline metrics batch', {
        error: error.message,
        batchSize: batch.length,
        processingTime
      })

      const result: BatchResult = {
        success: false,
        insertedCount: 0,
        errors: [{ item: batch, error: error.message }],
        processingTime
      }

      this.emit('batchProcessed', 'pipeline_metrics', result)
      return result
    }
  }

  /**
   * Flush validation errors batch to database
   */
  private async flushValidationErrorsBatch(): Promise<BatchResult> {
    if (this.validationErrorsBatch.length === 0) {
      return {
        success: true,
        insertedCount: 0,
        errors: [],
        processingTime: 0
      }
    }

    const startTime = Date.now()
    const batch = [...this.validationErrorsBatch]
    this.validationErrorsBatch = []

    logger.debug('Flushing validation errors batch', { count: batch.length })

    try {
      const { data, error } = await this.supabase
        .from('data_validation_errors')
        .insert(batch)
        .select('id')

      const processingTime = Date.now() - startTime

      if (error) {
        logger.error('Failed to insert validation errors batch', {
          error: error.message,
          batchSize: batch.length,
          processingTime
        })

        const result: BatchResult = {
          success: false,
          insertedCount: 0,
          errors: [{ item: batch, error: error.message }],
          processingTime
        }

        this.emit('batchProcessed', 'data_validation_errors', result)
        return result
      }

      const result: BatchResult = {
        success: true,
        insertedCount: data?.length || batch.length,
        errors: [],
        processingTime
      }

      this.emit('batchProcessed', 'data_validation_errors', result)
      return result

    } catch (error) {
      const processingTime = Date.now() - startTime

      logger.error('Unexpected error processing validation errors batch', {
        error: error.message,
        batchSize: batch.length,
        processingTime
      })

      const result: BatchResult = {
        success: false,
        insertedCount: 0,
        errors: [{ item: batch, error: error.message }],
        processingTime
      }

      this.emit('batchProcessed', 'data_validation_errors', result)
      return result
    }
  }

  /**
   * Reprocess failed batch items individually to recover partial success
   */
  private async reprocessBatchIndividually(
    batch: any[],
    tableName: string
  ): Promise<{ successCount: number; errors: Array<{ item: any; error: string }> }> {
    let successCount = 0
    const errors: Array<{ item: any; error: string }> = []

    for (const item of batch) {
      try {
        const { error } = await this.supabase
          .from(tableName)
          .insert([item])

        if (error) {
          errors.push({ item, error: error.message })
        } else {
          successCount++
        }
      } catch (error) {
        errors.push({ item, error: error.message })
      }
    }

    logger.info('Individual reprocessing completed', {
      tableName,
      totalItems: batch.length,
      successCount,
      errorCount: errors.length
    })

    return { successCount, errors }
  }

  /**
   * Update processing metrics
   */
  private updateMetrics(batchSize: number, processingTime: number, success: boolean): void {
    this.metrics.totalInserts += batchSize
    if (success) {
      this.metrics.successfulInserts += batchSize
    } else {
      this.metrics.failedInserts += batchSize
    }

    // Update average batch size
    const totalBatches = Math.ceil(this.metrics.totalInserts / (this.config.batchSize || 100))
    this.metrics.avgBatchSize = this.metrics.totalInserts / Math.max(totalBatches, 1)

    // Update average processing time
    this.metrics.avgProcessingTime = (
      (this.metrics.avgProcessingTime * (totalBatches - 1) + processingTime) / totalBatches
    )

    this.metrics.lastInsertTime = new Date()
  }

  /**
   * Start batch flush timer
   */
  private startBatchFlushTimer(): void {
    const flushInterval = this.config.batchFlushInterval || 5000 // 5 seconds default

    this.batchFlushTimer = setInterval(async () => {
      if (this.isShuttingDown) return

      try {
        await Promise.all([
          this.flushSensorReadingsBatch(),
          this.flushPipelineMetricsBatch(),
          this.flushValidationErrorsBatch()
        ])
      } catch (error) {
        logger.error('Error during scheduled batch flush', { error: error.message })
      }
    }, flushInterval)
  }

  /**
   * Execute raw SQL query with transaction support
   */
  async executeQuery(
    query: string,
    params?: any[],
    useTransaction = false
  ): Promise<{ data: any[]; error: string | null }> {
    try {
      if (useTransaction) {
        // For complex transactions, we'd need to use the Supabase RPC
        const { data, error } = await this.supabase.rpc('execute_sql_transaction', {
          sql_query: query,
          parameters: params || []
        })

        return {
          data: data || [],
          error: error?.message || null
        }
      } else {
        // For simple queries, use direct SQL execution
        const { data, error } = await this.supabase.rpc('execute_sql', {
          sql_query: query,
          parameters: params || []
        })

        return {
          data: data || [],
          error: error?.message || null
        }
      }
    } catch (error) {
      logger.error('Error executing SQL query', {
        query: query.substring(0, 100),
        error: error.message
      })

      return {
        data: [],
        error: error.message
      }
    }
  }

  /**
   * Update machine connection status
   */
  async updateMachineStatus(
    machineId: string,
    status: {
      last_data_received?: Date
      data_quality_score?: number
      total_messages_received?: number
      pipeline_status?: 'connected' | 'disconnected' | 'error'
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('cnc_machines')
        .update({
          ...status,
          updated_at: new Date().toISOString()
        })
        .eq('id', machineId)

      if (error) {
        logger.error('Failed to update machine status', {
          machineId,
          error: error.message
        })
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      logger.error('Unexpected error updating machine status', {
        machineId,
        error: error.message
      })
      return { success: false, error: error.message }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): DatabaseMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalInserts: 0,
      successfulInserts: 0,
      failedInserts: 0,
      avgBatchSize: 0,
      avgProcessingTime: 0,
      connectionPoolStatus: {
        active: 0,
        idle: 0,
        total: 1
      }
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean
    connectionStatus: 'connected' | 'disconnected' | 'error'
    pendingBatches: {
      sensorReadings: number
      pipelineMetrics: number
      validationErrors: number
    }
    metrics: DatabaseMetrics
  }> {
    let connectionStatus: 'connected' | 'disconnected' | 'error' = 'connected'

    try {
      // Test connection with a simple query
      const { error } = await this.supabase
        .from('cnc_machines')
        .select('id')
        .limit(1)

      if (error) {
        connectionStatus = 'error'
      }
    } catch (error) {
      connectionStatus = 'disconnected'
    }

    return {
      isHealthy: connectionStatus === 'connected' && !this.isShuttingDown,
      connectionStatus,
      pendingBatches: {
        sensorReadings: this.sensorReadingsBatch.length,
        pipelineMetrics: this.pipelineMetricsBatch.length,
        validationErrors: this.validationErrorsBatch.length
      },
      metrics: this.getMetrics()
    }
  }

  /**
   * Force flush all pending batches
   */
  async flushAll(): Promise<{
    sensorReadings: BatchResult
    pipelineMetrics: BatchResult
    validationErrors: BatchResult
  }> {
    logger.info('Force flushing all pending batches')

    const results = await Promise.allSettled([
      this.flushSensorReadingsBatch(),
      this.flushPipelineMetricsBatch(),
      this.flushValidationErrorsBatch()
    ])

    return {
      sensorReadings: results[0].status === 'fulfilled' ? results[0].value : {
        success: false,
        insertedCount: 0,
        errors: [{ item: null, error: 'Promise rejected' }],
        processingTime: 0
      },
      pipelineMetrics: results[1].status === 'fulfilled' ? results[1].value : {
        success: false,
        insertedCount: 0,
        errors: [{ item: null, error: 'Promise rejected' }],
        processingTime: 0
      },
      validationErrors: results[2].status === 'fulfilled' ? results[2].value : {
        success: false,
        insertedCount: 0,
        errors: [{ item: null, error: 'Promise rejected' }],
        processingTime: 0
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down database integration service')
    this.isShuttingDown = true

    // Clear batch flush timer
    if (this.batchFlushTimer) {
      clearInterval(this.batchFlushTimer)
      this.batchFlushTimer = undefined
    }

    // Flush any remaining batches
    try {
      await this.flushAll()
      logger.info('Final batch flush completed')
    } catch (error) {
      logger.warn('Error during final batch flush', { error: error.message })
    }

    logger.info('Database integration service shutdown complete')
    this.emit('shutdown')
  }
}

/**
 * Create database integration service with environment configuration
 */
export function createDatabaseIntegration(config?: Partial<DatabaseConfig>): DatabaseIntegrationService {
  const defaultConfig: DatabaseConfig = {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    batchSize: 100,
    batchFlushInterval: 5000,
    maxRetries: 3,
    retryDelay: 1000,
    connectionPoolSize: 10
  }

  const finalConfig = { ...defaultConfig, ...config }
  return new DatabaseIntegrationService(finalConfig)
}

// Export default
export default DatabaseIntegrationService