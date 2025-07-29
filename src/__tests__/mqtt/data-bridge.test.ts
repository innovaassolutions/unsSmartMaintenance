/**
 * MQTT Data Bridge Tests
 * 
 * Testing MQTT to database integration, Redis caching, and webhook processing
 * for the UNS Demo System data pipeline.
 */

import { jest } from '@jest/globals';
import { 
  MQTTDataBridge,
  RedisCache,
  WebhookProcessor,
  MessageTransformer,
  DataBridgeConfig,
  RedisClient
} from '../../lib/mqtt/data-bridge';

describe('MQTT Data Bridge Configuration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DataBridgeConfig validation', () => {
    it('should validate complete data bridge configuration', () => {
      const config: DataBridgeConfig = {
        redis: {
          url: 'redis://localhost:6379',
          token: 'test-token'
        },
        webhook: {
          url: 'https://app.example.com/api/webhook/mqtt',
          secret: 'webhook-secret',
          timeout: 5000
        },
        batch: {
          size: 50,
          timeout: 1000
        },
        retry: {
          maxAttempts: 3,
          backoffMs: 1000
        }
      };

      expect(() => MQTTDataBridge.validateConfig(config)).not.toThrow();
    });

    it('should reject configuration with invalid Redis URL', () => {
      const config: DataBridgeConfig = {
        redis: {
          url: 'invalid-url',
          token: 'test-token'
        },
        webhook: {
          url: 'https://app.example.com/api/webhook/mqtt',
          secret: 'webhook-secret',
          timeout: 5000
        },
        batch: { size: 50, timeout: 1000 },
        retry: { maxAttempts: 3, backoffMs: 1000 }
      };

      expect(() => MQTTDataBridge.validateConfig(config)).toThrow('Invalid Redis URL');
    });

    it('should reject configuration with invalid webhook URL', () => {
      const config: DataBridgeConfig = {
        redis: {
          url: 'redis://localhost:6379',
          token: 'test-token'
        },
        webhook: {
          url: 'invalid-webhook-url',
          secret: 'webhook-secret',
          timeout: 5000
        },
        batch: { size: 50, timeout: 1000 },
        retry: { maxAttempts: 3, backoffMs: 1000 }
      };

      expect(() => MQTTDataBridge.validateConfig(config)).toThrow('Invalid webhook URL');
    });

    it('should reject configuration with invalid batch parameters', () => {
      const config: DataBridgeConfig = {
        redis: {
          url: 'redis://localhost:6379',
          token: 'test-token'
        },
        webhook: {
          url: 'https://app.example.com/api/webhook/mqtt',
          secret: 'webhook-secret',
          timeout: 5000
        },
        batch: { size: 0, timeout: -1000 }, // Invalid values
        retry: { maxAttempts: 3, backoffMs: 1000 }
      };

      expect(() => MQTTDataBridge.validateConfig(config)).toThrow('Invalid batch configuration');
    });
  });
});

