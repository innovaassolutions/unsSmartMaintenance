/**
 * BigQuery ML Optimization Utilities
 * 
 * Optimizes BigQuery tables and queries for machine learning workloads
 * including partitioning, clustering, and query performance tuning.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { logger } from '../utils/logger';

interface OptimizationConfig {
  enablePartitioning: boolean;
  enableClustering: boolean;
  optimizeForML: boolean;
  createMaterializedViews: boolean;
  enableQueryOptimization: boolean;
}

interface OptimizationResult {
  tablesOptimized: string[];
  viewsCreated: string[];
  indexesCreated: string[];
  estimatedCostReduction: number;
  estimatedPerformanceGain: number;
  optimizationTime: number;
  recommendations: string[];
}

export class BigQueryOptimizer {
  private bigquery: BigQuery;
  private projectId: string;
  private datasetId: string;

  constructor(projectId: string = 'uns-smart-maintenance-ml', datasetId: string = 'manufacturing_data') {
    this.bigquery = new BigQuery({ projectId });
    this.projectId = projectId;
    this.datasetId = datasetId;
  }

  /**
   * Run complete BigQuery optimization for ML workloads
   */
  async optimizeForML(config: Partial<OptimizationConfig> = {}): Promise<OptimizationResult> {
    const defaultConfig: OptimizationConfig = {
      enablePartitioning: true,
      enableClustering: true,
      optimizeForML: true,
      createMaterializedViews: true,
      enableQueryOptimization: true,
      ...config
    };

    logger.info('Starting BigQuery ML optimization...', defaultConfig);
    const startTime = Date.now();

    const result: OptimizationResult = {
      tablesOptimized: [],
      viewsCreated: [],
      indexesCreated: [],
      estimatedCostReduction: 0,
      estimatedPerformanceGain: 0,
      optimizationTime: 0,
      recommendations: []
    };

    try {
      // Step 1: Optimize table structure
      if (defaultConfig.enablePartitioning || defaultConfig.enableClustering) {
        await this.optimizeTableStructure(defaultConfig, result);
      }

      // Step 2: Create ML-optimized materialized views
      if (defaultConfig.createMaterializedViews) {
        await this.createMLOptimizedViews(result);
      }

      // Step 3: Create training data views
      if (defaultConfig.optimizeForML) {
        await this.createTrainingDataViews(result);
      }

      // Step 4: Generate optimization recommendations
      if (defaultConfig.enableQueryOptimization) {
        await this.generateOptimizationRecommendations(result);
      }

      result.optimizationTime = Date.now() - startTime;
      logger.info('BigQuery ML optimization completed', result);

      return result;

    } catch (error) {
      logger.error('BigQuery ML optimization failed:', error);
      throw error;
    }
  }

  /**
   * Optimize table structure for ML workloads
   */
  private async optimizeTableStructure(config: OptimizationConfig, result: OptimizationResult): Promise<void> {
    logger.info('Optimizing table structure...');

    // Optimization is already done during table creation, but we can check and update
    const tables = ['sensor_data', 'machine_status', 'feature_store'];
    
    for (const tableName of tables) {
      try {
        const table = this.bigquery.dataset(this.datasetId).table(tableName);
        const [metadata] = await table.getMetadata();
        
        // Check if optimizations are already in place
        const hasPartitioning = metadata.timePartitioning !== undefined;
        const hasClustering = metadata.clustering !== undefined;
        
        if (hasPartitioning && hasClustering) {
          logger.info(`Table ${tableName} already optimized`);
          result.tablesOptimized.push(tableName);
        } else {
          logger.warn(`Table ${tableName} could benefit from optimization`);
          result.recommendations.push(`Consider recreating ${tableName} with partitioning and clustering`);
        }

      } catch (error) {
        logger.error(`Error checking table ${tableName}:`, error);
        result.recommendations.push(`Unable to analyze ${tableName} - check table exists and permissions`);
      }
    }
  }

  /**
   * Create materialized views optimized for ML queries
   */
  private async createMLOptimizedViews(result: OptimizationResult): Promise<void> {
    logger.info('Creating ML-optimized materialized views...');

    // Materialized view for real-time ML inference
    const realtimeMLView = `
      CREATE MATERIALIZED VIEW IF NOT EXISTS \`${this.projectId}.${this.datasetId}.realtime_ml_features\`
      PARTITION BY DATE(timestamp)
      CLUSTER BY machine_id
      OPTIONS (
        enable_refresh = true,
        refresh_interval_minutes = 15,
        description = "Real-time ML features for inference"
      )
      AS
      SELECT 
        machine_id,
        timestamp,
        vibration_x_15min_avg,
        vibration_x_15min_std,
        vibration_y_15min_avg,
        vibration_y_15min_std,
        vibration_z_15min_avg,
        vibration_z_15min_std,
        bearing_temp_15min_avg,
        bearing_temp_15min_std,
        vibration_magnitude,
        vibration_temp_correlation,
        isolation_forest_score,
        one_class_svm_score,
        local_outlier_factor,
        failure_within_24h,
        failure_within_1week,
        maintenance_needed
      FROM \`${this.projectId}.${this.datasetId}.feature_store\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        AND vibration_x_15min_avg IS NOT NULL
    `;

    // Materialized view for training data
    const trainingDataView = `
      CREATE MATERIALIZED VIEW IF NOT EXISTS \`${this.projectId}.${this.datasetId}.training_ml_features\`
      PARTITION BY DATE(timestamp)
      CLUSTER BY machine_id, feature_version
      OPTIONS (
        enable_refresh = true,
        refresh_interval_minutes = 60,
        description = "Training dataset for ML models"
      )
      AS
      SELECT 
        machine_id,
        timestamp,
        
        -- Core vibration features
        vibration_x_15min_avg,
        vibration_x_15min_std,
        vibration_x_1hr_avg,
        vibration_x_1hr_std,
        vibration_x_4hr_trend,
        vibration_x_24hr_trend,
        
        vibration_y_15min_avg,
        vibration_y_15min_std,
        vibration_y_1hr_avg,
        vibration_y_1hr_std,
        vibration_y_4hr_trend,
        vibration_y_24hr_trend,
        
        vibration_z_15min_avg,
        vibration_z_15min_std,
        vibration_z_1hr_avg,
        vibration_z_1hr_std,
        vibration_z_4hr_trend,
        vibration_z_24hr_trend,
        
        -- Temperature features
        bearing_temp_15min_avg,
        bearing_temp_15min_std,
        bearing_temp_1hr_avg,
        bearing_temp_4hr_trend,
        bearing_temp_24hr_trend,
        
        -- Cross-correlation features
        vibration_temp_correlation,
        vibration_pressure_correlation,
        vibration_magnitude,
        
        -- Anomaly scores
        isolation_forest_score,
        one_class_svm_score,
        local_outlier_factor,
        
        -- Target variables
        failure_within_24h,
        failure_within_1week,
        failure_within_2weeks,
        maintenance_needed,
        
        feature_version,
        processing_time
        
      FROM \`${this.projectId}.${this.datasetId}.feature_store\`
      WHERE vibration_x_15min_avg IS NOT NULL
        AND bearing_temp_15min_avg IS NOT NULL
        AND feature_version IS NOT NULL
    `;

    // Machine health summary view
    const machineHealthView = `
      CREATE MATERIALIZED VIEW IF NOT EXISTS \`${this.projectId}.${this.datasetId}.machine_health_summary\`
      PARTITION BY DATE(timestamp)
      CLUSTER BY machine_id
      OPTIONS (
        enable_refresh = true,
        refresh_interval_minutes = 5,
        description = "Real-time machine health summary"
      )
      AS
      SELECT 
        machine_id,
        TIMESTAMP_TRUNC(timestamp, HOUR) as timestamp,
        
        -- Health indicators
        AVG(vibration_magnitude) as avg_vibration_magnitude,
        MAX(vibration_magnitude) as max_vibration_magnitude,
        AVG(bearing_temp_15min_avg) as avg_temperature,
        MAX(bearing_temp_15min_avg) as max_temperature,
        
        -- Risk scores
        AVG(isolation_forest_score) as avg_anomaly_score,
        MAX(isolation_forest_score) as max_anomaly_score,
        
        -- Failure predictions
        MAX(CASE WHEN failure_within_24h THEN 1 ELSE 0 END) as failure_risk_24h,
        MAX(CASE WHEN failure_within_1week THEN 1 ELSE 0 END) as failure_risk_1week,
        MAX(CASE WHEN maintenance_needed THEN 1 ELSE 0 END) as maintenance_needed,
        
        -- Data quality
        COUNT(*) as data_points,
        COUNTIF(vibration_x_15min_avg IS NOT NULL) / COUNT(*) as data_completeness,
        
        CURRENT_TIMESTAMP() as last_updated
        
      FROM \`${this.projectId}.${this.datasetId}.feature_store\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
      GROUP BY 
        machine_id,
        TIMESTAMP_TRUNC(timestamp, HOUR)
    `;

    const views = [
      { name: 'realtime_ml_features', query: realtimeMLView },
      { name: 'training_ml_features', query: trainingDataView },
      { name: 'machine_health_summary', query: machineHealthView }
    ];

    for (const view of views) {
      try {
        const [job] = await this.bigquery.createQueryJob({
          query: view.query,
          location: 'US',
        });

        await job.promise();
        result.viewsCreated.push(view.name);
        result.estimatedCostReduction += 25; // Materialized views can reduce costs by 25-50%
        result.estimatedPerformanceGain += 40; // Significant performance improvement
        
        logger.info(`Created materialized view: ${view.name}`);

      } catch (error) {
        logger.error(`Failed to create view ${view.name}:`, error);
        result.recommendations.push(`Manually create materialized view ${view.name} for better performance`);
      }
    }
  }

  /**
   * Create training data views for different ML scenarios
   */
  private async createTrainingDataViews(result: OptimizationResult): Promise<void> {
    logger.info('Creating training data views...');

    // Failure prediction training view
    const failurePredictionView = `
      CREATE OR REPLACE VIEW \`${this.projectId}.${this.datasetId}.failure_prediction_training\` AS
      SELECT 
        machine_id,
        timestamp,
        
        -- Features (normalized)
        CASE WHEN vibration_x_15min_std > 0 
             THEN (vibration_x_15min_avg - AVG(vibration_x_15min_avg) OVER (PARTITION BY machine_id)) / vibration_x_15min_std 
             ELSE 0 END as vibration_x_normalized,
             
        CASE WHEN vibration_y_15min_std > 0 
             THEN (vibration_y_15min_avg - AVG(vibration_y_15min_avg) OVER (PARTITION BY machine_id)) / vibration_y_15min_std 
             ELSE 0 END as vibration_y_normalized,
             
        CASE WHEN vibration_z_15min_std > 0 
             THEN (vibration_z_15min_avg - AVG(vibration_z_15min_avg) OVER (PARTITION BY machine_id)) / vibration_z_15min_std 
             ELSE 0 END as vibration_z_normalized,
             
        CASE WHEN bearing_temp_15min_std > 0 
             THEN (bearing_temp_15min_avg - AVG(bearing_temp_15min_avg) OVER (PARTITION BY machine_id)) / bearing_temp_15min_std 
             ELSE 0 END as temperature_normalized,
        
        vibration_magnitude / NULLIF(AVG(vibration_magnitude) OVER (PARTITION BY machine_id), 0) as vibration_magnitude_ratio,
        
        vibration_temp_correlation,
        vibration_pressure_correlation,
        
        isolation_forest_score,
        one_class_svm_score,
        
        -- Trend features
        vibration_x_4hr_trend,
        vibration_y_4hr_trend,
        bearing_temp_4hr_trend,
        
        -- Labels
        failure_within_24h as label_24h,
        failure_within_1week as label_1week,
        failure_within_2weeks as label_2weeks,
        
        -- Sample weight (higher weight for rare failure cases)
        CASE 
          WHEN failure_within_24h THEN 10.0
          WHEN failure_within_1week THEN 5.0
          WHEN failure_within_2weeks THEN 3.0
          ELSE 1.0
        END as sample_weight,
        
        -- Data split (70% train, 15% validation, 15% test)
        CASE 
          WHEN MOD(ABS(FARM_FINGERPRINT(CONCAT(machine_id, CAST(timestamp AS STRING)))), 100) < 70 THEN 'TRAIN'
          WHEN MOD(ABS(FARM_FINGERPRINT(CONCAT(machine_id, CAST(timestamp AS STRING)))), 100) < 85 THEN 'VALIDATE'
          ELSE 'TEST'
        END as data_split
        
      FROM \`${this.projectId}.${this.datasetId}.feature_store\`
      WHERE vibration_x_15min_avg IS NOT NULL
        AND vibration_y_15min_avg IS NOT NULL  
        AND bearing_temp_15min_avg IS NOT NULL
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 60 DAY)
    `;

    // Anomaly detection training view
    const anomalyDetectionView = `
      CREATE OR REPLACE VIEW \`${this.projectId}.${this.datasetId}.anomaly_detection_training\` AS
      SELECT 
        machine_id,
        timestamp,
        
        -- Features for unsupervised anomaly detection
        ARRAY[
          vibration_x_15min_avg,
          vibration_y_15min_avg,
          vibration_z_15min_avg,
          bearing_temp_15min_avg,
          vibration_magnitude,
          vibration_temp_correlation,
          vibration_x_4hr_trend,
          vibration_y_4hr_trend,
          bearing_temp_4hr_trend
        ] as feature_vector,
        
        -- Ground truth anomalies (for validation)
        CASE 
          WHEN isolation_forest_score > 3 OR one_class_svm_score > 3 THEN 1 
          ELSE 0 
        END as is_anomaly,
        
        -- Severity score
        GREATEST(isolation_forest_score, one_class_svm_score, local_outlier_factor) as anomaly_severity,
        
        data_quality_flag
        
      FROM \`${this.projectId}.${this.datasetId}.feature_store\`
      WHERE vibration_x_15min_avg IS NOT NULL
        AND data_quality_flag = 'generated'
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    `;

    const views = [
      { name: 'failure_prediction_training', query: failurePredictionView },
      { name: 'anomaly_detection_training', query: anomalyDetectionView }
    ];

    for (const view of views) {
      try {
        const [job] = await this.bigquery.createQueryJob({
          query: view.query,
          location: 'US',
        });

        await job.promise();
        result.viewsCreated.push(view.name);
        logger.info(`Created training view: ${view.name}`);

      } catch (error) {
        logger.error(`Failed to create training view ${view.name}:`, error);
        result.recommendations.push(`Manually create training view ${view.name}`);
      }
    }
  }

  /**
   * Generate optimization recommendations
   */
  private async generateOptimizationRecommendations(result: OptimizationResult): Promise<void> {
    logger.info('Generating optimization recommendations...');

    try {
      // Analyze query patterns
      const queryAnalysis = await this.analyzeQueryPatterns();
      
      // Check table sizes and usage patterns
      const tableAnalysis = await this.analyzeTableUsage();

      // Generate recommendations based on analysis
      const recommendations = [
        ...this.generateQueryOptimizationTips(queryAnalysis),
        ...this.generateTableOptimizationTips(tableAnalysis),
        ...this.generateCostOptimizationTips(),
        ...this.generateMLOptimizationTips()
      ];

      result.recommendations.push(...recommendations);

    } catch (error) {
      logger.error('Failed to generate optimization recommendations:', error);
      result.recommendations.push('Unable to generate detailed recommendations - run manual analysis');
    }
  }

  /**
   * Analyze query patterns for optimization opportunities
   */
  private async analyzeQueryPatterns(): Promise<any> {
    const queryAnalysisSQL = `
      SELECT 
        COUNT(*) as total_queries,
        AVG(total_bytes_processed) as avg_bytes_processed,
        AVG(total_slot_ms) as avg_slot_ms,
        COUNTIF(total_bytes_processed > 1000000000) as large_queries, -- >1GB
        COUNTIF(total_slot_ms > 60000) as slow_queries -- >1 minute
      FROM \`${this.projectId}\`.\`region-us\`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
      WHERE job_type = 'QUERY'
        AND creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        AND state = 'DONE'
        AND error_result IS NULL
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: queryAnalysisSQL,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows[0] || {};

    } catch (error) {
      logger.warn('Could not analyze query patterns:', error);
      return {};
    }
  }

  /**
   * Analyze table usage patterns
   */
  private async analyzeTableUsage(): Promise<any> {
    const tableAnalysisSQL = `
      SELECT 
        table_name,
        ROUND(size_bytes / 1024 / 1024 / 1024, 2) as size_gb,
        num_rows,
        num_partitions,
        clustering_fields
      FROM \`${this.projectId}.${this.datasetId}\`.INFORMATION_SCHEMA.TABLES
      WHERE table_type = 'BASE TABLE'
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: tableAnalysisSQL,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows;

    } catch (error) {
      logger.warn('Could not analyze table usage:', error);
      return [];
    }
  }

  /**
   * Generate query optimization tips
   */
  private generateQueryOptimizationTips(analysis: any): string[] {
    const tips = [];

    if (analysis.large_queries > 0) {
      tips.push('Consider using LIMIT clauses and date filters to reduce query size');
      tips.push('Use SELECT only needed columns instead of SELECT *');
    }

    if (analysis.slow_queries > 0) {
      tips.push('Optimize slow queries by adding proper WHERE clauses on partitioned columns');
      tips.push('Consider using materialized views for complex aggregations');
    }

    tips.push('Use APPROX_QUANTILES instead of exact quantiles for large datasets');
    tips.push('Consider using BigQuery ML functions like ML.PREDICT for model inference');

    return tips;
  }

  /**
   * Generate table optimization tips
   */
  private generateTableOptimizationTips(tables: any[]): string[] {
    const tips = [];

    for (const table of tables) {
      if (table.size_gb > 10) {
        tips.push(`Table ${table.table_name} is large (${table.size_gb}GB) - ensure it has proper partitioning`);
      }

      if (!table.clustering_fields) {
        tips.push(`Consider adding clustering to ${table.table_name} for better query performance`);
      }
    }

    return tips;
  }

  /**
   * Generate cost optimization tips
   */
  private generateCostOptimizationTips(): string[] {
    return [
      'Use query result caching to avoid re-running expensive queries',
      'Consider using BigQuery slots reservation for consistent workloads',
      'Archive old data to cheaper storage (Coldline/Archive)',
      'Use column-level security instead of views when possible',
      'Implement query result expiration for cached results'
    ];
  }

  /**
   * Generate ML-specific optimization tips
   */
  private generateMLOptimizationTips(): string[] {
    return [
      'Use feature_store table for consistent ML features across models',
      'Implement proper data versioning for ML reproducibility',
      'Consider using BigQuery ML for simple models to avoid data movement',
      'Use FARM_FINGERPRINT for consistent train/test splits',
      'Implement feature preprocessing in SQL for consistency',
      'Use sample weights to handle class imbalance in training data'
    ];
  }

  /**
   * Get optimization status and recommendations
   */
  async getOptimizationStatus(): Promise<any> {
    try {
      const [datasets] = await this.bigquery.getDatasets();
      const dataset = datasets.find(d => d.id === this.datasetId);
      
      if (!dataset) {
        return { error: `Dataset ${this.datasetId} not found` };
      }

      const [tables] = await dataset.getTables();
      const tableInfo = await Promise.all(
        tables.map(async (table) => {
          try {
            const [metadata] = await table.getMetadata();
            return {
              name: table.id,
              type: metadata.type,
              numRows: metadata.numRows,
              numBytes: metadata.numBytes,
              hasPartitioning: !!metadata.timePartitioning,
              hasClustering: !!metadata.clustering,
              partitionField: metadata.timePartitioning?.field,
              clusteringFields: metadata.clustering?.fields || []
            };
          } catch (error) {
            return {
              name: table.id,
              error: error.message
            };
          }
        })
      );

      return {
        dataset: this.datasetId,
        tables: tableInfo,
        optimizationScore: this.calculateOptimizationScore(tableInfo),
        recommendations: this.generateQuickRecommendations(tableInfo)
      };

    } catch (error) {
      logger.error('Failed to get optimization status:', error);
      return { error: error.message };
    }
  }

  /**
   * Calculate optimization score (0-100)
   */
  private calculateOptimizationScore(tables: any[]): number {
    let score = 0;
    let maxScore = 0;

    for (const table of tables) {
      if (table.error) continue;

      maxScore += 100;

      // Partitioning score (40 points)
      if (table.hasPartitioning) {
        score += 40;
      }

      // Clustering score (30 points)
      if (table.hasClustering && table.clusteringFields.length > 0) {
        score += 30;
      }

      // Table type score (30 points for base tables, 20 for views)
      if (table.type === 'TABLE') {
        score += 30;
      } else if (table.type === 'VIEW') {
        score += 20;
      } else if (table.type === 'MATERIALIZED_VIEW') {
        score += 30;
      }
    }

    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  /**
   * Generate quick recommendations
   */
  private generateQuickRecommendations(tables: any[]): string[] {
    const recommendations = [];

    for (const table of tables) {
      if (table.error) {
        recommendations.push(`Check permissions and access for table ${table.name}`);
        continue;
      }

      if (!table.hasPartitioning && parseInt(table.numRows || '0') > 1000000) {
        recommendations.push(`Add date partitioning to large table ${table.name}`);
      }

      if (!table.hasClustering) {
        recommendations.push(`Add clustering to table ${table.name} for better query performance`);
      }
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }
}

export default BigQueryOptimizer;