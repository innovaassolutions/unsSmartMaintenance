/**
 * Feature Engineering Pipeline for Manufacturing ML
 * Advanced time-series feature extraction for relay assembly machines
 */

interface SensorReading {
  timestamp: Date;
  machine_id: string;
  sensor_type: string;
  value: number;
}

interface EngineeringConfig {
  windowSizes: number[]; // Hours for rolling windows
  sensorCorrelations: Record<string, string[]>; // Related sensors for interaction features
  manufacturingDomainFeatures: boolean;
  frequencyDomainFeatures: boolean;
}

interface FeatureSet {
  statistical: Record<string, number>;
  temporal: Record<string, number>;
  domain: Record<string, number>;
  interaction: Record<string, number>;
  frequency?: Record<string, number>;
}

export class FeatureEngineer {
  private config: EngineeringConfig;

  constructor(config?: Partial<EngineeringConfig>) {
    this.config = {
      windowSizes: [1, 4, 24, 168], // 1h, 4h, 24h, 168h (1 week)
      sensorCorrelations: {
        'bearing_temperature': ['vibration_x', 'vibration_y', 'vibration_z'],
        'hydraulic_pressure': ['cycle_time', 'force_applied'],
        'weld_current': ['contact_resistance', 'voltage'],
        'spindle_speed': ['vibration_magnitude', 'power_consumption']
      },
      manufacturingDomainFeatures: true,
      frequencyDomainFeatures: true,
      ...config
    };
  }

  /**
   * Generate comprehensive feature set from sensor readings
   */
  async generateFeatures(
    machineId: string, 
    sensorReadings: SensorReading[]
  ): Promise<FeatureSet> {
    
    // Group readings by sensor type
    const sensorGroups = this.groupBySensorType(sensorReadings);
    
    // Generate different feature categories
    const features: FeatureSet = {
      statistical: this.generateStatisticalFeatures(sensorGroups),
      temporal: this.generateTemporalFeatures(sensorGroups),
      domain: this.generateDomainFeatures(sensorGroups),
      interaction: this.generateInteractionFeatures(sensorGroups)
    };

    // Optional frequency domain features for vibration sensors
    if (this.config.frequencyDomainFeatures) {
      features.frequency = this.generateFrequencyFeatures(sensorGroups);
    }

    return features;
  }

  /**
   * Statistical features with multiple window sizes
   */
  private generateStatisticalFeatures(
    sensorGroups: Record<string, SensorReading[]>
  ): Record<string, number> {
    const features: Record<string, number> = {};

    for (const [sensorType, readings] of Object.entries(sensorGroups)) {
      const values = readings.map(r => r.value).filter(v => !isNaN(v));
      
      if (values.length === 0) continue;

      // Basic statistics
      features[`${sensorType}_mean`] = this.mean(values);
      features[`${sensorType}_std`] = this.standardDeviation(values);
      features[`${sensorType}_min`] = Math.min(...values);
      features[`${sensorType}_max`] = Math.max(...values);
      features[`${sensorType}_median`] = this.median(values);
      features[`${sensorType}_range`] = Math.max(...values) - Math.min(...values);
      
      // Distribution characteristics
      features[`${sensorType}_skewness`] = this.skewness(values);
      features[`${sensorType}_kurtosis`] = this.kurtosis(values);
      features[`${sensorType}_cv`] = this.coefficientOfVariation(values);
      
      // Percentiles
      features[`${sensorType}_p25`] = this.percentile(values, 25);
      features[`${sensorType}_p75`] = this.percentile(values, 75);
      features[`${sensorType}_iqr`] = this.percentile(values, 75) - this.percentile(values, 25);

      // Rolling window statistics
      for (const window of this.config.windowSizes) {
        const windowFeatures = this.rollingWindowFeatures(readings, window);
        
        for (const [key, value] of Object.entries(windowFeatures)) {
          features[`${sensorType}_${window}h_${key}`] = value;
        }
      }
    }

    return features;
  }

