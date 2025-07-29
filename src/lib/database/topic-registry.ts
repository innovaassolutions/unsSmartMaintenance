/**
 * TopicRegistry Class for UNS Topic Management
 * Handles registration, validation, and management of MQTT topics in the UNS hierarchy
 */

import { getPrismaClient } from './supabase-client';
import { TopicValidator } from './topic-validator';
import { UNSHierarchy } from './uns-hierarchy';
import { TopicRegistry as TopicRegistryModel, Prisma } from '@prisma/client';

export interface TopicRegistrationData {
  topic_path: string;
  topic_type: 'descriptive' | 'functional' | 'informational' | 'ad_hoc';
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  work_unit: string;
  data_category: string;
  metric_name: string;
  description?: string;
  unit?: string;
  data_type: 'number' | 'string' | 'boolean' | 'object';
  min_value?: number;
  max_value?: number;
  schema_definition?: any;
}

export interface TopicSearchOptions {
  enterprise?: string;
  site?: string;
  area?: string;
  work_cell?: string;
  work_unit?: string;
  topic_type?: string;
  data_category?: string;
  is_active?: boolean;
}

export class TopicRegistry {
  private prisma = getPrismaClient();
  private validator = new TopicValidator();
  private hierarchy = new UNSHierarchy();

  /**
   * Register a new topic in the UNS hierarchy
   */
  async registerTopic(data: TopicRegistrationData): Promise<TopicRegistryModel> {
    // Validate topic path structure
    this.validator.validateTopicPath(data.topic_path);

    // Parse hierarchy to ensure consistency
    const parsedHierarchy = this.validator.parseTopicHierarchy(data.topic_path);
    
    // Validate hierarchy components match provided data
    if (
      parsedHierarchy.enterprise !== data.enterprise ||
      parsedHierarchy.site !== data.site ||
      parsedHierarchy.area !== data.area ||
      parsedHierarchy.work_cell !== data.work_cell ||
      parsedHierarchy.work_unit !== data.work_unit ||
      parsedHierarchy.data_category !== data.data_category ||
      parsedHierarchy.metric_name !== data.metric_name
    ) {
      throw new Error('Invalid topic path structure');
    }

    // Check for duplicate topic paths
    const existingTopic = await this.prisma.topicRegistry.findUnique({
      where: { topic_path: data.topic_path },
    });

    if (existingTopic) {
      throw new Error('Topic path already exists');
    }

    // Validate data ranges if provided
    if (data.data_type === 'number' && data.min_value !== undefined && data.max_value !== undefined) {
      if (data.min_value >= data.max_value) {
        throw new Error('Minimum value must be less than maximum value');
      }
    }

    // Validate unit if provided
    if (data.unit && !this.validator.isValidUnit(data.unit)) {
      throw new Error(`Invalid unit: ${data.unit}`);
    }

    // Create schema definition if not provided
    let schemaDefinition = data.schema_definition;
    if (!schemaDefinition) {
      schemaDefinition = this.validator.createPayloadSchema(
        data.data_type,
        data.min_value,
        data.max_value,
        data.unit
      );
    }

    // Register the topic
    const topic = await this.prisma.topicRegistry.create({
      data: {
        topic_path: data.topic_path,
        topic_type: data.topic_type,
        enterprise: data.enterprise,
        site: data.site,
        area: data.area,
        work_cell: data.work_cell,
        work_unit: data.work_unit,
        data_category: data.data_category,
        metric_name: data.metric_name,
        description: data.description,
        unit: data.unit,
        data_type: data.data_type,
        min_value: data.min_value,
        max_value: data.max_value,
        schema_definition: schemaDefinition,
        is_active: true,
      },
    });

    return topic;
  }

  /**
   * Update topic schema while maintaining backward compatibility
   */
  async updateTopicSchema(topicId: string, newSchema: any): Promise<TopicRegistryModel> {
    const existingTopic = await this.prisma.topicRegistry.findUnique({
      where: { id: topicId },
    });

    if (!existingTopic) {
      throw new Error('Topic not found');
    }

    // Basic backward compatibility check
    if (existingTopic.schema_definition && typeof existingTopic.schema_definition === 'object') {
      const existingSchema = existingTopic.schema_definition as any;
      
      // Check if data type is changing (breaking change)
      if (existingSchema.properties?.value?.type && 
          newSchema.properties?.value?.type && 
          existingSchema.properties.value.type !== newSchema.properties.value.type) {
        throw new Error('Schema update would break backward compatibility');
      }
    }

    const updatedTopic = await this.prisma.topicRegistry.update({
      where: { id: topicId },
      data: {
        schema_definition: newSchema,
        updated_at: new Date(),
      },
    });

    return updatedTopic;
  }

