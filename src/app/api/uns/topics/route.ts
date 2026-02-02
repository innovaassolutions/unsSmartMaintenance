/**
 * UNS Topics API Routes
 * Handles CRUD operations for UNS topic registry
 */

import { NextRequest, NextResponse } from 'next/server';
import { AutoProvisioningTopicRegistry } from '@/lib/mqtt/topic-provisioning';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Lazy init for Vercel build compatibility
let _topicRegistry: any = null;
function _get_topicRegistry() { if (!_topicRegistry) _topicRegistry = new AutoProvisioningTopicRegistry(); return _topicRegistry; }

// Validation schema for topic creation
const createTopicSchema = z.object({
  topic_path: z.string().min(1),
  topic_type: z.enum(['descriptive', 'functional', 'informational', 'ad_hoc']),
  enterprise: z.string().min(1),
  site: z.string().min(1),
  area: z.string().min(1),
  work_cell: z.string().min(1),
  work_unit: z.string().min(1),
  data_category: z.string().min(1),
  metric_name: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().optional(),
  data_type: z.enum(['number', 'string', 'boolean', 'object']),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  schema_definition: z.any().optional(),
});

// GET /api/uns/topics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const enterprise = searchParams.get('enterprise');
    const site = searchParams.get('site');
    const area = searchParams.get('area');
    const work_cell = searchParams.get('work_cell');
    const work_unit = searchParams.get('work_unit');
    const topic_type = searchParams.get('topic_type');
    const active_only = searchParams.get('active_only') !== 'false';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);

    // Build search options
    const searchOptions = {
      enterprise: enterprise || undefined,
      site: site || undefined,
      area: area || undefined,
      work_cell: work_cell || undefined,
      work_unit: work_unit || undefined,
      topic_type: topic_type || undefined,
      is_active: active_only,
    };

    // Get topics from database
    const topics = await _get_topicRegistry().searchTopics(searchOptions);

    // Calculate pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedTopics = topics.slice(startIndex, endIndex);

    // Transform topics for response
    const transformedTopics = paginatedTopics.map(topic => ({
      id: topic.id,
      topic_path: topic.topic_path,
      topic_type: topic.topic_type,
      hierarchy: {
        enterprise: topic.enterprise,
        site: topic.site,
        area: topic.area,
        work_cell: topic.work_cell,
        work_unit: topic.work_unit,
      },
      data_category: topic.data_category,
      metric_name: topic.metric_name,
      description: topic.description,
      unit: topic.unit,
      data_type: topic.data_type,
      schema_definition: topic.schema_definition,
      is_active: topic.is_active,
    }));

    return NextResponse.json({
      topics: transformedTopics,
      pagination: {
        page,
        limit,
        total: topics.length,
        total_pages: Math.ceil(topics.length / limit),
      },
    });

  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

// POST /api/uns/topics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createTopicSchema.parse(body);

    // Register the topic
    const newTopic = await _get_topicRegistry().registerTopic(validatedData);

    return NextResponse.json({
      id: newTopic.id,
      topic_path: newTopic.topic_path,
      message: 'Topic registered successfully',
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating topic:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'Topic path already exists' },
          { status: 400 }
        );
      }
      
      if (error.message.includes('Invalid topic path')) {
        return NextResponse.json(
          { error: 'Invalid topic path format' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}