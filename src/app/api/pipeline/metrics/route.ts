/**
 * Pipeline Metrics API Endpoint
 * Provides access to pipeline performance metrics and error logs
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
 * GET /api/pipeline/metrics
 * Get pipeline performance metrics and statistics
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const timeRange = searchParams.get('timeRange') || '1h' // 1h, 24h, 7d, 30d
    const metricType = searchParams.get('metricType')
    const includeErrors = searchParams.get('includeErrors') === 'true'

    // Calculate time range
    const now = new Date()
    let startTime: Date

    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
    }

    // Build metrics query
    let metricsQuery = supabase
      .from('pipeline_metrics')
      .select('*')
      .gte('timestamp', startTime.toISOString())
      .order('timestamp', { ascending: false })

    if (metricType) {
      metricsQuery = metricsQuery.eq('metric_type', metricType)
    }

    const { data: metrics, error: metricsError } = await metricsQuery

    if (metricsError) {
      console.error('Pipeline metrics query error:', metricsError)
      return NextResponse.json(
        { error: 'Failed to fetch pipeline metrics' },
        { status: 500 }
      )
    }

    // Get data quality summary
    const { data: qualityData, error: qualityError } = await supabase
      .from('data_quality_summary')
      .select('*')

    if (qualityError) {
      console.warn('Data quality query error:', qualityError)
    }

    // Get validation errors if requested
    let validationErrors = null
    if (includeErrors) {
      const { data: errors, error: errorsError } = await supabase
        .from('data_validation_errors')
        .select(`
          id,
          machine_id,
          topic_path,
          error_type,
          error_message,
          attempted_at,
          cnc_machines(machine_id, display_name)
        `)
        .gte('attempted_at', startTime.toISOString())
        .order('attempted_at', { ascending: false })
        .limit(100)

      if (!errorsError) {
        validationErrors = errors
      }
    }

    // Calculate aggregated metrics
    const aggregatedMetrics = this.aggregateMetrics(metrics || [])
    const qualitySummary = this.aggregateQualityData(qualityData || [])

    // Get pipeline health summary
    const { data: healthData, error: healthError } = await supabase
      .from('pipeline_health_summary')
      .select('*')
      .single()

    const response: any = {
      timeRange,
      startTime: startTime.toISOString(),
      endTime: now.toISOString(),
      metrics: {
        aggregated: aggregatedMetrics,
        detailed: metrics || []
      },
      dataQuality: qualitySummary,
      health: healthData || null,
      timestamp: new Date().toISOString()
    }

    if (includeErrors) {
      response.validationErrors = {
        total: validationErrors?.length || 0,
        errors: validationErrors || [],
        errorTypes: this.summarizeErrorTypes(validationErrors || [])
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Pipeline metrics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pipeline/metrics
 * Record custom pipeline metrics
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      metricType,
      metricName,
      value,
      unit,
      tags,
      timestamp
    } = body

    // Validate required fields
    if (!metricType || !metricName || value === undefined) {
      return NextResponse.json(
        { error: 'metricType, metricName, and value are required' },
        { status: 400 }
      )
    }

    // Insert metric
    const { data, error } = await supabase
      .from('pipeline_metrics')
      .insert({
        metric_type: metricType,
        metric_name: metricName,
        value: parseFloat(value),
        unit: unit || null,
        tags: tags || null,
        timestamp: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Pipeline metric insert error:', error)
      return NextResponse.json(
        { error: 'Failed to record metric' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Metric recorded successfully',
      metric: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Pipeline metrics record API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to aggregate metrics
 */
function aggregateMetrics(metrics: any[]) {
  if (metrics.length === 0) return null

  const metricsByType: Record<string, any[]> = {}
  metrics.forEach(metric => {
    if (!metricsByType[metric.metric_type]) {
      metricsByType[metric.metric_type] = []
    }
    metricsByType[metric.metric_type].push(metric)
  })

  const aggregated: Record<string, any> = {}

  Object.entries(metricsByType).forEach(([type, typeMetrics]) => {
    const metricsByName: Record<string, any[]> = {}
    typeMetrics.forEach(metric => {
      if (!metricsByName[metric.metric_name]) {
        metricsByName[metric.metric_name] = []
      }
      metricsByName[metric.metric_name].push(metric)
    })

    aggregated[type] = {}

    Object.entries(metricsByName).forEach(([name, nameMetrics]) => {
      const values = nameMetrics.map(m => m.value)
      aggregated[type][name] = {
        count: values.length,
        latest: values[0],
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, v) => sum + v, 0) / values.length,
        sum: values.reduce((sum, v) => sum + v, 0),
        unit: nameMetrics[0]?.unit,
        lastTimestamp: nameMetrics[0]?.timestamp
      }
    })
  })

  return aggregated
}

/**
 * Helper function to aggregate quality data
 */
function aggregateQualityData(qualityData: any[]) {
  if (qualityData.length === 0) return null

  const totalReadings = qualityData.reduce((sum, q) => sum + (q.total_readings_last_24h || 0), 0)
  const goodReadings = qualityData.reduce((sum, q) => sum + (q.good_quality_readings || 0), 0)
  const validationErrors = qualityData.reduce((sum, q) => sum + (q.validation_errors_24h || 0), 0)

  return {
    overallQuality: totalReadings > 0 ? (goodReadings / totalReadings) * 100 : 0,
    totalReadings,
    goodReadings,
    poorReadings: totalReadings - goodReadings,
    validationErrors,
    machineCount: qualityData.length,
    averageQualityPerMachine: qualityData.length > 0
      ? qualityData.reduce((sum, q) => sum + (q.quality_percentage || 0), 0) / qualityData.length
      : 0,
    machines: qualityData.map(q => ({
      machineId: q.machine_id,
      displayName: q.display_name,
      qualityPercentage: q.quality_percentage,
      totalReadings: q.total_readings_last_24h,
      lastReading: q.last_reading_time,
      validationErrors: q.validation_errors_24h
    }))
  }
}

/**
 * Helper function to summarize error types
 */
function summarizeErrorTypes(errors: any[]) {
  const errorTypes: Record<string, number> = {}
  
  errors.forEach(error => {
    errorTypes[error.error_type] = (errorTypes[error.error_type] || 0) + 1
  })

  return Object.entries(errorTypes)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({ type, count }))
}