  /**
   * Temporal features capturing time-based patterns
   */
  private generateTemporalFeatures(
    sensorGroups: Record<string, SensorReading[]>
  ): Record<string, number> {
    const features: Record<string, number> = {};

    for (const [sensorType, readings] of Object.entries(sensorGroups)) {
      if (readings.length < 2) continue;

      const values = readings.map(r => r.value);
      const timestamps = readings.map(r => r.timestamp);

      // Trend analysis
      features[`${sensorType}_trend_slope`] = this.calculateTrendSlope(values);
      features[`${sensorType}_trend_r2`] = this.calculateTrendR2(values);
      
      // Autocorrelation
      features[`${sensorType}_autocorr_lag1`] = this.autocorrelation(values, 1);
      features[`${sensorType}_autocorr_lag24`] = this.autocorrelation(values, 24);
      
      // Stationarity indicators
      features[`${sensorType}_drift_rate`] = this.calculateDriftRate(values);
      features[`${sensorType}_volatility`] = this.calculateVolatility(values);
      
      // Seasonal patterns (if enough data)
      if (values.length >= 168) { // 1 week of hourly data
        features[`${sensorType}_daily_seasonality`] = this.dailySeasonality(values);
        features[`${sensorType}_weekly_pattern`] = this.weeklyPattern(timestamps, values);
      }

      // Change point detection
      features[`${sensorType}_changepoints`] = this.countChangePoints(values);
      features[`${sensorType}_last_changepoint_hours`] = this.hoursFromLastChangePoint(values, timestamps);
    }

    return features;
  }

  /**
   * Manufacturing domain-specific features
   */
  private generateDomainFeatures(
    sensorGroups: Record<string, SensorReading[]>
  ): Record<string, number> {
    const features: Record<string, number> = {};

    // Bearing health indicators
    if (sensorGroups['bearing_temperature'] && sensorGroups['vibration_magnitude']) {
      const temp = sensorGroups['bearing_temperature'].map(r => r.value);
      const vibration = sensorGroups['vibration_magnitude'].map(r => r.value);
      
      features['bearing_health_index'] = this.bearingHealthIndex(temp, vibration);
      features['bearing_degradation_rate'] = this.degradationRate(temp);
    }

    // Hydraulic system efficiency
    if (sensorGroups['hydraulic_pressure'] && sensorGroups['cycle_time']) {
      const pressure = sensorGroups['hydraulic_pressure'].map(r => r.value);
      const cycleTime = sensorGroups['cycle_time'].map(r => r.value);
      
      features['hydraulic_efficiency'] = this.hydraulicEfficiency(pressure, cycleTime);
      features['pressure_stability'] = this.pressureStability(pressure);
    }

    // Electrical system health
    if (sensorGroups['weld_current'] && sensorGroups['contact_resistance']) {
      const current = sensorGroups['weld_current'].map(r => r.value);
      const resistance = sensorGroups['contact_resistance'].map(r => r.value);
      
      features['electrical_health'] = this.electricalHealth(current, resistance);
      features['weld_consistency'] = this.weldConsistency(current);
    }

    // Process quality indicators
    if (sensorGroups['cycle_count']) {
      const cycleCounts = sensorGroups['cycle_count'].map(r => r.value);
      features['production_rate'] = this.productionRate(cycleCounts);
      features['cycle_regularity'] = this.cycleRegularity(cycleCounts);
    }

    // Energy efficiency
    if (sensorGroups['power_consumption'] && sensorGroups['cycle_count']) {
      const power = sensorGroups['power_consumption'].map(r => r.value);
      const cycles = sensorGroups['cycle_count'].map(r => r.value);
      
      features['energy_per_cycle'] = this.energyPerCycle(power, cycles);
      features['energy_efficiency_trend'] = this.energyEfficiencyTrend(power, cycles);
    }

    return features;
  }

