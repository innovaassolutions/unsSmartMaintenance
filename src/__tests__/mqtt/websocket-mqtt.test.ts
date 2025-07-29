/**
 * WebSocket MQTT Client Tests
 * 
 * Testing browser-based MQTT WebSocket connections for real-time dashboard updates
 * following the UNS Demo System requirements for dashboard integration.
 */

import { jest } from '@jest/globals';

// Mock MQTT module for WebSocket connections
jest.mock('mqtt', () => ({
  connect: jest.fn(),
}));

import mqtt from 'mqtt';
import { 
  WebSocketMQTTConfig,
  WebSocketMQTTClient,
  createWebSocketConnection,
  validateWebSocketConfig
} from '../../lib/mqtt/websocket';

const mockedMqtt = mqtt as jest.Mocked<typeof mqtt>;

describe('WebSocket MQTT Configuration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWebSocketConfig', () => {
    it('should validate WebSocket MQTT configuration', () => {
      const config: WebSocketMQTTConfig = {
        brokerUrl: 'wss://emqx-cloud-test.com:8084/mqtt',
        username: 'dashboard-user',
        password: 'dashboard-password',
        clientId: 'dashboard_user123_1234567890',
        keepalive: 30,
        clean: true
      };

      expect(() => validateWebSocketConfig(config)).not.toThrow();
    });

    it('should reject configuration with non-WebSocket URL', () => {
      const config: WebSocketMQTTConfig = {
        brokerUrl: 'mqtt://emqx-cloud-test.com:1883', // Wrong protocol
        username: 'dashboard-user',
        password: 'dashboard-password',
        clientId: 'dashboard_user123_1234567890',
        keepalive: 30,
        clean: true
      };

      expect(() => validateWebSocketConfig(config)).toThrow('WebSocket URL must use ws:// or wss://');
    });

    it('should reject configuration with missing required fields', () => {
      const config = {
        brokerUrl: 'wss://emqx-cloud-test.com:8084/mqtt',
        // Missing username, password, clientId
      } as WebSocketMQTTConfig;

      expect(() => validateWebSocketConfig(config)).toThrow();
    });

    it('should validate WebSocket URL format', () => {
      const validUrls = [
        'ws://broker.test.com:8083/mqtt',
        'wss://broker.test.com:8084/mqtt',
        'wss://secure-broker.example.com:443/mqtt',
        'ws://localhost:8083/mqtt'
      ];

      validUrls.forEach(url => {
        const config: WebSocketMQTTConfig = {
          brokerUrl: url,
          username: 'test',
          password: 'test',
          clientId: 'test_123',
          keepalive: 30,
          clean: true
        };
        expect(() => validateWebSocketConfig(config)).not.toThrow();
      });
    });

    it('should reject invalid WebSocket URLs', () => {
      const invalidUrls = [
        'invalid-url',
        'http://broker.com/mqtt',
        'https://broker.com/mqtt',
        'wss://broker.com', // Missing path
        'wss://broker.com:8084', // Missing path
      ];

      invalidUrls.forEach(url => {
        const config: WebSocketMQTTConfig = {
          brokerUrl: url,
          username: 'test',
          password: 'test',
          clientId: 'test_123',
          keepalive: 30,
          clean: true
        };
        expect(() => validateWebSocketConfig(config)).toThrow();
      });
    });
  });
});

describe('WebSocket MQTT Connection Management', () => {
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

  describe('createWebSocketConnection', () => {
    const validConfig: WebSocketMQTTConfig = {
      brokerUrl: 'wss://emqx-cloud-test.com:8084/mqtt',
      username: 'dashboard-user',
      password: 'dashboard-password',
      clientId: 'dashboard_user123_1234567890',
      keepalive: 30,
      clean: true
    };

    it('should create WebSocket MQTT connection with valid configuration', async () => {
      const connection = await createWebSocketConnection(validConfig);
      
      expect(mockedMqtt.connect).toHaveBeenCalledWith('wss://emqx-cloud-test.com:8084/mqtt', {
        username: 'dashboard-user',
        password: 'dashboard-password',
        clientId: 'dashboard_user123_1234567890',
        keepalive: 30,
        clean: true,
        protocol: 'wss'
      });
      
      expect(connection).toBeDefined();
    });

    it('should handle WebSocket connection success', async () => {
      const connectionPromise = createWebSocketConnection(validConfig);
      
      // Simulate successful connection
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      connectHandler();
      
      const connection = await connectionPromise;
      expect(connection).toBeDefined();
    });

    it('should handle WebSocket connection errors', async () => {
      const connectionPromise = createWebSocketConnection(validConfig);
      
      // Simulate connection error
      const errorHandler = mockClient.on.mock.calls.find(call => call[0] === 'error')[1];
      errorHandler(new Error('WebSocket connection failed'));
      
      await expect(connectionPromise).rejects.toThrow('WebSocket connection failed');
    });

    it('should set up proper event listeners for WebSocket connection', async () => {
      await createWebSocketConnection(validConfig);
      
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('message', expect.any(Function));
    });

    it('should handle WebSocket disconnection and cleanup', async () => {
      const connection = await createWebSocketConnection(validConfig);
      
      // Simulate disconnection
      const closeHandler = mockClient.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();
      
      // Verify cleanup is called
      expect(mockClient.on).toHaveBeenCalledWith('close', expect.any(Function));
    });
  });
});

