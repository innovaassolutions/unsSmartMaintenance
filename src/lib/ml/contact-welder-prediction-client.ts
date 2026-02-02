/**
 * Contact Welder Prediction Client
 * Production-ready client for real-time Contact Welder failure predictions
 * Integrates with trained Vertex AI models and dashboard APIs
 */

import { GoogleAuth } from 'google-auth-library';
import { BigQuery } from '@google-cloud/bigquery';
import { ContactWelderFeatureEngineer } from './contact-welder-features';
import type { ContactWelderReading, ContactWelderFeatures } from './contact-welder-features';

interface PredictionRequest {
  machineId: string;
  sensorData: ContactWelderReading[];
  predictionHorizonDays?: number;
}

interface ContactWelderPrediction {
  machine_id: string;
  timestamp: Date;
  prediction_type: 'failure_prediction' | 'degradation_analysis' | 'maintenance_recommendation';
  
  // Core Predictions
  failure_probability: number;              // 0-100%, probability of failure within horizon
  failure_confidence: number;               // 0-100%, confidence in prediction
  days_to_failure_estimate: number | null; // Estimated days until failure
  remaining_useful_life_cycles: number;     // Estimated cycles before maintenance
  
  // Health Indicators
  resistance_health_score: number;          // 0-100%, current resistance health
  electrical_system_health: number;         // 0-100%, overall electrical health
  thermal_system_health: number;           // 0-100%, thermal management health
  process_stability_health: number;        // 0-100%, welding process stability
  
  // Risk Assessment
  overall_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  critical_sensors: string[];              // Sensors contributing most to risk
  risk_factors: Array<{
    factor: string;
    severity: number;                       // 0-100%
    description: string;
  }>;
  
  // Maintenance Recommendations
  maintenance_urgency: 'ROUTINE' | 'PLANNED' | 'URGENT' | 'IMMEDIATE';
  recommended_actions: Array<{
    action: string;
    priority: number;                       // 1-5, 5 = highest
    estimated_cost: number;                 // USD
    estimated_downtime_hours: number;
  }>;
  
  // Degradation Analysis
  degradation_patterns: Array<{
    pattern_type: string;
    confidence: number;
    trend_direction: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    rate_of_change: number;
  }>;
  
  // Model Metadata
  model_version: string;
  prediction_timestamp: Date;
  data_quality_score: number;              // 0-100%, quality of input data
}

interface MaintenanceRecommendation {
  action_type: 'INSPECT' | 'REPLACE' | 'CALIBRATE' | 'CLEAN' | 'ADJUST';
  component: string;
  description: string;
  urgency: number;                         // 1-10 scale
  estimated_cost: number;
  estimated_time_hours: number;
  required_parts: string[];
  safety_considerations: string[];
}

interface TrendAnalysis {
  sensor_type: string;
  current_value: number;
  baseline_value: number;
  trend_slope: number;                     // Rate of change per day
  trend_confidence: number;                // 0-1 statistical confidence
  projected_failure_threshold: number;
  days_to_threshold: number | null;
  severity: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';
}

export class ContactWelderPredictionClient {
  private auth: GoogleAuth;
  private bigQuery: BigQuery;
  private featureEngineer: ContactWelderFeatureEngineer;
  private projectId: string;
  private region: string;
  private endpointName: string;

