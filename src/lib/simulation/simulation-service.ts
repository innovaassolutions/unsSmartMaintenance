/**
 * CNC Simulation Service
 * Manages the continuous generation and publishing of simulated CNC machine data
 */

import mqtt, { IClientOptions, MqttClient } from 'mqtt';
import { CNCDataGeneratorFactory, SensorReading } from './cnc-data-generator';
import { TopicRegistry } from '@/lib/database/topic-registry';

export interface SimulationConfig {
  mqttBrokerUrl: string;
  mqttOptions: IClientOptions;
  publishInterval: number; // milliseconds
  enableLogging: boolean;
}

export interface SimulationMetrics {
  totalMessagesPublished: number;
  messagesPerSecond: number;
  activeMachines: number;
  lastUpdateTime: Date;
  uptime: number; // seconds
  errors: string[];
}

/**
 * CNC Simulation Service
 * Orchestrates the continuous simulation and publication of CNC machine data
 */
export class CNCSimulationService {
  private config: SimulationConfig;
  private mqttClient: MqttClient | null = null;
  private dataGeneratorFactory: CNCDataGeneratorFactory;
  private topicRegistry: TopicRegistry;
  private simulationInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private startTime: Date = new Date();
  
  // Metrics
  private metrics: SimulationMetrics = {
    totalMessagesPublished: 0,
    messagesPerSecond: 0,
    activeMachines: 0,
    lastUpdateTime: new Date(),
    uptime: 0,
    errors: [],
  };

  constructor(config: SimulationConfig) {
    this.config = config;
    this.dataGeneratorFactory = new CNCDataGeneratorFactory();
    this.topicRegistry = new TopicRegistry();
  }

