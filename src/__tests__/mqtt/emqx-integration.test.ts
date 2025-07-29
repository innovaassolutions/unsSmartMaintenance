/**
 * @jest-environment node
 */

import { EMQXCloudAPI, EMQXUser, EMQXACLRule, createEMQXCloudAPI } from '../../lib/mqtt/emqx-api';
import { TopicProvisioningService } from '../../lib/mqtt/topic-provisioning';
import { TopicRegistry } from '../../lib/database/topic-registry';

// Mock dependencies
jest.mock('../../lib/database/topic-registry');
jest.mock('../../lib/database/supabase-client');
jest.mock('../../lib/mqtt/emqx-api', () => ({
  ...jest.requireActual('../../lib/mqtt/emqx-api'),
  createEMQXCloudAPI: jest.fn(),
}));

// Mock fetch for EMQX API calls
global.fetch = jest.fn();

describe('EMQXCloudAPI', () => {
  let emqxAPI: EMQXCloudAPI;
  const mockConfig = {
    apiUrl: 'https://test.emqx.cloud',
    apiKey: 'test-api-key',
    deployment: 'test-deployment',
  };

  beforeEach(() => {
    emqxAPI = new EMQXCloudAPI(mockConfig);
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const mockUser: EMQXUser = {
        username: 'test_user',
        password: 'secure_password',
        is_superuser: false,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ code: 0 }),
      });

      await emqxAPI.createUser(mockUser);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.emqx.cloud/api/v5/users',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            username: 'test_user',
            password: 'secure_password',
            is_superuser: false,
          }),
        })
      );
    });

    it('should handle user creation failure', async () => {
      const mockUser: EMQXUser = {
        username: 'test_user',
        password: 'secure_password',
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('User already exists'),
      });

      await expect(emqxAPI.createUser(mockUser)).rejects.toThrow('EMQX API request failed');
    });
  });

  describe('createACLRule', () => {
    it('should create ACL rule successfully', async () => {
      const mockRule: EMQXACLRule = {
        username: 'test_user',
        topic: 'uns/test/topic',
        action: 'pub',
        permission: 'allow',
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ code: 0 }),
      });

      await emqxAPI.createACLRule(mockRule);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.emqx.cloud/api/v5/acls',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRule),
        })
      );
    });

    it('should handle ACL rule creation failure', async () => {
      const mockRule: EMQXACLRule = {
        username: 'test_user',
        topic: 'uns/test/topic',
        action: 'sub',
        permission: 'allow',
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('ACL rule creation failed'),
      });

      await expect(emqxAPI.createACLRule(mockRule)).rejects.toThrow('EMQX API request failed');
    });
  });

  describe('provisionUNSTopic', () => {
    it('should provision UNS topic with appropriate ACL rules', async () => {
      const topicPath = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed';
      
      // Mock topic registry response
      const mockTopic = {
        id: 'test-id',
        topic_path: topicPath,
        topic_type: 'informational',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
        is_active: true,
      };

      // Mock TopicRegistry
      const mockTopicRegistry = {
        findTopicByPath: jest.fn().mockResolvedValue(mockTopic),
      };
      (emqxAPI as any).topicRegistry = mockTopicRegistry;

      // Mock successful ACL rule creation
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ code: 0 }),
      });

      await emqxAPI.provisionUNSTopic(topicPath);

      expect(mockTopicRegistry.findTopicByPath).toHaveBeenCalledWith(topicPath);
      expect(fetch).toHaveBeenCalledTimes(4); // Multiple ACL rules created
    });

    it('should fail when topic not found in registry', async () => {
      const topicPath = 'nonexistent/topic/path';

      // Mock TopicRegistry to return null
      const mockTopicRegistry = {
        findTopicByPath: jest.fn().mockResolvedValue(null),
      };
      (emqxAPI as any).topicRegistry = mockTopicRegistry;

      await expect(emqxAPI.provisionUNSTopic(topicPath)).rejects.toThrow('Topic not found in registry');
    });
  });

  describe('setupRoleBasedAccess', () => {
    it('should create all role-based users and ACL patterns', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ code: 0 }),
      });

      await emqxAPI.setupRoleBasedAccess();

      // Should create users for each role plus base ACL patterns
      expect(fetch).toHaveBeenCalledTimes(15); // 5 users + 10 base ACL patterns
    });
  });

  describe('setupMachineAccess', () => {
    it('should create machine user and specific ACL rules', async () => {
      const machineId = 'cnc-001';

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ code: 0 }),
      });

      await emqxAPI.setupMachineAccess(machineId);

      expect(fetch).toHaveBeenCalledTimes(3); // 1 user creation + 2 ACL rules

      // Verify machine user creation
      expect(fetch).toHaveBeenCalledWith(
        'https://test.emqx.cloud/api/v5/users',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(`"username":"machine_${machineId}"`),
        })
      );
    });
  });

  describe('getTopicMetrics', () => {
    it('should return topic metrics from EMQX', async () => {
      const mockMetrics = [
        { topic: 'uns/test/topic1', node: 'emqx@node1', subscriptions: 2, subscribers: 2 },
        { topic: 'uns/test/topic2', node: 'emqx@node1', subscriptions: 1, subscribers: 1 },
      ];

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: mockMetrics }),
      });

      const result = await emqxAPI.getTopicMetrics();

      expect(result).toEqual(mockMetrics);
      expect(fetch).toHaveBeenCalledWith(
        'https://test.emqx.cloud/api/v5/topics',
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should filter topics when topicFilter is provided', async () => {
      const topicFilter = 'uns/test/+';
      
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: [] }),
      });

      await emqxAPI.getTopicMetrics(topicFilter);

      expect(fetch).toHaveBeenCalledWith(
        'https://test.emqx.cloud/api/v5/topics/uns%2Ftest%2F%2B',
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('validateConnection', () => {
    it('should return success when connection is valid', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { connections: 10 } }),
      });

      const result = await emqxAPI.validateConnection();

      expect(result).toEqual({ success: true });
    });

    it('should return error when connection fails', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await emqxAPI.validateConnection();

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });
  });
});