  /**
   * Cross-sensor interaction features
   */
  private generateInteractionFeatures(
    sensorGroups: Record<string, SensorReading[]>
  ): Record<string, number> {
    const features: Record<string, number> = {};

    for (const [primarySensor, correlatedSensors] of Object.entries(this.config.sensorCorrelations)) {
      if (!sensorGroups[primarySensor]) continue;

      const primaryValues = sensorGroups[primarySensor].map(r => r.value);

      for (const correlatedSensor of correlatedSensors) {
        if (!sensorGroups[correlatedSensor]) continue;

        const correlatedValues = sensorGroups[correlatedSensor].map(r => r.value);
        
        // Ensure same length for correlation calculation
        const minLength = Math.min(primaryValues.length, correlatedValues.length);
        const primary = primaryValues.slice(0, minLength);
        const correlated = correlatedValues.slice(0, minLength);

        // Correlation coefficient
        features[`${primarySensor}_${correlatedSensor}_correlation`] = 
          this.correlation(primary, correlated);

        // Ratio features
        features[`${primarySensor}_${correlatedSensor}_ratio`] = 
          this.meanRatio(primary, correlated);

        // Phase relationship (for periodic signals)
        if (primary.length >= 24) {
          features[`${primarySensor}_${correlatedSensor}_phase_shift`] = 
            this.phaseShift(primary, correlated);
        }
      }
    }

    return features;
  }

  /**
   * Frequency domain features for vibration analysis
   */
  private generateFrequencyFeatures(
    sensorGroups: Record<string, SensorReading[]>
  ): Record<string, number> {
    const features: Record<string, number> = {};

    const vibrationSensors = ['vibration_x', 'vibration_y', 'vibration_z', 'vibration_magnitude'];

    for (const sensorType of vibrationSensors) {
      if (!sensorGroups[sensorType]) continue;

      const values = sensorGroups[sensorType].map(r => r.value);
      if (values.length < 64) continue; // Need minimum samples for FFT

      const fftFeatures = this.fftAnalysis(values);
      
      for (const [key, value] of Object.entries(fftFeatures)) {
        features[`${sensorType}_${key}`] = value;
      }
    }

    return features;
  }

  // Statistical utility functions
  private mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private standardDeviation(values: number[]): number {
    const avg = this.mean(values);
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    return Math.sqrt(this.mean(squaredDiffs));
  }

  private median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private percentile(values: number[], p: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
  }

