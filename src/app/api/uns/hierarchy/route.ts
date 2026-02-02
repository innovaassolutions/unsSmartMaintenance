import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/timescale-connection';

interface UNSTag {
  tagName: string;
  value: number | null;
  valueBool: boolean | null;
  timestamp: string;
  topic: string;
  source: string;
  location: string;
  virtualPath: string;
}

interface UNSMachine {
  machineId: string;
  name: string;
  location: string;
  virtualPaths: Record<string, UNSTag[]>;
  tagCount: number;
  lastUpdate: string;
}

interface UNSHierarchy {
  enterprise: string;
  site: string;
  area: string;
  line: string;
  machines: Record<string, UNSMachine>;
  metadata: {
    totalRecords: number;
    totalMachines: number;
    timeRange: string;
    lastUpdate: string;
  };
}

function parseLocationPath(location: string): {
  enterprise: string;
  site: string;
  area: string;
  line: string;
  workCell: string;
} {
  // Parse location path: fcl-plant.relay-line-1.assembly-hall-a.line-1.cw-l1-01
  const parts = location.split('.');

  if (parts.length >= 5) {
    return {
      enterprise: parts[0],
      site: parts[1],
      area: parts[2],
      line: parts[3],
      workCell: parts[4],
    };
  }

  // Handle shorter location paths (fallback)
  return {
    enterprise: parts[0] || 'fcl-plant',
    site: parts[1] || 'relay-line-1',
    area: parts[2] || 'assembly-hall-a',
    line: parts[3] || 'line-1',
    workCell: parts[4] || parts[parts.length - 1] || 'unknown',
  };
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '10m'; // default 10 minutes for real-time
    const machineFilter = searchParams.get('machine'); // optional machine filter

    // Convert time range to PostgreSQL interval
    const intervalMap: Record<string, string> = {
      '1m': '1 minute',
      '5m': '5 minutes',
      '10m': '10 minutes',
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
    };

    const interval = intervalMap[timeRange] || '10 minutes';

    // Query to get latest values for each tag, organized by machine and virtual path
    let query = `
      WITH latest_values AS (
        SELECT DISTINCT ON (virtual_path, tag_name)
          time,
          topic,
          tag_name,
          value,
          value_bool,
          virtual_path,
          source
        FROM uns_data
        WHERE time > NOW() - INTERVAL '${interval}'
    `;

    if (machineFilter) {
      query += ` AND virtual_path LIKE '%${machineFilter}%'`;
    }

    query += `
        ORDER BY virtual_path, tag_name, time DESC
      )
      SELECT * FROM latest_values
      ORDER BY virtual_path, tag_name;
    `;

    const result = await executeQuery(query);

    // Use default hierarchy structure based on the known data structure
    const hierarchyStructure = {
      enterprise: 'fcl-components',
      site: 'johor-relay-plant',
      area: 'assembly-hall-a',
      line: 'line-1',
    };

    // Organize data by virtual path (which contains machine information)
    const virtualPaths: Record<string, UNSTag[]> = {};

    result.rows.forEach((row) => {
      if (!virtualPaths[row.virtual_path]) {
        virtualPaths[row.virtual_path] = [];
      }

      virtualPaths[row.virtual_path].push({
        tagName: row.tag_name,
        value: row.value,
        valueBool: row.value_bool,
        timestamp: row.time,
        topic: row.topic,
        source: row.source,
        location: row.virtual_path, // Use virtual_path as location for now
        virtualPath: row.virtual_path,
      });
    });

    // Create a simple machine structure from virtual paths
    const machines: Record<string, UNSMachine> = {};

    // Group virtual paths that belong to the same machine
    Object.entries(virtualPaths).forEach(([virtualPath, tags]) => {
      // Extract machine ID from virtual path (e.g., fcl-components.johor-relay-plant.assembly-hall-a.line-1.CW-L1-01)
      const pathParts = virtualPath.split('.');
      const machineId = pathParts[pathParts.length - 1] || 'unknown';

      if (!machines[machineId]) {
        machines[machineId] = {
          machineId,
          name: getMachineDisplayName(machineId),
          location: virtualPath,
          virtualPaths: {},
          tagCount: 0,
          lastUpdate: tags[0]?.timestamp || new Date().toISOString(),
        };
      }

      // Organize tags by their virtual path type (sensors, vibration, etc.)
      const virtualPathType = virtualPath.includes('sensors') ? 'sensors' :
                            virtualPath.includes('vibration') ? 'vibration' :
                            virtualPath.includes('production') ? 'production' :
                            virtualPath.includes('process') ? 'process' : 'other';

      if (!machines[machineId].virtualPaths[virtualPathType]) {
        machines[machineId].virtualPaths[virtualPathType] = [];
      }

      machines[machineId].virtualPaths[virtualPathType].push(...tags);
      machines[machineId].tagCount += tags.length;

      // Update last update time
      tags.forEach(tag => {
        if (new Date(tag.timestamp) > new Date(machines[machineId].lastUpdate)) {
          machines[machineId].lastUpdate = tag.timestamp;
        }
      });
    });

    const hierarchy: UNSHierarchy = {
      ...hierarchyStructure,
      machines,
      metadata: {
        totalRecords: result.rows.length,
        totalMachines: Object.keys(machines).length,
        timeRange: timeRange,
        lastUpdate: new Date().toISOString(),
      },
    };

    return NextResponse.json({
      success: true,
      data: hierarchy,
    });
  } catch (error) {
    console.error('Error fetching UNS hierarchy:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UNS data' },
      { status: 500 }
    );
  }
}