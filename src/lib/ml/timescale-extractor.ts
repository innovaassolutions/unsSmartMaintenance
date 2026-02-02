/**
 * TimescaleDB Data Extractor for BigQuery ETL Pipeline
 * 
 * Extracts sensor data from TimescaleDB with optimized batch processing,
 * data validation, and error handling for the 24.6M record dataset.
 */

import { Pool, PoolClient } from 'pg';
import { timescaleLogger as logger } from '../utils/logger';

interface SensorRecord {
  id: string;
  machine_id: string;
  location_path: string;
  value: number;
  time: Date;
  ingestion_time?: Date;
}

interface MachineStatusRecord {
  machine_id: string;
  location_path: string;
  machine_name: string;
  equipment_type: string;
  status: string;
  last_maintenance?: Date;
  next_maintenance_due?: Date;
  operational_hours?: number;
  assembly_line?: string;
  production_shift?: string;
  operator_id?: string;
  last_updated: Date;
}

interface ExtractionOptions {
  batchSize: number;
  startDate?: Date;
  endDate?: Date;
  machineIds?: string[];
  sensorTypes?: string[];
  includeMetadata: boolean;
  validateData: boolean;
}

export class TimescaleExtractor {
  private pool: Pool;
  private connectionString: string;

  constructor() {
    this.connectionString = `postgres://postgres:password@159.223.67.162:5433/uns_timeseries`;
    
    this.pool = new Pool({
      connectionString: this.connectionString,
      max: 10, // Maximum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 300000, // 5 minutes for large queries
      query_timeout: 300000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('TimescaleDB pool error:', err);
    });
  }

