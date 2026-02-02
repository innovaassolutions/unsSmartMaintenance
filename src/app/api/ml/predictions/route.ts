/**
 * ML Predictions API Route
 * Real-time predictive maintenance endpoint for dashboard integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';
import VertexAIClient from '@/lib/ml/vertex-ai-client';
import { FeatureEngineer } from '@/lib/ml/feature-engineering';

export const dynamic = 'force-dynamic';

interface MLPredictionRequest {
  machine_id?: string;
  prediction_types?: ('failure' | 'rul' | 'anomaly' | 'quality')[];
  time_horizon_hours?: number;
}

interface MLPredictionResponse {
  machine_id: string;
  predictions: {
    failure_probability: number;
    remaining_useful_life_days: number;
    anomaly_score: number;
    quality_score: number;
    overall_health: number;
  };
  alerts: {
    critical: string[];
    warnings: string[];
    maintenance_required: boolean;
  };
  recommendations: string[];
  critical_sensors: string[];
  confidence_scores: Record<string, number>;
  feature_importance: Record<string, number>;
  prediction_metadata: {
    model_versions: Record<string, string>;
    prediction_timestamp: string;
    data_freshness_minutes: number;
  };
}

const bigQuery = new BigQuery({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const vertexClient = new VertexAIClient();
const featureEngineer = new FeatureEngineer();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const machineId = searchParams.get('machine_id');
  const predictionTypesParam = searchParams.get('prediction_types');
  const timeHorizonParam = searchParams.get('time_horizon_hours');
  
  const predictionTypes = predictionTypesParam 
    ? predictionTypesParam.split(',') as ('failure' | 'rul' | 'anomaly' | 'quality')[]
    : ['failure', 'rul', 'anomaly'];
    
  const timeHorizonHours = timeHorizonParam ? parseInt(timeHorizonParam) : 168; // 1 week default

  try {
    if (machineId) {
      // Single machine prediction
      const prediction = await getPredictionForMachine(machineId, predictionTypes, timeHorizonHours);
      return NextResponse.json(prediction);
    } else {
      // All machines prediction
      const allPredictions = await getPredictionsForAllMachines(predictionTypes, timeHorizonHours);
      return NextResponse.json({ predictions: allPredictions });
    }
    
  } catch (error) {
    console.error('ML Prediction API Error:', error);
    return NextResponse.json(
      { 
        error: 'ML prediction service unavailable', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: MLPredictionRequest = await request.json();
    
    const {
      machine_id,
      prediction_types = ['failure', 'rul', 'anomaly'],
      time_horizon_hours = 168
    } = body;

    if (!machine_id) {
      return NextResponse.json(
        { error: 'machine_id is required' },
        { status: 400 }
      );
    }

    const prediction = await getPredictionForMachine(
      machine_id, 
      prediction_types, 
      time_horizon_hours
    );
    
    return NextResponse.json(prediction);
    
  } catch (error) {
    console.error('ML Prediction POST Error:', error);
    return NextResponse.json(
      { error: 'Invalid request format or ML service error' },
      { status: 400 }
    );
  }
}

async function getPredictionForMachine(
  machineId: string,
  predictionTypes: ('failure' | 'rul' | 'anomaly' | 'quality')[],
  timeHorizonHours: number
): Promise<MLPredictionResponse> {
  
  // 1. Fetch recent sensor data from BigQuery
  const sensorData = await fetchSensorData(machineId, timeHorizonHours);
  
  // 2. Check data freshness
  const dataFreshness = calculateDataFreshness(sensorData);
  
  if (dataFreshness > 60) { // Data older than 1 hour
    console.warn(`Stale data detected for machine ${machineId}: ${dataFreshness} minutes old`);
  }

  // 3. Generate ML features
  const features = await featureEngineer.generateFeatures(machineId, sensorData);
  
  // 4. Get ML predictions from Vertex AI
  const predictions = await vertexClient.getPredictions({
    machineId,
    sensorData,
    predictionType: 'failure' // Will handle multiple types internally
  });

  // 5. Aggregate and format response
  const aggregatedPrediction = aggregatePredictions(predictions);
  
  // 6. Generate alerts and recommendations
  const alerts = generateAlerts(aggregatedPrediction);
  const recommendations = generateRecommendations(aggregatedPrediction, features);

  return {
    machine_id: machineId,
    predictions: {
      failure_probability: aggregatedPrediction.failure_probability || 0,
      remaining_useful_life_days: aggregatedPrediction.remaining_useful_life_days || 0,
      anomaly_score: aggregatedPrediction.anomaly_score || 0,
      quality_score: aggregatedPrediction.quality_score || 1,
      overall_health: calculateOverallHealth(aggregatedPrediction)
    },
    alerts,
    recommendations,
    critical_sensors: aggregatedPrediction.critical_sensors || [],
    confidence_scores: extractConfidenceScores(predictions),
    feature_importance: extractFeatureImportance(features),
    prediction_metadata: {
      model_versions: extractModelVersions(predictions),
      prediction_timestamp: new Date().toISOString(),
      data_freshness_minutes: dataFreshness
    }
  };
}

async function getPredictionsForAllMachines(
  predictionTypes: ('failure' | 'rul' | 'anomaly' | 'quality')[],
  timeHorizonHours: number
): Promise<MLPredictionResponse[]> {
  
  // Get list of active machines
  const activeMachines = await getActiveMachines();
  
  // Get predictions for all machines in parallel
  const predictionPromises = activeMachines.map(machineId =>
    getPredictionForMachine(machineId, predictionTypes, timeHorizonHours)
      .catch(error => {
        console.error(`Prediction failed for machine ${machineId}:`, error);
        return null;
      })
  );
  
  const predictions = await Promise.all(predictionPromises);
  
  // Filter out failed predictions
  return predictions.filter((prediction): prediction is MLPredictionResponse => 
    prediction !== null
  );
}

async function fetchSensorData(machineId: string, timeHorizonHours: number) {
  const query = `
    SELECT 
      timestamp,
      machine_id,
      sensor_type,
      value
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.relay_manufacturing.sensor_readings\`
    WHERE 
      machine_id = '${machineId}'
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${timeHorizonHours} HOUR)
      AND value IS NOT NULL
    ORDER BY timestamp DESC
    LIMIT 10000
  `;

  const [rows] = await bigQuery.query(query);
  
  return rows.map(row => ({
    timestamp: new Date(row.timestamp),
    machine_id: row.machine_id,
    sensor_type: row.sensor_type,
    value: parseFloat(row.value)
  }));
}

async function getActiveMachines(): Promise<string[]> {
  const query = `
    SELECT DISTINCT machine_id
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.relay_manufacturing.sensor_readings\`
    WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
    ORDER BY machine_id
  `;

  const [rows] = await bigQuery.query(query);
  return rows.map(row => row.machine_id);
}

function calculateDataFreshness(sensorData: any[]): number {
  if (sensorData.length === 0) return Infinity;
  
  const latestTimestamp = Math.max(...sensorData.map(d => d.timestamp.getTime()));
  const now = Date.now();
  
  return Math.round((now - latestTimestamp) / (1000 * 60)); // Minutes
}

function aggregatePredictions(predictions: any[]) {
  const aggregated: any = {};
  
  for (const prediction of predictions) {
    if (prediction.failure_probability !== undefined) {
      aggregated.failure_probability = prediction.failure_probability;
    }
    if (prediction.remaining_useful_life_days !== undefined) {
      aggregated.remaining_useful_life_days = prediction.remaining_useful_life_days;
    }
    if (prediction.anomaly_score !== undefined) {
      aggregated.anomaly_score = prediction.anomaly_score;
    }
    
    // Combine critical sensors
    if (prediction.critical_sensors) {
      aggregated.critical_sensors = [
        ...(aggregated.critical_sensors || []),
        ...prediction.critical_sensors
      ];
    }
  }
  
  // Remove duplicates from critical sensors
  if (aggregated.critical_sensors) {
    aggregated.critical_sensors = [...new Set(aggregated.critical_sensors)];
  }
  
  return aggregated;
}

function generateAlerts(prediction: any) {
  const alerts = {
    critical: [] as string[],
    warnings: [] as string[],
    maintenance_required: false
  };

  // Critical alerts (immediate action required)
  if (prediction.failure_probability > 0.8) {
    alerts.critical.push('CRITICAL: High failure probability detected - immediate maintenance required');
    alerts.maintenance_required = true;
  }
  
  if (prediction.remaining_useful_life_days && prediction.remaining_useful_life_days < 3) {
    alerts.critical.push('CRITICAL: Equipment failure predicted within 72 hours');
    alerts.maintenance_required = true;
  }
  
  if (prediction.anomaly_score > 0.9) {
    alerts.critical.push('CRITICAL: Severe process anomaly detected - check product quality');
  }

  // Warning alerts (plan maintenance)
  if (prediction.failure_probability > 0.6) {
    alerts.warnings.push('WARNING: Elevated failure risk - schedule maintenance within 48 hours');
  }
  
  if (prediction.remaining_useful_life_days && prediction.remaining_useful_life_days < 14) {
    alerts.warnings.push('WARNING: Equipment maintenance recommended within 2 weeks');
  }
  
  if (prediction.anomaly_score > 0.7) {
    alerts.warnings.push('WARNING: Process deviation detected - monitor closely');
  }

  return alerts;
}

function generateRecommendations(prediction: any, features: any) {
  const recommendations = [];

  // Failure-based recommendations
  if (prediction.failure_probability > 0.7) {
    recommendations.push('Schedule immediate maintenance inspection');
    recommendations.push('Prepare replacement parts for critical components');
    recommendations.push('Consider backup production capacity');
  } else if (prediction.failure_probability > 0.4) {
    recommendations.push('Increase monitoring frequency');
    recommendations.push('Plan maintenance window within next week');
  }

  // RUL-based recommendations
  if (prediction.remaining_useful_life_days < 7) {
    recommendations.push('Order emergency replacement parts');
    recommendations.push('Notify production planning of potential downtime');
  } else if (prediction.remaining_useful_life_days < 21) {
    recommendations.push('Schedule maintenance during next planned downtime');
    recommendations.push('Check spare parts inventory');
  }

  // Sensor-specific recommendations
  if (prediction.critical_sensors) {
    for (const sensor of prediction.critical_sensors) {
      if (sensor.includes('temperature')) {
        recommendations.push('Check cooling system and lubrication');
      } else if (sensor.includes('vibration')) {
        recommendations.push('Inspect bearings and mechanical alignment');
      } else if (sensor.includes('pressure')) {
        recommendations.push('Examine hydraulic system for leaks or blockages');
      } else if (sensor.includes('current') || sensor.includes('voltage')) {
        recommendations.push('Inspect electrical connections and components');
      }
    }
  }

  // Feature-based recommendations
  if (features.statistical && features.statistical['bearing_temperature_mean'] > 70) {
    recommendations.push('Bearing temperature elevated - check lubrication');
  }
  
  if (features.domain && features.domain['hydraulic_efficiency'] < 0.7) {
    recommendations.push('Hydraulic efficiency low - inspect system pressure and filters');
  }

  return [...new Set(recommendations)]; // Remove duplicates
}

function calculateOverallHealth(prediction: any): number {
  // Composite health score (0-1, where 1 is perfect health)
  let health = 1.0;
  
  if (prediction.failure_probability) {
    health -= prediction.failure_probability * 0.4; // 40% weight on failure risk
  }
  
  if (prediction.anomaly_score) {
    health -= prediction.anomaly_score * 0.3; // 30% weight on anomalies
  }
  
  if (prediction.remaining_useful_life_days) {
    // Normalize RUL to 0-1 scale (assume 100 days is "perfect" health)
    const rulScore = Math.min(prediction.remaining_useful_life_days / 100, 1);
    health = health * 0.7 + rulScore * 0.3; // 30% weight on RUL
  }
  
  return Math.max(0, Math.min(1, health));
}

function extractConfidenceScores(predictions: any[]): Record<string, number> {
  const confidence: Record<string, number> = {};
  
  for (const prediction of predictions) {
    if (prediction.prediction_type && prediction.confidence !== undefined) {
      confidence[prediction.prediction_type] = prediction.confidence;
    }
  }
  
  return confidence;
}

function extractFeatureImportance(features: any): Record<string, number> {
  // Extract top 10 most important features based on statistical properties
  const importance: Record<string, number> = {};
  
  // Statistical features importance (based on variation)
  if (features.statistical) {
    for (const [key, value] of Object.entries(features.statistical)) {
      if (typeof value === 'number' && key.includes('_std')) {
        const baseName = key.replace('_std', '');
        importance[baseName] = Math.abs(value as number) / 100; // Normalize
      }
    }
  }
  
  // Domain features are generally more important
  if (features.domain) {
    for (const [key, value] of Object.entries(features.domain)) {
      if (typeof value === 'number') {
        importance[key] = Math.min(1, Math.abs(value as number));
      }
    }
  }
  
  // Sort by importance and return top 10
  const sortedImportance = Object.entries(importance)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
    
  return Object.fromEntries(sortedImportance);
}

function extractModelVersions(predictions: any[]): Record<string, string> {
  const versions: Record<string, string> = {};
  
  for (const prediction of predictions) {
    if (prediction.prediction_type && prediction.model_version) {
      versions[prediction.prediction_type] = prediction.model_version;
    }
  }
  
  return versions;
}