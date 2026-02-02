'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface CriticalAlertProps {
  type: string;
  message: string;
  machine: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
}

const CriticalAlert: React.FC<CriticalAlertProps> = ({
  type,
  message,
  machine,
  timestamp,
  severity,
}) => {
  const getAlertStyles = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIconColor = () => {
    switch (severity) {
      case 'critical':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className={`p-4 rounded-lg border ${getAlertStyles()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className={`h-5 w-5 mt-0.5 ${getIconColor()}`} />
          <div>
            <p className="font-semibold">{message}</p>
            <p className="text-sm opacity-75">{machine}</p>
            <p className="text-xs opacity-60">{timestamp}</p>
          </div>
        </div>
        <button className="text-xs bg-white px-3 py-1 rounded border hover:bg-gray-50">
          Acknowledge
        </button>
      </div>
    </div>
  );
};

export default CriticalAlert;
