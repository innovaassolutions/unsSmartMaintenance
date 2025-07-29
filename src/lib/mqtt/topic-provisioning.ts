/**
 * Automated Topic Provisioning Service
 * Automatically provisions MQTT topics in EMQX Cloud when topics are registered in the database
 */

import { TopicRegistry, TopicRegistrationData } from '../database/topic-registry';
import { EMQXCloudAPI, createEMQXCloudAPI } from './emqx-api';
import { getPrismaClient } from '../database/supabase-client';

export interface ProvisioningResult {
  success: boolean;
  topicPath: string;
  error?: string;
  aclRulesCreated?: number;
}

export interface BulkProvisioningResult {
  total: number;
  successful: number;
  failed: number;
  results: ProvisioningResult[];
}

export class TopicProvisioningService {
  private topicRegistry: TopicRegistry;
  private emqxAPI: EMQXCloudAPI;
  private prisma = getPrismaClient();

  constructor() {
    this.topicRegistry = new TopicRegistry();
    this.emqxAPI = createEMQXCloudAPI();
  }

  /**
   * Provision a single topic in EMQX Cloud
   */
  async provisionTopic(topicPath: string): Promise<ProvisioningResult> {
    try {
      // Verify topic exists in registry
      const topic = await this.topicRegistry.findTopicByPath(topicPath);
      if (!topic) {
        return {
          success: false,
          topicPath,
          error: 'Topic not found in registry',
        };
      }

      if (!topic.is_active) {
        return {
          success: false,
          topicPath,
          error: 'Topic is not active',
        };
      }

      // Provision in EMQX Cloud
      await this.emqxAPI.provisionUNSTopic(topicPath);

      // Log provisioning event
      await this.logProvisioningEvent(topic.id, 'provisioned', 'Topic successfully provisioned in EMQX Cloud');

      return {
        success: true,
        topicPath,
        aclRulesCreated: 4, // Approximate number of ACL rules created
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log failed provisioning
      try {
        const topic = await this.topicRegistry.findTopicByPath(topicPath);
        if (topic) {
          await this.logProvisioningEvent(topic.id, 'failed', errorMessage);
        }
      } catch (logError) {
        console.warn('Failed to log provisioning event:', logError);
      }

      return {
        success: false,
        topicPath,
        error: errorMessage,
      };
    }
  }

  /**
   * Provision all active topics from the registry
   */
  async provisionAllTopics(): Promise<BulkProvisioningResult> {
    const activeTopics = await this.topicRegistry.searchTopics({ is_active: true });
    const results: ProvisioningResult[] = [];

    for (const topic of activeTopics) {
      const result = await this.provisionTopic(topic.topic_path);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Provision topics for a specific machine
   */
  async provisionMachineTopics(machineId: string): Promise<BulkProvisioningResult> {
    const machineTopics = await this.topicRegistry.getTopicsForMachine(machineId);
    const results: ProvisioningResult[] = [];

    // Setup machine access in EMQX first
    try {
      await this.emqxAPI.setupMachineAccess(machineId);
    } catch (error) {
      console.warn(`Failed to setup machine access for ${machineId}:`, error);
    }

    // Provision each topic
    for (const topic of machineTopics) {
      const result = await this.provisionTopic(topic.topic_path);
      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    return {
      total: results.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Automatic provisioning hook for new topic registrations
   */
  async onTopicRegistered(topicData: TopicRegistrationData): Promise<void> {
    // Add small delay to ensure database transaction is committed
    setTimeout(async () => {
      try {
        const result = await this.provisionTopic(topicData.topic_path);
        if (result.success) {
          console.log(`Auto-provisioned topic: ${topicData.topic_path}`);
        } else {
          console.warn(`Auto-provisioning failed for ${topicData.topic_path}:`, result.error);
        }
      } catch (error) {
        console.error('Auto-provisioning error:', error);
      }
    }, 1000);
  }

  /**
   * Setup initial role-based access patterns
   */
  async setupRoleBasedAccess(): Promise<void> {
    try {
      await this.emqxAPI.setupRoleBasedAccess();
      console.log('Role-based access patterns configured in EMQX Cloud');
    } catch (error) {
      console.error('Failed to setup role-based access:', error);
      throw error;
    }
  }

  /**
   * Sync topic registry with EMQX Cloud
   */
  async syncWithEMQX(): Promise<{
    provisioned: number;
    deprovisioned: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let provisioned = 0;
    let deprovisioned = 0;

    try {
      // Get all active topics from registry
      const activeTopics = await this.topicRegistry.searchTopics({ is_active: true });
      const activeTopicPaths = new Set(activeTopics.map(t => t.topic_path));

      // Get topic metrics from EMQX
      const emqxTopics = await this.emqxAPI.getTopicMetrics();
      const emqxTopicPaths = new Set(emqxTopics.map(t => t.topic));

      // Provision topics that exist in registry but not in EMQX
      for (const topic of activeTopics) {
        if (!emqxTopicPaths.has(topic.topic_path)) {
          try {
            const result = await this.provisionTopic(topic.topic_path);
            if (result.success) {
              provisioned++;
            } else {
              errors.push(`Failed to provision ${topic.topic_path}: ${result.error}`);
            }
          } catch (error) {
            errors.push(`Error provisioning ${topic.topic_path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }

      // Clean up topics in EMQX that are not in active registry
      await this.emqxAPI.cleanupUnusedTopics();

      return { provisioned, deprovisioned, errors };

    } catch (error) {
      errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { provisioned, deprovisioned, errors };
    }
  }

  /**
   * Get provisioning status for all topics
   */
  async getProvisioningStatus(): Promise<{
    totalTopics: number;
    provisionedTopics: number;
    pendingTopics: string[];
    failedTopics: string[];
  }> {
    try {
      const activeTopics = await this.topicRegistry.searchTopics({ is_active: true });
      const emqxTopics = await this.emqxAPI.getTopicMetrics();
      const emqxTopicPaths = new Set(emqxTopics.map(t => t.topic));

      const pendingTopics: string[] = [];
      const failedTopics: string[] = [];

      for (const topic of activeTopics) {
        if (!emqxTopicPaths.has(topic.topic_path)) {
          // Check if there were recent provisioning failures
          const recentFailures = await this.getRecentProvisioningEvents(topic.id, 'failed');
          if (recentFailures.length > 0) {
            failedTopics.push(topic.topic_path);
          } else {
            pendingTopics.push(topic.topic_path);
          }
        }
      }

      return {
        totalTopics: activeTopics.length,
        provisionedTopics: activeTopics.length - pendingTopics.length - failedTopics.length,
        pendingTopics,
        failedTopics,
      };

    } catch (error) {
      console.error('Failed to get provisioning status:', error);
      return {
        totalTopics: 0,
        provisionedTopics: 0,
        pendingTopics: [],
        failedTopics: [],
      };
    }
  }

  /**
   * Log provisioning events for audit trail
   */
  private async logProvisioningEvent(
    topicId: string,
    eventType: 'provisioned' | 'failed' | 'deprovisioned',
    details: string
  ): Promise<void> {
    try {
      // This would typically log to a provisioning_events table
      // For now, we'll just log to console and could extend to database
      console.log(`Provisioning Event - Topic: ${topicId}, Type: ${eventType}, Details: ${details}`);
      
      // Future: Insert into provisioning_events table
      // await this.prisma.provisioningEvent.create({
      //   data: {
      //     topic_id: topicId,
      //     event_type: eventType,
      //     details,
      //     timestamp: new Date(),
      //   }
      // });
    } catch (error) {
      console.warn('Failed to log provisioning event:', error);
    }
  }

  /**
   * Get recent provisioning events for a topic
   */
  private async getRecentProvisioningEvents(
    topicId: string,
    eventType?: string
  ): Promise<Array<{ event_type: string; details: string; timestamp: Date }>> {
    try {
      // Future: Query provisioning_events table
      // For now, return empty array
      return [];
    } catch (error) {
      console.warn('Failed to get provisioning events:', error);
      return [];
    }
  }

  /**
   * Validate EMQX Cloud connectivity
   */
  async validateConnection(): Promise<{ success: boolean; error?: string }> {
    return await this.emqxAPI.validateConnection();
  }
}

/**
 * Global topic provisioning service instance
 */
let topicProvisioningService: TopicProvisioningService | null = null;

/**
 * Get the topic provisioning service instance
 */
export function getTopicProvisioningService(): TopicProvisioningService {
  if (!topicProvisioningService) {
    topicProvisioningService = new TopicProvisioningService();
  }
  return topicProvisioningService;
}

/**
 * Enhanced TopicRegistry that automatically provisions topics
 */
export class AutoProvisioningTopicRegistry extends TopicRegistry {
  private provisioningService: TopicProvisioningService;

  constructor() {
    super();
    this.provisioningService = getTopicProvisioningService();
  }

  /**
   * Override registerTopic to include automatic provisioning
   */
  async registerTopic(data: TopicRegistrationData) {
    // Register in database first
    const topic = await super.registerTopic(data);

    // Auto-provision in EMQX Cloud
    this.provisioningService.onTopicRegistered(data);

    return topic;
  }
}