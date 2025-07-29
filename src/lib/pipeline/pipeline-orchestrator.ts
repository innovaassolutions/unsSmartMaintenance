/**
 * Pipeline Orchestrator for MQTT to Supabase Data Pipeline
 * Coordinates MQTT consumer, data validation, and database integration
 */

import { EventEmitter } from 'events'
import pino from 'pino'
import { MQTTConsumerService, createMQTTConsumer, ConsumerConfig } from './mqtt-consumer'
import { DualDatabaseIntegrationService, createDualDatabaseIntegration, DualDatabaseConfig } from './dual-database-integration'
import { DataValidator, ValidationResult } from './data-validation'

// Initialize logger
const logger = pino({
  name: 'pipeline-orchestrator',
  level: process.env.LOG_LEVEL || 'info'
})

// Type definitions
export interface PipelineConfig {
  mqtt: Partial<ConsumerConfig>
  database: Partial<DualDatabaseConfig>
  processing: {
    deadLetterQueueSize?: number
    maxRetries?: number
    retryDelay?: number
    healthCheckInterval?: number
    performanceMonitoringInterval?: number
  }
  topics: {
    patterns: string[]
    qos?: 0 | 1 | 2
  }
}

export interface ProcessedMessage {
  id: string
  topic: string
  payload: any
  timestamp: Date
  validationResult: ValidationResult<any>
  processingAttempts: number
  lastError?: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter'
}

export interface PipelineMetrics {
  messagesReceived: number
  messagesProcessed: number
  messagesValidated: number
  messagesFailed: number
  deadLetterCount: number
  avgProcessingTime: number
  avgValidationTime: number
  avgDatabaseTime: number
  throughputPerSecond: number
  errorRate: number
  uptime: number
  lastResetTime: Date
}

export interface PipelineHealth {
  isHealthy: boolean
  status: 'starting' | 'running' | 'degraded' | 'stopped' | 'error'
  components: {
    mqttConsumer: {
      status: 'connected' | 'disconnected' | 'error'
      lastMessage?: Date
      subscriptions: number
    }
    database: {
      status: 'connected' | 'disconnected' | 'error'
      pendingBatches: number
      connectionPool: number
      supabaseStatus: 'connected' | 'disconnected' | 'error'
      timescaleStatus: 'connected' | 'disconnected' | 'error'
    }
    validator: {
      status: 'active' | 'error'
      supportedSensors: number
    }
  }
  metrics: PipelineMetrics
  lastHealthCheck: Date
}

export interface RetryableMessage {
  message: ProcessedMessage
  retryCount: number
  nextRetryTime: Date
  lastError: string
}

/**
 * Main Pipeline Orchestrator
 */
export class PipelineOrchestrator extends EventEmitter {
  private mqttConsumer: MQTTConsumerService
  private databaseService: DualDatabaseIntegrationService
  private validator: DataValidator
  private processedMessages: Map<string, ProcessedMessage> = new Map()
  private deadLetterQueue: ProcessedMessage[] = []
  private retryQueue: RetryableMessage[] = []
  private metrics: PipelineMetrics
  private healthCheckTimer?: NodeJS.Timeout
  private performanceTimer?: NodeJS.Timeout
  private retryTimer?: NodeJS.Timeout
  private startTime: Date
  private isRunning = false
  private isShuttingDown = false

