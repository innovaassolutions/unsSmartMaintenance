'use client';

import React, { useState, useEffect } from 'react';
import {
  Brain,
  AlertTriangle,
  TrendingDown,
  Clock,
  Wrench,
  DollarSign,
  Activity,
  Shield,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-react';

interface FailurePrediction {
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

interface MLInsights {
  risk_summary: {
    current_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    days_to_maintenance: number | null;
    primary_concern: string;
    cost_avoidance: number;
  };
  sensor_health: Array<{
    component: string;
    current_health: number;
    trend: 'DEGRADING' | 'STABLE';
    urgency: 'LOW' | 'MODERATE' | 'URGENT';
  }>;
}

const PredictiveAnalytics: React.FC = () => {
  const [prediction, setPrediction] = useState<FailurePrediction | null>(null);
  const [insights, setInsights] = useState<MLInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPrediction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/ml/mock-prediction');
      const data = await response.json();
      
      if (data.success) {
        setPrediction(data.prediction);
        setInsights(data.insights);
        setLastUpdated(new Date());
      } else {
        setError(data.error || 'Failed to fetch prediction');
      }
    } catch (err) {
      setError('Network error - unable to fetch ML predictions');
      console.error('ML prediction fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrediction();
  }, []);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-white';
      case 'LOW': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CRITICAL': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'WARNING': return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'WATCH': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'NORMAL': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendIcon = (direction: string) => {
    return direction === 'DEGRADING' ? 
      <TrendingDown className="h-4 w-4 text-red-600" /> : 
      <Activity className="h-4 w-4 text-green-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Running ML analysis on 20.7M sensor records...</p>
          <p className="text-sm text-gray-400 mt-2">This may take 30-60 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <XCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-900">ML Prediction Error</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <button
          onClick={fetchPrediction}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!prediction || !insights) {
    return (
      <div className="text-center py-8">
        <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No ML prediction data available</p>
        <button
          onClick={fetchPrediction}
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Run Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Brain className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Contact Welder Predictive Analytics</h2>
            <p className="text-gray-600">ML-powered failure prediction and maintenance optimization</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchPrediction}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Analysis</span>
          </button>
        </div>
      </div>

      {/* Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Current Risk Level</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRiskLevelColor(insights.risk_summary.current_risk_level)}`}>
                  {insights.risk_summary.current_risk_level}
                </span>
              </div>
            </div>
            <Shield className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failure Risk (14 days)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {prediction.failure_probability_14_days}%
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Days to Maintenance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {insights.risk_summary.days_to_maintenance || 'N/A'}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cost Avoidance</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${Math.round(insights.risk_summary.cost_avoidance).toLocaleString()}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Failure Probability Timeline */}
      <div className="bg-white rounded-xl shadow-card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Failure Probability Forecast</h3>
          <p className="text-gray-600 mt-1">Predicted failure risk over the next 4 weeks</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">14 Days</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">{prediction.failure_probability_14_days}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">21 Days</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{prediction.failure_probability_21_days}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">28 Days</p>
              <p className="text-3xl font-bold text-red-700 mt-1">{prediction.failure_probability_28_days}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Component Health Status */}
      <div className="bg-white rounded-xl shadow-card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Component Health Analysis</h3>
          <p className="text-gray-600 mt-1">Current health and degradation trends for each component</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {insights.sensor_health.map((sensor, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {getTrendIcon(sensor.trend)}
                    <span className="font-medium text-gray-900">{sensor.component}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Health</p>
                    <p className="text-lg font-semibold text-gray-900">{Math.round(sensor.current_health)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Urgency</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sensor.urgency === 'URGENT' ? 'bg-red-100 text-red-800' :
                      sensor.urgency === 'MODERATE' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {sensor.urgency}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Early Warning Indicators */}
      <div className="bg-white rounded-xl shadow-card">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900">Early Warning Indicators</h3>
          <p className="text-gray-600 mt-1">Proactive alerts based on sensor trend analysis</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {prediction.early_warnings.map((warning, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(warning.current_status)}
                  <div>
                    <p className="font-medium text-gray-900">{warning.indicator}</p>
                    <p className="text-sm text-gray-600">Status: {warning.current_status} • Trend: {warning.trend_direction}</p>
                  </div>
                </div>
                <div className="text-right">
                  {warning.time_to_critical && (
                    <p className="text-sm text-gray-600">
                      {warning.time_to_critical} days to critical
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Maintenance Recommendations */}
      {prediction.maintenance_recommendations.length > 0 && (
        <div className="bg-white rounded-xl shadow-card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">Optimal Maintenance Windows</h3>
            <p className="text-gray-600 mt-1">ML-optimized maintenance scheduling recommendations</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {prediction.maintenance_recommendations.map((rec, index) => (
                <div key={index} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-gray-900">
                        Week of {new Date(rec.week_start).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>Downtime: {rec.expected_downtime_hours}h</span>
                      <span>Cost: ${rec.cost_estimate}</span>
                      <span>Risk Reduction: {rec.risk_reduction}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {rec.recommended_actions.map((action, actionIndex) => (
                      <div key={actionIndex} className="flex items-center space-x-2">
                        <Wrench className="h-4 w-4 text-green-600" />
                        <span className="text-gray-700">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Analysis Metadata */}
      <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="font-medium">Data Points:</span> 20.7M sensor readings
          </div>
          <div>
            <span className="font-medium">Analysis Window:</span> {prediction.prediction_horizon_days} days
          </div>
          <div>
            <span className="font-medium">Machine ID:</span> {prediction.machine_id}
          </div>
          <div>
            <span className="font-medium">Last Analysis:</span> {new Date(prediction.analysis_timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;