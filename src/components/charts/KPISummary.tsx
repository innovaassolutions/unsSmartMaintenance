'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  status?: 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
  color?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  unit,
  change,
  changeType,
  status,
  icon,
  color = 'bg-blue-500',
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = () => {
    if (!change) return <Minus className="h-4 w-4 text-gray-400" />;

    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getChangeColor = () => {
    if (!change) return 'text-gray-500';

    switch (changeType) {
      case 'increase':
        return change > 0 ? 'text-green-600' : 'text-red-600';
      case 'decrease':
        return change < 0 ? 'text-green-600' : 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-200 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        {icon && (
          <div className={`p-2 rounded-lg ${color} text-white`}>{icon}</div>
        )}
      </div>

      <div className="flex items-baseline space-x-2 mb-2">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>

      {change !== undefined && (
        <div className="flex items-center space-x-2">
          {getChangeIcon()}
          <span className={`text-sm font-medium ${getChangeColor()}`}>
            {change > 0 ? '+' : ''}
            {change}%
          </span>
          <span className="text-xs text-gray-500">vs last period</span>
        </div>
      )}

      {status && (
        <div className="mt-3 flex items-center space-x-2">
          {status === 'success' && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {status === 'warning' && (
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          )}
          {status === 'error' && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <span className={`text-xs font-medium ${getStatusColor()}`}>
            {status === 'success' && 'On Target'}
            {status === 'warning' && 'Attention Required'}
            {status === 'error' && 'Critical Issue'}
            {status === 'info' && 'Information'}
          </span>
        </div>
      )}
    </div>
  );
};

interface KPISummaryProps {
  title?: string;
  description?: string;
  kpis: KPICardProps[];
  columns?: 2 | 3 | 4;
}

const KPISummary: React.FC<KPISummaryProps> = ({
  title,
  description,
  kpis,
  columns = 4,
}) => {
  const getGridCols = () => {
    switch (columns) {
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    }
  };

  return (
    <div className="space-y-6">
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          )}
          {description && <p className="text-gray-600">{description}</p>}
        </div>
      )}

      <div className={`grid ${getGridCols()} gap-6`}>
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>
    </div>
  );
};

export default KPISummary;
export { KPICard };
export type { KPICardProps, KPISummaryProps };





















