/**
 * MQTT Consumer Service for Real-time Sensor Data Pipeline
 * Handles connection management, topic subscriptions, and message processing
 */

import { MqttClient } from 'mqtt'
import { createMQTTConnection, generateClientId, MQTTConnectionConfig } from '../mqtt/connection'
import { DataValidator, ValidationResult, createValidationError } from './data-validation'
import pino from 'pino'
import { EventEmitter } from 'events'

// Initialize logger
const logger = pino({
  name: 'mqtt-consumer',
  level: process.env.LOG_LEVEL || 'info'
})

// Type definitions
export interface ConsumerConfig {
  brokerUrl: string
  brokerPort: number
  username: string
  password: string
  clientIdPrefix?: string
  reconnectDelay?: number
  keepAlive?: number
  qos?: 0 | 1 | 2
}

export interface TopicSubscription {
  pattern: string
  qos: 0 | 1 | 2
  description?: string
}

export interface ConnectionState {
  isConnected: boolean
  lastConnected?: Date
  reconnectAttempts: number
  lastError?: string
}

export interface ProcessedMessage {
  topic: string
  payload: any
  timestamp: Date
  validationResult: ValidationResult<any>
  processingTime: number
}

export interface ConsumerMetrics {
  messagesReceived: number
  messagesProcessed: number
  validationErrors: number
  connectionUptime: number
  avgProcessingTime: number
  lastMessageTime?: Date
}

/**
 * MQTT Consumer Service with automatic reconnection and validation
 */
export class MQTTConsumerService extends EventEmitter {
  private client: MqttClient | null = null
  private dataValidator: DataValidator
  private connectionConfig: MQTTConnectionConfig
  private subscriptions: Map<string, TopicSubscription> = new Map()
  private connectionState: ConnectionState = {
    isConnected: false,
    reconnectAttempts: 0
  }
  private metrics: ConsumerMetrics = {
    messagesReceived: 0,
    messagesProcessed: 0,
    validationErrors: 0,
    connectionUptime: 0,
    avgProcessingTime: 0
  }
  private connectTime?: Date
  private reconnectTimer?: NodeJS.Timeout
  private healthCheckInterval?: NodeJS.Timer
  private isShuttingDown = false

  constructor(private config: ConsumerConfig) {
    super()
    
    this.dataValidator = new DataValidator()
    this.connectionConfig = this.buildConnectionConfig()
    
    // Set up health check monitoring
    this.startHealthCheck()
  }

  /**
   * Build MQTT connection configuration from consumer config
   */
  private buildConnectionConfig(): MQTTConnectionConfig {
    const clientId = generateClientId(
      this.config.clientIdPrefix || 'pipeline_consumer',
      'main'
    )

    return {
      host: this.config.brokerUrl,
      port: this.config.brokerPort,
      protocol: 'mqtt',
      username: this.config.username,
      password: this.config.password,
      keepalive: this.config.keepAlive || 60,
      clean: true,
      reconnectPeriod: this.config.reconnectDelay || 5000,
      clientId
    }
  }

