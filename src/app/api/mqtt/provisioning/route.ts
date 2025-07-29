/**
 * MQTT Topic Provisioning API Routes
 * Handles EMQX Cloud topic provisioning and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTopicProvisioningService } from '@/lib/mqtt/topic-provisioning';
import { z } from 'zod';

const provisioningService = getTopicProvisioningService();

// Validation schema for topic provisioning request
const provisionTopicSchema = z.object({
  topic_path: z.string().min(1),
});

const provisionMachineSchema = z.object({
  machine_id: z.string().min(1),
});

// GET /api/mqtt/provisioning - Get provisioning status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      const status = await provisioningService.getProvisioningStatus();
      return NextResponse.json(status);
    }

    if (action === 'validate') {
      const validation = await provisioningService.validateConnection();
      return NextResponse.json(validation);
    }

    // Default: return provisioning status
    const status = await provisioningService.getProvisioningStatus();
    return NextResponse.json(status);

  } catch (error) {
    console.error('Error getting provisioning status:', error);
    return NextResponse.json(
      { error: 'Failed to get provisioning status' },
      { status: 500 }
    );
  }
}

// POST /api/mqtt/provisioning - Provision topics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'topic') {
      // Provision single topic
      const validatedData = provisionTopicSchema.parse(body);
      const result = await provisioningService.provisionTopic(validatedData.topic_path);
      
      if (result.success) {
        return NextResponse.json({
          message: 'Topic provisioned successfully',
          result
        });
      } else {
        return NextResponse.json(
          { error: 'Topic provisioning failed', details: result.error },
          { status: 400 }
        );
      }
    }

    if (action === 'machine') {
      // Provision all topics for a machine
      const validatedData = provisionMachineSchema.parse(body);
      const result = await provisioningService.provisionMachineTopics(validatedData.machine_id);
      
      return NextResponse.json({
        message: `Provisioned ${result.successful} topics for machine ${validatedData.machine_id}`,
        result
      });
    }

    if (action === 'all') {
      // Provision all active topics
      const result = await provisioningService.provisionAllTopics();
      
      return NextResponse.json({
        message: `Bulk provisioning completed: ${result.successful} successful, ${result.failed} failed`,
        result
      });
    }

    if (action === 'setup') {
      // Setup role-based access
      await provisioningService.setupRoleBasedAccess();
      
      return NextResponse.json({
        message: 'Role-based access patterns configured successfully'
      });
    }

    if (action === 'sync') {
      // Sync registry with EMQX
      const result = await provisioningService.syncWithEMQX();
      
      return NextResponse.json({
        message: 'Sync completed',
        result
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: topic, machine, all, setup, or sync' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error in topic provisioning:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Topic provisioning failed' },
      { status: 500 }
    );
  }
}