  private skewness(values: number[]): number {
    const n = values.length;
    const mean = this.mean(values);
    const std = this.standardDeviation(values);
    
    if (std === 0) return 0;
    
    const skew = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 3);
    }, 0);
    
    return (n / ((n - 1) * (n - 2))) * skew;
  }

  private kurtosis(values: number[]): number {
    const n = values.length;
    const mean = this.mean(values);
    const std = this.standardDeviation(values);
    
    if (std === 0) return 0;
    
    const kurt = values.reduce((sum, val) => {
      return sum + Math.pow((val - mean) / std, 4);
    }, 0);
    
    return (n * (n + 1) / ((n - 1) * (n - 2) * (n - 3))) * kurt - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
  }

  private coefficientOfVariation(values: number[]): number {
    const mean = this.mean(values);
    const std = this.standardDeviation(values);
    return mean === 0 ? 0 : std / Math.abs(mean);
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n < 2) return 0;

    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    let numerator = 0;
    let sumSqX = 0;
    let sumSqY = 0;
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX;
      const deltaY = y[i] - meanY;
      numerator += deltaX * deltaY;
      sumSqX += deltaX * deltaX;
      sumSqY += deltaY * deltaY;
    }
    
    const denominator = Math.sqrt(sumSqX * sumSqY);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  // Manufacturing domain functions
  private bearingHealthIndex(temperature: number[], vibration: number[]): number {
    const tempMean = this.mean(temperature);
    const vibMean = this.mean(vibration);
    const tempStd = this.standardDeviation(temperature);
    const vibStd = this.standardDeviation(vibration);
    
    // Health index based on normalized temperature and vibration
    const tempHealth = Math.max(0, 1 - (tempMean - 20) / 60); // Assume 20-80°C range
    const vibHealth = Math.max(0, 1 - vibMean / 10); // Assume 0-10 vibration range
    const stabilityHealth = Math.max(0, 1 - (tempStd + vibStd) / 20);
    
    return (tempHealth + vibHealth + stabilityHealth) / 3;
  }

  private hydraulicEfficiency(pressure: number[], cycleTime: number[]): number {
    if (pressure.length !== cycleTime.length) return 0;
    
    let efficiency = 0;
    for (let i = 0; i < pressure.length; i++) {
      if (cycleTime[i] > 0) {
        efficiency += pressure[i] / cycleTime[i];
      }
    }
    
    return efficiency / pressure.length;
  }

  private electricalHealth(current: number[], resistance: number[]): number {
    const currentConsistency = 1 - this.coefficientOfVariation(current);
    const resistanceStability = 1 - this.coefficientOfVariation(resistance);
    
    return (currentConsistency + resistanceStability) / 2;
  }

  private fftAnalysis(values: number[]): Record<string, number> {
    // Simplified FFT analysis (would use actual FFT library in production)
    const features: Record<string, number> = {};
    
    // Placeholder for actual FFT implementation
    features['dominant_frequency'] = 0;
    features['frequency_spread'] = this.standardDeviation(values);
    features['high_freq_energy'] = 0;
    features['spectral_centroid'] = 0;
    
    return features;
  }

  // Additional helper functions would be implemented here...
  private groupBySensorType(readings: SensorReading[]): Record<string, SensorReading[]> {
    return readings.reduce((acc, reading) => {
      if (!acc[reading.sensor_type]) {
        acc[reading.sensor_type] = [];
      }
      acc[reading.sensor_type].push(reading);
      return acc;
    }, {} as Record<string, SensorReading[]>);
  }

  private rollingWindowFeatures(readings: SensorReading[], windowHours: number): Record<string, number> {
    // Implementation for rolling window calculations
    const values = readings.slice(-windowHours).map(r => r.value);
    return {
      mean: this.mean(values),
      std: this.standardDeviation(values),
      trend: this.calculateTrendSlope(values)
    };
  }

  private calculateTrendSlope(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const x = Array.from({length: n}, (_, i) => i);
    const xMean = this.mean(x);
    const yMean = this.mean(values);
    
    const numerator = x.reduce((sum, xi, i) => sum + (xi - xMean) * (values[i] - yMean), 0);
    const denominator = x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0);
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private calculateTrendR2(values: number[]): number {
    // R-squared calculation for trend line fit
    if (values.length < 2) return 0;
    
    const slope = this.calculateTrendSlope(values);
    const yMean = this.mean(values);
    
    let ssRes = 0; // Sum of squares of residuals
    let ssTot = 0; // Total sum of squares
    
    for (let i = 0; i < values.length; i++) {
      const predicted = slope * i + (yMean - slope * (values.length - 1) / 2);
      ssRes += Math.pow(values[i] - predicted, 2);
      ssTot += Math.pow(values[i] - yMean, 2);
    }
    
    return ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
  }

  private autocorrelation(values: number[], lag: number): number {
    if (values.length <= lag) return 0;
    
    const mean = this.mean(values);
    let c0 = 0;
    let cLag = 0;
    
    for (let i = 0; i < values.length; i++) {
      c0 += Math.pow(values[i] - mean, 2);
      if (i >= lag) {
        cLag += (values[i] - mean) * (values[i - lag] - mean);
      }
    }
    
    return c0 === 0 ? 0 : cLag / c0;
  }

  private calculateDriftRate(values: number[]): number {
    // Rate of change over time
    return this.calculateTrendSlope(values);
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

  private dailySeasonality(values: number[]): number {
    // Measure daily pattern strength (24-hour cycle)
    if (values.length < 48) return 0;
    
    const hourlyMeans = Array(24).fill(0);
    const hourlyCounts = Array(24).fill(0);
    
    for (let i = 0; i < values.length; i++) {
      const hour = i % 24;
      hourlyMeans[hour] += values[i];
      hourlyCounts[hour]++;
    }
    
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyMeans[i] /= hourlyCounts[i];
      }
    }
    
    return this.standardDeviation(hourlyMeans);
  }

  private weeklyPattern(timestamps: Date[], values: number[]): number {
    // Analyze weekly patterns in the data
    const dayOfWeekMeans = Array(7).fill(0);
    const dayOfWeekCounts = Array(7).fill(0);
    
    for (let i = 0; i < timestamps.length && i < values.length; i++) {
      const dayOfWeek = timestamps[i].getDay();
      dayOfWeekMeans[dayOfWeek] += values[i];
      dayOfWeekCounts[dayOfWeek]++;
    }
    
    for (let i = 0; i < 7; i++) {
      if (dayOfWeekCounts[i] > 0) {
        dayOfWeekMeans[i] /= dayOfWeekCounts[i];
      }
    }
    
    return this.standardDeviation(dayOfWeekMeans);
  }

  private countChangePoints(values: number[]): number {
    // Simple change point detection using threshold
    let changePoints = 0;
    const threshold = this.standardDeviation(values) * 2;
    
    for (let i = 1; i < values.length; i++) {
      if (Math.abs(values[i] - values[i - 1]) > threshold) {
        changePoints++;
      }
    }
    
    return changePoints;
  }

  private hoursFromLastChangePoint(values: number[], timestamps: Date[]): number {
    const threshold = this.standardDeviation(values) * 2;
    
    for (let i = values.length - 1; i > 0; i--) {
      if (Math.abs(values[i] - values[i - 1]) > threshold) {
        const lastChangePoint = timestamps[i];
        const now = new Date();
        return (now.getTime() - lastChangePoint.getTime()) / (1000 * 60 * 60); // Hours
      }
    }
    
    return Infinity; // No change points found
  }

  private degradationRate(values: number[]): number {
    // Measure rate of degradation (positive trend indicates degradation)
    return Math.max(0, this.calculateTrendSlope(values));
  }

  private pressureStability(pressure: number[]): number {
    return 1 - this.coefficientOfVariation(pressure);
  }

  private weldConsistency(current: number[]): number {
    return 1 - this.coefficientOfVariation(current);
  }

  private productionRate(cycleCounts: number[]): number {
    if (cycleCounts.length < 2) return 0;
    return cycleCounts[cycleCounts.length - 1] - cycleCounts[0];
  }

  private cycleRegularity(cycleCounts: number[]): number {
    const intervals = [];
    for (let i = 1; i < cycleCounts.length; i++) {
      intervals.push(cycleCounts[i] - cycleCounts[i - 1]);
    }
    return intervals.length > 0 ? 1 - this.coefficientOfVariation(intervals) : 0;
  }

  private energyPerCycle(power: number[], cycles: number[]): number {
    const totalPower = this.mean(power);
    const cycleRate = this.productionRate(cycles);
    return cycleRate > 0 ? totalPower / cycleRate : 0;
  }

  private energyEfficiencyTrend(power: number[], cycles: number[]): number {
    const efficiencyOverTime = [];
    const windowSize = 24; // 24-hour windows
    
    for (let i = windowSize; i < power.length; i += windowSize) {
      const powerWindow = power.slice(i - windowSize, i);
      const cycleWindow = cycles.slice(i - windowSize, i);
      
      const windowEfficiency = this.energyPerCycle(powerWindow, cycleWindow);
      efficiencyOverTime.push(windowEfficiency);
    }
    
    return this.calculateTrendSlope(efficiencyOverTime);
  }

  private meanRatio(primary: number[], correlated: number[]): number {
    let ratio = 0;
    let count = 0;
    
    for (let i = 0; i < Math.min(primary.length, correlated.length); i++) {
      if (correlated[i] !== 0) {
        ratio += primary[i] / Math.abs(correlated[i]);
        count++;
      }
    }
    
    return count > 0 ? ratio / count : 0;
  }

  private phaseShift(primary: number[], correlated: number[]): number {
    // Simplified phase shift calculation
    const maxLag = Math.min(24, Math.floor(primary.length / 4));
    let maxCorrelation = 0;
    let bestLag = 0;
    
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      let corr = 0;
      let count = 0;
      
      for (let i = Math.max(0, lag); i < Math.min(primary.length, correlated.length + lag); i++) {
        if (i - lag >= 0 && i - lag < correlated.length) {
          corr += primary[i] * correlated[i - lag];
          count++;
        }
      }
      
      if (count > 0) {
        corr /= count;
        if (Math.abs(corr) > Math.abs(maxCorrelation)) {
          maxCorrelation = corr;
          bestLag = lag;
        }
      }
    }
    
    return bestLag;
  }
}

export default FeatureEngineer;