  /**
   * Connect to MQTT broker with automatic reconnection
   */
  async connect(): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Cannot connect while shutting down')
    }

    try {
      logger.info('Connecting to MQTT broker', {
        host: this.connectionConfig.host,
        port: this.connectionConfig.port,
        clientId: this.connectionConfig.clientId
      })

      this.client = await createMQTTConnection(this.connectionConfig)
      this.setupEventHandlers()
      
      this.connectionState = {
        isConnected: true,
        lastConnected: new Date(),
        reconnectAttempts: 0
      }
      this.connectTime = new Date()

      // Restore subscriptions
      await this.restoreSubscriptions()

      logger.info('MQTT consumer connected successfully')
      this.emit('connected')

    } catch (error) {
      logger.error('Failed to connect to MQTT broker', { error: error.message })
      this.connectionState = {
        isConnected: false,
        reconnectAttempts: this.connectionState.reconnectAttempts + 1,
        lastError: error.message
      }

      this.emit('error', error)
      this.scheduleReconnect()
      throw error
    }
  }

  /**
   * Set up MQTT client event handlers
   */
  private setupEventHandlers(): void {
    if (!this.client) return

    // Connection events
    this.client.on('connect', () => {
      logger.info('MQTT client connected')
      this.connectionState = {
        isConnected: true,
        lastConnected: new Date(),
        reconnectAttempts: 0
      }
      this.connectTime = new Date()
      this.emit('connected')
    })

    this.client.on('reconnect', () => {
      logger.info('MQTT client reconnecting...')
      this.connectionState.reconnectAttempts++
      this.emit('reconnecting')
    })

    this.client.on('close', () => {
      logger.warn('MQTT connection closed')
      this.connectionState.isConnected = false
      this.emit('disconnected')
      
      if (!this.isShuttingDown) {
        this.scheduleReconnect()
      }
    })

    this.client.on('error', (error) => {
      logger.error('MQTT client error', { error: error.message })
      this.connectionState = {
        ...this.connectionState,
        isConnected: false,
        lastError: error.message
      }
      this.emit('error', error)
    })

    this.client.on('offline', () => {
      logger.warn('MQTT client offline')
      this.connectionState.isConnected = false
      this.emit('offline')
    })

    // Message handling
    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message)
    })
  }

  /**
   * Handle incoming MQTT messages
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    const startTime = Date.now()
    this.metrics.messagesReceived++

    try {
      // Parse message payload
      let payload: any
      try {
        payload = JSON.parse(message.toString())
      } catch (parseError) {
        logger.warn('Failed to parse JSON message', { topic, error: parseError.message })
        this.metrics.validationErrors++
        
        // Create validation error for storage
        const validationError = createValidationError(
          null,
          topic,
          'type_conversion',
          `JSON parse error: ${parseError.message}`,
          message.toString()
        )
        
        this.emit('validationError', validationError)
        return
      }

      // Validate sensor data
      const validationResult = this.dataValidator.validateSensorData(payload)
      const processingTime = Date.now() - startTime

      // Update metrics
      this.updateProcessingMetrics(processingTime)

      const processedMessage: ProcessedMessage = {
        topic,
        payload,
        timestamp: new Date(),
        validationResult,
        processingTime
      }

      if (validationResult.success) {
        this.metrics.messagesProcessed++
        logger.debug('Message processed successfully', {
          topic,
          machineId: validationResult.data?.machineId,
          sensorType: validationResult.data?.sensorType,
          processingTime
        })
        
        this.emit('messageProcessed', processedMessage)
      } else {
        this.metrics.validationErrors++
        logger.warn('Message validation failed', {
          topic,
          errors: validationResult.errors?.map(e => e.errorMessage),
          processingTime
        })

        // Create validation errors for storage
        if (validationResult.errors) {
          for (const error of validationResult.errors) {
            const validationError = createValidationError(
              payload?.machineId || null,
              topic,
              error.errorType,
              error.errorMessage,
              validationResult.originalPayload
            )
            this.emit('validationError', validationError)
          }
        }

        this.emit('messageRejected', processedMessage)
      }

    } catch (error) {
      logger.error('Unexpected error processing message', {
        topic,
        error: error.message,
        processingTime: Date.now() - startTime
      })
      
      const validationError = createValidationError(
        null,
        topic,
        'schema_validation',
        `Processing error: ${error.message}`,
        message.toString()
      )
      
      this.emit('validationError', validationError)
    }
  }

  /**
   * Subscribe to MQTT topic pattern
   */
  async subscribe(pattern: string, options: { qos?: 0 | 1 | 2; description?: string } = {}): Promise<void> {
    if (!this.client || !this.connectionState.isConnected) {
      // Store subscription for later restoration
      this.subscriptions.set(pattern, {
        pattern,
        qos: options.qos || this.config.qos || 1,
        description: options.description
      })
      
      logger.info('Stored subscription for later restoration', { pattern })
      return
    }

    const qos = options.qos || this.config.qos || 1

    try {
      await new Promise<void>((resolve, reject) => {
        this.client!.subscribe(pattern, { qos }, (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })

      this.subscriptions.set(pattern, {
        pattern,
        qos,
        description: options.description
      })

      logger.info('Subscribed to topic pattern', { pattern, qos })
      this.emit('subscribed', pattern)

    } catch (error) {
      logger.error('Failed to subscribe to topic pattern', {
        pattern,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Unsubscribe from topic pattern
   */
  async unsubscribe(pattern: string): Promise<void> {
    if (!this.client) {
      this.subscriptions.delete(pattern)
      return
    }

    try {
      await new Promise<void>((resolve, reject) => {
        this.client!.unsubscribe(pattern, (error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      })

      this.subscriptions.delete(pattern)
      logger.info('Unsubscribed from topic pattern', { pattern })
      this.emit('unsubscribed', pattern)

    } catch (error) {
      logger.error('Failed to unsubscribe from topic pattern', {
        pattern,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Restore subscriptions after reconnection
   */
  private async restoreSubscriptions(): Promise<void> {
    if (this.subscriptions.size === 0) return

    logger.info('Restoring subscriptions', { count: this.subscriptions.size })

    for (const [pattern, subscription] of this.subscriptions) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.client!.subscribe(pattern, { qos: subscription.qos }, (error) => {
            if (error) {
              reject(error)
            } else {
              resolve()
            }
          })
        })
        logger.debug('Restored subscription', { pattern })
      } catch (error) {
        logger.error('Failed to restore subscription', {
          pattern,
          error: error.message
        })
      }
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown || this.reconnectTimer) return

    const delay = Math.min(
      this.connectionConfig.reconnectPeriod * Math.pow(2, this.connectionState.reconnectAttempts),
      30000 // Max 30 seconds
    )

    logger.info('Scheduling reconnection', {
      delay,
      attempts: this.connectionState.reconnectAttempts
    })

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = undefined
      try {
        await this.connect()
      } catch (error) {
        // Error is already logged in connect method
      }
    }, delay)
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.updateConnectionUptime()
      this.emit('healthCheck', this.getHealthStatus())
    }, 30000) // Every 30 seconds
  }

  /**
   * Update connection uptime
   */
  private updateConnectionUptime(): void {
    if (this.connectTime && this.connectionState.isConnected) {
      this.metrics.connectionUptime = Date.now() - this.connectTime.getTime()
    } else {
      this.metrics.connectionUptime = 0
    }
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingMetrics(processingTime: number): void {
    const totalTime = this.metrics.avgProcessingTime * (this.metrics.messagesReceived - 1) + processingTime
    this.metrics.avgProcessingTime = totalTime / this.metrics.messagesReceived
    this.metrics.lastMessageTime = new Date()
  }

  /**
   * Get current health status
   */
  getHealthStatus(): {
    isHealthy: boolean
    connectionState: ConnectionState
    metrics: ConsumerMetrics
    subscriptions: string[]
  } {
    this.updateConnectionUptime()

    return {
      isHealthy: this.connectionState.isConnected && !this.isShuttingDown,
      connectionState: { ...this.connectionState },
      metrics: { ...this.metrics },
      subscriptions: Array.from(this.subscriptions.keys())
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): ConsumerMetrics {
    this.updateConnectionUptime()
    return { ...this.metrics }
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      messagesReceived: 0,
      messagesProcessed: 0,
      validationErrors: 0,
      connectionUptime: 0,
      avgProcessingTime: 0
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down MQTT consumer')
    this.isShuttingDown = true

    // Clear timers
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = undefined
    }

    // Close MQTT connection
    if (this.client) {
      try {
        await new Promise<void>((resolve) => {
          if (this.client!.connected) {
            this.client!.end(false, {}, () => {
              resolve()
            })
          } else {
            resolve()
          }
        })
      } catch (error) {
        logger.warn('Error during client shutdown', { error: error.message })
      }
      this.client = null
    }

    this.connectionState.isConnected = false
    logger.info('MQTT consumer shutdown complete')
    this.emit('shutdown')
  }
}

/**
 * Create MQTT consumer with environment configuration
 */
export function createMQTTConsumer(config?: Partial<ConsumerConfig>): MQTTConsumerService {
  const defaultConfig: ConsumerConfig = {
    brokerUrl: process.env.NEXT_PUBLIC_MQTT_BROKER_URL || 'localhost',
    brokerPort: parseInt(process.env.NEXT_PUBLIC_MQTT_BROKER_PORT || '1883'),
    username: process.env.NEXT_PUBLIC_MQTT_USERNAME || '',
    password: process.env.NEXT_PUBLIC_MQTT_PASSWORD || '',
    clientIdPrefix: 'pipeline_consumer',
    reconnectDelay: 5000,
    keepAlive: 60,
    qos: 1
  }

  const finalConfig = { ...defaultConfig, ...config }
  return new MQTTConsumerService(finalConfig)
}

// Export default consumer instance
export default MQTTConsumerService