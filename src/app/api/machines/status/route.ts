/**
 * Machine Status API Endpoint
 * Provides real-time machine health and status information
 */

import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, type MachineDefinition } from '@/lib/database/timescale-connection'

/**
 * GET /api/machines/status
 * Get current status for all machines or specific machine
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const machineId = searchParams.get('machineId')
    const includeAlerts = searchParams.get('includeAlerts') === 'true'

    // Query machine definitions table
    let sqlQuery = `
      SELECT *
      FROM machine_definitions
    `
    const params: any[] = []

    if (machineId) {
      sqlQuery += ` WHERE machine_id = $1`
      params.push(machineId)
    }

    sqlQuery += ` ORDER BY machine_id`

    const machineResult = await executeQuery(sqlQuery, params)
    const machines = machineResult.rows || []

    // Include active alerts if requested
    let alerts = []
    if (includeAlerts) {
      const alertsQuery = `
        SELECT
          id,
          machine_id,
          alert_type,
          severity,
          message,
          current_value,
          threshold_value,
          created_at,
          status
        FROM maintenance_alerts_active
        ORDER BY severity DESC, created_at DESC
      `
      const alertsResult = await executeQuery(alertsQuery)
      alerts = alertsResult.rows || []
    }

    // Combine data
    const machinesWithAlerts = machines.map(machine => ({
      ...machine,
      alerts: includeAlerts
        ? alerts.filter(alert => alert.machine_id === machine.machine_id)
        : undefined
    }))

    return NextResponse.json({
      machines: machinesWithAlerts,
      summary: {
        total_machines: machines.length,
        active_machines: machines.filter(m => m.status === 'active').length,
        inactive_machines: machines.filter(m => m.status === 'inactive').length,
        maintenance_machines: machines.filter(m => m.status === 'maintenance').length,
        machines_with_alerts: includeAlerts
          ? machines.filter(m => alerts.some(a => a.machine_id === m.machine_id)).length
          : undefined
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Machine status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch machine status' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/machines/status/[machineId]
 * Get detailed status for specific machine
 */
export async function getMachineDetails(machineId: string) {
  try {
    // Get machine definition
    const machineQuery = `
      SELECT
        id,
        machine_id,
        name,
        type,
        location,
        status,
        metadata
      FROM machine_definitions
      WHERE machine_id = $1
    `
    const machineResult = await executeQuery<MachineDefinition>(machineQuery, [machineId])
    const machine = machineResult.rows[0]

    if (!machine) {
      return NextResponse.json(
        { error: 'Machine not found' },
        { status: 404 }
      )
    }

    // Get latest sensor readings
    const sensorsQuery = `
      SELECT DISTINCT ON (tag_name)
        time,
        tag_name,
        value,
        value_bool
      FROM uns_data
      WHERE location LIKE $1
      ORDER BY tag_name, time DESC
      LIMIT 50
    `
    const sensorsResult = await executeQuery(sensorsQuery, [`%${machineId}%`])
    const sensors = sensorsResult.rows || []

    // Get recent alerts
    const alertsQuery = `
      SELECT
        id,
        alert_type,
        severity,
        message,
        current_value,
        threshold_value,
        status,
        created_at,
        resolved_at,
        assigned_to
      FROM maintenance_alerts
      WHERE machine_id = $1
      ORDER BY created_at DESC
      LIMIT 10
    `
    const alertsResult = await executeQuery(alertsQuery, [machineId])
    const alerts = alertsResult.rows || []

    // Calculate machine health metrics
    const temperatureSensors = sensors.filter(s => s.tag_name.toLowerCase().includes('temperature'))
    const vibrationSensors = sensors.filter(s => s.tag_name.toLowerCase().includes('vibration'))
    const productionSensors = sensors.filter(s => s.tag_name.toLowerCase().includes('efficiency'))

    const healthMetrics = {
      temperature: {
        current: temperatureSensors.length > 0 ? temperatureSensors[0].value : null,
        status: temperatureSensors.length > 0 && temperatureSensors[0].value > 80 ? 'warning' : 'normal'
      },
      vibration: {
        max: vibrationSensors.length > 0 ? Math.max(...vibrationSensors.map(v => v.value || 0)) : null,
        status: vibrationSensors.some(v => (v.value || 0) > 5) ? 'warning' : 'normal'
      },
      production: {
        efficiency: productionSensors.length > 0 ? productionSensors[0].value : null,
        status: productionSensors.length > 0 && productionSensors[0].value < 75 ? 'warning' : 'normal'
      }
    }

    return NextResponse.json({
      machine,
      sensors,
      alerts,
      healthMetrics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Machine details API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch machine details' },
      { status: 500 }
    )
  }
}