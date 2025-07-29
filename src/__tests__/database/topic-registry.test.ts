/**
 * @jest-environment node
 */

import { TopicRegistry } from '../../lib/database/topic-registry';
import { TopicValidator } from '../../lib/database/topic-validator';
import { UNSHierarchy } from '../../lib/database/uns-hierarchy';
import { mocks } from '../../__mocks__/lib/database/supabase-client';

// Mock dependencies
jest.mock('../../lib/database/supabase-client');

describe('TopicRegistry', () => {
  let topicRegistry: TopicRegistry;
  let topicValidator: TopicValidator;
  let unsHierarchy: UNSHierarchy;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    topicRegistry = new TopicRegistry();
    topicValidator = new TopicValidator();
    unsHierarchy = new UNSHierarchy();
  });

  describe('registerTopic', () => {
    it('should successfully register a new topic with all required fields', async () => {
      const topicData = {
        topic_path: 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed',
        topic_type: 'informational' as const,
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        data_category: 'sensors',
        metric_name: 'spindle-speed',
        description: 'Current spindle rotation speed',
        unit: 'rpm',
        data_type: 'number' as const,
        min_value: 0,
        max_value: 8100,
        schema_definition: {
          type: 'number',
          minimum: 0,
          maximum: 8100
        }
      };

      // Mock no existing topic found
      mocks.topicRegistry.findUnique.mockResolvedValue(null);
      
      // Mock successful creation
      const mockCreatedTopic = {
        id: 'test-topic-id',
        ...topicData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      mocks.topicRegistry.create.mockResolvedValue(mockCreatedTopic);

      const result = await topicRegistry.registerTopic(topicData);

      expect(result).toHaveProperty('id');
      expect(result.topic_path).toBe(topicData.topic_path);
      expect(result.topic_type).toBe(topicData.topic_type);
      expect(result.is_active).toBe(true);
      expect(mocks.topicRegistry.findUnique).toHaveBeenCalledWith({
        where: { topic_path: topicData.topic_path }
      });
      expect(mocks.topicRegistry.create).toHaveBeenCalled();
    });

    it('should reject topic registration with invalid ISA-95 hierarchy', async () => {
      const invalidTopicData = {
        topic_path: 'invalid/path',
        topic_type: 'informational' as const,
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        data_category: 'sensors',
        metric_name: 'spindle-speed',
        description: 'Test description',
        unit: 'rpm',
        data_type: 'number' as const
      };

      await expect(topicRegistry.registerTopic(invalidTopicData))
        .rejects
        .toThrow('Invalid topic path structure');
    });

    it('should reject duplicate topic paths', async () => {
      const topicData = {
        topic_path: 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed',
        topic_type: 'informational' as const,
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        data_category: 'sensors',
        metric_name: 'spindle-speed',
        description: 'Current spindle rotation speed',
        unit: 'rpm',
        data_type: 'number' as const
      };

      // Mock existing topic found
      const existingTopic = {
        id: 'existing-topic-id',
        ...topicData,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      mocks.topicRegistry.findUnique.mockResolvedValue(existingTopic);

      // Attempt to register same topic again
      await expect(topicRegistry.registerTopic(topicData))
        .rejects
        .toThrow('Topic path already exists');
    });
  });

  describe('updateTopicSchema', () => {
    it('should update existing topic schema while maintaining backward compatibility', async () => {
      const initialTopic = {
        id: 'test-topic-id',
        topic_path: 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/temperature',
        topic_type: 'informational',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        data_category: 'sensors',
        metric_name: 'temperature',
        description: 'Current temperature',
        unit: 'celsius',
        data_type: 'number',
        min_value: null,
        max_value: null,
        schema_definition: {
          properties: {
            value: {
              type: 'number',
              minimum: -40,
              maximum: 150
            }
          }
        },
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      // Mock finding existing topic
      mocks.topicRegistry.findUnique.mockResolvedValue(initialTopic);

      // Update the schema
      const updatedSchema = {
        properties: {
          value: {
            type: 'number',
            minimum: -40,
            maximum: 200,
            precision: 2
          }
        }
      };

      const updatedTopic = {
        ...initialTopic,
        schema_definition: updatedSchema,
        updated_at: new Date()
      };

      mocks.topicRegistry.update.mockResolvedValue(updatedTopic);

      const result = await topicRegistry.updateTopicSchema(initialTopic.id, updatedSchema);

      expect(result.schema_definition).toEqual(updatedSchema);
      expect(result.updated_at).toBeDefined();
    });

    it('should reject schema updates that break backward compatibility', async () => {
      const topicId = 'test-topic-id';
      const existingTopic = {
        id: topicId,
        topic_path: 'test/path',
        schema_definition: {
          properties: {
            value: {
              type: 'number'
            }
          }
        }
      };

      // Mock finding existing topic
      mocks.topicRegistry.findUnique.mockResolvedValue(existingTopic);

      const invalidSchema = {
        properties: {
          value: {
            type: 'string' // Changed from number to string - breaking change
          }
        }
      };

      await expect(topicRegistry.updateTopicSchema(topicId, invalidSchema))
        .rejects
        .toThrow('Schema update would break backward compatibility');
    });
  });

  describe('deactivateTopic', () => {
    it('should properly soft-delete topic while preserving historical data', async () => {
      const topicData = {
        topic_path: 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/vibration',
        topic_type: 'informational' as const,
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        data_category: 'sensors',
        metric_name: 'vibration',
        description: 'Vibration measurement',
        unit: 'mm/s',
        data_type: 'number' as const
      };

      const registeredTopic = await topicRegistry.registerTopic(topicData);
      const result = await topicRegistry.deactivateTopic(registeredTopic.id);

      expect(result.is_active).toBe(false);
      expect(result.updated_at).toBeDefined();
    });
  });

  describe('findTopicByPath', () => {
    it('should retrieve topic metadata by exact path match', async () => {
      const topicPath = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/power';
      const topicData = {
        topic_path: topicPath,
        topic_type: 'informational' as const,
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        data_category: 'sensors',
        metric_name: 'power',
        description: 'Power consumption',
        unit: 'kW',
        data_type: 'number' as const
      };

      await topicRegistry.registerTopic(topicData);
      const result = await topicRegistry.findTopicByPath(topicPath);

      expect(result).toBeDefined();
      expect(result?.topic_path).toBe(topicPath);
      expect(result?.is_active).toBe(true);
    });

    it('should return null for non-existent topic path', async () => {
      const result = await topicRegistry.findTopicByPath('non-existent/topic/path');
      expect(result).toBeNull();
    });
  });

  describe('searchTopicsByPattern', () => {
    beforeEach(async () => {
      // Register multiple topics for pattern testing
      const topics = [
        {
          topic_path: 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed',
          topic_type: 'informational' as const,
          enterprise: 'uns-demo',
          site: 'factory-floor',
          area: 'machining',
          work_cell: 'cell-01',
          work_unit: 'cnc-001',
          data_category: 'sensors',
          metric_name: 'spindle-speed',
          description: 'Spindle speed',
          unit: 'rpm',
          data_type: 'number' as const
        },
        {
          topic_path: 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/temperature',
          topic_type: 'informational' as const,
          enterprise: 'uns-demo',
          site: 'factory-floor',
          area: 'machining',
          work_cell: 'cell-01',
          work_unit: 'cnc-001',
          data_category: 'sensors',
          metric_name: 'temperature',
          description: 'Temperature',
          unit: 'celsius',
          data_type: 'number' as const
        },
        {
          topic_path: 'uns-demo/factory-floor/machining/cell-01/cnc-002/info/sensors/spindle-speed',
          topic_type: 'informational' as const,
          enterprise: 'uns-demo',
          site: 'factory-floor',
          area: 'machining',
          work_cell: 'cell-01',
          work_unit: 'cnc-002',
          data_category: 'sensors',
          metric_name: 'spindle-speed',
          description: 'Spindle speed',
          unit: 'rpm',
          data_type: 'number' as const
        }
      ];

      for (const topic of topics) {
        await topicRegistry.registerTopic(topic);
      }
    });

    it('should return topics matching wildcard patterns', async () => {
      const pattern = 'uns-demo/factory-floor/machining/cell-01/+/info/sensors/spindle-speed';
      const results = await topicRegistry.searchTopicsByPattern(pattern);

      expect(results).toHaveLength(2);
      expect(results.every(topic => topic.metric_name === 'spindle-speed')).toBe(true);
    });

    it('should return all sensor topics for a specific machine', async () => {
      const pattern = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/+';
      const results = await topicRegistry.searchTopicsByPattern(pattern);

      expect(results).toHaveLength(2);
      expect(results.every(topic => topic.work_unit === 'cnc-001')).toBe(true);
      expect(results.every(topic => topic.data_category === 'sensors')).toBe(true);
    });

    it('should handle multi-level wildcard patterns', async () => {
      const pattern = 'uns-demo/factory-floor/+/+/+/info/sensors/+';
      const results = await topicRegistry.searchTopicsByPattern(pattern);

      expect(results.length).toBeGreaterThanOrEqual(3);
      expect(results.every(topic => topic.data_category === 'sensors')).toBe(true);
    });
  });
});

describe('TopicValidator', () => {
  let validator: TopicValidator;

  beforeEach(() => {
    validator = new TopicValidator();
  });

  describe('validateTopicPath', () => {
    it('should validate ISA-95 compliant topic naming structure', () => {
      const validPaths = [
        'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed',
        'uns-demo/factory-floor/turning/cell-02/cnc-003/desc/identity/manufacturer',
        'uns-demo/factory-floor/multi-axis/cell-03/cnc-005/func/capabilities/max-rpm'
      ];

      validPaths.forEach(path => {
        expect(() => validator.validateTopicPath(path)).not.toThrow();
      });
    });

    it('should reject invalid topic path structures', () => {
      const invalidPaths = [
        'too/short',
        'too/many/levels/in/this/topic/path/structure/that/exceeds/maximum',
        '',
        'enterprise only',
        'enterprise/site',
        'enterprise/site/area',
        'enterprise/site/area/work_cell'
      ];

      invalidPaths.forEach(path => {
        expect(() => validator.validateTopicPath(path))
          .toThrow('Invalid topic path structure');
      });
    });

    it('should reject topics with invalid layer names', () => {
      const invalidLayer = 'uns-demo/factory-floor/machining/cell-01/cnc-001/invalid-layer/sensors/spindle-speed';
      
      expect(() => validator.validateTopicPath(invalidLayer))
        .toThrow('Invalid UNS layer');
    });
  });

  describe('validatePayloadSchema', () => {
    it('should ensure JSON payload matches registered schema', () => {
      const schema = {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time' },
          value: { type: 'number', minimum: 0, maximum: 8100 },
          unit: { type: 'string' },
          quality: { type: 'string', enum: ['good', 'bad', 'uncertain'] }
        },
        required: ['timestamp', 'value', 'unit']
      };

      const validPayload = {
        timestamp: '2025-07-29T10:30:00.000Z',
        value: 1250.5,
        unit: 'rpm',
        quality: 'good'
      };

      expect(() => validator.validatePayloadSchema(validPayload, schema)).not.toThrow();
    });

    it('should reject payloads that do not match schema', () => {
      const schema = {
        type: 'object',
        properties: {
          value: { type: 'number', minimum: 0, maximum: 8100 }
        },
        required: ['value']
      };

      const invalidPayloads = [
        { value: 'string-instead-of-number' },
        { value: -100 }, // Below minimum
        { value: 10000 }, // Above maximum
        {} // Missing required field
      ];

      invalidPayloads.forEach(payload => {
        expect(() => validator.validatePayloadSchema(payload, schema))
          .toThrow('Payload validation failed');
      });
    });
  });

  describe('parseTopicHierarchy', () => {
    it('should correctly extract hierarchy levels from topic path', () => {
      const topicPath = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed';
      const hierarchy = validator.parseTopicHierarchy(topicPath);

      expect(hierarchy).toEqual({
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        layer: 'info',
        data_category: 'sensors',
        metric_name: 'spindle-speed'
      });
    });

    it('should handle topics with different UNS layers', () => {
      const paths = [
        'uns-demo/factory-floor/machining/cell-01/cnc-001/desc/identity/manufacturer',
        'uns-demo/factory-floor/machining/cell-01/cnc-001/func/capabilities/max-rpm',
        'uns-demo/factory-floor/machining/cell-01/cnc-001/adhoc/alerts/maintenance-due'
      ];

      const expectedLayers = ['desc', 'func', 'adhoc'];

      paths.forEach((path, index) => {
        const hierarchy = validator.parseTopicHierarchy(path);
        expect(hierarchy.layer).toBe(expectedLayers[index]);
      });
    });
  });

  describe('validateDataRange', () => {
    it('should confirm numeric values fall within defined min/max bounds', () => {
      expect(() => validator.validateDataRange(1500, 0, 8100)).not.toThrow();
      expect(() => validator.validateDataRange(0, 0, 8100)).not.toThrow();
      expect(() => validator.validateDataRange(8100, 0, 8100)).not.toThrow();
    });

    it('should reject values outside defined range', () => {
      expect(() => validator.validateDataRange(-1, 0, 8100))
        .toThrow('Value -1 is below minimum 0');
      expect(() => validator.validateDataRange(8101, 0, 8100))
        .toThrow('Value 8101 is above maximum 8100');
    });

    it('should handle undefined min/max values', () => {
      expect(() => validator.validateDataRange(1500, undefined, undefined)).not.toThrow();
      expect(() => validator.validateDataRange(1500, 0, undefined)).not.toThrow();
      expect(() => validator.validateDataRange(1500, undefined, 8100)).not.toThrow();
    });
  });

  describe('isValidUnit', () => {
    it('should validate measurement units against standard units list', () => {
      const validUnits = ['rpm', 'celsius', 'kW', 'mm/s', 'bar', 'Hz', 'percent'];
      
      validUnits.forEach(unit => {
        expect(validator.isValidUnit(unit)).toBe(true);
      });
    });

    it('should reject invalid or non-standard units', () => {
      const invalidUnits = ['invalid-unit', 'xyz'];
      
      invalidUnits.forEach(unit => {
        expect(validator.isValidUnit(unit)).toBe(false);
      });
    });
  });
});

