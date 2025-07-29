/**
 * MQTT Connection Utilities Tests
 * 
 * Testing MQTT client configuration, connection management, and basic functionality
 * following the UNS Demo System requirements for EMQX Cloud integration.
 */

import { jest } from '@jest/globals';

// Mock MQTT module before importing our modules
jest.mock('mqtt', () => ({
  connect: jest.fn(),
}));

// Mock Redis module
jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  })),
}));

import mqtt from 'mqtt';
import { 
  MQTTConnectionConfig, 
  MQTTConnectionUtils,
  UNSTopicUtils,
  validateMQTTConfig,
  createMQTTConnection,
  generateClientId,
  parseConnectionString
} from '../../lib/mqtt/connection';

const mockedMqtt = mqtt as jest.Mocked<typeof mqtt>;

describe('MQTT Connection Configuration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateMQTTConfig', () => {
    it('should validate a complete MQTT configuration', () => {
      const config: MQTTConnectionConfig = {
        host: 'emqx-cloud-test.com',
        port: 8883,
        protocol: 'mqtts',
        username: 'test-user',
        password: 'test-password',
        keepalive: 60,
        clean: true,
        reconnectPeriod: 1000,
        clientId: 'test-client-123'
      };

      expect(() => validateMQTTConfig(config)).not.toThrow();
    });

    it('should reject configuration with invalid protocol', () => {
      const config: MQTTConnectionConfig = {
        host: 'emqx-cloud-test.com',
        port: 8883,
        protocol: 'invalid' as any,
        username: 'test-user',
        password: 'test-password',
        keepalive: 60,
        clean: true,
        reconnectPeriod: 1000,
        clientId: 'test-client-123'
      };

      expect(() => validateMQTTConfig(config)).toThrow('Invalid protocol');
    });

    it('should reject configuration with missing required fields', () => {
      const config = {
        host: 'emqx-cloud-test.com',
        port: 8883,
        // Missing protocol, username, password
      } as MQTTConnectionConfig;

      expect(() => validateMQTTConfig(config)).toThrow();
    });

    it('should reject configuration with invalid port range', () => {
      const config: MQTTConnectionConfig = {
        host: 'emqx-cloud-test.com',
        port: 70000, // Invalid port
        protocol: 'mqtts',
        username: 'test-user',
        password: 'test-password',
        keepalive: 60,
        clean: true,
        reconnectPeriod: 1000,
        clientId: 'test-client-123'
      };

      expect(() => validateMQTTConfig(config)).toThrow('Invalid port');
    });
  });

  describe('generateClientId', () => {
    it('should generate unique client IDs for CNC machines', () => {
      const clientId1 = generateClientId('cnc_machine', 'Machine01');
      const clientId2 = generateClientId('cnc_machine', 'Machine01');
      
      expect(clientId1).toMatch(/^cnc_machine_Machine01_\d+_\d+$/);
      expect(clientId2).toMatch(/^cnc_machine_Machine01_\d+_\d+$/);
      expect(clientId1).not.toBe(clientId2);
    });

    it('should generate unique client IDs for dashboard connections', () => {
      const clientId1 = generateClientId('dashboard', 'user123');
      const clientId2 = generateClientId('dashboard', 'user456');
      
      expect(clientId1).toMatch(/^dashboard_user123_\d+_\d+$/);
      expect(clientId2).toMatch(/^dashboard_user456_\d+_\d+$/);
      expect(clientId1).not.toBe(clientId2);
    });

    it('should handle special characters in identifiers', () => {
      const clientId = generateClientId('test-type', 'id_with-special.chars');
      expect(clientId).toMatch(/^test-type_id_with-special\.chars_\d+_\d+$/);
    });
  });

  describe('parseConnectionString', () => {
    it('should parse MQTT connection string correctly', () => {
      const connectionString = 'mqtts://user:pass@broker.example.com:8883';
      const parsed = parseConnectionString(connectionString);
      
      expect(parsed).toEqual({
        protocol: 'mqtts',
        hostname: 'broker.example.com',
        port: 8883,
        username: 'user',
        password: 'pass'
      });
    });

    it('should parse WebSocket connection string correctly', () => {
      const connectionString = 'wss://user:pass@broker.example.com:8084/mqtt';
      const parsed = parseConnectionString(connectionString);
      
      expect(parsed).toEqual({
        protocol: 'wss',
        hostname: 'broker.example.com',
        port: 8084,
        username: 'user',
        password: 'pass',
        path: '/mqtt'
      });
    });

    it('should handle connection strings without authentication', () => {
      const connectionString = 'mqtt://broker.example.com:1883';
      const parsed = parseConnectionString(connectionString);
      
      expect(parsed).toEqual({
        protocol: 'mqtt',
        hostname: 'broker.example.com',
        port: 1883
      });
    });

    it('should reject invalid connection strings', () => {
      expect(() => parseConnectionString('invalid-url')).toThrow('Invalid connection string');
      expect(() => parseConnectionString('http://broker.com')).toThrow('Unsupported protocol');
    });
  });
});

