import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Industrial theme utility functions
export function getStatusColor(status: string) {
  const statusColors = {
    operational: 'text-status-operational',
    warning: 'text-status-warning',
    critical: 'text-status-critical',
    maintenance: 'text-status-maintenance',
    offline: 'text-status-offline',
  };

  return statusColors[status as keyof typeof statusColors] || 'text-gray-500';
}

export function getStatusBgColor(status: string) {
  const statusBgColors = {
    operational: 'bg-status-operational',
    warning: 'bg-status-warning',
    critical: 'bg-status-critical',
    maintenance: 'bg-status-maintenance',
    offline: 'bg-status-offline',
  };

  return statusBgColors[status as keyof typeof statusBgColors] || 'bg-gray-500';
}

// Format numbers for industrial display
export function formatIndustrialValue(value: number, unit?: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}