describe('Redis Cache Integration', () => {
  let mockRedis: jest.Mocked<RedisClient>;
  let redisCache: RedisCache;

  beforeEach(() => {
    mockRedis = {
      hset: jest.fn(),
      hget: jest.fn(),
      hdel: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      expire: jest.fn(),
    } as jest.Mocked<RedisClient>;
    
    redisCache = new RedisCache(mockRedis);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('machine status caching', () => {
    it('should cache machine status with expiration', async () => {
      const machineId = 'Factory01/Line1/Machine01';
      const status = {
        operational_state: 'running',
        program_running: 'PART_001_OP_010',
        cycle_count: 1247,
        last_maintenance: '2025-07-15T08:00:00Z',
        timestamp: '2025-07-29T12:34:56.789Z'
      };

      await redisCache.setMachineStatus(machineId, status);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        `machine:status:${machineId}`,
        {
          operational_state: 'running',
          program_running: 'PART_001_OP_010',
          cycle_count: '1247',
          last_maintenance: '2025-07-15T08:00:00Z',
          timestamp: '2025-07-29T12:34:56.789Z'
        }
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(`machine:status:${machineId}`, 300); // 5 minutes
    });

    it('should retrieve cached machine status', async () => {
      const machineId = 'Factory01/Line1/Machine01';
      const cachedData = {
        operational_state: 'running',
        program_running: 'PART_001_OP_010',
        cycle_count: '1247',
        timestamp: '2025-07-29T12:34:56.789Z'
      };

      mockRedis.hget.mockResolvedValue(cachedData);

      const result = await redisCache.getMachineStatus(machineId);

      expect(mockRedis.hget).toHaveBeenCalledWith(`machine:status:${machineId}`, '*');
      expect(result).toEqual({
        operational_state: 'running',
        program_running: 'PART_001_OP_010',
        cycle_count: 1247,
        timestamp: '2025-07-29T12:34:56.789Z'
      });
    });

    it('should handle cache misses gracefully', async () => {
      const machineId = 'Factory01/Line1/Machine01';
      
      mockRedis.hget.mockResolvedValue(null);

      const result = await redisCache.getMachineStatus(machineId);

      expect(result).toBeNull();
    });
  });

  describe('telemetry data caching', () => {
    it('should cache latest telemetry data', async () => {
      const sensorKey = 'Factory01/Line1/Machine01/Spindle';
      const telemetry = {
        spindle_speed: 4500,
        spindle_load: 75.5,
        spindle_temp: 42.3,
        timestamp: '2025-07-29T12:34:56.789Z'
      };

      await redisCache.setLatestTelemetry(sensorKey, telemetry);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        `telemetry:latest:${sensorKey}`,
        {
          spindle_speed: '4500',
          spindle_load: '75.5',
          spindle_temp: '42.3',
          timestamp: '2025-07-29T12:34:56.789Z'
        }
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(`telemetry:latest:${sensorKey}`, 60); // 1 minute
    });

    it('should maintain time-series cache for trending', async () => {
      const sensorKey = 'Factory01/Line1/Machine01/Spindle/spindle_speed';
      const values = [
        { value: 4500, timestamp: '2025-07-29T12:34:56.789Z' },
        { value: 4520, timestamp: '2025-07-29T12:35:56.789Z' },
        { value: 4480, timestamp: '2025-07-29T12:36:56.789Z' }
      ];

      await redisCache.addToTimeSeries(sensorKey, values);

      values.forEach(({ value, timestamp }) => {
        expect(mockRedis.set).toHaveBeenCalledWith(
          `timeseries:${sensorKey}:${timestamp}`,
          value.toString(),
          { ex: 3600 } // 1 hour expiration
        );
      });
    });

    it('should retrieve time-series data for trending analysis', async () => {
      const sensorKey = 'Factory01/Line1/Machine01/Spindle/spindle_speed';
      const fromTime = '2025-07-29T12:30:00.000Z';
      const toTime = '2025-07-29T12:40:00.000Z';

      // Mock Redis scan results
      mockRedis.get = jest.fn()
        .mockResolvedValueOnce('4500')
        .mockResolvedValueOnce('4520')
        .mockResolvedValueOnce('4480');

      const result = await redisCache.getTimeSeriesData(sensorKey, fromTime, toTime);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ value: 4500, timestamp: expect.any(String) });
    });
  });

  describe('alarm and event caching', () => {
    it('should cache active alarms with priorities', async () => {
      const machineId = 'Factory01/Line1/Machine01';
      const alarm = {
        alarm_id: 'ALM_001',
        severity: 'high',
        message: 'Spindle temperature exceeding normal range',
        acknowledged: false,
        timestamp: '2025-07-29T12:35:15.123Z'
      };

      await redisCache.setActiveAlarm(machineId, alarm);

      expect(mockRedis.hset).toHaveBeenCalledWith(
        `alarms:active:${machineId}`,
        alarm.alarm_id,
        JSON.stringify(alarm)
      );
      expect(mockRedis.expire).toHaveBeenCalledWith(`alarms:active:${machineId}`, 86400); // 24 hours
    });

    it('should retrieve all active alarms for a machine', async () => {
      const machineId = 'Factory01/Line1/Machine01';
      const alarmData = {
        'ALM_001': JSON.stringify({
          alarm_id: 'ALM_001',
          severity: 'high',
          message: 'High temperature',
          acknowledged: false
        }),
        'ALM_002': JSON.stringify({
          alarm_id: 'ALM_002',
          severity: 'medium',
          message: 'Vibration detected',
          acknowledged: true
        })
      };

      mockRedis.hget.mockResolvedValue(alarmData);

      const result = await redisCache.getActiveAlarms(machineId);

      expect(mockRedis.hget).toHaveBeenCalledWith(`alarms:active:${machineId}`, '*');
      expect(result).toHaveLength(2);
      expect(result[0].alarm_id).toBe('ALM_001');
      expect(result[1].alarm_id).toBe('ALM_002');
    });

    it('should clear acknowledged alarms', async () => {
      const machineId = 'Factory01/Line1/Machine01';
      const alarmId = 'ALM_001';

      await redisCache.clearAlarm(machineId, alarmId);

      expect(mockRedis.hdel).toHaveBeenCalledWith(`alarms:active:${machineId}`, alarmId);
    });
  });
});

