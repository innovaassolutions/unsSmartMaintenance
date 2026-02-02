/**
 * Data Quality Monitoring for UNS Smart Maintenance ML Pipeline
 * 
 * Provides comprehensive data quality validation, monitoring, and alerting
 * for the ETL pipeline and ML feature store.
 */

import { BigQuery } from '@google-cloud/bigquery';
import { logger } from '../utils/logger';

interface QualityRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  query: string;
  threshold?: number;
  operator?: '>' | '<' | '=' | '>=' | '<=';
  expectedValue?: any;
}

interface QualityIssue {
  ruleId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  actualValue: any;
  expectedValue?: any;
  affectedRecords: number;
  timestamp: Date;
  tableAffected: string;
}

interface QualityReport {
  overallScore: number;
  timestamp: Date;
  tablesChecked: string[];
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warnings: number;
  errors: number;
  issues: QualityIssue[];
  recommendations: string[];
}

export class DataQualityMonitor {
  private bigquery: BigQuery;
  private projectId: string;
  private datasetId: string;
  private qualityRules: QualityRule[];

  constructor(projectId: string = 'uns-smart-maintenance-ml', datasetId: string = 'manufacturing_data') {
    this.bigquery = new BigQuery({ projectId });
    this.projectId = projectId;
    this.datasetId = datasetId;
    this.initializeQualityRules();
  }

  /**
   * Initialize data quality rules
   */
  private initializeQualityRules(): void {
    this.qualityRules = [
      // Completeness checks
      {
        name: 'sensor_data_completeness',
        description: 'Check for null values in critical sensor data columns',
        severity: 'error',
        query: `
          SELECT 
            COUNT(*) as total_records,
            COUNTIF(value IS NULL) as null_values,
            COUNTIF(machine_id IS NULL) as null_machine_ids,
            COUNTIF(timestamp IS NULL) as null_timestamps
          FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        `,
        threshold: 0.01, // Allow max 1% null values
        operator: '<'
      },

      // Freshness checks
      {
        name: 'data_freshness',
        description: 'Check if data is recent (within last 2 hours)',
        severity: 'warning',
        query: `
          SELECT 
            TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(timestamp), HOUR) as hours_since_last_data
          FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        `,
        threshold: 2,
        operator: '<'
      },

      // Volume checks
      {
        name: 'daily_volume_check',
        description: 'Check if daily data volume is within expected range',
        severity: 'warning',
        query: `
          SELECT 
            COUNT(*) as daily_record_count
          FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        `,
        threshold: 100000, // Expect at least 100k records per day
        operator: '>='
      },

      // Uniqueness checks
      {
        name: 'sensor_data_duplicates',
        description: 'Check for duplicate sensor readings',
        severity: 'error',
        query: `
          SELECT 
            COUNT(*) as total_records,
            COUNT(DISTINCT CONCAT(machine_id, '|', CAST(timestamp AS STRING), '|', sensor_type)) as unique_records
          FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        `,
        threshold: 0.99, // Expect 99%+ unique records
        operator: '>='
      },

      // Range validation
      {
        name: 'sensor_value_ranges',
        description: 'Check for sensor values outside reasonable ranges',
        severity: 'warning',
        query: `
          SELECT 
            sensor_type,
            COUNT(*) as total_readings,
            COUNTIF(
              CASE 
                WHEN sensor_type LIKE '%temperature%' AND (value < -50 OR value > 200) THEN 1
                WHEN sensor_type LIKE '%vibration%' AND (value < 0 OR value > 500) THEN 1
                WHEN sensor_type LIKE '%pressure%' AND (value < 0 OR value > 2000) THEN 1
                WHEN sensor_type LIKE '%current%' AND (value < 0 OR value > 1000) THEN 1
                ELSE 0
              END
            ) as out_of_range_readings
          FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
          GROUP BY sensor_type
        `,
        threshold: 0.05, // Allow max 5% out-of-range readings
        operator: '<'
      },

      // Machine coverage
      {
        name: 'machine_coverage',
        description: 'Check that all expected machines are reporting data',
        severity: 'error',
        query: `
          SELECT 
            COUNT(DISTINCT machine_id) as reporting_machines
          FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
        `,
        threshold: 6, // Expect all 6 relay assembly machines
        operator: '>='
      },

      // Feature store quality
      {
        name: 'feature_store_completeness',
        description: 'Check completeness of feature store',
        severity: 'warning',
        query: `
          SELECT 
            COUNT(*) as total_features,
            COUNTIF(vibration_x_15min_avg IS NOT NULL) as complete_vibration_features,
            COUNTIF(bearing_temp_15min_avg IS NOT NULL) as complete_temp_features,
            COUNTIF(vibration_magnitude IS NOT NULL) as complete_correlation_features
          FROM \`${this.projectId}.${this.datasetId}.feature_store\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        `,
        threshold: 0.8, // Expect 80%+ feature completeness
        operator: '>='
      },

      // Anomaly detection validation
      {
        name: 'anomaly_score_distribution',
        description: 'Check distribution of anomaly scores',
        severity: 'info',
        query: `
          SELECT 
            COUNT(*) as total_records,
            COUNTIF(isolation_forest_score > 3) as high_anomaly_records,
            AVG(isolation_forest_score) as avg_anomaly_score
          FROM \`${this.projectId}.${this.datasetId}.feature_store\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
            AND isolation_forest_score IS NOT NULL
        `,
        threshold: 0.1, // Expect less than 10% high anomaly scores
        operator: '<'
      },

      // Consistency checks
      {
        name: 'timestamp_consistency',
        description: 'Check for timestamps in the future or too far in past',
        severity: 'error',
        query: `
          SELECT 
            COUNT(*) as total_records,
            COUNTIF(timestamp > CURRENT_TIMESTAMP()) as future_timestamps,
            COUNTIF(timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 365 DAY)) as very_old_timestamps
          FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
          WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        `,
        threshold: 0,
        operator: '='
      }
    ];
  }

