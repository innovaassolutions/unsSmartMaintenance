/**
 * Incremental Data Loading Strategy for UNS Smart Maintenance ML Pipeline
 * 
 * Provides efficient incremental data synchronization between TimescaleDB and BigQuery
 * with change detection, conflict resolution, and scheduling capabilities.
 */

import * as cron from 'node-cron';
import { BigQuery } from '@google-cloud/bigquery';
import TimescaleExtractor from './timescale-extractor';
import BigQueryLoader from './bigquery-loader';
import DataQualityMonitor from './data-quality-monitor';
import { etlLogger as logger } from '../utils/logger';

interface IncrementalConfig {
  schedulePattern: string; // Cron pattern
  batchSize: number;
  maxLookbackHours: number;
  enableChangeDetection: boolean;
  enableQualityChecks: boolean;
  retryAttempts: number;
  retryDelayMinutes: number;
  conflictResolution: 'latest_wins' | 'merge' | 'skip';
  watermarkTable: string;
}

interface WatermarkRecord {
  table_name: string;
  last_processed_timestamp: Date;
  last_successful_run: Date;
  records_processed: number;
  status: 'running' | 'completed' | 'failed';
  error_message?: string;
}

interface IncrementalStats {
  runId: string;
  startTime: Date;
  endTime?: Date;
  recordsExtracted: number;
  recordsLoaded: number;
  recordsSkipped: number;
  recordsErrored: number;
  qualityScore?: number;
  watermarkUpdated: Date;
  processingTimeMs: number;
  status: 'success' | 'partial' | 'failed';
  errors: string[];
}

export class IncrementalLoader {
  private bigquery: BigQuery;
  private extractor: TimescaleExtractor;
  private loader: BigQueryLoader;
  private qualityMonitor: DataQualityMonitor;
  private projectId: string;
  private datasetId: string;
  private scheduledJobs: Map<string, any> = new Map();

  constructor(projectId: string = 'uns-smart-maintenance-ml', datasetId: string = 'manufacturing_data') {
    this.bigquery = new BigQuery({ projectId });
    this.extractor = new TimescaleExtractor();
    this.loader = new BigQueryLoader();
    this.qualityMonitor = new DataQualityMonitor();
    this.projectId = projectId;
    this.datasetId = datasetId;
  }

  /**
   * Initialize incremental loading infrastructure
   */
  async initialize(): Promise<void> {
    logger.info('Initializing incremental loading infrastructure...');

    try {
      // Create watermark tracking table
      await this.createWatermarkTable();
      
      // Initialize watermarks for all tables
      await this.initializeWatermarks();
      
      logger.info('Incremental loading infrastructure initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize incremental loading:', error);
      throw error;
    }
  }

