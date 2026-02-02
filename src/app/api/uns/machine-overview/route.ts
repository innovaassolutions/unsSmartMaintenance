import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/timescale-connection';

interface MachineOverview {
  machineId: string;
  name: string;
  location: string;
  virtualPaths: Record<string, number>;
  totalTags: number;
  lastUpdate: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
  dataQuality: number;
  recentAlerts: any[];
  topTags: Array<{
    tagName: string;
    virtualPath: string;
    value: number | null;
    valueBool: boolean | null;
    timestamp: string;
  }>;
}

function getMachineDisplayName(machineId: string): string {
  const machineNames: Record<string, string> = {
    'cw-l1-01': 'Contact Welder L1-01',
    'wind-l1-01': 'Coil Winder L1-01',
    'press-l1-01': 'Assembly Press L1-01',
    'insert-l1-01': 'Terminal Inserter L1-01',
    'mold-l1-01': 'Injection Molder L1-01',
    'test-l1-01': 'Final Tester L1-01',
  };

  return machineNames[machineId] || machineId.toUpperCase();
}

function determineHealthStatus(
  recentDataPoints: number,
  expectedDataPoints: number,
  dataQuality: number
): 'healthy' | 'warning' | 'critical' {
  const dataRatio = recentDataPoints / Math.max(expectedDataPoints, 1);

  if (dataRatio >= 0.95 && dataQuality >= 0.95) {
    return 'healthy';
  } else if (dataRatio >= 0.8 && dataQuality >= 0.8) {
    return 'warning';
  } else {
    return 'critical';
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');
    const timeRange = searchParams.get('timeRange') || '1h';

    if (!machineId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: machineId' },
        { status: 400 }
      );
    }

    // Convert time range to PostgreSQL interval
    const intervalMap: Record<string, string> = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
    };

    const interval = intervalMap[timeRange] || '1 hour';

    // Query for machine overview data
    const overviewQuery = `
      SELECT
        location,
        virtual_path,
        tag_name,
        COUNT(*) as data_points,
        MAX(time) as last_update,
        COUNT(DISTINCT tag_name) as unique_tags
      FROM uns_data
      WHERE location LIKE $1
        AND time > NOW() - INTERVAL '${interval}'
        AND virtual_path != '_raw'
      GROUP BY location, virtual_path, tag_name
      ORDER BY virtual_path, tag_name;
    `;

    // Query for recent top tags with current values
    const topTagsQuery = `
      WITH latest_values AS (
        SELECT DISTINCT ON (tag_name, virtual_path)
          tag_name,
          virtual_path,
          value,
          value_bool,
          time,
          location
        FROM uns_data
        WHERE location LIKE $1
          AND virtual_path != '_raw'
        ORDER BY tag_name, virtual_path, time DESC
      )
      SELECT * FROM latest_values
      ORDER BY time DESC
      LIMIT 20;
    `;

    const locationPattern = `%${machineId}%`;
    const params = [locationPattern];

    const [overviewResult, topTagsResult] = await Promise.all([
      executeQuery(overviewQuery, params),
      executeQuery(topTagsQuery, params),
    ]);

    if (overviewResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // Process overview data
    const virtualPaths: Record<string, number> = {};
    let totalTags = 0;
    let lastUpdate = '';
    let location = '';
    let totalDataPoints = 0;

    overviewResult.rows.forEach(row => {
      if (!virtualPaths[row.virtual_path]) {
        virtualPaths[row.virtual_path] = 0;
      }
      virtualPaths[row.virtual_path] += parseInt(row.data_points);
      totalTags += parseInt(row.unique_tags);
      totalDataPoints += parseInt(row.data_points);

      if (!location) {
        location = row.location;
      }

      if (!lastUpdate || new Date(row.last_update) > new Date(lastUpdate)) {
        lastUpdate = row.last_update;
      }
    });

    // Process top tags
    const topTags = topTagsResult.rows.map(row => ({
      tagName: row.tag_name,
      virtualPath: row.virtual_path,
      value: row.value,
      valueBool: row.value_bool,
      timestamp: row.time,
    }));

    // Calculate data quality (simplified - based on recent data availability)
    const now = new Date();
    const lastUpdateTime = new Date(lastUpdate);
    const timeDiffMinutes = (now.getTime() - lastUpdateTime.getTime()) / (1000 * 60);
    const dataQuality = Math.max(0, Math.min(1, 1 - (timeDiffMinutes / 30))); // Quality decreases after 30 minutes

    // Determine health status
    const expectedDataPointsPerHour = totalTags * 60; // Assuming 1-minute intervals
    const actualDataPointsLastHour = totalDataPoints;
    const healthStatus = determineHealthStatus(
      actualDataPointsLastHour,
      expectedDataPointsPerHour,
      dataQuality
    );

    const machineOverview: MachineOverview = {
      machineId,
      name: getMachineDisplayName(machineId),
      location,
      virtualPaths,
      totalTags,
      lastUpdate,
      healthStatus,
      dataQuality: Math.round(dataQuality * 100) / 100,
      recentAlerts: [], // Placeholder for future alert implementation
      topTags,
    };

    return NextResponse.json({
      success: true,
      data: machineOverview,
    });
  } catch (error) {
    console.error('Error fetching machine overview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch machine overview' },
      { status: 500 }
    );
  }
}