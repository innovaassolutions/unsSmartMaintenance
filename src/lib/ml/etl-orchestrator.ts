/**
 * ETL Orchestrator for UNS Smart Maintenance ML Pipeline
 * 
 * Coordinates the complete ETL process from TimescaleDB to BigQuery,
 * including data validation, feature engineering, and monitoring.
 */

import BigQuerySetup from './bigquery-setup';
import TimescaleExtractor from './timescale-extractor';
import BigQueryLoader from './bigquery-loader';
import { etlLogger as logger } from '../utils/logger';

interface ETLConfig {
  batchSize: number;
  maxConcurrentBatches: number;
  retryAttempts: number;
  retryDelayMs: number;
  startDate?: Date;
  endDate?: Date;
  machineIds?: string[];
  sensorTypes?: string[];
  includeFeatureEngineering: boolean;
  validateData: boolean;
  dryRun: boolean;
}

interface ETLStats {
  startTime: Date;
  endTime?: Date;
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  batchesProcessed: number;
  batchesFailed: number;
  averageBatchSize: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  throughputRecordsPerSecond: number;
  bigQueryJobs: string[];
  errors: any[];
}

export class ETLOrchestrator {
  private bigQuerySetup: BigQuerySetup;
  private extractor: TimescaleExtractor;
  private loader: BigQueryLoader;
  private stats: ETLStats;