  /**
   * Soft-delete topic while preserving historical data
   */
  async deactivateTopic(topicId: string): Promise<TopicRegistryModel> {
    const topic = await this.prisma.topicRegistry.update({
      where: { id: topicId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    return topic;
  }

  /**
   * Find topic by exact path match
   */
  async findTopicByPath(topicPath: string): Promise<TopicRegistryModel | null> {
    const topic = await this.prisma.topicRegistry.findUnique({
      where: { topic_path: topicPath },
    });

    return topic;
  }

  /**
   * Search topics by wildcard patterns
   */
  async searchTopicsByPattern(pattern: string): Promise<TopicRegistryModel[]> {
    // Convert MQTT wildcard pattern to SQL LIKE pattern
    const sqlPattern = pattern
      .replace(/\+/g, '%')  // Single level wildcard
      .replace(/#/g, '%');  // Multi-level wildcard

    const topics = await this.prisma.topicRegistry.findMany({
      where: {
        topic_path: {
          like: sqlPattern,
        },
        is_active: true,
      },
      orderBy: {
        topic_path: 'asc',
      },
    });

    return topics;
  }

  /**
   * Search topics with filters
   */
  async searchTopics(options: TopicSearchOptions): Promise<TopicRegistryModel[]> {
    const where: Prisma.TopicRegistryWhereInput = {};

    if (options.enterprise) where.enterprise = options.enterprise;
    if (options.site) where.site = options.site;
    if (options.area) where.area = options.area;
    if (options.work_cell) where.work_cell = options.work_cell;
    if (options.work_unit) where.work_unit = options.work_unit;
    if (options.topic_type) where.topic_type = options.topic_type as any;
    if (options.data_category) where.data_category = options.data_category;
    if (options.is_active !== undefined) where.is_active = options.is_active;

    const topics = await this.prisma.topicRegistry.findMany({
      where,
      orderBy: {
        topic_path: 'asc',
      },
    });

    return topics;
  }

  /**
   * Get all topics for a specific machine
   */
  async getTopicsForMachine(machineId: string): Promise<TopicRegistryModel[]> {
    const topics = await this.prisma.topicRegistry.findMany({
      where: {
        work_unit: machineId,
        is_active: true,
      },
      orderBy: {
        topic_path: 'asc',
      },
    });

    return topics;
  }

  /**
   * Get topics by hierarchy level
   */
  async getTopicsByHierarchy(
    enterprise?: string,
    site?: string,
    area?: string,
    work_cell?: string,
    work_unit?: string
  ): Promise<TopicRegistryModel[]> {
    const where: Prisma.TopicRegistryWhereInput = {
      is_active: true,
    };

    if (enterprise) where.enterprise = enterprise;
    if (site) where.site = site;
    if (area) where.area = area;
    if (work_cell) where.work_cell = work_cell;
    if (work_unit) where.work_unit = work_unit;

    const topics = await this.prisma.topicRegistry.findMany({
      where,
      orderBy: {
        topic_path: 'asc',
      },
    });

    return topics;
  }

  /**
   * Validate payload against topic schema
   */
  async validateTopicPayload(topicPath: string, payload: any): Promise<boolean> {
    const topic = await this.findTopicByPath(topicPath);
    
    if (!topic) {
      throw new Error('Topic not found');
    }

    if (!topic.schema_definition) {
      throw new Error('No schema defined for topic');
    }

    try {
      this.validator.validatePayloadSchema(payload, topic.schema_definition);
      return true;
    } catch (error) {
      throw new Error(`Payload validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get topic statistics
   */
  async getTopicStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<string, number>;
    byDataType: Record<string, number>;
  }> {
    const [total, active, byType, byDataType] = await Promise.all([
      this.prisma.topicRegistry.count(),
      this.prisma.topicRegistry.count({ where: { is_active: true } }),
      this.prisma.topicRegistry.groupBy({
        by: ['topic_type'],
        _count: { topic_type: true },
      }),
      this.prisma.topicRegistry.groupBy({
        by: ['data_type'],
        _count: { data_type: true },
      }),
    ]);

    const typeStats = byType.reduce((acc, item) => {
      acc[item.topic_type] = item._count.topic_type;
      return acc;
    }, {} as Record<string, number>);

    const dataTypeStats = byDataType.reduce((acc, item) => {
      acc[item.data_type] = item._count.data_type;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      inactive: total - active,
      byType: typeStats,
      byDataType: dataTypeStats,
    };
  }

  /**
   * Bulk register topics
   */
  async bulkRegisterTopics(topics: TopicRegistrationData[]): Promise<TopicRegistryModel[]> {
    const results: TopicRegistryModel[] = [];

    for (const topicData of topics) {
      try {
        const topic = await this.registerTopic(topicData);
        results.push(topic);
      } catch (error) {
        console.warn(`Failed to register topic ${topicData.topic_path}:`, error);
        // Continue with other topics
      }
    }

    return results;
  }
}