  constructor(config?: {
    projectId?: string;
    region?: string;
    endpointName?: string;
  }) {
    this.projectId = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT || 'uns-smart-maintenance-ml';
    this.region = config?.region || 'us-central1';
    this.endpointName = config?.endpointName || `projects/${this.projectId}/locations/${this.region}/endpoints/contact-welder-prediction-v1`;

    this.auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    this.bigQuery = new BigQuery({
      projectId: this.projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    this.featureEngineer = new ContactWelderFeatureEngineer();
  }

  /**
   * Get comprehensive Contact Welder failure prediction
   */
  async predictFailure(request: PredictionRequest): Promise<ContactWelderPrediction> {
    try {
      console.log(`🔮 Generating prediction for Contact Welder ${request.machineId}`);
      
      // Step 1: Generate features from sensor data
      const features = await this.featureEngineer.generateContactWelderFeatures(
        request.machineId,
        request.sensorData,
        168 // 1 week window
      );

      // Step 2: Detect failure patterns
      const failurePatterns = await this.featureEngineer.detectFailurePatterns(request.sensorData);
      
      // Step 3: Get model prediction
      const modelPrediction = await this.callVertexAIModel(features);
      
      // Step 4: Analyze trends
      const trendAnalysis = await this.analyzeTrends(request.sensorData);
      
      // Step 5: Generate maintenance recommendations
      const recommendations = await this.generateMaintenanceRecommendations(
        features, 
        failurePatterns, 
        trendAnalysis
      );
      
      // Step 6: Assess data quality
      const dataQuality = this.assessDataQuality(request.sensorData);
      
      // Step 7: Compile comprehensive prediction
      const prediction = this.compilePrediction(
        request.machineId,
        features,
        modelPrediction,
        failurePatterns,
        trendAnalysis,
        recommendations,
        dataQuality
      );

      console.log(`✅ Prediction complete for ${request.machineId}: ${prediction.overall_risk_level} risk`);
      return prediction;

    } catch (error) {
      console.error(`❌ Prediction failed for ${request.machineId}:`, error);
      throw new Error(`Contact Welder prediction failed: ${error}`);
    }
  }

  /**
   * Call Vertex AI model for prediction
   */
  private async callVertexAIModel(features: ContactWelderFeatures): Promise<{
    failure_probability: number;
    confidence: number;
    feature_importance: Array<{ feature: string; importance: number }>;
  }> {
    try {
      const client = await this.auth.getClient();
      const url = `https://${this.region}-aiplatform.googleapis.com/v1/${this.endpointName}:predict`;
      
      // Prepare features for model input
      const instance = {
        resistance_degradation_index: features.resistance_degradation_index,
        electrical_health_score: features.electrical_health_score,
        thermal_stress_index: features.thermal_stress_index,
        process_stability_score: features.process_stability_score,
        weld_quality_trend: features.weld_quality_trend,
        power_efficiency_index: features.power_efficiency_index,
        thermal_electrical_coupling: features.thermal_electrical_coupling,
        failure_risk_score: features.failure_risk_score,
        resistance_drift_rate: features.resistance_drift_rate,
        temperature_cycling_stress: features.temperature_cycling_stress,
        current_consistency_index: features.current_consistency_index,
        voltage_stability_factor: features.voltage_stability_factor,
        remaining_useful_cycles: features.remaining_useful_cycles,
        degradation_acceleration: features.degradation_acceleration,
        critical_threshold_proximity: features.critical_threshold_proximity,
        maintenance_urgency_score: features.maintenance_urgency_score
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
        failure_probability: (prediction.scores?.[1] || prediction.value || 0) * 100,
        confidence: Math.max(...(prediction.scores || [prediction.value || 0])) * 100,
        feature_importance: this.extractFeatureImportance(prediction)
      };

    } catch (error) {
      console.error('Vertex AI model call failed:', error);
      // Fallback to rule-based prediction
      return this.ruleBasedPrediction(features);
    }
  }

  /**
   * Fallback rule-based prediction when model is unavailable
   */
  private ruleBasedPrediction(features: ContactWelderFeatures): {
    failure_probability: number;
    confidence: number;
    feature_importance: Array<{ feature: string; importance: number }>;
  } {
    // Weight critical indicators
    const resistanceWeight = 0.4;
    const thermalWeight = 0.3;
    const electricalWeight = 0.2;
    const stabilityWeight = 0.1;

    const failureProbability = Math.min(100, Math.max(0,
      (features.resistance_degradation_index * resistanceWeight +
       features.thermal_stress_index * thermalWeight +
       (1 - features.electrical_health_score) * electricalWeight +
       (1 - features.process_stability_score) * stabilityWeight) * 100
    ));

    return {
      failure_probability: failureProbability,
      confidence: 75, // Rule-based confidence
      feature_importance: [
        { feature: 'resistance_degradation_index', importance: resistanceWeight },
        { feature: 'thermal_stress_index', importance: thermalWeight },
        { feature: 'electrical_health_score', importance: electricalWeight },
        { feature: 'process_stability_score', importance: stabilityWeight }
      ]
    };
  }

  /**
   * Analyze sensor trends for degradation patterns
   */
  private async analyzeTrends(sensorData: ContactWelderReading[]): Promise<TrendAnalysis[]> {
    const sensorGroups = this.groupBySensorType(sensorData);
    const trends: TrendAnalysis[] = [];

    const thresholds = {
      contact_resistance: { warning: 3.0, critical: 5.0 },
      mold_temperature: { warning: 150, critical: 200 },
      weld_current: { warning: 8500, critical: 9000 },
      weld_voltage: { warning: 8.5, critical: 10.0 }
    };

    for (const [sensorType, readings] of Object.entries(sensorGroups)) {
      const values = readings.map(r => r.value);
      if (values.length < 10) continue;

      const currentValue = values[values.length - 1];
      const baselineValue = this.mean(values.slice(0, Math.min(24, values.length)));
      const trendSlope = this.calculateTrend(values);
      const threshold = thresholds[sensorType as keyof typeof thresholds];

      let daysToThreshold: number | null = null;
      if (trendSlope > 0 && threshold) {
        daysToThreshold = Math.ceil((threshold.critical - currentValue) / (trendSlope * 24));
      }

      let severity: TrendAnalysis['severity'] = 'NORMAL';
      if (threshold) {
        if (currentValue >= threshold.critical) severity = 'CRITICAL';
        else if (currentValue >= threshold.warning) severity = 'WARNING';
        else if (trendSlope > 0.1) severity = 'WATCH';
      }

      trends.push({
        sensor_type: sensorType,
        current_value: currentValue,
        baseline_value: baselineValue,
        trend_slope: trendSlope,
        trend_confidence: this.calculateTrendConfidence(values),
        projected_failure_threshold: threshold?.critical || 0,
        days_to_threshold: daysToThreshold && daysToThreshold > 0 ? daysToThreshold : null,
        severity
      });
    }

    return trends;
  }

  /**
   * Generate maintenance recommendations based on analysis
   */
  private async generateMaintenanceRecommendations(
    features: ContactWelderFeatures,
    failurePatterns: any[],
    trends: TrendAnalysis[]
  ): Promise<MaintenanceRecommendation[]> {
    const recommendations: MaintenanceRecommendation[] = [];

    // Resistance-based recommendations
    if (features.resistance_degradation_index > 0.7) {
      recommendations.push({
        action_type: 'REPLACE',
        component: 'Contact Tips',
        description: 'Replace worn contact tips due to high resistance degradation',
        urgency: features.resistance_degradation_index > 0.9 ? 10 : 8,
        estimated_cost: 150,
        estimated_time_hours: 2,
        required_parts: ['Contact Tips (Set)', 'Thread Locker'],
        safety_considerations: ['Power isolation required', 'Allow cooling time']
      });
    }

    // Thermal-based recommendations
    if (features.thermal_stress_index > 0.6) {
      recommendations.push({
        action_type: 'INSPECT',
        component: 'Cooling System',
        description: 'Inspect cooling system due to elevated thermal stress',
        urgency: features.thermal_stress_index > 0.8 ? 9 : 6,
        estimated_cost: 0,
        estimated_time_hours: 1,
        required_parts: [],
        safety_considerations: ['Check coolant levels', 'Inspect for leaks']
      });
    }

    // Electrical health recommendations
    if (features.electrical_health_score < 0.6) {
      recommendations.push({
        action_type: 'CALIBRATE',
        component: 'Electrical System',
        description: 'Calibrate welding parameters due to electrical inconsistencies',
        urgency: features.electrical_health_score < 0.4 ? 8 : 5,
        estimated_cost: 50,
        estimated_time_hours: 3,
        required_parts: ['Calibration Tools'],
        safety_considerations: ['Lockout/tagout required', 'Qualified technician only']
      });
    }

    // Process stability recommendations
    if (features.process_stability_score < 0.7) {
      recommendations.push({
        action_type: 'ADJUST',
        component: 'Process Parameters',
        description: 'Adjust welding parameters to improve process stability',
        urgency: 4,
        estimated_cost: 25,
        estimated_time_hours: 1,
        required_parts: [],
        safety_considerations: ['Document parameter changes', 'Test weld quality']
      });
    }

    // Critical trend-based recommendations
    const criticalTrends = trends.filter(t => t.severity === 'CRITICAL');
    for (const trend of criticalTrends) {
      if (trend.sensor_type === 'contact_resistance') {
        recommendations.push({
          action_type: 'REPLACE',
          component: 'Electrode Assembly',
          description: `CRITICAL: Replace electrode assembly - resistance at ${trend.current_value.toFixed(2)} mΩ`,
          urgency: 10,
          estimated_cost: 300,
          estimated_time_hours: 4,
          required_parts: ['Electrode Assembly', 'Contact Tips', 'Gaskets'],
          safety_considerations: ['Immediate shutdown required', 'Quality inspection after replacement']
        });
      }
    }

    return recommendations.sort((a, b) => b.urgency - a.urgency);
  }

  /**
   * Assess input data quality
   */
  private assessDataQuality(sensorData: ContactWelderReading[]): number {
    const requiredSensors = ['contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature'];
    const sensorGroups = this.groupBySensorType(sensorData);
    
    let qualityScore = 100;
    
    // Check sensor coverage
    for (const sensor of requiredSensors) {
      if (!sensorGroups[sensor] || sensorGroups[sensor].length === 0) {
        qualityScore -= 25; // -25 points per missing sensor
      }
    }
    
    // Check data recency (last reading should be within 1 hour)
    const latestReading = Math.max(...sensorData.map(r => r.timestamp.getTime()));
    const hoursSinceLatest = (Date.now() - latestReading) / (1000 * 60 * 60);
    if (hoursSinceLatest > 1) {
      qualityScore -= Math.min(20, hoursSinceLatest * 2);
    }
    
    // Check data completeness
    const totalExpectedReadings = requiredSensors.length * 24; // Expect 24 readings per sensor
    const actualReadings = sensorData.length;
    const completeness = actualReadings / totalExpectedReadings;
    if (completeness < 1.0) {
      qualityScore -= (1 - completeness) * 30;
    }

    return Math.max(0, qualityScore);
  }

  /**
   * Compile comprehensive prediction result
   */
  private compilePrediction(
    machineId: string,
    features: ContactWelderFeatures,
    modelPrediction: any,
    failurePatterns: any[],
    trends: TrendAnalysis[],
    recommendations: MaintenanceRecommendation[],
    dataQuality: number
  ): ContactWelderPrediction {
    
    // Determine overall risk level
    let riskLevel: ContactWelderPrediction['overall_risk_level'] = 'LOW';
    if (modelPrediction.failure_probability > 80) riskLevel = 'CRITICAL';
    else if (modelPrediction.failure_probability > 60) riskLevel = 'HIGH';
    else if (modelPrediction.failure_probability > 30) riskLevel = 'MEDIUM';

    // Determine maintenance urgency
    let maintenanceUrgency: ContactWelderPrediction['maintenance_urgency'] = 'ROUTINE';
    if (riskLevel === 'CRITICAL') maintenanceUrgency = 'IMMEDIATE';
    else if (riskLevel === 'HIGH') maintenanceUrgency = 'URGENT';
    else if (riskLevel === 'MEDIUM') maintenanceUrgency = 'PLANNED';

    // Estimate days to failure
    let daysToFailure: number | null = null;
    if (modelPrediction.failure_probability > 50) {
      // Linear interpolation: 50% = 21 days, 100% = 1 day
      daysToFailure = Math.max(1, Math.round(22 - (modelPrediction.failure_probability / 100) * 21));
    }

    return {
      machine_id: machineId,
      timestamp: new Date(),
      prediction_type: 'failure_prediction',
      
      // Core Predictions
      failure_probability: modelPrediction.failure_probability,
      failure_confidence: modelPrediction.confidence,
      days_to_failure_estimate: daysToFailure,
      remaining_useful_life_cycles: features.remaining_useful_cycles,
      
      // Health Indicators
      resistance_health_score: (1 - features.resistance_degradation_index) * 100,
      electrical_system_health: features.electrical_health_score * 100,
      thermal_system_health: (1 - features.thermal_stress_index) * 100,
      process_stability_health: features.process_stability_score * 100,
      
      // Risk Assessment
      overall_risk_level: riskLevel,
      critical_sensors: this.extractCriticalSensors(features, trends),
      risk_factors: this.generateRiskFactors(features, trends),
      
      // Maintenance Recommendations
      maintenance_urgency: maintenanceUrgency,
      recommended_actions: recommendations.map(r => ({
        action: `${r.action_type}: ${r.component} - ${r.description}`,
        priority: Math.ceil(r.urgency / 2),
        estimated_cost: r.estimated_cost,
        estimated_downtime_hours: r.estimated_time_hours
      })),
      
      // Degradation Analysis
      degradation_patterns: failurePatterns.map(p => ({
        pattern_type: p.pattern_type,
        confidence: p.confidence,
        trend_direction: p.confidence > 0.7 ? 'DEGRADING' : 'STABLE',
        rate_of_change: features.degradation_acceleration
      })),
      
      // Model Metadata
      model_version: 'contact-welder-v1.0',
      prediction_timestamp: new Date(),
      data_quality_score: dataQuality
    };
  }

  // Utility methods
  private groupBySensorType(readings: ContactWelderReading[]): Record<string, ContactWelderReading[]> {
    return readings.reduce((acc, reading) => {
      if (!acc[reading.sensor_type]) {
        acc[reading.sensor_type] = [];
      }
      acc[reading.sensor_type].push(reading);
      return acc;
    }, {} as Record<string, ContactWelderReading[]>);
  }

  private mean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const xMean = this.mean(x);
    const yMean = this.mean(values);
    
    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateTrendConfidence(values: number[]): number {
    const trend = this.calculateTrend(values);
    const predicted = values.map((_, i) => trend * i + (this.mean(values) - trend * (values.length - 1) / 2));
    
    let ssRes = 0;
    let ssTot = 0;
    const mean = this.mean(values);
    
    for (let i = 0; i < values.length; i++) {
      ssRes += Math.pow(values[i] - predicted[i], 2);
      ssTot += Math.pow(values[i] - mean, 2);
    }
    
    return ssTot === 0 ? 1 : Math.max(0, 1 - (ssRes / ssTot));
  }

  private extractFeatureImportance(prediction: any): Array<{ feature: string; importance: number }> {
    // Extract from model explanation if available
    if (prediction.explanations?.attributions) {
      return prediction.explanations.attributions
        .map((attr: any) => ({
          feature: attr.featureName,
          importance: Math.abs(attr.attribution)
        }))
        .sort((a: any, b: any) => b.importance - a.importance);
    }
    
    return [];
  }

  private extractCriticalSensors(features: ContactWelderFeatures, trends: TrendAnalysis[]): string[] {
    const critical = [];
    
    if (features.resistance_degradation_index > 0.7) critical.push('contact_resistance');
    if (features.thermal_stress_index > 0.6) critical.push('mold_temperature');
    if (features.electrical_health_score < 0.6) critical.push('weld_current', 'weld_voltage');
    
    // Add sensors with critical trends
    critical.push(...trends.filter(t => t.severity === 'CRITICAL').map(t => t.sensor_type));
    
    return [...new Set(critical)];
  }

  private generateRiskFactors(features: ContactWelderFeatures, trends: TrendAnalysis[]): Array<{
    factor: string;
    severity: number;
    description: string;
  }> {
    const factors = [];
    
    if (features.resistance_degradation_index > 0.5) {
      factors.push({
        factor: 'Contact Resistance Degradation',
        severity: features.resistance_degradation_index * 100,
        description: `Contact resistance has increased by ${(features.resistance_degradation_index * 100).toFixed(1)}% indicating wear`
      });
    }
    
    if (features.thermal_stress_index > 0.5) {
      factors.push({
        factor: 'Thermal Stress',
        severity: features.thermal_stress_index * 100,
        description: `Elevated operating temperatures causing thermal stress on components`
      });
    }
    
    if (features.degradation_acceleration > 0.1) {
      factors.push({
        factor: 'Accelerating Degradation',
        severity: Math.min(100, features.degradation_acceleration * 500),
        description: `Rate of degradation is increasing, indicating approaching failure`
      });
    }
    
    return factors.sort((a, b) => b.severity - a.severity);
  }
}

export default ContactWelderPredictionClient;