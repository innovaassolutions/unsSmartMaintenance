/**
 * BigQuery Dataset and Table Setup for UNS Smart Maintenance ML Pipeline
 * 
 * This module creates and manages BigQuery datasets and tables optimized for
 * machine learning workloads on manufacturing sensor data.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { logger } from '../utils/logger';

export class BigQuerySetup {
  private bigquery: BigQuery;
  private projectId: string;
  private datasetId: string;

  constructor(projectId: string = 'uns-smart-maintenance-ml', datasetId: string = 'manufacturing_data') {
    this.bigquery = new BigQuery({ projectId });
    this.projectId = projectId;
    this.datasetId = datasetId;
  }

  /**
   * Create the main manufacturing dataset with proper configurations
   */
  async createDataset(): Promise<void> {
    try {
      const [dataset] = await this.bigquery.dataset(this.datasetId).get({ autoCreate: true });
      
      // Update dataset metadata for ML optimization
      await dataset.setMetadata({
        description: 'UNS Smart Maintenance sensor data optimized for ML workloads',
        location: 'US', // For Vertex AI compatibility
        labels: {
          environment: 'production',
          purpose: 'ml_training',
          data_source: 'timescaledb',
          project: 'uns_smart_maintenance'
        }
      });

      logger.info(`Dataset ${this.datasetId} created/updated successfully`);
    } catch (error) {
      logger.error('Error creating dataset:', error);
      throw error;
    }
  }

  /**
   * Create sensor_data table optimized for time-series ML analysis
   */
  async createSensorDataTable(): Promise<void> {
    const tableId = 'sensor_data';
    const schema = [
      // Primary identifiers
      { name: 'id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'machine_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'location_path', type: 'STRING', mode: 'REQUIRED' },
      { name: 'sensor_type', type: 'STRING', mode: 'REQUIRED' },
      
      // Time-series data
      { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'value', type: 'FLOAT64', mode: 'REQUIRED' },
      
      // Derived fields for ML
      { name: 'machine_name', type: 'STRING', mode: 'NULLABLE' },
      { name: 'assembly_line', type: 'STRING', mode: 'NULLABLE' },
      { name: 'equipment_type', type: 'STRING', mode: 'NULLABLE' },
      
      // Data quality indicators
      { name: 'data_quality_score', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'is_outlier', type: 'BOOLEAN', mode: 'NULLABLE' },
      { name: 'interpolated', type: 'BOOLEAN', mode: 'NULLABLE' },
      
      // Processing metadata
      { name: 'ingestion_time', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'source_system', type: 'STRING', mode: 'NULLABLE' },
    ];

    const options = {
      schema: schema,
      location: 'US',
      timePartitioning: {
        type: 'DAY',
        field: 'timestamp',
        requirePartitionFilter: false
      },
      clustering: {
        fields: ['machine_id', 'sensor_type', 'location_path']
      },
      description: 'Time-series sensor data from manufacturing equipment optimized for ML training',
      labels: {
        table_type: 'sensor_data',
        optimization: 'ml_training',
        partition_type: 'daily'
      }
    };

    try {
      const [table] = await this.bigquery.dataset(this.datasetId).table(tableId).get({ autoCreate: true });
      await table.setMetadata(options);
      logger.info(`Table ${tableId} created/updated with ML optimizations`);
    } catch (error) {
      logger.error(`Error creating sensor_data table:`, error);
      throw error;
    }
  }

  /**
   * Create machine_status table for equipment metadata
   */
  async createMachineStatusTable(): Promise<void> {
    const tableId = 'machine_status';
    const schema = [
      // Machine identification
      { name: 'machine_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'location_path', type: 'STRING', mode: 'REQUIRED' },
      { name: 'machine_name', type: 'STRING', mode: 'REQUIRED' },
      { name: 'equipment_type', type: 'STRING', mode: 'REQUIRED' },
      
      // Status and configuration
      { name: 'status', type: 'STRING', mode: 'REQUIRED' },
      { name: 'last_maintenance', type: 'TIMESTAMP', mode: 'NULLABLE' },
      { name: 'next_maintenance_due', type: 'TIMESTAMP', mode: 'NULLABLE' },
      { name: 'operational_hours', type: 'FLOAT64', mode: 'NULLABLE' },
      
      // Manufacturing context
      { name: 'assembly_line', type: 'STRING', mode: 'NULLABLE' },
      { name: 'production_shift', type: 'STRING', mode: 'NULLABLE' },
      { name: 'operator_id', type: 'STRING', mode: 'NULLABLE' },
      
      // ML features
      { name: 'failure_risk_score', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'performance_index', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_baseline', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'temperature_baseline', type: 'FLOAT64', mode: 'NULLABLE' },
      
      // Timestamps
      { name: 'last_updated', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'ingestion_time', type: 'TIMESTAMP', mode: 'REQUIRED' }
    ];

    const options = {
      schema: schema,
      location: 'US',
      clustering: {
        fields: ['equipment_type', 'assembly_line', 'status']
      },
      description: 'Machine status and metadata for ML feature engineering',
      labels: {
        table_type: 'machine_metadata',
        optimization: 'ml_features'
      }
    };

    try {
      const [table] = await this.bigquery.dataset(this.datasetId).table(tableId).get({ autoCreate: true });
      await table.setMetadata(options);
      logger.info(`Table ${tableId} created/updated successfully`);
    } catch (error) {
      logger.error(`Error creating machine_status table:`, error);
      throw error;
    }
  }

  /**
   * Create feature_store table for engineered ML features
   */
  async createFeatureStoreTable(): Promise<void> {
    const tableId = 'feature_store';
    const schema = [
      // Identifiers
      { name: 'feature_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'machine_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      
      // Rolling window features (15min, 1hr, 4hr, 24hr)
      { name: 'vibration_x_15min_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_x_15min_std', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_x_1hr_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_x_1hr_std', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_x_4hr_trend', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_x_24hr_trend', type: 'FLOAT64', mode: 'NULLABLE' },
      
      { name: 'vibration_y_15min_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_y_15min_std', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_y_1hr_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_y_1hr_std', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_y_4hr_trend', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_y_24hr_trend', type: 'FLOAT64', mode: 'NULLABLE' },
      
      { name: 'vibration_z_15min_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_z_15min_std', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_z_1hr_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_z_1hr_std', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_z_4hr_trend', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_z_24hr_trend', type: 'FLOAT64', mode: 'NULLABLE' },
      
      // Temperature features
      { name: 'bearing_temp_15min_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'bearing_temp_15min_std', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'bearing_temp_1hr_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'bearing_temp_4hr_trend', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'bearing_temp_24hr_trend', type: 'FLOAT64', mode: 'NULLABLE' },
      
      // Pressure and current features
      { name: 'hydraulic_pressure_15min_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'hydraulic_pressure_1hr_std', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'weld_current_15min_avg', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'weld_current_1hr_std', type: 'FLOAT64', mode: 'NULLABLE' },
      
      // Cross-correlation features
      { name: 'vibration_temp_correlation', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_pressure_correlation', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'vibration_magnitude', type: 'FLOAT64', mode: 'NULLABLE' },
      
      // Anomaly detection features
      { name: 'isolation_forest_score', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'one_class_svm_score', type: 'FLOAT64', mode: 'NULLABLE' },
      { name: 'local_outlier_factor', type: 'FLOAT64', mode: 'NULLABLE' },
      
      // Target variables for supervised learning
      { name: 'failure_within_24h', type: 'BOOLEAN', mode: 'NULLABLE' },
      { name: 'failure_within_1week', type: 'BOOLEAN', mode: 'NULLABLE' },
      { name: 'failure_within_2weeks', type: 'BOOLEAN', mode: 'NULLABLE' },
      { name: 'maintenance_needed', type: 'BOOLEAN', mode: 'NULLABLE' },
      
      // Processing metadata
      { name: 'feature_version', type: 'STRING', mode: 'NULLABLE' },
      { name: 'processing_time', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'data_quality_flag', type: 'STRING', mode: 'NULLABLE' }
    ];

    const options = {
      schema: schema,
      location: 'US',
      timePartitioning: {
        type: 'DAY',
        field: 'timestamp',
        requirePartitionFilter: false
      },
      clustering: {
        fields: ['machine_id', 'feature_version']
      },
      description: 'Engineered features for ML model training and inference',
      labels: {
        table_type: 'feature_store',
        optimization: 'ml_features',
        partition_type: 'daily'
      }
    };

    try {
      const [table] = await this.bigquery.dataset(this.datasetId).table(tableId).get({ autoCreate: true });
      await table.setMetadata(options);
      logger.info(`Table ${tableId} created/updated successfully`);
    } catch (error) {
      logger.error(`Error creating feature_store table:`, error);
      throw error;
    }
  }

  /**
   * Create training_data table for ML model training datasets
   */
  async createTrainingDataTable(): Promise<void> {
    const tableId = 'training_data';
    const schema = [
      { name: 'training_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'machine_id', type: 'STRING', mode: 'REQUIRED' },
      { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
      { name: 'dataset_split', type: 'STRING', mode: 'REQUIRED' }, // train/validation/test
      { name: 'model_version', type: 'STRING', mode: 'REQUIRED' },
      
      // All features from feature_store
      { name: 'features', type: 'JSON', mode: 'REQUIRED' },
      
      // Labels
      { name: 'label_failure_24h', type: 'BOOLEAN', mode: 'NULLABLE' },
      { name: 'label_failure_1week', type: 'BOOLEAN', mode: 'NULLABLE' },
      { name: 'label_failure_2weeks', type: 'BOOLEAN', mode: 'NULLABLE' },
      { name: 'label_maintenance_needed', type: 'BOOLEAN', mode: 'NULLABLE' },
      
      // Sample weights for imbalanced learning
      { name: 'sample_weight', type: 'FLOAT64', mode: 'NULLABLE' },
      
      // Metadata
      { name: 'created_time', type: 'TIMESTAMP', mode: 'REQUIRED' }
    ];

    const options = {
      schema: schema,
      location: 'US',
      timePartitioning: {
        type: 'DAY',
        field: 'timestamp',
        requirePartitionFilter: false
      },
      clustering: {
        fields: ['model_version', 'dataset_split', 'machine_id']
      },
      description: 'Training datasets for ML models with labels and sample weights',
      labels: {
        table_type: 'training_data',
        optimization: 'ml_training'
      }
    };

    try {
      const [table] = await this.bigquery.dataset(this.datasetId).table(tableId).get({ autoCreate: true });
      await table.setMetadata(options);
      logger.info(`Table ${tableId} created/updated successfully`);
    } catch (error) {
      logger.error(`Error creating training_data table:`, error);
      throw error;
    }
  }

  /**
   * Initialize all BigQuery tables for the ML pipeline
   */
  async initializeAllTables(): Promise<void> {
    logger.info('Starting BigQuery ML pipeline initialization...');
    
    try {
      await this.createDataset();
      await this.createSensorDataTable();
      await this.createMachineStatusTable();
      await this.createFeatureStoreTable();
      await this.createTrainingDataTable();
      
      logger.info('BigQuery ML pipeline initialization completed successfully');
    } catch (error) {
      logger.error('Error initializing BigQuery tables:', error);
      throw error;
    }
  }

  /**
   * Check if all required tables exist
   */
  async validateSetup(): Promise<boolean> {
    const requiredTables = ['sensor_data', 'machine_status', 'feature_store', 'training_data'];
    
    try {
      for (const tableName of requiredTables) {
        const [exists] = await this.bigquery.dataset(this.datasetId).table(tableName).exists();
        if (!exists) {
          logger.error(`Required table ${tableName} does not exist`);
          return false;
        }
      }
      
      logger.info('All required BigQuery tables exist');
      return true;
    } catch (error) {
      logger.error('Error validating BigQuery setup:', error);
      return false;
    }
  }

  /**
   * Get dataset and table information
   */
  async getSetupInfo(): Promise<any> {
    try {
      const [tables] = await this.bigquery.dataset(this.datasetId).getTables();
      const tableInfo = await Promise.all(
        tables.map(async (table) => {
          const [metadata] = await table.getMetadata();
          return {
            name: table.id,
            numRows: metadata.numRows,
            numBytes: metadata.numBytes,
            lastModified: metadata.lastModifiedTime,
            location: metadata.location,
            clustering: metadata.clustering?.fields || [],
            partitioning: metadata.timePartitioning?.field || 'none'
          };
        })
      );

      return {
        projectId: this.projectId,
        datasetId: this.datasetId,
        tables: tableInfo
      };
    } catch (error) {
      logger.error('Error getting setup info:', error);
      throw error;
    }
  }
}

export default BigQuerySetup;