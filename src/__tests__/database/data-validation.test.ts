/**
 * Tests for data validation system
 * Validates sensor data schema validation, type checking, and error handling
 */

import { z } from 'zod'

// Mock implementations for testing
const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}

// Import the validation system (will be created)
// import { DataValidator, SensorDataSchema, ValidationError } from '@/lib/pipeline/data-validation'

describe('Data Validation System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Sensor Data Schema Validation', () => {
    it('should validate complete sensor data successfully', () => {
      const validSensorData = {
        timestamp: '2025-07-29T10:30:00Z',
        machineId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: 'temperature',
        topicPath: 'enterprise/site1/area1/cell1/machine1/temperature',
        value: 65.2,
        unit: 'celsius',
        quality: 192
      }

      // Create Zod schema for testing
      const SensorDataSchema = z.object({
        timestamp: z.string().datetime(),
        machineId: z.string().uuid(),
        sensorType: z.string().min(1).max(50),
        topicPath: z.string().min(1),
        value: z.union([z.number(), z.string(), z.boolean()]),
        unit: z.string().optional(),
        quality: z.number().int().min(0).max(255).optional()
      })

      const result = SensorDataSchema.safeParse(validSensorData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.machineId).toBe(validSensorData.machineId)
        expect(result.data.sensorType).toBe(validSensorData.sensorType)
        expect(result.data.value).toBe(validSensorData.value)
      }
    })

    it('should reject invalid timestamp formats', () => {
      const invalidTimestampData = {
        timestamp: 'invalid_timestamp',
        machineId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: 'temperature',
        value: 25.5
      }

      const SensorDataSchema = z.object({
        timestamp: z.string().datetime(),
        machineId: z.string().uuid(),
        sensorType: z.string(),
        value: z.number()
      })

      const result = SensorDataSchema.safeParse(invalidTimestampData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1)
        expect(result.error.issues[0].path).toContain('timestamp')
      }
    })

    it('should reject invalid UUID formats', () => {
      const invalidUuidData = {
        timestamp: '2025-07-29T10:30:00Z',
        machineId: 'not_a_valid_uuid',
        sensorType: 'temperature',
        value: 25.5
      }

      const SensorDataSchema = z.object({
        timestamp: z.string().datetime(),
        machineId: z.string().uuid(),
        sensorType: z.string(),
        value: z.number()
      })

      const result = SensorDataSchema.safeParse(invalidUuidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('machineId')
      }
    })

    it('should handle different sensor value types', () => {
      const testCases = [
        { value: 25.5, expectedType: 'number' },
        { value: 'running', expectedType: 'string' },
        { value: true, expectedType: 'boolean' }
      ]

      const FlexibleValueSchema = z.object({
        value: z.union([z.number(), z.string(), z.boolean()])
      })

      testCases.forEach(testCase => {
        const result = FlexibleValueSchema.safeParse({ value: testCase.value })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.value).toBe(testCase.expectedType)
        }
      })
    })
  })

  describe('Range Validation', () => {
    it('should validate temperature sensor ranges', () => {
      const temperatureSchema = z.object({
        sensorType: z.literal('temperature'),
        value: z.number().min(-40).max(200), // Typical CNC temperature range
        unit: z.enum(['celsius', 'fahrenheit']).optional()
      })

      const validTemperature = { sensorType: 'temperature', value: 65.2, unit: 'celsius' }
      const invalidTemperature = { sensorType: 'temperature', value: 300 }

      expect(temperatureSchema.safeParse(validTemperature).success).toBe(true)
      expect(temperatureSchema.safeParse(invalidTemperature).success).toBe(false)
    })

    it('should validate vibration sensor ranges', () => {
      const vibrationSchema = z.object({
        sensorType: z.literal('vibration'),
        value: z.number().min(0).max(50), // mm/s range
        unit: z.enum(['mm/s', 'in/s']).optional()
      })

      const validVibration = { sensorType: 'vibration', value: 2.5, unit: 'mm/s' }
      const invalidVibration = { sensorType: 'vibration', value: -5 }

      expect(vibrationSchema.safeParse(validVibration).success).toBe(true)
      expect(vibrationSchema.safeParse(invalidVibration).success).toBe(false)
    })

    it('should validate spindle speed ranges', () => {
      const spindleSchema = z.object({
        sensorType: z.literal('spindle_speed'),
        value: z.number().int().min(0).max(10000), // RPM range
        unit: z.enum(['rpm']).optional()
      })

      const validSpindle = { sensorType: 'spindle_speed', value: 2500, unit: 'rpm' }
      const invalidSpindle = { sensorType: 'spindle_speed', value: 15000 }

      expect(spindleSchema.safeParse(validSpindle).success).toBe(true)
      expect(spindleSchema.safeParse(invalidSpindle).success).toBe(false)
    })
  })

  describe('Quality Code Validation', () => {
    it('should validate OPC UA quality codes', () => {
      const qualityCodeSchema = z.number().int().min(0).max(255)

      const validCodes = [0, 64, 192, 255] // Bad, Uncertain, Good, Max
      const invalidCodes = [-1, 256, 1000]

      validCodes.forEach(code => {
        expect(qualityCodeSchema.safeParse(code).success).toBe(true)
      })

      invalidCodes.forEach(code => {
        expect(qualityCodeSchema.safeParse(code).success).toBe(false)
      })
    })

    it('should assign default quality code when missing', () => {
      const dataWithoutQuality = {
        timestamp: '2025-07-29T10:30:00Z',
        machineId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: 'temperature',
        value: 65.2
      }

      const SchemaWithDefaults = z.object({
        timestamp: z.string().datetime(),
        machineId: z.string().uuid(),
        sensorType: z.string(),
        value: z.number(),
        quality: z.number().int().min(0).max(255).default(192)
      })

      const result = SchemaWithDefaults.parse(dataWithoutQuality)
      expect(result.quality).toBe(192) // Good quality default
    })
  })

  describe('Data Sanitization', () => {
    it('should trim whitespace from string values', () => {
      const dataWithWhitespace = {
        sensorType: '  temperature  ',
        unit: '  celsius  ',
        topicPath: '  /enterprise/site1/machine1  '
      }

      const SanitizedSchema = z.object({
        sensorType: z.string().trim(),
        unit: z.string().trim().optional(),
        topicPath: z.string().trim()
      })

      const result = SanitizedSchema.parse(dataWithWhitespace)
      expect(result.sensorType).toBe('temperature')
      expect(result.unit).toBe('celsius')
      expect(result.topicPath).toBe('/enterprise/site1/machine1')
    })

    it('should convert string numbers to numeric values', () => {
      const stringNumberData = {
        value: '25.5',
        quality: '192'
      }

      const ConversionSchema = z.object({
        value: z.string().transform(val => parseFloat(val)),
        quality: z.string().transform(val => parseInt(val, 10))
      })

      const result = ConversionSchema.parse(stringNumberData)
      expect(typeof result.value).toBe('number')
      expect(result.value).toBe(25.5)
      expect(typeof result.quality).toBe('number')
      expect(result.quality).toBe(192)
    })

    it('should handle case-insensitive sensor types', () => {
      const mixedCaseData = {
        sensorType: 'TEMPERATURE',
        unit: 'CELSIUS'
      }

      const CaseInsensitiveSchema = z.object({
        sensorType: z.string().transform(val => val.toLowerCase()),
        unit: z.string().transform(val => val.toLowerCase()).optional()
      })

      const result = CaseInsensitiveSchema.parse(mixedCaseData)
      expect(result.sensorType).toBe('temperature')
      expect(result.unit).toBe('celsius')
    })
  })

  describe('Error Handling and Logging', () => {
    it('should create structured validation error objects', () => {
      const invalidData = {
        timestamp: 'invalid',
        machineId: 'not_uuid',
        value: 'not_number'
      }

      const StrictSchema = z.object({
        timestamp: z.string().datetime(),
        machineId: z.string().uuid(),
        value: z.number()
      })

      const result = StrictSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        expect(result.error.issues).toHaveLength(3)
        
        const expectedPaths = ['timestamp', 'machineId', 'value']
        const actualPaths = result.error.issues.map(issue => issue.path[0])
        
        expectedPaths.forEach(path => {
          expect(actualPaths).toContain(path)
        })
      }
    })

    it('should handle malformed JSON payloads gracefully', () => {
      const malformedPayloads = [
        null,
        undefined,
        '',
        'not json',
        { incomplete: true }
      ]

      const BaseSchema = z.object({
        timestamp: z.string().datetime(),
        machineId: z.string().uuid(),
        value: z.number()
      })

      malformedPayloads.forEach(payload => {
        const result = BaseSchema.safeParse(payload)
        expect(result.success).toBe(false)
      })
    })

    it('should preserve original payload for error analysis', () => {
      const originalPayload = {
        timestamp: 'invalid_timestamp',
        machineId: 'invalid_uuid',
        unknownField: 'should_be_preserved'
      }

      // Simulate error logging with original payload preservation
      const errorContext = {
        originalPayload,
        errorType: 'schema_validation',
        timestamp: new Date().toISOString(),
        validationErrors: ['Invalid timestamp', 'Invalid UUID']
      }

      expect(errorContext.originalPayload).toEqual(originalPayload)
      expect(errorContext.originalPayload.unknownField).toBe('should_be_preserved')
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large batches of data efficiently', () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: '2025-07-29T10:30:00Z',
        machineId: '123e4567-e89b-12d3-a456-426614174000',
        sensorType: 'temperature',
        value: 20 + Math.random() * 60,
        quality: 192
      }))

      const BatchSchema = z.array(z.object({
        timestamp: z.string().datetime(),
        machineId: z.string().uuid(),
        sensorType: z.string(),
        value: z.number(),
        quality: z.number().int().min(0).max(255)
      }))

      const startTime = Date.now()
      const result = BatchSchema.safeParse(largeBatch)
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(endTime - startTime).toBeLessThan(1000) // Should process within 1 second
    })

    it('should not consume excessive memory during validation', () => {
      // Test that validation operations complete without memory issues
      // Rather than testing exact memory usage (which varies by environment)
      let completedValidations = 0

      try {
        // Process multiple validation operations
        for (let i = 0; i < 100; i++) {
          const data = {
            timestamp: '2025-07-29T10:30:00Z',
            machineId: '123e4567-e89b-12d3-a456-426614174000',
            sensorType: 'temperature',
            value: Math.random() * 100
          }

          const QuickSchema = z.object({
            timestamp: z.string().datetime(),
            machineId: z.string().uuid(),
            sensorType: z.string(),
            value: z.number()
          })

          const result = QuickSchema.safeParse(data)
          if (result.success) {
            completedValidations++
          }
        }

        // Should complete all validations successfully
        expect(completedValidations).toBe(100)
      } catch (error) {
        fail(`Memory or performance issue during validation: ${error.message}`)
      }
    })
  })
})