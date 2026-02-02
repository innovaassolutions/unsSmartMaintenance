import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/timescale-connection';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tagName = searchParams.get('tagName');
    const virtualPath = searchParams.get('virtualPath');
    const timeRange = searchParams.get('timeRange') || '1h';

    if (!tagName || !virtualPath) {
      return NextResponse.json(
        { success: false, error: 'tagName and virtualPath are required' },
        { status: 400 }
      );
    }

    // Calculate time range
    let timeFilter = '';
    switch (timeRange) {
      case '5m':
        timeFilter = "time >= NOW() - INTERVAL '5 minutes'";
        break;
      case '1h':
        timeFilter = "time >= NOW() - INTERVAL '1 hour'";
        break;
      case '24h':
        timeFilter = "time >= NOW() - INTERVAL '24 hours'";
        break;
      case '7d':
        timeFilter = "time >= NOW() - INTERVAL '7 days'";
        break;
      default:
        timeFilter = "time >= NOW() - INTERVAL '1 hour'";
    }

    // Get tag statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_records,
        MIN(time) as earliest_record,
        MAX(time) as latest_record,
        AVG(CASE WHEN value IS NOT NULL THEN value END) as avg_value,
        MIN(CASE WHEN value IS NOT NULL THEN value END) as min_value,
        MAX(CASE WHEN value IS NOT NULL THEN value END) as max_value,
        COUNT(CASE WHEN value_bool = true THEN 1 END) as true_count,
        COUNT(CASE WHEN value_bool = false THEN 1 END) as false_count
      FROM uns_data
      WHERE tag_name = $1 AND virtual_path = $2;
    `;

    // Get recent history
    const historyQuery = `
      SELECT
        time,
        value,
        value_bool,
        topic
      FROM uns_data
      WHERE tag_name = $1 AND virtual_path = $2 AND ${timeFilter}
      ORDER BY time DESC
      LIMIT 100;
    `;

    // Get time series data for chart (sampled)
    const timeSeriesQuery = `
      SELECT
        time_bucket('1 minute', time) as bucket,
        AVG(CASE WHEN value IS NOT NULL THEN value END) as avg_value,
        COUNT(*) as sample_count
      FROM uns_data
      WHERE tag_name = $1 AND virtual_path = $2 AND ${timeFilter}
      GROUP BY bucket
      ORDER BY bucket DESC
      LIMIT 60;
    `;

    const [statsResult, historyResult, timeSeriesResult] = await Promise.all([
      executeQuery(statsQuery, [tagName, virtualPath]),
      executeQuery(historyQuery, [tagName, virtualPath]),
      executeQuery(timeSeriesQuery, [tagName, virtualPath])
    ]);

    const stats = statsResult.rows[0];
    const history = historyResult.rows;
    const timeSeries = timeSeriesResult.rows;

    // Get current value (most recent)
    const currentValue = history.length > 0 ? history[0] : null;

    return NextResponse.json({
      success: true,
      tagInfo: {
        tagName,
        virtualPath,
        currentValue: currentValue ? {
          value: currentValue.value,
          valueBool: currentValue.value_bool,
          timestamp: currentValue.time,
          topic: currentValue.topic
        } : null
      },
      statistics: {
        totalRecords: parseInt(stats.total_records),
        earliestRecord: stats.earliest_record,
        latestRecord: stats.latest_record,
        avgValue: stats.avg_value ? parseFloat(stats.avg_value) : null,
        minValue: stats.min_value ? parseFloat(stats.min_value) : null,
        maxValue: stats.max_value ? parseFloat(stats.max_value) : null,
        trueCount: parseInt(stats.true_count || 0),
        falseCount: parseInt(stats.false_count || 0)
      },
      history: history.map(row => ({
        timestamp: row.time,
        value: row.value,
        valueBool: row.value_bool,
        topic: row.topic
      })),
      timeSeries: timeSeries.map(row => ({
        timestamp: row.bucket,
        avgValue: row.avg_value ? parseFloat(row.avg_value) : null,
        sampleCount: parseInt(row.sample_count)
      })),
      sqlQueries: {
        currentQuery: `SELECT * FROM uns_data WHERE tag_name = '${tagName}' AND virtual_path = '${virtualPath}' ORDER BY time DESC LIMIT 1;`,
        historyQuery: `SELECT * FROM uns_data WHERE tag_name = '${tagName}' AND virtual_path = '${virtualPath}' AND ${timeFilter} ORDER BY time DESC LIMIT 100;`,
        statsQuery: `SELECT COUNT(*) as total_records, MIN(time) as earliest_record, MAX(time) as latest_record, AVG(value) as avg_value FROM uns_data WHERE tag_name = '${tagName}' AND virtual_path = '${virtualPath}';`
      }
    });

  } catch (error) {
    console.error('Error fetching tag details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tag details' },
      { status: 500 }
    );
  }
}