/**
 * Contact Welder Prediction API Endpoint
 * Real-time failure prediction API for Contact Welder machines
 * Integrates with Vertex AI models and dashboard components
 */

import { NextRequest, NextResponse } from 'next/server';
import { ContactWelderPredictionClient } from '@/lib/ml/contact-welder-prediction-client';
import type { ContactWelderReading } from '@/lib/ml/contact-welder-features';

interface PredictionAPIRequest {
  machineId: string;
  sensorData?: ContactWelderReading[];
  timeWindowHours?: number;
  predictionHorizonDays?: number;
  includeRecommendations?: boolean;
  dataSource?: 'realtime' | 'bigquery' | 'provided';
}

interface PredictionAPIResponse {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    timestamp: string;
    processingTimeMs: number;
    dataQuality: number;
    modelVersion: string;
  };
}

// Initialize prediction client
const predictionClient = new ContactWelderPredictionClient({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  region: 'us-central1'
});

export async function POST(request: NextRequest): Promise<NextResponse<PredictionAPIResponse>> {
  const startTime = Date.now();
  
  try {
    const body: PredictionAPIRequest = await request.json();
    
    // Validate required parameters
    if (!body.machineId) {
      return NextResponse.json({
        success: false,
        error: 'machineId is required',
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          dataQuality: 0,
          modelVersion: 'unknown'
        }
      }, { status: 400 });
    }

    console.log(`🔮 Processing prediction request for Contact Welder: ${body.machineId}`);

    // Get sensor data based on source
    let sensorData: ContactWelderReading[];
    
    if (body.sensorData && body.dataSource === 'provided') {
      sensorData = body.sensorData;
    } else {
      // Fetch recent sensor data from BigQuery
      sensorData = await fetchRecentSensorData(
        body.machineId, 
        body.timeWindowHours || 168 // Default: 1 week
      );
    }

    if (sensorData.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No sensor data available for the specified machine and time window',
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          dataQuality: 0,
          modelVersion: 'contact-welder-v1.0'
        }
      }, { status: 404 });
    }

    // Generate prediction
    const prediction = await predictionClient.predictFailure({
      machineId: body.machineId,
      sensorData,
      predictionHorizonDays: body.predictionHorizonDays || 21
    });

    // Format response for dashboard consumption
    const response = {
      // Machine Information
      machine_id: prediction.machine_id,
      prediction_timestamp: prediction.prediction_timestamp,
      
      // Core Predictions
      failure_probability: Math.round(prediction.failure_probability),
      failure_confidence: Math.round(prediction.failure_confidence),
      days_to_failure: prediction.days_to_failure_estimate,
      estimated_cycles_remaining: prediction.remaining_useful_life_cycles,
      
      // Health Scores (0-100)
      health_scores: {
        resistance: Math.round(prediction.resistance_health_score),
        electrical: Math.round(prediction.electrical_system_health),
        thermal: Math.round(prediction.thermal_system_health),
        process: Math.round(prediction.process_stability_health),
        overall: Math.round((
          prediction.resistance_health_score +
          prediction.electrical_system_health +
          prediction.thermal_system_health +
          prediction.process_stability_health
        ) / 4)
      },
      
      // Risk Assessment
      risk_level: prediction.overall_risk_level,
      maintenance_urgency: prediction.maintenance_urgency,
      critical_sensors: prediction.critical_sensors,
      
      // Risk Factors
      risk_factors: prediction.risk_factors.map(factor => ({
        name: factor.factor,
        severity: Math.round(factor.severity),
        description: factor.description,
        color: factor.severity >= 80 ? 'red' : factor.severity >= 60 ? 'orange' : factor.severity >= 40 ? 'yellow' : 'green'
      })),
      
      // Maintenance Recommendations (if requested)
      maintenance_recommendations: body.includeRecommendations !== false ? 
        prediction.recommended_actions.slice(0, 5).map(action => ({
          description: action.action,
          priority: action.priority,
          estimated_cost: action.estimated_cost,
          estimated_downtime: action.estimated_downtime_hours,
          urgency_color: action.priority >= 4 ? 'red' : action.priority >= 3 ? 'orange' : 'yellow'
        })) : [],
      
      // Degradation Patterns
      degradation_analysis: prediction.degradation_patterns.map(pattern => ({
        type: pattern.pattern_type.replace(/_/g, ' ').toUpperCase(),
        confidence: Math.round(pattern.confidence * 100),
        trend: pattern.trend_direction,
        severity: pattern.rate_of_change > 0.1 ? 'HIGH' : 
                  pattern.rate_of_change > 0.05 ? 'MEDIUM' : 'LOW'
      })),
      
      // Alerts for immediate dashboard display
      alerts: generateAlerts(prediction),
      
      // Dashboard visualization data
      chart_data: await generateChartData(body.machineId, sensorData),
      
      // Trend indicators for quick dashboard overview
      trend_indicators: {
        resistance_trend: prediction.degradation_patterns.find(p => 
          p.pattern_type.includes('resistance'))?.trend_direction || 'STABLE',
        temperature_trend: prediction.degradation_patterns.find(p => 
          p.pattern_type.includes('thermal'))?.trend_direction || 'STABLE',
        overall_health_trend: prediction.failure_probability > 70 ? 'DEGRADING' : 
                              prediction.failure_probability > 30 ? 'WATCH' : 'STABLE'
      }
    };

    const processingTime = Date.now() - startTime;
    console.log(`✅ Prediction completed for ${body.machineId} in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      data: response,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs: processingTime,
        dataQuality: prediction.data_quality_score,
        modelVersion: prediction.model_version
      }
    });

  } catch (error) {
    console.error('❌ Contact Welder prediction API error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        dataQuality: 0,
        modelVersion: 'contact-welder-v1.0'
      }
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get('machineId');
  
  if (!machineId) {
    return NextResponse.json({
      success: false,
      error: 'machineId parameter is required',
      metadata: {
        timestamp: new Date().toISOString(),
        processingTimeMs: 0,
        dataQuality: 0,
        modelVersion: 'contact-welder-v1.0'
      }
    }, { status: 400 });
  }

  // Return cached prediction or trigger new prediction
  return POST(request);
}

/**
 * Fetch recent sensor data from BigQuery
 */
async function fetchRecentSensorData(
  machineId: string, 
  timeWindowHours: number
): Promise<ContactWelderReading[]> {
  const { BigQuery } = require('@google-cloud/bigquery');
  const bigQuery = new BigQuery({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
  });

  const query = `
    SELECT 
      timestamp,
      machine_id,
      sensor_type,
      value,
      quality_code,
      unit,
      location_path
    FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.relay_manufacturing.sensor_readings\`
    WHERE machine_id = '${machineId}'
      AND sensor_type IN ('contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature')
      AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${timeWindowHours} HOUR)
      AND quality_code = 0
    ORDER BY timestamp DESC
    LIMIT 10000
  `;

  try {
    const [rows] = await bigQuery.query(query);
    
    return rows.map((row: any) => ({
      timestamp: new Date(row.timestamp.value),
      machine_id: row.machine_id,
      sensor_type: row.sensor_type as any,
      value: parseFloat(row.value),
      quality_code: row.quality_code,
      unit: row.unit || '',
      location_path: row.location_path || ''
    }));
  } catch (error) {
    console.error('Error fetching sensor data from BigQuery:', error);
    return [];
  }
}