  /**
   * Create watermark tracking table
   */
  private async createWatermarkTable(): Promise<void> {
    const schema = [
      { name: 'table_name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'last_processed_timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'last_successful_run', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'records_processed', type: 'INTEGER', mode: 'REQUIRED' },
      { name: 'status', type: 'STRING', mode: 'REQUIRED' },
      { name: 'error_message', type: 'STRING', mode: 'NULLABLE' },
      { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'updated_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
    ];

    const options = {
      schema: schema,
      location: 'US',
      description: 'Watermark tracking for incremental data loading'
    };

    try {
      const table = this.bigquery.dataset(this.datasetId).table('incremental_watermarks');
      const [exists] = await table.exists();
      
      if (!exists) {
        await table.create(options);
        logger.info('Watermark table created successfully');
      }

    } catch (error) {
      logger.error('Failed to create watermark table:', error);
      throw error;
    }
  }

  /**
   * Initialize watermarks for all tables
   */
  private async initializeWatermarks(): Promise<void> {
    const tables = ['sensor_data', 'machine_status'];
    
    for (const tableName of tables) {
      try {
        // Check if watermark exists
        const existingWatermark = await this.getWatermark(tableName);
        
        if (!existingWatermark) {
          // Get earliest timestamp from source data
          const earliestTimestamp = await this.getEarliestTimestamp(tableName);
          
          await this.setWatermark({
            table_name: tableName,
            last_processed_timestamp: earliestTimestamp,
            last_successful_run: new Date(),
            records_processed: 0,
            status: 'completed'
          });

          logger.info(`Initialized watermark for ${tableName}: ${earliestTimestamp.toISOString()}`);
        }

      } catch (error) {
        logger.warn(`Failed to initialize watermark for ${tableName}:`, error);
      }
    }
  }

  /**
   * Get earliest timestamp from TimescaleDB for a table
   */
  private async getEarliestTimestamp(tableName: string): Promise<Date> {
    // This would query TimescaleDB - for now return a reasonable default
    const daysBack = tableName === 'sensor_data' ? 30 : 7;
    return new Date(Date.now() - (daysBack * 24 * 60 * 60 * 1000));
  }

  /**
   * Run incremental synchronization
   */
  async runIncremental(config: Partial<IncrementalConfig> = {}): Promise<IncrementalStats> {
    const defaultConfig: IncrementalConfig = {
      schedulePattern: '0 */15 * * * *', // Every 15 minutes
      batchSize: 5000,
      maxLookbackHours: 24,
      enableChangeDetection: true,
      enableQualityChecks: true,
      retryAttempts: 3,
      retryDelayMinutes: 5,
      conflictResolution: 'latest_wins',
      watermarkTable: 'incremental_watermarks',
      ...config
    };

    const runId = `incr_${Date.now()}`;
    const stats: IncrementalStats = {
      runId,
      startTime: new Date(),
      recordsExtracted: 0,
      recordsLoaded: 0,
      recordsSkipped: 0,
      recordsErrored: 0,
      watermarkUpdated: new Date(),
      processingTimeMs: 0,
      status: 'success',
      errors: []
    };

    logger.info(`Starting incremental run ${runId}`, defaultConfig);

    try {
      // Step 1: Process sensor data
      const sensorStats = await this.processIncrementalTable('sensor_data', defaultConfig, stats);
      
      // Step 2: Process machine status
      const machineStats = await this.processIncrementalTable('machine_status', defaultConfig, stats);
      
      // Step 3: Run quality checks if enabled
      if (defaultConfig.enableQualityChecks) {
        const qualityReport = await this.qualityMonitor.getQuickStatus();
        stats.qualityScore = qualityReport.completeness_percent || 0;
        
        if (stats.qualityScore < 95) {
          logger.warn(`Quality score below threshold: ${stats.qualityScore}%`);
          stats.errors.push(`Low data quality: ${stats.qualityScore}%`);
        }
      }

      // Step 4: Update final statistics
      stats.endTime = new Date();
      stats.processingTimeMs = stats.endTime.getTime() - stats.startTime.getTime();
      
      if (stats.errors.length > 0) {
        stats.status = 'partial';
      }

      logger.info(`Incremental run ${runId} completed`, {
        status: stats.status,
        recordsLoaded: stats.recordsLoaded,
        processingTimeMs: stats.processingTimeMs,
        qualityScore: stats.qualityScore
      });

      return stats;

    } catch (error) {
      stats.status = 'failed';
      stats.endTime = new Date();
      stats.processingTimeMs = stats.endTime.getTime() - stats.startTime.getTime();
      stats.errors.push(error.message);

      logger.error(`Incremental run ${runId} failed:`, error);
      throw error;
    }
  }

  /**
   * Process incremental updates for a specific table
   */
  private async processIncrementalTable(
    tableName: string, 
    config: IncrementalConfig, 
    stats: IncrementalStats
  ): Promise<void> {
    logger.info(`Processing incremental updates for ${tableName}...`);

    try {
      // Get current watermark
      const watermark = await this.getWatermark(tableName);
      if (!watermark) {
        throw new Error(`No watermark found for table ${tableName}`);
      }

      // Update watermark status to running
      await this.setWatermark({
        ...watermark,
        status: 'running'
      });

      // Calculate time window for extraction
      const startTime = watermark.last_processed_timestamp;
      const endTime = new Date(Math.min(
        Date.now(),
        startTime.getTime() + (config.maxLookbackHours * 60 * 60 * 1000)
      ));

      if (startTime >= endTime) {
        logger.info(`No new data to process for ${tableName}`);
        return;
      }

      logger.info(`Extracting ${tableName} data from ${startTime.toISOString()} to ${endTime.toISOString()}`);

      if (tableName === 'sensor_data') {
        await this.processSensorDataIncremental(startTime, endTime, config, stats);
      } else if (tableName === 'machine_status') {
        await this.processMachineStatusIncremental(stats);
      }

      // Update watermark on success
      await this.setWatermark({
        table_name: tableName,
        last_processed_timestamp: endTime,
        last_successful_run: new Date(),
        records_processed: watermark.records_processed + stats.recordsLoaded,
        status: 'completed'
      });

      stats.watermarkUpdated = endTime;

    } catch (error) {
      // Update watermark status to failed
      const currentWatermark = await this.getWatermark(tableName);
      if (currentWatermark) {
        await this.setWatermark({
          ...currentWatermark,
          status: 'failed',
          error_message: error.message
        });
      }

      stats.errors.push(`${tableName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process incremental sensor data
   */
  private async processSensorDataIncremental(
    startTime: Date,
    endTime: Date,
    config: IncrementalConfig,
    stats: IncrementalStats
  ): Promise<void> {
    const extractOptions = {
      batchSize: config.batchSize,
      startDate: startTime,
      endDate: endTime,
      validateData: true,
      includeMetadata: true
    };

    let batchCount = 0;
    
    try {
      for await (const batch of this.extractor.extractSensorData(extractOptions)) {
        batchCount++;
        
        // Detect conflicts if enabled
        let processedBatch = batch;
        if (config.enableChangeDetection) {
          processedBatch = await this.handleDataConflicts(batch, config.conflictResolution);
        }

        // Load batch to BigQuery
        const loadResult = await this.loader.loadSensorDataBatch(processedBatch, {
          writeDisposition: 'WRITE_APPEND',
          skipInvalidRows: true,
          maxBadRecords: Math.floor(processedBatch.length * 0.02) // Allow 2% bad records
        });

        stats.recordsExtracted += batch.length;
        stats.recordsLoaded += loadResult.validRows;
        stats.recordsErrored += loadResult.errorRows;

        logger.debug(`Processed incremental batch ${batchCount}: ${loadResult.validRows} records loaded`);

        // Rate limiting to avoid overwhelming the system
        if (batchCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second pause
        }
      }

    } catch (error) {
      logger.error('Incremental sensor data processing failed:', error);
      throw error;
    }
  }

  /**
   * Process incremental machine status data
   */
  private async processMachineStatusIncremental(stats: IncrementalStats): Promise<void> {
    try {
      // Machine status is typically full refresh due to small size
      const machineRecords = await this.extractor.extractMachineStatus();
      
      if (machineRecords.length > 0) {
        const loadResult = await this.loader.loadMachineStatus(machineRecords);
        
        stats.recordsExtracted += machineRecords.length;
        stats.recordsLoaded += loadResult.validRows;
        stats.recordsErrored += loadResult.errorRows;
        
        logger.info(`Machine status refreshed: ${loadResult.validRows} records`);
      }

    } catch (error) {
      logger.error('Incremental machine status processing failed:', error);
      throw error;
    }
  }

  /**
   * Handle data conflicts during incremental loading
   */
  private async handleDataConflicts(batch: any[], resolution: string): Promise<any[]> {
    if (resolution === 'skip') {
      return batch;
    }

    // For now, implement simple latest_wins strategy
    // In production, you would check existing records in BigQuery
    const uniqueBatch = new Map();
    
    for (const record of batch) {
      const key = `${record.machine_id}|${record.time.toISOString()}`;
      
      if (!uniqueBatch.has(key) || resolution === 'latest_wins') {
        uniqueBatch.set(key, record);
      }
    }

    return Array.from(uniqueBatch.values());
  }

  /**
   * Schedule automatic incremental runs
   */
  scheduleIncrementalSync(config: Partial<IncrementalConfig> = {}): string {
    const defaultConfig: IncrementalConfig = {
      schedulePattern: '0 */15 * * * *', // Every 15 minutes
      batchSize: 5000,
      maxLookbackHours: 24,
      enableChangeDetection: true,
      enableQualityChecks: true,
      retryAttempts: 3,
      retryDelayMinutes: 5,
      conflictResolution: 'latest_wins',
      watermarkTable: 'incremental_watermarks',
      ...config
    };

    const scheduleName = `incremental_sync_${Date.now()}`;
    
    const task = cron.schedule(defaultConfig.schedulePattern, async () => {
      try {
        logger.info(`Starting scheduled incremental sync: ${scheduleName}`);
        await this.runIncremental(defaultConfig);
      } catch (error) {
        logger.error(`Scheduled incremental sync failed: ${scheduleName}`, error);
        
        // Retry logic
        for (let attempt = 1; attempt <= defaultConfig.retryAttempts; attempt++) {
          try {
            logger.info(`Retry attempt ${attempt}/${defaultConfig.retryAttempts} for ${scheduleName}`);
            await new Promise(resolve => setTimeout(resolve, defaultConfig.retryDelayMinutes * 60 * 1000));
            await this.runIncremental(defaultConfig);
            logger.info(`Retry attempt ${attempt} succeeded for ${scheduleName}`);
            break;
          } catch (retryError) {
            logger.error(`Retry attempt ${attempt} failed for ${scheduleName}:`, retryError);
            if (attempt === defaultConfig.retryAttempts) {
              logger.error(`All retry attempts failed for ${scheduleName}`);
            }
          }
        }
      }
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.scheduledJobs.set(scheduleName, task);
    task.start();

    logger.info(`Incremental sync scheduled: ${scheduleName} with pattern ${defaultConfig.schedulePattern}`);
    return scheduleName;
  }

  /**
   * Stop scheduled job
   */
  stopScheduledSync(scheduleName: string): void {
    const task = this.scheduledJobs.get(scheduleName);
    if (task) {
      task.stop();
      this.scheduledJobs.delete(scheduleName);
      logger.info(`Stopped scheduled sync: ${scheduleName}`);
    } else {
      logger.warn(`Scheduled sync not found: ${scheduleName}`);
    }
  }

  /**
   * Get current watermark for table
   */
  private async getWatermark(tableName: string): Promise<WatermarkRecord | null> {
    const query = `
      SELECT 
        table_name,
        last_processed_timestamp,
        last_successful_run,
        records_processed,
        status,
        error_message
      FROM \`${this.projectId}.${this.datasetId}.incremental_watermarks\`
      WHERE table_name = @tableName
      ORDER BY updated_at DESC
      LIMIT 1
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query,
        location: 'US',
        params: { tableName }
      });

      const [rows] = await job.getQueryResults();
      
      if (rows.length === 0) {
        return null;
      }

      const row = rows[0];
      return {
        table_name: row.table_name,
        last_processed_timestamp: new Date(row.last_processed_timestamp.value),
        last_successful_run: new Date(row.last_successful_run.value),
        records_processed: parseInt(row.records_processed),
        status: row.status,
        error_message: row.error_message
      };

    } catch (error) {
      logger.error(`Failed to get watermark for ${tableName}:`, error);
      return null;
    }
  }

  /**
   * Set watermark for table
   */
  private async setWatermark(watermark: WatermarkRecord): Promise<void> {
    const query = `
      MERGE \`${this.projectId}.${this.datasetId}.incremental_watermarks\` AS target
      USING (
        SELECT 
          @tableName as table_name,
          @lastProcessedTimestamp as last_processed_timestamp,
          @lastSuccessfulRun as last_successful_run,
          @recordsProcessed as records_processed,
          @status as status,
          @errorMessage as error_message,
          CURRENT_TIMESTAMP() as created_at,
          CURRENT_TIMESTAMP() as updated_at
      ) AS source
      ON target.table_name = source.table_name
      WHEN MATCHED THEN
        UPDATE SET 
          last_processed_timestamp = source.last_processed_timestamp,
          last_successful_run = source.last_successful_run,
          records_processed = source.records_processed,
          status = source.status,
          error_message = source.error_message,
          updated_at = source.updated_at
      WHEN NOT MATCHED THEN
        INSERT (table_name, last_processed_timestamp, last_successful_run, records_processed, status, error_message, created_at, updated_at)
        VALUES (source.table_name, source.last_processed_timestamp, source.last_successful_run, source.records_processed, source.status, source.error_message, source.created_at, source.updated_at)
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query,
        location: 'US',
        params: {
          tableName: watermark.table_name,
          lastProcessedTimestamp: watermark.last_processed_timestamp.toISOString(),
          lastSuccessfulRun: watermark.last_successful_run.toISOString(),
          recordsProcessed: watermark.records_processed,
          status: watermark.status,
          errorMessage: watermark.error_message || null
        }
      });

      await job.promise();

    } catch (error) {
      logger.error(`Failed to set watermark for ${watermark.table_name}:`, error);
      throw error;
    }
  }

  /**
   * Get incremental loading status
   */
  async getIncrementalStatus(): Promise<any> {
    const query = `
      SELECT 
        table_name,
        last_processed_timestamp,
        last_successful_run,
        records_processed,
        status,
        error_message,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_processed_timestamp, HOUR) as hours_behind,
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), last_successful_run, MINUTE) as minutes_since_success
      FROM \`${this.projectId}.${this.datasetId}.incremental_watermarks\`
      ORDER BY table_name
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      
      return {
        tables: rows,
        scheduledJobs: Array.from(this.scheduledJobs.keys()),
        overallStatus: rows.every(row => row.status === 'completed') ? 'healthy' : 'issues_detected'
      };

    } catch (error) {
      logger.error('Failed to get incremental status:', error);
      return { error: error.message };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Stop all scheduled jobs
    for (const [name, task] of this.scheduledJobs) {
      task.stop();
      logger.info(`Stopped scheduled job: ${name}`);
    }
    
    this.scheduledJobs.clear();
    
    // Close database connections
    await this.extractor.close();
    
    logger.info('Incremental loader cleanup completed');
  }
}

export default IncrementalLoader;