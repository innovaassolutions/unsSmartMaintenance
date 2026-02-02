import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/timescale-connection';

export const dynamic = 'force-dynamic';

interface TagHistory {
  time: string;
  value: number | null;
  value_bool: boolean | null;
}

interface TagDetails {
  tagName: string;
  virtualPath: string;
  location: string;
  topic: string;
  latestValue: number | null;
  latestValueBool: boolean | null;
  latestTimestamp: string;
  source: string;
  history: TagHistory[];
  statistics: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    stddev: number | null;
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagName = searchParams.get('tagName');
    const virtualPath = searchParams.get('virtualPath');
    const machineId = searchParams.get('machineId');
    const timeRange = searchParams.get('timeRange') || '1h';

    if (!tagName || !virtualPath || !machineId) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: tagName, virtualPath, machineId' },
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

    // Query for latest value and basic info
    const latestQuery = `
      SELECT
        time,
        topic,
        tag_name,
        value,
        value_bool,
        location,
        virtual_path,
        source
      FROM uns_data
      WHERE tag_name = $1
        AND virtual_path = $2
        AND location LIKE $3
      ORDER BY time DESC
      LIMIT 1;
    `;

    // Query for historical data
    const historyQuery = `
      SELECT
        time,
        value,
        value_bool
      FROM uns_data
      WHERE tag_name = $1
        AND virtual_path = $2
        AND location LIKE $3
        AND time > NOW() - INTERVAL '${interval}'
      ORDER BY time DESC
      LIMIT 1000;
    `;

    // Query for statistics (only for numeric values)
    const statsQuery = `
      SELECT
        COUNT(*) as count,
        MIN(value) as min,
        MAX(value) as max,
        AVG(value) as avg,
        STDDEV(value) as stddev
      FROM uns_data
      WHERE tag_name = $1
        AND virtual_path = $2
        AND location LIKE $3
        AND time > NOW() - INTERVAL '${interval}'
        AND value IS NOT NULL;
    `;

    const locationPattern = `%${machineId}%`;
    const params = [tagName, virtualPath, locationPattern];

    const [latestResult, historyResult, statsResult] = await Promise.all([
      executeQuery(latestQuery, params),
      executeQuery(historyQuery, params),
      executeQuery(statsQuery, params),
    ]);

    if (latestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tag not found' },
        { status: 404 }
      );
    }

    const latest = latestResult.rows[0];
    const history: TagHistory[] = historyResult.rows.map(row => ({
      time: row.time,
      value: row.value,
      value_bool: row.value_bool,
    }));

    const stats = statsResult.rows[0];

    const tagDetails: TagDetails = {
      tagName: latest.tag_name,
      virtualPath: latest.virtual_path,
      location: latest.location,
      topic: latest.topic,
      latestValue: latest.value,
      latestValueBool: latest.value_bool,
      latestTimestamp: latest.time,
      source: latest.source,
      history,
      statistics: {
        count: parseInt(stats.count),
        min: stats.min,
        max: stats.max,
        avg: stats.avg,
        stddev: stats.stddev,
      },
    };

    return NextResponse.json({
      success: true,
      data: tagDetails,
    });
  } catch (error) {
    console.error('Error fetching tag details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tag details' },
      { status: 500 }
    );
  }
}