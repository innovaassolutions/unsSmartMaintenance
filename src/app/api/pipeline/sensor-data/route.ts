/**
 * Sensor Data Query API Endpoint
 * Provides access to historical sensor data with aggregation support
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET /api/pipeline/sensor-data
 * Query historical sensor data with filtering and aggregation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Parse query parameters
    const machineId = searchParams.get('machineId')
    const sensorType = searchParams.get('sensorType')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const aggregation = searchParams.get('aggregation') // 'hourly', 'daily', 'raw'

    // Validate parameters
    if (limit > 10000) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 10,000 records' },
        { status: 400 }
      )
    }

    // Build base query
    let query = supabase
      .from('sensor_readings')
      .select(`
        id,
        machine_id,
        sensor_type,
        topic_path,
        value_numeric,
        value_text,
        value_boolean,
        unit,
        timestamp,
        quality_code,
        cnc_machines!inner(
          machine_id,
          display_name,
          manufacturer,
          model
        )
      `)

    // Apply filters
    if (machineId) {
      query = query.eq('machine_id', machineId)
    }

    if (sensorType) {
      query = query.eq('sensor_type', sensorType)
    }

    if (startTime) {
      query = query.gte('timestamp', startTime)
    }

    if (endTime) {
      query = query.lte('timestamp', endTime)
    }

    // Handle aggregation
    if (aggregation === 'hourly' || aggregation === 'daily') {
      // Use database view for aggregated data
      const aggregationView = aggregation === 'hourly' 
        ? 'sensor_hourly_aggregates' 
        : 'sensor_daily_aggregates'

      let aggQuery = supabase
        .from(aggregationView)
        .select('*')

      if (machineId) aggQuery = aggQuery.eq('machine_id', machineId)
      if (sensorType) aggQuery = aggQuery.eq('sensor_type', sensorType)
      if (startTime) aggQuery = aggQuery.gte('hour', startTime)
      if (endTime) aggQuery = aggQuery.lte('hour', endTime)

      const { data: aggData, error: aggError } = await aggQuery
        .order(aggregation === 'hourly' ? 'hour' : 'day', { ascending: false })
        .range(offset, offset + limit - 1)

      if (aggError) {
        console.error('Aggregated sensor data query error:', aggError)
        return NextResponse.json(
          { error: 'Failed to fetch aggregated sensor data' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: aggData || [],
        pagination: {
          limit,
          offset,
          total: aggData?.length || 0
        },
        aggregation,
        timestamp: new Date().toISOString()
      })
    }

    // Execute raw data query
    const { data, error, count } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Sensor data query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sensor data' },
        { status: 500 }
      )
    }

    // Calculate basic statistics for the current dataset
    const numericData = data?.filter(d => d.value_numeric !== null) || []
    const statistics = numericData.length > 0 ? {
      count: numericData.length,
      min: Math.min(...numericData.map(d => d.value_numeric)),
      max: Math.max(...numericData.map(d => d.value_numeric)),
      avg: numericData.reduce((sum, d) => sum + d.value_numeric, 0) / numericData.length,
      latest: data?.[0]?.timestamp,
      oldest: data?.[data.length - 1]?.timestamp
    } : null

    return NextResponse.json({
      data: data || [],
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      },
      statistics,
      filters: {
        machineId,
        sensorType,
        startTime,
        endTime
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Sensor data API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pipeline/sensor-data/query
 * Advanced sensor data queries with complex filters
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      machineIds = [],
      sensorTypes = [],
      timeRange,
      qualityFilter,
      valueRange,
      aggregation,
      groupBy,
      limit = 100,
      offset = 0
    } = body

    // Validate request
    if (limit > 10000) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 10,000 records' },
        { status: 400 }
      )
    }

    // Build complex query
    let query = supabase
      .from('sensor_readings')
      .select(`
        id,
        machine_id,
        sensor_type,
        topic_path,
        value_numeric,
        value_text,
        value_boolean,
        unit,
        timestamp,
        quality_code,
        cnc_machines!inner(
          machine_id,
          display_name,
          manufacturer,
          model,
          enterprise,
          site,
          area,
          work_cell
        )
      `)

    // Apply filters
    if (machineIds.length > 0) {
      query = query.in('machine_id', machineIds)
    }

    if (sensorTypes.length > 0) {
      query = query.in('sensor_type', sensorTypes)
    }

    if (timeRange?.start) {
      query = query.gte('timestamp', timeRange.start)
    }

    if (timeRange?.end) {
      query = query.lte('timestamp', timeRange.end)
    }

    if (qualityFilter?.min !== undefined) {
      query = query.gte('quality_code', qualityFilter.min)
    }

    if (qualityFilter?.max !== undefined) {
      query = query.lte('quality_code', qualityFilter.max)
    }

    if (valueRange?.min !== undefined) {
      query = query.gte('value_numeric', valueRange.min)
    }

    if (valueRange?.max !== undefined) {
      query = query.lte('value_numeric', valueRange.max)
    }

    const { data, error, count } = await query
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Advanced sensor data query error:', error)
      return NextResponse.json(
        { error: 'Failed to execute advanced query' },
        { status: 500 }
      )
    }

    // Apply grouping if requested
    let processedData = data || []
    if (groupBy && processedData.length > 0) {
      const grouped = processedData.reduce((acc, item) => {
        let key: string
        switch (groupBy) {
          case 'machine':
            key = item.cnc_machines.machine_id
            break
          case 'sensor_type':
            key = item.sensor_type
            break
          case 'hour':
            key = new Date(item.timestamp).toISOString().substring(0, 13) + ':00:00'
            break
          default:
            key = 'all'
        }

        if (!acc[key]) {
          acc[key] = []
        }
        acc[key].push(item)
        return acc
      }, {} as Record<string, any[]>)

      processedData = Object.entries(grouped).map(([key, items]) => ({
        group: key,
        count: items.length,
        items: aggregation ? this.aggregateItems(items) : items
      }))
    }

    return NextResponse.json({
      data: processedData,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (count || 0) > offset + limit
      },
      query: {
        machineIds,
        sensorTypes,
        timeRange,
        qualityFilter,
        valueRange,
        aggregation,
        groupBy
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Advanced sensor data query error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to aggregate items
 */
function aggregateItems(items: any[]) {
  const numericItems = items.filter(item => item.value_numeric !== null)
  
  if (numericItems.length === 0) return null

  return {
    count: numericItems.length,
    min: Math.min(...numericItems.map(item => item.value_numeric)),
    max: Math.max(...numericItems.map(item => item.value_numeric)),
    avg: numericItems.reduce((sum, item) => sum + item.value_numeric, 0) / numericItems.length,
    sum: numericItems.reduce((sum, item) => sum + item.value_numeric, 0),
    first_timestamp: items[items.length - 1]?.timestamp,
    last_timestamp: items[0]?.timestamp
  }
}