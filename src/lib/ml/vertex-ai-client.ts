/**
 * Vertex AI Client for Predictive Maintenance
 * Production-ready client for relay assembly manufacturing intelligence
 */

import { GoogleAuth } from 'google-auth-library';
import { BigQuery } from '@google-cloud/bigquery';

interface PredictionRequest {
  machineId: string;
  sensorData: SensorReading[];
  predictionType: 'failure' | 'rul' | 'anomaly' | 'quality';
}

interface SensorReading {
  timestamp: Date;
  sensor_type: string;
  value: number;
  machine_id: string;
}

interface PredictionResponse {
  machine_id: string;
  prediction_type: string;
  failure_probability?: number;
  remaining_useful_life_days?: number;
  anomaly_score?: number;
  quality_score?: number;
  confidence: number;
  critical_sensors: string[];
  recommendations: string[];
  model_version: string;
  prediction_timestamp: Date;
}

interface MLModelEndpoints {
  failure_prediction: string;
  rul_regression: string;
  anomaly_detection: string;
  quality_prediction: string;
}

class VertexAIClient {
  private auth: GoogleAuth;
  private bigQuery: BigQuery;
  private projectId: string;
  private region: string;
  private endpoints: MLModelEndpoints;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT!;
    this.region = process.env.VERTEX_AI_REGION || 'us-central1';
    