describe('Message Transformation', () => {
  let transformer: MessageTransformer;

  beforeEach(() => {
    transformer = new MessageTransformer();
  });

  describe('MQTT to database format conversion', () => {
    it('should transform telemetry messages for TimescaleDB insertion', () => {
      const mqttTopic = 'Factory01/Line1/Machine01/Spindle/Telemetry';
      const mqttPayload = {
        spindle_speed: 4500,
        spindle_load: 75.5,
        spindle_temp: 42.3,
        timestamp: '2025-07-29T12:34:56.789Z'
      };

      const transformed = transformer.transformForTimescale(mqttTopic, mqttPayload);

      expect(transformed).toEqual({
        table: 'machine_telemetry',
        data: {
          factory_id: 'Factory01',
          line_id: 'Line1',
          machine_id: 'Machine01',
          function_type: 'Spindle',
          sensor_data: {
            spindle_speed: 4500,
            spindle_load: 75.5,
            spindle_temp: 42.3
          },
          timestamp: new Date('2025-07-29T12:34:56.789Z')
        }
      });
    });

    it('should transform status messages for Supabase insertion', () => {
      const mqttTopic = 'Factory01/Line1/Machine01/Spindle/Status';
      const mqttPayload = {
        operational_state: 'running',
        program_running: 'PART_001_OP_010',
        cycle_count: 1247,
        last_maintenance: '2025-07-15T08:00:00Z'
      };

      const transformed = transformer.transformForSupabase(mqttTopic, mqttPayload);

      expect(transformed).toEqual({
        table: 'machine_status',
        data: {
          machine_path: 'Factory01/Line1/Machine01',
          function_type: 'Spindle',
          status_data: mqttPayload,
          updated_at: expect.any(Date)
        },
        upsert_key: ['machine_path', 'function_type']
      });
    });

    it('should transform alarm messages for event logging', () => {
      const mqttTopic = 'Factory01/Line1/Machine01/Spindle/Alarms';
      const mqttPayload = {
        alarm_id: 'ALM_001',
        severity: 'high',
        message: 'Spindle temperature exceeding normal range',
        acknowledged: false,
        timestamp: '2025-07-29T12:35:15.123Z'
      };

      const transformed = transformer.transformForEventLog(mqttTopic, mqttPayload);

      expect(transformed).toEqual({
        table: 'machine_events',
        data: {
          machine_path: 'Factory01/Line1/Machine01',
          function_type: 'Spindle',
          event_type: 'alarm',
          event_data: mqttPayload,
          severity: 'high',
          timestamp: new Date('2025-07-29T12:35:15.123Z')
        }
      });
    });

    it('should handle invalid timestamp formats gracefully', () => {
      const mqttTopic = 'Factory01/Line1/Machine01/Spindle/Telemetry';
      const mqttPayload = {
        spindle_speed: 4500,
        timestamp: 'invalid-timestamp'
      };

      const transformed = transformer.transformForTimescale(mqttTopic, mqttPayload);

      expect(transformed.data.timestamp).toBeInstanceOf(Date);
      expect(transformed.data.timestamp.getTime()).not.toBeNaN();
    });

    it('should validate required fields in transformation', () => {
      const mqttTopic = 'InvalidTopic';
      const mqttPayload = { test: 'data' };

      expect(() => transformer.transformForTimescale(mqttTopic, mqttPayload)).toThrow('Invalid UNS topic format');
    });
  });

  describe('data validation and sanitization', () => {
    it('should sanitize numeric values within expected ranges', () => {
      const data = {
        spindle_speed: 15000, // Above normal range
        spindle_load: -5, // Below zero
        spindle_temp: 150, // Very high temperature
        normal_value: 42.5
      };

      const sanitized = transformer.sanitizeNumericData(data, {
        spindle_speed: { min: 0, max: 10000 },
        spindle_load: { min: 0, max: 100 },
        spindle_temp: { min: -40, max: 100 },
        normal_value: { min: 0, max: 100 }
      });

      expect(sanitized).toEqual({
        spindle_speed: 10000, // Clamped to max
        spindle_load: 0, // Clamped to min
        spindle_temp: 100, // Clamped to max
        normal_value: 42.5 // Unchanged
      });
    });

    it('should remove null and undefined values', () => {
      const data = {
        valid_field: 42.5,
        null_field: null,
        undefined_field: undefined,
        empty_string: '',
        zero_value: 0
      };

      const cleaned = transformer.removeNullValues(data);

      expect(cleaned).toEqual({
        valid_field: 42.5,
        empty_string: '',
        zero_value: 0
      });
    });

    it('should validate data types match schema requirements', () => {
      const data = {
        string_field: 'test',
        number_field: '42.5', // String that should be number
        boolean_field: 'true', // String that should be boolean
        object_field: { nested: 'value' }
      };

      const schema = {
        string_field: 'string',
        number_field: 'number',
        boolean_field: 'boolean',
        object_field: 'object'
      };

      const validated = transformer.validateAndConvertTypes(data, schema);

      expect(validated).toEqual({
        string_field: 'test',
        number_field: 42.5,
        boolean_field: true,
        object_field: { nested: 'value' }
      });
    });
  });
});

