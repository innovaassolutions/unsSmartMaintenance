/**
 * Contact Welder Predictive Maintenance Feature Engineering
 * Specialized feature extraction for Contact Welder machines with 4 key sensors:
 * - contact_resistance (649K records) - Primary failure indicator
 * - weld_current (709K records) - Process stability indicator
 * - weld_voltage (709K records) - Power delivery indicator  
 * - mold_temperature (711K records) - Thermal stress indicator
 */

export interface ContactWelderReading {
  timestamp: Date;
  machine_id: string;
  sensor_type: 'contact_resistance' | 'weld_current' | 'weld_voltage' | 'mold_temperature';
  value: number;
  quality_code: number;
  unit: string;
  location_path: string;
}

export interface ContactWelderFeatures {
  // Primary Indicators
  resistance_degradation_index: number;     // 0-1 scale, 1 = severe degradation
  electrical_health_score: number;          // 0-1 scale, 1 = excellent health
  thermal_stress_index: number;             // 0-1 scale, 1 = high stress
  process_stability_score: number;          // 0-1 scale, 1 = very stable
  
  // Multi-variate Analysis
  weld_quality_trend: number;               // -1 to 1, positive = improving
  power_efficiency_index: number;           // 0-1 scale, 1 = optimal efficiency
  thermal_electrical_coupling: number;      // Correlation strength 0-1
  failure_risk_score: number;               // 0-100, higher = more risk
  
  // Temporal Features
  resistance_drift_rate: number;            // Ohms per day
  temperature_cycling_stress: number;       // Temperature variance indicator
  current_consistency_index: number;        // Process repeatability 0-1
  voltage_stability_factor: number;         // Power delivery consistency
  
  // Advanced Predictive Features
  remaining_useful_cycles: number;          // Estimated cycles before failure
  degradation_acceleration: number;         // Rate of degradation increase
  critical_threshold_proximity: number;     // How close to failure thresholds
  maintenance_urgency_score: number;        // 0-100, 100 = immediate action needed
}

interface ContactWelderFailurePattern {
  pattern_type: 'gradual_resistance_increase' | 'thermal_runaway' | 'current_instability' | 'voltage_fluctuation';
  confidence: number;
  days_to_failure_estimate: number;
  critical_sensors: string[];
  failure_probability: number;
}

export class ContactWelderFeatureEngineer {
  private readonly RESISTANCE_NORMAL_RANGE = { min: 0.1, max: 2.0 }; // mOhms
  private readonly CURRENT_NORMAL_RANGE = { min: 1000, max: 8000 };   // Amps
  private readonly VOLTAGE_NORMAL_RANGE = { min: 2.0, max: 8.0 };     // Volts
  private readonly TEMPERATURE_NORMAL_RANGE = { min: 20, max: 150 };  // Celsius
  
  private readonly CRITICAL_RESISTANCE_THRESHOLD = 5.0; // mOhms - failure imminent
  private readonly CRITICAL_TEMPERATURE_THRESHOLD = 200; // Celsius - overheating risk

  /**
   * Generate comprehensive Contact Welder features for predictive maintenance
   */
  async generateContactWelderFeatures(
    machineId: string,
    sensorReadings: ContactWelderReading[],
    timeWindowHours: number = 168 // Default: 1 week
  ): Promise<ContactWelderFeatures> {
    
    // Group readings by sensor type
    const sensorGroups = this.groupBySensorType(sensorReadings);
    
    // Validate we have all required sensors
    this.validateSensorData(sensorGroups);
    
    // Extract core sensor data
    const resistance = this.extractValues(sensorGroups.contact_resistance);
    const current = this.extractValues(sensorGroups.weld_current);
    const voltage = this.extractValues(sensorGroups.weld_voltage);
    const temperature = this.extractValues(sensorGroups.mold_temperature);
    
    return {
      // Primary Health Indicators
      resistance_degradation_index: this.calculateResistanceDegradation(resistance),
      electrical_health_score: this.calculateElectricalHealth(current, voltage, resistance),
      thermal_stress_index: this.calculateThermalStress(temperature),
      process_stability_score: this.calculateProcessStability(current, voltage),
      
      // Multi-variate Analysis
      weld_quality_trend: this.calculateWeldQualityTrend(resistance, current, voltage),
      power_efficiency_index: this.calculatePowerEfficiency(current, voltage),
      thermal_electrical_coupling: this.calculateThermalElectricalCoupling(temperature, resistance),
      failure_risk_score: this.calculateFailureRiskScore(resistance, temperature, current),
      
      // Temporal Features
      resistance_drift_rate: this.calculateResistanceDriftRate(resistance, sensorGroups.contact_resistance),
      temperature_cycling_stress: this.calculateTemperatureCyclingStress(temperature),
      current_consistency_index: this.calculateCurrentConsistency(current),
      voltage_stability_factor: this.calculateVoltageStability(voltage),
      
      // Advanced Predictive Features
      remaining_useful_cycles: this.estimateRemainingUsefulCycles(resistance, current),
      degradation_acceleration: this.calculateDegradationAcceleration(resistance),
      critical_threshold_proximity: this.calculateThresholdProximity(resistance, temperature),
      maintenance_urgency_score: this.calculateMaintenanceUrgency(resistance, temperature, current)
    };
  }

