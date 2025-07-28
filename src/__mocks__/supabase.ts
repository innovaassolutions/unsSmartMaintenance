/**
 * Mock implementation for Supabase client
 */

export const mockSupabaseClient = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    insert: jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
    update: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    delete: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
  auth: {
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
  },
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnValue({ status: 'SUBSCRIBED' }),
    unsubscribe: jest.fn(),
  }),
};

// Mock the createClient function
export const createClient = jest.fn(() => mockSupabaseClient);

// Default export for ES modules
export default mockSupabaseClient;
