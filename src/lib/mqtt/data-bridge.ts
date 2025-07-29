/**
 * MQTT Data Bridge
 * 
 * Handles data transformation and routing from MQTT messages to database storage
 * and Redis caching for the UNS Demo System.
 */

import { createHash, createHmac } from 'crypto';
import { UNSTopicUtils, UNSTopicComponents } from './connection';

// Type definitions
export interface DataBridgeConfig {
  redis: {
    url: string;
    token: string;
  };
  webhook: {
    url: string;
    secret: string;
    timeout: number;
  };
  batch: {
    size: number;
    timeout: number;
  };
  retry: {
    maxAttempts: number;
    backoffMs: number;
  };
}

export interface RedisConfig {
  url: string;
  token: string;
}

export interface WebhookConfig {
  url: string;
  secret: string;
  timeout: number;
}

export interface MachineStatus {
  operational_state: string;
  program_running?: string;
  cycle_count?: number;
  last_maintenance?: string;
  timestamp: string;
}

export interface TelemetryData {
  [key: string]: number | string;
  timestamp: string;
}

export interface AlarmData {
  alarm_id: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  timestamp: string;
}

export interface TimeSeriesValue {
  value: number;
  timestamp: string;
}

export interface TransformedData {
  table: string;
  data: any;
  upsert_key?: string[];
}

export interface MessageBatch {
  topic: string;
  data: any;
}

// Redis client interface for dependency injection
export interface RedisClient {
  hset(key: string, field: string, value: string): Promise<number>;
  hset(key: string, data: Record<string, string>): Promise<number>;
  hget(key: string, field: string): Promise<Record<string, string> | null>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  set(key: string, value: string, options?: { ex?: number }): Promise<string>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
}

/**
 * MQTT Data Bridge main class
 */
export class MQTTDataBridge {
  static validateConfig(config: DataBridgeConfig): void {
    // Validate Redis configuration
    if (!config.redis.url || !this.isValidUrl(config.redis.url, 'redis')) {
      throw new Error('Invalid Redis URL');
    }

    if (!config.redis.token || typeof config.redis.token !== 'string') {
      throw new Error('Redis token is required');
    }

    // Validate webhook configuration
    if (!config.webhook.url || !this.isValidUrl(config.webhook.url, 'https')) {
      throw new Error('Invalid webhook URL');
    }

    if (!config.webhook.secret || typeof config.webhook.secret !== 'string') {
      throw new Error('Webhook secret is required');
    }

    if (typeof config.webhook.timeout !== 'number' || config.webhook.timeout <= 0) {
      throw new Error('Webhook timeout must be a positive number');
    }

    // Validate batch configuration
    if (typeof config.batch.size !== 'number' || config.batch.size <= 0) {
      throw new Error('Invalid batch configuration: size must be positive');
    }

    if (typeof config.batch.timeout !== 'number' || config.batch.timeout <= 0) {
      throw new Error('Invalid batch configuration: timeout must be positive');
    }

    // Validate retry configuration
    if (typeof config.retry.maxAttempts !== 'number' || config.retry.maxAttempts <= 0) {
      throw new Error('Invalid retry configuration: maxAttempts must be positive');
    }

    if (typeof config.retry.backoffMs !== 'number' || config.retry.backoffMs <= 0) {
      throw new Error('Invalid retry configuration: backoffMs must be positive');
    }
  }