describe('Webhook Processing', () => {
  let webhookProcessor: WebhookProcessor;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
    global.fetch = mockFetch;
    
    webhookProcessor = new WebhookProcessor({
      url: 'https://app.example.com/api/webhook/mqtt',
      secret: 'webhook-secret',
      timeout: 5000
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('webhook delivery', () => {
    it('should send transformed data to webhook endpoint', async () => {
      const transformedData = [
        {
          table: 'machine_telemetry',
          data: {
            factory_id: 'Factory01',
            machine_id: 'Machine01',
            sensor_data: { speed: 4500 },
            timestamp: new Date()
          }
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as Response);

      await webhookProcessor.sendBatch(transformedData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://app.example.com/api/webhook/mqtt',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Secret': 'webhook-secret',
            'User-Agent': 'UNS-Demo-System/1.0'
          },
          body: JSON.stringify({ data: transformedData }),
          signal: expect.any(AbortSignal)
        }
      );
    });

    it('should handle webhook delivery failures with retry logic', async () => {
      const transformedData = [{ table: 'test', data: { test: 'value' } }];

      // Mock first two calls to fail, third to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ error: 'Internal server error' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true })
        } as Response);

      await webhookProcessor.sendBatchWithRetry(transformedData, 3);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should timeout webhook requests appropriately', async () => {
      const transformedData = [{ table: 'test', data: { test: 'value' } }];

      // Mock fetch to simulate timeout by throwing an AbortError
      mockFetch.mockRejectedValue(Object.assign(new Error('AbortError'), { name: 'AbortError' }));

      await expect(webhookProcessor.sendBatch(transformedData)).rejects.toThrow('timeout');
    });

    it('should validate webhook secret signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'webhook-secret';
      
      const signature = webhookProcessor.generateSignature(payload, secret);
      expect(signature).toMatch(/^sha256=/);
      
      const isValid = webhookProcessor.validateSignature(payload, signature, secret);
      expect(isValid).toBe(true);
      
      const isInvalid = webhookProcessor.validateSignature(payload, 'invalid-signature', secret);
      expect(isInvalid).toBe(false);
    });
  });

  describe('batch processing', () => {
    it('should batch multiple messages for efficient processing', () => {
      const messages = [
        { topic: 'Factory01/Line1/Machine01/Spindle/Telemetry', data: { speed: 4500 } },
        { topic: 'Factory01/Line1/Machine01/Coolant/Status', data: { temp: 22.5 } },
        { topic: 'Factory01/Line1/Machine02/Spindle/Telemetry', data: { speed: 4200 } }
      ];

      const batches = webhookProcessor.createBatches(messages, 2);

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(2);
      expect(batches[1]).toHaveLength(1);
    });

    it('should handle empty message arrays', () => {
      const batches = webhookProcessor.createBatches([], 10);
      expect(batches).toHaveLength(0);
    });

    it('should respect maximum batch size limits', () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        topic: `Factory01/Line1/Machine${String(i).padStart(2, '0')}/Spindle/Telemetry`,
        data: { speed: 4000 + i }
      }));

      const maxBatchSize = 25;
      const batches = webhookProcessor.createBatches(messages, maxBatchSize);

      expect(batches).toHaveLength(4);
      batches.forEach(batch => {
        expect(batch.length).toBeLessThanOrEqual(maxBatchSize);
      });
    });
  });
});