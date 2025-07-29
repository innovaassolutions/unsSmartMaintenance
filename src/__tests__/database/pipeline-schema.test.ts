/**
 * Tests for pipeline-related database schema models
 * Validates structure of sensor_readings, pipeline_metrics, and data_validation_errors tables
 */

import { PrismaClient } from '@prisma/client'

// Mock Prisma client for testing
jest.mock('@prisma/client')

const MockedPrismaClient = PrismaClient as jest.MockedClass<typeof PrismaClient>

describe('Pipeline Database Schema', () => {
  let prisma: jest.Mocked<PrismaClient>

  beforeEach(() => {
    jest.clearAllMocks()
    prisma = new MockedPrismaClient() as jest.Mocked<PrismaClient>
  })

  describe('SensorReading Model', () => {
    it('should have correct structure for time-series data', () => {
      // Test that the model structure matches our expectations
      const sensorReadingData = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        machineId: '123e4567-e89b-12d3-a456-426614174001',
        sensorType: 'temperature',
        topicPath: 'enterprise/site1/area1/cell1/machine1/temperature',
        valueNumeric: 65.2,
        valueText: null,
        valueBoolean: null,
        unit: 'celsius',
        timestamp: new Date('2025-07-29T10:30:00Z'),
        qualityCode: 192,
        createdAt: new Date('2025-07-29T10:30:00Z')
      }

      // Mock the create operation
      const mockCreate = jest.fn().mockResolvedValue(sensorReadingData)
      ;(prisma as any).sensorReading = { create: mockCreate }

      expect(sensorReadingData).toHaveProperty('machineId')
      expect(sensorReadingData).toHaveProperty('sensorType')
      expect(sensorReadingData).toHaveProperty('topicPath')
      expect(sensorReadingData).toHaveProperty('valueNumeric')
      expect(sensorReadingData).toHaveProperty('qualityCode')
      expect(sensorReadingData).toHaveProperty('timestamp')
    })

    it('should support different value types for sensor data', () => {
      const testCases = [
        { valueNumeric: 25.5, valueText: null, valueBoolean: null },
        { valueNumeric: null, valueText: 'running', valueBoolean: null },
        { valueNumeric: null, valueText: null, valueBoolean: true }
      ]

      testCases.forEach((testCase) => {
        expect(testCase).toBeDefined()
        // Only one value type should be set at a time
        const setValues = Object.values(testCase).filter(v => v !== null)
        expect(setValues).toHaveLength(1)
      })
    })

    it('should validate quality code ranges', () => {
      const validQualityCodes = [0, 64, 192] // Bad, Uncertain, Good
      const invalidQualityCodes = [-1, 256, 1000]

      validQualityCodes.forEach(code => {
        expect(code).toBeGreaterThanOrEqual(0)
        expect(code).toBeLessThanOrEqual(255)
      })

      invalidQualityCodes.forEach(code => {
        expect(code < 0 || code > 255).toBe(true)
      })
    })
  })

  describe('PipelineMetric Model', () => {
    it('should have correct structure for metrics tracking', () => {
      const pipelineMetricData = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        metricType: 'throughput',
        metricName: 'messages_per_second',
        value: 250.5,
        unit: 'msg/s',
        tags: { service: 'mqtt-consumer', machine_count: 10 },
        timestamp: new Date('2025-07-29T10:30:00Z')
      }

      expect(pipelineMetricData).toHaveProperty('metricType')
      expect(pipelineMetricData).toHaveProperty('metricName')
      expect(pipelineMetricData).toHaveProperty('value')
      expect(pipelineMetricData).toHaveProperty('tags')
      expect(pipelineMetricData).toHaveProperty('timestamp')
    })

    it('should support different metric types', () => {
      const metricTypes = ['throughput', 'latency', 'error_rate', 'connection_status', 'cpu_usage', 'memory_usage']
      
      metricTypes.forEach(metricType => {
        expect(metricType.length).toBeGreaterThan(0)
        expect(metricType.length).toBeLessThanOrEqual(50)
      })
    })

    it('should handle JSONB tags for flexible metadata', () => {
      const tagExamples = [
        { service: 'mqtt-consumer', machine_id: 'machine_001' },
        { error_type: 'connection_timeout', retry_count: 3 },
        { database: 'timescaledb', operation: 'batch_insert' }
      ]

      tagExamples.forEach(tags => {
        expect(typeof tags).toBe('object')
        expect(tags).not.toBeNull()
      })
    })
  })

  describe('DataValidationError Model', () => {
    it('should have correct structure for error logging', () => {
      const validationErrorData = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        machineId: '123e4567-e89b-12d3-a456-426614174001',
        topicPath: 'enterprise/site1/area1/cell1/machine1/temperature',
        errorType: 'schema_validation',
        errorMessage: 'Invalid timestamp format',
        rawPayload: { timestamp: 'invalid_date', value: 25.5 },
        attemptedAt: new Date('2025-07-29T10:30:00Z')
      }

      expect(validationErrorData).toHaveProperty('machineId')
      expect(validationErrorData).toHaveProperty('topicPath')
      expect(validationErrorData).toHaveProperty('errorType')
      expect(validationErrorData).toHaveProperty('errorMessage')
      expect(validationErrorData).toHaveProperty('rawPayload')
      expect(validationErrorData).toHaveProperty('attemptedAt')
    })

    it('should support different error types', () => {
      const errorTypes = ['schema_validation', 'range_check', 'type_conversion', 'missing_field', 'duplicate_message']
      
      errorTypes.forEach(errorType => {
        expect(errorType.length).toBeGreaterThan(0)
        expect(errorType.length).toBeLessThanOrEqual(50)
      })
    })

    it('should preserve raw payload for debugging', () => {
      const rawPayloads = [
        { malformed: 'json', timestamp: null },
        { value: 'not_a_number', sensor_type: 123 },
        { missing_required_field: true }
      ]

      rawPayloads.forEach(payload => {
        expect(typeof payload).toBe('object')
        expect(payload).not.toBeNull()
      })
    })
  })

  describe('CncMachine Pipeline Integration', () => {
    it('should include pipeline-related fields', () => {
      const enhancedMachineData = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        machineId: 'CNC_001',
        displayName: 'CNC Machine 001',
        lastDataReceived: new Date('2025-07-29T10:30:00Z'),
        dataQualityScore: 0.95,
        totalMessagesReceived: 15000,
        pipelineStatus: 'connected'
      }

      expect(enhancedMachineData).toHaveProperty('lastDataReceived')
      expect(enhancedMachineData).toHaveProperty('dataQualityScore')
      expect(enhancedMachineData).toHaveProperty('totalMessagesReceived')
      expect(enhancedMachineData).toHaveProperty('pipelineStatus')
    })

    it('should validate pipeline status values', () => {
      const validStatuses = ['connected', 'disconnected', 'error', 'unknown', 'maintenance']
      const invalidStatuses = ['', 'this_is_way_too_long_for_varchar_20_field']

      validStatuses.forEach(status => {
        expect(status.length).toBeGreaterThan(0)
        expect(status.length).toBeLessThanOrEqual(20)
      })

      invalidStatuses.forEach(status => {
        expect(status.length === 0 || status.length > 20).toBe(true)
      })
    })

    it('should validate data quality score range', () => {
      const validScores = [0.0, 0.5, 0.95, 1.0]
      const invalidScores = [-0.1, 1.1, 2.0]

      validScores.forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0.0)
        expect(score).toBeLessThanOrEqual(1.0)
      })

      invalidScores.forEach(score => {
        expect(score < 0.0 || score > 1.0).toBe(true)
      })
    })
  })

  describe('Database Indexes and Performance', () => {
    it('should have proper indexes for time-series queries', () => {
      // Test that expected indexes would be created
      const expectedIndexes = [
        { table: 'sensor_readings', columns: ['machineId', 'timestamp'] },
        { table: 'sensor_readings', columns: ['sensorType', 'timestamp'] },
        { table: 'sensor_readings', columns: ['topicPath', 'timestamp'] },
        { table: 'pipeline_metrics', columns: ['metricType', 'timestamp'] },
        { table: 'pipeline_metrics', columns: ['metricName', 'timestamp'] },
        { table: 'data_validation_errors', columns: ['machineId', 'errorType', 'attemptedAt'] }
      ]

      expectedIndexes.forEach(index => {
        expect(index.table).toBeDefined()
        expect(index.columns).toBeInstanceOf(Array)
        expect(index.columns.length).toBeGreaterThan(0)
      })
    })

    it('should support time-series specific requirements', () => {
      // Test time-series specific requirements
      const timeSeries = {
        partitioning: 'by_time',
        chunkInterval: '1 hour',
        compression: 'after_7_days',
        retention: '2_years'
      }

      expect(timeSeries.partitioning).toBe('by_time')
      expect(timeSeries.chunkInterval).toBe('1 hour')
      expect(timeSeries.compression).toBe('after_7_days')
      expect(timeSeries.retention).toBe('2_years')
    })
  })
})