describe('UNSHierarchy', () => {
  let hierarchy: UNSHierarchy;

  beforeEach(() => {
    hierarchy = new UNSHierarchy();
  });

  describe('buildTopicPath', () => {
    it('should construct valid topic path from hierarchy components', () => {
      const components = {
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        layer: 'info',
        data_category: 'sensors',
        metric_name: 'spindle-speed'
      };

      const result = hierarchy.buildTopicPath(components);
      expect(result).toBe('uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed');
    });

    it('should validate all required components are provided', () => {
      const incompleteComponents = {
        enterprise: 'uns-demo',
        site: 'factory-floor'
        // Missing required components
      };

      expect(() => hierarchy.buildTopicPath(incompleteComponents))
        .toThrow('Missing required hierarchy components');
    });
  });

  describe('parseHierarchyLevels', () => {
    it('should extract ISA-95 levels from topic path string', () => {
      const topicPath = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed';
      const levels = hierarchy.parseHierarchyLevels(topicPath);

      expect(levels).toEqual({
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001'
      });
    });
  });

  describe('validateHierarchyDepth', () => {
    it('should ensure topic has required 5-level depth structure', () => {
      const validPaths = [
        'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed',
        'enterprise/site/area/work-cell/work-unit/layer/category/metric'
      ];

      validPaths.forEach(path => {
        expect(() => hierarchy.validateHierarchyDepth(path)).not.toThrow();
      });
    });

    it('should reject topics with insufficient hierarchy depth', () => {
      const invalidPaths = [
        'enterprise',
        'enterprise/site',
        'enterprise/site/area',
        'enterprise/site/area/work-cell'
      ];

      invalidPaths.forEach(path => {
        expect(() => hierarchy.validateHierarchyDepth(path))
          .toThrow('Insufficient hierarchy depth');
      });
    });
  });

  describe('getParentTopics', () => {
    it('should return all parent-level topics for given machine', () => {
      const machineId = 'cnc-001';
      const expectedParentPatterns = [
        'uns-demo/factory-floor/machining/cell-01/cnc-001/+/+/+',
        'uns-demo/factory-floor/machining/cell-01/+/+/+/+',
        'uns-demo/factory-floor/machining/+/+/+/+/+',
        'uns-demo/factory-floor/+/+/+/+/+/+',
        'uns-demo/+/+/+/+/+/+/+'
      ];

      const parentTopics = hierarchy.getParentTopics(machineId);
      expect(parentTopics).toEqual(expect.arrayContaining(expectedParentPatterns));
    });
  });
});