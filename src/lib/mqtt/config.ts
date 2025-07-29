/**
 * MQTT Configuration Management
 * 
 * Handles environment variable validation, TLS/SSL certificate management,
 * and secure credential handling for EMQX Cloud connections.
 */

import { readFileSync } from 'fs';
import { MQTTConnectionConfig, WebSocketMQTTConfig } from './connection';
import { generateClientId } from './connection';

// Environment variable validation schema
export interface MQTTEnvironmentConfig {
  // Basic Connection
  MQTT_BROKER_HOST: string;
  MQTT_BROKER_PORT: string;
  MQTT_PROTOCOL: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  MQTT_USERNAME: string;
  MQTT_PASSWORD: string;

  // WebSocket Configuration
  NEXT_PUBLIC_MQTT_WS_HOST: string;
  NEXT_PUBLIC_MQTT_WS_PORT: string;
  NEXT_PUBLIC_MQTT_WS_PATH: string;
  NEXT_PUBLIC_MQTT_WS_USERNAME: string;
  NEXT_PUBLIC_MQTT_WS_PASSWORD: string;

  // TLS/SSL Configuration
  MQTT_TLS_ENABLED: string;
  MQTT_TLS_REJECT_UNAUTHORIZED: string;
  MQTT_CA_CERT_PATH?: string;
  MQTT_CLIENT_CERT_PATH?: string;
  MQTT_CLIENT_KEY_PATH?: string;

  // Connection Settings
  MQTT_KEEPALIVE: string;
  MQTT_CLEAN_SESSION: string;
  MQTT_RECONNECT_PERIOD: string;
  MQTT_CONNECT_TIMEOUT: string;

  // QoS Settings
  MQTT_QOS_TELEMETRY: string;
  MQTT_QOS_STATUS: string;
  MQTT_QOS_ALARMS: string;
}

export interface TLSOptions {
  ca?: Buffer;
  cert?: Buffer;
  key?: Buffer;
  rejectUnauthorized?: boolean;
}

export interface MQTTConfigOptions {
  clientType: 'cnc_machine' | 'dashboard' | 'bridge';
  machineId?: string;
  userId?: string;
}

/**
 * MQTT Configuration Manager
 */
export class MQTTConfig {
  private static instance: MQTTConfig;
  private envConfig: Partial<MQTTEnvironmentConfig>;

  private constructor() {
    this.envConfig = this.loadEnvironmentConfig();
    this.validateEnvironmentConfig();
  }

  /**
   * Singleton pattern for configuration management
   */
  public static getInstance(): MQTTConfig {
    if (!MQTTConfig.instance) {
      MQTTConfig.instance = new MQTTConfig();
    }
    return MQTTConfig.instance;
  }

  /**
   * Loads environment configuration with validation
   */
  private loadEnvironmentConfig(): Partial<MQTTEnvironmentConfig> {
    return {
      // Basic broker configuration
      MQTT_BROKER_HOST: process.env.MQTT_BROKER_HOST,
      MQTT_BROKER_PORT: process.env.MQTT_BROKER_PORT || '8883',
      MQTT_PROTOCOL: (process.env.MQTT_PROTOCOL as 'mqtt' | 'mqtts' | 'ws' | 'wss') || 'mqtts',
      MQTT_USERNAME: process.env.MQTT_USERNAME,
      MQTT_PASSWORD: process.env.MQTT_PASSWORD,

      // WebSocket configuration
      NEXT_PUBLIC_MQTT_WS_HOST: process.env.NEXT_PUBLIC_MQTT_WS_HOST,
      NEXT_PUBLIC_MQTT_WS_PORT: process.env.NEXT_PUBLIC_MQTT_WS_PORT || '8084',
      NEXT_PUBLIC_MQTT_WS_PATH: process.env.NEXT_PUBLIC_MQTT_WS_PATH || '/mqtt',
      NEXT_PUBLIC_MQTT_WS_USERNAME: process.env.NEXT_PUBLIC_MQTT_WS_USERNAME,
      NEXT_PUBLIC_MQTT_WS_PASSWORD: process.env.NEXT_PUBLIC_MQTT_WS_PASSWORD,

      // TLS configuration
      MQTT_TLS_ENABLED: process.env.MQTT_TLS_ENABLED || 'true',
      MQTT_TLS_REJECT_UNAUTHORIZED: process.env.MQTT_TLS_REJECT_UNAUTHORIZED || 'true',
      MQTT_CA_CERT_PATH: process.env.MQTT_CA_CERT_PATH,
      MQTT_CLIENT_CERT_PATH: process.env.MQTT_CLIENT_CERT_PATH,
      MQTT_CLIENT_KEY_PATH: process.env.MQTT_CLIENT_KEY_PATH,

      // Connection settings
      MQTT_KEEPALIVE: process.env.MQTT_KEEPALIVE || '60',
      MQTT_CLEAN_SESSION: process.env.MQTT_CLEAN_SESSION || 'true',
      MQTT_RECONNECT_PERIOD: process.env.MQTT_RECONNECT_PERIOD || '1000',
      MQTT_CONNECT_TIMEOUT: process.env.MQTT_CONNECT_TIMEOUT || '30000',

      // QoS settings
      MQTT_QOS_TELEMETRY: process.env.MQTT_QOS_TELEMETRY || '0',
      MQTT_QOS_STATUS: process.env.MQTT_QOS_STATUS || '1',
      MQTT_QOS_ALARMS: process.env.MQTT_QOS_ALARMS || '2',
    };
  }

