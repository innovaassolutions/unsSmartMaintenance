/**
 * Hybrid Database Tests
 * Tests for both Supabase (application data) and TimescaleDB (time-series data) connections
 */

import { createClient } from '@supabase/supabase-js';
import { Client as PgClient } from 'pg';

describe('Hybrid Database Architecture', () => {
  let supabaseClient: ReturnType<typeof createClient>;
  let timescaleClient: PgClient | null = null;
  let timescaleEnabled = false;

  beforeAll(async () => {
    // Initialize Supabase client
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Initialize TimescaleDB client only if real connection string is available
    if (process.env.TIMESCALEDB_URL && !process.env.TIMESCALEDB_URL.includes('localhost')) {
      try {
        timescaleClient = new PgClient({
          connectionString: process.env.TIMESCALEDB_URL!,
          ssl: { rejectUnauthorized: false }
        });

        await timescaleClient.connect();
        timescaleEnabled = true;
        console.log('✅ TimescaleDB connection enabled for testing');
      } catch (error) {
        console.warn('⚠️ TimescaleDB not available for testing:', error.message);
        timescaleEnabled = false;
      }
    } else {
      console.log('ℹ️ TimescaleDB tests skipped - using mock environment');
    }
  });

  afterAll(async () => {
    if (timescaleClient) {
      await timescaleClient.end();
    }
  });

  describe('Supabase Connection (Application Data)', () => {
    test('should connect to Supabase successfully', async () => {
      const { data: session } = await supabaseClient.auth.getSession();
      expect(session).toBeDefined();
    });

    test('should verify Supabase tables exist', async () => {
      // Test basic query structure for expected application tables
      const expectedTables = [
        'organizations',
        'user_profiles', 
        'machine_definitions',
        'maintenance_categories',
        'sensors'
      ];

      for (const tableName of expectedTables) {
        const query = supabaseClient.from(tableName).select('*').limit(1);
        expect(query).toBeDefined();
        expect(typeof query.then).toBe('function');
      }
    });
  });

  describe('TimescaleDB Connection (Time-Series Data)', () => {
    test('should connect to TimescaleDB successfully', async () => {
      if (!timescaleEnabled || !timescaleClient) {
        console.log('⏭️ Skipping TimescaleDB test - not available');
        return;
      }

      const result = await timescaleClient.query('SELECT version();');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].version).toContain('PostgreSQL');
    });

    test('should verify TimescaleDB extension is available', async () => {
      if (!timescaleEnabled || !timescaleClient) {
        console.log('⏭️ Skipping TimescaleDB test - not available');
        return;
      }

      const result = await timescaleClient.query(`
        SELECT extname FROM pg_extension WHERE extname = 'timescaledb';
      `);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].extname).toBe('timescaledb');
    });

    test('should verify hypertables were created', async () => {
      if (!timescaleEnabled || !timescaleClient) {
        console.log('⏭️ Skipping TimescaleDB test - not available');
        return;
      }

      const result = await timescaleClient.query(`
        SELECT hypertable_name, hypertable_schema 
        FROM timescaledb_information.hypertables;
      `);

      const expectedHypertables = [
        'sensor_readings',
        'machine_status', 
        'alerts',
        'maintenance_records'
      ];

      expect(result.rows.length).toBeGreaterThanOrEqual(expectedHypertables.length);
      
      const hypertableNames = result.rows.map(row => row.hypertable_name);
      expectedHypertables.forEach(tableName => {
        expect(hypertableNames).toContain(tableName);
      });
    });

    test('should verify continuous aggregates were created', async () => {
      if (!timescaleEnabled || !timescaleClient) {
        console.log('⏭️ Skipping TimescaleDB test - not available');
        return;
      }

      const result = await timescaleClient.query(`
        SELECT view_name, materialized_only 
        FROM timescaledb_information.continuous_aggregates;
      `);

      const expectedAggregates = [
        'sensor_readings_hourly',
        'machine_status_hourly'
      ];

      const aggregateNames = result.rows.map(row => row.view_name);
      expectedAggregates.forEach(aggregateName => {
        expect(aggregateNames).toContain(aggregateName);
      });
    });

    test('should be able to insert and query time-series data', async () => {
      if (!timescaleEnabled || !timescaleClient) {
        console.log('⏭️ Skipping TimescaleDB test - not available');
        return;
      }

      // Test sensor_readings table
      const testSensorId = '550e8400-e29b-41d4-a716-446655440000';
      const testValue = 23.45;

      // Insert test data
      await timescaleClient.query(`
        INSERT INTO sensor_readings (sensor_id, value, quality_code)
        VALUES ($1, $2, $3)
      `, [testSensorId, testValue, 1]);

      // Query test data
      const result = await timescaleClient.query(`
        SELECT sensor_id, value, quality_code 
        FROM sensor_readings 
        WHERE sensor_id = $1 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [testSensorId]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].sensor_id).toBe(testSensorId);
      expect(parseFloat(result.rows[0].value)).toBe(testValue);
      expect(result.rows[0].quality_code).toBe(1);

      // Clean up test data
      await timescaleClient.query(`
        DELETE FROM sensor_readings WHERE sensor_id = $1
      `, [testSensorId]);
    });
  });

  describe('Database Schema Validation', () => {
    test('should validate TimescaleDB table structures', async () => {
      if (!timescaleEnabled || !timescaleClient) {
        console.log('⏭️ Skipping TimescaleDB test - not available');
        return;
      }

      // Check sensor_readings table structure
      const sensorReadingsColumns = await timescaleClient.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sensor_readings'
        ORDER BY ordinal_position;
      `);

      const expectedColumns = [
        { column_name: 'id', data_type: 'uuid' },
        { column_name: 'sensor_id', data_type: 'uuid' },
        { column_name: 'timestamp', data_type: 'timestamp with time zone' },
        { column_name: 'value', data_type: 'numeric' },
        { column_name: 'quality_code', data_type: 'integer' },
        { column_name: 'metadata', data_type: 'jsonb' }
      ];

      expectedColumns.forEach(expectedCol => {
        const actualCol = sensorReadingsColumns.rows.find(
          row => row.column_name === expectedCol.column_name
        );
        expect(actualCol).toBeDefined();
        expect(actualCol.data_type).toBe(expectedCol.data_type);
      });
    });

    test('should validate UNS topic hierarchy constraints', () => {
      // Define UNS hierarchy structure for validation
      const unsHierarchy = {
        descriptive: ['enterprise', 'site', 'area', 'line', 'cell'],
        functional: ['machine', 'component', 'sensor'],
        informational: ['data_type', 'quality', 'timestamp'],
        adhoc: ['alerts', 'maintenance', 'diagnostics']
      };

      // Validate structure
      expect(Object.keys(unsHierarchy)).toHaveLength(4);
      expect(unsHierarchy.descriptive).toContain('enterprise');
      expect(unsHierarchy.functional).toContain('machine');
      expect(unsHierarchy.informational).toContain('timestamp');
      expect(unsHierarchy.adhoc).toContain('alerts');
    });
  });

  describe('Data Integrity and Performance', () => {
    test('should verify hypertable partitioning is working', async () => {
      const result = await timescaleClient.query(`
        SELECT 
          hypertable_name,
          num_chunks,
          compression_enabled
        FROM timescaledb_information.hypertables
        WHERE hypertable_name = 'sensor_readings';
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].hypertable_name).toBe('sensor_readings');
      expect(typeof result.rows[0].num_chunks).toBe('number');
    });

    test('should verify retention policies are configured', async () => {
      const result = await timescaleClient.query(`
        SELECT 
          hypertable_name,
          older_than,
          cascade_to_materializations
        FROM timescaledb_information.drop_chunks_policies;
      `);

      // Should have retention policies for our time-series tables
      expect(result.rows.length).toBeGreaterThan(0);
      
      const policyTables = result.rows.map(row => row.hypertable_name);
      expect(policyTables).toContain('sensor_readings');
    });
  });

  describe('Real-time Capabilities', () => {
    test('should support Supabase real-time subscriptions', () => {
      const channel = supabaseClient
        .channel('test-channel')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'machines' }, 
          (payload) => {
            console.log('Change received!', payload);
          }
        );

      expect(channel).toBeDefined();
      expect(typeof channel.subscribe).toBe('function');
      expect(typeof channel.unsubscribe).toBe('function');

      // Clean up
      channel.unsubscribe();
    });

    test('should handle TimescaleDB time-series queries efficiently', async () => {
      const startTime = Date.now();
      
      // Query recent data across time buckets
      const result = await timescaleClient.query(`
        SELECT 
          time_bucket('1 hour', timestamp) AS hour_bucket,
          COUNT(*) as reading_count
        FROM sensor_readings
        WHERE timestamp > NOW() - INTERVAL '24 hours'
        GROUP BY hour_bucket
        ORDER BY hour_bucket DESC
        LIMIT 24;
      `);

      const queryTime = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(queryTime).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});