import { NextRequest, NextResponse } from 'next/server';
import { ContactWelderDegradationAnalysis } from '@/lib/ml/contact-welder-degradation-analysis';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get('machineId') || 'contact_resistance';
  const analysisWindowDays = parseInt(searchParams.get('windowDays') || '90'); // Increased to 90 days to capture August data
  const predictionHorizonDays = parseInt(searchParams.get('horizonDays') || '28');

  try {
    console.log(`🔍 Starting Contact Welder ML prediction for ${machineId}`);
    
    const analyzer = new ContactWelderDegradationAnalysis();
    
    // Run the full degradation analysis
    const prediction = await analyzer.analyzeDegradationTrends(
      machineId,
      analysisWindowDays,
      predictionHorizonDays
    );

    console.log(`✅ ML prediction complete for ${machineId}`);
    
    return NextResponse.json({
      success: true,
      prediction,
      metadata: {
        analysis_window_days: analysisWindowDays,
        prediction_horizon_days: predictionHorizonDays,
        processed_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Contact Welder ML prediction failed:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        machine_id: machineId
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      machineId = 'contact_resistance',
      analysisWindowDays = 30,
      predictionHorizonDays = 28,
      sensors = ['contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature']
    } = body;

    console.log(`🔍 Custom ML analysis requested for ${machineId}`);
    console.log(`📊 Parameters: ${analysisWindowDays}d window, ${predictionHorizonDays}d horizon`);
    console.log(`🔧 Sensors: ${sensors.join(', ')}`);

    const analyzer = new ContactWelderDegradationAnalysis();
    
    // Run comprehensive analysis
    const prediction = await analyzer.analyzeDegradationTrends(
      machineId,
      analysisWindowDays,
      predictionHorizonDays
    );

    // Calculate additional insights
    const insights = {
      risk_summary: {
        current_risk_level: prediction.failure_probability_14_days >= 70 ? 'CRITICAL' :
                           prediction.failure_probability_14_days >= 50 ? 'HIGH' :
                           prediction.failure_probability_14_days >= 30 ? 'MEDIUM' : 'LOW',
        days_to_maintenance: prediction.maintenance_recommendations.length > 0 
          ? Math.ceil((prediction.maintenance_recommendations[0].week_start.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
        primary_concern: prediction.degradation_timeline
          .sort((a, b) => a.current_health - b.current_health)[0]?.component || 'No immediate concerns',
        cost_avoidance: prediction.maintenance_recommendations
          .reduce((sum, rec) => sum + (rec.cost_estimate * 0.3), 0) // 30% cost avoidance through proactive maintenance
      },
      sensor_health: prediction.degradation_timeline.map(component => ({
        component: component.component,
        current_health: component.current_health,
        trend: component.current_health > component.projected_health_14_days ? 'DEGRADING' : 'STABLE',
        urgency: component.days_to_critical ? 
          component.days_to_critical <= 14 ? 'URGENT' :
          component.days_to_critical <= 28 ? 'MODERATE' : 'LOW' : 'LOW'
      }))
    };

    return NextResponse.json({
      success: true,
      prediction,
      insights,
      metadata: {
        analysis_window_days: analysisWindowDays,
        prediction_horizon_days: predictionHorizonDays,
        sensors_analyzed: sensors,
        processed_at: new Date().toISOString(),
        model_version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('❌ Custom Contact Welder ML analysis failed:', error);
    
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