  /**
   * Detect specific failure patterns in Contact Welder data
   */
  async detectFailurePatterns(
    sensorReadings: ContactWelderReading[]
  ): Promise<ContactWelderFailurePattern[]> {
    
    const sensorGroups = this.groupBySensorType(sensorReadings);
    const patterns: ContactWelderFailurePattern[] = [];
    
    // Pattern 1: Gradual Resistance Increase (most common failure mode)
    const resistancePattern = this.detectGradualResistanceIncrease(sensorGroups.contact_resistance);
    if (resistancePattern.confidence > 0.6) {
      patterns.push(resistancePattern);
    }
    
    // Pattern 2: Thermal Runaway
    const thermalPattern = this.detectThermalRunaway(sensorGroups.mold_temperature, sensorGroups.contact_resistance);
    if (thermalPattern.confidence > 0.6) {
      patterns.push(thermalPattern);
    }
    
    // Pattern 3: Current Instability
    const currentPattern = this.detectCurrentInstability(sensorGroups.weld_current);
    if (currentPattern.confidence > 0.6) {
      patterns.push(currentPattern);
    }
    
    // Pattern 4: Voltage Fluctuation
    const voltagePattern = this.detectVoltageFluctuation(sensorGroups.weld_voltage);
    if (voltagePattern.confidence > 0.6) {
      patterns.push(voltagePattern);
    }
    
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate Contact Resistance Degradation Index (primary failure indicator)
   */
  private calculateResistanceDegradation(resistance: number[]): number {
    if (resistance.length === 0) return 0;
    
    const currentResistance = this.mean(resistance.slice(-24)); // Last 24 readings
    const baselineResistance = this.mean(resistance.slice(0, 24)); // First 24 readings
    
    // Degradation based on increase from baseline
    const degradationRatio = currentResistance / (baselineResistance || 1);
    
    // Normalize to 0-1 scale where 1 = critical degradation
    const degradationIndex = Math.min(1, Math.max(0, (degradationRatio - 1) / 4)); // 5x increase = max degradation
    
    return degradationIndex;
  }

  /**
   * Calculate Electrical Health Score (current, voltage, resistance harmony)
   */
  private calculateElectricalHealth(current: number[], voltage: number[], resistance: number[]): number {
    // Ohm's law consistency check: V = I * R
    const expectedVoltage = current.map((i, idx) => i * (resistance[idx] || 0) / 1000); // mV to V conversion
    const actualVoltage = voltage;
    
    let ohmLawConsistency = 0;
    let validMeasurements = 0;
    
    for (let i = 0; i < Math.min(expectedVoltage.length, actualVoltage.length); i++) {
      if (expectedVoltage[i] > 0 && actualVoltage[i] > 0) {
        const deviation = Math.abs(expectedVoltage[i] - actualVoltage[i]) / expectedVoltage[i];
        ohmLawConsistency += Math.max(0, 1 - deviation);
        validMeasurements++;
      }
    }
    
    const ohmScore = validMeasurements > 0 ? ohmLawConsistency / validMeasurements : 0;
    
    // Range health scores
    const currentHealth = this.calculateRangeHealth(current, this.CURRENT_NORMAL_RANGE);
    const voltageHealth = this.calculateRangeHealth(voltage, this.VOLTAGE_NORMAL_RANGE);
    const resistanceHealth = this.calculateRangeHealth(resistance, this.RESISTANCE_NORMAL_RANGE);
    
    return (ohmScore + currentHealth + voltageHealth + resistanceHealth) / 4;
  }

  /**
   * Calculate Thermal Stress Index
   */
  private calculateThermalStress(temperature: number[]): number {
    if (temperature.length === 0) return 0;
    
    const maxTemp = Math.max(...temperature);
    const meanTemp = this.mean(temperature);
    const tempVariance = this.standardDeviation(temperature);
    
    // Stress factors
    const maxTempStress = Math.min(1, maxTemp / this.CRITICAL_TEMPERATURE_THRESHOLD);
    const meanTempStress = Math.min(1, Math.max(0, (meanTemp - this.TEMPERATURE_NORMAL_RANGE.max) / 50));
    const variabilityStress = Math.min(1, tempVariance / 30); // High variability = stress
    
    return (maxTempStress + meanTempStress + variabilityStress) / 3;
  }

  /**
   * Calculate Process Stability Score
   */
  private calculateProcessStability(current: number[], voltage: number[]): number {
    const currentCV = this.coefficientOfVariation(current);
    const voltageCV = this.coefficientOfVariation(voltage);
    
    // Lower coefficient of variation = higher stability
    const currentStability = Math.max(0, 1 - currentCV);
    const voltageStability = Math.max(0, 1 - voltageCV);
    
    return (currentStability + voltageStability) / 2;
  }

  /**
   * Calculate Weld Quality Trend
   */
  private calculateWeldQualityTrend(resistance: number[], current: number[], voltage: number[]): number {
    // Quality trend based on resistance stability and electrical consistency
    const resistanceTrend = this.calculateTrend(resistance);
    const currentTrend = this.calculateTrend(current);
    const voltageTrend = this.calculateTrend(voltage);
    
    // Negative resistance trend is good (decreasing resistance)
    // Stable current and voltage trends are good
    const qualityTrend = -resistanceTrend + (1 - Math.abs(currentTrend)) + (1 - Math.abs(voltageTrend));
    
    return Math.max(-1, Math.min(1, qualityTrend / 3));
  }

  /**
   * Calculate Power Efficiency Index
   */
  private calculatePowerEfficiency(current: number[], voltage: number[]): number {
    if (current.length !== voltage.length || current.length === 0) return 0;
    
    let totalPower = 0;
    let optimalPowerSum = 0;
    
    for (let i = 0; i < current.length; i++) {
      const actualPower = current[i] * voltage[i];
      const optimalPower = 5000 * 4; // Assume optimal: 5000A * 4V
      
      totalPower += actualPower;
      optimalPowerSum += optimalPower;
    }
    
    return optimalPowerSum > 0 ? Math.min(1, totalPower / optimalPowerSum) : 0;
  }

  /**
   * Calculate Thermal-Electrical Coupling
   */
  private calculateThermalElectricalCoupling(temperature: number[], resistance: number[]): number {
    return Math.abs(this.correlation(temperature, resistance));
  }

  /**
   * Calculate Overall Failure Risk Score (0-100)
   */
  private calculateFailureRiskScore(resistance: number[], temperature: number[], current: number[]): number {
    const resistanceRisk = this.calculateResistanceDegradation(resistance) * 40; // 40% weight
    const thermalRisk = this.calculateThermalStress(temperature) * 30; // 30% weight
    const electricalRisk = (1 - this.calculateCurrentConsistency(current)) * 30; // 30% weight
    
    return Math.min(100, resistanceRisk + thermalRisk + electricalRisk);
  }

  /**
   * Detect Gradual Resistance Increase Pattern
   */
  private detectGradualResistanceIncrease(resistanceReadings: ContactWelderReading[]): ContactWelderFailurePattern {
    const values = this.extractValues(resistanceReadings);
    const trend = this.calculateTrend(values);
    const currentLevel = this.mean(values.slice(-24));
    
    const confidence = Math.min(1, Math.max(0, 
      (trend * 0.5) + // Positive trend increases confidence
      (currentLevel / this.CRITICAL_RESISTANCE_THRESHOLD * 0.5) // High resistance increases confidence
    ));
    
    const daysToFailure = trend > 0 ? 
      Math.max(1, (this.CRITICAL_RESISTANCE_THRESHOLD - currentLevel) / (trend * 24)) : 
      Infinity;
    
    return {
      pattern_type: 'gradual_resistance_increase',
      confidence,
      days_to_failure_estimate: Math.min(365, daysToFailure),
      critical_sensors: ['contact_resistance'],
      failure_probability: confidence * 100
    };
  }

  /**
   * Detect Thermal Runaway Pattern
   */
  private detectThermalRunaway(tempReadings: ContactWelderReading[], resistanceReadings: ContactWelderReading[]): ContactWelderFailurePattern {
    const temperatures = this.extractValues(tempReadings);
    const resistance = this.extractValues(resistanceReadings);
    
    const tempTrend = this.calculateTrend(temperatures);
    const resistanceTrend = this.calculateTrend(resistance);
    const correlation = this.correlation(temperatures, resistance);
    
    const confidence = Math.min(1, Math.max(0,
      (tempTrend > 0 ? tempTrend * 0.3 : 0) +
      (resistanceTrend > 0 ? resistanceTrend * 0.3 : 0) +
      (correlation > 0.5 ? correlation * 0.4 : 0)
    ));
    
    const currentTemp = this.mean(temperatures.slice(-6));
    const daysToFailure = tempTrend > 0 ? 
      Math.max(1, (this.CRITICAL_TEMPERATURE_THRESHOLD - currentTemp) / (tempTrend * 24)) : 
      Infinity;
    
    return {
      pattern_type: 'thermal_runaway',
      confidence,
      days_to_failure_estimate: Math.min(180, daysToFailure),
      critical_sensors: ['mold_temperature', 'contact_resistance'],
      failure_probability: confidence * 100
    };
  }

  /**
   * Detect Current Instability Pattern
   */
  private detectCurrentInstability(currentReadings: ContactWelderReading[]): ContactWelderFailurePattern {
    const values = this.extractValues(currentReadings);
    const cv = this.coefficientOfVariation(values);
    const recentCV = this.coefficientOfVariation(values.slice(-48)); // Last 48 readings
    
    const confidence = Math.min(1, Math.max(0, (cv - 0.1) / 0.3)); // CV > 0.4 = high confidence
    const instabilityTrend = recentCV - cv;
    
    const daysToFailure = instabilityTrend > 0 ? Math.max(7, 30 / instabilityTrend) : 60;
    
    return {
      pattern_type: 'current_instability',
      confidence,
      days_to_failure_estimate: daysToFailure,
      critical_sensors: ['weld_current'],
      failure_probability: confidence * 80 // Current instability is serious but not always fatal
    };
  }

  /**
   * Detect Voltage Fluctuation Pattern
   */
  private detectVoltageFluctuation(voltageReadings: ContactWelderReading[]): ContactWelderFailurePattern {
    const values = this.extractValues(voltageReadings);
    const volatility = this.calculateVolatility(values);
    const trend = Math.abs(this.calculateTrend(values));
    
    const confidence = Math.min(1, Math.max(0, 
      (volatility * 0.6) + (trend * 0.4)
    ));
    
    const daysToFailure = confidence > 0.7 ? 14 : 45; // High voltage instability = near-term failure
    
    return {
      pattern_type: 'voltage_fluctuation',
      confidence,
      days_to_failure_estimate: daysToFailure,
      critical_sensors: ['weld_voltage'],
      failure_probability: confidence * 70
    };
  }

  // Utility Functions
  private groupBySensorType(readings: ContactWelderReading[]): Record<string, ContactWelderReading[]> {
    return readings.reduce((acc, reading) => {
      if (!acc[reading.sensor_type]) {
        acc[reading.sensor_type] = [];
      }
      acc[reading.sensor_type].push(reading);
      return acc;
    }, {} as Record<string, ContactWelderReading[]>);
  }

  private validateSensorData(sensorGroups: Record<string, ContactWelderReading[]>): void {
    const requiredSensors = ['contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature'];
    for (const sensor of requiredSensors) {
      if (!sensorGroups[sensor] || sensorGroups[sensor].length === 0) {
        throw new Error(`Missing required sensor data: ${sensor}`);
      }
    }
  }

  private extractValues(readings: ContactWelderReading[]): number[] {
    return readings.map(r => r.value).filter(v => !isNaN(v) && isFinite(v));
  }

  private calculateRangeHealth(values: number[], range: {min: number, max: number}): number {
    const inRangeCount = values.filter(v => v >= range.min && v <= range.max).length;
    return values.length > 0 ? inRangeCount / values.length : 0;
  }

  private mean(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squaredDiffs));
  }

  private coefficientOfVariation(values: number[]): number {
    const mean = this.mean(values);
    const std = this.standardDeviation(values);
    return mean === 0 ? 0 : std / Math.abs(mean);
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({length: n}, (_, i) => i);
    const xMean = this.mean(x);
    const yMean = this.mean(values);
    
    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;
    
    for (let i = 0; i < x.length; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      sumSqX += deltaX * deltaX;
      sumSqY += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumSqX * sumSqY);
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

  private calculateResistanceDriftRate(resistance: number[], readings: ContactWelderReading[]): number {
    if (readings.length < 2) return 0;
    
    const firstTime = readings[0].timestamp.getTime();
    const lastTime = readings[readings.length - 1].timestamp.getTime();
    const timeDiffDays = (lastTime - firstTime) / (1000 * 60 * 60 * 24);
    
    if (timeDiffDays === 0) return 0;
    
    const firstValue = resistance[0];
    const lastValue = resistance[resistance.length - 1];
    
    return (lastValue - firstValue) / timeDiffDays; // Ohms per day
  }

  private calculateTemperatureCyclingStress(temperature: number[]): number {
    if (temperature.length < 24) return 0; // Need at least 24 readings
    
    let cycles = 0;
    let direction = 0; // 1 for up, -1 for down
    
    for (let i = 1; i < temperature.length; i++) {
      const change = temperature[i] - temperature[i - 1];
      
      if (Math.abs(change) > 5) { // Significant temperature change
        const newDirection = change > 0 ? 1 : -1;
        if (direction !== 0 && direction !== newDirection) {
          cycles++;
        }
        direction = newDirection;
      }
    }
    
    // Normalize by time period
    return cycles / (temperature.length / 24); // Cycles per day
  }

  private calculateCurrentConsistency(current: number[]): number {
    return Math.max(0, 1 - this.coefficientOfVariation(current));
  }

  private calculateVoltageStability(voltage: number[]): number {
    return Math.max(0, 1 - this.coefficientOfVariation(voltage));
  }

  private estimateRemainingUsefulCycles(resistance: number[], current: number[]): number {
    const currentResistance = this.mean(resistance.slice(-6));
    const degradationRate = this.calculateTrend(resistance);
    
    if (degradationRate <= 0) return 10000; // No degradation detected
    
    const cyclesToFailure = (this.CRITICAL_RESISTANCE_THRESHOLD - currentResistance) / degradationRate;
    return Math.max(0, Math.min(50000, cyclesToFailure));
  }

  private calculateDegradationAcceleration(resistance: number[]): number {
    if (resistance.length < 48) return 0; // Need sufficient data
    
    const firstHalf = resistance.slice(0, Math.floor(resistance.length / 2));
    const secondHalf = resistance.slice(Math.floor(resistance.length / 2));
    
    const firstHalfTrend = this.calculateTrend(firstHalf);
    const secondHalfTrend = this.calculateTrend(secondHalf);
    
    return secondHalfTrend - firstHalfTrend; // Positive = accelerating degradation
  }

  private calculateThresholdProximity(resistance: number[], temperature: number[]): number {
    const currentResistance = this.mean(resistance.slice(-6));
    const currentTemperature = this.mean(temperature.slice(-6));
    
    const resistanceProximity = currentResistance / this.CRITICAL_RESISTANCE_THRESHOLD;
    const temperatureProximity = currentTemperature / this.CRITICAL_TEMPERATURE_THRESHOLD;
    
    return Math.max(resistanceProximity, temperatureProximity);
  }

  private calculateMaintenanceUrgency(resistance: number[], temperature: number[], current: number[]): number {
    const degradationIndex = this.calculateResistanceDegradation(resistance);
    const thermalStress = this.calculateThermalStress(temperature);
    const processStability = this.calculateProcessStability(current, []);
    
    // Weighted urgency score
    const urgency = (degradationIndex * 50) + (thermalStress * 30) + ((1 - processStability) * 20);
    
    return Math.min(100, urgency);
  }
}

export default ContactWelderFeatureEngineer;