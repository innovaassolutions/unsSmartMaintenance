/**
 * Kafka to Redis Streams Bridge
 * Lightweight connector that forwards Debezium events to Redis Streams
 */

import { Kafka, Consumer, EachMessagePayload } from 'kafkajs'
import Redis from 'ioredis'
import { EventEmitter } from 'events'
import pino from 'pino'

// Initialize logger
const logger = pino({
  name: 'kafka-redis-bridge',
  level: process.env.LOG_LEVEL || 'info'
})

// Type definitions
export interface BridgeConfig {
  kafka: {
    brokers: string[]
    clientId: string
    groupId: string
  }
  redis: {
    url: string
  }
  topics: {
    patterns: string[]
    streamPrefix: string
  }
  processing: {
    batchSize: number
    sessionTimeout: number
    heartbeatInterval: number
  }
}

export interface BridgeMetrics {
  messagesReceived: number
  messagesForwarded: number
  messagesFailed: number
  avgLatency: number
  lastMessageTime?: Date
  uptime: number
  activeTopics: number
}

export interface CDCMessage {
  topic: string
  partition: number
  offset: string
  key: string | null
  value: any
  timestamp: Date
  headers?: Record<string, string>
}

/**
 * Kafka to Redis Streams Bridge
 */
export class KafkaRedisBridge extends EventEmitter {
  private kafka: Kafka
  private consumer: Consumer
  private redis: Redis
  private config: BridgeConfig
  private metrics: BridgeMetrics
  private startTime: Date
  private isRunning = false

