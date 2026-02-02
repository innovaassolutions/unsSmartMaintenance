/**
 * Logger utility for UNS Smart Maintenance System
 * Provides structured logging with different levels and contexts
 */

import pino from 'pino';

// Create base logger with pretty printing for development
const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  transport: process.env.NODE_ENV === 'development' 
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
});

// Create child loggers for different modules
export const mlLogger = logger.child({ module: 'ml-pipeline' });
export const etlLogger = logger.child({ module: 'etl' });
export const bigQueryLogger = logger.child({ module: 'bigquery' });
export const timescaleLogger = logger.child({ module: 'timescale' });
export const featureLogger = logger.child({ module: 'feature-engineering' });

// Export default logger
export { logger };