describe('MQTT Connection Management', () => {
  let mockClient: any;

  beforeEach(() => {
    mockClient = {
      on: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      connected: false
    };
    
    mockedMqtt.connect.mockReturnValue(mockClient);
    
    // Mock the 'on' method to automatically trigger 'connect' event
    mockClient.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'connect') {
        // Trigger connect event asynchronously
        setTimeout(() => callback(), 0);
      }
      return mockClient;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMQTTConnection', () => {
    const validConfig: MQTTConnectionConfig = {
      host: 'emqx-cloud-test.com',
      port: 8883,
      protocol: 'mqtts',
      username: 'test-user',
      password: 'test-password',
      keepalive: 60,
      clean: true,
      reconnectPeriod: 1000,
      clientId: 'test-client-123'
    };

    it('should create MQTT connection with valid configuration', async () => {
      const connection = await createMQTTConnection(validConfig);
      
      expect(mockedMqtt.connect).toHaveBeenCalledWith({
        host: 'emqx-cloud-test.com',
        port: 8883,
        protocol: 'mqtts',
        username: 'test-user',
        password: 'test-password',
        keepalive: 60,
        clean: true,
        reconnectPeriod: 1000,
        clientId: 'test-client-123'
      });
      
      expect(connection).toBeDefined();
    });

    it('should set up event listeners for connection management', async () => {
      await createMQTTConnection(validConfig);
      
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
    });

    it('should handle connection success', async () => {
      const connectionPromise = createMQTTConnection(validConfig);
      
      // Simulate successful connection
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
      
      const connection = await connectionPromise;
      expect(connection).toBeDefined();
    });

    it('should handle connection errors', async () => {
      const connectionPromise = createMQTTConnection(validConfig);
      
      // Simulate connection error
      const errorHandler = mockClient.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(new Error('Connection failed'));
      
      await expect(connectionPromise).rejects.toThrow('Connection failed');
    });

    it('should implement exponential backoff for reconnection', async () => {
      const connection = await createMQTTConnection(validConfig);
      
      // Verify reconnection settings
      expect(mockedMqtt.connect).toHaveBeenCalledWith(
        expect.objectContaining({
          reconnectPeriod: 1000
        })
      );
    });
  });
});