  /**
   * Test database connection and get basic statistics
   */
  async testConnection(): Promise<any> {
    const client = await this.pool.connect();
    try {
      logger.info('Testing TimescaleDB connection...');
      
      // Test connection
      const connResult = await client.query('SELECT NOW() as current_time, version()');
      
      // Get sensor_data table statistics
      const sensorStats = await client.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT machine_id) as unique_machines,
          MIN(time) as earliest_record,
          MAX(time) as latest_record,
          pg_size_pretty(pg_total_relation_size('sensor_data')) as table_size
        FROM sensor_data
      `);

      // Get machine_status table statistics  
      const machineStats = await client.query(`
        SELECT 
          COUNT(*) as total_machines,
          COUNT(DISTINCT equipment_type) as equipment_types,
          array_agg(DISTINCT equipment_type) as equipment_list
        FROM machine_status
      `);

      // Get sensor types distribution
      const sensorTypes = await client.query(`
        SELECT 
          machine_id,
          COUNT(*) as sensor_count
        FROM sensor_data 
        GROUP BY machine_id 
        ORDER BY sensor_count DESC
      `);

      const stats = {
        connection: {
          timestamp: connResult.rows[0].current_time,
          version: connResult.rows[0].version
        },
        sensor_data: sensorStats.rows[0],
        machine_status: machineStats.rows[0],
        sensor_distribution: sensorTypes.rows
      };

      logger.info('TimescaleDB connection successful:', stats);
      return stats;

    } catch (error) {
      logger.error('TimescaleDB connection failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Extract sensor data in batches with offset-based pagination
   */
  async* extractSensorData(options: ExtractionOptions): AsyncGenerator<SensorRecord[], void, unknown> {
    const {
      batchSize = 10000,
      startDate,
      endDate,
      machineIds,
      sensorTypes,
      validateData = true
    } = options;

    let offset = 0;
    let totalProcessed = 0;
    const client = await this.pool.connect();

    try {
      // Build dynamic WHERE clause
      const whereConditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (startDate) {
        whereConditions.push(`time >= $${paramIndex++}`);
        queryParams.push(startDate);
      }

      if (endDate) {
        whereConditions.push(`time <= $${paramIndex++}`);
        queryParams.push(endDate);
      }

      if (machineIds && machineIds.length > 0) {
        whereConditions.push(`machine_id = ANY($${paramIndex++})`);
        queryParams.push(machineIds);
      }

      if (sensorTypes && sensorTypes.length > 0) {
        // Extract sensor type from machine_id (after last dot)
        whereConditions.push(`split_part(machine_id, '.', -1) = ANY($${paramIndex++})`);
        queryParams.push(sensorTypes);
      }

      const whereClause = whereConditions.length > 0 
        ? 'WHERE ' + whereConditions.join(' AND ')
        : '';

      // Get total count for progress tracking
      const countQuery = `SELECT COUNT(*) as total FROM sensor_data ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const totalRecords = parseInt(countResult.rows[0].total);
      
      logger.info(`Starting extraction of ${totalRecords.toLocaleString()} records in batches of ${batchSize.toLocaleString()}`);

      while (true) {
        // Extract batch with optimized query
        const extractQuery = `
          SELECT 
            id,
            machine_id,
            location_path,
            value,
            time,
            CURRENT_TIMESTAMP as ingestion_time
          FROM sensor_data 
          ${whereClause}
          ORDER BY time, id
          LIMIT $${paramIndex} 
          OFFSET $${paramIndex + 1}
        `;

        const batchParams = [...queryParams, batchSize, offset];
        const startTime = Date.now();
        
        const result = await client.query(extractQuery, batchParams);
        const queryTime = Date.now() - startTime;

        if (result.rows.length === 0) {
          logger.info(`Extraction completed. Total processed: ${totalProcessed.toLocaleString()} records`);
          break;
        }

        // Validate data if requested
        let validRecords = result.rows;
        if (validateData) {
          validRecords = this.validateSensorBatch(result.rows);
        }

        totalProcessed += validRecords.length;
        const progress = ((totalProcessed / totalRecords) * 100).toFixed(2);

        logger.info(`Extracted batch: ${validRecords.length.toLocaleString()} records (${progress}% complete, ${queryTime}ms query time)`);

        yield validRecords.map(row => ({
          id: row.id,
          machine_id: row.machine_id,
          location_path: row.location_path,
          value: parseFloat(row.value),
          time: new Date(row.time),
          ingestion_time: new Date(row.ingestion_time)
        }));

        offset += batchSize;

        // Progress checkpoint every 100 batches
        if (Math.floor(offset / batchSize) % 100 === 0) {
          logger.info(`Progress checkpoint: ${totalProcessed.toLocaleString()}/${totalRecords.toLocaleString()} records processed`);
        }
      }

    } catch (error) {
      logger.error(`Error extracting sensor data at offset ${offset}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Extract machine status data
   */
  async extractMachineStatus(): Promise<MachineStatusRecord[]> {
    const client = await this.pool.connect();
    
    try {
      logger.info('Extracting machine status data...');
      
      const query = `
        SELECT 
          machine_id,
          location_path,
          machine_name,
          equipment_type,
          status,
          last_maintenance,
          next_maintenance_due,
          operational_hours,
          assembly_line,
          production_shift,
          operator_id,
          last_updated
        FROM machine_status
        ORDER BY machine_id
      `;

      const result = await client.query(query);
      
      logger.info(`Extracted ${result.rows.length} machine status records`);
      
      return result.rows.map(row => ({
        machine_id: row.machine_id,
        location_path: row.location_path,
        machine_name: row.machine_name,
        equipment_type: row.equipment_type,
        status: row.status,
        last_maintenance: row.last_maintenance ? new Date(row.last_maintenance) : undefined,
        next_maintenance_due: row.next_maintenance_due ? new Date(row.next_maintenance_due) : undefined,
        operational_hours: row.operational_hours ? parseFloat(row.operational_hours) : undefined,
        assembly_line: row.assembly_line,
        production_shift: row.production_shift,
        operator_id: row.operator_id,
        last_updated: new Date(row.last_updated)
      }));

    } catch (error) {
      logger.error('Error extracting machine status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get data distribution and quality metrics
   */
  async getDataProfileInfo(): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      logger.info('Profiling TimescaleDB data...');

      // Sensor type distribution
      const sensorTypeQuery = `
        SELECT 
          split_part(machine_id, '.', -1) as sensor_type,
          COUNT(*) as record_count,
          COUNT(DISTINCT location_path) as machine_count,
          MIN(value) as min_value,
          MAX(value) as max_value,
          AVG(value) as avg_value,
          STDDEV(value) as std_value
        FROM sensor_data
        GROUP BY split_part(machine_id, '.', -1)
        ORDER BY record_count DESC
      `;

      // Machine distribution
      const machineQuery = `
        SELECT 
          location_path,
          COUNT(*) as sensor_readings,
          COUNT(DISTINCT split_part(machine_id, '.', -1)) as sensor_types,
          MIN(time) as first_reading,
          MAX(time) as last_reading
        FROM sensor_data
        GROUP BY location_path
        ORDER BY sensor_readings DESC
      `;

      // Data quality metrics
      const qualityQuery = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(*) - COUNT(value) as null_values,
          COUNT(CASE WHEN value < 0 THEN 1 END) as negative_values,
          COUNT(CASE WHEN ABS(value) > 10000 THEN 1 END) as extreme_values
        FROM sensor_data
      `;

      // Time distribution
      const timeQuery = `
        SELECT 
          DATE_TRUNC('day', time) as day,
          COUNT(*) as daily_records
        FROM sensor_data
        GROUP BY DATE_TRUNC('day', time)
        ORDER BY day
      `;

      const [sensorTypes, machines, quality, timeDistribution] = await Promise.all([
        client.query(sensorTypeQuery),
        client.query(machineQuery), 
        client.query(qualityQuery),
        client.query(timeQuery)
      ]);

      const profile = {
        sensor_types: sensorTypes.rows,
        machines: machines.rows,
        data_quality: quality.rows[0],
        time_distribution: timeDistribution.rows
      };

      logger.info('Data profiling completed');
      return profile;

    } catch (error) {
      logger.error('Error profiling data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate sensor data batch for quality issues
   */
  private validateSensorBatch(records: any[]): any[] {
    const validRecords = [];
    let nullCount = 0;
    let negativeCount = 0;
    let extremeCount = 0;

    for (const record of records) {
      let isValid = true;
      
      // Check for null values
      if (record.value === null || record.value === undefined) {
        nullCount++;
        isValid = false;
      }
      
      // Check for negative values (may be valid for some sensors)
      if (record.value < 0) {
        negativeCount++;
        // Don't mark as invalid - some sensors can have negative readings
      }
      
      // Check for extreme outliers
      if (Math.abs(record.value) > 100000) {
        extremeCount++;
        isValid = false;
      }
      
      if (isValid) {
        validRecords.push(record);
      }
    }

    if (nullCount > 0 || extremeCount > 0) {
      logger.warn(`Batch validation: ${nullCount} null values, ${negativeCount} negative values, ${extremeCount} extreme values filtered`);
    }

    return validRecords;
  }

  /**
   * Get schema information for BigQuery mapping
   */
  async getSchemaInfo(): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      const schemaQuery = `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name IN ('sensor_data', 'machine_status')
        ORDER BY table_name, ordinal_position
      `;

      const result = await client.query(schemaQuery);
      
      const schema = result.rows.reduce((acc, row) => {
        if (!acc[row.table_name]) {
          acc[row.table_name] = [];
        }
        acc[row.table_name].push({
          column: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default
        });
        return acc;
      }, {});

      logger.info('Schema information retrieved');
      return schema;

    } catch (error) {
      logger.error('Error getting schema info:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('TimescaleDB connections closed');
    } catch (error) {
      logger.error('Error closing TimescaleDB connections:', error);
      throw error;
    }
  }
}

export default TimescaleExtractor;