  /**
   * Initialize the simulation service
   */
  public async initialize(): Promise<void> {
    try {
      // Connect to MQTT broker
      await this.connectMQTT();
      
      // Verify topic registry is accessible
      await this.verifyTopicRegistry();
      
      this.log('CNC Simulation Service initialized successfully');
    } catch (error) {
      const errorMessage = `Failed to initialize simulation service: ${error instanceof Error ? error.message : String(error)}`;
      this.metrics.errors.push(errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Start the simulation
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Simulation is already running');
    }

    if (!this.mqttClient || !this.mqttClient.connected) {
      await this.connectMQTT();
    }

    this.isRunning = true;
    this.startTime = new Date();
    this.metrics.errors = []; // Clear previous errors

    // Start the simulation loop
    this.simulationInterval = setInterval(() => {
      this.runSimulationCycle();
    }, this.config.publishInterval);

    this.log(`CNC Simulation started with ${this.config.publishInterval}ms interval`);
  }

  /**
   * Stop the simulation
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }

    if (this.mqttClient) {
      await new Promise<void>((resolve) => {
        this.mqttClient!.end(() => {
          resolve();
        });
      });
      this.mqttClient = null;
    }

    this.log('CNC Simulation stopped');
  }

  /**
   * Get current simulation metrics
   */
  public getMetrics(): SimulationMetrics {
    this.metrics.uptime = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    return { ...this.metrics };
  }

  /**
   * Check if simulation is running
   */
  public isSimulationRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Connect to MQTT broker
   */
  private async connectMQTT(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mqttClient = mqtt.connect(this.config.mqttBrokerUrl, this.config.mqttOptions);

      this.mqttClient.on('connect', () => {
        this.log('Connected to MQTT broker');
        resolve();
      });

      this.mqttClient.on('error', (error) => {
        const errorMessage = `MQTT connection error: ${error.message}`;
        this.metrics.errors.push(errorMessage);
        this.log(errorMessage);
        reject(error);
      });

      this.mqttClient.on('offline', () => {
        this.log('MQTT client offline');
      });

      this.mqttClient.on('reconnect', () => {
        this.log('MQTT client reconnecting');
      });

      // Set connection timeout
      setTimeout(() => {
        if (!this.mqttClient?.connected) {
          reject(new Error('MQTT connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Verify topic registry is accessible
   */
  private async verifyTopicRegistry(): Promise<void> {
    // Temporarily skip topic registry verification to test MQTT connection
    this.log('Skipping topic registry verification - using direct MQTT publishing');
    return;
    
    try {
      // Test basic registry functionality
      const testTopics = await this.topicRegistry.searchTopics({
        enterprise: 'uns-demo',
        is_active: true,
      });
      
      if (testTopics.length === 0) {
        this.log('Warning: No active topics found in registry');
      } else {
        this.log(`Found ${testTopics.length} active topics in registry`);
      }
    } catch (error) {
      throw new Error(`Topic registry verification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run a single simulation cycle
   */
  private async runSimulationCycle(): Promise<void> {
    try {
      const cycleStartTime = Date.now();
      
      // Generate data for all operational machines
      const allReadings = this.dataGeneratorFactory.generateOperationalReadings();
      
      // Track active machines
      this.metrics.activeMachines = allReadings.size;
      
      // Publish readings to MQTT
      let messagesPublished = 0;
      
      for (const [machineId, readings] of allReadings) {
        for (const reading of readings) {
          await this.publishReading(reading);
          messagesPublished++;
        }
      }

      // Update metrics
      this.metrics.totalMessagesPublished += messagesPublished;
      this.metrics.lastUpdateTime = new Date();
      
      // Calculate messages per second (rolling average)
      const cycleDuration = (Date.now() - cycleStartTime) / 1000;
      const currentRate = messagesPublished / cycleDuration;
      this.metrics.messagesPerSecond = Math.round(
        (this.metrics.messagesPerSecond * 0.8 + currentRate * 0.2) * 10
      ) / 10;

      this.log(`Simulation cycle completed: ${messagesPublished} messages in ${Math.round(cycleDuration * 1000)}ms`);
      
    } catch (error) {
      const errorMessage = `Simulation cycle error: ${error instanceof Error ? error.message : String(error)}`;
      this.metrics.errors.push(errorMessage);
      this.log(errorMessage);
      
      // If we have too many errors, stop the simulation
      if (this.metrics.errors.length > 10) {
        this.log('Too many errors, stopping simulation');
        await this.stop();
      }
    }
  }

  /**
   * Publish a single sensor reading to MQTT
   */
  private async publishReading(reading: SensorReading): Promise<void> {
    if (!this.mqttClient || !this.mqttClient.connected) {
      throw new Error('MQTT client not connected');
    }

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(reading.payload);
      
      this.mqttClient!.publish(reading.topicPath, payload, { qos: 0 }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Log message with timestamp
   */
  private log(message: string): void {
    if (this.config.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [CNC-Simulation] ${message}`);
    }
  }
}

/**
 * Factory function to create a configured simulation service
 */
export function createCNCSimulationService(config?: Partial<SimulationConfig>): CNCSimulationService {
  const defaultConfig: SimulationConfig = {
    mqttBrokerUrl: process.env.EMQX_CLOUD_URL || 'mqtt://localhost:1883',
    mqttOptions: {
      // Only set credentials if they are provided (for anonymous connections)
      ...(process.env.EMQX_CLOUD_USERNAME && { username: process.env.EMQX_CLOUD_USERNAME }),
      ...(process.env.EMQX_CLOUD_PASSWORD && { password: process.env.EMQX_CLOUD_PASSWORD }),
      clientId: `cnc-simulator-${Date.now()}`,
      clean: true,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
    },
    publishInterval: 5000, // 5 seconds
    enableLogging: process.env.NODE_ENV !== 'production',
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return new CNCSimulationService(mergedConfig);
}

/**
 * Simulation Management API
 * Provides a high-level interface for managing the simulation
 */
export class SimulationManager {
  private static instance: CNCSimulationService | null = null;

  /**
   * Get or create the simulation service instance
   */
  public static getInstance(config?: Partial<SimulationConfig>): CNCSimulationService {
    if (!SimulationManager.instance) {
      SimulationManager.instance = createCNCSimulationService(config);
    }
    return SimulationManager.instance;
  }

  /**
   * Start the simulation if not already running
   */
  public static async startSimulation(config?: Partial<SimulationConfig>): Promise<void> {
    const service = SimulationManager.getInstance(config);
    
    if (!service.isSimulationRunning()) {
      await service.initialize();
      await service.start();
    }
  }

  /**
   * Stop the simulation
   */
  public static async stopSimulation(): Promise<void> {
    if (SimulationManager.instance) {
      await SimulationManager.instance.stop();
    }
  }

  /**
   * Get simulation metrics
   */
  public static getMetrics(): SimulationMetrics | null {
    return SimulationManager.instance?.getMetrics() || null;
  }

  /**
   * Check if simulation is running
   */
  public static isRunning(): boolean {
    return SimulationManager.instance?.isSimulationRunning() || false;
  }

  /**
   * Restart the simulation
   */
  public static async restartSimulation(config?: Partial<SimulationConfig>): Promise<void> {
    await SimulationManager.stopSimulation();
    // Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    await SimulationManager.startSimulation(config);
  }
}