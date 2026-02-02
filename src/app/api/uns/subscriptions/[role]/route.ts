/**
 * UNS Subscriptions API Routes
 * Handles role-based topic subscription patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/database/supabase-client';
import { UNSHierarchy } from '@/lib/database/uns-hierarchy';

export const dynamic = 'force-dynamic';

// Lazy init for Vercel build compatibility
let _prisma: any = null;
function _get_prisma() { if (!_prisma) _prisma = getPrismaClient(); return _prisma; }
// Lazy init for Vercel build compatibility
let _unsHierarchy: any = null;
function _get_unsHierarchy() { if (!_unsHierarchy) _unsHierarchy = new UNSHierarchy(); return _unsHierarchy; }

// Valid user roles
const VALID_ROLES = ['factory_manager', 'production_manager', 'maintenance_technician', 'executive'] as const;
type UserRole = typeof VALID_ROLES[number];

// GET /api/uns/subscriptions/[role]
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ role: string }> }
) {
  try {
    const { role } = await context.params;

    // Validate role
    if (!VALID_ROLES.includes(role as UserRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: factory_manager, production_manager, maintenance_technician, executive' },
        { status: 400 }
      );
    }

    // Get role-specific subscriptions from database
    const subscriptions = await _get_prisma().topicSubscription.findMany({
      where: {
        user_role: role,
        is_active: true,
      },
      orderBy: {
        topic_pattern: 'asc',
      },
    });

    // If no subscriptions found in database, generate default patterns
    if (subscriptions.length === 0) {
      const defaultHierarchy = {
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        work_unit: 'cnc-001',
      };

      const defaultPatterns = _get_unsHierarchy().generateAccessPatterns(role, defaultHierarchy);
      
      const defaultSubscriptions = defaultPatterns.map(pattern => ({
        topic_pattern: pattern,
        access_level: 'read' as const,
        description: getPatternDescription(pattern, role),
      }));

      return NextResponse.json({
        role,
        subscriptions: defaultSubscriptions,
      });
    }

    // Transform database subscriptions for response
    const transformedSubscriptions = subscriptions.map(sub => ({
      topic_pattern: sub.topic_pattern,
      access_level: sub.access_level,
      description: sub.description || getPatternDescription(sub.topic_pattern, role),
    }));

    return NextResponse.json({
      role,
      subscriptions: transformedSubscriptions,
    });

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    );
  }
}

// Helper function to generate pattern descriptions
function getPatternDescription(pattern: string, role: string): string {
  if (pattern.includes('/info/production')) {
    return 'Production metrics and KPIs';
  } else if (pattern.includes('/info/efficiency')) {
    return 'Efficiency and performance metrics';
  } else if (pattern.includes('/info/status')) {
    return 'Machine status and operational data';
  } else if (pattern.includes('/info/sensors')) {
    return 'Sensor readings and equipment telemetry';
  } else if (pattern.includes('/info/maintenance')) {
    return 'Maintenance schedules and equipment health';
  } else if (pattern.includes('/adhoc/alerts')) {
    return 'Real-time alerts and notifications';
  } else if (pattern.includes('/func/capabilities')) {
    return 'Machine capabilities and specifications';
  } else if (pattern.includes('/desc/identity')) {
    return 'Machine identification and metadata';
  }

  // Default descriptions based on role
  switch (role) {
  case 'executive':
    return 'High-level operational metrics and KPIs';
  case 'factory_manager':
    return 'Factory-wide operational visibility';
  case 'production_manager':
    return 'Production planning and scheduling data';
  case 'maintenance_technician':
    return 'Equipment health and maintenance data';
  default:
    return 'Topic subscription pattern';
  }
}