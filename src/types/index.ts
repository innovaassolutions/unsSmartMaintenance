// Core type definitions for UNS Demo System

import { MACHINE_STATUS, USER_ROLES } from '@/lib/utils/constants';

// Machine-related types
export interface Machine {
  id: string;
  name: string;
  model: string;
  location: string;
  status: MachineStatus;
  lastUpdated: Date;
  parameters: MachineParameters;
}

export type MachineStatus =
  (typeof MACHINE_STATUS)[keyof typeof MACHINE_STATUS];

export interface MachineParameters {
  spindleSpeed: number;
  feedRate: number;
  temperature: number;
  vibration: number;
  powerConsumption: number;
}

// User and role types
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
}

// Dashboard data types
export interface DashboardData {
  machines: Machine[];
  alerts: Alert[];
  kpis: KPIMetrics;
  lastUpdated: Date;
}

export interface Alert {
  id: string;
  machineId: string;
  type: 'warning' | 'critical' | 'maintenance';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface KPIMetrics {
  overallEfficiency: number;
  availabilityRate: number;
  qualityRate: number;
  performanceRate: number;
  maintenanceCosts: number;
  predictedFailures: number;
}

// MQTT message types
export interface MQTTMessage {
  topic: string;
  payload: unknown;
  timestamp: Date;
  qos: number;
  retain: boolean;
}

export interface UNSMessage extends MQTTMessage {
  enterpriseId: string;
  facilityId: string;
  areaId: string;
  lineId: string;
  machineId: string;
  dataType: string;
}

// Predictive analytics types
export interface PredictionModel {
  id: string;
  name: string;
  type: 'failure_prediction' | 'maintenance_optimization';
  accuracy: number;
  lastTrained: Date;
  isActive: boolean;
}

export interface Prediction {
  id: string;
  machineId: string;
  modelId: string;
  predictionType: string;
  probability: number;
  timeToEvent: number; // in hours
  confidence: number;
  recommendedActions: string[];
  createdAt: Date;
}

// Chart and visualization types
export interface ChartDataPoint {
  timestamp: Date | string;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  parameter: string;
  unit: string;
  data: ChartDataPoint[];
}

// API response types
export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: Date;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
