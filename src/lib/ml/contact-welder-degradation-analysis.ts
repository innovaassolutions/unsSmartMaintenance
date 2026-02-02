/**
 * Contact Welder Degradation Trend Analysis
 * Advanced predictive analytics for 2-4 week failure prediction
 * Uses time-series analysis and machine learning to detect gradual degradation patterns
 */

import { BigQuery } from '@google-cloud/bigquery';
import type { ContactWelderReading } from './contact-welder-features';

interface DegradationTrend {
  sensor_type: string;
  trend_type: 'LINEAR' | 'EXPONENTIAL' | 'CYCLIC' | 'STEP_CHANGE' | 'ACCELERATING';
  current_value: number;
  baseline_value: number;
  rate_of_change: number;                  // Units per day
  acceleration: number;                    // Change in rate per day
  r_squared: number;                       // Trend line fit quality (0-1)
  confidence_interval: {
    lower: number;
    upper: number;
  };
  projected_values: Array<{
    days_ahead: number;
    predicted_value: number;
    confidence_lower: number;
    confidence_upper: number;
  }>;
}

interface FailurePrediction {
  machine_id: string;
  analysis_timestamp: Date;
  prediction_horizon_days: number;
  
  // Primary Failure Indicators
  failure_probability_14_days: number;     // 0-100%
  failure_probability_21_days: number;     // 0-100%
  failure_probability_28_days: number;     // 0-100%
  
  // Degradation Timeline
  degradation_timeline: Array<{
    component: string;
    current_health: number;               // 0-100%
    projected_health_14_days: number;
    projected_health_21_days: number;
    projected_health_28_days: number;
    critical_threshold: number;
    days_to_critical: number | null;
  }>;
  
  // Risk Progression
  risk_progression: Array<{
    week: number;
    risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    primary_risk_factors: string[];
    maintenance_window: boolean;          // Is this a good week for maintenance?
  }>;
  
  // Early Warning Indicators
  early_warnings: Array<{
    indicator: string;
    current_status: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL';
    trend_direction: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    time_to_warning: number | null;       // Days until warning threshold
    time_to_critical: number | null;      // Days until critical threshold
  }>;
  
  // Optimal Maintenance Windows
  maintenance_recommendations: Array<{
    week_start: Date;
    week_end: Date;
    recommended_actions: string[];
    expected_downtime_hours: number;
    cost_estimate: number;
    risk_reduction: number;               // 0-100% risk reduction
    confidence: number;                   // 0-100% confidence in recommendation
  }>;
}

interface SeasonalPattern {
  pattern_type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  amplitude: number;                      // Strength of seasonal effect
  phase_shift: number;                    // Time offset of pattern
  significance: number;                   // Statistical significance (0-1)
  description: string;
}

interface AnomalyDetection {
  anomaly_type: 'SPIKE' | 'DIP' | 'DRIFT' | 'PATTERN_BREAK';
  timestamp: Date;
  sensor_type: string;
  severity: number;                       // 0-100%
  expected_value: number;
  actual_value: number;
  deviation_sigma: number;                // How many standard deviations from normal
  potential_causes: string[];
  immediate_action_required: boolean;
}

export class ContactWelderDegradationAnalysis {
  private bigQuery: BigQuery;
  private projectId: string;
  
