/**
 * UNS Machines API Routes
 * Handles CNC machine registry operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPrismaClient } from '@/lib/database/supabase-client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const prisma = getPrismaClient();

// GET /api/uns/machines
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const enterprise = searchParams.get('enterprise');
    const site = searchParams.get('site');
    const area = searchParams.get('area');
    const work_cell = searchParams.get('work_cell');
    const status = searchParams.get('status');

    // Build where clause
    const where: Record<string, string> = {};
    if (enterprise) where.enterprise = enterprise;
    if (site) where.site = site;
    if (area) where.area = area;
    if (work_cell) where.work_cell = work_cell;
    if (status) where.operational_status = status;

    // Get machines from database
    const machines = await prisma.cNCMachine.findMany({
      where,
      orderBy: {
        machine_id: 'asc',
      },
    });

    // Transform machines for response
    const transformedMachines = machines.map(machine => ({
      id: machine.id,
      machine_id: machine.machine_id,
      display_name: machine.display_name,
      manufacturer: machine.manufacturer,
      model: machine.model,
      hierarchy: {
        enterprise: machine.enterprise,
        site: machine.site,
        area: machine.area,
        work_cell: machine.work_cell,
      },
      operational_status: machine.operational_status,
      capabilities: machine.capabilities,
      specifications: machine.specifications,
      installation_date: machine.installation_date,
    }));

    return NextResponse.json({
      machines: transformedMachines,
    });

  } catch (error) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: 'Failed to fetch machines' },
      { status: 500 }
    );
  }
}

// POST /api/uns/machines (for creating new machines)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validation schema for machine creation
    const createMachineSchema = z.object({
      machine_id: z.string().min(1),
      display_name: z.string().min(1),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      enterprise: z.string().min(1),
      site: z.string().min(1),
      area: z.string().min(1),
      work_cell: z.string().min(1),
      installation_date: z.string().optional(),
      operational_status: z.enum(['operational', 'maintenance', 'offline', 'error']).optional(),
      capabilities: z.any().optional(),
      specifications: z.any().optional(),
    });

    // Validate request body
    const validatedData = createMachineSchema.parse(body);

    // Check if machine ID already exists
    const existingMachine = await prisma.cNCMachine.findUnique({
      where: { machine_id: validatedData.machine_id },
    });

    if (existingMachine) {
      return NextResponse.json(
        { error: 'Machine ID already exists' },
        { status: 400 }
      );
    }

    // Create the machine
    const newMachine = await prisma.cNCMachine.create({
      data: {
        machine_id: validatedData.machine_id,
        display_name: validatedData.display_name,
        manufacturer: validatedData.manufacturer,
        model: validatedData.model,
        enterprise: validatedData.enterprise,
        site: validatedData.site,
        area: validatedData.area,
        work_cell: validatedData.work_cell,
        installation_date: validatedData.installation_date ? new Date(validatedData.installation_date) : null,
        operational_status: validatedData.operational_status || 'operational',
        capabilities: validatedData.capabilities,
        specifications: validatedData.specifications,
      },
    });

    return NextResponse.json({
      id: newMachine.id,
      machine_id: newMachine.machine_id,
      message: 'Machine registered successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating machine:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create machine' },
      { status: 500 }
    );
  }
}