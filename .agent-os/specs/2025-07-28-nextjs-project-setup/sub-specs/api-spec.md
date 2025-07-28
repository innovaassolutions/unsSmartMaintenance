# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-28-nextjs-project-setup/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Initial API Structure

### Next.js API Routes Setup

The project initialization will establish the API routing structure using Next.js App Router conventions, preparing for future UNS system endpoints.

### API Route Organization

```
app/
  api/
    health/
      route.ts           # Application health check endpoint
    mqtt/
      route.ts           # Future MQTT message handling endpoint
    machines/
      route.ts           # Future CNC machine data endpoints
    analytics/
      route.ts           # Future predictive analytics endpoints
```

## Initial Endpoints

### GET /api/health

**Purpose:** Application health check for monitoring and deployment verification
**Parameters:** None
**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-07-28T20:51:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

**Errors:** None expected for basic implementation

## Future API Architecture

### MQTT Integration Endpoints

- **POST /api/mqtt/publish** - Publish messages to UNS topics
- **GET /api/mqtt/status** - MQTT broker connection status

### Machine Data Endpoints

- **GET /api/machines** - List all CNC machines
- **GET /api/machines/[id]** - Individual machine data
- **GET /api/machines/[id]/metrics** - Real-time machine metrics

### Analytics Endpoints

- **POST /api/analytics/predict** - Trigger predictive analysis
- **GET /api/analytics/alerts** - Active maintenance alerts

## Authentication Strategy

The API structure will be prepared for future authentication middleware integration, following Next.js App Router authentication patterns with Supabase Auth.

## Error Handling Standards

- Consistent HTTP status codes
- Structured error response format
- Request validation middleware
- Logging integration for debugging
