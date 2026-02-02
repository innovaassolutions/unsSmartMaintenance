/**
 * EMQX Cloud API Integration
 * Handles topic creation, ACL management, and user provisioning via EMQX Cloud REST API
 */

import { TopicRegistry } from '../database/topic-registry';
import { UNSHierarchy } from '../database/uns-hierarchy';

export interface EMQXCloudConfig {
  apiUrl: string;
  apiKey: string;
  deployment: string;
}

export interface EMQXUser {
  username: string;
  password: string;
  is_superuser?: boolean;
}

export interface EMQXACLRule {
  username: string;
  topic: string;
  action: 'pub' | 'sub' | 'pubsub';
  permission: 'allow' | 'deny';
}

export interface EMQXTopicMetrics {
  topic: string;
  node: string;
  subscriptions: number;
  subscribers: number;
}

export class EMQXCloudAPI {
  private config: EMQXCloudConfig;
  private topicRegistry: TopicRegistry;
  private unsHierarchy: UNSHierarchy;

  constructor(config: EMQXCloudConfig) {
    this.config = config;
    this.topicRegistry = new TopicRegistry();
    this.unsHierarchy = new UNSHierarchy();
  }

  /**
   * Makes authenticated request to EMQX Cloud API
   */
  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: unknown
  ): Promise<Response> {
    const url = `${this.config.apiUrl}/api/v5/${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `EMQX API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response;
  }

  /**
   * Create or update user in EMQX Cloud
   */
  async createUser(user: EMQXUser): Promise<void> {
    try {
      await this.makeRequest('users', 'POST', {
        username: user.username,
        password: user.password,
        is_superuser: user.is_superuser || false,
      });
    } catch (error) {
      // If user already exists, update password
      if (error instanceof Error && error.message.includes('already exists')) {
        await this.updateUser(user);
      } else {
        throw error;
      }
    }
  }

  /**
   * Update existing user in EMQX Cloud
   */
  async updateUser(user: EMQXUser): Promise<void> {
    await this.makeRequest(`users/${user.username}`, 'PUT', {
      password: user.password,
      is_superuser: user.is_superuser || false,
    });
  }

  /**
   * Delete user from EMQX Cloud
   */
  async deleteUser(username: string): Promise<void> {
    await this.makeRequest(`users/${username}`, 'DELETE');
  }

  /**
   * Create ACL rule for user/topic combination
   */
  async createACLRule(rule: EMQXACLRule): Promise<void> {
    await this.makeRequest('acls', 'POST', {
      username: rule.username,
      topic: rule.topic,
      action: rule.action,
      permission: rule.permission,
    });
  }

  /**
   * Delete ACL rule
   */
  async deleteACLRule(username: string, topic: string): Promise<void> {
    await this.makeRequest(
      `acls/${username}/${encodeURIComponent(topic)}`,
      'DELETE'
    );
  }

  /**
   * Get all ACL rules for a user
   */
  async getUserACLRules(username: string): Promise<EMQXACLRule[]> {
    const response = await this.makeRequest(`acls/${username}`);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Provision UNS topic in EMQX Cloud with appropriate ACL rules
   */
  async provisionUNSTopic(topicPath: string): Promise<void> {
    // Get topic information from registry
    const topic = await this.topicRegistry.findTopicByPath(topicPath);
    if (!topic) {
      throw new Error(`Topic not found in registry: ${topicPath}`);
    }

    // Parse hierarchy from topic path
    const hierarchy = this.unsHierarchy.parseHierarchyLevels(topicPath);

    // Create ACL rules based on topic type and hierarchy
    const aclRules = this.generateACLRulesForTopic(
      topicPath,
      topic.topic_type,
      hierarchy
    );

    // Apply each ACL rule
    for (const rule of aclRules) {
      try {
        await this.createACLRule(rule);
      } catch (error) {
        console.warn(
          `Failed to create ACL rule for ${rule.username}:${rule.topic}:`,
          error
        );
        // Continue with other rules
      }
    }
  }

  /**
   * Generate ACL rules for a UNS topic based on role-based access patterns
   */
  private generateACLRulesForTopic(
    topicPath: string,
    topicType: string,
    hierarchy: {
      enterprise: string;
      site: string;
      area: string;
      work_cell: string;
      work_unit: string;
    }
  ): EMQXACLRule[] {
    const rules: EMQXACLRule[] = [];

    // Executive access - read-only for high-level metrics
    if (
      topicPath.includes('/info/production') ||
      topicPath.includes('/info/efficiency')
    ) {
      rules.push({
        username: 'executive',
        topic: topicPath,
        action: 'sub',
        permission: 'allow',
      });
    }

    // Factory Manager access - broad read access
    if (topicType === 'informational' || topicType === 'functional') {
      rules.push({
        username: 'factory_manager',
        topic: topicPath,
        action: 'sub',
        permission: 'allow',
      });
    }

    // Production Manager access - production-related topics
    if (
      topicPath.includes('/info/production') ||
      topicPath.includes('/info/status')
    ) {
      rules.push({
        username: 'production_manager',
        topic: topicPath,
        action: 'sub',
        permission: 'allow',
      });
    }

    // Maintenance Technician access - sensor and maintenance data
    if (
      topicPath.includes('/info/sensors') ||
      topicPath.includes('/info/maintenance') ||
      topicPath.includes('/adhoc/alerts')
    ) {
      rules.push({
        username: 'maintenance_technician',
        topic: topicPath,
        action: 'sub',
        permission: 'allow',
      });
    }

    // Machine-specific publish access
    rules.push({
      username: `machine_${hierarchy.work_unit}`,
      topic: topicPath,
      action: 'pub',
      permission: 'allow',
    });

    // Data bridge access - full access for data processing
    rules.push({
      username: 'data_bridge',
      topic: topicPath,
      action: 'pubsub',
      permission: 'allow',
    });

    return rules;
  }

  /**
   * Setup role-based users and base ACL rules
   */
  async setupRoleBasedAccess(): Promise<void> {
    const roles = [
      { username: 'executive', password: this.generateSecurePassword() },
      { username: 'factory_manager', password: this.generateSecurePassword() },
      {
        username: 'production_manager',
        password: this.generateSecurePassword(),
      },
      {
        username: 'maintenance_technician',
        password: this.generateSecurePassword(),
      },
      {
        username: 'data_bridge',
        password: this.generateSecurePassword(),
        is_superuser: false,
      },
    ];

    // Create role-based users
    for (const role of roles) {
      try {
        await this.createUser(role);
        console.log(`Created EMQX user: ${role.username}`);
      } catch (error) {
        console.warn(`Failed to create user ${role.username}:`, error);
      }
    }

    // Setup base access patterns for each role
    await this.setupBaseACLPatterns();
  }

  /**
   * Setup base ACL patterns for each role
   */
  private async setupBaseACLPatterns(): Promise<void> {
    const basePatterns = [
      // Executive - high level metrics only
      {
        username: 'executive',
        topic: '+/+/+/+/+/info/production/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },
      {
        username: 'executive',
        topic: '+/+/+/+/+/info/efficiency/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },

      // Factory Manager - broad operational visibility
      {
        username: 'factory_manager',
        topic: '+/+/+/+/+/info/+/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },
      {
        username: 'factory_manager',
        topic: '+/+/+/+/+/func/+/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },

      // Production Manager - production focused
      {
        username: 'production_manager',
        topic: '+/+/+/+/+/info/production/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },
      {
        username: 'production_manager',
        topic: '+/+/+/+/+/info/status/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },

      // Maintenance Technician - equipment focused
      {
        username: 'maintenance_technician',
        topic: '+/+/+/+/+/info/sensors/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },
      {
        username: 'maintenance_technician',
        topic: '+/+/+/+/+/info/maintenance/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },
      {
        username: 'maintenance_technician',
        topic: '+/+/+/+/+/adhoc/alerts/+',
        action: 'sub' as const,
        permission: 'allow' as const,
      },

      // Data Bridge - full access for processing
      {
        username: 'data_bridge',
        topic: '#',
        action: 'pubsub' as const,
        permission: 'allow' as const,
      },
    ];

    for (const pattern of basePatterns) {
      try {
        await this.createACLRule(pattern);
      } catch (error) {
        console.warn('Failed to create base ACL pattern:', error);
      }
    }
  }

  /**
   * Create machine-specific users and access patterns
   */
  async setupMachineAccess(machineId: string): Promise<void> {
    const machineUser = {
      username: `machine_${machineId}`,
      password: this.generateSecurePassword(),
    };

    // Create machine user
    await this.createUser(machineUser);

    // Create ACL rules for machine's topics
    const machineTopicPattern = `+/+/+/+/${machineId}/+/+/+`;
    await this.createACLRule({
      username: machineUser.username,
      topic: machineTopicPattern,
      action: 'pub',
      permission: 'allow',
    });

    // Allow machine to subscribe to its own command topics
    const commandTopicPattern = `+/+/+/+/${machineId}/func/commands/+`;
    await this.createACLRule({
      username: machineUser.username,
      topic: commandTopicPattern,
      action: 'sub',
      permission: 'allow',
    });
  }

  /**
   * Get topic metrics from EMQX Cloud
   */
  async getTopicMetrics(topicFilter?: string): Promise<EMQXTopicMetrics[]> {
    const endpoint = topicFilter
      ? `topics/${encodeURIComponent(topicFilter)}`
      : 'topics';
    const response = await this.makeRequest(endpoint);
    const data = await response.json();
    return data.data || [];
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(): Promise<Record<string, number>> {
    const response = await this.makeRequest('stats');
    const data = await response.json();
    return data.data || {};
  }

  /**
   * Cleanup unused topics and ACL rules
   */
  async cleanupUnusedTopics(): Promise<void> {
    // Get all registered topics from database
    const registeredTopics = await this.topicRegistry.searchTopics({
      is_active: true,
    });
    const registeredTopicPaths = new Set(
      registeredTopics.map(t => t.topic_path)
    );

    // Get metrics for all topics in EMQX
    const topicMetrics = await this.getTopicMetrics();

    // Find topics in EMQX that are not in registry
    const unusedTopics = topicMetrics.filter(
      metric =>
        !registeredTopicPaths.has(metric.topic) && metric.subscriptions === 0
    );

    // Clean up ACL rules for unused topics
    for (const unusedTopic of unusedTopics) {
      try {
        // This would require getting all ACL rules and filtering
        // Implementation depends on EMQX API capabilities
        console.log(`Found unused topic: ${unusedTopic.topic}`);
      } catch (error) {
        console.warn(`Failed to cleanup topic ${unusedTopic.topic}:`, error);
      }
    }
  }

  /**
   * Generate secure password for MQTT users
   */
  private generateSecurePassword(): string {
    const length = 16;
    const charset =
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }

    return password;
  }

  /**
   * Validate EMQX Cloud API connectivity
   */
  async validateConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getConnectionStats();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Factory function to create EMQX Cloud API client
 */
export function createEMQXCloudAPI(): EMQXCloudAPI {
  const config: EMQXCloudConfig = {
    apiUrl: process.env.EMQX_CLOUD_API_URL || '',
    apiKey: process.env.EMQX_CLOUD_API_KEY || '',
    deployment: process.env.EMQX_CLOUD_DEPLOYMENT || '',
  };

  if (!config.apiUrl || !config.apiKey) {
    // Defer validation to runtime — allow build to succeed without env vars
    console.warn(
      'EMQX Cloud API configuration missing. API calls will fail until EMQX_CLOUD_API_URL and EMQX_CLOUD_API_KEY are set.'
    );
  }

  return new EMQXCloudAPI(config);
}
