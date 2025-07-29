import '@testing-library/jest-dom';

// Polyfill web APIs for testing
global.Request = global.Request || class Request {};
global.Response =
  global.Response ||
  class Response {
    static json(data) {
      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    async json() {
      return JSON.parse(this._bodyText || '{}');
    }

    get status() {
      return 200;
    }
  };
global.Headers = global.Headers || class Headers {};

// Polyfill for pg library (Node.js crypto APIs)
global.TextEncoder = global.TextEncoder || require('util').TextEncoder;
global.TextDecoder = global.TextDecoder || require('util').TextDecoder;
global.crypto = global.crypto || require('crypto').webcrypto;

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock-supabase.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'mock-supabase-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-supabase-service-role-key';
process.env.SUPABASE_DATABASE_URL = 'postgresql://postgres:test@localhost:5432/test';
process.env.TIMESCALEDB_URL = 'postgresql://test:test@localhost:5432/test_timescale';
process.env.MQTT_BROKER_URL = 'mqtt://mock-mqtt-broker:1883';
process.env.MQTT_USERNAME = 'mock-mqtt-user';
process.env.MQTT_PASSWORD = 'mock-mqtt-password';

// Mock external modules
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    () => require('./src/__mocks__/supabase').mockSupabaseClient
  ),
}));

// Mock Next.js modules that aren't available in test environment
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    query: {},
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: new Map(),
      _data: data,
    }),
  },
}));
