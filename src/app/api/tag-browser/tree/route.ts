import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/database/timescale-connection';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const query = `
      WITH latest_values AS (
        SELECT DISTINCT ON (tag_name, virtual_path)
          tag_name,
          virtual_path,
          value,
          value_bool,
          time as last_update,
          topic
        FROM uns_data
        ORDER BY tag_name, virtual_path, time DESC
      ),
      tag_counts AS (
        SELECT
          virtual_path,
          tag_name,
          COUNT(*) as count
        FROM uns_data
        GROUP BY virtual_path, tag_name
      )
      SELECT
        lv.virtual_path,
        lv.tag_name,
        lv.value,
        lv.value_bool,
        lv.last_update,
        lv.topic,
        tc.count
      FROM latest_values lv
      JOIN tag_counts tc ON lv.virtual_path = tc.virtual_path AND lv.tag_name = tc.tag_name
      ORDER BY lv.virtual_path, lv.tag_name;
    `;

    const result = await executeQuery(query);

    // Build hierarchical tree structure
    const tree: any = {};

    result.rows.forEach((row: any) => {
      // Parse the virtual path to build hierarchy
      // Example: fcl-components.johor-relay-plant.assembly-hall-a.line-1.CW-L1-01
      const pathParts = row.virtual_path.split('.');
      const [enterprise, site, area, line, workCell] = pathParts;

      // Initialize tree structure
      if (!tree[enterprise]) {
        tree[enterprise] = {
          name: enterprise,
          type: 'enterprise',
          children: {},
          tagCount: 0
        };
      }

      if (!tree[enterprise].children[site]) {
        tree[enterprise].children[site] = {
          name: site,
          type: 'site',
          children: {},
          tagCount: 0
        };
      }

      if (!tree[enterprise].children[site].children[area]) {
        tree[enterprise].children[site].children[area] = {
          name: area,
          type: 'area',
          children: {},
          tagCount: 0
        };
      }

      if (!tree[enterprise].children[site].children[area].children[line]) {
        tree[enterprise].children[site].children[area].children[line] = {
          name: line,
          type: 'line',
          children: {},
          tagCount: 0
        };
      }

      if (!tree[enterprise].children[site].children[area].children[line].children[workCell]) {
        tree[enterprise].children[site].children[area].children[line].children[workCell] = {
          name: workCell,
          type: 'workCell',
          children: {},
          tagCount: 0
        };
      }

      // Add tag to the work cell
      const workCellNode = tree[enterprise].children[site].children[area].children[line].children[workCell];
      workCellNode.children[row.tag_name] = {
        name: row.tag_name,
        type: 'tag',
        value: row.value,
        valueBool: row.value_bool,
        lastUpdate: row.last_update,
        topic: row.topic,
        count: row.count,
        virtualPath: row.virtual_path
      };

      // Update tag counts up the hierarchy
      workCellNode.tagCount++;
      tree[enterprise].children[site].children[area].children[line].tagCount++;
      tree[enterprise].children[site].children[area].tagCount++;
      tree[enterprise].children[site].tagCount++;
      tree[enterprise].tagCount++;
    });

    // Convert nested objects to arrays for easier rendering
    const convertToArray = (obj: any): any => {
      if (obj.type === 'tag') {
        return obj;
      }

      return {
        ...obj,
        children: Object.values(obj.children).map(convertToArray)
      };
    };

    const treeArray = Object.values(tree).map(convertToArray);

    return NextResponse.json({
      success: true,
      tree: treeArray,
      totalTags: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching tag tree:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tag tree' },
      { status: 500 }
    );
  }
}