  constructor() {
    this.bigQuerySetup = new BigQuerySetup();
    this.extractor = new TimescaleExtractor();
    this.loader = new BigQueryLoader();
    this.initializeStats();
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStats(): void {
    this.stats = {
      startTime: new Date(),
      totalRecords: 0,
      processedRecords: 0,
      errorRecords: 0,
      batchesProcessed: 0,
      batchesFailed: 0,
      averageBatchSize: 0,
      averageProcessingTime: 0,
      totalProcessingTime: 0,
      throughputRecordsPerSecond: 0,
      bigQueryJobs: [],
      errors: []
    };
  }

  /**
   * Run complete ETL pipeline
   */
  async runFullPipeline(config: Partial<ETLConfig> = {}): Promise<ETLStats> {
    const defaultConfig: ETLConfig = {
      batchSize: 10000,
      maxConcurrentBatches: 3,
      retryAttempts: 3,
      retryDelayMs: 5000,
      includeFeatureEngineering: true,
      validateData: true,
      dryRun: false,
      ...config
    };

    this.initializeStats();
    logger.info('Starting ETL pipeline execution', defaultConfig);

    try {
      // Step 1: Initialize BigQuery infrastructure
      await this.initializeBigQuery();

      // Step 2: Test connections and get data overview
      await this.validateConnections();

      // Step 3: Load machine status data (reference data)
      await this.loadMachineStatus();

      // Step 4: Process sensor data in batches
      await this.processSensorDataPipeline(defaultConfig);

      // Step 5: Run feature engineering if enabled
      if (defaultConfig.includeFeatureEngineering) {
        await this.runFeatureEngineering();
      }

      // Step 6: Generate final statistics
      await this.finalizeStats();

      logger.info('ETL pipeline completed successfully', this.stats);
      return this.stats;

    } catch (error) {
      logger.error('ETL pipeline failed:', error);
      this.stats.errors.push(error);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize BigQuery dataset and tables
   */
  private async initializeBigQuery(): Promise<void> {
    logger.info('Initializing BigQuery infrastructure...');
    
    try {
      await this.bigQuerySetup.initializeAllTables();
      
      const setupInfo = await this.bigQuerySetup.getSetupInfo();
      logger.info('BigQuery setup completed:', setupInfo);
      
    } catch (error) {
      logger.error('BigQuery initialization failed:', error);
      throw error;
    }
  }

  /**
   * Validate all connections and get data overview
   */
  private async validateConnections(): Promise<void> {
    logger.info('Validating connections and analyzing data...');
    
    try {
      // Test TimescaleDB connection and get statistics
      const timescaleStats = await this.extractor.testConnection();
      logger.info('TimescaleDB connection validated:', timescaleStats);
      
      // Get data profile for optimization
      const dataProfile = await this.extractor.getDataProfileInfo();
      logger.info('Data profile analysis completed:', {
        sensorTypes: dataProfile.sensor_types.length,
        machines: dataProfile.machines.length,
        dataQuality: dataProfile.data_quality
      });

      // Validate BigQuery setup
      const isSetupValid = await this.bigQuerySetup.validateSetup();
      if (!isSetupValid) {
        throw new Error('BigQuery setup validation failed');
      }

      this.stats.totalRecords = parseInt(timescaleStats.sensor_data.total_records);
      
    } catch (error) {
      logger.error('Connection validation failed:', error);
      throw error;
    }
  }

  /**
   * Load machine status reference data
   */
  private async loadMachineStatus(): Promise<void> {
    logger.info('Loading machine status data...');
    
    try {
      const machineRecords = await this.extractor.extractMachineStatus();
      
      if (machineRecords.length > 0) {
        const loadResult = await this.loader.loadMachineStatus(machineRecords);
        logger.info(`Machine status loaded: ${loadResult.validRows} records`);
      }
      
    } catch (error) {
      logger.error('Machine status loading failed:', error);
      this.stats.errors.push(error);
      // Don't throw - continue with sensor data loading
    }
  }

  /**
   * Process sensor data pipeline with concurrent batch processing
   */
  private async processSensorDataPipeline(config: ETLConfig): Promise<void> {
    logger.info('Starting sensor data processing pipeline...');
    
    const extractOptions = {
      batchSize: config.batchSize,
      startDate: config.startDate,
      endDate: config.endDate,
      machineIds: config.machineIds,
      sensorTypes: config.sensorTypes,
      includeMetadata: true,
      validateData: config.validateData
    };

    try {
      let batchPromises: Promise<void>[] = [];
      let batchCount = 0;

      // Process batches with concurrency control
      for await (const batch of this.extractor.extractSensorData(extractOptions)) {
        batchCount++;
        
        // Create batch processing promise
        const batchPromise = this.processBatch(batch, batchCount, config);
        batchPromises.push(batchPromise);

        // Control concurrency
        if (batchPromises.length >= config.maxConcurrentBatches) {
          await Promise.all(batchPromises);
          batchPromises = [];
        }

        // Progress logging every 50 batches
        if (batchCount % 50 === 0) {
          const progress = (this.stats.processedRecords / this.stats.totalRecords * 100).toFixed(2);
          logger.info(`Pipeline progress: ${batchCount} batches, ${this.stats.processedRecords.toLocaleString()} records (${progress}%)`);
        }
      }

      // Process remaining batches
      if (batchPromises.length > 0) {
        await Promise.all(batchPromises);
      }

      logger.info(`Sensor data pipeline completed: ${this.stats.batchesProcessed} batches processed`);

    } catch (error) {
      logger.error('Sensor data pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Process individual batch with retry logic
   */
  private async processBatch(batch: any[], batchNumber: number, config: ETLConfig): Promise<void> {
    const batchStartTime = Date.now();
    let attempt = 0;

    while (attempt < config.retryAttempts) {
      try {
        if (config.dryRun) {
          logger.info(`DRY RUN: Would process batch ${batchNumber} with ${batch.length} records`);
          this.stats.processedRecords += batch.length;
          this.stats.batchesProcessed++;
          return;
        }

        // Load batch to BigQuery
        const loadResult = await this.loader.loadSensorDataBatch(batch, {
          writeDisposition: 'WRITE_APPEND',
          skipInvalidRows: true,
          maxBadRecords: Math.floor(batch.length * 0.01) // Allow 1% bad records
        });

        // Update statistics
        this.stats.processedRecords += loadResult.validRows;
        this.stats.errorRecords += loadResult.errorRows;
        this.stats.batchesProcessed++;
        
        if (loadResult.jobId) {
          this.stats.bigQueryJobs.push(loadResult.jobId);
        }

        const batchTime = Date.now() - batchStartTime;
        this.stats.totalProcessingTime += batchTime;

        logger.debug(`Batch ${batchNumber} completed: ${loadResult.validRows} records in ${batchTime}ms`);
        return;

      } catch (error) {
        attempt++;
        logger.warn(`Batch ${batchNumber} attempt ${attempt} failed:`, error);

        if (attempt >= config.retryAttempts) {
          logger.error(`Batch ${batchNumber} failed after ${config.retryAttempts} attempts`);
          this.stats.batchesFailed++;
          this.stats.errors.push({
            batch: batchNumber,
            error: error,
            records: batch.length
          });
          return; // Skip this batch and continue
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, config.retryDelayMs * attempt));
      }
    }
  }

  /**
   * Run feature engineering pipeline
   */
  private async runFeatureEngineering(): Promise<void> {
    logger.info('Starting feature engineering pipeline...');
    
    try {
      // This will be implemented in the feature engineering module
      // For now, just log the intent
      logger.info('Feature engineering pipeline will be implemented in separate module');
      
      // TODO: Call feature engineering pipeline
      // await this.featureEngineer.generateFeatures();
      
    } catch (error) {
      logger.error('Feature engineering failed:', error);
      this.stats.errors.push(error);
      // Don't throw - feature engineering is optional
    }
  }

  /**
   * Finalize statistics and generate summary
   */
  private async finalizeStats(): Promise<void> {
    this.stats.endTime = new Date();
    
    if (this.stats.batchesProcessed > 0) {
      this.stats.averageBatchSize = Math.round(this.stats.processedRecords / this.stats.batchesProcessed);
      this.stats.averageProcessingTime = Math.round(this.stats.totalProcessingTime / this.stats.batchesProcessed);
    }

    if (this.stats.totalProcessingTime > 0) {
      this.stats.throughputRecordsPerSecond = Math.round(
        (this.stats.processedRecords / this.stats.totalProcessingTime) * 1000
      );
    }

    // Get BigQuery loading statistics
    try {
      const loadingStats = await this.loader.getLoadingStats();
      logger.info('BigQuery loading statistics:', loadingStats);
    } catch (error) {
      logger.warn('Could not retrieve BigQuery loading statistics:', error);
    }
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      await this.extractor.close();
      logger.info('ETL cleanup completed');
    } catch (error) {
      logger.warn('Error during cleanup:', error);
    }
  }

  /**
   * Monitor ETL pipeline progress
   */
  async getProgress(): Promise<any> {
    const currentTime = Date.now();
    const elapsedTime = currentTime - this.stats.startTime.getTime();
    const elapsedSeconds = elapsedTime / 1000;

    const progress = this.stats.totalRecords > 0 
      ? (this.stats.processedRecords / this.stats.totalRecords) * 100
      : 0;

    const estimatedTimeRemaining = progress > 0 && progress < 100
      ? (elapsedSeconds / progress) * (100 - progress)
      : 0;

    return {
      progress: Math.round(progress * 100) / 100,
      processedRecords: this.stats.processedRecords,
      totalRecords: this.stats.totalRecords,
      batchesProcessed: this.stats.batchesProcessed,
      batchesFailed: this.stats.batchesFailed,
      errorRecords: this.stats.errorRecords,
      elapsedSeconds: Math.round(elapsedSeconds),
      estimatedTimeRemainingSeconds: Math.round(estimatedTimeRemaining),
      currentThroughput: this.stats.throughputRecordsPerSecond,
      bigQueryJobs: this.stats.bigQueryJobs.length,
      errors: this.stats.errors.length
    };
  }

  /**
   * Run incremental update (for ongoing data sync)
   */
  async runIncrementalUpdate(lastUpdateTime: Date): Promise<ETLStats> {
    logger.info(`Running incremental update since ${lastUpdateTime.toISOString()}`);
    
    return this.runFullPipeline({
      startDate: lastUpdateTime,
      batchSize: 5000, // Smaller batches for incremental updates
      maxConcurrentBatches: 2,
      includeFeatureEngineering: true,
      validateData: true,
      dryRun: false
    });
  }

  /**
   * Get detailed statistics
   */
  getDetailedStats(): ETLStats {
    return { ...this.stats };
  }
}

export default ETLOrchestrator;