  // Degradation thresholds for Contact Welder components
  private readonly DEGRADATION_THRESHOLDS = {
    contact_resistance: {
      normal: 2.0,      // mOhms
      warning: 3.5,     // mOhms
      critical: 5.0,    // mOhms
      failure: 7.0      // mOhms
    },
    mold_temperature: {
      normal: 120,      // Celsius
      warning: 150,     // Celsius
      critical: 180,    // Celsius
      failure: 200      // Celsius
    },
    weld_current: {
      normal: 5000,     // Amps (baseline)
      warning: 8000,    // Amps (high)
      critical: 8500,   // Amps (very high)
      failure: 9000     // Amps (excessive)
    },
    weld_voltage: {
      normal: 5.0,      // Volts (baseline)
      warning: 7.0,     // Volts (high)
      critical: 8.0,    // Volts (very high)
      failure: 10.0     // Volts (excessive)
    }
  };

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT || 'uns-smart-maintenance-ml';
    this.bigQuery = new BigQuery({
      projectId: this.projectId,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
  }

  /**
   * Perform comprehensive degradation analysis for 2-4 week failure prediction
   */
  async analyzeDegradationTrends(
    machineId: string,
    analysisWindowDays: number = 30,
    predictionHorizonDays: number = 28
  ): Promise<FailurePrediction> {
    
    console.log(`📈 Starting degradation analysis for Contact Welder ${machineId}`);
    
    // Step 1: Extract historical sensor data
    const historicalData = await this.extractHistoricalData(machineId, analysisWindowDays);
    if (historicalData.length === 0) {
      throw new Error(`No historical data available for machine ${machineId}`);
    }
    
    // Step 2: Analyze trends for each sensor type
    const sensorTrends = await this.analyzeSensorTrends(historicalData);
    
    // Step 3: Detect seasonal patterns
    const seasonalPatterns = await this.detectSeasonalPatterns(historicalData);
    
    // Step 4: Identify anomalies
    const anomalies = await this.detectAnomalies(historicalData);
    
    // Step 5: Project future degradation
    const degradationTimeline = await this.projectDegradation(sensorTrends, predictionHorizonDays);
    
    // Step 6: Calculate failure probabilities
    const failureProbabilities = this.calculateFailureProbabilities(
      degradationTimeline, 
      sensorTrends,
      anomalies
    );
    
    // Step 7: Generate risk progression analysis
    const riskProgression = this.analyzeRiskProgression(degradationTimeline, predictionHorizonDays);
    
    // Step 8: Identify early warning indicators
    const earlyWarnings = this.identifyEarlyWarnings(sensorTrends, degradationTimeline);
    
    // Step 9: Optimize maintenance windows
    const maintenanceRecommendations = this.optimizeMaintenanceWindows(
      degradationTimeline,
      riskProgression,
      predictionHorizonDays
    );

    const prediction: FailurePrediction = {
      machine_id: machineId,
      analysis_timestamp: new Date(),
      prediction_horizon_days: predictionHorizonDays,
      failure_probability_14_days: failureProbabilities.days_14,
      failure_probability_21_days: failureProbabilities.days_21,
      failure_probability_28_days: failureProbabilities.days_28,
      degradation_timeline,
      risk_progression,
      early_warnings,
      maintenance_recommendations
    };

    console.log(`✅ Degradation analysis complete for ${machineId}`);
    console.log(`📊 Failure probabilities: 14d=${failureProbabilities.days_14}%, 21d=${failureProbabilities.days_21}%, 28d=${failureProbabilities.days_28}%`);
    
    return prediction;
  }

  /**
   * Extract historical sensor data for analysis
   * Note: In our schema, sensor types are stored in machine_id field
   */
  private async extractHistoricalData(
    sensorType: string, 
    windowDays: number
  ): Promise<ContactWelderReading[]> {
    // First, let's check what data is actually available
    console.log(`🔍 Querying BigQuery for sensor type: ${sensorType}`);
    
    const query = `
      SELECT 
        TIMESTAMP_TRUNC(timestamp, HOUR) as timestamp,
        machine_id as machine_id,
        machine_id as sensor_type,
        AVG(value) as value,
        0 as quality_code,
        CASE machine_id
          WHEN 'contact_resistance' THEN 'mOhm'
          WHEN 'weld_current' THEN 'A'
          WHEN 'weld_voltage' THEN 'V' 
          WHEN 'mold_temperature' THEN 'C'
          ELSE 'unknown'
        END as unit,
        '' as location_path
      FROM \`${this.projectId}.relay_manufacturing.sensor_readings\`
      WHERE machine_id IN ('contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature')
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${windowDays} DAY)
      GROUP BY TIMESTAMP_TRUNC(timestamp, HOUR), machine_id
      HAVING COUNT(*) >= 1
      ORDER BY timestamp ASC, machine_id
      LIMIT 10000
    `;

    console.log('📊 Executing BigQuery for ML data extraction...');
    const [rows] = await this.bigQuery.query(query);
    
    console.log(`✅ Retrieved ${rows.length} data points for ML analysis`);
    
    if (rows.length === 0) {
      console.log('⚠️ No data found. Let me check what data is available...');
      
      // Diagnostic query to see what data exists
      const diagnosticQuery = `
        SELECT 
          machine_id,
          COUNT(*) as record_count,
          MIN(timestamp) as earliest,
          MAX(timestamp) as latest
        FROM \`${this.projectId}.relay_manufacturing.sensor_readings\`
        WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
        GROUP BY machine_id
        ORDER BY record_count DESC
        LIMIT 10
      `;
      
      const [diagnosticRows] = await this.bigQuery.query(diagnosticQuery);
      console.log('📋 Available data in last 7 days:', diagnosticRows);
    }
    
    return rows.map((row: any) => ({
      timestamp: new Date(row.timestamp.value),
      machine_id: row.machine_id,
      sensor_type: row.sensor_type as any,
      value: parseFloat(row.value),
      quality_code: row.quality_code,
      unit: row.unit,
      location_path: row.location_path
    }));
  }

  /**
   * Analyze degradation trends for each sensor type
   */
  private async analyzeSensorTrends(data: ContactWelderReading[]): Promise<Record<string, DegradationTrend>> {
    const sensorGroups = this.groupBySensorType(data);
    const trends: Record<string, DegradationTrend> = {};

    for (const [sensorType, readings] of Object.entries(sensorGroups)) {
      const values = readings.map(r => r.value);
      const timestamps = readings.map(r => r.timestamp.getTime());
      
      if (values.length < 10) continue; // Need sufficient data for trend analysis

      // Calculate linear trend
      const linearTrend = this.calculateLinearTrend(timestamps, values);
      
      // Calculate exponential trend if linear fit is poor
      const exponentialTrend = linearTrend.r_squared < 0.7 ? 
        this.calculateExponentialTrend(timestamps, values) : null;
      
      // Choose best fit trend
      const bestTrend = exponentialTrend && exponentialTrend.r_squared > linearTrend.r_squared ? 
        exponentialTrend : linearTrend;
      
      // Calculate confidence intervals
      const confidenceInterval = this.calculateConfidenceInterval(timestamps, values, bestTrend);
      
      // Project future values
      const projectedValues = this.projectFutureValues(bestTrend, confidenceInterval, 28);
      
      // Detect acceleration in degradation
      const acceleration = this.detectAcceleration(timestamps, values);

      trends[sensorType] = {
        sensor_type: sensorType,
        trend_type: this.classifyTrendType(bestTrend, acceleration),
        current_value: values[values.length - 1],
        baseline_value: values[0],
        rate_of_change: bestTrend.slope * 24, // Convert from per-hour to per-day
        acceleration: acceleration,
        r_squared: bestTrend.r_squared,
        confidence_interval: confidenceInterval,
        projected_values: projectedValues
      };
    }

    return trends;
  }

  /**
   * Project component health degradation over time
   */
  private async projectDegradation(
    trends: Record<string, DegradationTrend>,
    horizonDays: number
  ): Promise<FailurePrediction['degradation_timeline']> {
    const timeline = [];
    
    for (const [sensorType, trend] of Object.entries(trends)) {
      const thresholds = this.DEGRADATION_THRESHOLDS[sensorType as keyof typeof this.DEGRADATION_THRESHOLDS];
      if (!thresholds) continue;

      // Calculate current health percentage
      const currentHealth = this.calculateHealthPercentage(trend.current_value, thresholds);
      
      // Project health at different time horizons
      const projections = {
        '14_days': this.projectHealthAtDays(trend, thresholds, 14),
        '21_days': this.projectHealthAtDays(trend, thresholds, 21),
        '28_days': this.projectHealthAtDays(trend, thresholds, 28)
      };

      // Calculate days to critical threshold
      const daysToCritical = this.calculateDaysToCritical(trend, thresholds);

      timeline.push({
        component: this.getComponentName(sensorType),
        current_health: currentHealth,
        projected_health_14_days: projections['14_days'],
        projected_health_21_days: projections['21_days'],
        projected_health_28_days: projections['28_days'],
        critical_threshold: thresholds.critical,
        days_to_critical: daysToCritical
      });
    }

    return timeline;
  }

  /**
   * Calculate failure probabilities for different time horizons
   */
  private calculateFailureProbabilities(
    timeline: FailurePrediction['degradation_timeline'],
    trends: Record<string, DegradationTrend>,
    anomalies: AnomalyDetection[]
  ): { days_14: number; days_21: number; days_28: number } {
    
    // Weight different failure indicators
    const weights = {
      resistance: 0.45,     // Contact resistance is primary failure indicator
      temperature: 0.25,    // Thermal stress is secondary
      electrical: 0.20,     // Current/voltage stability
      anomalies: 0.10       // Recent anomalies
    };

    const calculateProbabilityForDays = (days: number): number => {
      let totalProbability = 0;
      
      // Resistance-based probability
      const resistanceComponent = timeline.find(t => t.component.includes('Contact'));
      if (resistanceComponent) {
        const healthAtDays = days === 14 ? resistanceComponent.projected_health_14_days :
                            days === 21 ? resistanceComponent.projected_health_21_days :
                            resistanceComponent.projected_health_28_days;
        const resistanceProbability = Math.max(0, 100 - healthAtDays) / 100;
        totalProbability += resistanceProbability * weights.resistance;
      }
      
      // Temperature-based probability
      const temperatureComponent = timeline.find(t => t.component.includes('Thermal'));
      if (temperatureComponent) {
        const healthAtDays = days === 14 ? temperatureComponent.projected_health_14_days :
                            days === 21 ? temperatureComponent.projected_health_21_days :
                            temperatureComponent.projected_health_28_days;
        const temperatureProbability = Math.max(0, 100 - healthAtDays) / 100;
        totalProbability += temperatureProbability * weights.temperature;
      }
      
      // Electrical system probability (average of current and voltage)
      const electricalComponents = timeline.filter(t => 
        t.component.includes('Current') || t.component.includes('Voltage')
      );
      if (electricalComponents.length > 0) {
        const avgElectricalHealth = electricalComponents.reduce((sum, comp) => {
          const healthAtDays = days === 14 ? comp.projected_health_14_days :
                              days === 21 ? comp.projected_health_21_days :
                              comp.projected_health_28_days;
          return sum + healthAtDays;
        }, 0) / electricalComponents.length;
        
        const electricalProbability = Math.max(0, 100 - avgElectricalHealth) / 100;
        totalProbability += electricalProbability * weights.electrical;
      }
      
      // Anomaly-based probability boost
      const recentAnomalies = anomalies.filter(a => 
        a.severity >= 60 && 
        (Date.now() - a.timestamp.getTime()) / (1000 * 60 * 60 * 24) <= 7 // Last week
      );
      const anomalyBoost = Math.min(0.3, recentAnomalies.length * 0.1);
      totalProbability += anomalyBoost * weights.anomalies;
      
      return Math.min(100, totalProbability * 100);
    };

    return {
      days_14: Math.round(calculateProbabilityForDays(14)),
      days_21: Math.round(calculateProbabilityForDays(21)),
      days_28: Math.round(calculateProbabilityForDays(28))
    };
  }

  /**
   * Analyze risk progression over time
   */
  private analyzeRiskProgression(
    timeline: FailurePrediction['degradation_timeline'],
    horizonDays: number
  ): FailurePrediction['risk_progression'] {
    const progression = [];
    const weeksInHorizon = Math.ceil(horizonDays / 7);
    
    for (let week = 1; week <= weeksInHorizon; week++) {
      const daysAhead = week * 7;
      let weeklyRiskScore = 0;
      const riskFactors = [];
      
      for (const component of timeline) {
        let healthAtWeek: number;
        
        if (daysAhead <= 14) {
          healthAtWeek = component.projected_health_14_days;
        } else if (daysAhead <= 21) {
          healthAtWeek = component.projected_health_21_days;
        } else {
          healthAtWeek = component.projected_health_28_days;
        }
        
        const componentRisk = 100 - healthAtWeek;
        weeklyRiskScore = Math.max(weeklyRiskScore, componentRisk);
        
        if (componentRisk >= 60) {
          riskFactors.push(component.component);
        }
      }
      
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      if (weeklyRiskScore >= 80) riskLevel = 'CRITICAL';
      else if (weeklyRiskScore >= 60) riskLevel = 'HIGH';
      else if (weeklyRiskScore >= 40) riskLevel = 'MEDIUM';
      else riskLevel = 'LOW';
      
      // Determine if this is a good maintenance window
      // Good windows: Medium risk (catching problems early) but not critical (can wait)
      const maintenanceWindow = riskLevel === 'MEDIUM' || riskLevel === 'HIGH';
      
      progression.push({
        week,
        risk_level: riskLevel,
        primary_risk_factors: riskFactors,
        maintenance_window: maintenanceWindow
      });
    }
    
    return progression;
  }

  /**
   * Identify early warning indicators
   */
  private identifyEarlyWarnings(
    trends: Record<string, DegradationTrend>,
    timeline: FailurePrediction['degradation_timeline']
  ): FailurePrediction['early_warnings'] {
    const warnings = [];
    
    for (const [sensorType, trend] of Object.entries(trends)) {
      const thresholds = this.DEGRADATION_THRESHOLDS[sensorType as keyof typeof this.DEGRADATION_THRESHOLDS];
      if (!thresholds) continue;
      
      const timelineComponent = timeline.find(t => 
        t.component.toLowerCase().includes(sensorType.split('_')[0])
      );
      
      let status: 'NORMAL' | 'WATCH' | 'WARNING' | 'CRITICAL' = 'NORMAL';
      if (trend.current_value >= thresholds.critical) status = 'CRITICAL';
      else if (trend.current_value >= thresholds.warning) status = 'WARNING';
      else if (trend.rate_of_change > 0 && trend.acceleration > 0) status = 'WATCH';
      
      let trendDirection: 'IMPROVING' | 'STABLE' | 'DEGRADING' = 'STABLE';
      if (trend.rate_of_change > 0.1) trendDirection = 'DEGRADING';
      else if (trend.rate_of_change < -0.1) trendDirection = 'IMPROVING';
      
      // Calculate time to warning/critical thresholds
      const timeToWarning = trend.rate_of_change > 0 ? 
        Math.ceil((thresholds.warning - trend.current_value) / trend.rate_of_change) : null;
      const timeToCritical = trend.rate_of_change > 0 ? 
        Math.ceil((thresholds.critical - trend.current_value) / trend.rate_of_change) : null;
      
      warnings.push({
        indicator: this.getIndicatorName(sensorType),
        current_status: status,
        trend_direction: trendDirection,
        time_to_warning: timeToWarning && timeToWarning > 0 ? timeToWarning : null,
        time_to_critical: timeToCritical && timeToCritical > 0 ? timeToCritical : null
      });
    }
    
    return warnings;
  }

  /**
   * Optimize maintenance windows based on risk progression
   */
  private optimizeMaintenanceWindows(
    timeline: FailurePrediction['degradation_timeline'],
    riskProgression: FailurePrediction['risk_progression'],
    horizonDays: number
  ): FailurePrediction['maintenance_recommendations'] {
    const recommendations = [];
    const now = new Date();
    
    for (let week = 1; week <= Math.ceil(horizonDays / 7); week++) {
      const weekStart = new Date(now.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const weeklyRisk = riskProgression.find(r => r.week === week);
      if (!weeklyRisk || !weeklyRisk.maintenance_window) continue;
      
      const actions = [];
      let totalCost = 0;
      let totalDowntime = 0;
      let riskReduction = 0;
      
      // Determine maintenance actions based on component health
      for (const component of timeline) {
        if (component.days_to_critical && component.days_to_critical <= week * 7 + 7) {
          if (component.component.includes('Contact')) {
            actions.push('Replace contact tips and electrode assembly');
            totalCost += 300;
            totalDowntime += 4;
            riskReduction += 40;
          }
          if (component.component.includes('Thermal')) {
            actions.push('Inspect and service cooling system');
            totalCost += 150;
            totalDowntime += 2;
            riskReduction += 20;
          }
          if (component.component.includes('Current') || component.component.includes('Voltage')) {
            actions.push('Calibrate electrical parameters');
            totalCost += 100;
            totalDowntime += 3;
            riskReduction += 15;
          }
        }
      }
      
      if (actions.length > 0) {
        recommendations.push({
          week_start: weekStart,
          week_end: weekEnd,
          recommended_actions: actions,
          expected_downtime_hours: totalDowntime,
          cost_estimate: totalCost,
          risk_reduction: Math.min(100, riskReduction),
          confidence: 85 // Base confidence for maintenance recommendations
        });
      }
    }
    
    return recommendations;
  }

  // Utility methods for calculations
  private groupBySensorType(readings: ContactWelderReading[]): Record<string, ContactWelderReading[]> {
    return readings.reduce((acc, reading) => {
      if (!acc[reading.sensor_type]) {
        acc[reading.sensor_type] = [];
      }
      acc[reading.sensor_type].push(reading);
      return acc;
    }, {} as Record<string, ContactWelderReading[]>);
  }

  private calculateLinearTrend(timestamps: number[], values: number[]): {
    slope: number;
    intercept: number;
    r_squared: number;
  } {
    const n = values.length;
    const meanX = timestamps.reduce((sum, t) => sum + t, 0) / n;
    const meanY = values.reduce((sum, v) => sum + v, 0) / n;
    
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = timestamps[i] - meanX;
      const deltaY = values[i] - meanY;
      numerator += deltaX * deltaY;
      denominator += deltaX * deltaX;
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator;
    const intercept = meanY - slope * meanX;
    
    // Calculate R-squared
    let ssRes = 0;
    let ssTot = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = slope * timestamps[i] + intercept;
      ssRes += Math.pow(values[i] - predicted, 2);
      ssTot += Math.pow(values[i] - meanY, 2);
    }
    
    const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
    
    return { slope, intercept, r_squared: Math.max(0, rSquared) };
  }

  private calculateExponentialTrend(timestamps: number[], values: number[]): {
    slope: number;
    intercept: number;
    r_squared: number;
  } | null {
    // Try exponential fit by linearizing: ln(y) = ax + b
    const logValues = values.map(v => v > 0 ? Math.log(v) : null).filter(v => v !== null) as number[];
    
    if (logValues.length < values.length * 0.8) {
      return null; // Too many non-positive values
    }
    
    return this.calculateLinearTrend(timestamps.slice(0, logValues.length), logValues);
  }

  private calculateConfidenceInterval(
    timestamps: number[], 
    values: number[], 
    trend: { slope: number; intercept: number; r_squared: number }
  ): { lower: number; upper: number } {
    // Simple confidence interval calculation
    let sumSquaredErrors = 0;
    for (let i = 0; i < values.length; i++) {
      const predicted = trend.slope * timestamps[i] + trend.intercept;
      sumSquaredErrors += Math.pow(values[i] - predicted, 2);
    }
    
    const standardError = Math.sqrt(sumSquaredErrors / (values.length - 2));
    const marginOfError = 1.96 * standardError; // 95% confidence interval
    
    return {
      lower: -marginOfError,
      upper: marginOfError
    };
  }

  private projectFutureValues(
    trend: { slope: number; intercept: number },
    confidence: { lower: number; upper: number },
    daysAhead: number
  ): DegradationTrend['projected_values'] {
    const projections = [];
    const currentTime = Date.now();
    
    for (let day = 7; day <= daysAhead; day += 7) { // Weekly projections
      const futureTimestamp = currentTime + (day * 24 * 60 * 60 * 1000);
      const predictedValue = trend.slope * futureTimestamp + trend.intercept;
      
      projections.push({
        days_ahead: day,
        predicted_value: predictedValue,
        confidence_lower: predictedValue + confidence.lower,
        confidence_upper: predictedValue + confidence.upper
      });
    }
    
    return projections;
  }

  private detectAcceleration(timestamps: number[], values: number[]): number {
    if (values.length < 10) return 0;
    
    // Calculate acceleration by comparing trend slopes in different periods
    const midpoint = Math.floor(values.length / 2);
    
    const firstHalf = this.calculateLinearTrend(
      timestamps.slice(0, midpoint),
      values.slice(0, midpoint)
    );
    
    const secondHalf = this.calculateLinearTrend(
      timestamps.slice(midpoint),
      values.slice(midpoint)
    );
    
    return secondHalf.slope - firstHalf.slope;
  }

  private classifyTrendType(
    trend: { slope: number; r_squared: number },
    acceleration: number
  ): DegradationTrend['trend_type'] {
    if (Math.abs(acceleration) > Math.abs(trend.slope) * 0.5) {
      return 'ACCELERATING';
    }
    
    if (trend.r_squared < 0.6) {
      return 'CYCLIC';
    }
    
    if (Math.abs(trend.slope) < 0.01) {
      return 'STEP_CHANGE';
    }
    
    return trend.r_squared > 0.8 ? 'LINEAR' : 'EXPONENTIAL';
  }

  private calculateHealthPercentage(
    currentValue: number,
    thresholds: { normal: number; warning: number; critical: number; failure: number }
  ): number {
    if (currentValue <= thresholds.normal) return 100;
    if (currentValue >= thresholds.failure) return 0;
    
    // Linear interpolation between normal and failure
    const healthPercentage = 100 * (1 - (currentValue - thresholds.normal) / (thresholds.failure - thresholds.normal));
    return Math.max(0, Math.min(100, healthPercentage));
  }

  private projectHealthAtDays(
    trend: DegradationTrend,
    thresholds: { normal: number; warning: number; critical: number; failure: number },
    days: number
  ): number {
    const projectedValue = trend.current_value + (trend.rate_of_change * days);
    return this.calculateHealthPercentage(projectedValue, thresholds);
  }

  private calculateDaysToCritical(
    trend: DegradationTrend,
    thresholds: { critical: number }
  ): number | null {
    if (trend.rate_of_change <= 0) return null; // Not degrading
    
    const daysToCritical = (thresholds.critical - trend.current_value) / trend.rate_of_change;
    return daysToCritical > 0 ? Math.ceil(daysToCritical) : null;
  }

  private detectSeasonalPatterns(data: ContactWelderReading[]): Promise<SeasonalPattern[]> {
    // Placeholder for seasonal pattern detection
    // In production, would implement FFT or other time-series analysis
    return Promise.resolve([]);
  }

  private detectAnomalies(data: ContactWelderReading[]): Promise<AnomalyDetection[]> {
    // Placeholder for anomaly detection
    // In production, would implement statistical anomaly detection
    return Promise.resolve([]);
  }

  private getComponentName(sensorType: string): string {
    const componentMap: Record<string, string> = {
      'contact_resistance': 'Contact Tips & Electrodes',
      'mold_temperature': 'Thermal Management System',
      'weld_current': 'Current Control System',
      'weld_voltage': 'Voltage Regulation System'
    };
    return componentMap[sensorType] || sensorType;
  }

  private getIndicatorName(sensorType: string): string {
    const indicatorMap: Record<string, string> = {
      'contact_resistance': 'Contact Resistance Degradation',
      'mold_temperature': 'Thermal Stress Level',
      'weld_current': 'Current Stability',
      'weld_voltage': 'Voltage Regulation'
    };
    return indicatorMap[sensorType] || sensorType;
  }
}

export default ContactWelderDegradationAnalysis;