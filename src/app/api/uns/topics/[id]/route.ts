/**
 * UNS Topics Individual Operations API Routes
 * Handles PUT and DELETE operations for specific topics
 */

import { NextRequest, NextResponse } from 'next/server';
import { TopicRegistry } from '@/lib/database/topic-registry';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const topicRegistry = new TopicRegistry();

// Validation schema for topic updates
const updateTopicSchema = z.object({
  topic_path: z.string().min(1).optional(),
  topic_type: z.enum(['descriptive', 'functional', 'informational', 'ad_hoc']).optional(),
  enterprise: z.string().min(1).optional(),
  site: z.string().min(1).optional(),
  area: z.string().min(1).optional(),
  work_cell: z.string().min(1).optional(),
  work_unit: z.string().min(1).optional(),
  data_category: z.string().min(1).optional(),
  metric_name: z.string().min(1).optional(),
  description: z.string().optional(),
  unit: z.string().optional(),
  data_type: z.enum(['number', 'string', 'boolean', 'object']).optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  schema_definition: z.any().optional(),
});

// PUT /api/uns/topics/[id]
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    
    // Validate request body
    const validatedData = updateTopicSchema.parse(body);

    // Check if topic exists
    const existingTopic = await topicRegistry.findTopicByPath(validatedData.topic_path || '');
    if (!existingTopic && !validatedData.topic_path) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    // For schema updates
    if (validatedData.schema_definition) {
      const updatedTopic = await topicRegistry.updateTopicSchema(id, validatedData.schema_definition);
      
      return NextResponse.json({
        id: updatedTopic.id,
        topic_path: updatedTopic.topic_path,
        message: 'Topic updated successfully',
      });
    }

    // For now, only schema updates are supported
    // Full topic updates would require more complex logic to handle topic path changes
    return NextResponse.json(
      { error: 'Only schema updates are currently supported' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error updating topic:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Topic not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('backward compatibility')) {
        return NextResponse.json(
          { error: 'Schema update would break backward compatibility' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    );
  }
}

// DELETE /api/uns/topics/[id]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Deactivate the topic (soft delete)
    const deactivatedTopic = await topicRegistry.deactivateTopic(id);

    return NextResponse.json({
      id: deactivatedTopic.id,
      message: 'Topic deactivated successfully',
    });

  } catch (error) {
    console.error('Error deactivating topic:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Topic not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to deactivate topic' },
      { status: 500 }
    );
  }
}