// Application constants for UNS Demo System

// Machine status definitions
export const MACHINE_STATUS = {
  OPERATIONAL: 'operational',
  WARNING: 'warning',
  CRITICAL: 'critical',
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline',
} as const;

export type MachineStatus =
  (typeof MACHINE_STATUS)[keyof typeof MACHINE_STATUS];

// UNS Topic Hierarchy Structure
export const UNS_TOPICS = {
  // Descriptive Layer - Physical location and equipment identification
  DESCRIPTIVE: {
    ENTERPRISE: 'UNSDemo',
    FACILITY: 'Factory1',
    AREA: 'ProductionFloor',
    LINE: 'Line1',
  },

  // Functional Layer - Machine capabilities and operational functions
  FUNCTIONAL: {
    MACHINING: 'Machining',
    MONITORING: 'Monitoring',
    CONTROL: 'Control',
  },

  // Informative Layer - Real-time data streams
  INFORMATIVE: {
    STATUS: 'Status',
    PERFORMANCE: 'Performance',
    MAINTENANCE: 'Maintenance',
    QUALITY: 'Quality',
  },
} as const;

// MQTT Configuration
export const MQTT_CONFIG = {
  QOS: 2,
  RETAIN: false,
  CLIENT_ID_PREFIX: 'uns-demo-',
  RECONNECT_PERIOD: 1000,
  CONNECT_TIMEOUT: 30 * 1000,
} as const;

// Dashboard refresh intervals (in milliseconds)
export const REFRESH_INTERVALS = {
  REAL_TIME: 1000,
  DASHBOARD: 5000,
  ANALYTICS: 30000,
  REPORTS: 300000,
} as const;

// User role definitions
export const USER_ROLES = {
  FACTORY_MANAGER: 'factory_manager',
  PRODUCTION_MANAGER: 'production_manager',
  MAINTENANCE_TECHNICIAN: 'maintenance_technician',
  C_SUITE: 'c_suite',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// Machine parameters for simulation
export const MACHINE_PARAMETERS = {
  SPINDLE_SPEED: { min: 1000, max: 8000, unit: 'RPM' },
  FEED_RATE: { min: 100, max: 2000, unit: 'mm/min' },
  TEMPERATURE: { min: 20, max: 80, unit: '°C' },
  VIBRATION: { min: 0, max: 100, unit: 'mm/s' },
  POWER_CONSUMPTION: { min: 5, max: 50, unit: 'kW' },
} as const;