  /**
   * Validates required environment variables
   */
  private validateEnvironmentConfig(): void {
    const requiredVars = [
      'MQTT_BROKER_HOST',
      'MQTT_USERNAME',
      'MQTT_PASSWORD',
      'NEXT_PUBLIC_MQTT_WS_HOST',
      'NEXT_PUBLIC_MQTT_WS_USERNAME',
      'NEXT_PUBLIC_MQTT_WS_PASSWORD'
    ];

    const missingVars = requiredVars.filter(varName => {
      const value = this.envConfig[varName as keyof MQTTEnvironmentConfig];
      return !value || value.trim() === '';
    });

    if (missingVars.length > 0) {
      throw new Error(`Missing required MQTT environment variables: ${missingVars.join(', ')}`);
    }

    // Validate protocol values
    const validProtocols = ['mqtt', 'mqtts', 'ws', 'wss'];
    if (!validProtocols.includes(this.envConfig.MQTT_PROTOCOL!)) {
      throw new Error(`Invalid MQTT_PROTOCOL. Must be one of: ${validProtocols.join(', ')}`);
    }

    // Validate numeric values
    const numericVars = ['MQTT_BROKER_PORT', 'NEXT_PUBLIC_MQTT_WS_PORT', 'MQTT_KEEPALIVE', 'MQTT_RECONNECT_PERIOD'];
    numericVars.forEach(varName => {
      const value = this.envConfig[varName as keyof MQTTEnvironmentConfig];
      if (value && isNaN(parseInt(value))) {
        throw new Error(`${varName} must be a valid number`);
      }
    });
  }

  /**
   * Loads TLS certificates from file system
   */
  private loadTLSCertificates(): TLSOptions {
    const tlsOptions: TLSOptions = {};

    // Load CA certificate if specified
    if (this.envConfig.MQTT_CA_CERT_PATH) {
      try {
        tlsOptions.ca = readFileSync(this.envConfig.MQTT_CA_CERT_PATH);
      } catch (error) {
        throw new Error(`Failed to read CA certificate: ${error.message}`);
      }
    }

    // Load client certificate if specified
    if (this.envConfig.MQTT_CLIENT_CERT_PATH) {
      try {
        tlsOptions.cert = readFileSync(this.envConfig.MQTT_CLIENT_CERT_PATH);
      } catch (error) {
        throw new Error(`Failed to read client certificate: ${error.message}`);
      }
    }

    // Load client private key if specified
    if (this.envConfig.MQTT_CLIENT_KEY_PATH) {
      try {
        tlsOptions.key = readFileSync(this.envConfig.MQTT_CLIENT_KEY_PATH);
      } catch (error) {
        throw new Error(`Failed to read client private key: ${error.message}`);
      }
    }

    // Set reject unauthorized flag
    tlsOptions.rejectUnauthorized = this.envConfig.MQTT_TLS_REJECT_UNAUTHORIZED === 'true';

    return tlsOptions;
  }

  /**
   * Creates MQTT connection configuration for CNC machines
   */
  public createCNCMachineConfig(machineId: string): MQTTConnectionConfig {
    const tlsEnabled = this.envConfig.MQTT_TLS_ENABLED === 'true';
    const tlsOptions = tlsEnabled ? this.loadTLSCertificates() : {};

    const config: MQTTConnectionConfig = {
      host: this.envConfig.MQTT_BROKER_HOST!,
      port: parseInt(this.envConfig.MQTT_BROKER_PORT!),
      protocol: this.envConfig.MQTT_PROTOCOL!,
      username: this.envConfig.MQTT_USERNAME!,
      password: this.envConfig.MQTT_PASSWORD!,
      keepalive: parseInt(this.envConfig.MQTT_KEEPALIVE!),
      clean: this.envConfig.MQTT_CLEAN_SESSION === 'true',
      reconnectPeriod: parseInt(this.envConfig.MQTT_RECONNECT_PERIOD!),
      clientId: generateClientId('cnc_machine', machineId)
    };

    // Add TLS options if enabled
    if (tlsEnabled && Object.keys(tlsOptions).length > 0) {
      (config as any).ca = tlsOptions.ca;
      (config as any).cert = tlsOptions.cert;
      (config as any).key = tlsOptions.key;
      (config as any).rejectUnauthorized = tlsOptions.rejectUnauthorized;
    }

    return config;
  }