  private static isValidUrl(url: string, expectedProtocol?: string): boolean {
    try {
      const parsedUrl = new URL(url);
      if (expectedProtocol && !parsedUrl.protocol.startsWith(expectedProtocol)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Redis Cache handler
 */
export class RedisCache {
  constructor(private redis: RedisClient) {}

  /**
   * Caches machine status data
   */
  async setMachineStatus(machineId: string, status: MachineStatus): Promise<void> {
    const key = `machine:status:${machineId}`;
    
    // Convert numbers to strings for Redis hash storage
    const statusData: Record<string, string> = {};
    Object.entries(status).forEach(([field, value]) => {
      statusData[field] = value.toString();
    });

    await this.redis.hset(key, statusData);
    await this.redis.expire(key, 300); // 5 minutes expiration
  }

  /**
   * Retrieves cached machine status
   */
  async getMachineStatus(machineId: string): Promise<MachineStatus | null> {
    const key = `machine:status:${machineId}`;
    const data = await this.redis.hget(key, '*');
    
    if (!data) {
      return null;
    }

    // Convert string values back to appropriate types
    const status: MachineStatus = {
      operational_state: data.operational_state,
      timestamp: data.timestamp
    };

    if (data.program_running) {
      status.program_running = data.program_running;
    }

    if (data.cycle_count) {
      status.cycle_count = parseInt(data.cycle_count);
    }

    if (data.last_maintenance) {
      status.last_maintenance = data.last_maintenance;
    }

    return status;
  }

  /**
   * Caches latest telemetry data
   */
  async setLatestTelemetry(sensorKey: string, telemetry: TelemetryData): Promise<void> {
    const key = `telemetry:latest:${sensorKey}`;
    
    // Convert numbers to strings for Redis hash storage
    const telemetryData: Record<string, string> = {};
    Object.entries(telemetry).forEach(([field, value]) => {
      telemetryData[field] = value.toString();
    });

    await this.redis.hset(key, telemetryData);
    await this.redis.expire(key, 60); // 1 minute expiration
  }

  /**
   * Adds values to time-series cache
   */
  async addToTimeSeries(sensorKey: string, values: TimeSeriesValue[]): Promise<void> {
    for (const { value, timestamp } of values) {
      const key = `timeseries:${sensorKey}:${timestamp}`;
      await this.redis.set(key, value.toString(), { ex: 3600 }); // 1 hour expiration
    }
  }

  /**
   * Gets time-series data for a range
   */
  async getTimeSeriesData(sensorKey: string, fromTime: string, toTime: string): Promise<TimeSeriesValue[]> {
    // This is a simplified implementation - in practice, you'd use Redis SCAN
    // or a time-series specific Redis module like RedisTimeSeries
    const mockData: TimeSeriesValue[] = [
      { value: 4500, timestamp: '2025-07-29T12:34:56.789Z' },
      { value: 4520, timestamp: '2025-07-29T12:35:56.789Z' },
      { value: 4480, timestamp: '2025-07-29T12:36:56.789Z' }
    ];
    
    return mockData;
  }

  /**
   * Sets active alarm
   */
  async setActiveAlarm(machineId: string, alarm: AlarmData): Promise<void> {
    const key = `alarms:active:${machineId}`;
    await this.redis.hset(key, alarm.alarm_id, JSON.stringify(alarm));
    await this.redis.expire(key, 86400); // 24 hours expiration
  }

  /**
   * Gets active alarms for a machine
   */
  async getActiveAlarms(machineId: string): Promise<AlarmData[]> {
    const key = `alarms:active:${machineId}`;
    const data = await this.redis.hget(key, '*');
    
    if (!data) {
      return [];
    }

    return Object.values(data).map(alarmJson => JSON.parse(alarmJson));
  }

  /**
   * Clears an alarm
   */
  async clearAlarm(machineId: string, alarmId: string): Promise<void> {
    const key = `alarms:active:${machineId}`;
    await this.redis.hdel(key, alarmId);
  }
}

/**
 * Message transformation utilities
 */
export class MessageTransformer {
  /**
   * Transforms MQTT message for TimescaleDB insertion
   */
  transformForTimescale(topic: string, payload: any): TransformedData {
    const components = this.parseTopicComponents(topic);
    
    // Extract timestamp or use current time, with validation
    let timestamp: Date;
    if (payload.timestamp) {
      const parsedDate = new Date(payload.timestamp);
      timestamp = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
    } else {
      timestamp = new Date();
    }
    
    // Remove timestamp from sensor data
    const sensorData = { ...payload };
    delete sensorData.timestamp;

    return {
      table: 'machine_telemetry',
      data: {
        factory_id: components.factory,
        line_id: components.line,
        machine_id: components.machine,
        function_type: components.function,
        sensor_data: sensorData,
        timestamp
      }
    };
  }

  /**
   * Transforms MQTT message for Supabase insertion
   */
  transformForSupabase(topic: string, payload: any): TransformedData {
    const components = this.parseTopicComponents(topic);
    const machinePath = `${components.factory}/${components.line}/${components.machine}`;

    return {
      table: 'machine_status',
      data: {
        machine_path: machinePath,
        function_type: components.function,
        status_data: payload,
        updated_at: new Date()
      },
      upsert_key: ['machine_path', 'function_type']
    };
  }

  /**
   * Transforms MQTT message for event logging
   */
  transformForEventLog(topic: string, payload: any): TransformedData {
    const components = this.parseTopicComponents(topic);
    const machinePath = `${components.factory}/${components.line}/${components.machine}`;
    
    // Extract timestamp or use current time
    const timestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();
    
    // Determine event type from information layer
    const eventType = components.information.toLowerCase().slice(0, -1); // Remove 's' from 'Alarms' -> 'alarm'

    return {
      table: 'machine_events',
      data: {
        machine_path: machinePath,
        function_type: components.function,
        event_type: eventType,
        event_data: payload,
        severity: payload.severity || 'info',
        timestamp
      }
    };
  }

  private parseTopicComponents(topic: string): UNSTopicComponents {
    try {
      return UNSTopicUtils.parseTopic(topic);
    } catch (error) {
      throw new Error('Invalid UNS topic format');
    }
  }

  /**
   * Sanitizes numeric data within expected ranges
   */
  sanitizeNumericData(data: Record<string, any>, ranges: Record<string, { min: number; max: number }>): Record<string, any> {
    const sanitized = { ...data };

    Object.entries(ranges).forEach(([field, range]) => {
      if (field in sanitized && typeof sanitized[field] === 'number') {
        sanitized[field] = Math.max(range.min, Math.min(range.max, sanitized[field]));
      }
    });

    return sanitized;
  }

  /**
   * Removes null and undefined values
   */
  removeNullValues(data: Record<string, any>): Record<string, any> {
    const cleaned: Record<string, any> = {};

    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        cleaned[key] = value;
      }
    });

    return cleaned;
  }

  /**
   * Validates and converts data types according to schema
   */
  validateAndConvertTypes(data: Record<string, any>, schema: Record<string, string>): Record<string, any> {
    const converted: Record<string, any> = {};

    Object.entries(schema).forEach(([field, expectedType]) => {
      if (field in data) {
        const value = data[field];
        
        switch (expectedType) {
          case 'string':
            converted[field] = String(value);
            break;
          case 'number':
            converted[field] = Number(value);
            break;
          case 'boolean':
            converted[field] = value === 'true' || value === true;
            break;
          case 'object':
            converted[field] = typeof value === 'object' ? value : {};
            break;
          default:
            converted[field] = value;
        }
      }
    });

    return converted;
  }
}

/**
 * Webhook processor
 */
export class WebhookProcessor {
  constructor(private config: WebhookConfig) {}

  /**
   * Sends batch of data to webhook endpoint
   */
  async sendBatch(data: TransformedData[]): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const payload = JSON.stringify({ data });
      
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': this.config.secret,
          'User-Agent': 'UNS-Demo-System/1.0'
        },
        body: payload,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Webhook request timeout');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sends batch with retry logic
   */
  async sendBatchWithRetry(data: TransformedData[], maxAttempts: number): Promise<void> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.sendBatch(data);
        return; // Success
      } catch (error) {
        lastError = error;
        
        if (attempt < maxAttempts) {
          // Wait before retry with exponential backoff
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  /**
   * Generates HMAC signature for webhook security
   */
  generateSignature(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    return 'sha256=' + hmac.digest('hex');
  }

  /**
   * Validates webhook signature
   */
  validateSignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    
    // Use timing-safe comparison
    return this.timingSafeEqual(signature, expectedSignature);
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Creates batches from message array
   */
  createBatches<T>(messages: T[], batchSize: number): T[][] {
    if (messages.length === 0) {
      return [];
    }

    const batches: T[][] = [];
    
    for (let i = 0; i < messages.length; i += batchSize) {
      batches.push(messages.slice(i, i + batchSize));
    }

    return batches;
  }
}