  constructor(private config: PipelineConfig) {
    super()

    this.startTime = new Date()
    this.metrics = this.initializeMetrics()

    // Initialize components
    this.mqttConsumer = createMQTTConsumer(config.mqtt)
    this.databaseService = createDualDatabaseIntegration(config.database)
    this.validator = new DataValidator()

    // Set up event handlers
    this.setupEventHandlers()

    logger.info('Pipeline orchestrator initialized', {
      topics: config.topics.patterns,
      mqttConfig: {
        broker: config.mqtt.brokerUrl,
        port: config.mqtt.brokerPort
      }
    })
  }

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): PipelineMetrics {
    return {
      messagesReceived: 0,
      messagesProcessed: 0,
      messagesValidated: 0,
      messagesFailed: 0,
      deadLetterCount: 0,
      avgProcessingTime: 0,
      avgValidationTime: 0,
      avgDatabaseTime: 0,
      throughputPerSecond: 0,
      errorRate: 0,
      uptime: 0,
      lastResetTime: new Date()
    }
  }

  /**
   * Set up event handlers for all components
   */
  private setupEventHandlers(): void {
    // MQTT Consumer events
    this.mqttConsumer.on('connected', () => {
      logger.info('MQTT consumer connected')
      this.emit('mqttConnected')
    })

    this.mqttConsumer.on('disconnected', () => {
      logger.warn('MQTT consumer disconnected')
      this.emit('mqttDisconnected')
    })

    this.mqttConsumer.on('error', (error) => {
      logger.error('MQTT consumer error', { error: error.message })
      this.emit('mqttError', error)
    })

    this.mqttConsumer.on('messageProcessed', (processedMessage) => {
      this.handleValidatedMessage(processedMessage)
    })

    this.mqttConsumer.on('messageRejected', (processedMessage) => {
      this.handleRejectedMessage(processedMessage)
    })

    this.mqttConsumer.on('validationError', (validationError) => {
      this.handleValidationError(validationError)
    })

    // Database service events
    this.databaseService.on('batchProcessed', (tableName, result) => {
      logger.debug('Database batch processed', {
        tableName,
        insertedCount: result.insertedCount,
        success: result.success,
        processingTime: result.processingTime
      })
      this.updateDatabaseMetrics(result.processingTime)
    })

    this.databaseService.on('shutdown', () => {
      logger.info('Database service shutdown')
      this.emit('databaseShutdown')
    })
  }

  /**
   * Start the pipeline
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Pipeline is already running')
    }

    if (this.isShuttingDown) {
      throw new Error('Cannot start pipeline while shutting down')
    }

    logger.info('Starting pipeline orchestrator')

    try {
      // Connect to MQTT broker
      await this.mqttConsumer.connect()

      // Subscribe to configured topic patterns
      for (const pattern of this.config.topics.patterns) {
        await this.mqttConsumer.subscribe(pattern, {
          qos: this.config.topics.qos || 1,
          description: `Pipeline subscription for ${pattern}`
        })
        logger.info('Subscribed to topic pattern', { pattern })
      }

      // Start monitoring timers
      this.startMonitoring()

      // Start retry processing
      this.startRetryProcessing()

      this.isRunning = true
      logger.info('Pipeline orchestrator started successfully')
      this.emit('started')

    } catch (error: any) {
      logger.error('Failed to start pipeline orchestrator', { error: error.message })
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Handle validated message from MQTT consumer
   */
  private async handleValidatedMessage(processedMessage: any): Promise<void> {
    const messageId = this.generateMessageId()
    const startTime = Date.now()

    const message: ProcessedMessage = {
      id: messageId,
      topic: processedMessage.topic,
      payload: processedMessage.payload,
      timestamp: processedMessage.timestamp,
      validationResult: processedMessage.validationResult,
      processingAttempts: 1,
      status: 'processing'
    }

    this.processedMessages.set(messageId, message)
    this.metrics.messagesReceived++
    this.metrics.messagesValidated++

    try {
      // Store sensor reading in database
      if (processedMessage.validationResult.success && processedMessage.validationResult.data) {
        const sensorReading = {
          machine_id: processedMessage.validationResult.data.machineId,
          sensor_type: processedMessage.validationResult.data.sensorType,
          topic_path: processedMessage.validationResult.data.topicPath,
          value_numeric: processedMessage.validationResult.data.valueNumeric,
          value_text: processedMessage.validationResult.data.valueText,
          value_boolean: processedMessage.validationResult.data.valueBoolean,
          unit: processedMessage.validationResult.data.unit,
          timestamp: processedMessage.validationResult.data.timestamp,
          quality_code: processedMessage.validationResult.data.quality || 192
        }

        await this.databaseService.addSensorReading(sensorReading)

        // Record processing metrics
        const pipelineMetric = {
          metric_type: 'processing',
          metric_name: 'message_processing_time',
          value: Date.now() - startTime,
          unit: 'milliseconds',
          tags: {
            topic: message.topic,
            sensor_type: sensorReading.sensor_type,
            machine_id: sensorReading.machine_id
          },
          timestamp: new Date()
        }

        await this.databaseService.addPipelineMetric(pipelineMetric)

        // Update message status
        message.status = 'completed'
        this.metrics.messagesProcessed++
        this.updateProcessingMetrics(Date.now() - startTime)

        logger.debug('Message processed successfully', {
          messageId,
          topic: message.topic,
          processingTime: Date.now() - startTime
        })

        this.emit('messageProcessed', message)
      }

    } catch (error) {
      logger.error('Error processing validated message', {
        messageId,
        error: error.message,
        topic: message.topic
      })

      message.status = 'failed'
      message.lastError = error.message
      this.metrics.messagesFailed++

      // Add to retry queue if not exceeded max retries
      if (message.processingAttempts < (this.config.processing.maxRetries || 3)) {
        this.addToRetryQueue(message, error.message)
      } else {
        this.addToDeadLetterQueue(message)
      }

      this.emit('messageError', message, error)
    }
  }

  /**
   * Handle rejected message from validation
   */
  private async handleRejectedMessage(processedMessage: any): Promise<void> {
    const messageId = this.generateMessageId()

    const message: ProcessedMessage = {
      id: messageId,
      topic: processedMessage.topic,
      payload: processedMessage.payload,
      timestamp: processedMessage.timestamp,
      validationResult: processedMessage.validationResult,
      processingAttempts: 1,
      status: 'failed',
      lastError: 'Validation failed'
    }

    this.processedMessages.set(messageId, message)
    this.metrics.messagesReceived++
    this.metrics.messagesFailed++

    // Add validation errors to database
    if (processedMessage.validationResult.errors) {
      for (const error of processedMessage.validationResult.errors) {
        const validationError = {
          machine_id: processedMessage.payload?.machineId || null,
          topic_path: message.topic,
          error_type: error.errorType,
          error_message: error.errorMessage,
          raw_payload: processedMessage.validationResult.originalPayload,
          attempted_at: new Date()
        }

        await this.databaseService.addValidationError(validationError)
      }
    }

    this.addToDeadLetterQueue(message)
    this.emit('messageRejected', message)
  }

  /**
   * Handle validation error
   */
  private async handleValidationError(validationError: any): Promise<void> {
    try {
      await this.databaseService.addValidationError(validationError)
    } catch (error: any) {
      logger.error('Failed to store validation error', {
        error: error.message,
        validationError
      })
    }
  }

  /**
   * Add message to retry queue
   */
  private addToRetryQueue(message: ProcessedMessage, error: string): void {
    const retryDelay = this.config.processing.retryDelay || 5000
    const nextRetryTime = new Date(Date.now() + retryDelay * Math.pow(2, message.processingAttempts - 1))

    const retryableMessage: RetryableMessage = {
      message,
      retryCount: message.processingAttempts,
      nextRetryTime,
      lastError: error
    }

    this.retryQueue.push(retryableMessage)
    logger.debug('Message added to retry queue', {
      messageId: message.id,
      retryCount: retryableMessage.retryCount,
      nextRetryTime: nextRetryTime.toISOString()
    })
  }

  /**
   * Add message to dead letter queue
   */
  private addToDeadLetterQueue(message: ProcessedMessage): void {
    message.status = 'dead_letter'
    
    // Limit dead letter queue size
    const maxSize = this.config.processing.deadLetterQueueSize || 1000
    if (this.deadLetterQueue.length >= maxSize) {
      this.deadLetterQueue.shift() // Remove oldest
    }

    this.deadLetterQueue.push(message)
    this.metrics.deadLetterCount++

    logger.warn('Message added to dead letter queue', {
      messageId: message.id,
      topic: message.topic,
      attempts: message.processingAttempts,
      lastError: message.lastError
    })

    this.emit('deadLetter', message)
  }

  /**
   * Start retry processing timer
   */
  private startRetryProcessing(): void {
    this.retryTimer = setInterval(async () => {
      await this.processRetryQueue()
    }, 1000) // Check every second
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    if (this.retryQueue.length === 0) return

    const now = new Date()
    const readyToRetry = this.retryQueue.filter(item => item.nextRetryTime <= now)

    for (const retryItem of readyToRetry) {
      // Remove from retry queue
      const index = this.retryQueue.indexOf(retryItem)
      this.retryQueue.splice(index, 1)

      // Increment processing attempts
      retryItem.message.processingAttempts++
      retryItem.message.status = 'processing'

      logger.debug('Retrying message processing', {
        messageId: retryItem.message.id,
        attempt: retryItem.message.processingAttempts,
        lastError: retryItem.lastError
      })

      // Reprocess the message
      await this.handleValidatedMessage({
        topic: retryItem.message.topic,
        payload: retryItem.message.payload,
        timestamp: retryItem.message.timestamp,
        validationResult: retryItem.message.validationResult
      })
    }
  }

  /**
   * Start monitoring timers
   */
  private startMonitoring(): void {
    // Health check timer
    const healthInterval = this.config.processing.healthCheckInterval || 30000
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
    }, healthInterval)

    // Performance monitoring timer
    const perfInterval = this.config.processing.performanceMonitoringInterval || 60000
    this.performanceTimer = setInterval(() => {
      this.updatePerformanceMetrics()
    }, perfInterval)
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.getHealth()
      this.emit('healthCheck', health)

      if (!health.isHealthy) {
        logger.warn('Pipeline health check failed', {
          status: health.status,
          components: health.components
        })
      }
    } catch (error: any) {
      logger.error('Error during health check', { error: error.message })
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const uptime = Date.now() - this.startTime.getTime()
    this.metrics.uptime = uptime

    // Calculate throughput (messages per second)
    const uptimeSeconds = uptime / 1000
    this.metrics.throughputPerSecond = uptimeSeconds > 0 ? this.metrics.messagesProcessed / uptimeSeconds : 0

    // Calculate error rate
    const totalMessages = this.metrics.messagesReceived
    this.metrics.errorRate = totalMessages > 0 ? (this.metrics.messagesFailed / totalMessages) * 100 : 0

    logger.debug('Performance metrics updated', {
      throughput: this.metrics.throughputPerSecond.toFixed(2),
      errorRate: this.metrics.errorRate.toFixed(2),
      uptime: (uptimeSeconds / 60).toFixed(1) + ' minutes'
    })
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingMetrics(processingTime: number): void {
    const totalProcessed = this.metrics.messagesProcessed
    this.metrics.avgProcessingTime = (
      (this.metrics.avgProcessingTime * (totalProcessed - 1) + processingTime) / totalProcessed
    )
  }

  /**
   * Update database metrics
   */
  private updateDatabaseMetrics(databaseTime: number): void {
    // Simple moving average for database timing
    this.metrics.avgDatabaseTime = (this.metrics.avgDatabaseTime + databaseTime) / 2
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current metrics
   */
  getMetrics(): PipelineMetrics {
    this.updatePerformanceMetrics()
    return { ...this.metrics }
  }

  /**
   * Get pipeline health status
   */
  async getHealth(): Promise<PipelineHealth> {
    const mqttHealth = this.mqttConsumer.getHealthStatus()
    const databaseHealth = await this.databaseService.getHealthStatus()
    const validatorStats = this.validator.getValidationStats()

    const isHealthy = (
      mqttHealth.isHealthy &&
      databaseHealth.isHealthy &&
      this.isRunning &&
      !this.isShuttingDown
    )

    let status: PipelineHealth['status'] = 'running'
    if (!this.isRunning) {
      status = 'stopped'
    } else if (!isHealthy) {
      status = 'degraded'
    }

    return {
      isHealthy,
      status,
      components: {
        mqttConsumer: {
          status: mqttHealth.connectionState.isConnected ? 'connected' : 'disconnected',
          lastMessage: mqttHealth.metrics.lastMessageTime || undefined,
          subscriptions: mqttHealth.subscriptions.length
        },
        database: {
          status: databaseHealth.isHealthy ? 'connected' : 'error',
          pendingBatches: (
            databaseHealth.pendingBatches.sensorReadings +
            databaseHealth.pendingBatches.pipelineMetrics +
            databaseHealth.pendingBatches.validationErrors
          ),
          connectionPool: 10,
          supabaseStatus: databaseHealth.supabaseStatus,
          timescaleStatus: databaseHealth.timescaleStatus
        },
        validator: {
          status: 'active',
          supportedSensors: validatorStats.supportedSensorTypes.length
        }
      },
      metrics: this.getMetrics(),
      lastHealthCheck: new Date()
    }
  }

  /**
   * Get dead letter queue contents
   */
  getDeadLetterQueue(): ProcessedMessage[] {
    return [...this.deadLetterQueue]
  }

  /**
   * Clear dead letter queue
   */
  clearDeadLetterQueue(): number {
    const count = this.deadLetterQueue.length
    this.deadLetterQueue = []
    this.metrics.deadLetterCount = 0
    logger.info('Dead letter queue cleared', { clearedCount: count })
    return count
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = this.initializeMetrics()
    this.startTime = new Date()
    logger.info('Pipeline metrics reset')
  }

  /**
   * Stop the pipeline
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    logger.info('Stopping pipeline orchestrator')
    this.isShuttingDown = true

    // Clear timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }

    if (this.performanceTimer) {
      clearInterval(this.performanceTimer)
      this.performanceTimer = undefined
    }

    if (this.retryTimer) {
      clearInterval(this.retryTimer)
      this.retryTimer = undefined
    }

    // Shutdown components
    try {
      await Promise.all([
        this.mqttConsumer.shutdown(),
        this.databaseService.shutdown()
      ])
    } catch (error: any) {
      logger.warn('Error during component shutdown', { error: error.message })
    }

    this.isRunning = false
    this.isShuttingDown = false

    logger.info('Pipeline orchestrator stopped')
    this.emit('stopped')
  }
}

/**
 * Create pipeline orchestrator with environment configuration
 */
export function createPipelineOrchestrator(config?: Partial<PipelineConfig>): PipelineOrchestrator {
  const defaultConfig: PipelineConfig = {
    mqtt: {
      brokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'localhost',
      brokerPort: parseInt(process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || '1883'),
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME || '',
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || ''
    },
    database: {
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      },
      timescale: {
        connectionString: process.env.TIMESCALEDB_URL || 'postgres://localhost/tsdb',
        poolSize: 10
      }
    },
    processing: {
      deadLetterQueueSize: 1000,
      maxRetries: 3,
      retryDelay: 5000,
      healthCheckInterval: 30000,
      performanceMonitoringInterval: 60000
    },
    topics: {
      patterns: [
        'enterprise/+/+/+/+/info/sensors/temperature',
        'enterprise/+/+/+/+/info/sensors/vibration',
        'enterprise/+/+/+/+/info/sensors/spindle-speed',
        'enterprise/+/+/+/+/info/sensors/spindle-load',
        'enterprise/+/+/+/+/info/sensors/position-x',
        'enterprise/+/+/+/+/info/sensors/position-y',
        'enterprise/+/+/+/+/info/sensors/position-z',
        'enterprise/+/+/+/+/info/sensors/feedrate',
        'enterprise/+/+/+/+/info/sensors/current-tool',
        'enterprise/+/+/+/+/info/sensors/coolant-pressure',
        'enterprise/+/+/+/+/info/sensors/coolant-flow',
        'enterprise/+/+/+/+/info/status/operational',
        'enterprise/+/+/+/+/info/status/cycle-phase',
        'enterprise/+/+/+/+/info/production/parts-count',
        'enterprise/+/+/+/+/info/production/efficiency'
      ],
      qos: 1
    }
  }

  const finalConfig = {
    ...defaultConfig,
    ...config,
    mqtt: { ...defaultConfig.mqtt, ...config?.mqtt },
    database: { ...defaultConfig.database, ...config?.database },
    processing: { ...defaultConfig.processing, ...config?.processing },
    topics: { ...defaultConfig.topics, ...config?.topics }
  }

  return new PipelineOrchestrator(finalConfig)
}

// Export default
export default PipelineOrchestrator