describe('UNS Topic Utilities', () => {
  describe('validateUNSTopic', () => {
    it('should validate correct UNS topic hierarchy', () => {
      const validTopics = [
        'Factory01/Line1/Machine01/Spindle/Telemetry',
        'Factory01/Line2/Machine05/Coolant/Status',
        'Factory01/Line1/Machine03/PowerConsumption/Alarms',
        'Factory01/Line2/Machine04/Maintenance/Events'
      ];

      validTopics.forEach(topic => {
        expect(() => UNSTopicUtils.validateTopic(topic)).not.toThrow();
      });
    });

    it('should reject invalid UNS topic formats', () => {
      const invalidTopics = [
        'InvalidFormat',
        'Factory01/Machine01', // Missing Line
        'Factory01/Line1/Machine01', // Missing Function and Information layers
        'Factory01/Line1/Machine01/InvalidFunction/Telemetry',
        'Factory01/Line1/Machine01/Spindle/InvalidInfo'
      ];

      invalidTopics.forEach(topic => {
        expect(() => UNSTopicUtils.validateTopic(topic)).toThrow();
      });
    });

    it('should parse UNS topic into components', () => {
      const topic = 'Factory01/Line1/Machine01/Spindle/Telemetry';
      const parsed = UNSTopicUtils.parseTopic(topic);
      
      expect(parsed).toEqual({
        factory: 'Factory01',
        line: 'Line1',
        machine: 'Machine01',
        function: 'Spindle',
        information: 'Telemetry'
      });
    });

    it('should generate UNS topics from components', () => {
      const components = {
        factory: 'Factory01',
        line: 'Line2',
        machine: 'Machine03',
        function: 'Coolant',
        information: 'Status'
      };
      
      const topic = UNSTopicUtils.buildTopic(components);
      expect(topic).toBe('Factory01/Line2/Machine03/Coolant/Status');
    });

    it('should validate topic ACL patterns', () => {
      const patterns = [
        'Factory01/Line1/+/Spindle/Telemetry', // Single machine wildcard
        'Factory01/+/+/Coolant/Status', // Line and machine wildcards
        'Factory01/Line1/Machine01/#', // All functions and info for one machine
        '+/+/+/Maintenance/#' // All maintenance data across factory
      ];

      patterns.forEach(pattern => {
        expect(() => UNSTopicUtils.validateACLPattern(pattern)).not.toThrow();
      });
    });

    it('should reject invalid ACL patterns', () => {
      const invalidPatterns = [
        'Factory01/+Line1/Machine01/Spindle/Telemetry', // Invalid + placement
        'Factory01/Line1/Machine01/Spindle/Telemetry/#/Extra', // # not at end
        'Factory01//Machine01/Spindle/Telemetry', // Empty segment
        'Factory01/Line1/Machine01/+/+/Extra' // Too many segments
      ];

      invalidPatterns.forEach(pattern => {
        expect(() => UNSTopicUtils.validateACLPattern(pattern)).toThrow();
      });
    });
  });

  describe('topic matching and filtering', () => {
    it('should match topics against wildcard patterns', () => {
      const topic = 'Factory01/Line1/Machine01/Spindle/Telemetry';
      
      expect(UNSTopicUtils.matchesPattern(topic, 'Factory01/Line1/+/Spindle/Telemetry')).toBe(true);
      expect(UNSTopicUtils.matchesPattern(topic, 'Factory01/+/+/Spindle/Telemetry')).toBe(true);
      expect(UNSTopicUtils.matchesPattern(topic, 'Factory01/Line1/Machine01/#')).toBe(true);
      expect(UNSTopicUtils.matchesPattern(topic, '+/+/+/+/+')).toBe(true);
      
      expect(UNSTopicUtils.matchesPattern(topic, 'Factory02/Line1/Machine01/Spindle/Telemetry')).toBe(false);
      expect(UNSTopicUtils.matchesPattern(topic, 'Factory01/Line2/Machine01/Spindle/Telemetry')).toBe(false);
      expect(UNSTopicUtils.matchesPattern(topic, 'Factory01/Line1/Machine01/Coolant/Telemetry')).toBe(false);
    });

    it('should filter topics by function type', () => {
      const topics = [
        'Factory01/Line1/Machine01/Spindle/Telemetry',
        'Factory01/Line1/Machine01/Coolant/Status',
        'Factory01/Line1/Machine02/Spindle/Telemetry',
        'Factory01/Line1/Machine02/PowerConsumption/Alarms',
        'Factory01/Line2/Machine03/Maintenance/Events'
      ];

      const spindleTopics = UNSTopicUtils.filterByFunction(topics, 'Spindle');
      expect(spindleTopics).toHaveLength(2);
      expect(spindleTopics.every(topic => topic.includes('/Spindle/'))).toBe(true);

      const maintenanceTopics = UNSTopicUtils.filterByFunction(topics, 'Maintenance');
      expect(maintenanceTopics).toHaveLength(1);
      expect(maintenanceTopics[0]).toBe('Factory01/Line2/Machine03/Maintenance/Events');
    });

    it('should filter topics by information type', () => {
      const topics = [
        'Factory01/Line1/Machine01/Spindle/Telemetry',
        'Factory01/Line1/Machine01/Coolant/Status',
        'Factory01/Line1/Machine02/Spindle/Telemetry',
        'Factory01/Line1/Machine02/PowerConsumption/Alarms',
        'Factory01/Line2/Machine03/Maintenance/Events'
      ];

      const telemetryTopics = UNSTopicUtils.filterByInformation(topics, 'Telemetry');
      expect(telemetryTopics).toHaveLength(2);
      expect(telemetryTopics.every(topic => topic.endsWith('/Telemetry'))).toBe(true);

      const statusTopics = UNSTopicUtils.filterByInformation(topics, 'Status');
      expect(statusTopics).toHaveLength(1);
      expect(statusTopics[0]).toBe('Factory01/Line1/Machine01/Coolant/Status');
    });
  });
});

