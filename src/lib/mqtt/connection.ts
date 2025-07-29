/**
 * MQTT Connection Utilities
 * 
 * Core MQTT client functionality for UNS Demo System including connection management,
 * UNS topic validation, and pub/sub operations following industrial IoT standards.
 */

import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { URL } from 'url';

// Type definitions
export interface MQTTConnectionConfig {
  host: string;
  port: number;
  protocol: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  username: string;
  password: string;
  keepalive: number;
  clean: boolean;
  reconnectPeriod: number;
  clientId: string;
}

export interface ConnectionStringComponents {
  protocol: string;
  hostname: string;
  port: number;
  username?: string;
  password?: string;
  path?: string;
}

export interface UNSTopicComponents {
  factory: string;
  line: string;
  machine: string;
  function: string;
  information: string;
}

export interface PublishOptions {
  qos?: 0 | 1 | 2;
  retain?: boolean;
}

export interface SubscribeOptions {
  qos?: 0 | 1 | 2;
}

export type MessageHandler = (topic: string, payload: any) => void;

/**
 * Validates MQTT connection configuration
 */
export function validateMQTTConfig(config: MQTTConnectionConfig): void {
  // Validate required fields
  if (!config.host || typeof config.host !== 'string') {
    throw new Error('Host is required and must be a string');
  }

  if (!config.port || typeof config.port !== 'number') {
    throw new Error('Port is required and must be a number');
  }

  // Validate port range
  if (config.port < 1 || config.port > 65535) {
    throw new Error('Invalid port range (1-65535)');
  }

  // Validate protocol
  const validProtocols = ['mqtt', 'mqtts', 'ws', 'wss'];
  if (!validProtocols.includes(config.protocol)) {
    throw new Error('Invalid protocol. Must be one of: mqtt, mqtts, ws, wss');
  }

  // Validate authentication
  if (!config.username || typeof config.username !== 'string') {
    throw new Error('Username is required and must be a string');
  }

  if (!config.password || typeof config.password !== 'string') {
    throw new Error('Password is required and must be a string');
  }

  // Validate client ID
  if (!config.clientId || typeof config.clientId !== 'string') {
    throw new Error('Client ID is required and must be a string');
  }

  // Validate numeric fields
  if (typeof config.keepalive !== 'number' || config.keepalive < 0) {
    throw new Error('Keepalive must be a non-negative number');
  }

  if (typeof config.reconnectPeriod !== 'number' || config.reconnectPeriod < 0) {
    throw new Error('Reconnect period must be a non-negative number');
  }

  if (typeof config.clean !== 'boolean') {
    throw new Error('Clean must be a boolean');
  }
}

/**
 * Generates unique client IDs for different connection types
 */
