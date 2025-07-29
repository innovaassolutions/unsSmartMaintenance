/**
 * Data Validation System for MQTT to Supabase Pipeline
 * Provides comprehensive sensor data validation using Zod schemas
 */

import { z } from 'zod'
import pino from 'pino'

// Initialize logger
const logger = pino({
  name: 'data-validation',
  level: process.env.LOG_LEVEL || 'info'
})

// ==============================================
// CORE VALIDATION SCHEMAS
// ==============================================

/**
 * Base sensor data schema with common fields
 */
export const BaseSensorDataSchema = z.object({
  timestamp: z.string().datetime().transform(val => new Date(val)),
  machineId: z.string().uuid(),
  sensorType: z.string().min(1).max(50).trim().toLowerCase(),
  topicPath: z.string().min(1).trim(),
  unit: z.string().max(20).trim().optional(),
  quality: z.number().int().min(0).max(255).default(192) // OPC UA quality codes
})

/**
 * Flexible value schema supporting different data types
 */
export const FlexibleValueSchema = z.union([
  z.object({
    valueNumeric: z.number(),
    valueText: z.null().default(null),
    valueBoolean: z.null().default(null)
  }),
  z.object({
    valueNumeric: z.null().default(null),
    valueText: z.string().trim(),
    valueBoolean: z.null().default(null)
  }),
  z.object({
    valueNumeric: z.null().default(null),
    valueText: z.null().default(null),
    valueBoolean: z.boolean()
  })
])

/**
 * Complete sensor reading schema
 */
export const SensorReadingSchema = BaseSensorDataSchema.and(FlexibleValueSchema)

// ==============================================
// SENSOR-SPECIFIC VALIDATION SCHEMAS
// ==============================================

/**
 * Temperature sensor validation with range checking
 */
export const TemperatureSensorSchema = BaseSensorDataSchema.extend({
  sensorType: z.literal('temperature'),
  valueNumeric: z.number().min(-40).max(200), // Celsius range for CNC machines
  valueText: z.null().default(null),
  valueBoolean: z.null().default(null),
  unit: z.enum(['celsius', 'fahrenheit', 'kelvin']).default('celsius')
})

/**
 * Vibration sensor validation with range checking
 */
export const VibrationSensorSchema = BaseSensorDataSchema.extend({
  sensorType: z.literal('vibration'),
  valueNumeric: z.number().min(0).max(50), // mm/s range
  valueText: z.null().default(null),
  valueBoolean: z.null().default(null),
  unit: z.enum(['mm/s', 'in/s', 'g']).default('mm/s')
})

/**
 * Spindle speed sensor validation
 */
export const SpindleSpeedSensorSchema = BaseSensorDataSchema.extend({
  sensorType: z.literal('spindle_speed'),
  valueNumeric: z.number().int().min(0).max(10000), // RPM range
  valueText: z.null().default(null),
  valueBoolean: z.null().default(null),
  unit: z.enum(['rpm']).default('rpm')
})

/**
 * Tool wear sensor validation
 */
export const ToolWearSensorSchema = BaseSensorDataSchema.extend({
  sensorType: z.literal('tool_wear'),
  valueNumeric: z.number().min(0).max(100), // Percentage
  valueText: z.null().default(null),
  valueBoolean: z.null().default(null),
  unit: z.enum(['percent', '%']).default('percent')
})

/**
 * Power consumption sensor validation
 */
export const PowerSensorSchema = BaseSensorDataSchema.extend({
  sensorType: z.literal('power'),
  valueNumeric: z.number().min(0).max(50000), // Watts
  valueText: z.null().default(null),
  valueBoolean: z.null().default(null),
  unit: z.enum(['watts', 'kw', 'mw']).default('watts')
})

/**
 * Status sensor validation (boolean values)
 */
export const StatusSensorSchema = BaseSensorDataSchema.extend({
  sensorType: z.literal('status'),
  valueNumeric: z.null().default(null),
  valueText: z.null().default(null),
  valueBoolean: z.boolean(),
  unit: z.null().default(null)
})

/**
 * Mode sensor validation (string values)
 */
