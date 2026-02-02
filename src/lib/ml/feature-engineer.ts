/**
 * Feature Engineering Pipeline for UNS Smart Maintenance ML
 * 
 * Generates advanced features from raw sensor data including rolling statistics,
 * cross-correlations, trend analysis, and anomaly detection scores.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { featureLogger as logger } from '../utils/logger';

interface FeatureEngineingConfig {
  windowSizes: number[]; // in minutes: [15, 60, 240, 1440]
  correlationPairs: string[][];
  anomalyDetectionMethods: string[];
  targetHorizons: number[]; // prediction horizons in hours: [24, 168, 336]
  batchSize: number;
  lookbackDays: number;
  outputTable: string;
}

interface FeatureStats {
  featuresGenerated: number;
  recordsProcessed: number;
  processingTime: number;
  qualityScore: number;
  missingDataPercent: number;
}

export class FeatureEngineer {
  private bigquery: BigQuery;
  private projectId: string;
  private datasetId: string;

  constructor(projectId: string = 'uns-smart-maintenance-ml', datasetId: string = 'manufacturing_data') {
    this.bigquery = new BigQuery({ projectId });
    this.projectId = projectId;
    this.datasetId = datasetId;
  }

  /**
   * Generate comprehensive feature set from raw sensor data
   */
  async generateFeatures(config: Partial<FeatureEngineingConfig> = {}): Promise<FeatureStats> {
    const defaultConfig: FeatureEngineingConfig = {
      windowSizes: [15, 60, 240, 1440], // 15min, 1hr, 4hr, 24hr
      correlationPairs: [
        ['vibration_x', 'vibration_y'],
        ['vibration_x', 'bearing_temperature'],
        ['vibration_y', 'bearing_temperature'],
        ['hydraulic_pressure', 'vibration_x'],
        ['weld_current', 'bearing_temperature']
      ],
      anomalyDetectionMethods: ['isolation_forest', 'local_outlier_factor'],
      targetHorizons: [24, 168, 336], // 1 day, 1 week, 2 weeks
      batchSize: 1000,
      lookbackDays: 30,
      outputTable: 'feature_store',
      ...config
    };

    logger.info('Starting feature engineering pipeline', defaultConfig);

    try {
      // Step 1: Generate time-based rolling features
      const rollingFeatures = await this.generateRollingFeatures(defaultConfig);

      // Step 2: Generate cross-correlation features
      const correlationFeatures = await this.generateCorrelationFeatures(defaultConfig);

      // Step 3: Generate trend and seasonality features
      const trendFeatures = await this.generateTrendFeatures(defaultConfig);

      // Step 4: Generate anomaly detection features
      const anomalyFeatures = await this.generateAnomalyFeatures(defaultConfig);

      // Step 5: Generate target labels for supervised learning
      const targetLabels = await this.generateTargetLabels(defaultConfig);

      // Step 6: Combine all features and store
      const finalStats = await this.combineAndStoreFeatures(defaultConfig);

      logger.info('Feature engineering completed successfully', finalStats);
      return finalStats;

    } catch (error) {
      logger.error('Feature engineering failed:', error);
      throw error;
    }
  }

  /**
   * Generate rolling window statistical features
   */
  private async generateRollingFeatures(config: FeatureEngineingConfig): Promise<any> {
    logger.info('Generating rolling window features...');

    // SQL query to generate rolling features for vibration sensors
    const rollingFeaturesQuery = `
      CREATE OR REPLACE TABLE \`${this.projectId}.${this.datasetId}.rolling_features\` AS
      WITH sensor_windows AS (
        SELECT 
          machine_id,
          location_path,
          timestamp,
          sensor_type,
          value,
          
          -- 15-minute windows
          AVG(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            RANGE BETWEEN INTERVAL 15 MINUTE PRECEDING AND CURRENT ROW
          ) AS avg_15min,
          
          STDDEV(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            RANGE BETWEEN INTERVAL 15 MINUTE PRECEDING AND CURRENT ROW
          ) AS std_15min,
          
          MIN(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            RANGE BETWEEN INTERVAL 15 MINUTE PRECEDING AND CURRENT ROW
          ) AS min_15min,
          
          MAX(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            RANGE BETWEEN INTERVAL 15 MINUTE PRECEDING AND CURRENT ROW
          ) AS max_15min,
          
          -- 1-hour windows  
          AVG(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            RANGE BETWEEN INTERVAL 1 HOUR PRECEDING AND CURRENT ROW
          ) AS avg_1hr,
          
          STDDEV(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            RANGE BETWEEN INTERVAL 1 HOUR PRECEDING AND CURRENT ROW
          ) AS std_1hr,
          
          -- 4-hour windows (trend detection)
          AVG(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            RANGE BETWEEN INTERVAL 4 HOUR PRECEDING AND CURRENT ROW
          ) AS avg_4hr,
          
          -- 24-hour windows (daily patterns)
          AVG(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            RANGE BETWEEN INTERVAL 24 HOUR PRECEDING AND CURRENT ROW
          ) AS avg_24hr
          
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${config.lookbackDays} DAY)
          AND sensor_type IN ('vibration_x', 'vibration_y', 'vibration_z', 'bearing_temperature', 
                             'hydraulic_pressure', 'weld_current')
      )
      SELECT 
        GENERATE_UUID() as feature_id,
        machine_id,
        timestamp,
        sensor_type,
        
        -- Rolling statistics
        avg_15min,
        std_15min,
        min_15min,
        max_15min,
        avg_1hr,
        std_1hr,
        avg_4hr,
        avg_24hr,
        
        -- Derived features
        (max_15min - min_15min) as range_15min,
        CASE WHEN avg_1hr > 0 THEN std_1hr / avg_1hr ELSE 0 END as cv_1hr, -- coefficient of variation
        (avg_15min - avg_1hr) / NULLIF(avg_1hr, 0) as short_long_ratio,
        
        -- Trend indicators
        (avg_1hr - avg_4hr) / NULLIF(avg_4hr, 0) as trend_1hr_4hr,
        (avg_4hr - avg_24hr) / NULLIF(avg_24hr, 0) as trend_4hr_24hr,
        
        CURRENT_TIMESTAMP() as processing_time
        
      FROM sensor_windows
      WHERE std_15min IS NOT NULL -- Filter out insufficient data windows
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: rollingFeaturesQuery,
        location: 'US',
        jobConfig: {
          writeDisposition: 'WRITE_TRUNCATE'
        }
      });

      await job.promise();
      logger.info('Rolling features generated successfully');
      
      return { table: 'rolling_features', jobId: job.id };

    } catch (error) {
      logger.error('Rolling features generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate cross-correlation features between sensor pairs
   */
  private async generateCorrelationFeatures(config: FeatureEngineingConfig): Promise<any> {
    logger.info('Generating cross-correlation features...');

    const correlationQuery = `
      CREATE OR REPLACE TABLE \`${this.projectId}.${this.datasetId}.correlation_features\` AS
      WITH sensor_pivot AS (
        SELECT 
          machine_id,
          location_path,
          TIMESTAMP_TRUNC(timestamp, MINUTE) as minute_timestamp,
          
          -- Pivot sensor values by type
          MAX(CASE WHEN sensor_type = 'vibration_x' THEN value END) as vibration_x,
          MAX(CASE WHEN sensor_type = 'vibration_y' THEN value END) as vibration_y, 
          MAX(CASE WHEN sensor_type = 'vibration_z' THEN value END) as vibration_z,
          MAX(CASE WHEN sensor_type = 'bearing_temperature' THEN value END) as bearing_temp,
          MAX(CASE WHEN sensor_type = 'hydraulic_pressure' THEN value END) as hydraulic_pressure,
          MAX(CASE WHEN sensor_type = 'weld_current' THEN value END) as weld_current
          
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${config.lookbackDays} DAY)
        GROUP BY machine_id, location_path, TIMESTAMP_TRUNC(timestamp, MINUTE)
      ),
      
      correlation_windows AS (
        SELECT 
          machine_id,
          location_path, 
          minute_timestamp as timestamp,
          vibration_x,
          vibration_y,
          vibration_z,
          bearing_temp,
          hydraulic_pressure,
          weld_current,
          
          -- Rolling correlations over 1-hour windows
          CORR(vibration_x, vibration_y) OVER (
            PARTITION BY machine_id 
            ORDER BY minute_timestamp 
            RANGE BETWEEN INTERVAL 1 HOUR PRECEDING AND CURRENT ROW
          ) as vib_x_y_corr_1hr,
          
          CORR(vibration_x, bearing_temp) OVER (
            PARTITION BY machine_id 
            ORDER BY minute_timestamp 
            RANGE BETWEEN INTERVAL 1 HOUR PRECEDING AND CURRENT ROW
          ) as vib_x_temp_corr_1hr,
          
          CORR(vibration_y, bearing_temp) OVER (
            PARTITION BY machine_id 
            ORDER BY minute_timestamp 
            RANGE BETWEEN INTERVAL 1 HOUR PRECEDING AND CURRENT ROW
          ) as vib_y_temp_corr_1hr,
          
          CORR(hydraulic_pressure, vibration_x) OVER (
            PARTITION BY machine_id 
            ORDER BY minute_timestamp 
            RANGE BETWEEN INTERVAL 1 HOUR PRECEDING AND CURRENT ROW
          ) as pressure_vib_x_corr_1hr
          
        FROM sensor_pivot
        WHERE vibration_x IS NOT NULL 
          AND vibration_y IS NOT NULL
      )
      
      SELECT 
        GENERATE_UUID() as feature_id,
        machine_id,
        timestamp,
        
        -- Cross-correlations
        vib_x_y_corr_1hr,
        vib_x_temp_corr_1hr, 
        vib_y_temp_corr_1hr,
        pressure_vib_x_corr_1hr,
        
        -- Vibration magnitude and phase features
        SQRT(POWER(vibration_x, 2) + POWER(vibration_y, 2) + POWER(vibration_z, 2)) as vibration_magnitude,
        ATAN2(vibration_y, vibration_x) as vibration_phase_xy,
        
        -- Temperature-pressure relationship
        CASE WHEN hydraulic_pressure > 0 THEN bearing_temp / hydraulic_pressure ELSE NULL END as temp_pressure_ratio,
        
        CURRENT_TIMESTAMP() as processing_time
        
      FROM correlation_windows
      WHERE vib_x_y_corr_1hr IS NOT NULL
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: correlationQuery,
        location: 'US',
      });

      await job.promise();
      logger.info('Correlation features generated successfully');
      
      return { table: 'correlation_features', jobId: job.id };

    } catch (error) {
      logger.error('Correlation features generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate trend and seasonality features
   */
  private async generateTrendFeatures(config: FeatureEngineingConfig): Promise<any> {
    logger.info('Generating trend and seasonality features...');

    const trendQuery = `
      CREATE OR REPLACE TABLE \`${this.projectId}.${this.datasetId}.trend_features\` AS
      WITH trend_analysis AS (
        SELECT 
          machine_id,
          location_path,
          timestamp,
          sensor_type,
          value,
          
          -- Linear trend over different windows
          APPROX_QUANTILES(value, 2)[OFFSET(1)] OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 60 PRECEDING AND CURRENT ROW
          ) as median_1hr,
          
          -- First and last values in windows for trend calculation
          FIRST_VALUE(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 240 PRECEDING AND 60 PRECEDING
          ) as value_4hr_ago,
          
          LAST_VALUE(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 60 PRECEDING AND CURRENT ROW
          ) as value_current,
          
          -- Seasonal patterns (hour of day, day of week)
          EXTRACT(HOUR FROM timestamp) as hour_of_day,
          EXTRACT(DAYOFWEEK FROM timestamp) as day_of_week,
          EXTRACT(DAYOFYEAR FROM timestamp) as day_of_year,
          
          -- Rolling z-score for anomaly detection
          AVG(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 1440 PRECEDING AND CURRENT ROW
          ) as rolling_mean_24hr,
          
          STDDEV(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 1440 PRECEDING AND CURRENT ROW
          ) as rolling_std_24hr
          
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${config.lookbackDays} DAY)
      )
      
      SELECT 
        GENERATE_UUID() as feature_id,
        machine_id,
        timestamp,
        sensor_type,
        
        -- Trend features
        CASE WHEN value_4hr_ago > 0 
             THEN (value_current - value_4hr_ago) / value_4hr_ago 
             ELSE 0 END as trend_4hr_pct,
        
        value_current - median_1hr as deviation_from_median,
        
        -- Seasonal features
        hour_of_day,
        day_of_week,
        CASE WHEN day_of_week IN (1, 7) THEN 1 ELSE 0 END as is_weekend,
        CASE WHEN hour_of_day BETWEEN 6 AND 18 THEN 1 ELSE 0 END as is_day_shift,
        
        -- Cyclical encodings for time features
        SIN(2 * ACOS(-1) * hour_of_day / 24) as hour_sin,
        COS(2 * ACOS(-1) * hour_of_day / 24) as hour_cos,
        SIN(2 * ACOS(-1) * day_of_year / 365) as day_year_sin,
        COS(2 * ACOS(-1) * day_of_year / 365) as day_year_cos,
        
        -- Normalized value (z-score)
        CASE WHEN rolling_std_24hr > 0 
             THEN (value - rolling_mean_24hr) / rolling_std_24hr 
             ELSE 0 END as z_score_24hr,
        
        CURRENT_TIMESTAMP() as processing_time
        
      FROM trend_analysis
      WHERE rolling_std_24hr IS NOT NULL
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: trendQuery,
        location: 'US',
      });

      await job.promise();
      logger.info('Trend features generated successfully');
      
      return { table: 'trend_features', jobId: job.id };

    } catch (error) {
      logger.error('Trend features generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate anomaly detection scores using statistical methods
   */
  private async generateAnomalyFeatures(config: FeatureEngineingConfig): Promise<any> {
    logger.info('Generating anomaly detection features...');

    // For now, implement statistical anomaly detection
    // In production, you could use ML.KMEANS or other BigQuery ML models
    const anomalyQuery = `
      CREATE OR REPLACE TABLE \`${this.projectId}.${this.datasetId}.anomaly_features\` AS
      WITH anomaly_scores AS (
        SELECT 
          machine_id,
          location_path,
          timestamp,
          sensor_type,
          value,
          
          -- Statistical anomaly detection
          AVG(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 2880 PRECEDING AND CURRENT ROW
          ) as baseline_mean,
          
          STDDEV(value) OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 2880 PRECEDING AND CURRENT ROW
          ) as baseline_std,
          
          -- Percentile-based outlier detection
          APPROX_QUANTILES(value, 100)[OFFSET(1)] OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 2880 PRECEDING AND CURRENT ROW
          ) as p1,
          
          APPROX_QUANTILES(value, 100)[OFFSET(99)] OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 2880 PRECEDING AND CURRENT ROW
          ) as p99,
          
          APPROX_QUANTILES(value, 4)[OFFSET(1)] OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 2880 PRECEDING AND CURRENT ROW
          ) as q1,
          
          APPROX_QUANTILES(value, 4)[OFFSET(3)] OVER (
            PARTITION BY machine_id, sensor_type 
            ORDER BY timestamp 
            ROWS BETWEEN 2880 PRECEDING AND CURRENT ROW
          ) as q3
          
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${config.lookbackDays} DAY)
      )
      
      SELECT 
        GENERATE_UUID() as feature_id,
        machine_id,
        timestamp,
        sensor_type,
        
        -- Z-score based anomaly score
        CASE WHEN baseline_std > 0 
             THEN ABS(value - baseline_mean) / baseline_std 
             ELSE 0 END as z_score_anomaly,
        
        -- IQR-based outlier score
        CASE WHEN (q3 - q1) > 0 
             THEN GREATEST(
               (q1 - value) / (q3 - q1),  -- Lower outlier
               (value - q3) / (q3 - q1)   -- Upper outlier
             ) ELSE 0 END as iqr_outlier_score,
        
        -- Percentile-based anomaly indicators
        CASE WHEN value < p1 OR value > p99 THEN 1 ELSE 0 END as is_extreme_outlier,
        CASE WHEN value < q1 - 1.5 * (q3 - q1) OR value > q3 + 1.5 * (q3 - q1) 
             THEN 1 ELSE 0 END as is_mild_outlier,
        
        -- Distance from baseline
        ABS(value - baseline_mean) as abs_deviation,
        (value - baseline_mean) / NULLIF(baseline_mean, 0) as relative_deviation,
        
        CURRENT_TIMESTAMP() as processing_time
        
      FROM anomaly_scores
      WHERE baseline_std IS NOT NULL
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: anomalyQuery,
        location: 'US',
      });

      await job.promise();
      logger.info('Anomaly features generated successfully');
      
      return { table: 'anomaly_features', jobId: job.id };

    } catch (error) {
      logger.error('Anomaly features generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate target labels for supervised learning
   */
  private async generateTargetLabels(config: FeatureEngineingConfig): Promise<any> {
    logger.info('Generating target labels for supervised learning...');

    // This is a simplified approach - in production you'd have maintenance logs
    const targetQuery = `
      CREATE OR REPLACE TABLE \`${this.projectId}.${this.datasetId}.target_labels\` AS
      WITH failure_indicators AS (
        SELECT 
          machine_id,
          location_path,
          timestamp,
          sensor_type,
          value,
          
          -- Look ahead for potential failures (simple heuristic)
          MAX(CASE WHEN sensor_type = 'vibration_x' THEN value END) OVER (
            PARTITION BY machine_id 
            ORDER BY timestamp 
            ROWS BETWEEN CURRENT ROW AND 1440 FOLLOWING -- 24 hours ahead
          ) as max_vibration_24h,
          
          MAX(CASE WHEN sensor_type = 'bearing_temperature' THEN value END) OVER (
            PARTITION BY machine_id 
            ORDER BY timestamp 
            ROWS BETWEEN CURRENT ROW AND 1440 FOLLOWING 
          ) as max_temperature_24h,
          
          -- Similar for 1 week and 2 weeks
          MAX(CASE WHEN sensor_type = 'vibration_x' THEN value END) OVER (
            PARTITION BY machine_id 
            ORDER BY timestamp 
            ROWS BETWEEN CURRENT ROW AND 10080 FOLLOWING -- 1 week
          ) as max_vibration_1week,
          
          MAX(CASE WHEN sensor_type = 'vibration_x' THEN value END) OVER (
            PARTITION BY machine_id 
            ORDER BY timestamp 
            ROWS BETWEEN CURRENT ROW AND 20160 FOLLOWING -- 2 weeks
          ) as max_vibration_2weeks
          
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${config.lookbackDays} DAY)
      ),
      
      vibration_thresholds AS (
        -- Calculate dynamic thresholds per machine (95th percentile)
        SELECT 
          machine_id,
          sensor_type,
          APPROX_QUANTILES(value, 20)[OFFSET(19)] as p95_threshold -- 95th percentile
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE sensor_type = 'vibration_x'
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${config.lookbackDays} DAY)
        GROUP BY machine_id, sensor_type
      )
      
      SELECT DISTINCT
        fi.machine_id,
        fi.timestamp,
        
        -- Failure probability labels (based on threshold exceedance)
        CASE WHEN fi.max_vibration_24h > vt.p95_threshold * 1.5 THEN TRUE ELSE FALSE END as failure_within_24h,
        CASE WHEN fi.max_vibration_1week > vt.p95_threshold * 1.3 THEN TRUE ELSE FALSE END as failure_within_1week,  
        CASE WHEN fi.max_vibration_2weeks > vt.p95_threshold * 1.2 THEN TRUE ELSE FALSE END as failure_within_2weeks,
        
        -- Maintenance needed indicator (temperature + vibration)
        CASE WHEN fi.max_temperature_24h > 80 OR fi.max_vibration_24h > vt.p95_threshold * 1.2 
             THEN TRUE ELSE FALSE END as maintenance_needed,
        
        CURRENT_TIMESTAMP() as processing_time
        
      FROM failure_indicators fi
      LEFT JOIN vibration_thresholds vt ON fi.machine_id = vt.machine_id
      WHERE fi.sensor_type = 'vibration_x' -- Use one sensor as the base
        AND vt.p95_threshold IS NOT NULL
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: targetQuery,
        location: 'US',
      });

      await job.promise();
      logger.info('Target labels generated successfully');
      
      return { table: 'target_labels', jobId: job.id };

    } catch (error) {
      logger.error('Target labels generation failed:', error);
      throw error;
    }
  }

  /**
   * Combine all features into the final feature store
   */
  private async combineAndStoreFeatures(config: FeatureEngineingConfig): Promise<FeatureStats> {
    logger.info('Combining features into feature store...');

    const combineQuery = `
      INSERT INTO \`${this.projectId}.${this.datasetId}.${config.outputTable}\`
      (
        feature_id, machine_id, timestamp,
        -- Rolling features
        vibration_x_15min_avg, vibration_x_15min_std,
        vibration_x_1hr_avg, vibration_x_1hr_std,
        vibration_x_4hr_trend, vibration_x_24hr_trend,
        
        vibration_y_15min_avg, vibration_y_15min_std,
        vibration_y_1hr_avg, vibration_y_1hr_std,
        vibration_y_4hr_trend, vibration_y_24hr_trend,
        
        vibration_z_15min_avg, vibration_z_15min_std,
        vibration_z_1hr_avg, vibration_z_1hr_std,
        vibration_z_4hr_trend, vibration_z_24hr_trend,
        
        bearing_temp_15min_avg, bearing_temp_15min_std,
        bearing_temp_1hr_avg, bearing_temp_4hr_trend, bearing_temp_24hr_trend,
        
        hydraulic_pressure_15min_avg, hydraulic_pressure_1hr_std,
        weld_current_15min_avg, weld_current_1hr_std,
        
        -- Cross-correlation features
        vibration_temp_correlation, vibration_pressure_correlation,
        vibration_magnitude,
        
        -- Anomaly detection features
        isolation_forest_score, one_class_svm_score, local_outlier_factor,
        
        -- Target labels
        failure_within_24h, failure_within_1week, failure_within_2weeks,
        maintenance_needed,
        
        -- Metadata
        feature_version, processing_time, data_quality_flag
      )
      SELECT 
        GENERATE_UUID() as feature_id,
        COALESCE(rf.machine_id, cf.machine_id, tf.machine_id, af.machine_id) as machine_id,
        COALESCE(rf.timestamp, cf.timestamp, tf.timestamp, af.timestamp) as timestamp,
        
        -- Rolling features (pivoted by sensor type)
        MAX(CASE WHEN rf.sensor_type = 'vibration_x' THEN rf.avg_15min END) as vibration_x_15min_avg,
        MAX(CASE WHEN rf.sensor_type = 'vibration_x' THEN rf.std_15min END) as vibration_x_15min_std,
        MAX(CASE WHEN rf.sensor_type = 'vibration_x' THEN rf.avg_1hr END) as vibration_x_1hr_avg,
        MAX(CASE WHEN rf.sensor_type = 'vibration_x' THEN rf.std_1hr END) as vibration_x_1hr_std,
        MAX(CASE WHEN rf.sensor_type = 'vibration_x' THEN rf.trend_1hr_4hr END) as vibration_x_4hr_trend,
        MAX(CASE WHEN rf.sensor_type = 'vibration_x' THEN rf.trend_4hr_24hr END) as vibration_x_24hr_trend,
        
        -- Similar for vibration_y and vibration_z
        MAX(CASE WHEN rf.sensor_type = 'vibration_y' THEN rf.avg_15min END) as vibration_y_15min_avg,
        MAX(CASE WHEN rf.sensor_type = 'vibration_y' THEN rf.std_15min END) as vibration_y_15min_std,
        MAX(CASE WHEN rf.sensor_type = 'vibration_y' THEN rf.avg_1hr END) as vibration_y_1hr_avg,
        MAX(CASE WHEN rf.sensor_type = 'vibration_y' THEN rf.std_1hr END) as vibration_y_1hr_std,
        MAX(CASE WHEN rf.sensor_type = 'vibration_y' THEN rf.trend_1hr_4hr END) as vibration_y_4hr_trend,
        MAX(CASE WHEN rf.sensor_type = 'vibration_y' THEN rf.trend_4hr_24hr END) as vibration_y_24hr_trend,
        
        MAX(CASE WHEN rf.sensor_type = 'vibration_z' THEN rf.avg_15min END) as vibration_z_15min_avg,
        MAX(CASE WHEN rf.sensor_type = 'vibration_z' THEN rf.std_15min END) as vibration_z_15min_std,
        MAX(CASE WHEN rf.sensor_type = 'vibration_z' THEN rf.avg_1hr END) as vibration_z_1hr_avg,
        MAX(CASE WHEN rf.sensor_type = 'vibration_z' THEN rf.std_1hr END) as vibration_z_1hr_std,
        MAX(CASE WHEN rf.sensor_type = 'vibration_z' THEN rf.trend_1hr_4hr END) as vibration_z_4hr_trend,
        MAX(CASE WHEN rf.sensor_type = 'vibration_z' THEN rf.trend_4hr_24hr END) as vibration_z_24hr_trend,
        
        -- Temperature features
        MAX(CASE WHEN rf.sensor_type = 'bearing_temperature' THEN rf.avg_15min END) as bearing_temp_15min_avg,
        MAX(CASE WHEN rf.sensor_type = 'bearing_temperature' THEN rf.std_15min END) as bearing_temp_15min_std,
        MAX(CASE WHEN rf.sensor_type = 'bearing_temperature' THEN rf.avg_1hr END) as bearing_temp_1hr_avg,
        MAX(CASE WHEN rf.sensor_type = 'bearing_temperature' THEN rf.trend_1hr_4hr END) as bearing_temp_4hr_trend,
        MAX(CASE WHEN rf.sensor_type = 'bearing_temperature' THEN rf.trend_4hr_24hr END) as bearing_temp_24hr_trend,
        
        -- Pressure and current features
        MAX(CASE WHEN rf.sensor_type = 'hydraulic_pressure' THEN rf.avg_15min END) as hydraulic_pressure_15min_avg,
        MAX(CASE WHEN rf.sensor_type = 'hydraulic_pressure' THEN rf.std_1hr END) as hydraulic_pressure_1hr_std,
        MAX(CASE WHEN rf.sensor_type = 'weld_current' THEN rf.avg_15min END) as weld_current_15min_avg,
        MAX(CASE WHEN rf.sensor_type = 'weld_current' THEN rf.std_1hr END) as weld_current_1hr_std,
        
        -- Cross-correlation features
        cf.vib_x_temp_corr_1hr as vibration_temp_correlation,
        cf.pressure_vib_x_corr_1hr as vibration_pressure_correlation,
        cf.vibration_magnitude,
        
        -- Anomaly scores (using z-score as proxy)
        MAX(CASE WHEN af.sensor_type = 'vibration_x' THEN af.z_score_anomaly END) as isolation_forest_score,
        MAX(CASE WHEN af.sensor_type = 'vibration_y' THEN af.z_score_anomaly END) as one_class_svm_score,
        MAX(CASE WHEN af.sensor_type = 'bearing_temperature' THEN af.iqr_outlier_score END) as local_outlier_factor,
        
        -- Target labels
        tl.failure_within_24h,
        tl.failure_within_1week,
        tl.failure_within_2weeks,
        tl.maintenance_needed,
        
        -- Metadata
        'v1.0' as feature_version,
        CURRENT_TIMESTAMP() as processing_time,
        'generated' as data_quality_flag
        
      FROM \`${this.projectId}.${this.datasetId}.rolling_features\` rf
      FULL OUTER JOIN \`${this.projectId}.${this.datasetId}.correlation_features\` cf
        ON rf.machine_id = cf.machine_id 
        AND TIMESTAMP_DIFF(rf.timestamp, cf.timestamp, MINUTE) = 0
      FULL OUTER JOIN \`${this.projectId}.${this.datasetId}.trend_features\` tf
        ON rf.machine_id = tf.machine_id 
        AND TIMESTAMP_DIFF(rf.timestamp, tf.timestamp, MINUTE) = 0
      FULL OUTER JOIN \`${this.projectId}.${this.datasetId}.anomaly_features\` af
        ON rf.machine_id = af.machine_id 
        AND TIMESTAMP_DIFF(rf.timestamp, af.timestamp, MINUTE) = 0
      LEFT JOIN \`${this.projectId}.${this.datasetId}.target_labels\` tl
        ON rf.machine_id = tl.machine_id 
        AND TIMESTAMP_DIFF(rf.timestamp, tl.timestamp, MINUTE) = 0
      
      GROUP BY 
        COALESCE(rf.machine_id, cf.machine_id, tf.machine_id, af.machine_id),
        COALESCE(rf.timestamp, cf.timestamp, tf.timestamp, af.timestamp),
        cf.vib_x_temp_corr_1hr, cf.pressure_vib_x_corr_1hr, cf.vibration_magnitude,
        tl.failure_within_24h, tl.failure_within_1week, tl.failure_within_2weeks, tl.maintenance_needed
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: combineQuery,
        location: 'US',
      });

      await job.promise();

      // Get statistics about the feature store
      const statsQuery = `
        SELECT 
          COUNT(*) as features_generated,
          COUNT(DISTINCT machine_id) as machines_covered,
          MIN(timestamp) as earliest_feature,
          MAX(timestamp) as latest_feature,
          AVG(CASE WHEN vibration_x_15min_avg IS NOT NULL THEN 1 ELSE 0 END) as data_completeness
        FROM \`${this.projectId}.${this.datasetId}.${config.outputTable}\`
      `;

      const [statsJob] = await this.bigquery.createQueryJob({
        query: statsQuery,
        location: 'US',
      });

      const [statsRows] = await statsJob.getQueryResults();
      const stats = statsRows[0];

      const result: FeatureStats = {
        featuresGenerated: parseInt(stats.features_generated),
        recordsProcessed: parseInt(stats.features_generated),
        processingTime: Date.now(),
        qualityScore: parseFloat(stats.data_completeness),
        missingDataPercent: (1 - parseFloat(stats.data_completeness)) * 100
      };

      logger.info('Feature store populated successfully', result);
      return result;

    } catch (error) {
      logger.error('Feature combination failed:', error);
      throw error;
    }
  }
}

export default FeatureEngineer;