// UNS (Unified Namespace) Type Definitions

export type UNSLayer = 'descriptive' | 'functional' | 'informational' | 'ad_hoc';

export type DataType = 'number' | 'string' | 'boolean' | 'object';

export type OperationalStatus = 'operational' | 'maintenance' | 'offline' | 'error';

export type UserRole = 'factory_manager' | 'production_manager' | 'maintenance_technician' | 'executive';

export type AccessLevel = 'read' | 'write' | 'admin';

// Topic Registry Types
export interface TopicRegistry {
  id: string;
  topic_path: string;
  topic_type: UNSLayer;
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  work_unit: string;
  data_category: string;
  metric_name: string;
  description?: string;
  unit?: string;
  data_type: DataType;
  min_value?: number;
  max_value?: number;
  schema_definition?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// CNC Machine Types
export interface CNCMachine {
  id: string;
  machine_id: string;
  display_name: string;
  manufacturer?: string;
  model?: string;
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  installation_date?: Date;
  operational_status: OperationalStatus;
  capabilities?: Record<string, any>;
  specifications?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

// Topic Subscription Types
export interface TopicSubscription {
  id: string;
  user_role: UserRole;
  topic_pattern: string;
  access_level: AccessLevel;
  description?: string;
  is_active: boolean;
  created_at: Date;
}

// ISA-95 Hierarchy Components
export interface HierarchyComponents {
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  work_unit: string;
  layer?: string;
  data_category?: string;
  metric_name?: string;
}

// Location Filter for Machine Queries
export interface LocationFilter {
  enterprise?: string;
  site?: string;
  area?: string;
  work_cell?: string;
}

// MQTT Message Payload Schema
export interface MQTTPayload {
  timestamp: string; // ISO 8601 format
  source: string;
  value: any;
  unit?: string;
  quality?: 'good' | 'bad' | 'uncertain';
  metadata?: Record<string, any>;
}

// Topic Validation Result
export interface TopicValidationResult {
  isValid: boolean;
  errors: string[];
  hierarchy?: HierarchyComponents;
}

// Schema Validation Options
export interface SchemaValidationOptions {
  strict?: boolean;
  allowAdditionalProperties?: boolean;
  coerceTypes?: boolean;
}

// Topic Pattern Match Result
export interface TopicMatchResult {
  subscription: TopicSubscription;
  matchedPattern: string;
  accessGranted: boolean;
}

// Machine Status Transition
export interface StatusTransition {
  from: OperationalStatus;
  to: OperationalStatus;
  isValid: boolean;
  reason?: string;
}

// UNS Topic Builder Options
export interface TopicBuilderOptions {
  validateHierarchy?: boolean;
  enforceNamingConvention?: boolean;
  includeTimestamp?: boolean;
}

// Standard Units Enumeration
export enum StandardUnits {
  // Temperature
  CELSIUS = 'celsius',
  FAHRENHEIT = 'fahrenheit',
  KELVIN = 'kelvin',
  
  // Pressure
  BAR = 'bar',
  PSI = 'psi',
  PASCAL = 'Pa',
  
  // Speed/Frequency
  RPM = 'rpm',
  HERTZ = 'Hz',
  
  // Power
  KILOWATT = 'kW',
  HORSEPOWER = 'hp',
  WATT = 'W',
  
  // Length/Distance
  MILLIMETER = 'mm',
  CENTIMETER = 'cm',
  METER = 'm',
  INCH = 'in',
  
  // Velocity
  MM_PER_SECOND = 'mm/s',
  M_PER_SECOND = 'm/s',
  
  // Percentage
  PERCENT = 'percent',
  
  // Time
  SECOND = 's',
  MINUTE = 'min',
  HOUR = 'h',
  
  // Flow Rate
  LITERS_PER_MINUTE = 'L/min',
  GALLONS_PER_MINUTE = 'gpm',
  
  // Volume
  LITER = 'L',
  GALLON = 'gal',
  
  // Weight/Mass
  KILOGRAM = 'kg',
  POUND = 'lb',
  GRAM = 'g'
}

// Topic Registry Input for Creation
export type CreateTopicRegistryInput = Omit<TopicRegistry, 'id' | 'created_at' | 'updated_at'>;

// CNC Machine Input for Creation
export type CreateCNCMachineInput = Omit<CNCMachine, 'id' | 'created_at' | 'updated_at'>;

// Topic Subscription Input for Creation
export type CreateTopicSubscriptionInput = Omit<TopicSubscription, 'id' | 'created_at'>;

// Export commonly used type unions
export type AllowedTopicLayers = UNSLayer;
export type AllowedDataTypes = DataType;
export type AllowedOperationalStatuses = OperationalStatus;
export type AllowedUserRoles = UserRole;
export type AllowedAccessLevels = AccessLevel;