/**
 * Generate alerts for immediate dashboard notification
 */
function generateAlerts(prediction: any): Array<{
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  actionRequired: boolean;
}> {
  const alerts = [];

  // Critical failure probability
  if (prediction.failure_probability >= 80) {
    alerts.push({
      type: 'CRITICAL' as const,
      title: 'Imminent Failure Risk',
      message: `Contact Welder ${prediction.machine_id} has ${prediction.failure_probability}% failure probability. Immediate maintenance required.`,
      actionRequired: true
    });
  }

  // High resistance degradation
  const resistanceHealth = prediction.resistance_health_score;
  if (resistanceHealth <= 30) {
    alerts.push({
      type: 'CRITICAL' as const,
      title: 'Contact Resistance Critical',
      message: `Contact resistance degradation detected. Replace contact tips immediately.`,
      actionRequired: true
    });
  }

  // Thermal stress
  const thermalHealth = prediction.thermal_system_health;
  if (thermalHealth <= 40) {
    alerts.push({
      type: 'WARNING' as const,
      title: 'Thermal Stress Detected',
      message: `Elevated operating temperatures. Check cooling system.`,
      actionRequired: true
    });
  }

  // Maintenance due soon
  if (prediction.days_to_failure_estimate && prediction.days_to_failure_estimate <= 7) {
    alerts.push({
      type: 'WARNING' as const,
      title: 'Maintenance Due Soon',
      message: `Estimated ${prediction.days_to_failure_estimate} days until potential failure. Schedule maintenance.`,
      actionRequired: true
    });
  }

  // Good health status
  if (alerts.length === 0 && prediction.failure_probability < 30) {
    alerts.push({
      type: 'INFO' as const,
      title: 'System Operating Normally',
      message: `Contact Welder ${prediction.machine_id} is operating within normal parameters.`,
      actionRequired: false
    });
  }

  return alerts;
}

