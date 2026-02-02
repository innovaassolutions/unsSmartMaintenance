/**
 * Database Seeding API Routes
 * Provides endpoints to seed CNC machines and topics into the database
 */

import { NextRequest, NextResponse } from 'next/server';
import { seedCNCMachines, seedSpecificMachine } from '@/lib/database/machine-seeder';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for seeding options
const seedingOptionsSchema = z.object({
  skipExisting: z.boolean().optional().default(true),
  machineId: z.string().optional(),
}).optional();

// GET /api/setup/seed - Get seeding status/information
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'info') {
      // Return information about what will be seeded
      return NextResponse.json({
        message: 'CNC Machine Seeding Information',
        machines_to_seed: 10,
        topics_per_machine: '15-20 (varies by machine capabilities)',
        estimated_total_topics: '150-200',
        note: 'Seeding will create both machines and their associated UNS topics',
      });
    }

    // Default: return basic info
    return NextResponse.json({
      message: 'Database seeding endpoint ready',
      available_actions: {
        'POST /api/setup/seed?action=all': 'Seed all CNC machines and topics',
        'POST /api/setup/seed?action=machine': 'Seed specific machine (requires machineId in body)',
        'GET /api/setup/seed?action=info': 'Get seeding information',
      },
    });

  } catch (error) {
    console.error('Error getting seeding info:', error);
    return NextResponse.json(
      { error: 'Failed to get seeding information' },
      { status: 500 }
    );
  }
}

// POST /api/setup/seed - Perform seeding operations  
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Validate options
    const options = seedingOptionsSchema.parse(body);

    if (action === 'all') {
      // Seed all CNC machines and their topics
      console.log('Starting to seed all CNC machines...');
      
      const result = await seedCNCMachines({
        skipExisting: options?.skipExisting ?? true,
      });

      if (result.errors.length > 0) {
        return NextResponse.json({
          message: 'Seeding completed with some errors',
          result,
          warnings: result.errors,
        }, { status: 207 }); // Multi-status
      }

      return NextResponse.json({
        message: 'All CNC machines and topics seeded successfully',
        result,
      });
    }

    if (action === 'machine') {
      // Seed a specific machine
      if (!options?.machineId) {
        return NextResponse.json(
          { error: 'machineId is required for machine-specific seeding' },
          { status: 400 }
        );
      }

      console.log(`Starting to seed machine: ${options.machineId}`);
      
      const result = await seedSpecificMachine(options.machineId, {
        skipExisting: options.skipExisting ?? true,
      });

      if (result.errors.length > 0) {
        return NextResponse.json({
          message: `Machine ${options.machineId} seeding completed with errors`,
          result,
          errors: result.errors,
        }, { status: 207 });
      }

      return NextResponse.json({
        message: `Machine ${options.machineId} seeded successfully`,
        result,
      });
    }

    if (action === 'reset') {
      // This would be a dangerous operation, so we'll just return info for now
      return NextResponse.json({
        message: 'Reset functionality not implemented',
        note: 'This would clear all seeded data. Implement with caution.',
        suggestion: 'Use database migration rollback instead',
      }, { status: 501 });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: all, machine, or reset' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error during seeding:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes('not found in predefined machines')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }

      if (error.message.includes('database')) {
        return NextResponse.json(
          { error: 'Database error during seeding', details: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Seeding operation failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/setup/seed - Update seeding configuration or re-seed with different options
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const options = seedingOptionsSchema.parse(body);

    // For now, this just re-runs the seeding with new options
    const result = await seedCNCMachines({
      skipExisting: options?.skipExisting ?? false, // Default to re-seeding for PUT
    });

    return NextResponse.json({
      message: 'Re-seeding completed with updated options',
      result,
      options: options || { skipExisting: false },
    });

  } catch (error) {
    console.error('Error during re-seeding:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Re-seeding operation failed' },
      { status: 500 }
    );
  }
}