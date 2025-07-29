/**
 * Pipeline Health Check API Endpoint
 * Provides live status of the MQTT to Supabase pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPipelineOrchestrator } from '@/lib/pipeline/pipeline-orchestrator'

// Global pipeline instance (in a real app, this would be managed differently)
let pipelineInstance: any = null

/**
 * GET /api/pipeline/health
 * Returns comprehensive health status of the pipeline
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize pipeline if not already done (for health check only)
    if (!pipelineInstance) {
      pipelineInstance = createPipelineOrchestrator()
    }

    const health = await pipelineInstance.getHealth()
    const metrics = pipelineInstance.getMetrics()

    const healthResponse = {
      timestamp: new Date().toISOString(),
      pipeline: {
        status: health.status,
        isHealthy: health.isHealthy,
        uptime: metrics.uptime,
        version: '1.0.0'
      },
      components: {
        mqttConsumer: {
          status: health.components.mqttConsumer.status,
          subscriptions: health.components.mqttConsumer.subscriptions,
          lastMessage: health.components.mqttConsumer.lastMessage
        },
        database: {
          status: health.components.database.status,
          pendingBatches: health.components.database.pendingBatches,
          connectionPool: health.components.database.connectionPool
        },
        validator: {
          status: health.components.validator.status,
          supportedSensors: health.components.validator.supportedSensors
        }
      },
      metrics: {
        processing: {
          messagesReceived: metrics.messagesReceived,
          messagesProcessed: metrics.messagesProcessed,
          messagesValidated: metrics.messagesValidated,
          messagesFailed: metrics.messagesFailed,
          successRate: metrics.messagesReceived > 0 
            ? ((metrics.messagesProcessed / metrics.messagesReceived) * 100).toFixed(2) + '%'
            : '0%'
        },
        performance: {
          throughputPerSecond: parseFloat(metrics.throughputPerSecond.toFixed(2)),
          avgProcessingTime: parseFloat(metrics.avgProcessingTime.toFixed(2)),
          avgValidationTime: parseFloat(metrics.avgValidationTime.toFixed(2)),
          avgDatabaseTime: parseFloat(metrics.avgDatabaseTime.toFixed(2)),
          errorRate: parseFloat(metrics.errorRate.toFixed(2))
        },
        queues: {
          deadLetterCount: metrics.deadLetterCount,
          retryQueueSize: pipelineInstance.retryQueue?.length || 0
        }
      },
      lastHealthCheck: health.lastHealthCheck
    }

    // Determine HTTP status code based on health
    const statusCode = health.isHealthy ? 200 : 503

    return NextResponse.json(healthResponse, { status: statusCode })

  } catch (error) {
    console.error('Pipeline health check error:', error)

    const errorResponse = {
      timestamp: new Date().toISOString(),
      pipeline: {
        status: 'error',
        isHealthy: false,
        error: error.message || 'Unknown error'
      },
      components: {
        mqttConsumer: { status: 'unknown' },
        database: { status: 'unknown' },
        validator: { status: 'unknown' }
      }
    }

    return NextResponse.json(errorResponse, { status: 503 })
  }
}

/**
 * POST /api/pipeline/health
 * Reset pipeline metrics (for development/testing)
 */
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (!pipelineInstance) {
      pipelineInstance = createPipelineOrchestrator()
    }

    switch (action) {
      case 'reset_metrics':
        pipelineInstance.resetMetrics()
        return NextResponse.json({
          message: 'Pipeline metrics reset successfully',
          timestamp: new Date().toISOString()
        })

      case 'clear_dead_letter':
        const clearedCount = pipelineInstance.clearDeadLetterQueue()
        return NextResponse.json({
          message: `Cleared ${clearedCount} messages from dead letter queue`,
          clearedCount,
          timestamp: new Date().toISOString()
        })

      case 'start':
        try {
          await pipelineInstance.start()
          return NextResponse.json({
            message: 'Pipeline started successfully',
            timestamp: new Date().toISOString()
          })
        } catch (startError: any) {
          console.error('Pipeline start error:', startError)
          return NextResponse.json({
            error: 'Failed to start pipeline',
            details: startError?.message || 'Unknown error',
            timestamp: new Date().toISOString()
          }, { status: 500 })
        }

      case 'stop':
        await pipelineInstance.stop()
        return NextResponse.json({
          message: 'Pipeline stopped successfully',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: reset_metrics, clear_dead_letter, start, stop' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Pipeline health action error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}