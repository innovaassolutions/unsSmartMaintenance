import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

interface SimplePrediction {
  machine_id: string;
  analysis_timestamp: string;
  prediction_horizon_days: number;
  failure_probability_14_days: number;
  failure_probability_21_days: number;
  failure_probability_28_days: number;
  degradation_timeline: Array<{
    component: string;
    current_health: number;
    projected_health_14_days: number;
    projected_health_21_days: number;
    projected_health_28_days: number;
    critical_threshold: number;
    days_to_critical: number | null;
  }>;
  risk_progression: Array<{
    week: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    primary_risk_factors: string[];
    maintenance_window: boolean;
  }>;
  early_warnings: Array<{
    indicator: string;
    current_status: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';
    trend_direction: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    time_to_warning: number | null;
    time_to_critical: number | null;
  }>;
  maintenance_recommendations: Array<{
    week_start: string;
    week_end: string;
    recommended_actions: string[];
    expected_downtime_hours: number;
    cost_estimate: number;
    risk_reduction: number;
    confidence: number;
  }>;
}

export async function GET(request: NextRequest) {
  console.log('🔍 Simple ML Prediction API called');
  
  try {
    const bigQuery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    // Get recent sensor data for Contact Welder components
    const query = `
      SELECT 
        machine_id,
        AVG(value) as avg_value,
        STDDEV(value) as std_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        COUNT(*) as data_points
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.relay_manufacturing.sensor_readings\`
      WHERE machine_id IN ('contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature')
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
      GROUP BY machine_id
      ORDER BY machine_id
    `;

    console.log('📊 Fetching sensor statistics...');
    const [rows] = await bigQuery.query(query);
    
    console.log(`✅ Retrieved data for ${rows.length} sensor types`);

    if (rows.length === 0) {
      throw new Error('No sensor data found for Contact Welder analysis');
    }

    // Simple prediction logic based on sensor values
    const sensorStats = rows.reduce((acc: any, row: any) => {
      acc[row.machine_id] = row;
      return acc;
    }, {});

    // Calculate simple health scores based on sensor values
    const contactResistance = sensorStats['contact_resistance'];
    const weldCurrent = sensorStats['weld_current'];
    const weldVoltage = sensorStats['weld_voltage'];
    const moldTemp = sensorStats['mold_temperature'];

    // Simple health calculation (inverted percentage based on deviation from ideal)
    const calculateHealth = (avg: number, std: number, idealMin: number, idealMax: number) => {
      const deviation = Math.abs(avg - ((idealMin + idealMax) / 2)) / ((idealMax - idealMin) / 2);
      return Math.max(20, Math.min(100, 100 - (deviation * 50) - (std / avg * 30)));
    };

    const contactHealth = contactResistance ? calculateHealth(contactResistance.avg_value, contactResistance.std_value || 0, 400, 500) : 85;
    const currentHealth = weldCurrent ? calculateHealth(weldCurrent.avg_value, weldCurrent.std_value || 0, 200, 400) : 82;
    const voltageHealth = weldVoltage ? calculateHealth(weldVoltage.avg_value, weldVoltage.std_value || 0, 400, 500) : 88;
    const thermalHealth = moldTemp ? Math.max(60, 95 - (moldTemp.avg_value * 0.1)) : 78;

    // Calculate failure probabilities (higher degradation = higher failure risk)
    const avgHealth = (contactHealth + currentHealth + voltageHealth + thermalHealth) / 4;
    const baseRisk = Math.max(5, 100 - avgHealth);
    
    const degradationTimeline = [
      {
        component: 'Contact Tips & Electrodes',
        current_health: Math.round(contactHealth),
        projected_health_14_days: Math.round(contactHealth - 2),
        projected_health_21_days: Math.round(contactHealth - 4),
        projected_health_28_days: Math.round(contactHealth - 6),
        critical_threshold: 30,
        days_to_critical: contactHealth > 30 ? Math.round((contactHealth - 30) / 0.2) : null
      },
      {
        component: 'Current Control System',
        current_health: Math.round(currentHealth),
        projected_health_14_days: Math.round(currentHealth - 1),
        projected_health_21_days: Math.round(currentHealth - 2),
        projected_health_28_days: Math.round(currentHealth - 3),
        critical_threshold: 25,
        days_to_critical: currentHealth > 25 ? Math.round((currentHealth - 25) / 0.15) : null
      },
      {
        component: 'Voltage Regulation System',
        current_health: Math.round(voltageHealth),
        projected_health_14_days: Math.round(voltageHealth - 1.5),
        projected_health_21_days: Math.round(voltageHealth - 3),
        projected_health_28_days: Math.round(voltageHealth - 4.5),
        critical_threshold: 35,
        days_to_critical: voltageHealth > 35 ? Math.round((voltageHealth - 35) / 0.16) : null
      },
      {
        component: 'Thermal Management System',
        current_health: Math.round(thermalHealth),
        projected_health_14_days: Math.round(thermalHealth - 3),
        projected_health_21_days: Math.round(thermalHealth - 5),
        projected_health_28_days: Math.round(thermalHealth - 8),
        critical_threshold: 40,
        days_to_critical: thermalHealth > 40 ? Math.round((thermalHealth - 40) / 0.3) : null
      }
    ];

    const prediction: SimplePrediction = {
      machine_id: 'contact_resistance',
      analysis_timestamp: new Date().toISOString(),
      prediction_horizon_days: 28,
      failure_probability_14_days: Math.round(baseRisk * 0.6),
      failure_probability_21_days: Math.round(baseRisk * 0.8), 
      failure_probability_28_days: Math.round(baseRisk),
      degradation_timeline,
      risk_progression: [
        {
          week: 1,
          risk_level: baseRisk < 20 ? 'LOW' : baseRisk < 40 ? 'MEDIUM' : baseRisk < 70 ? 'HIGH' : 'CRITICAL',
          primary_risk_factors: degradationTimeline
            .filter(c => c.current_health < 60)
            .map(c => c.component)
            .slice(0, 2),
          maintenance_window: baseRisk >= 30 && baseRisk <= 60
        },
        {
          week: 2,
          risk_level: baseRisk < 15 ? 'LOW' : baseRisk < 35 ? 'MEDIUM' : baseRisk < 65 ? 'HIGH' : 'CRITICAL',
          primary_risk_factors: [],
          maintenance_window: baseRisk >= 25 && baseRisk <= 55
        },
        {
          week: 3,
          risk_level: baseRisk < 10 ? 'LOW' : baseRisk < 30 ? 'MEDIUM' : baseRisk < 60 ? 'HIGH' : 'CRITICAL',
          primary_risk_factors: [],
          maintenance_window: baseRisk >= 20 && baseRisk <= 50
        },
        {
          week: 4,
          risk_level: baseRisk < 5 ? 'LOW' : baseRisk < 25 ? 'MEDIUM' : baseRisk < 55 ? 'HIGH' : 'CRITICAL',
          primary_risk_factors: [],
          maintenance_window: baseRisk >= 15 && baseRisk <= 45
        }
      ],
      early_warnings: degradationTimeline.map(component => ({
        indicator: `${component.component} Health`,
        current_status: component.current_health < 30 ? 'CRITICAL' :
                      component.current_health < 50 ? 'WARNING' :
                      component.current_health < 70 ? 'WATCH' : 'NORMAL',
        trend_direction: component.current_health > component.projected_health_28_days ? 'DEGRADING' : 'STABLE',
        time_to_warning: component.current_health > 50 ? Math.round((component.current_health - 50) / 0.2) : null,
        time_to_critical: component.days_to_critical
      })),
      maintenance_recommendations: baseRisk >= 25 ? [
        {
          week_start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          week_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          recommended_actions: [
            'Inspect contact tips and electrode assembly',
            'Clean and calibrate electrical parameters',
            'Check thermal management system'
          ],
          expected_downtime_hours: 6,
          cost_estimate: 450,
          risk_reduction: Math.round(baseRisk * 0.6),
          confidence: 85
        }
      ] : []
    };

    // Calculate insights
    const insights = {
      risk_summary: {
        current_risk_level: baseRisk >= 70 ? 'CRITICAL' : 
                           baseRisk >= 50 ? 'HIGH' : 
                           baseRisk >= 30 ? 'MEDIUM' : 'LOW',
        days_to_maintenance: prediction.maintenance_recommendations.length > 0 ? 
          Math.ceil((new Date(prediction.maintenance_recommendations[0].week_start).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
        primary_concern: degradationTimeline
          .sort((a, b) => a.current_health - b.current_health)[0]?.component || 'All systems normal',
        cost_avoidance: prediction.maintenance_recommendations
          .reduce((sum, rec) => sum + rec.cost_estimate * 0.3, 0)
      },
      sensor_health: degradationTimeline.map(component => ({
        component: component.component,
        current_health: component.current_health,
        trend: component.current_health > component.projected_health_28_days ? 'DEGRADING' : 'STABLE',
        urgency: component.current_health < 40 ? 'URGENT' :
                component.current_health < 60 ? 'MODERATE' : 'LOW'
      }))
    };

    console.log(`✅ ML prediction generated successfully`);
    console.log(`📊 Failure probabilities: 14d=${prediction.failure_probability_14_days}%, 21d=${prediction.failure_probability_21_days}%, 28d=${prediction.failure_probability_28_days}%`);

    return NextResponse.json({
      success: true,
      prediction,
      insights,
      metadata: {
        data_points_analyzed: rows.reduce((sum: number, row: any) => sum + row.data_points, 0),
        analysis_window_days: 90,
        prediction_horizon_days: 28,
        processed_at: new Date().toISOString(),
        model_version: '1.0.0-simple'
      }
    });

  } catch (error) {
    console.error('❌ Simple ML prediction failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}