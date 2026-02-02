/**
 * TimescaleDB Connection Utility
 * Provides PostgreSQL connection to TimescaleDB for dashboard functionality
 */

import { Pool, PoolClient, QueryResult } from 'pg'

// Connection configuration
const TIMESCALE_CONFIG = {
  host: process.env.TIMESCALE_HOST || '159.223.67.162',
  port: parseInt(process.env.TIMESCALE_PORT || '5433'),
  database: process.env.TIMESCALE_DATABASE || 'uns_timeseries',
  user: process.env.TIMESCALE_USER || 'postgres',
  password: process.env.TIMESCALE_PASSWORD || 'password',
  ssl: false,
  max: 20, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
}

// Global connection pool
let pool: Pool | null = null

/**
 * Get or create PostgreSQL connection pool
 */
export function getTimescalePool(): Pool {
  if (!pool) {
    pool = new Pool(TIMESCALE_CONFIG)

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle TimescaleDB client', err)
    })
  }

  return pool
}

/**
 * Execute a query with automatic connection handling
 */
export async function executeQuery<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getTimescalePool()

  try {
    const result = await pool.query<T>(text, params)
    return result
  } catch (error) {
    console.error('TimescaleDB query error:', error)
    throw error
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function executeTransaction<T = any>(
  queries: Array<{ text: string; params?: any[] }>
): Promise<QueryResult<T>[]> {
  const pool = getTimescalePool()
  const client: PoolClient = await pool.connect()

  try {
    await client.query('BEGIN')

    const results: QueryResult<T>[] = []
    for (const query of queries) {
      const result = await client.query<T>(query.text, query.params)
      results.push(result)
    }

    await client.query('COMMIT')
    return results
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('TimescaleDB transaction error:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Health check for TimescaleDB connection
 */
export async function checkTimescaleHealth(): Promise<{
  healthy: boolean
  message: string
  details?: any
}> {
  try {
    const result = await executeQuery('SELECT NOW() as current_time, version() as pg_version')

    return {
      healthy: true,
      message: 'TimescaleDB connection healthy',
      details: {
        timestamp: result.rows[0]?.current_time,
        version: result.rows[0]?.pg_version,
        poolSize: pool?.totalCount || 0,
        idleConnections: pool?.idleCount || 0
      }
    }
  } catch (error) {
    return {
      healthy: false,
      message: `TimescaleDB connection failed: ${error}`,
      details: { error: String(error) }
    }
  }
}

/**
 * Close the connection pool (for cleanup)
 */
export async function closeTimescalePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// Type definitions for common queries
export interface SensorReading {
  time: Date
  topic: string
  tag_name: string
  value: number | null
  value_bool: boolean | null
  location: string
  virtual_path: string
  source: string
}

export interface MachineDefinition {
  id: string
  machine_id: string
  name: string
  type: string
  location: string
  status: 'active' | 'inactive' | 'maintenance'
  metadata: any
}

export interface User {
  id: string
  email: string
  role: 'factory_manager' | 'production_manager' | 'maintenance_technician' | 'executive'
  full_name: string
  created_at: Date
  last_login: Date | null
}

export interface MaintenanceAlert {
  id: string
  machine_id: string
  alert_type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  threshold_value: number | null
  current_value: number | null
  status: 'active' | 'acknowledged' | 'resolved'
  created_at: Date
  resolved_at: Date | null
  assigned_to: string | null
}