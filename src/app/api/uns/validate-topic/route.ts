/**
 * UNS Topic Validation API Route
 * Validates topic paths and payloads against UNS standards
 */

import { NextRequest, NextResponse } from 'next/server';
import { TopicRegistry } from '@/lib/database/topic-registry';
import { TopicValidator } from '@/lib/database/topic-validator';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Lazy init for Vercel build compatibility
let _topicRegistry: any = null;
function _get_topicRegistry() { if (!_topicRegistry) _topicRegistry = new TopicRegistry(); return _topicRegistry; }
// Lazy init for Vercel build compatibility
let _topicValidator: any = null;
function _get_topicValidator() { if (!_topicValidator) _topicValidator = new TopicValidator(); return _topicValidator; }

// Validation schema for topic validation request
const validateTopicSchema = z.object({
  topic_path: z.string().min(1),
  payload: z.any().optional(),
});

// POST /api/uns/validate-topic
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = validateTopicSchema.parse(body);
    const { topic_path, payload } = validatedData;

    let topicExists = false;
    let schemaValid = false;
    let hierarchyValid = false;
    const validationDetails: Record<string, string> = {
      topic_structure: 'invalid',
      payload_schema: 'not_tested',
      data_range: 'not_tested',
    };

    // Validate topic hierarchy structure
    try {
      _get_topicValidator().validateTopicPath(topic_path);
      hierarchyValid = true;
      validationDetails.topic_structure = 'valid';
    } catch (error) {
      hierarchyValid = false;
      validationDetails.topic_structure = error instanceof Error ? error.message : 'invalid';
    }

    // Check if topic exists in registry
    try {
      const existingTopic = await _get_topicRegistry().findTopicByPath(topic_path);
      topicExists = !!existingTopic;

      // If topic exists and payload is provided, validate payload against schema
      if (existingTopic && payload) {
        try {
          const isValid = await _get_topicRegistry().validateTopicPayload(topic_path, payload);
          schemaValid = isValid;
          validationDetails.payload_schema = 'valid';
          
          // Additional data range validation for numeric values
          if (existingTopic.data_type === 'number' && typeof payload.value === 'number') {
            try {
              _get_topicValidator().validateDataRange(
                payload.value,
                existingTopic.min_value || undefined,
                existingTopic.max_value || undefined
              );
              validationDetails.data_range = 'valid';
            } catch (rangeError) {
              validationDetails.data_range = rangeError instanceof Error ? rangeError.message : 'invalid';
            }
          } else {
            validationDetails.data_range = 'not_applicable';
          }
        } catch (schemaError) {
          schemaValid = false;
          validationDetails.payload_schema = schemaError instanceof Error ? schemaError.message : 'invalid';
        }
      } else if (payload) {
        validationDetails.payload_schema = 'topic_not_registered';
      }
    } catch (error) {
      console.error('Error checking topic existence:', error);
      // Continue with validation even if database check fails
    }

    const overallValid = hierarchyValid && (!payload || schemaValid);

    return NextResponse.json({
      valid: overallValid,
      topic_exists: topicExists,
      schema_valid: schemaValid,
      hierarchy_valid: hierarchyValid,
      validation_details: validationDetails,
    });

  } catch (error) {
    console.error('Error validating topic:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request format', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Validation service error',
        valid: false,
        topic_exists: false,
        schema_valid: false,
        hierarchy_valid: false,
        validation_details: {
          topic_structure: 'service_error',
          payload_schema: 'service_error',
          data_range: 'service_error',
        }
      },
      { status: 500 }
    );
  }
}