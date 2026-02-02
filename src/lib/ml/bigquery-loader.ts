/**
 * BigQuery Data Loader for UNS Smart Maintenance ML Pipeline
 * 
 * Efficiently loads large datasets into BigQuery with streaming inserts,
 * batch loading, and error handling optimized for 24.6M+ records.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { bigQueryLogger as logger } from '../utils/logger';

interface LoadOptions {
  tableName: string;
  writeDisposition: 'WRITE_TRUNCATE' | 'WRITE_APPEND' | 'WRITE_EMPTY';
  createDisposition: 'CREATE_IF_NEEDED' | 'CREATE_NEVER';
  skipInvalidRows: boolean;
  ignoreUnknownValues: boolean;
  maxBadRecords: number;
  useStreaming: boolean;
  batchSize: number;
}

interface LoadResult {
  jobId?: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  loadTime: number;
  throughput: number;
  errors: any[];
}

export class BigQueryLoader {
  private bigquery: BigQuery;
  private projectId: string;
  private datasetId: string;

  constructor(projectId: string = 'uns-smart-maintenance-ml', datasetId: string = 'manufacturing_data') {
    this.bigquery = new BigQuery({ 
      projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    this.projectId = projectId;
    this.datasetId = datasetId;
  }

  /**
   * Load sensor data using batch insert for optimal performance
   */
  async loadSensorDataBatch(
    records: any[], 
    options: Partial<LoadOptions> = {}
  ): Promise<LoadResult> {
    const startTime = Date.now();
    const defaultOptions: LoadOptions = {
      tableName: 'sensor_data',
      writeDisposition: 'WRITE_APPEND',
      createDisposition: 'CREATE_NEVER',
      skipInvalidRows: true,
      ignoreUnknownValues: false,
      maxBadRecords: 100,
      useStreaming: false,
      batchSize: 10000,
      ...options
    };

    try {
      logger.info(`Starting BigQuery batch load: ${records.length.toLocaleString()} records to ${defaultOptions.tableName}`);

      // Transform records to BigQuery format
      const transformedRecords = this.transformSensorRecords(records);
      
      const table = this.bigquery.dataset(this.datasetId).table(defaultOptions.tableName);

      let result: LoadResult;
      
      if (defaultOptions.useStreaming && records.length <= 1000) {
        // Use streaming insert for small batches (real-time updates)
        result = await this.streamInsert(table, transformedRecords);
      } else {
        // Use batch load job for large datasets (optimal for bulk loading)
        result = await this.batchLoadJob(table, transformedRecords, defaultOptions);
      }

      const loadTime = Date.now() - startTime;
      result.loadTime = loadTime;
      result.throughput = (result.validRows / loadTime) * 1000; // records per second

      logger.info(`Batch load completed: ${result.validRows.toLocaleString()} records loaded in ${loadTime}ms (${result.throughput.toFixed(2)} records/sec)`);

      if (result.errorRows > 0) {
        logger.warn(`${result.errorRows} records failed to load`, result.errors);
      }

      return result;

    } catch (error) {
      logger.error('BigQuery batch load failed:', error);
      throw error;
    }
  }

  /**
   * Load machine status data
   */
  async loadMachineStatus(records: any[]): Promise<LoadResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Loading ${records.length} machine status records`);

      const transformedRecords = this.transformMachineRecords(records);
      const table = this.bigquery.dataset(this.datasetId).table('machine_status');

      const result = await this.batchLoadJob(table, transformedRecords, {
        tableName: 'machine_status',
        writeDisposition: 'WRITE_TRUNCATE', // Replace existing data
        createDisposition: 'CREATE_NEVER',
        skipInvalidRows: false,
        ignoreUnknownValues: false,
        maxBadRecords: 0,
        useStreaming: false,
        batchSize: 1000
      });

      result.loadTime = Date.now() - startTime;
      result.throughput = (result.validRows / result.loadTime) * 1000;

      logger.info(`Machine status loaded: ${result.validRows} records in ${result.loadTime}ms`);
      return result;

    } catch (error) {
      logger.error('Machine status load failed:', error);
      throw error;
    }
  }

  /**
   * Streaming insert for real-time data (up to 1000 records)
   */
  private async streamInsert(table: any, records: any[]): Promise<LoadResult> {
    try {
      const insertOptions = {
        skipInvalidRows: true,
        ignoreUnknownValues: false,
      };

      await table.insert(records, insertOptions);

      return {
        totalRows: records.length,
        validRows: records.length,
        errorRows: 0,
        loadTime: 0, // Will be set by caller
        throughput: 0, // Will be set by caller  
        errors: []
      };

    } catch (error) {
      logger.error('Streaming insert failed:', error);
      
      // Parse BigQuery errors
      const errors = error.errors || [];
      const errorCount = errors.length;

      return {
        totalRows: records.length,
        validRows: records.length - errorCount,
        errorRows: errorCount,
        loadTime: 0,
        throughput: 0,
        errors: errors
      };
    }
  }

  /**
   * Batch load job for large datasets (millions of records)
   */
  private async batchLoadJob(table: any, records: any[], options: LoadOptions): Promise<LoadResult> {
    try {
      const jobConfig = {
        sourceFormat: 'NEWLINE_DELIMITED_JSON',
        writeDisposition: options.writeDisposition,
        createDisposition: options.createDisposition,
        skipLeadingRows: 0,
        allowJaggedRows: false,
        allowQuotedNewlines: false,
        ignoreUnknownValues: options.ignoreUnknownValues,
        maxBadRecords: options.maxBadRecords,
        schema: {
          autodetect: false,
          fields: await this.getTableSchema(options.tableName)
        }
      };

      // Convert records to NDJSON format
      const ndjsonData = records.map(record => JSON.stringify(record)).join('\n');
      
      // Create and run load job
      const [job] = await table.createLoadJob(ndjsonData, jobConfig);
      logger.info(`BigQuery load job created: ${job.id}`);

      // Wait for job completion
      const [jobResult] = await job.promise();
      
      // Get job statistics
      const stats = jobResult.statistics?.load;
      const errors = jobResult.status?.errors || [];

      return {
        jobId: job.id,
        totalRows: parseInt(stats?.inputFiles || '0'),
        validRows: parseInt(stats?.outputRows || '0'),
        errorRows: parseInt(stats?.badRecords || '0'),
        loadTime: 0, // Will be set by caller
        throughput: 0, // Will be set by caller
        errors: errors
      };

    } catch (error) {
      logger.error('Batch load job failed:', error);
      throw error;
    }
  }

  /**
   * Transform sensor records for BigQuery schema
   */
  private transformSensorRecords(records: any[]): any[] {
    return records.map(record => {
      // Extract sensor type from machine_id  
      const sensorType = record.machine_id.split('.').pop() || 'unknown';
      
      // Extract machine name from location_path
      const pathParts = record.location_path.split('.');
      const machineName = pathParts[pathParts.length - 1] || 'unknown';
      
      // Extract assembly line from location path
      const assemblyLine = pathParts.length > 3 ? pathParts[3] : 'unknown';
      
      // Determine equipment type based on machine name patterns
      const equipmentType = this.determineEquipmentType(machineName);

      return {
        id: record.id,
        machine_id: record.machine_id,
        location_path: record.location_path,
        sensor_type: sensorType,
        timestamp: record.time.toISOString(),
        value: record.value,
        machine_name: machineName,
        assembly_line: assemblyLine,
        equipment_type: equipmentType,
        data_quality_score: this.calculateDataQuality(record.value, sensorType),
        is_outlier: this.detectOutlier(record.value, sensorType),
        interpolated: false,
        ingestion_time: (record.ingestion_time || new Date()).toISOString(),
        source_system: 'timescaledb'
      };
    });
  }

  /**
   * Transform machine status records for BigQuery
   */
  private transformMachineRecords(records: any[]): any[] {
    return records.map(record => {
      // Extract assembly line from location path
      const pathParts = record.location_path.split('.');
      const assemblyLine = pathParts.length > 3 ? pathParts[3] : 'unknown';

      return {
        machine_id: record.machine_id,
        location_path: record.location_path,
        machine_name: record.machine_name,
        equipment_type: record.equipment_type,
        status: record.status,
        last_maintenance: record.last_maintenance?.toISOString() || null,
        next_maintenance_due: record.next_maintenance_due?.toISOString() || null,
        operational_hours: record.operational_hours || 0,
        assembly_line: assemblyLine,
        production_shift: record.production_shift || 'day',
        operator_id: record.operator_id || 'unknown',
        failure_risk_score: 0.5, // Default - will be updated by ML models
        performance_index: 1.0, // Default - will be calculated from sensor data
        vibration_baseline: null, // Will be calculated from historical data
        temperature_baseline: null, // Will be calculated from historical data
        last_updated: record.last_updated.toISOString(),
        ingestion_time: new Date().toISOString()
      };
    });
  }

  /**
   * Determine equipment type from machine name
   */
  private determineEquipmentType(machineName: string): string {
    const lowerName = machineName.toLowerCase();
    
    if (lowerName.includes('welder') || lowerName.includes('weld')) {
      return 'Contact Welder';
    } else if (lowerName.includes('winder') || lowerName.includes('coil')) {
      return 'Coil Winder';
    } else if (lowerName.includes('press') || lowerName.includes('assembly')) {
      return 'Assembly Press';
    } else if (lowerName.includes('inserter') || lowerName.includes('terminal')) {
      return 'Terminal Inserter';
    } else if (lowerName.includes('molder') || lowerName.includes('injection')) {
      return 'Injection Molder';
    } else if (lowerName.includes('tester') || lowerName.includes('test')) {
      return 'Final Tester';
    } else {
      return 'Unknown Equipment';
    }
  }

  /**
   * Calculate data quality score (0-1)
   */
  private calculateDataQuality(value: number, sensorType: string): number {
    if (value === null || value === undefined) return 0;
    if (!isFinite(value)) return 0;
    
    // Sensor-specific quality checks
    let qualityScore = 1.0;
    
    if (sensorType.includes('temperature')) {
      // Temperature should be reasonable (-50 to 200 C)
      if (value < -50 || value > 200) qualityScore *= 0.5;
    } else if (sensorType.includes('vibration')) {
      // Vibration should be positive and reasonable
      if (value < 0) qualityScore *= 0.7;
      if (value > 100) qualityScore *= 0.5;
    } else if (sensorType.includes('pressure')) {
      // Pressure should be positive
      if (value < 0) qualityScore *= 0.3;
    }
    
    return Math.max(0, Math.min(1, qualityScore));
  }

  /**
   * Simple outlier detection using IQR method
   */
  private detectOutlier(value: number, sensorType: string): boolean {
    // This is a simple implementation - in production you'd use historical statistics
    const extremeThresholds = {
      temperature: { min: -100, max: 500 },
      vibration: { min: -50, max: 200 },
      pressure: { min: -10, max: 1000 },
      current: { min: -100, max: 500 }
    };

    for (const [type, thresholds] of Object.entries(extremeThresholds)) {
      if (sensorType.includes(type)) {
        return value < thresholds.min || value > thresholds.max;
      }
    }

    return false; // Default: not an outlier
  }

  /**
   * Get table schema for load job configuration
   */
  private async getTableSchema(tableName: string): Promise<any[]> {
    try {
      const table = this.bigquery.dataset(this.datasetId).table(tableName);
      const [metadata] = await table.getMetadata();
      return metadata.schema.fields;
    } catch (error) {
      logger.error(`Error getting schema for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Check load job status
   */
  async checkJobStatus(jobId: string): Promise<any> {
    try {
      const job = this.bigquery.job(jobId);
      const [jobMetadata] = await job.getMetadata();
      
      return {
        jobId: jobId,
        state: jobMetadata.status?.state,
        errorResult: jobMetadata.status?.errorResult,
        errors: jobMetadata.status?.errors || [],
        statistics: jobMetadata.statistics
      };
    } catch (error) {
      logger.error(`Error checking job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get loading statistics for monitoring
   */
  async getLoadingStats(): Promise<any> {
    try {
      // Get recent load jobs
      const jobQuery = `
        SELECT 
          job_id,
          creation_time,
          end_time,
          state,
          total_slot_ms,
          total_bytes_processed
        FROM \`${this.projectId}\`.\`region-us\`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
        WHERE job_type = 'LOAD'
          AND creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        ORDER BY creation_time DESC
        LIMIT 100
      `;

      const [job] = await this.bigquery.createQueryJob({
        query: jobQuery,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      
      return {
        recent_jobs: rows,
        total_jobs_24h: rows.length,
        successful_jobs: rows.filter(row => row.state === 'DONE').length,
        failed_jobs: rows.filter(row => row.state === 'DONE' && row.error_result).length
      };

    } catch (error) {
      logger.error('Error getting loading stats:', error);
      throw error;
    }
  }
}

export default BigQueryLoader;