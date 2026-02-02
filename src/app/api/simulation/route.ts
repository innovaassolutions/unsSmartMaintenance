/**
 * CNC Simulation Control API Routes
 * Provides endpoints to start, stop, and monitor the CNC data simulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { SimulationManager } from '@/lib/simulation/simulation-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for simulation configuration
const simulationConfigSchema = z.object({
  publishInterval: z.number().min(1000).max(60000).optional(), // 1s to 1min
  enableLogging: z.boolean().optional(),
}).optional();

// GET /api/simulation - Get simulation status and metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      // Return basic status
      const isRunning = SimulationManager.isRunning();
      return NextResponse.json({
        status: isRunning ? 'running' : 'stopped',
        isRunning,
      });
    }

    if (action === 'metrics') {
      // Return detailed metrics
      const metrics = SimulationManager.getMetrics();
      if (!metrics) {
        return NextResponse.json(
          { error: 'Simulation not initialized' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        status: 'running',
        metrics,
      });
    }

    // Default: return status with metrics if available
    const isRunning = SimulationManager.isRunning();
    const metrics = SimulationManager.getMetrics();

    return NextResponse.json({
      status: isRunning ? 'running' : 'stopped',
      isRunning,
      metrics: metrics || null,
    });

  } catch (error) {
    console.error('Error getting simulation status:', error);
    return NextResponse.json(
      { error: 'Failed to get simulation status' },
      { status: 500 }
    );
  }
}

// POST /api/simulation - Control simulation (start, stop, restart)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'start') {
      // Start the simulation
      const config = simulationConfigSchema.parse(body.config || {});
      
      if (SimulationManager.isRunning()) {
        return NextResponse.json(
          { error: 'Simulation is already running' },
          { status: 400 }
        );
      }

      await SimulationManager.startSimulation(config);
      
      return NextResponse.json({
        message: 'Simulation started successfully',
        status: 'running',
        config: config || {},
      });
    }

    if (action === 'stop') {
      // Stop the simulation
      if (!SimulationManager.isRunning()) {
        return NextResponse.json(
          { error: 'Simulation is not running' },
          { status: 400 }
        );
      }

      await SimulationManager.stopSimulation();
      
      return NextResponse.json({
        message: 'Simulation stopped successfully',
        status: 'stopped',
      });
    }

    if (action === 'restart') {
      // Restart the simulation
      const config = simulationConfigSchema.parse(body.config || {});
      
      await SimulationManager.restartSimulation(config);
      
      return NextResponse.json({
        message: 'Simulation restarted successfully',
        status: 'running',
        config: config || {},
      });
    }

    if (action === 'toggle') {
      // Toggle simulation state
      const config = simulationConfigSchema.parse(body.config || {});
      
      if (SimulationManager.isRunning()) {
        await SimulationManager.stopSimulation();
        return NextResponse.json({
          message: 'Simulation stopped',
          status: 'stopped',
        });
      } else {
        await SimulationManager.startSimulation(config);
        return NextResponse.json({
          message: 'Simulation started',
          status: 'running',
          config: config || {},
        });
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: start, stop, restart, or toggle' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error controlling simulation:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to control simulation' },
      { status: 500 }
    );
  }
}

// PUT /api/simulation - Update simulation configuration (without stopping)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const config = simulationConfigSchema.parse(body);

    if (!SimulationManager.isRunning()) {
      return NextResponse.json(
        { error: 'Simulation is not running' },
        { status: 400 }
      );
    }

    // For now, we need to restart to apply new configuration
    // In a more advanced implementation, we could update settings on the fly
    await SimulationManager.restartSimulation(config);

    return NextResponse.json({
      message: 'Simulation configuration updated successfully',
      status: 'running',
      config,
    });

  } catch (error) {
    console.error('Error updating simulation configuration:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update simulation configuration' },
      { status: 500 }
    );
  }
}

// DELETE /api/simulation - Force stop simulation (emergency stop)
export async function DELETE(request: NextRequest) {
  try {
    // Force stop the simulation regardless of current state
    await SimulationManager.stopSimulation();
    
    return NextResponse.json({
      message: 'Simulation force stopped',
      status: 'stopped',
    });

  } catch (error) {
    console.error('Error force stopping simulation:', error);
    return NextResponse.json(
      { error: 'Failed to force stop simulation' },
      { status: 500 }
    );
  }
}