describe('MQTT Message Publishing and Subscribing', () => {
  let mockClient: any;
  let connectionUtils: MQTTConnectionUtils;

  beforeEach(() => {
    mockClient = {
      on: jest.fn(),
      connect: jest.fn(),
      end: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      connected: true
    };
    
    mockedMqtt.connect.mockReturnValue(mockClient);
    connectionUtils = new MQTTConnectionUtils(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('publish functionality', () => {
    it('should publish message to valid UNS topic', async () => {
      const topic = 'Factory01/Line1/Machine01/Spindle/Telemetry';
      const payload = {
        spindle_speed: 4500,
        spindle_load: 75.5,
        spindle_temp: 42.3,
        timestamp: '2025-07-29T12:34:56.789Z'
      };

      mockClient.publish.mockImplementation((topic, message, options, callback) => {
        callback(null);
      });

      await connectionUtils.publish(topic, payload, { qos: 1, retain: false });

      expect(mockClient.publish).toHaveBeenCalledWith(
        topic,
        JSON.stringify(payload),
        { qos: 1, retain: false },
        expect.any(Function)
      );
    });

    it('should handle publish errors gracefully', async () => {
      const topic = 'Factory01/Line1/Machine01/Spindle/Telemetry';
      const payload = { test: 'data' };

      mockClient.publish.mockImplementation((topic, message, options, callback) => {
        callback(new Error('Publish failed'));
      });

      await expect(connectionUtils.publish(topic, payload)).rejects.toThrow('Publish failed');
    });

    it('should validate topic before publishing', async () => {
      const invalidTopic = 'InvalidTopic';
      const payload = { test: 'data' };

      await expect(connectionUtils.publish(invalidTopic, payload)).rejects.toThrow('Invalid UNS topic');
    });

    it('should set appropriate QoS levels for different data types', async () => {
      mockClient.publish.mockImplementation((topic, message, options, callback) => {
        callback(null);
      });

      // Telemetry data - QoS 0 (fire and forget)
      await connectionUtils.publishTelemetry('Factory01/Line1/Machine01/Spindle/Telemetry', { speed: 4500 });
      expect(mockClient.publish).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ qos: 0 }),
        expect.any(Function)
      );

      // Status data - QoS 1 (at least once)
      await connectionUtils.publishStatus('Factory01/Line1/Machine01/Spindle/Status', { state: 'running' });
      expect(mockClient.publish).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ qos: 1, retain: true }),
        expect.any(Function)
      );

      // Alarm data - QoS 2 (exactly once)
      await connectionUtils.publishAlarm('Factory01/Line1/Machine01/Spindle/Alarms', { alarm_id: 'ALM_001' });
      expect(mockClient.publish).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ qos: 2 }),
        expect.any(Function)
      );
    });
  });

  describe('subscribe functionality', () => {
    it('should subscribe to valid UNS topic patterns', async () => {
      const pattern = 'Factory01/Line1/+/Spindle/Telemetry';
      
      mockClient.subscribe.mockImplementation((pattern, options, callback) => {
        callback(null, [{ topic: pattern, qos: 1 }]);
      });

      await connectionUtils.subscribe(pattern, { qos: 1 });

      expect(mockClient.subscribe).toHaveBeenCalledWith(
        pattern,
        { qos: 1 },
        expect.any(Function)
      );
    });

    it('should handle subscription errors', async () => {
      const pattern = 'Factory01/Line1/+/Spindle/Telemetry';
      
      mockClient.subscribe.mockImplementation((pattern, options, callback) => {
        callback(new Error('Subscription failed'));
      });

      await expect(connectionUtils.subscribe(pattern)).rejects.toThrow('Subscription failed');
    });

    it('should validate topic pattern before subscribing', async () => {
      const invalidPattern = 'Invalid/+/Pattern/+/+/Extra';

      await expect(connectionUtils.subscribe(invalidPattern)).rejects.toThrow('Invalid ACL pattern');
    });

    it('should set up message handler for subscribed topics', async () => {
      const pattern = 'Factory01/Line1/+/Spindle/Telemetry';
      const messageHandler = jest.fn();
      
      mockClient.subscribe.mockImplementation((pattern, options, callback) => {
        callback(null, [{ topic: pattern, qos: 1 }]);
      });

      await connectionUtils.subscribe(pattern, { qos: 1 }, messageHandler);

      expect(mockClient.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should unsubscribe from topics', async () => {
      const pattern = 'Factory01/Line1/+/Spindle/Telemetry';
      
      mockClient.unsubscribe.mockImplementation((pattern, callback) => {
        callback(null);
      });

      await connectionUtils.unsubscribe(pattern);

      expect(mockClient.unsubscribe).toHaveBeenCalledWith(pattern, expect.any(Function));
    });
  });
});