describe('TopicProvisioningService', () => {
  let provisioningService: TopicProvisioningService;
  let mockTopicRegistry: jest.Mocked<TopicRegistry>;
  let mockEMQXAPI: jest.Mocked<EMQXCloudAPI>;

  beforeEach(() => {
    // Mock dependencies
    mockTopicRegistry = {
      findTopicByPath: jest.fn(),
      searchTopics: jest.fn(),
      getTopicsForMachine: jest.fn(),
    } as any;

    mockEMQXAPI = {
      provisionUNSTopic: jest.fn(),
      setupMachineAccess: jest.fn(),
      setupRoleBasedAccess: jest.fn(),
      getTopicMetrics: jest.fn(),
      cleanupUnusedTopics: jest.fn(),
      validateConnection: jest.fn(),
    } as any;

    // Mock the createEMQXCloudAPI function
    (createEMQXCloudAPI as jest.Mock).mockReturnValue(mockEMQXAPI);

    provisioningService = new TopicProvisioningService();
    (provisioningService as any).topicRegistry = mockTopicRegistry;
    (provisioningService as any).emqxAPI = mockEMQXAPI;
  });

  describe('provisionTopic', () => {
    it('should successfully provision an active topic', async () => {
      const topicPath = 'uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/temperature';
      const mockTopic = {
        id: 'topic-123',
        topic_path: topicPath,
        topic_type: 'informational',
        is_active: true,
      };

      mockTopicRegistry.findTopicByPath.mockResolvedValue(mockTopic as any);
      mockEMQXAPI.provisionUNSTopic.mockResolvedValue();

      const result = await provisioningService.provisionTopic(topicPath);

      expect(result).toEqual({
        success: true,
        topicPath,
        aclRulesCreated: 4,
      });
      expect(mockEMQXAPI.provisionUNSTopic).toHaveBeenCalledWith(topicPath);
    });

    it('should fail when topic not found in registry', async () => {
      const topicPath = 'nonexistent/topic';
      
      mockTopicRegistry.findTopicByPath.mockResolvedValue(null);

      const result = await provisioningService.provisionTopic(topicPath);

      expect(result).toEqual({
        success: false,
        topicPath,
        error: 'Topic not found in registry',
      });
    });

    it('should fail when topic is not active', async () => {
      const topicPath = 'inactive/topic';
      const mockTopic = {
        id: 'topic-123',
        topic_path: topicPath,
        is_active: false,
      };

      mockTopicRegistry.findTopicByPath.mockResolvedValue(mockTopic as any);

      const result = await provisioningService.provisionTopic(topicPath);

      expect(result).toEqual({
        success: false,
        topicPath,
        error: 'Topic is not active',
      });
    });

    it('should handle EMQX provisioning errors', async () => {
      const topicPath = 'test/topic';
      const mockTopic = { id: 'topic-123', topic_path: topicPath, is_active: true };

      mockTopicRegistry.findTopicByPath.mockResolvedValue(mockTopic as any);
      mockEMQXAPI.provisionUNSTopic.mockRejectedValue(new Error('EMQX error'));

      const result = await provisioningService.provisionTopic(topicPath);

      expect(result).toEqual({
        success: false,
        topicPath,
        error: 'EMQX error',
      });
    });
  });

  describe('provisionAllTopics', () => {
    it('should provision all active topics', async () => {
      const mockTopics = [
        { topic_path: 'topic1', is_active: true },
        { topic_path: 'topic2', is_active: true },
        { topic_path: 'topic3', is_active: true },
      ];

      mockTopicRegistry.searchTopics.mockResolvedValue(mockTopics as any);
      mockTopicRegistry.findTopicByPath.mockResolvedValue({ is_active: true } as any);
      mockEMQXAPI.provisionUNSTopic.mockResolvedValue();

      const result = await provisioningService.provisionAllTopics();

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockEMQXAPI.provisionUNSTopic).toHaveBeenCalledTimes(3);
    });
  });

  describe('provisionMachineTopics', () => {
    it('should provision all topics for a specific machine', async () => {
      const machineId = 'cnc-001';
      const mockTopics = [
        { topic_path: 'topic1' },
        { topic_path: 'topic2' },
      ];

      mockTopicRegistry.getTopicsForMachine.mockResolvedValue(mockTopics as any);
      mockTopicRegistry.findTopicByPath.mockResolvedValue({ is_active: true } as any);
      mockEMQXAPI.setupMachineAccess.mockResolvedValue();
      mockEMQXAPI.provisionUNSTopic.mockResolvedValue();

      const result = await provisioningService.provisionMachineTopics(machineId);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(2);
      expect(mockEMQXAPI.setupMachineAccess).toHaveBeenCalledWith(machineId);
    });
  });

  describe('syncWithEMQX', () => {
    it('should sync registry topics with EMQX Cloud', async () => {
      const mockRegistryTopics = [
        { topic_path: 'topic1' },
        { topic_path: 'topic2' },
        { topic_path: 'topic3' },
      ];

      const mockEMQXTopics = [
        { topic: 'topic1' },
        { topic: 'topic4' }, // This topic exists in EMQX but not in registry
      ];

      mockTopicRegistry.searchTopics.mockResolvedValue(mockRegistryTopics as any);
      mockTopicRegistry.findTopicByPath.mockResolvedValue({ is_active: true } as any);
      mockEMQXAPI.getTopicMetrics.mockResolvedValue(mockEMQXTopics as any);
      mockEMQXAPI.provisionUNSTopic.mockResolvedValue();
      mockEMQXAPI.cleanupUnusedTopics.mockResolvedValue();

      const result = await provisioningService.syncWithEMQX();

      expect(result.provisioned).toBe(2); // topic2 and topic3 need provisioning
      expect(result.errors).toHaveLength(0);
      expect(mockEMQXAPI.cleanupUnusedTopics).toHaveBeenCalled();
    });
  });

  describe('getProvisioningStatus', () => {
    it('should return current provisioning status', async () => {
      const mockRegistryTopics = [
        { id: '1', topic_path: 'topic1' },
        { id: '2', topic_path: 'topic2' },
        { id: '3', topic_path: 'topic3' },
      ];

      const mockEMQXTopics = [
        { topic: 'topic1' },
      ];

      mockTopicRegistry.searchTopics.mockResolvedValue(mockRegistryTopics as any);
      mockEMQXAPI.getTopicMetrics.mockResolvedValue(mockEMQXTopics as any);

      const result = await provisioningService.getProvisioningStatus();

      expect(result.totalTopics).toBe(3);
      expect(result.provisionedTopics).toBe(1);
      expect(result.pendingTopics).toEqual(['topic2', 'topic3']);
      expect(result.failedTopics).toEqual([]);
    });
  });

  describe('validateConnection', () => {
    it('should validate EMQX connection', async () => {
      const mockResult = { success: true };
      mockEMQXAPI.validateConnection.mockResolvedValue(mockResult);

      const result = await provisioningService.validateConnection();

      expect(result).toEqual(mockResult);
      expect(mockEMQXAPI.validateConnection).toHaveBeenCalled();
    });
  });
});