export function generateClientId(type: string, identifier: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${type}_${identifier}_${timestamp}_${random}`;
}

/**
 * Parses MQTT connection string into components
 */
export function parseConnectionString(connectionString: string): ConnectionStringComponents {
  try {
    const url = new URL(connectionString);
    
    // Validate protocol
    const supportedProtocols = ['mqtt:', 'mqtts:', 'ws:', 'wss:'];
    if (!supportedProtocols.includes(url.protocol)) {
      throw new Error('Unsupported protocol');
    }

    const components: ConnectionStringComponents = {
      protocol: url.protocol.slice(0, -1), // Remove trailing colon
      hostname: url.hostname,
      port: parseInt(url.port) || getDefaultPort(url.protocol)
    };

    // Add authentication if present
    if (url.username) {
      components.username = decodeURIComponent(url.username);
    }
    if (url.password) {
      components.password = decodeURIComponent(url.password);
    }

    // Add path for WebSocket connections
    if (url.pathname && url.pathname !== '/') {
      components.path = url.pathname;
    }

    return components;
  } catch (error) {
    if (error.message === 'Unsupported protocol') {
      throw error;
    }
    throw new Error('Invalid connection string format');
  }
}

/**
 * Gets default port for protocol
 */
function getDefaultPort(protocol: string): number {
  switch (protocol) {
    case 'mqtt:': return 1883;
    case 'mqtts:': return 8883;
    case 'ws:': return 8083;
    case 'wss:': return 8084;
    default: throw new Error('Unknown protocol');
  }
}

/**
 * Creates MQTT connection with proper event handling
 */
export function createMQTTConnection(config: MQTTConnectionConfig): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    // Validate configuration first
    validateMQTTConfig(config);

    // Prepare connection options
    const options: IClientOptions = {
      host: config.host,
      port: config.port,
      protocol: config.protocol,
      username: config.username,
      password: config.password,
      keepalive: config.keepalive,
      clean: config.clean,
      reconnectPeriod: config.reconnectPeriod,
      clientId: config.clientId
    };

    // Create connection
    const client = mqtt.connect(options);

    // Set up event handlers
    client.on('connect', () => {
      resolve(client);
    });

    client.on('error', (error) => {
      reject(error);
    });

    client.on('close', () => {
      console.log('MQTT connection closed');
    });

    client.on('reconnect', () => {
      console.log('MQTT reconnecting...');
    });
  });
}

/**
 * UNS Topic Utilities
 */
export class UNSTopicUtils {
  private static readonly VALID_FUNCTIONS = [
    'Spindle', 'Coolant', 'PowerConsumption', 'Maintenance'
  ];

  private static readonly VALID_INFORMATION = [
    'Status', 'Telemetry', 'Alarms', 'Events'
  ];

  /**
   * Validates UNS topic format
   */
  static validateTopic(topic: string): void {
    const parts = topic.split('/');
    
    // Must have exactly 5 parts: Factory/Line/Machine/Function/Information
    if (parts.length !== 5) {
      throw new Error('UNS topic must have exactly 5 segments: Factory/Line/Machine/Function/Information');
    }

    const [factory, line, machine, functionType, information] = parts;

    // Validate factory format
    if (!factory.match(/^Factory\d{2}$/)) {
      throw new Error('Factory must be in format Factory## (e.g., Factory01)');
    }

    // Validate line format
    if (!line.match(/^Line\d+$/)) {
      throw new Error('Line must be in format Line# (e.g., Line1)');
    }

    // Validate machine format
    if (!machine.match(/^Machine\d{2}$/)) {
      throw new Error('Machine must be in format Machine## (e.g., Machine01)');
    }

    // Validate function
    if (!this.VALID_FUNCTIONS.includes(functionType)) {
      throw new Error(`Function must be one of: ${this.VALID_FUNCTIONS.join(', ')}`);
    }

    // Validate information
    if (!this.VALID_INFORMATION.includes(information)) {
      throw new Error(`Information must be one of: ${this.VALID_INFORMATION.join(', ')}`);
    }
  }

  /**
   * Parses UNS topic into components
   */
  static parseTopic(topic: string): UNSTopicComponents {
    this.validateTopic(topic);
    
    const [factory, line, machine, functionType, information] = topic.split('/');
    
    return {
      factory,
      line,
      machine,
      function: functionType,
      information
    };
  }

  /**
   * Builds UNS topic from components
   */
  static buildTopic(components: UNSTopicComponents): string {
    const topic = `${components.factory}/${components.line}/${components.machine}/${components.function}/${components.information}`;
    this.validateTopic(topic);
    return topic;
  }

  /**
   * Validates ACL pattern for topic subscriptions
   */
  static validateACLPattern(pattern: string): void {
    const parts = pattern.split('/');
    
    // Must have 5 segments or less (with # wildcard)
    if (parts.length > 5) {
      throw new Error('ACL pattern cannot have more than 5 segments');
    }

    // Check for invalid wildcard usage
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Single-level wildcard (+) validation
      if (part.includes('+') && part !== '+') {
        throw new Error('Single-level wildcard + must be entire segment');
      }

      // Multi-level wildcard (#) validation
      if (part.includes('#')) {
        if (part !== '#') {
          throw new Error('Multi-level wildcard # must be entire segment');
        }
        if (i !== parts.length - 1) {
          throw new Error('Multi-level wildcard # must be at end of pattern');
        }
      }

      // Empty segment check
      if (part === '' && i !== parts.length - 1) {
        throw new Error('Empty segments not allowed in ACL pattern');
      }
    }
  }

  /**
   * Checks if topic matches wildcard pattern
   */
  static matchesPattern(topic: string, pattern: string): boolean {
    const topicParts = topic.split('/');
    const patternParts = pattern.split('/');

    // Handle multi-level wildcard
    const hashIndex = patternParts.indexOf('#');
    if (hashIndex !== -1) {
      // Pattern up to # must match
      for (let i = 0; i < hashIndex; i++) {
        if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
          return false;
        }
      }
      return true;
    }

    // Must have same number of segments
    if (topicParts.length !== patternParts.length) {
      return false;
    }

    // Check each segment
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i] !== '+' && patternParts[i] !== topicParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filters topics by function type
   */
  static filterByFunction(topics: string[], functionType: string): string[] {
    return topics.filter(topic => {
      try {
        const parsed = this.parseTopic(topic);
        return parsed.function === functionType;
      } catch {
        return false;
      }
    });
  }

  /**
   * Filters topics by information type
   */
  static filterByInformation(topics: string[], informationType: string): string[] {
    return topics.filter(topic => {
      try {
        const parsed = this.parseTopic(topic);
        return parsed.information === informationType;
      } catch {
        return false;
      }
    });
  }
}

/**
 * MQTT Connection Utils Class
 */
export class MQTTConnectionUtils {
  constructor(private client: MqttClient) {}

  /**
   * Publishes message to UNS topic
   */
  async publish(topic: string, payload: any, options: PublishOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      // Validate topic
      try {
        UNSTopicUtils.validateTopic(topic);
      } catch (error) {
        reject(new Error(`Invalid UNS topic: ${error.message}`));
        return;
      }

      // Convert payload to JSON string
      const message = JSON.stringify(payload);

      // Set default options
      const publishOptions = {
        qos: options.qos || 0,
        retain: options.retain || false
      };

      // Publish message
      this.client.publish(topic, message, publishOptions, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Publishes telemetry data with QoS 0
   */
  async publishTelemetry(topic: string, payload: any): Promise<void> {
    return this.publish(topic, payload, { qos: 0, retain: false });
  }

  /**
   * Publishes status data with QoS 1 and retain
   */
  async publishStatus(topic: string, payload: any): Promise<void> {
    return this.publish(topic, payload, { qos: 1, retain: true });
  }

  /**
   * Publishes alarm data with QoS 2
   */
  async publishAlarm(topic: string, payload: any): Promise<void> {
    return this.publish(topic, payload, { qos: 2, retain: false });
  }

  /**
   * Subscribes to topic pattern
   */
  async subscribe(pattern: string, options: SubscribeOptions = {}, messageHandler?: MessageHandler): Promise<void> {
    return new Promise((resolve, reject) => {
      // Validate ACL pattern
      try {
        UNSTopicUtils.validateACLPattern(pattern);
      } catch (error) {
        reject(new Error(`Invalid ACL pattern: ${error.message}`));
        return;
      }

      // Set default options
      const subscribeOptions = {
        qos: options.qos || 1
      };

      // Subscribe to pattern
      this.client.subscribe(pattern, subscribeOptions, (error, granted) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });

      // Set up message handler if provided
      if (messageHandler) {
        this.client.on('message', (topic, message) => {
          if (UNSTopicUtils.matchesPattern(topic, pattern)) {
            try {
              const payload = JSON.parse(message.toString());
              messageHandler(topic, payload);
            } catch (error) {
              console.error('Failed to parse message JSON:', error);
            }
          }
        });
      }
    });
  }

  /**
   * Unsubscribes from topic pattern
   */
  async unsubscribe(pattern: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.unsubscribe(pattern, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
}