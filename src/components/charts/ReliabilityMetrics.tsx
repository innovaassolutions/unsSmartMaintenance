'use client';

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

// Mock data for demonstration - replace with real data from your API
const mockData = {
  mtbf: {
    current: 85.2,
    target: 90.0,
    trend: [
      { month: 'Jan', value: 78.5 },
      { month: 'Feb', value: 80.2 },
      { month: 'Mar', value: 82.1 },
      { month: 'Apr', value: 83.7 },
      { month: 'May', value: 84.9 },
      { month: 'Jun', value: 85.2 },
    ],
  },
  mttr: {
    current: 2.3,
    target: 2.0,
    trend: [
      { month: 'Jan', value: 3.2 },
      { month: 'Feb', value: 2.9 },
      { month: 'Mar', value: 2.7 },
      { month: 'Apr', value: 2.5 },
      { month: 'May', value: 2.4 },
      { month: 'Jun', value: 2.3 },
    ],
  },
  oee: {
    current: 87.5,
    target: 90.0,
    breakdown: [
      { name: 'Availability', value: 92.3, color: '#10B981' },
      { name: 'Performance', value: 89.7, color: '#3B82F6' },
      { name: 'Quality', value: 80.8, color: '#F59E0B' },
    ],
  },
  uptime: {
    current: 94.2,
    target: 95.0,
    byEquipment: [
      { name: 'CNC-001', uptime: 96.8, status: 'excellent' },
      { name: 'CNC-002', uptime: 94.2, status: 'good' },
      { name: 'CNC-003', uptime: 91.5, status: 'warning' },
      { name: 'CNC-004', uptime: 88.9, status: 'critical' },
      { name: 'CNC-005', uptime: 95.1, status: 'excellent' },
    ],
  },
  failureRate: {
    current: 2.1,
    target: 1.5,
    byCategory: [
      { category: 'Mechanical', count: 12, percentage: 35 },
      { category: 'Electrical', count: 8, percentage: 24 },
      { category: 'Software', count: 6, percentage: 18 },
      { category: 'Operator Error', count: 5, percentage: 15 },
      { category: 'Environmental', count: 3, percentage: 8 },
    ],
  },
};

// Gauge Component for MTBF and MTTR
const GaugeChart = ({ value, target, title, unit, color = '#3B82F6' }) => {
  const percentage = Math.min((value / target) * 100, 100);
  const strokeDasharray = `${percentage}, ${100 - percentage}`;

  return (
    <div className="bg-white rounded-xl p-6 shadow-card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-full h-full" viewBox="0 0 120 120">
          {/* Background circle */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke="#E5E7EB"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="60"
            cy="60"
            r="54"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={strokeDasharray}
            strokeDashoffset="25"
            transform="rotate(-90 60 60)"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          <span className="text-sm text-gray-600">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <span className="text-sm text-gray-600">Target:</span>
          <span className="text-sm font-medium text-gray-900">
            {target} {unit}
          </span>
        </div>
        <div className="flex items-center justify-center space-x-1">
          {value >= target ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          <span
            className={`text-sm ${value >= target ? 'text-green-600' : 'text-yellow-600'}`}
          >
            {value >= target ? 'On Target' : 'Below Target'}
          </span>
        </div>
      </div>
    </div>
  );
};

// OEE Breakdown Pie Chart
const OEEDonutChart = ({ data, current, target }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Overall Equipment Effectiveness
      </h3>
      <div className="flex items-center justify-center mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{current}%</div>
          <div className="text-sm text-gray-600">Current OEE</div>
          <div className="text-xs text-gray-500">Target: {target}%</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={value => `${value}%`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-700">{item.name}</span>
            </div>
            <span className="font-medium text-gray-900">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Uptime Bar Chart
const UptimeBarChart = ({ data }) => {
  const getStatusColor = status => {
    switch (status) {
      case 'excellent':
        return '#10B981';
      case 'good':
        return '#3B82F6';
      case 'warning':
        return '#F59E0B';
      case 'critical':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Equipment Uptime by Machine
      </h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="name" stroke="#6B7280" fontSize={12} />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip
            formatter={value => [`${value}%`, 'Uptime']}
            labelStyle={{ color: '#374151' }}
          />
          <Bar dataKey="uptime" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap gap-2">
        {['excellent', 'good', 'warning', 'critical'].map(status => (
          <div key={status} className="flex items-center space-x-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getStatusColor(status) }}
            />
            <span className="text-xs text-gray-600 capitalize">{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Failure Rate Analysis
const FailureRateChart = ({ data, current, target }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Failure Rate Analysis
      </h3>
      <div className="flex items-center justify-center mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{current}%</div>
          <div className="text-sm text-gray-600">Current Failure Rate</div>
          <div className="text-xs text-gray-500">Target: {target}%</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            paddingAngle={2}
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`hsl(${index * 60}, 70%, 60%)`}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [value, name]} />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-gray-700">{item.category}</span>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{item.count}</span>
              <span className="text-gray-500">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Trend Line Chart
const TrendLineChart = ({ data, title, color = '#3B82F6' }) => {
  return (
    <div className="bg-white rounded-xl p-6 shadow-card">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
          <YAxis stroke="#6B7280" fontSize={12} />
          <Tooltip
            formatter={value => [value, title]}
            labelStyle={{ color: '#374151' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.3}
            strokeWidth={3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Main Component
export default function ReliabilityMetrics() {
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Equipment Reliability Metrics
        </h2>
        <p className="text-gray-600">
          Key performance indicators for equipment reliability and maintenance
          effectiveness
        </p>
      </div>

      {/* Top Row - Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <GaugeChart
          title="Mean Time Between Failures"
          value={mockData.mtbf.current}
          target={mockData.mtbf.target}
          unit="hours"
          color="#10B981"
        />
        <GaugeChart
          title="Mean Time To Repair"
          value={mockData.mttr.current}
          target={mockData.mttr.target}
          unit="hours"
          color="#F59E0B"
        />
        <OEEDonutChart
          data={mockData.oee.breakdown}
          current={mockData.oee.current}
          target={mockData.oee.target}
        />
        <div className="bg-white rounded-xl p-6 shadow-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Overall Uptime
          </h3>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {mockData.uptime.current}%
            </div>
            <div className="text-sm text-gray-600 mb-4">Current Uptime</div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${mockData.uptime.current}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Target: {mockData.uptime.target}%
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <UptimeBarChart data={mockData.uptime.byEquipment} />
        <FailureRateChart
          data={mockData.failureRate.byCategory}
          current={mockData.failureRate.current}
          target={mockData.failureRate.target}
        />
      </div>

      {/* Third Row - Trend Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TrendLineChart
          data={mockData.mtbf.trend}
          title="MTBF Trend (6 Months)"
          color="#10B981"
        />
        <TrendLineChart
          data={mockData.mttr.trend}
          title="MTTR Trend (6 Months)"
          color="#F59E0B"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Reliability Score</p>
              <p className="text-2xl font-bold">92.4%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Maintenance Efficiency</p>
              <p className="text-2xl font-bold">87.6%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-blue-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Predictive Accuracy</p>
              <p className="text-2xl font-bold">89.2%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-200" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Cost Savings</p>
              <p className="text-2xl font-bold">$124K</p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Additional Metrics Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Equipment Health Distribution
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Excellent (90%+)</span>
              </div>
              <span className="text-lg font-bold text-green-600">45%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Good (80-89%)</span>
              </div>
              <span className="text-lg font-bold text-blue-600">32%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Fair (70-79%)</span>
              </div>
              <span className="text-lg font-bold text-yellow-600">18%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-700">Poor (&lt;70%)</span>
              </div>
              <span className="text-lg font-bold text-red-600">5%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Maintenance Schedule
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">This Week</p>
                <p className="text-xs text-green-600">Scheduled tasks</p>
              </div>
              <span className="text-2xl font-bold text-green-600">8</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-yellow-800">Next Week</p>
                <p className="text-xs text-yellow-600">Upcoming tasks</p>
              </div>
              <span className="text-2xl font-bold text-yellow-600">12</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">This Month</p>
                <p className="text-xs text-blue-600">Total planned</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">34</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Performance Trends
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">MTBF Trend</span>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  +8.2%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">MTTR Trend</span>
              <div className="flex items-center space-x-1">
                <TrendingDown className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  -12.5%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">OEE Trend</span>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  +5.7%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Uptime Trend</span>
              <div className="flex items-center space-x-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-600">
                  +3.1%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
