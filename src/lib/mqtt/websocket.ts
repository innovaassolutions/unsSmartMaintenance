/**
 * WebSocket MQTT Client
 * 
 * Browser-compatible MQTT client for real-time dashboard connections
 * using WebSocket transport for the UNS Demo System.
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { UNSTopicUtils } from './connection';

// Type definitions
export interface WebSocketMQTTConfig {
  brokerUrl: string;
  username: string;
  password: string;
  clientId: string;
  keepalive: number;
  clean: boolean;
}

export interface UserPermissions {
  factory: string;
  lines: string[];
  functions: string[];
}

export interface MessageBuffer {
  topic: string;
  payload: any;
  timestamp: Date;
}

export type ErrorHandler = (error: { type: string; topic?: string; message: string }) => void;
export type MessageHandler = (topic: string, payload: any) => void;
export type ReconnectHandler = () => void;

/**
 * Validates WebSocket MQTT configuration
 */
export function validateWebSocketConfig(config: WebSocketMQTTConfig): void {
  // Validate WebSocket URL
  if (!config.brokerUrl || typeof config.brokerUrl !== 'string') {
    throw new Error('Broker URL is required and must be a string');
  }

  // Check for WebSocket protocol
  if (!config.brokerUrl.startsWith('ws://') && !config.brokerUrl.startsWith('wss://')) {
    throw new Error('WebSocket URL must use ws:// or wss:// protocol');
  }

  // Validate URL format
  try {
    new URL(config.brokerUrl);
  } catch {
    throw new Error('Invalid WebSocket URL format');
  }

  // Check for MQTT path
  const url = new URL(config.brokerUrl);
  if (!url.pathname || url.pathname === '/') {
    throw new Error('WebSocket URL must include MQTT path (e.g., /mqtt)');
  }

  // Validate required fields
  if (!config.username || typeof config.username !== 'string') {
    throw new Error('Username is required and must be a string');
  }

  if (!config.password || typeof config.password !== 'string') {
    throw new Error('Password is required and must be a string');
  }

  if (!config.clientId || typeof config.clientId !== 'string') {
    throw new Error('Client ID is required and must be a string');
  }

  // Validate numeric fields
  if (typeof config.keepalive !== 'number' || config.keepalive < 0) {
    throw new Error('Keepalive must be a non-negative number');
  }

  if (typeof config.clean !== 'boolean') {
    throw new Error('Clean must be a boolean');
  }
}

/**
 * Creates WebSocket MQTT connection
 */
export function createWebSocketConnection(config: WebSocketMQTTConfig): Promise<MqttClient> {
  return new Promise((resolve, reject) => {
    // Validate configuration
    validateWebSocketConfig(config);

    // Parse URL to extract protocol
    const url = new URL(config.brokerUrl);
    const protocol = url.protocol === 'wss:' ? 'wss' : 'ws';

    // Prepare connection options
    const options: IClientOptions = {
      username: config.username,
      password: config.password,
      clientId: config.clientId,
      keepalive: config.keepalive,
      clean: config.clean,
      protocol: protocol
    };

    // Create connection
    const client = mqtt.connect(config.brokerUrl, options);

    // Set up event handlers
    client.on('connect', () => {
      resolve(client);
    });

    client.on('error', (error) => {
      reject(error);
    });

    client.on('close', () => {
      console.log('WebSocket MQTT connection closed');
    });

    client.on('message', (topic, message) => {
      // Base message handler - can be extended by WebSocketMQTTClient
    });
  });
}

/**
 * WebSocket MQTT Client Class
 */
export class WebSocketMQTTClient {
  private messageBuffer: MessageBuffer[] = [];
  private bufferingEnabled = false;
  private subscriptions = new Set<string>();
  private messageHandlers = new Map<string, MessageHandler[]>();
  private topicPatternHandlers = new Map<string, MessageHandler[]>();
  private errorHandlers: ErrorHandler[] = [];
  private reconnectHandlers: ReconnectHandler[] = [];

  constructor(private client: MqttClient) {
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message);
    });

    this.client.on('close', () => {
      // Connection closed
    });

    this.client.on('connect', () => {
      // Reconnected - resubscribe to patterns
      this.resubscribeAll();
    });

    this.client.on('reconnect', () => {
      this.reconnectHandlers.forEach(handler => handler());
    });
  }

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString());
      
      // Buffer message if enabled
      if (this.bufferingEnabled) {
        this.messageBuffer.push({
          topic,
          payload,
          timestamp: new Date()
        });
      }

      // Call topic-specific handlers
      const handlers = this.messageHandlers.get(topic) || [];
      handlers.forEach(handler => handler(topic, payload));

      // Call pattern-based handlers
      this.topicPatternHandlers.forEach((handlers, pattern) => {
        if (UNSTopicUtils.matchesPattern(topic, pattern)) {
          handlers.forEach(handler => handler(topic, payload));
        }
      });

      // Call information-type specific handlers
      this.callInformationHandlers(topic, payload);

    } catch (error) {
      this.errorHandlers.forEach(handler => 
        handler({
          type: 'json_parse_error',
          topic,
          message: `Failed to parse JSON: ${error.message}`
        })
      );
    }
  }

  private callInformationHandlers(topic: string, payload: any): void {
    try {
      const parsed = UNSTopicUtils.parseTopic(topic);
      
      // Call appropriate handler based on information type
      const informationHandlers = this.messageHandlers.get(parsed.information) || [];
      informationHandlers.forEach(handler => handler(topic, payload));
      
    } catch {
      // Invalid topic format - ignore
    }
  }

  private async resubscribeAll(): Promise<void> {
    const subscriptions = Array.from(this.subscriptions);
    for (const pattern of subscriptions) {
      try {
        await this.subscribeToPattern(pattern);
      } catch (error) {
        console.error(`Failed to resubscribe to ${pattern}:`, error);
      }
    }
  }

  /**
   * Subscribes to a topic pattern
   */
  async subscribeToPattern(pattern: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        UNSTopicUtils.validateACLPattern(pattern);
      } catch (error) {
        reject(error);
        return;
      }

      this.client.subscribe(pattern, { qos: 1 }, (error, granted) => {
        if (error) {
          reject(error);
        } else {
          this.subscriptions.add(pattern);
          resolve();
        }
      });
    });
  }

  /**
   * Subscribes to multiple patterns
   */
  async subscribeToMultiplePatterns(patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      await this.subscribeToPattern(pattern);
    }
  }

  /**
   * Generates subscription patterns based on user permissions
   */
  generateSubscriptionPatterns(permissions: UserPermissions): string[] {
    const patterns: string[] = [];

    permissions.lines.forEach(line => {
      permissions.functions.forEach(func => {
        patterns.push(`${permissions.factory}/${line}/+/${func}/+`);
      });
    });

    return patterns;
  }

  /**
   * Sets up telemetry message handler
   */
  onTelemetry(handler: MessageHandler): void {
    this.addMessageHandler('Telemetry', handler);
  }

  /**
   * Sets up status message handler
   */
  onStatus(handler: MessageHandler): void {
    this.addMessageHandler('Status', handler);
  }

  /**
   * Sets up alarm message handler
   */
  onAlarm(handler: MessageHandler): void {
    this.addMessageHandler('Alarms', handler);
  }

  /**
   * Sets up error handler
   */
  onError(handler: ErrorHandler): void {
    this.errorHandlers.push(handler);
  }

  /**
   * Sets up reconnect handler
   */
  onReconnect(handler: ReconnectHandler): void {
    this.reconnectHandlers.push(handler);
  }

  /**
   * Sets up topic pattern handler
   */
  onTopicPattern(pattern: string, handler: MessageHandler): void {
    if (!this.topicPatternHandlers.has(pattern)) {
      this.topicPatternHandlers.set(pattern, []);
    }
    this.topicPatternHandlers.get(pattern)!.push(handler);
  }

  private addMessageHandler(type: string, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Enables/disables message buffering
   */
  enableMessageBuffering(enabled: boolean): void {
    this.bufferingEnabled = enabled;
    if (!enabled) {
      this.messageBuffer = [];
    }
  }

  /**
   * Gets current message buffer
   */
  getMessageBuffer(): MessageBuffer[] {
    return [...this.messageBuffer];
  }

  /**
   * Clears message buffer
   */
  clearMessageBuffer(): void {
    this.messageBuffer = [];
  }

  /**
   * Checks if client is connected
   */
  isConnected(): boolean {
    return this.client.connected;
  }

  /**
   * Disconnects and cleans up
   */
  disconnect(): void {
    this.cleanup();
    this.client.end();
  }

  /**
   * Cleans up resources
   */
  cleanup(): void {
    this.messageHandlers.clear();
    this.topicPatternHandlers.clear();
    this.errorHandlers = [];
    this.reconnectHandlers = [];
    this.subscriptions.clear();
    this.messageBuffer = [];
  }
}