  constructor(config: BridgeConfig) {
    super()
    this.config = config
    this.startTime = new Date()
    this.metrics = this.initializeMetrics()

    // Initialize Kafka client
    this.kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers,
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      connectionTimeout: 3000,
      requestTimeout: 25000
    })

    // Create consumer
    this.consumer = this.kafka.consumer({
      groupId: config.kafka.groupId,
      sessionTimeout: config.processing.sessionTimeout,
      heartbeatInterval: config.processing.heartbeatInterval,
      maxBytesPerPartition: 1048576, // 1MB
      allowAutoTopicCreation: false
    })

    // Initialize Redis client
    this.redis = new Redis(config.redis.url, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    })

    this.setupEventHandlers()
    logger.info('Kafka to Redis Bridge initialized', {
      brokers: config.kafka.brokers,
      groupId: config.kafka.groupId,
      topicPatterns: config.topics.patterns
    })
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): BridgeMetrics {
    return {
      messagesReceived: 0,
      messagesForwarded: 0,
      messagesFailed: 0,
      avgLatency: 0,
      uptime: 0,
      activeTopics: 0
    }
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    // Kafka events
    this.consumer.on('consumer.connect', () => {
      logger.info('Kafka consumer connected')
      this.emit('kafkaConnected')
    })

    this.consumer.on('consumer.disconnect', () => {
      logger.warn('Kafka consumer disconnected')
      this.emit('kafkaDisconnected')
    })

    this.consumer.on('consumer.stop', () => {
      logger.info('Kafka consumer stopped')
    })

    this.consumer.on('consumer.crash', (event) => {
      logger.error('Kafka consumer crashed', { error: event.payload.error.message })
      this.emit('error', event.payload.error)
    })

    // Redis events
    this.redis.on('connect', () => {
      logger.info('Redis connected')
      this.emit('redisConnected')
    })

    this.redis.on('error', (error) => {
      logger.error('Redis error', { error: error.message })
      this.emit('redisError', error)
    })

    this.redis.on('close', () => {
      logger.warn('Redis connection closed')
      this.emit('redisDisconnected')
    })
  }

  /**
   * Start the bridge
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Bridge is already running')
    }

    logger.info('Starting Kafka to Redis Bridge')

    try {
      // Connect to Kafka
      await this.consumer.connect()

      // Subscribe to CDC topics
      for (const pattern of this.config.topics.patterns) {
        await this.consumer.subscribe({
          topic: pattern,
          fromBeginning: false // Only new messages
        })
        logger.info('Subscribed to Kafka topic pattern', { pattern })
      }

      // Start consuming messages
      await this.consumer.run({
        partitionsConsumedConcurrently: 1, // Keep it simple for demo
        eachMessage: this.handleKafkaMessage.bind(this)
      })

      this.isRunning = true
      logger.info('Kafka to Redis Bridge started successfully')
      this.emit('started')

    } catch (error) {
      logger.error('Failed to start bridge', { error: error.message })
      this.emit('error', error)
      throw error
    }
  }

  /**
   * Handle incoming Kafka message
   */
  private async handleKafkaMessage(payload: EachMessagePayload): Promise<void> {
    const startTime = Date.now()
    const { topic, partition, message } = payload

    this.metrics.messagesReceived++
    this.metrics.lastMessageTime = new Date()

    try {
      // Parse Debezium CDC message
      const cdcMessage = this.parseDebeziumMessage(payload)
      
      logger.debug('Received CDC message', {
        topic: cdcMessage.topic,
        operation: cdcMessage.value?.payload?.op,
        table: cdcMessage.value?.payload?.source?.table
      })

      // Forward to Redis Streams
      await this.forwardToRedisStream(cdcMessage)

      this.metrics.messagesForwarded++
      
      // Update latency metrics
      const latency = Date.now() - startTime
      this.updateLatencyMetrics(latency)

      this.emit('messageForwarded', {
        topic: cdcMessage.topic,
        offset: cdcMessage.offset,
        latency
      })

    } catch (error) {
      this.metrics.messagesFailed++
      logger.error('Failed to process Kafka message', {
        topic,
        partition,
        offset: message.offset,
        error: error.message
      })
      this.emit('messageError', { topic, partition, offset: message.offset, error })
    }
  }

  /**
   * Parse Debezium CDC message
   */
  private parseDebeziumMessage(payload: EachMessagePayload): CDCMessage {
    const { topic, partition, message } = payload

    let parsedValue
    try {
      parsedValue = message.value ? JSON.parse(message.value.toString()) : null
    } catch (error) {
      logger.warn('Failed to parse message value as JSON', { topic })
      parsedValue = message.value?.toString()
    }

    return {
      topic,
      partition,
      offset: message.offset,
      key: message.key?.toString() || null,
      value: parsedValue,
      timestamp: new Date(parseInt(message.timestamp)),
      headers: message.headers ? this.parseHeaders(message.headers) : undefined
    }
  }

  /**
   * Parse Kafka message headers
   */
  private parseHeaders(headers: any): Record<string, string> {
    const parsed: Record<string, string> = {}
    Object.entries(headers).forEach(([key, value]) => {
      parsed[key] = Buffer.isBuffer(value) ? value.toString() : String(value)
    })
    return parsed
  }

  /**
   * Forward CDC message to Redis Stream
   */
  private async forwardToRedisStream(cdcMessage: CDCMessage): Promise<void> {
    if (!cdcMessage.value?.payload) {
      logger.debug('Skipping message without payload', { topic: cdcMessage.topic })
      return
    }

    const payload = cdcMessage.value.payload
    const source = payload.source

    // Extract table name from Debezium source
    const tableName = source?.table
    if (!tableName) {
      logger.warn('No table name in CDC message', { topic: cdcMessage.topic })
      return
    }

    // Create Redis Stream name
    const streamName = `${this.config.topics.streamPrefix}${tableName}`

    // Prepare stream data
    const streamData = {
      // Debezium metadata
      operation: payload.op || 'unknown',
      table: tableName,
      schema: source?.schema || 'public',
      lsn: payload.source?.lsn?.toString(),
      ts_ms: payload.ts_ms?.toString(),
      transaction_id: payload.source?.txId?.toString(),
      
      // Data payload
      before: payload.before ? JSON.stringify(payload.before) : null,
      after: payload.after ? JSON.stringify(payload.after) : null,
      
      // Bridge metadata
      kafka_topic: cdcMessage.topic,
      kafka_partition: cdcMessage.partition.toString(),
      kafka_offset: cdcMessage.offset,
      bridge_timestamp: new Date().toISOString()
    }

    // Add to Redis Stream
    const streamFields = Object.entries(streamData)
      .filter(([_, value]) => value !== null && value !== undefined)
      .flat()

    await this.redis.xadd(streamName, '*', ...streamFields)

    // Trim stream to prevent unlimited growth
    await this.redis.xtrim(streamName, 'MAXLEN', '~', 50000)

    logger.debug('Forwarded to Redis Stream', {
      stream: streamName,
      operation: payload.op,
      table: tableName
    })
  }

  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number): void {
    const totalMessages = this.metrics.messagesForwarded
    if (totalMessages > 0) {
      this.metrics.avgLatency = (
        (this.metrics.avgLatency * (totalMessages - 1) + latency) / totalMessages
      )
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): BridgeMetrics {
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
    firstId: string
  }[]> {
    const pattern = `${this.config.topics.streamPrefix}*`
    const streamNames = await this.redis.keys(pattern)
    const streamInfo = []

    for (const streamName of streamNames) {
      try {
        const info = await this.redis.xinfo('STREAM', streamName)
        streamInfo.push({
          streamName,
          length: info[1] as number,
          lastId: info[3] as string,
          firstId: info[5] as string
        })
      } catch (error) {
        logger.warn('Failed to get stream info', { 
          stream: streamName, 
          error: error.message 
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
    kafka: boolean
    redis: boolean
    consuming: boolean
    lastMessage?: Date
  }> {
    let kafkaHealthy = false
    let redisHealthy = false

    // Check Kafka (simple check - we're connected if consumer is running)
    kafkaHealthy = this.isRunning

    // Check Redis
    try {
      await this.redis.ping()
      redisHealthy = true
    } catch (error) {
      logger.warn('Redis health check failed', { error: error.message })
    }

    return {
      status: (kafkaHealthy && redisHealthy) ? 'healthy' : 'unhealthy',
      kafka: kafkaHealthy,
      redis: redisHealthy,
      consuming: this.isRunning,
      lastMessage: this.metrics.lastMessageTime
    }
  }

  /**
   * Stop the bridge
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    logger.info('Stopping Kafka to Redis Bridge')

    this.isRunning = false

    try {
      // Disconnect Kafka consumer
      await this.consumer.disconnect()
      
      // Close Redis connection
      await this.redis.quit()

      logger.info('Kafka to Redis Bridge stopped')
      this.emit('stopped')

    } catch (error) {
      logger.warn('Error during bridge shutdown', { error: error.message })
    }
  }
}

/**
 * Create Kafka to Redis Bridge with environment configuration
 */
export function createKafkaRedisBridge(config?: Partial<BridgeConfig>): KafkaRedisBridge {
  const defaultConfig: BridgeConfig = {
    kafka: {
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      clientId: 'uns-kafka-redis-bridge',
      groupId: 'uns-bridge-group'
    },
    redis: {
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    topics: {
      patterns: ['uns.cdc.*'], // Match Debezium topic naming
      streamPrefix: 'stream:'
    },
    processing: {
      batchSize: 100,
      sessionTimeout: 30000,
      heartbeatInterval: 3000
    }
  }

  const finalConfig = {
    ...defaultConfig,
    ...config,
    kafka: { ...defaultConfig.kafka, ...config?.kafka },
    redis: { ...defaultConfig.redis, ...config?.redis },
    topics: { ...defaultConfig.topics, ...config?.topics },
    processing: { ...defaultConfig.processing, ...config?.processing }
  }

  return new KafkaRedisBridge(finalConfig)
}

export default KafkaRedisBridge