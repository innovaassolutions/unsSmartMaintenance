import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/timescale-connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get overall statistics
    const statsQuery = `
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT tag_name) as unique_tags,
        COUNT(DISTINCT virtual_path) as virtual_paths,
        MIN(time) as earliest_record,
        MAX(time) as latest_record,
        pg_size_pretty(pg_total_relation_size('uns_data')) as table_size
      FROM uns_data;
    `;

    const tagCountsQuery = `
      SELECT
        virtual_path,
        tag_name,
        COUNT(*) as record_count,
        MAX(time) as last_update
      FROM uns_data
      GROUP BY virtual_path, tag_name
      ORDER BY virtual_path, tag_name;
    `;

    const [statsResult, tagCountsResult] = await Promise.all([
      executeQuery(statsQuery),
      executeQuery(tagCountsQuery),
    ]);

    return NextResponse.json({
      success: true,
      statistics: statsResult.rows[0],
      tagCounts: tagCountsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}