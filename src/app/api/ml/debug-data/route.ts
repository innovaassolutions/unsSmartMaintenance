import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export async function GET(request: NextRequest) {
  console.log('🔍 Debug API: Checking BigQuery data availability');
  
  try {
    const bigQuery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    // Check total data
    const totalQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT machine_id) as unique_machines,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.relay_manufacturing.sensor_readings\`
    `;

    console.log('📊 Running total data query...');
    const [totalRows] = await bigQuery.query(totalQuery);
    
    // Check recent data (last 7 days)
    const recentQuery = `
      SELECT 
        machine_id,
        COUNT(*) as record_count,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest,
        AVG(value) as avg_value
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.relay_manufacturing.sensor_readings\`
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
      GROUP BY machine_id
      ORDER BY record_count DESC
      LIMIT 10
    `;

    console.log('📊 Running recent data query...');
    const [recentRows] = await bigQuery.query(recentQuery);

    // Check welder-related data specifically
    const welderQuery = `
      SELECT 
        machine_id,
        sensor_type,
        COUNT(*) as record_count,
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest,
        AVG(value) as avg_value
      FROM \`${process.env.GOOGLE_CLOUD_PROJECT}.relay_manufacturing.sensor_readings\`
      WHERE (LOWER(machine_id) LIKE '%contact%' 
         OR LOWER(machine_id) LIKE '%weld%' 
         OR LOWER(machine_id) LIKE '%resistance%'
         OR machine_id IN ('contact_resistance', 'weld_current', 'weld_voltage', 'mold_temperature'))
      GROUP BY machine_id, sensor_type
      ORDER BY record_count DESC
      LIMIT 20
    `;

    console.log('📊 Running welder-specific query...');
    const [welderRows] = await bigQuery.query(welderQuery);

    return NextResponse.json({
      success: true,
      debug_info: {
        total_data: totalRows[0],
        recent_data_by_machine: recentRows,
        welder_related_data: welderRows,
        query_timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Debug API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}