/**
 * Contact Welder Data Preparation Pipeline
 * Specialized pipeline for preparing Contact Welder sensor data for ML training
 * Integrates with existing BigQuery infrastructure and handles the 20.7M records
 */

import { BigQuery } from '@google-cloud/bigquery';
import { ContactWelderFeatureEngineer } from './contact-welder-features';
import type { ContactWelderReading, ContactWelderFeatures } from './contact-welder-features';

interface DataPreparationConfig {
  projectId: string;
  datasetId: string;
  tableId: string;
  trainingDataRatio: number;         // 0.7 = 70% for training
  validationDataRatio: number;       // 0.2 = 20% for validation
  testDataRatio: number;             // 0.1 = 10% for testing
  featureWindowHours: number;        // Hours of data for each feature calculation
  predictionHorizonDays: number;     // Days ahead to predict failures
  minSamplesPerMachine: number;      // Minimum samples required per machine
}

interface TrainingDataset {
  features: ContactWelderFeatures[];
  labels: FailureLabel[];
  metadata: DatasetMetadata;
}

interface FailureLabel {
  machine_id: string;
  timestamp: Date;
  failure_within_prediction_window: boolean;
  days_to_failure: number | null;
  failure_type: string | null;
  confidence: number;
}

interface DatasetMetadata {
  totalRecords: number;
  machineCount: number;
  timeRange: { start: Date; end: Date };
  sensorCoverage: Record<string, number>;
  qualityMetrics: {
    completeness: number;
    consistency: number;
    accuracy: number;
  };
}

interface DataQualityReport {
  sensorType: string;
  recordCount: number;
  missingDataPercentage: number;
  outlierPercentage: number;
  qualityScore: number;
  recommendedActions: string[];
}

export class ContactWelderDataPipeline {
  private bigQuery: BigQuery;
  private featureEngineer: ContactWelderFeatureEngineer;
  private config: DataPreparationConfig;