  /**
   * Run complete data quality assessment
   */
  async runQualityAssessment(): Promise<QualityReport> {
    logger.info('Starting comprehensive data quality assessment...');

    const startTime = Date.now();
    const issues: QualityIssue[] = [];
    let passedRules = 0;
    let failedRules = 0;
    let warnings = 0;
    let errors = 0;

    try {
      for (const rule of this.qualityRules) {
        try {
          const ruleResult = await this.evaluateRule(rule);
          
          if (ruleResult.passed) {
            passedRules++;
          } else {
            failedRules++;
            issues.push(ruleResult.issue);
            
            if (ruleResult.issue.severity === 'error') {
              errors++;
            } else if (ruleResult.issue.severity === 'warning') {
              warnings++;
            }
          }

        } catch (error) {
          logger.error(`Failed to evaluate rule ${rule.name}:`, error);
          failedRules++;
          errors++;
          issues.push({
            ruleId: rule.name,
            severity: 'error',
            message: `Rule evaluation failed: ${error.message}`,
            actualValue: null,
            affectedRecords: 0,
            timestamp: new Date(),
            tableAffected: 'unknown'
          });
        }
      }

      // Calculate overall quality score
      const overallScore = this.calculateQualityScore(passedRules, failedRules, issues);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(issues);

      const report: QualityReport = {
        overallScore,
        timestamp: new Date(),
        tablesChecked: ['sensor_data', 'machine_status', 'feature_store'],
        totalRules: this.qualityRules.length,
        passedRules,
        failedRules,
        warnings,
        errors,
        issues,
        recommendations
      };

      const assessmentTime = Date.now() - startTime;
      logger.info(`Quality assessment completed in ${assessmentTime}ms`, {
        overallScore: report.overallScore,
        passedRules: report.passedRules,
        failedRules: report.failedRules,
        errors: report.errors,
        warnings: report.warnings
      });

      return report;

    } catch (error) {
      logger.error('Quality assessment failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate individual quality rule
   */
  private async evaluateRule(rule: QualityRule): Promise<{ passed: boolean; issue?: QualityIssue }> {
    try {
      const [job] = await this.bigquery.createQueryJob({
        query: rule.query,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();

      if (rows.length === 0) {
        return {
          passed: false,
          issue: {
            ruleId: rule.name,
            severity: rule.severity,
            message: `Rule returned no results: ${rule.description}`,
            actualValue: null,
            affectedRecords: 0,
            timestamp: new Date(),
            tableAffected: 'multiple'
          }
        };
      }

      // Handle different rule types
      const result = rows[0];
      let passed = true;
      let actualValue: any;
      let affectedRecords = 0;

      if (rule.name === 'sensor_data_completeness') {
        const totalRecords = parseInt(result.total_records);
        const nullValues = parseInt(result.null_values);
        const nullRate = totalRecords > 0 ? nullValues / totalRecords : 0;
        
        actualValue = nullRate;
        passed = rule.operator === '<' ? nullRate < rule.threshold! : false;
        affectedRecords = nullValues;

      } else if (rule.name === 'data_freshness') {
        actualValue = parseInt(result.hours_since_last_data);
        passed = rule.operator === '<' ? actualValue < rule.threshold! : false;
        affectedRecords = actualValue > rule.threshold! ? 1 : 0;

      } else if (rule.name === 'daily_volume_check') {
        actualValue = parseInt(result.daily_record_count);
        passed = rule.operator === '>=' ? actualValue >= rule.threshold! : false;
        affectedRecords = passed ? 0 : Math.abs(actualValue - rule.threshold!);

      } else if (rule.name === 'sensor_data_duplicates') {
        const totalRecords = parseInt(result.total_records);
        const uniqueRecords = parseInt(result.unique_records);
        const uniqueRate = totalRecords > 0 ? uniqueRecords / totalRecords : 0;
        
        actualValue = uniqueRate;
        passed = rule.operator === '>=' ? uniqueRate >= rule.threshold! : false;
        affectedRecords = totalRecords - uniqueRecords;

      } else if (rule.name === 'machine_coverage') {
        actualValue = parseInt(result.reporting_machines);
        passed = rule.operator === '>=' ? actualValue >= rule.threshold! : false;
        affectedRecords = Math.max(0, rule.threshold! - actualValue);

      } else if (rule.name === 'feature_store_completeness') {
        const totalFeatures = parseInt(result.total_features);
        const completeFeatures = Math.min(
          parseInt(result.complete_vibration_features),
          parseInt(result.complete_temp_features),
          parseInt(result.complete_correlation_features)
        );
        const completenessRate = totalFeatures > 0 ? completeFeatures / totalFeatures : 0;
        
        actualValue = completenessRate;
        passed = rule.operator === '>=' ? completenessRate >= rule.threshold! : false;
        affectedRecords = totalFeatures - completeFeatures;

      } else {
        // Generic handling for other rules
        actualValue = result[Object.keys(result)[0]];
        
        if (rule.threshold !== undefined && rule.operator) {
          switch (rule.operator) {
            case '>':
              passed = actualValue > rule.threshold;
              break;
            case '<':
              passed = actualValue < rule.threshold;
              break;
            case '>=':
              passed = actualValue >= rule.threshold;
              break;
            case '<=':
              passed = actualValue <= rule.threshold;
              break;
            case '=':
              passed = actualValue === rule.threshold;
              break;
          }
        }
      }

      if (!passed) {
        return {
          passed: false,
          issue: {
            ruleId: rule.name,
            severity: rule.severity,
            message: `${rule.description}. Expected ${rule.operator} ${rule.threshold}, got ${actualValue}`,
            actualValue,
            expectedValue: rule.threshold,
            affectedRecords,
            timestamp: new Date(),
            tableAffected: this.getTableFromQuery(rule.query)
          }
        };
      }

      return { passed: true };

    } catch (error) {
      logger.error(`Rule evaluation failed for ${rule.name}:`, error);
      throw error;
    }
  }

  /**
   * Extract table name from SQL query
   */
  private getTableFromQuery(query: string): string {
    const match = query.match(/FROM `[^.]+\.[^.]+\.([^`]+)`/);
    return match ? match[1] : 'unknown';
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(passedRules: number, failedRules: number, issues: QualityIssue[]): number {
    if (passedRules + failedRules === 0) return 0;

    // Base score from passed rules
    let baseScore = (passedRules / (passedRules + failedRules)) * 100;

    // Penalize errors more than warnings
    const errorPenalty = issues.filter(i => i.severity === 'error').length * 10;
    const warningPenalty = issues.filter(i => i.severity === 'warning').length * 5;

    const finalScore = Math.max(0, baseScore - errorPenalty - warningPenalty);
    return Math.round(finalScore * 100) / 100;
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: QualityIssue[]): string[] {
    const recommendations: string[] = [];

    for (const issue of issues) {
      switch (issue.ruleId) {
        case 'sensor_data_completeness':
          recommendations.push('Review ETL process for data extraction completeness. Check TimescaleDB connection stability.');
          break;
        case 'data_freshness':
          recommendations.push('Verify real-time data pipeline is running. Check MQTT broker and data ingestion services.');
          break;
        case 'daily_volume_check':
          recommendations.push('Investigate potential data loss. Verify all machines are reporting and network connectivity is stable.');
          break;
        case 'sensor_data_duplicates':
          recommendations.push('Review extraction logic for duplicate prevention. Implement proper deduplication in ETL pipeline.');
          break;
        case 'machine_coverage':
          recommendations.push('Check individual machine connectivity. Some machines may be offline or experiencing network issues.');
          break;
        case 'feature_store_completeness':
          recommendations.push('Review feature engineering pipeline. Some features may not be computing correctly.');
          break;
        case 'sensor_value_ranges':
          recommendations.push('Investigate sensor calibration issues. Consider implementing automated sensor validation rules.');
          break;
        default:
          recommendations.push(`Address issue in ${issue.ruleId}: ${issue.message}`);
      }
    }

    // Remove duplicates and limit to top 10 recommendations
    return [...new Set(recommendations)].slice(0, 10);
  }

  /**
   * Create data quality monitoring dashboard query
   */
  async createMonitoringDashboard(): Promise<string> {
    const dashboardQuery = `
      CREATE OR REPLACE VIEW \`${this.projectId}.${this.datasetId}.data_quality_dashboard\` AS
      WITH quality_metrics AS (
        -- Data freshness
        SELECT 
          'freshness' as metric_type,
          TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(timestamp), HOUR) as metric_value,
          CASE WHEN TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(timestamp), HOUR) <= 2 THEN 'GOOD' ELSE 'POOR' END as status
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        
        UNION ALL
        
        -- Data volume (last 24h)
        SELECT 
          'volume_24h' as metric_type,
          COUNT(*) as metric_value,
          CASE WHEN COUNT(*) >= 100000 THEN 'GOOD' ELSE 'POOR' END as status
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        
        UNION ALL
        
        -- Completeness rate
        SELECT 
          'completeness' as metric_type,
          (COUNT(*) - COUNTIF(value IS NULL)) / COUNT(*) * 100 as metric_value,
          CASE WHEN (COUNT(*) - COUNTIF(value IS NULL)) / COUNT(*) >= 0.99 THEN 'GOOD' ELSE 'POOR' END as status
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
        
        UNION ALL
        
        -- Machine coverage
        SELECT 
          'machine_coverage' as metric_type,
          COUNT(DISTINCT machine_id) as metric_value,
          CASE WHEN COUNT(DISTINCT machine_id) >= 6 THEN 'GOOD' ELSE 'POOR' END as status
        FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
      )
      
      SELECT 
        metric_type,
        metric_value,
        status,
        CASE 
          WHEN status = 'GOOD' THEN '✅'
          WHEN status = 'POOR' THEN '❌'
          ELSE '⚠️'
        END as status_icon,
        CURRENT_TIMESTAMP() as last_updated
      FROM quality_metrics
      ORDER BY metric_type
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: dashboardQuery,
        location: 'US',
      });

      await job.promise();
      logger.info('Data quality monitoring dashboard created successfully');
      
      return `\`${this.projectId}.${this.datasetId}.data_quality_dashboard\``;

    } catch (error) {
      logger.error('Failed to create monitoring dashboard:', error);
      throw error;
    }
  }

  /**
   * Set up automated quality monitoring alerts
   */
  async setupQualityAlerts(): Promise<void> {
    logger.info('Setting up automated quality monitoring alerts...');
    
    // This would integrate with your alerting system (email, Slack, etc.)
    // For now, we'll create monitoring queries that can be scheduled
    
    const alertQueries = [
      {
        name: 'critical_data_quality_alert',
        description: 'Alert when critical data quality issues are detected',
        query: `
          SELECT 
            'CRITICAL_ALERT' as alert_type,
            CASE 
              WHEN hours_since_last_data > 2 THEN 'Data pipeline stopped - no data for ' || hours_since_last_data || ' hours'
              WHEN reporting_machines < 6 THEN 'Machine coverage low - only ' || reporting_machines || ' machines reporting'
              WHEN null_rate > 0.05 THEN 'High null value rate - ' || ROUND(null_rate * 100, 2) || '% null values'
              ELSE 'No critical issues detected'
            END as alert_message,
            CURRENT_TIMESTAMP() as alert_timestamp
          FROM (
            SELECT 
              TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(timestamp), HOUR) as hours_since_last_data,
              COUNT(DISTINCT CASE WHEN timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR) THEN machine_id END) as reporting_machines,
              COUNTIF(value IS NULL) / COUNT(*) as null_rate
            FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
            WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
          )
          WHERE hours_since_last_data > 2 OR reporting_machines < 6 OR null_rate > 0.05
        `
      }
    ];

    for (const alertQuery of alertQueries) {
      try {
        // In production, you would schedule these queries to run periodically
        // and send alerts via your preferred notification system
        logger.info(`Alert query created: ${alertQuery.name}`);
      } catch (error) {
        logger.error(`Failed to create alert query ${alertQuery.name}:`, error);
      }
    }
  }

  /**
   * Get quick quality status
   */
  async getQuickStatus(): Promise<any> {
    const statusQuery = `
      SELECT 
        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), MAX(timestamp), MINUTE) as minutes_since_last_data,
        COUNT(DISTINCT machine_id) as active_machines,
        COUNT(*) as records_last_hour,
        ROUND(COUNTIF(value IS NOT NULL) / COUNT(*) * 100, 2) as completeness_percent
      FROM \`${this.projectId}.${this.datasetId}.sensor_data\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
    `;

    try {
      const [job] = await this.bigquery.createQueryJob({
        query: statusQuery,
        location: 'US',
      });

      const [rows] = await job.getQueryResults();
      return rows[0] || {};

    } catch (error) {
      logger.error('Failed to get quick status:', error);
      return {};
    }
  }
}

export default DataQualityMonitor;