describe('WebSocket MQTT Client Class', () => {
  let mockClient: any;
  let wsClient: WebSocketMQTTClient;

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
    
    // Mock the subscribe method to call callback with success
    mockClient.subscribe.mockImplementation((pattern, options, callback) => {
      if (callback) {
        callback(null, [{ topic: pattern, qos: 1 }]);
      }
    });
    
    wsClient = new WebSocketMQTTClient(mockClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscription management', () => {
    it('should subscribe to dashboard-relevant topic patterns', async () => {
      const patterns = [
        'Factory01/+/+/+/Status',     // All machine status updates
        'Factory01/+/+/+/Alarms',     // All critical alarms
        'Factory01/+/+/Maintenance/Events' // All maintenance events
      ];

      mockClient.subscribe.mockImplementation((pattern, options, callback) => {
        callback(null, [{ topic: pattern, qos: 1 }]);
      });

      for (const pattern of patterns) {
        await wsClient.subscribeToPattern(pattern);
        expect(mockClient.subscribe).toHaveBeenCalledWith(
          pattern,
          { qos: 1 },
          expect.any(Function)
        );
      }
    });

    it('should filter subscriptions by user permissions', async () => {
      const userPermissions = {
        factory: 'Factory01',
        lines: ['Line1', 'Line2'],
        functions: ['Spindle', 'Coolant', 'Maintenance']
      };

      const allowedPatterns = wsClient.generateSubscriptionPatterns(userPermissions);
      
      expect(allowedPatterns).toContain('Factory01/Line1/+/Spindle/+');
      expect(allowedPatterns).toContain('Factory01/Line1/+/Coolant/+');
      expect(allowedPatterns).toContain('Factory01/Line2/+/Maintenance/+');
      expect(allowedPatterns).not.toContain('Factory02/+/+/+/+'); // Different factory
    });

    it('should handle subscription errors gracefully', async () => {
      const pattern = 'Factory01/+/+/+/Status';
      
      mockClient.subscribe.mockImplementation((pattern, options, callback) => {
        callback(new Error('Subscription failed'));
      });

      await expect(wsClient.subscribeToPattern(pattern)).rejects.toThrow('Subscription failed');
    });

    it('should manage multiple concurrent subscriptions', async () => {
      const patterns = [
        'Factory01/Line1/+/+/+',
        'Factory01/Line2/+/+/+',
        'Factory01/+/+/Maintenance/Alarms'
      ];

      mockClient.subscribe.mockImplementation((pattern, options, callback) => {
        callback(null, [{ topic: pattern, qos: 1 }]);
      });

      await wsClient.subscribeToMultiplePatterns(patterns);
      
      expect(mockClient.subscribe).toHaveBeenCalledTimes(3);
      patterns.forEach(pattern => {
        expect(mockClient.subscribe).toHaveBeenCalledWith(
          pattern,
          { qos: 1 },
          expect.any(Function)
        );
      });
    });
  });

  describe('message handling and filtering', () => {
    it('should process incoming messages and call appropriate handlers', () => {
      const telemetryHandler = jest.fn();
      const statusHandler = jest.fn();
      const alarmHandler = jest.fn();

      wsClient.onTelemetry(telemetryHandler);
      wsClient.onStatus(statusHandler);
      wsClient.onAlarm(alarmHandler);

      // Simulate incoming messages
      const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Telemetry message
      messageHandler(
        'Factory01/Line1/Machine01/Spindle/Telemetry',
        Buffer.from(JSON.stringify({ spindle_speed: 4500 }))
      );
      expect(telemetryHandler).toHaveBeenCalledWith(
        'Factory01/Line1/Machine01/Spindle/Telemetry',
        { spindle_speed: 4500 }
      );

      // Status message
      messageHandler(
        'Factory01/Line1/Machine01/Spindle/Status',
        Buffer.from(JSON.stringify({ state: 'running' }))
      );
      expect(statusHandler).toHaveBeenCalledWith(
        'Factory01/Line1/Machine01/Spindle/Status',
        { state: 'running' }
      );

      // Alarm message
      messageHandler(
        'Factory01/Line1/Machine01/Spindle/Alarms',
        Buffer.from(JSON.stringify({ alarm_id: 'ALM_001' }))
      );
      expect(alarmHandler).toHaveBeenCalledWith(
        'Factory01/Line1/Machine01/Spindle/Alarms',
        { alarm_id: 'ALM_001' }
      );
    });

    it('should handle malformed JSON messages gracefully', () => {
      const errorHandler = jest.fn();
      wsClient.onError(errorHandler);

      const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Send malformed JSON
      messageHandler(
        'Factory01/Line1/Machine01/Spindle/Telemetry',
        Buffer.from('invalid json {')
      );
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'json_parse_error',
          topic: 'Factory01/Line1/Machine01/Spindle/Telemetry'
        })
      );
    });

    it('should filter messages by topic patterns', () => {
      const spindleHandler = jest.fn();
      const coolantHandler = jest.fn();

      wsClient.onTopicPattern('Factory01/+/+/Spindle/+', spindleHandler);
      wsClient.onTopicPattern('Factory01/+/+/Coolant/+', coolantHandler);

      const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Spindle message - should match spindle handler only
      messageHandler(
        'Factory01/Line1/Machine01/Spindle/Telemetry',
        Buffer.from(JSON.stringify({ data: 'spindle' }))
      );
      expect(spindleHandler).toHaveBeenCalled();
      expect(coolantHandler).not.toHaveBeenCalled();

      // Reset mocks
      spindleHandler.mockClear();
      coolantHandler.mockClear();

      // Coolant message - should match coolant handler only
      messageHandler(
        'Factory01/Line1/Machine02/Coolant/Status',
        Buffer.from(JSON.stringify({ data: 'coolant' }))
      );
      expect(coolantHandler).toHaveBeenCalled();
      expect(spindleHandler).not.toHaveBeenCalled();
    });

    it('should buffer messages for offline period replay', () => {
      const messageBuffer = wsClient.getMessageBuffer();
      expect(messageBuffer).toEqual([]);

      // Enable buffering
      wsClient.enableMessageBuffering(true);

      const messageHandler = mockClient.on.mock.calls.find(call => call[0] === 'message')[1];
      
      // Send messages while buffering is enabled
      messageHandler(
        'Factory01/Line1/Machine01/Spindle/Telemetry',
        Buffer.from(JSON.stringify({ timestamp: '2025-07-29T12:00:00Z' }))
      );
      
      messageHandler(
        'Factory01/Line1/Machine01/Spindle/Status',
        Buffer.from(JSON.stringify({ timestamp: '2025-07-29T12:01:00Z' }))
      );

      const buffer = wsClient.getMessageBuffer();
      expect(buffer).toHaveLength(2);
      expect(buffer[0].topic).toBe('Factory01/Line1/Machine01/Spindle/Telemetry');
      expect(buffer[1].topic).toBe('Factory01/Line1/Machine01/Spindle/Status');
    });
  });

  describe('connection state management', () => {
    it('should track connection state correctly', () => {
      expect(wsClient.isConnected()).toBe(true);

      // Simulate disconnection
      mockClient.connected = false;
      const closeHandler = mockClient.on.mock.calls.find(call => call[0] === 'close')[1];
      closeHandler();

      expect(wsClient.isConnected()).toBe(false);
    });

    it('should handle reconnection logic', () => {
      const reconnectHandler = jest.fn();
      wsClient.onReconnect(reconnectHandler);

      // Simulate reconnection
      const reconnectEventHandler = mockClient.on.mock.calls.find(call => call[0] === 'reconnect')[1];
      reconnectEventHandler();

      expect(reconnectHandler).toHaveBeenCalled();
    });

    it('should clean up resources on disconnect', () => {
      const cleanupSpy = jest.spyOn(wsClient, 'cleanup');
      
      wsClient.disconnect();
      
      expect(mockClient.end).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should manage subscription state across reconnections', async () => {
      const patterns = ['Factory01/+/+/+/Status', 'Factory01/+/+/+/Alarms'];
      
      await wsClient.subscribeToMultiplePatterns(patterns);
      
      // Clear the call count to track only re-subscriptions
      mockClient.subscribe.mockClear();
      
      // Simulate disconnection and reconnection
      const closeHandler = mockClient.on.mock.calls.find(call => call[0] === 'close')[1];
      const connectHandler = mockClient.on.mock.calls.find(call => call[0] === 'connect')[1];
      
      closeHandler();
      
      // Wait for async resubscribe to complete
      await new Promise(resolve => {
        connectHandler();
        setTimeout(resolve, 10);
      });

      // Should re-subscribe to previous patterns (2 re-subscriptions)
      expect(mockClient.subscribe).toHaveBeenCalledTimes(2);
    });
  });
});