    this.auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    this.bigQuery = new BigQuery({ 
      projectId: this.projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    // Vertex AI Model Endpoints
    this.endpoints = {
      failure_prediction: `projects/${this.projectId}/locations/${this.region}/endpoints/failure-prediction-v1`,
      rul_regression: `projects/${this.projectId}/locations/${this.region}/endpoints/rul-regression-v1`,
      anomaly_detection: `projects/${this.projectId}/locations/${this.region}/endpoints/anomaly-detection-v1`,
      quality_prediction: `projects/${this.projectId}/locations/${this.region}/endpoints/quality-prediction-v1`
    };
  }

  /**
   * Get comprehensive machine health prediction
   */
  async getPredictions(request: PredictionRequest): Promise<PredictionResponse[]> {
    try {
      // 1. Feature engineering from raw sensor data
      const features = await this.engineerFeatures(request.sensorData);
      
      // 2. Run predictions based on type
      const predictions = await Promise.all([
        this.predictFailure(request.machineId, features),
        this.predictRUL(request.machineId, features),
        this.detectAnomalies(request.machineId, features)
      ]);

      return predictions.filter(p => p !== null) as PredictionResponse[];
      
    } catch (error) {
      console.error('ML prediction error:', error);
      throw new Error(`Prediction service failed: ${error}`);
    }
  }

  /**
   * Feature engineering pipeline for manufacturing data
   */
  private async engineerFeatures(sensorData: SensorReading[]) {
    const features: Record<string, any> = {};
    
    // Group data by sensor type
    const sensorGroups = sensorData.reduce((acc, reading) => {
      if (!acc[reading.sensor_type]) acc[reading.sensor_type] = [];
      acc[reading.sensor_type].push(reading);
      return acc;
    }, {} as Record<string, SensorReading[]>);

    // Statistical features for each sensor
    for (const [sensorType, readings] of Object.entries(sensorGroups)) {
      const values = readings.map(r => r.value);
      
      features[`${sensorType}_mean`] = this.mean(values);
      features[`${sensorType}_std`] = this.standardDeviation(values);
      features[`${sensorType}_min`] = Math.min(...values);
      features[`${sensorType}_max`] = Math.max(...values);
      features[`${sensorType}_range`] = Math.max(...values) - Math.min(...values);
      
      // Trend analysis
      if (values.length >= 10) {
        features[`${sensorType}_trend`] = this.calculateTrend(values);
        features[`${sensorType}_volatility`] = this.calculateVolatility(values);
      }
    }

    // Cross-sensor correlation features
    features['temp_vibration_ratio'] = this.safeDivision(
      features['bearing_temperature_mean'] || 0,
      features['vibration_magnitude_mean'] || 1
    );
    
    features['hydraulic_efficiency'] = this.safeDivision(
      features['hydraulic_pressure_mean'] || 0,
      features['cycle_time_mean'] || 1
    );

    // Manufacturing cycle features
    if (sensorGroups['cycle_count']) {
      features['cycle_consistency'] = this.calculateCycleConsistency(sensorGroups);
    }

    return features;
  }

  /**
   * Failure prediction using AutoML model
   */
  private async predictFailure(machineId: string, features: Record<string, any>): Promise<PredictionResponse | null> {
    try {
      const client = await this.auth.getClient();
      const url = `https://${this.region}-aiplatform.googleapis.com/v1/${this.endpoints.failure_prediction}:predict`;
      
      const instance = {
        machine_id: machineId,
        ...features
      };

      const response = await client.request({
        url,
        method: 'POST',
        data: {
          instances: [instance]
        }
      });

      const prediction = response.data.predictions[0];
      
      return {
        machine_id: machineId,
        prediction_type: 'failure',
        failure_probability: prediction.scores[1], // Binary classification score
        confidence: Math.max(...prediction.scores),
        critical_sensors: this.extractCriticalFeatures(prediction.explanations),
        recommendations: this.generateFailureRecommendations(prediction.scores[1]),
        model_version: 'failure-prediction-v1',
        prediction_timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Failure prediction error:', error);
      return null;
    }
  }

  /**
   * Remaining Useful Life prediction using custom LSTM model
   */
  private async predictRUL(machineId: string, features: Record<string, any>): Promise<PredictionResponse | null> {
    try {
      const client = await this.auth.getClient();
      const url = `https://${this.region}-aiplatform.googleapis.com/v1/${this.endpoints.rul_regression}:predict`;
      
      // Prepare sequence data for LSTM (last 168 hours = 1 week)
      const sequenceData = await this.prepareSequenceData(machineId, 168);
      
      const response = await client.request({
        url,
        method: 'POST',
        data: {
          instances: [{
            sequence_data: sequenceData,
            current_features: features
          }]
        }
      });

      const prediction = response.data.predictions[0];
      
      return {
        machine_id: machineId,
        prediction_type: 'rul',
        remaining_useful_life_days: Math.round(prediction.rul_days),
        confidence: prediction.confidence,
        critical_sensors: this.extractCriticalFeatures(prediction.explanations),
        recommendations: this.generateRULRecommendations(prediction.rul_days),
        model_version: 'rul-regression-v1',
        prediction_timestamp: new Date()
      };
      
    } catch (error) {
      console.error('RUL prediction error:', error);
      return null;
    }
  }

  /**
   * Anomaly detection for real-time quality control
   */
  private async detectAnomalies(machineId: string, features: Record<string, any>): Promise<PredictionResponse | null> {
    try {
      const client = await this.auth.getClient();
      const url = `https://${this.region}-aiplatform.googleapis.com/v1/${this.endpoints.anomaly_detection}:predict`;
      
      const response = await client.request({
        url,
        method: 'POST',
        data: {
          instances: [features]
        }
      });

      const prediction = response.data.predictions[0];
      
      return {
        machine_id: machineId,
        prediction_type: 'anomaly',
        anomaly_score: prediction.anomaly_score,
        confidence: prediction.confidence,
        critical_sensors: prediction.anomalous_features || [],
        recommendations: this.generateAnomalyRecommendations(prediction.anomaly_score),
        model_version: 'anomaly-detection-v1',
        prediction_timestamp: new Date()
      };
      
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return null;
    }
  }

  /**
   * Prepare sequence data for LSTM models
   */
  private async prepareSequenceData(machineId: string, sequenceLength: number) {
    const query = `
      WITH sensor_sequences AS (
        SELECT 
          timestamp,
          sensor_type,
          value,
          ROW_NUMBER() OVER (PARTITION BY sensor_type ORDER BY timestamp DESC) as rn
        FROM \`${this.projectId}.relay_manufacturing.sensor_readings\`
        WHERE machine_id = '${machineId}'
          AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${sequenceLength} HOUR)
      )
      SELECT 
        timestamp,
        sensor_type,
        value
      FROM sensor_sequences 
      WHERE rn <= ${sequenceLength}
      ORDER BY timestamp ASC
    `;

    const [rows] = await this.bigQuery.query(query);
    
    // Pivot data for sequence format
    const sequences: Record<string, number[]> = {};
    const timestamps: Date[] = [];
    
    for (const row of rows) {
      if (!sequences[row.sensor_type]) {
        sequences[row.sensor_type] = [];
      }
      sequences[row.sensor_type].push(row.value);
      
      if (timestamps.length === 0 || row.timestamp > timestamps[timestamps.length - 1]) {
        timestamps.push(row.timestamp);
      }
    }

    return sequences;
  }

  /**
   * Utility functions for feature engineering
   */
  private mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squaredDiffs));
  }

  private calculateTrend(values: number[]): number {
    // Simple linear trend calculation
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const xMean = this.mean(x);
    const yMean = this.mean(values);
    
    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      if (values[i - 1] !== 0) {
        returns.push((values[i] - values[i - 1]) / Math.abs(values[i - 1]));
      }
    }
    
    return returns.length > 0 ? this.standardDeviation(returns) : 0;
  }

  private calculateCycleConsistency(sensorGroups: Record<string, SensorReading[]>): number {
    // Analyze cycle-to-cycle variation
    const cycleData = sensorGroups['cycle_time'] || [];
    if (cycleData.length < 2) return 1.0; // Perfect consistency if no data
    
    const cycleTimes = cycleData.map(r => r.value);
    const mean = this.mean(cycleTimes);
    const std = this.standardDeviation(cycleTimes);
    
    // Coefficient of variation (inverted for consistency score)
    return mean === 0 ? 1.0 : Math.max(0, 1 - (std / Math.abs(mean)));
  }

  private safeDivision(numerator: number, denominator: number): number {
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private extractCriticalFeatures(explanations: any): string[] {
    if (!explanations || !explanations.feature_attributions) return [];
    
    return explanations.feature_attributions
      .sort((a: any, b: any) => Math.abs(b.attribution) - Math.abs(a.attribution))
      .slice(0, 5)
      .map((attr: any) => attr.feature_name);
  }

  private generateFailureRecommendations(failureProbability: number): string[] {
    const recommendations = [];
    
    if (failureProbability > 0.8) {
      recommendations.push('CRITICAL: Schedule immediate maintenance inspection');
      recommendations.push('Contact maintenance team for emergency assessment');
    } else if (failureProbability > 0.6) {
      recommendations.push('Schedule maintenance within 48 hours');
      recommendations.push('Monitor critical sensors continuously');
    } else if (failureProbability > 0.4) {
      recommendations.push('Plan maintenance within next week');
      recommendations.push('Increase monitoring frequency');
    }
    
    return recommendations;
  }

  private generateRULRecommendations(rulDays: number): string[] {
    const recommendations = [];
    
    if (rulDays < 7) {
      recommendations.push('URGENT: Schedule maintenance within 3 days');
      recommendations.push('Prepare replacement parts');
    } else if (rulDays < 14) {
      recommendations.push('Schedule maintenance within 1 week');
      recommendations.push('Order spare parts if needed');
    } else if (rulDays < 28) {
      recommendations.push('Plan maintenance within 2 weeks');
      recommendations.push('Monitor degradation trends');
    }
    
    return recommendations;
  }

  private generateAnomalyRecommendations(anomalyScore: number): string[] {
    const recommendations = [];
    
    if (anomalyScore > 0.8) {
      recommendations.push('ALERT: Significant process deviation detected');
      recommendations.push('Check product quality immediately');
    } else if (anomalyScore > 0.6) {
      recommendations.push('Investigate process parameters');
      recommendations.push('Consider recalibration');
    }
    
    return recommendations;
  }
}

export default VertexAIClient;