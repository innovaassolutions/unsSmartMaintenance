/**
 * Contact Welder Predictive Maintenance Dashboard
 * Real-time visualization and management interface for Contact Welder ML predictions
 * Integrates with the UNS Smart Maintenance System
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Clock, 
  Zap, 
  Thermometer,
  Activity,
  Settings,
  Calendar,
  DollarSign,
  Wrench
} from 'lucide-react';

interface ContactWelderPrediction {
  machine_id: string;
  failure_probability: number;
  failure_confidence: number;
  days_to_failure: number | null;
  estimated_cycles_remaining: number;
  health_scores: {
    resistance: number;
    electrical: number;
    thermal: number;
    process: number;
    overall: number;
  };
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  maintenance_urgency: 'ROUTINE' | 'PLANNED' | 'URGENT' | 'IMMEDIATE';
  critical_sensors: string[];
  risk_factors: Array<{
    name: string;
    severity: number;
    description: string;
    color: string;
  }>;
  maintenance_recommendations: Array<{
    description: string;
    priority: number;
    estimated_cost: number;
    estimated_downtime: number;
    urgency_color: string;
  }>;
  degradation_analysis: Array<{
    type: string;
    confidence: number;
    trend: string;
    severity: string;
  }>;
  alerts: Array<{
    type: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    message: string;
    actionRequired: boolean;
  }>;
  chart_data: {
    resistance_trend: Array<{ timestamp: string; value: number }>;
    temperature_trend: Array<{ timestamp: string; value: number }>;
    current_trend: Array<{ timestamp: string; value: number }>;
    voltage_trend: Array<{ timestamp: string; value: number }>;
    health_score_history: Array<{ timestamp: string; score: number }>;
  };
  trend_indicators: {
    resistance_trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    temperature_trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    overall_health_trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  };
}

interface ContactWelderDashboardProps {
  machineId: string;
  onMaintenanceSchedule?: (recommendation: any) => void;
  onAlertAcknowledge?: (alertId: string) => void;
}

export const ContactWelderDashboard: React.FC<ContactWelderDashboardProps> = ({
  machineId,
  onMaintenanceSchedule,
  onAlertAcknowledge
}) => {
  const [prediction, setPrediction] = useState<ContactWelderPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Fetch prediction data
  const fetchPrediction = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ml/contact-welder/predict?machineId=${machineId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setPrediction(result.data);
        setLastUpdate(new Date());
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch prediction');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Contact Welder prediction fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchPrediction();
    
    const interval = setInterval(fetchPrediction, refreshInterval);
    return () => clearInterval(interval);
  }, [machineId, refreshInterval]);

  // Loading state
  if (loading && !prediction) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading Contact Welder predictions...</span>
      </div>
    );
  }

  // Error state
  if (error && !prediction) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Prediction Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button variant="outline" size="sm" className="ml-2" onClick={fetchPrediction}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!prediction) return null;

  // Risk level color mapping
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 bg-red-50 border-red-200';
      case 'HIGH': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Trend icon mapping
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'DEGRADING': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Machine Status */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contact Welder {machineId}</h1>
          <p className="text-gray-600 mt-1">
            Predictive Maintenance Dashboard
            {lastUpdate && (
              <span className="ml-2 text-sm">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge className={getRiskColor(prediction.risk_level)}>
            {prediction.risk_level} RISK
          </Badge>
          <Badge variant="outline" className="capitalize">
            {prediction.maintenance_urgency.toLowerCase()} Maintenance
          </Badge>
        </div>
      </div>

      {/* Critical Alerts */}
      {prediction.alerts.length > 0 && (
        <div className="space-y-2">
          {prediction.alerts.map((alert, index) => (
            <Alert 
              key={index}
              variant={alert.type === 'CRITICAL' ? 'destructive' : 'default'}
              className={alert.type === 'WARNING' ? 'border-orange-200 bg-orange-50' : ''}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{alert.title}</AlertTitle>
              <AlertDescription className="flex justify-between items-center">
                <span>{alert.message}</span>
                {alert.actionRequired && (
                  <Button size="sm" variant="outline">
                    Take Action
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Failure Probability */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failure Probability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {prediction.failure_probability}%
              </span>
              <AlertTriangle 
                className={`h-6 w-6 ${
                  prediction.failure_probability >= 80 ? 'text-red-600' :
                  prediction.failure_probability >= 60 ? 'text-orange-600' :
                  prediction.failure_probability >= 30 ? 'text-yellow-600' : 'text-green-600'
                }`} 
              />
            </div>
            <Progress 
              value={prediction.failure_probability} 
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">
              Confidence: {prediction.failure_confidence}%
            </p>
          </CardContent>
        </Card>

        {/* Days to Failure */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Estimated Time to Failure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {prediction.days_to_failure ? `${prediction.days_to_failure}d` : 'N/A'}
              </span>
              <Clock className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Cycles remaining: {prediction.estimated_cycles_remaining.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Overall Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overall Health Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">
                {prediction.health_scores.overall}%
              </span>
              <CheckCircle 
                className={`h-6 w-6 ${
                  prediction.health_scores.overall >= 80 ? 'text-green-600' :
                  prediction.health_scores.overall >= 60 ? 'text-yellow-600' :
                  prediction.health_scores.overall >= 40 ? 'text-orange-600' : 'text-red-600'
                }`} 
              />
            </div>
            <Progress 
              value={prediction.health_scores.overall} 
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Cost */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Est. Maintenance Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-gray-900">
                ${prediction.maintenance_recommendations.reduce((sum, rec) => sum + rec.estimated_cost, 0).toLocaleString()}
              </span>
              <DollarSign className="h-6 w-6 text-gray-600" />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Downtime: {prediction.maintenance_recommendations.reduce((sum, rec) => sum + rec.estimated_downtime, 0)}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="health">Health Status</TabsTrigger>
          <TabsTrigger value="trends">Sensor Trends</TabsTrigger>
          <TabsTrigger value="analysis">Degradation Analysis</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance Plan</TabsTrigger>
          <TabsTrigger value="risks">Risk Factors</TabsTrigger>
        </TabsList>

        {/* Health Status Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Component Health Scores */}
            <Card>
              <CardHeader>
                <CardTitle>Component Health Scores</CardTitle>
                <CardDescription>Individual system health indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Contact Resistance</span>
                    </div>
                    <span className="text-sm font-bold">{prediction.health_scores.resistance}%</span>
                  </div>
                  <Progress value={prediction.health_scores.resistance} />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Thermometer className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium">Thermal System</span>
                    </div>
                    <span className="text-sm font-bold">{prediction.health_scores.thermal}%</span>
                  </div>
                  <Progress value={prediction.health_scores.thermal} />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Electrical System</span>
                    </div>
                    <span className="text-sm font-bold">{prediction.health_scores.electrical}%</span>
                  </div>
                  <Progress value={prediction.health_scores.electrical} />
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Process Stability</span>
                    </div>
                    <span className="text-sm font-bold">{prediction.health_scores.process}%</span>
                  </div>
                  <Progress value={prediction.health_scores.process} />
                </div>
              </CardContent>
            </Card>

            {/* Health Score History */}
            <Card>
              <CardHeader>
                <CardTitle>Health Score Trend</CardTitle>
                <CardDescription>Overall system health over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={prediction.chart_data.health_score_history}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [`${value}%`, 'Health Score']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sensor Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Contact Resistance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Contact Resistance Trend
                  {getTrendIcon(prediction.trend_indicators.resistance_trend)}
                </CardTitle>
                <CardDescription>Primary failure indicator (mOhms)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={prediction.chart_data.resistance_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [`${value} mΩ`, 'Resistance']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ fill: '#ef4444', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Temperature Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Mold Temperature Trend
                  {getTrendIcon(prediction.trend_indicators.temperature_trend)}
                </CardTitle>
                <CardDescription>Thermal stress indicator (°C)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={prediction.chart_data.temperature_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [`${value}°C`, 'Temperature']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      dot={{ fill: '#f97316', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Current Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Weld Current Trend</CardTitle>
                <CardDescription>Process stability indicator (A)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={prediction.chart_data.current_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [`${value}A`, 'Current']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Voltage Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Weld Voltage Trend</CardTitle>
                <CardDescription>Power delivery indicator (V)</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={prediction.chart_data.voltage_trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value) => [`${value}V`, 'Voltage']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Degradation Analysis Tab */}
        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Degradation Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Detected Degradation Patterns</CardTitle>
                <CardDescription>AI-identified failure patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {prediction.degradation_analysis.map((pattern, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{pattern.type}</p>
                        <p className="text-xs text-gray-600">
                          Trend: {pattern.trend} | Severity: {pattern.severity}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {pattern.confidence}% confidence
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Critical Sensors */}
            <Card>
              <CardHeader>
                <CardTitle>Critical Sensors</CardTitle>
                <CardDescription>Sensors requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {prediction.critical_sensors.map((sensor, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium capitalize">
                        {sensor.replace(/_/g, ' ')}
                      </span>
                    </div>
                  ))}
                  {prediction.critical_sensors.length === 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">All sensors operating normally</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Maintenance Plan Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Recommended Maintenance Actions
              </CardTitle>
              <CardDescription>
                Prioritized maintenance recommendations based on ML analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prediction.maintenance_recommendations.map((recommendation, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{recommendation.description}</h4>
                        <div className="flex gap-4 text-xs text-gray-600">
                          <span>Cost: ${recommendation.estimated_cost}</span>
                          <span>Downtime: {recommendation.estimated_downtime}h</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            recommendation.priority >= 4 ? 'border-red-200 text-red-700' :
                            recommendation.priority >= 3 ? 'border-orange-200 text-orange-700' :
                            'border-yellow-200 text-yellow-700'
                          }`}
                        >
                          Priority {recommendation.priority}
                        </Badge>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => onMaintenanceSchedule?.(recommendation)}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Factors Tab */}
        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Factor Analysis</CardTitle>
              <CardDescription>Detailed breakdown of failure risk contributors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {prediction.risk_factors.map((factor, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm mb-1">{factor.name}</h4>
                        <p className="text-xs text-gray-600 mb-2">{factor.description}</p>
                      </div>
                      <Badge className={`text-xs ${factor.color === 'red' ? 'bg-red-100 text-red-700' :
                        factor.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                        factor.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'}`}>
                        {factor.severity}% severity
                      </Badge>
                    </div>
                    <Progress value={factor.severity} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContactWelderDashboard;