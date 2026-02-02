'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

interface KeyMetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend?: number | null;
  target?: string | null;
}

const KeyMetricCard: React.FC<KeyMetricCardProps> = ({ title, value, unit, status, trend, target }) => {
    const getStatusColor = () => {
      switch (status) {
        case 'excellent':
          return 'text-green-600 bg-green-50';
        case 'good':
          return 'text-blue-600 bg-blue-50';
        case 'warning':
          return 'text-yellow-600 bg-yellow-50';
        case 'critical':
          return 'text-red-600 bg-red-50';
        default:
          return 'text-gray-600 bg-gray-50';
      }
    };
  
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
            {status}
          </div>
        </div>
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="text-3xl font-bold text-gray-900">{value}</span>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
        {target && (
          <p className="text-xs text-gray-500">Target: {target}{unit}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2 space-x-1">
            {trend > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-red-500 transform rotate-180" />
            )}
            <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend > 0 ? '+' : ''}{trend}% vs last week
            </span>
          </div>
        )}
      </div>
    );
  };

  export default KeyMetricCard;