export const ModeSensorSchema = BaseSensorDataSchema.extend({
  sensorType: z.literal('mode'),
  valueNumeric: z.null().default(null),
  valueText: z.enum(['idle', 'running', 'maintenance', 'fault', 'offline']),
  valueBoolean: z.null().default(null),
  unit: z.null().default(null)
})

// ==============================================
// VALIDATION ERROR TYPES
// ==============================================

export interface ValidationError {
  errorType: 'schema_validation' | 'range_check' | 'type_conversion' | 'missing_field' | 'duplicate_message'
  errorMessage: string
  fieldPath?: string[]
  originalValue?: any
  expectedType?: string
  validRange?: { min?: number; max?: number }
}

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: ValidationError[]
  originalPayload: any
}

// ==============================================
// DATA VALIDATOR CLASS
// ==============================================

export class DataValidator {
  private sensorSchemas: Map<string, z.ZodSchema<any>>

  constructor() {
    this.sensorSchemas = new Map([
      ['temperature', TemperatureSensorSchema],
      ['vibration', VibrationSensorSchema],
      ['spindle_speed', SpindleSpeedSensorSchema],
      ['tool_wear', ToolWearSensorSchema],
      ['power', PowerSensorSchema],
      ['status', StatusSensorSchema],
      ['mode', ModeSensorSchema]
    ])
  }

  /**
   * Validate sensor data with appropriate schema
   */
  validateSensorData(rawPayload: any): ValidationResult<any> {
    const originalPayload = JSON.parse(JSON.stringify(rawPayload)) // Deep copy

    try {
      // First, try basic schema validation
      const baseResult = BaseSensorDataSchema.safeParse(rawPayload)
      
      if (!baseResult.success) {
        return {
          success: false,
          errors: this.parseZodErrors(baseResult.error),
          originalPayload
        }
      }

      const sensorType = baseResult.data.sensorType
      const specificSchema = this.sensorSchemas.get(sensorType)

      if (specificSchema) {
        // Use sensor-specific schema
        const specificResult = specificSchema.safeParse(rawPayload)
        
        if (specificResult.success) {
          logger.debug('Validation successful', { 
            sensorType, 
            machineId: specificResult.data.machineId 
          })
          
          return {
            success: true,
            data: specificResult.data,
            originalPayload
          }
        } else {
          logger.warn('Sensor-specific validation failed', {
            sensorType,
            errors: specificResult.error.issues
          })
          
          return {
            success: false,
            errors: this.parseZodErrors(specificResult.error),
            originalPayload
          }
        }
      } else {
        // Use generic flexible schema for unknown sensor types
        const flexibleResult = SensorReadingSchema.safeParse(rawPayload)
        
        if (flexibleResult.success) {
          logger.info('Used flexible schema for unknown sensor type', { sensorType })
          
          return {
            success: true,
            data: flexibleResult.data,
            originalPayload
          }
        } else {
          logger.error('Flexible schema validation failed', {
            sensorType,
            errors: flexibleResult.error.issues
          })
          
          return {
            success: false,
            errors: this.parseZodErrors(flexibleResult.error),
            originalPayload
          }
        }
      }
    } catch (error) {
      logger.error('Validation error occurred', { error: error.message })
      
      return {
        success: false,
        errors: [{
          errorType: 'schema_validation',
          errorMessage: `Validation error: ${error.message}`
        }],
        originalPayload
      }
    }
  }

  /**
   * Validate batch of sensor readings
   */
  validateBatch(rawPayloads: any[]): {
    validReadings: any[]
    validationErrors: Array<{ index: number; errors: ValidationError[]; originalPayload: any }>
  } {
    const validReadings: any[] = []
    const validationErrors: Array<{ index: number; errors: ValidationError[]; originalPayload: any }> = []

    rawPayloads.forEach((payload, index) => {
      const result = this.validateSensorData(payload)
      
      if (result.success && result.data) {
        validReadings.push(result.data)
      } else {
        validationErrors.push({
          index,
          errors: result.errors || [],
          originalPayload: result.originalPayload
        })
      }
    })

    logger.info('Batch validation completed', {
      total: rawPayloads.length,
      valid: validReadings.length,
      invalid: validationErrors.length
    })

    return { validReadings, validationErrors }
  }