  /**
   * Creates WebSocket MQTT configuration for dashboard
   */
  public createDashboardConfig(userId: string): WebSocketMQTTConfig {
    const protocol = this.envConfig.MQTT_PROTOCOL === 'mqtts' ? 'wss' : 'ws';
    const brokerUrl = `${protocol}://${this.envConfig.NEXT_PUBLIC_MQTT_WS_HOST}:${this.envConfig.NEXT_PUBLIC_MQTT_WS_PORT}${this.envConfig.NEXT_PUBLIC_MQTT_WS_PATH}`;

    return {
      brokerUrl,
      username: this.envConfig.NEXT_PUBLIC_MQTT_WS_USERNAME!,
      password: this.envConfig.NEXT_PUBLIC_MQTT_WS_PASSWORD!,
      clientId: generateClientId('dashboard', userId),
      keepalive: parseInt(this.envConfig.MQTT_KEEPALIVE!),
      clean: this.envConfig.MQTT_CLEAN_SESSION === 'true'
    };
  }

  /**
   * Creates data bridge configuration
   */
  public createDataBridgeConfig(): MQTTConnectionConfig {
    return this.createCNCMachineConfig('data_bridge');
  }

  /**
   * Gets QoS level for different message types
   */
  public getQoSLevel(messageType: 'telemetry' | 'status' | 'alarms'): 0 | 1 | 2 {
    const qosMap = {
      telemetry: parseInt(this.envConfig.MQTT_QOS_TELEMETRY!) as 0 | 1 | 2,
      status: parseInt(this.envConfig.MQTT_QOS_STATUS!) as 0 | 1 | 2,
      alarms: parseInt(this.envConfig.MQTT_QOS_ALARMS!) as 0 | 1 | 2
    };

    return qosMap[messageType] || 0;
  }

  /**
   * Gets connection timeout setting
   */
  public getConnectionTimeout(): number {
    return parseInt(this.envConfig.MQTT_CONNECT_TIMEOUT!);
  }

  /**
   * Validates broker connectivity (for setup verification)
   */
  public async validateBrokerConnectivity(): Promise<{ success: boolean; error?: string }> {
    try {
      // Create a test configuration
      const testConfig = this.createCNCMachineConfig('connectivity_test');
      
      // Import MQTT here to avoid circular dependencies
      const { createMQTTConnection } = await import('./connection');
      
      // Attempt connection with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), this.getConnectionTimeout())
      );

      const connectionPromise = createMQTTConnection(testConfig);
      
      const client = await Promise.race([connectionPromise, timeoutPromise]) as any;
      
      // Close the test connection
      client.end();
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `MQTT broker connectivity test failed: ${error.message}` 
      };
    }
  }

  /**
   * Gets configuration summary for debugging
   */
  public getConfigSummary(): object {
    return {
      broker: {
        host: this.envConfig.MQTT_BROKER_HOST,
        port: this.envConfig.MQTT_BROKER_PORT,
        protocol: this.envConfig.MQTT_PROTOCOL,
        tlsEnabled: this.envConfig.MQTT_TLS_ENABLED === 'true'
      },
      websocket: {
        host: this.envConfig.NEXT_PUBLIC_MQTT_WS_HOST,
        port: this.envConfig.NEXT_PUBLIC_MQTT_WS_PORT,
        path: this.envConfig.NEXT_PUBLIC_MQTT_WS_PATH
      },
      qos: {
        telemetry: this.envConfig.MQTT_QOS_TELEMETRY,
        status: this.envConfig.MQTT_QOS_STATUS,
        alarms: this.envConfig.MQTT_QOS_ALARMS
      },
      connection: {
        keepalive: this.envConfig.MQTT_KEEPALIVE,
        clean: this.envConfig.MQTT_CLEAN_SESSION,
        reconnectPeriod: this.envConfig.MQTT_RECONNECT_PERIOD,
        timeout: this.envConfig.MQTT_CONNECT_TIMEOUT
      }
    };
  }
}

/**
 * Convenience function to get configured MQTT client
 */
export function getMQTTConfig(): MQTTConfig {
  return MQTTConfig.getInstance();
}

/**
 * Environment variable validation for Next.js
 */
export function validateMQTTEnvironment(): void {
  try {
    MQTTConfig.getInstance();
  } catch (error) {
    console.error('MQTT Configuration Error:', error.message);
    throw error;
  }
}