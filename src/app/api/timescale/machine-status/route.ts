/**
 * Enhanced Machine Status API with TimescaleDB Integration
 * Combines TimescaleDB windowed aggregations with Supabase real-time data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Client as PostgresClient } from 'pg'

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// TimescaleDB client configuration
const timescaleConfig = {
  host: '159.223.67.162',
  port: 5433,
  database: 'uns_timeseries',
  user: 'uns_app',
  password: 'uns_app_password',
  ssl: false
}

/**
 * GET /api/timescale/machine-status
 * Get enhanced machine status with TimescaleDB windowed aggregations
 */
export async function GET(request: NextRequest) {
  let timescaleClient: PostgresClient | null = null

  try {
    const searchParams = request.nextUrl.searchParams
    const machineId = searchParams.get('machineId')
    const timeRange = searchParams.get('timeRange') || '1h' // 1h, 6h, 24h
    const includeTrends = searchParams.get('includeTrends') === 'true'

    // Connect to TimescaleDB
    timescaleClient = new PostgresClient(timescaleConfig)
    await timescaleClient.connect()

    if (machineId) {
      // Get specific machine with enhanced data
      const machineData = await getEnhancedMachineStatus(
        timescaleClient, 
        machineId, 
        timeRange, 
        includeTrends
      )
      
      if (!machineData) {
        return NextResponse.json(
          { error: 'Machine not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        machine: machineData,
        timestamp: new Date().toISOString()
      })

    } else {
      // Get all machines with enhanced summary
      const machinesData = await getEnhancedMachinesSummary(
        timescaleClient,
        timeRange
      )

      return NextResponse.json({
        machines: machinesData.machines,
        summary: machinesData.summary,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Enhanced machine status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    if (timescaleClient) {
      await timescaleClient.end()
    }
  }
}

/**
 * Get enhanced machine status combining TimescaleDB and Supabase data
 */
async function getEnhancedMachineStatus(
  timescaleClient: PostgresClient,
  machineId: string,
  timeRange: string,
  includeTrends: boolean
) {
  // Get basic machine info from Supabase
  const { data: machineInfo, error: machineError } = await supabase
    .from('cnc_machines')
    .select('*')
    .eq('machine_id', machineId)
    .single()

  if (machineError || !machineInfo) {
    return null
  }

  // Get current windowed status from TimescaleDB
  const currentStatusQuery = `
    SELECT 
      machine_id,
      time,
      location_path,
      spindle_speed_avg,
      spindle_speed_min,
      spindle_speed_max,
      temperature_avg,
      temperature_min,
      temperature_max,
      vibration_avg,
      vibration_min,
      vibration_max,
      pressure_avg,
      pressure_min,
      pressure_max,
      message_count,
      status
    FROM machine_status 
    WHERE machine_id = $1 
    ORDER BY time DESC 
    LIMIT 1
  `

  const statusResult = await timescaleClient.query(currentStatusQuery, [machineId])
  const currentStatus = statusResult.rows[0] || null

  // Get real-time sensor readings from Supabase
  const { data: realtimeReadings } = await supabase
    .from('sensor_readings_realtime')
    .select('*')
    .eq('machine_id', machineId)
    .order('timestamp', { ascending: false })
    .limit(10)

  let trendsData = null
  if (includeTrends) {
    trendsData = await getMachineTrends(timescaleClient, machineId, timeRange)
  }

  // Combine all data sources
  return {
    id: machineInfo.id,
    machine_id: machineInfo.machine_id,
    display_name: machineInfo.display_name,
    manufacturer: machineInfo.manufacturer,
    model: machineInfo.model,
    operational_status: machineInfo.operational_status,
    
    // TimescaleDB windowed data
    windowed_status: currentStatus ? {
      timestamp: currentStatus.time,
      location_path: currentStatus.location_path,
      sensors: {
        spindle_speed: {
          avg: currentStatus.spindle_speed_avg,
          min: currentStatus.spindle_speed_min,
          max: currentStatus.spindle_speed_max,
          unit: 'rpm'
        },
        temperature: {
          avg: currentStatus.temperature_avg,
          min: currentStatus.temperature_min,
          max: currentStatus.temperature_max,
          unit: '°C'
        },
        vibration: {
          avg: currentStatus.vibration_avg,
          min: currentStatus.vibration_min,
          max: currentStatus.vibration_max,
          unit: 'g'
        },
        pressure: {
          avg: currentStatus.pressure_avg,
          min: currentStatus.pressure_min,
          max: currentStatus.pressure_max,
          unit: 'bar'
        }
      },
      message_count: currentStatus.message_count,
      status: currentStatus.status
    } : null,

    // Real-time data from Supabase
    realtime_readings: realtimeReadings || [],
    
    // Trends data (if requested)
    trends: trendsData,
    
    // Pipeline health
    pipeline_status: machineInfo.pipeline_status,
    data_quality_score: machineInfo.data_quality_score,
    last_data_received: machineInfo.last_data_received,
    total_messages_received: machineInfo.total_messages_received
  }
}

/**
 * Get enhanced machines summary with TimescaleDB aggregations
 */
async function getEnhancedMachinesSummary(
  timescaleClient: PostgresClient,
  timeRange: string
) {
  // Get all machines from Supabase
  const { data: machines, error } = await supabase
    .from('cnc_machines')
    .select('*')
    .order('display_name')

  if (error) {
    throw error
  }

  // Get latest status for all machines from TimescaleDB
  const allStatusQuery = `
    SELECT DISTINCT ON (machine_id)
      machine_id,
      time,
      spindle_speed_avg,
      temperature_avg,
      vibration_avg,
      pressure_avg,
      status,
      message_count
    FROM machine_status 
    WHERE time >= NOW() - INTERVAL '${timeRange === '6h' ? '6 hours' : timeRange === '24h' ? '24 hours' : '1 hour'}'
    ORDER BY machine_id, time DESC
  `

  const statusResults = await timescaleClient.query(allStatusQuery)
  const statusMap = new Map(statusResults.rows.map(row => [row.machine_id, row]))

  // Enhance machines with TimescaleDB data
  const enhancedMachines = machines?.map(machine => {
    const timescaleStatus = statusMap.get(machine.machine_id)
    
    return {
      ...machine,
      timescale_status: timescaleStatus ? {
        last_update: timescaleStatus.time,
        spindle_speed: timescaleStatus.spindle_speed_avg,
        temperature: timescaleStatus.temperature_avg,
        vibration: timescaleStatus.vibration_avg,
        pressure: timescaleStatus.pressure_avg,
        status: timescaleStatus.status,
        message_count: timescaleStatus.message_count
      } : null,
      has_recent_data: !!timescaleStatus
    }
  }) || []

  // Calculate enhanced summary
  const summary = {
    total: enhancedMachines.length,
    connected: enhancedMachines.filter(m => m.pipeline_status === 'connected').length,
    with_timescale_data: enhancedMachines.filter(m => m.has_recent_data).length,
    active: enhancedMachines.filter(m => m.timescale_status?.message_count > 0).length,
    offline: enhancedMachines.filter(m => 
      m.pipeline_status === 'disconnected' || 
      m.pipeline_status === 'error' || 
      m.pipeline_status === 'unknown' ||
      !m.has_recent_data
    ).length,
    average_quality: enhancedMachines.length > 0
      ? enhancedMachines.reduce((sum, m) => sum + (m.data_quality_score || 0), 0) / enhancedMachines.length
      : 0,
    total_messages: enhancedMachines.reduce((sum, m) => sum + (m.timescale_status?.message_count || 0), 0)
  }

  return {
    machines: enhancedMachines,
    summary
  }
}

/**
 * Get machine trends data from TimescaleDB
 */
async function getMachineTrends(
  timescaleClient: PostgresClient,
  machineId: string,
  timeRange: string
) {
  const interval = timeRange === '24h' ? '1 hour' : timeRange === '6h' ? '30 minutes' : '10 minutes'
  const period = timeRange === '24h' ? '24 hours' : timeRange === '6h' ? '6 hours' : '1 hour'

  const trendsQuery = `
    SELECT 
      time_bucket('${interval}', time) AS bucket,
      AVG(spindle_speed_avg) as avg_spindle_speed,
      AVG(temperature_avg) as avg_temperature,
      AVG(vibration_avg) as avg_vibration,
      AVG(pressure_avg) as avg_pressure,
      SUM(message_count) as total_messages
    FROM machine_status 
    WHERE machine_id = $1 
      AND time >= NOW() - INTERVAL '${period}'
    GROUP BY bucket 
    ORDER BY bucket DESC
  `

  const result = await timescaleClient.query(trendsQuery, [machineId])
  
  return {
    timeRange,
    interval,
    data: result.rows.map(row => ({
      timestamp: row.bucket,
      spindle_speed: row.avg_spindle_speed,
      temperature: row.avg_temperature,
      vibration: row.avg_vibration,
      pressure: row.avg_pressure,
      message_count: row.total_messages
    }))
  }
}