  /**
   * Sanitize and normalize sensor data
   */
  sanitizeData(rawData: any): any {
    if (!rawData || typeof rawData !== 'object') {
      return rawData
    }

    const sanitized = { ...rawData }

    // Trim string values
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'string') {
        sanitized[key] = sanitized[key].trim()
      }
    })

    // Convert string numbers if possible
    if (sanitized.value && typeof sanitized.value === 'string') {
      const numericValue = parseFloat(sanitized.value)
      if (!isNaN(numericValue)) {
        sanitized.value = numericValue
      }
    }

    if (sanitized.quality && typeof sanitized.quality === 'string') {
      const qualityValue = parseInt(sanitized.quality, 10)
      if (!isNaN(qualityValue)) {
        sanitized.quality = qualityValue
      }
    }

    // Normalize sensor type to lowercase
    if (sanitized.sensorType && typeof sanitized.sensorType === 'string') {
      sanitized.sensorType = sanitized.sensorType.toLowerCase()
    }

    return sanitized
  }

  /**
   * Check if data quality meets minimum requirements
   */
  checkDataQuality(data: any): { isAcceptable: boolean; qualityScore: number; issues: string[] } {
    const issues: string[] = []
    let qualityScore = 1.0

    // Check OPC UA quality code
    if (data.quality !== undefined) {
      if (data.quality < 64) {
        issues.push('Bad quality code')
        qualityScore *= 0.0
      } else if (data.quality < 192) {
        issues.push('Uncertain quality code')
        qualityScore *= 0.7
      }
    }

    // Check timestamp freshness (within last 5 minutes)
    if (data.timestamp) {
      const age = Date.now() - new Date(data.timestamp).getTime()
      if (age > 5 * 60 * 1000) {
        issues.push('Stale timestamp')
        qualityScore *= 0.8
      }
    }

    // Check for missing critical fields
    if (!data.machineId) {
      issues.push('Missing machine ID')
      qualityScore *= 0.5
    }

    if (!data.sensorType) {
      issues.push('Missing sensor type')
      qualityScore *= 0.5
    }

    return {
      isAcceptable: qualityScore >= 0.5,
      qualityScore,
      issues
    }
  }

  /**
   * Convert Zod validation errors to ValidationError format
   */
  private parseZodErrors(zodError: z.ZodError): ValidationError[] {
    return zodError.issues.map(issue => ({
      errorType: 'schema_validation' as const,
      errorMessage: issue.message,
      fieldPath: issue.path.map(p => String(p)),
      originalValue: issue.received,
      expectedType: issue.expected
    }))
  }

  /**
   * Add custom sensor schema
   */
  addSensorSchema(sensorType: string, schema: z.ZodSchema<any>): void {
    this.sensorSchemas.set(sensorType.toLowerCase(), schema)
    logger.info('Added custom sensor schema', { sensorType })
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    supportedSensorTypes: string[]
    totalSchemasLoaded: number
  } {
    return {
      supportedSensorTypes: Array.from(this.sensorSchemas.keys()),
      totalSchemasLoaded: this.sensorSchemas.size
    }
  }
}

// ==============================================
// UTILITY FUNCTIONS
// ==============================================

/**
 * Create a data validator instance
 */
export function createDataValidator(): DataValidator {
  return new DataValidator()
}

/**
 * Quick validation function for single sensor reading
 */
export function validateSensorReading(rawPayload: any): ValidationResult<any> {
  const validator = createDataValidator()
  return validator.validateSensorData(rawPayload)
}

/**
 * Create validation error for database storage
 */
export function createValidationError(
  machineId: string | null,
  topicPath: string,
  errorType: ValidationError['errorType'],
  errorMessage: string,
  rawPayload: any
): {
  machineId: string | null
  topicPath: string
  errorType: string
  errorMessage: string
  rawPayload: any
  attemptedAt: Date
} {
  return {
    machineId,
    topicPath,
    errorType,
    errorMessage,
    rawPayload,
    attemptedAt: new Date()
  }
}

// Default export
export default DataValidator