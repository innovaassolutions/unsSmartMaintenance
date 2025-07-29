/**
 * @jest-environment node
 */

import { TopicSubscriptionManager } from '../../lib/database/topic-subscription-manager';
import { TopicSubscription, UserRole, AccessLevel } from '../../types/uns-types';

// Mock dependencies
jest.mock('../../lib/database/supabase-client');

describe('TopicSubscriptionManager', () => {
  let subscriptionManager: TopicSubscriptionManager;

  beforeEach(() => {
    subscriptionManager = new TopicSubscriptionManager();
  });

  describe('createSubscription', () => {
    it('should create role-based subscription with proper access control', async () => {
      const subscriptionData: Omit<TopicSubscription, 'id' | 'created_at'> = {
        user_role: 'factory_manager',
        topic_pattern: 'uns-demo/factory-floor/+/+/+/info/status/+',
        access_level: 'read',
        description: 'Factory manager access to all machine status information',
        is_active: true
      };

      const result = await subscriptionManager.createSubscription(subscriptionData);

      expect(result).toHaveProperty('id');
      expect(result.user_role).toBe('factory_manager');
      expect(result.topic_pattern).toBe(subscriptionData.topic_pattern);
      expect(result.access_level).toBe('read');
      expect(result.is_active).toBe(true);
    });

    it('should validate user role values against allowed roles', async () => {
      const invalidRoleData = {
        user_role: 'invalid_role' as UserRole,
        topic_pattern: 'test/pattern',
        access_level: 'read' as AccessLevel,
        description: 'Test subscription',
        is_active: true
      };

      await expect(subscriptionManager.createSubscription(invalidRoleData))
        .rejects
        .toThrow('Invalid user role');
    });

    it('should validate access level values', async () => {
      const invalidAccessData = {
        user_role: 'factory_manager' as UserRole,
        topic_pattern: 'test/pattern',
        access_level: 'invalid_access' as AccessLevel,
        description: 'Test subscription',
        is_active: true
      };

      await expect(subscriptionManager.createSubscription(invalidAccessData))
        .rejects
        .toThrow('Invalid access level');
    });

    it('should validate topic pattern format', async () => {
      const invalidPatternData = {
        user_role: 'factory_manager' as UserRole,
        topic_pattern: '', // Empty pattern
        access_level: 'read' as AccessLevel,
        description: 'Test subscription',
        is_active: true
      };

      await expect(subscriptionManager.createSubscription(invalidPatternData))
        .rejects
        .toThrow('Invalid topic pattern');
    });
  });

  describe('getSubscriptionsByRole', () => {
    beforeEach(async () => {
      // Create test subscriptions for different roles
      const testSubscriptions = [
        {
          user_role: 'factory_manager' as UserRole,
          topic_pattern: 'uns-demo/factory-floor/+/+/+/info/status/+',
          access_level: 'read' as AccessLevel,
          description: 'Factory manager status access',
          is_active: true
        },
        {
          user_role: 'factory_manager' as UserRole,
          topic_pattern: 'uns-demo/factory-floor/+/+/+/info/production/+',
          access_level: 'read' as AccessLevel,
          description: 'Factory manager production access',
          is_active: true
        },
        {
          user_role: 'maintenance_technician' as UserRole,
          topic_pattern: 'uns-demo/factory-floor/+/+/+/info/sensors/+',
          access_level: 'read' as AccessLevel,
          description: 'Maintenance technician sensor access',
          is_active: true
        },
        {
          user_role: 'executive' as UserRole,
          topic_pattern: 'uns-demo/+/+/+/+/info/kpi/+',
          access_level: 'read' as AccessLevel,
          description: 'Executive KPI access',
          is_active: true
        }
      ];

      for (const subscription of testSubscriptions) {
        await subscriptionManager.createSubscription(subscription);
      }
    });

    it('should return all active subscriptions for factory manager role', async () => {
      const subscriptions = await subscriptionManager.getSubscriptionsByRole('factory_manager');

      expect(subscriptions).toHaveLength(2);
      expect(subscriptions.every(sub => sub.user_role === 'factory_manager')).toBe(true);
      expect(subscriptions.every(sub => sub.is_active === true)).toBe(true);
    });

    it('should return maintenance technician specific subscriptions', async () => {
      const subscriptions = await subscriptionManager.getSubscriptionsByRole('maintenance_technician');

      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].user_role).toBe('maintenance_technician');
      expect(subscriptions[0].topic_pattern).toContain('sensors');
    });

    it('should return empty array for roles with no subscriptions', async () => {
      const subscriptions = await subscriptionManager.getSubscriptionsByRole('production_manager');
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('updateSubscriptionStatus', () => {
    let testSubscriptionId: string;

    beforeEach(async () => {
      const subscriptionData = {
        user_role: 'factory_manager' as UserRole,
        topic_pattern: 'uns-demo/factory-floor/+/+/+/info/status/+',
        access_level: 'read' as AccessLevel,
        description: 'Test subscription for status updates',
        is_active: true
      };

      const subscription = await subscriptionManager.createSubscription(subscriptionData);
      testSubscriptionId = subscription.id;
    });

    it('should activate inactive subscription', async () => {
      // First deactivate
      await subscriptionManager.updateSubscriptionStatus(testSubscriptionId, false);
      
      // Then reactivate
      const result = await subscriptionManager.updateSubscriptionStatus(testSubscriptionId, true);
      
      expect(result.is_active).toBe(true);
    });

    it('should deactivate active subscription', async () => {
      const result = await subscriptionManager.updateSubscriptionStatus(testSubscriptionId, false);
      
      expect(result.is_active).toBe(false);
    });

    it('should handle non-existent subscription ID', async () => {
      await expect(subscriptionManager.updateSubscriptionStatus('non-existent-id', true))
        .rejects
        .toThrow('Subscription not found');
    });
  });

  describe('matchTopicToSubscriptions', () => {
    beforeEach(async () => {
      // Create comprehensive subscription patterns for testing
      const subscriptionPatterns = [
        {
          user_role: 'factory_manager' as UserRole,
          topic_pattern: 'uns-demo/factory-floor/+/+/+/info/status/operational-state',
          access_level: 'read' as AccessLevel,
          description: 'Factory manager operational status',
          is_active: true
        },
        {
          user_role: 'maintenance_technician' as UserRole,
          topic_pattern: 'uns-demo/factory-floor/+/+/+/info/sensors/+',
          access_level: 'read' as AccessLevel,
          description: 'Maintenance technician all sensors',
          is_active: true
        },
        {
          user_role: 'maintenance_technician' as UserRole,
          topic_pattern: 'uns-demo/factory-floor/+/+/+/adhoc/alerts/+',
          access_level: 'write' as AccessLevel,
          description: 'Maintenance technician alert management',
          is_active: true
        },
        {
          user_role: 'executive' as UserRole,
          topic_pattern: 'uns-demo/+/+/+/+/info/kpi/+',
          access_level: 'read' as AccessLevel,
          description: 'Executive KPI dashboard',
          is_active: true
        },
        {
          user_role: 'production_manager' as UserRole,
          topic_pattern: 'uns-demo/factory-floor/machining/+/+/info/production/+',
          access_level: 'read' as AccessLevel,
          description: 'Production manager machining area',
          is_active: false // Inactive subscription
        }
      ];

      for (const pattern of subscriptionPatterns) {
        await subscriptionManager.createSubscription(pattern);
      }
    });

    it('should match factory manager to operational status topics', async () => {
      const topic = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/status/operational-state';
      const matches = await subscriptionManager.matchTopicToSubscriptions(topic, 'factory_manager');

      expect(matches).toHaveLength(1);
      expect(matches[0].user_role).toBe('factory_manager');
      expect(matches[0].access_level).toBe('read');
    });

    it('should match maintenance technician to sensor topics with wildcard', async () => {
      const topics = [
        'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed',
        'uns-demo/factory-floor/turning/cell-02/cnc-003/info/sensors/temperature',
        'uns-demo/factory-floor/multi-axis/cell-03/cnc-005/info/sensors/vibration'
      ];

      for (const topic of topics) {
        const matches = await subscriptionManager.matchTopicToSubscriptions(topic, 'maintenance_technician');
        
        expect(matches.length).toBeGreaterThanOrEqual(1);
        expect(matches.some(m => m.topic_pattern.includes('sensors'))).toBe(true);
      }
    });

    it('should match executive to high-level KPI topics across all areas', async () => {
      const kpiTopics = [
        'uns-demo/factory-floor/machining/cell-01/cnc-001/info/kpi/efficiency',
        'uns-demo/factory-floor/turning/cell-02/cnc-003/info/kpi/uptime',
        'uns-demo/factory-floor/multi-axis/cell-03/cnc-005/info/kpi/throughput'
      ];

      for (const topic of kpiTopics) {
        const matches = await subscriptionManager.matchTopicToSubscriptions(topic, 'executive');
        
        expect(matches).toHaveLength(1);
        expect(matches[0].user_role).toBe('executive');
        expect(matches[0].topic_pattern).toContain('kpi');
      }
    });

    it('should exclude inactive subscriptions from matches', async () => {
      const topic = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/production/cycle-time';
      const matches = await subscriptionManager.matchTopicToSubscriptions(topic, 'production_manager');

      // Should not match because the production_manager subscription is inactive
      expect(matches).toHaveLength(0);
    });

    it('should return empty array for topics with no matching subscriptions', async () => {
      const topic = 'uns-demo/factory-floor/machining/cell-01/cnc-001/desc/identity/manufacturer';
      const matches = await subscriptionManager.matchTopicToSubscriptions(topic, 'maintenance_technician');

      expect(matches).toHaveLength(0);
    });
  });

  describe('validateTopicAccess', () => {
    beforeEach(async () => {
      await subscriptionManager.createSubscription({
        user_role: 'maintenance_technician',
        topic_pattern: 'uns-demo/factory-floor/+/+/+/info/sensors/+',
        access_level: 'read',
        description: 'Maintenance read access to sensors',
        is_active: true
      });

      await subscriptionManager.createSubscription({
        user_role: 'maintenance_technician',
        topic_pattern: 'uns-demo/factory-floor/+/+/+/adhoc/alerts/+',
        access_level: 'write',
        description: 'Maintenance write access to alerts',
        is_active: true
      });
    });

    it('should validate read access for sensor topics', async () => {
      const topic = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/temperature';
      const hasAccess = await subscriptionManager.validateTopicAccess(
        topic, 
        'maintenance_technician', 
        'read'
      );

      expect(hasAccess).toBe(true);
    });

    it('should validate write access for alert topics', async () => {
      const topic = 'uns-demo/factory-floor/machining/cell-01/cnc-001/adhoc/alerts/maintenance-due';
      const hasAccess = await subscriptionManager.validateTopicAccess(
        topic, 
        'maintenance_technician', 
        'write'
      );

      expect(hasAccess).toBe(true);
    });

    it('should deny write access for read-only subscriptions', async () => {
      const topic = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/temperature';
      const hasAccess = await subscriptionManager.validateTopicAccess(
        topic, 
        'maintenance_technician', 
        'write'
      );

      expect(hasAccess).toBe(false);
    });

    it('should deny access for non-matching topics', async () => {
      const topic = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/production/cycle-time';
      const hasAccess = await subscriptionManager.validateTopicAccess(
        topic, 
        'maintenance_technician', 
        'read'
      );

      expect(hasAccess).toBe(false);
    });
  });

  describe('Role-Based Topic Pattern Management', () => {
    it('should handle factory manager comprehensive access patterns', async () => {
      const factoryManagerPatterns = [
        {
          pattern: 'uns-demo/factory-floor/+/+/+/info/status/+',
          description: 'All machine status information'
        },
        {
          pattern: 'uns-demo/factory-floor/+/+/+/info/production/+',
          description: 'All production metrics'
        },
        {
          pattern: 'uns-demo/factory-floor/+/+/+/info/kpi/+',
          description: 'All KPI metrics'
        },
        {
          pattern: 'uns-demo/factory-floor/+/+/+/adhoc/alerts/critical',
          description: 'Critical alerts only'
        }
      ];

      for (const { pattern, description } of factoryManagerPatterns) {
        const subscription = await subscriptionManager.createSubscription({
          user_role: 'factory_manager',
          topic_pattern: pattern,
          access_level: 'read',
          description,
          is_active: true
        });

        expect(subscription.user_role).toBe('factory_manager');
        expect(subscription.topic_pattern).toBe(pattern);
      }

      const allSubscriptions = await subscriptionManager.getSubscriptionsByRole('factory_manager');
      expect(allSubscriptions).toHaveLength(4);
    });

    it('should handle production manager area-specific access', async () => {
      const productionManagerPatterns = [
        'uns-demo/factory-floor/machining/+/+/info/production/+',
        'uns-demo/factory-floor/machining/+/+/info/status/+',
        'uns-demo/factory-floor/machining/+/+/func/scheduling/+'
      ];

      for (const pattern of productionManagerPatterns) {
        await subscriptionManager.createSubscription({
          user_role: 'production_manager',
          topic_pattern: pattern,
          access_level: 'read',
          description: `Production manager access: ${pattern}`,
          is_active: true
        });
      }

      // Verify production manager only gets machining area access
      const testTopic = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/production/cycle-time';
      const matches = await subscriptionManager.matchTopicToSubscriptions(testTopic, 'production_manager');
      
      expect(matches.length).toBeGreaterThanOrEqual(1);
      expect(matches.every(m => m.topic_pattern.includes('machining'))).toBe(true);
    });

    it('should handle executive high-level dashboard access', async () => {
      const executivePatterns = [
        'uns-demo/+/+/+/+/info/kpi/overall-efficiency',
        'uns-demo/+/+/+/+/info/kpi/uptime',
        'uns-demo/+/+/+/+/info/kpi/production-rate',
        'uns-demo/+/+/+/+/adhoc/alerts/critical'
      ];

      for (const pattern of executivePatterns) {
        await subscriptionManager.createSubscription({
          user_role: 'executive',
          topic_pattern: pattern,
          access_level: 'read',
          description: `Executive dashboard: ${pattern}`,
          is_active: true
        });
      }

      // Verify executive gets enterprise-wide access
      const enterpriseTopics = [
        'uns-demo/factory-floor/machining/cell-01/cnc-001/info/kpi/overall-efficiency',
        'uns-demo/factory-floor/turning/cell-02/cnc-003/info/kpi/uptime',
        'uns-demo/factory-floor/multi-axis/cell-03/cnc-005/info/kpi/production-rate'
      ];

      for (const topic of enterpriseTopics) {
        const matches = await subscriptionManager.matchTopicToSubscriptions(topic, 'executive');
        expect(matches.length).toBeGreaterThanOrEqual(1);
      }
    });
  });
});