/**
 * Mock for Supabase Client in Tests
 */

const mockTopicRegistry = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
  groupBy: jest.fn(),
};

const mockCNCMachine = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

const mockTopicSubscription = {
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  findMany: jest.fn(),
  count: jest.fn(),
};

const mockPrismaClient = {
  topicRegistry: mockTopicRegistry,
  cNCMachine: mockCNCMachine,
  topicSubscription: mockTopicSubscription,
  $disconnect: jest.fn(),
};

export function getPrismaClient() {
  return mockPrismaClient;
}

export function getSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  };
}

export function getDatabaseClients() {
  return {
    supabase: getSupabaseClient(),
    prisma: getPrismaClient(),
  };
}

export function closeDatabaseConnections() {
  return Promise.resolve();
}

// Export mocks for test setup
export const mocks = {
  topicRegistry: mockTopicRegistry,
  cNCMachine: mockCNCMachine,
  topicSubscription: mockTopicSubscription,
  prisma: mockPrismaClient,
};