/**
 * Generate chart data for dashboard visualization
 */
async function generateChartData(machineId: string, sensorData: ContactWelderReading[]): Promise<{
  resistance_trend: Array<{ timestamp: string; value: number }>;
  temperature_trend: Array<{ timestamp: string; value: number }>;
  current_trend: Array<{ timestamp: string; value: number }>;
  voltage_trend: Array<{ timestamp: string; value: number }>;
  health_score_history: Array<{ timestamp: string; score: number }>;
}> {
  // Group data by sensor type
  const sensorGroups = sensorData.reduce((acc, reading) => {
    if (!acc[reading.sensor_type]) {
      acc[reading.sensor_type] = [];
    }
    acc[reading.sensor_type].push(reading);
    return acc;
  }, {} as Record<string, ContactWelderReading[]>);

  // Generate trend data (last 24 points for chart display)
  const formatTrendData = (readings: ContactWelderReading[]) => {
    return readings
      .slice(-24)
      .map(r => ({
        timestamp: r.timestamp.toISOString(),
        value: Math.round(r.value * 100) / 100
      }));
  };

  // Calculate health scores over time
  const healthScoreHistory = [];
  for (let i = Math.max(0, sensorData.length - 24); i < sensorData.length; i += 6) {
    const windowData = sensorData.slice(Math.max(0, i - 6), i + 1);
    if (windowData.length > 0) {
      // Simple health calculation for trend display
      const resistance = windowData.filter(r => r.sensor_type === 'contact_resistance');
      const temperature = windowData.filter(r => r.sensor_type === 'mold_temperature');
      
      let healthScore = 100;
      if (resistance.length > 0) {
        const avgResistance = resistance.reduce((sum, r) => sum + r.value, 0) / resistance.length;
        healthScore -= Math.min(50, (avgResistance - 1.0) * 25); // Deduct for high resistance
      }
      if (temperature.length > 0) {
        const avgTemp = temperature.reduce((sum, r) => sum + r.value, 0) / temperature.length;
        healthScore -= Math.min(30, Math.max(0, (avgTemp - 100) * 0.3)); // Deduct for high temp
      }
      
      healthScoreHistory.push({
        timestamp: windowData[windowData.length - 1].timestamp.toISOString(),
        score: Math.max(0, Math.round(healthScore))
      });
    }
  }

  return {
    resistance_trend: formatTrendData(sensorGroups.contact_resistance || []),
    temperature_trend: formatTrendData(sensorGroups.mold_temperature || []),
    current_trend: formatTrendData(sensorGroups.weld_current || []),
    voltage_trend: formatTrendData(sensorGroups.weld_voltage || []),
    health_score_history: healthScoreHistory
  };
}