  constructor(config?: Partial<DataPreparationConfig>) {
    this.bigQuery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    this.featureEngineer = new ContactWelderFeatureEngineer();

    this.config = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'uns-smart-maintenance-ml',
      datasetId: 'relay_manufacturing',
      tableId: 'sensor_readings',
      trainingDataRatio: 0.7,
      validationDataRatio: 0.2,
      testDataRatio: 0.1,
      featureWindowHours: 168, // 1 week
      predictionHorizonDays: 21, // 3 weeks ahead
      minSamplesPerMachine: 1000,
      ...config
    };
  }

  /**
   * Prepare complete training dataset for Contact Welder failure prediction
   */
  async prepareTrainingDataset(): Promise<TrainingDataset> {
    console.log('🔄 Starting Contact Welder training dataset preparation...');
    
    // Step 1: Analyze data quality
    const qualityReport = await this.analyzeDataQuality();
    console.log('📊 Data quality analysis complete:', qualityReport);

    // Step 2: Extract and prepare sensor data
    const machineIds = await this.getAvailableMachines();
    console.log(`🏭 Found ${machineIds.length} machines with Contact Welder data`);

    const features: ContactWelderFeatures[] = [];
    const labels: FailureLabel[] = [];

    // Step 3: Process each machine's data
    for (const machineId of machineIds) {
      console.log(`⚙️ Processing machine: ${machineId}`);
      
      const machineData = await this.extractMachineData(machineId);
      if (machineData.length < this.config.minSamplesPerMachine) {
        console.log(`⚠️ Skipping ${machineId}: insufficient data (${machineData.length} samples)`);
        continue;
      }

      const machineFeatures = await this.generateFeaturesForMachine(machineId, machineData);
      const machineLabels = await this.generateLabelsForMachine(machineId, machineData);

      features.push(...machineFeatures);
      labels.push(...machineLabels);
    }

    // Step 4: Create dataset metadata
    const metadata = await this.generateDatasetMetadata(features, labels);

    console.log(`✅ Dataset preparation complete: ${features.length} feature sets, ${labels.length} labels`);

    return { features, labels, metadata };
  }

  /**
   * Analyze data quality across all Contact Welder sensors
   */
  async analyzeDataQuality(): Promise<DataQualityReport[]> {
    const sensorTypes = ['contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature'];
    const reports: DataQualityReport[] = [];

    for (const sensorType of sensorTypes) {
      const query = `
        WITH sensor_stats AS (
          SELECT 
            COUNT(*) as total_records,
            COUNT(value) as non_null_records,
            AVG(value) as mean_value,
            STDDEV(value) as std_value,
            MIN(value) as min_value,
            MAX(value) as max_value,
            APPROX_QUANTILES(value, 100)[OFFSET(25)] as q25,
            APPROX_QUANTILES(value, 100)[OFFSET(75)] as q75
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
          WHERE machine_id LIKE '%contact_welder%' 
            AND sensor_type = '${sensorType}'
        ),
        outlier_stats AS (
          SELECT 
            COUNT(*) as outlier_count
          FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
          WHERE machine_id LIKE '%contact_welder%' 
            AND sensor_type = '${sensorType}'
            AND (value < (SELECT q25 - 1.5 * (q75 - q25) FROM sensor_stats)
                 OR value > (SELECT q75 + 1.5 * (q75 - q25) FROM sensor_stats))
        )
        SELECT 
          s.total_records,
          s.non_null_records,
          s.mean_value,
          s.std_value,
          s.min_value,
          s.max_value,
          o.outlier_count,
          SAFE_DIVIDE(s.non_null_records, s.total_records) as completeness,
          SAFE_DIVIDE(o.outlier_count, s.total_records) as outlier_ratio
        FROM sensor_stats s
        CROSS JOIN outlier_stats o
      `;

      const [rows] = await this.bigQuery.query(query);
      const stats = rows[0];

      if (stats) {
        const missingDataPercentage = ((stats.total_records - stats.non_null_records) / stats.total_records) * 100;
        const outlierPercentage = (stats.outlier_count / stats.total_records) * 100;
        
        // Calculate quality score (0-100)
        const completenessScore = stats.completeness * 100;
        const outlierScore = Math.max(0, 100 - outlierPercentage * 2);
        const qualityScore = (completenessScore + outlierScore) / 2;

        const recommendedActions = [];
        if (missingDataPercentage > 5) {
          recommendedActions.push('Address missing data through interpolation or sensor maintenance');
        }
        if (outlierPercentage > 10) {
          recommendedActions.push('Investigate and clean outlier values');
        }
        if (qualityScore < 80) {
          recommendedActions.push('Overall data quality requires improvement before ML training');
        }

        reports.push({
          sensorType,
          recordCount: stats.total_records,
          missingDataPercentage,
          outlierPercentage,
          qualityScore,
          recommendedActions
        });
      }
    }

    return reports;
  }

  /**
   * Get all available Contact Welder machine IDs
   */
  async getAvailableMachines(): Promise<string[]> {
    const query = `
      SELECT DISTINCT machine_id
      FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
      WHERE machine_id LIKE '%contact_welder%'
        AND sensor_type IN ('contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature')
      HAVING COUNT(*) >= ${this.config.minSamplesPerMachine}
      ORDER BY machine_id
    `;

    const [rows] = await this.bigQuery.query(query);
    return rows.map(row => row.machine_id);
  }

  /**
   * Extract sensor data for a specific machine
   */
  async extractMachineData(machineId: string): Promise<ContactWelderReading[]> {
    const query = `
      SELECT 
        timestamp,
        machine_id,
        sensor_type,
        value,
        quality_code,
        unit,
        location_path
      FROM \`${this.config.projectId}.${this.config.datasetId}.${this.config.tableId}\`
      WHERE machine_id = '${machineId}'
        AND sensor_type IN ('contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature')
        AND value IS NOT NULL
        AND quality_code = 0  -- Only good quality data
      ORDER BY timestamp ASC
    `;

    const [rows] = await this.bigQuery.query(query);
    
    return rows.map(row => ({
      timestamp: new Date(row.timestamp.value),
      machine_id: row.machine_id,
      sensor_type: row.sensor_type as any,
      value: parseFloat(row.value),
      quality_code: row.quality_code,
      unit: row.unit || '',
      location_path: row.location_path || ''
    }));
  }

  /**
   * Generate features for a machine using sliding windows
   */
  async generateFeaturesForMachine(
    machineId: string, 
    sensorData: ContactWelderReading[]
  ): Promise<ContactWelderFeatures[]> {
    const features: ContactWelderFeatures[] = [];
    const windowSize = this.config.featureWindowHours;
    
    // Sort data by timestamp
    sensorData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Generate features using sliding window approach
    for (let i = windowSize; i < sensorData.length; i += 24) { // Step by 24 hours
      const windowData = sensorData.slice(i - windowSize, i);
      
      try {
        const machineFeatures = await this.featureEngineer.generateContactWelderFeatures(
          machineId,
          windowData,
          windowSize
        );
        
        // Add metadata
        (machineFeatures as any).machine_id = machineId;
        (machineFeatures as any).timestamp = sensorData[i].timestamp;
        (machineFeatures as any).window_start = sensorData[i - windowSize].timestamp;
        (machineFeatures as any).window_end = sensorData[i].timestamp;
        
        features.push(machineFeatures);
      } catch (error) {
        console.error(`Error generating features for ${machineId} at index ${i}:`, error);
      }
    }

    return features;
  }

  /**
   * Generate failure labels for a machine
   */
  async generateLabelsForMachine(
    machineId: string,
    sensorData: ContactWelderReading[]
  ): Promise<FailureLabel[]> {
    const labels: FailureLabel[] = [];
    
    // Detect failure events using resistance thresholds and patterns
    const resistanceReadings = sensorData.filter(r => r.sensor_type === 'contact_resistance');
    const failureEvents = await this.detectFailureEvents(resistanceReadings);
    
    // Generate labels for each time point
    for (let i = 0; i < resistanceReadings.length; i += 24) { // Daily labels
      const currentTime = resistanceReadings[i].timestamp;
      
      // Check if failure occurs within prediction horizon
      const futureFailures = failureEvents.filter(event => {
        const timeDiff = event.timestamp.getTime() - currentTime.getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        return daysDiff > 0 && daysDiff <= this.config.predictionHorizonDays;
      });

      const nearestFailure = futureFailures.length > 0 ? futureFailures[0] : null;
      
      labels.push({
        machine_id: machineId,
        timestamp: currentTime,
        failure_within_prediction_window: futureFailures.length > 0,
        days_to_failure: nearestFailure ? 
          Math.ceil((nearestFailure.timestamp.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24)) : 
          null,
        failure_type: nearestFailure?.type || null,
        confidence: nearestFailure?.confidence || 1.0
      });
    }

    return labels;
  }

  /**
   * Detect failure events in resistance data
   */
  private async detectFailureEvents(resistanceReadings: ContactWelderReading[]): Promise<Array<{
    timestamp: Date;
    type: string;
    confidence: number;
  }>> {
    const failureEvents = [];
    const values = resistanceReadings.map(r => r.value);
    const FAILURE_THRESHOLD = 5.0; // mOhms
    
    // Simple threshold-based failure detection
    for (let i = 24; i < values.length; i++) { // Look ahead 24 readings
      const recentValues = values.slice(i - 24, i);
      const currentValue = values[i];
      const trend = this.calculateTrend(recentValues);
      
      if (currentValue > FAILURE_THRESHOLD && trend > 0.1) {
        failureEvents.push({
          timestamp: resistanceReadings[i].timestamp,
          type: 'resistance_degradation',
          confidence: Math.min(1.0, currentValue / FAILURE_THRESHOLD)
        });
      }
    }

    return failureEvents;
  }

  /**
   * Generate dataset metadata
   */
  private async generateDatasetMetadata(
    features: ContactWelderFeatures[],
    labels: FailureLabel[]
  ): Promise<DatasetMetadata> {
    const machineIds = new Set(labels.map(l => l.machine_id));
    const timestamps = labels.map(l => l.timestamp);
    
    return {
      totalRecords: features.length,
      machineCount: machineIds.size,
      timeRange: {
        start: new Date(Math.min(...timestamps.map(t => t.getTime()))),
        end: new Date(Math.max(...timestamps.map(t => t.getTime())))
      },
      sensorCoverage: {
        contact_resistance: labels.length,
        weld_current: labels.length,
        weld_voltage: labels.length,
        mold_temperature: labels.length
      },
      qualityMetrics: {
        completeness: 0.95, // TODO: Calculate actual completeness
        consistency: 0.90,  // TODO: Calculate actual consistency
        accuracy: 0.88      // TODO: Calculate actual accuracy
      }
    };
  }

  /**
   * Split dataset into training, validation, and test sets
   */
  splitDataset(dataset: TrainingDataset): {
    training: TrainingDataset;
    validation: TrainingDataset;
    test: TrainingDataset;
  } {
    const totalRecords = dataset.features.length;
    const trainSize = Math.floor(totalRecords * this.config.trainingDataRatio);
    const valSize = Math.floor(totalRecords * this.config.validationDataRatio);
    
    // Shuffle data to ensure random distribution
    const indices = Array.from({ length: totalRecords }, (_, i) => i);
    this.shuffleArray(indices);
    
    const trainIndices = indices.slice(0, trainSize);
    const valIndices = indices.slice(trainSize, trainSize + valSize);
    const testIndices = indices.slice(trainSize + valSize);
    
    return {
      training: this.createSubset(dataset, trainIndices),
      validation: this.createSubset(dataset, valIndices),
      test: this.createSubset(dataset, testIndices)
    };
  }

  /**
   * Export prepared dataset to BigQuery for ML training
   */
  async exportToMLDataset(
    dataset: TrainingDataset,
    datasetSuffix: string = 'training'
  ): Promise<string> {
    const tableName = `contact_welder_ml_${datasetSuffix}`;
    const tableId = `${this.config.projectId}.${this.config.datasetId}.${tableName}`;
    
    console.log(`📤 Exporting ${dataset.features.length} records to ${tableName}...`);
    
    // Create table schema
    const schema = [
      { name: 'machine_id', type: 'STRING' },
      { name: 'timestamp', type: 'TIMESTAMP' },
      { name: 'resistance_degradation_index', type: 'FLOAT' },
      { name: 'electrical_health_score', type: 'FLOAT' },
      { name: 'thermal_stress_index', type: 'FLOAT' },
      { name: 'process_stability_score', type: 'FLOAT' },
      { name: 'weld_quality_trend', type: 'FLOAT' },
      { name: 'power_efficiency_index', type: 'FLOAT' },
      { name: 'thermal_electrical_coupling', type: 'FLOAT' },
      { name: 'failure_risk_score', type: 'FLOAT' },
      { name: 'resistance_drift_rate', type: 'FLOAT' },
      { name: 'temperature_cycling_stress', type: 'FLOAT' },
      { name: 'current_consistency_index', type: 'FLOAT' },
      { name: 'voltage_stability_factor', type: 'FLOAT' },
      { name: 'remaining_useful_cycles', type: 'FLOAT' },
      { name: 'degradation_acceleration', type: 'FLOAT' },
      { name: 'critical_threshold_proximity', type: 'FLOAT' },
      { name: 'maintenance_urgency_score', type: 'FLOAT' },
      { name: 'failure_within_window', type: 'BOOLEAN' },
      { name: 'days_to_failure', type: 'INTEGER' }
    ];
    
    // Prepare data for insertion
    const rows = dataset.features.map((feature, index) => ({
      machine_id: (feature as any).machine_id,
      timestamp: (feature as any).timestamp,
      ...feature,
      failure_within_window: dataset.labels[index]?.failure_within_prediction_window || false,
      days_to_failure: dataset.labels[index]?.days_to_failure || null
    }));
    
    // Insert data
    const [table] = await this.bigQuery.dataset(this.config.datasetId).table(tableName).get({ autoCreate: true });
    await table.setMetadata({ schema });
    await table.insert(rows);
    
    console.log(`✅ Export complete: ${rows.length} records in ${tableName}`);
    return tableId;
  }

  // Utility methods
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = values.reduce((sum, val) => sum + val, 0) / n;
    
    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  private createSubset(dataset: TrainingDataset, indices: number[]): TrainingDataset {
    return {
      features: indices.map(i => dataset.features[i]),
      labels: indices.map(i => dataset.labels[i]),
      metadata: {
        ...dataset.metadata,
        totalRecords: indices.length
      }
    };
  }
}

export default ContactWelderDataPipeline;