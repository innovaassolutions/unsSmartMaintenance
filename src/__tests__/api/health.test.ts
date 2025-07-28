/**
 * Test suite for health check API route
 */

import { GET } from '@/app/api/health/route';

describe('/api/health', () => {
  describe('GET endpoint', () => {
    it('should return status 200 with correct response format', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('timestamp');
      expect(data).toHaveProperty('version');
      expect(data).toHaveProperty('environment');
    });

    it('should return healthy status', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.status).toBe('healthy');
    });

    it('should return current timestamp in ISO format', async () => {
      const beforeCall = new Date();
      const response = await GET();
      const data = await response.json();
      const afterCall = new Date();

      expect(data.timestamp).toBeDefined();
      expect(typeof data.timestamp).toBe('string');
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);

      const timestamp = new Date(data.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(
        beforeCall.getTime() - 1000
      );
      expect(timestamp.getTime()).toBeLessThanOrEqual(
        afterCall.getTime() + 1000
      );
    });

    it('should return version information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.version).toBe('1.0.0');
    });

    it('should return environment information', async () => {
      const response = await GET();
      const data = await response.json();

      expect(data.environment).toBeDefined();
      expect(typeof data.environment).toBe('string');
    });
  });
});
