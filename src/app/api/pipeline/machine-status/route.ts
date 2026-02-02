/**
 * Machine Status API Endpoint
 * Provides current status and connectivity information for CNC machines
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic';

// Initialize Supabase client
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _supabase;
}
/**
 * GET /api/pipeline/machine-status
 * Get current status of all machines or specific machine
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const machineId = searchParams.get('machineId')
    const includeMetrics = searchParams.get('includeMetrics') === 'true'

    if (machineId) {
      // Get specific machine status
      const { data: machine, error } = await supabase
        .from('machine_current_status')
        .select('*')
        .eq('machine_id', machineId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Machine not found' },
            { status: 404 }
          )
        }
        console.error('Machine status query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch machine status' },
          { status: 500 }
        )
      }

      let additionalData = {}
      
      if (includeMetrics) {
        // Get recent sensor readings for this machine
        const { data: recentReadings } = await supabase
          .from('sensor_readings')
          .select('sensor_type, value_numeric, timestamp, quality_code')
          .eq('machine_id', machine.id)
          .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
          .order('timestamp', { ascending: false })
          .limit(50)

        // Get validation errors for this machine
        const { data: recentErrors } = await supabase
          .from('data_validation_errors')
          .select('error_type, error_message, attempted_at')
          .eq('machine_id', machine.id)
          .gte('attempted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
          .order('attempted_at', { ascending: false })
          .limit(10)

        additionalData = {
          recentReadings: recentReadings || [],
          recentErrors: recentErrors || [],
          sensorSummary: this.summarizeSensorData(recentReadings || [])
        }
      }

      return NextResponse.json({
        machine: {
          ...machine,
          ...additionalData
        },
        timestamp: new Date().toISOString()
      })

    } else {
      // Get all machines status
      const { data: machines, error } = await supabase
        .from('machine_current_status')
        .select('*')
        .order('display_name')

      if (error) {
        console.error('Machines status query error:', error)
        return NextResponse.json(
          { error: 'Failed to fetch machines status' },
          { status: 500 }
        )
      }

      // Calculate summary statistics
      const summary = {
        total: machines?.length || 0,
        connected: machines?.filter(m => m.pipeline_status === 'connected').length || 0,
        active: machines?.filter(m => m.recent_readings_count > 0).length || 0,
        offline: machines?.filter(m => m.pipeline_status === 'disconnected' || m.pipeline_status === 'error').length || 0,
        averageQuality: machines?.length > 0
          ? machines.reduce((sum, m) => sum + (m.data_quality_score || 0), 0) / machines.length
          : 0
      }

      return NextResponse.json({
        machines: machines || [],
        summary,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('Machine status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pipeline/machine-status
 * Update machine status (for pipeline integration)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      machineId,
      pipelineStatus,
      dataQualityScore,
      totalMessagesReceived,
      lastDataReceived
    } = body

    // Validate required fields
    if (!machineId) {
      return NextResponse.json(
        { error: 'machineId is required' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (pipelineStatus !== undefined) {
      updateData.pipeline_status = pipelineStatus
    }

    if (dataQualityScore !== undefined) {
      updateData.data_quality_score = dataQualityScore
    }

    if (totalMessagesReceived !== undefined) {
      updateData.total_messages_received = totalMessagesReceived
    }

    if (lastDataReceived !== undefined) {
      updateData.last_data_received = lastDataReceived
    }

    // Update machine status
    const { data, error } = await supabase
      .from('cnc_machines')
      .update(updateData)
      .eq('id', machineId)
      .select('id, machine_id, display_name, pipeline_status, data_quality_score')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Machine not found' },
          { status: 404 }
        )
      }
      console.error('Machine status update error:', error)
      return NextResponse.json(
        { error: 'Failed to update machine status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Machine status updated successfully',
      machine: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Machine status update API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to summarize sensor data
 */
function summarizeSensorData(readings: any[]) {
  if (readings.length === 0) return null

  const sensorTypes = [...new Set(readings.map(r => r.sensor_type))]
  const summary: Record<string, any> = {}

  sensorTypes.forEach(sensorType => {
    const sensorReadings = readings.filter(r => r.sensor_type === sensorType)
    const numericReadings = sensorReadings.filter(r => r.value_numeric !== null)

    if (numericReadings.length > 0) {
      const values = numericReadings.map(r => r.value_numeric)
      summary[sensorType] = {
        count: numericReadings.length,
        latest: numericReadings[0]?.value_numeric,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        lastTimestamp: numericReadings[0]?.timestamp,
        avgQuality: numericReadings.reduce((sum, r) => sum + r.quality_code, 0) / numericReadings.length
      }
    }
  })

  return summary
}