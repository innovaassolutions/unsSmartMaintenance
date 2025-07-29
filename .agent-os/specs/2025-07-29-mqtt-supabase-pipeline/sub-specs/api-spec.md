# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-29-mqtt-supabase-pipeline/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Endpoints

### GET /api/pipeline/health

**Purpose:** Health check endpoint for pipeline service monitoring and load balancer integration
**Parameters:** None
**Response:** JSON health status with service metrics
**Errors:** 503 Service Unavailable if pipeline is unhealthy

```json
{
  "status": "healthy",
  "timestamp": "2025-07-29T10:30:00Z",
  "version": "1.0.0",
  "uptime": 3600,
  "metrics": {
    "mqtt_connected": true,
    "database_connected": true,
    "messages_processed_last_minute": 1250,
    "error_rate_last_minute": 0.02,
    "memory_usage_mb": 156
  }
}
```

### GET /api/pipeline/metrics

**Purpose:** Retrieve pipeline performance metrics for monitoring dashboards
**Parameters:** 
- `timeRange` (optional): "1h", "24h", "7d" (default: "1h")
- `metricTypes` (optional): comma-separated list of metric types
**Response:** Time-series metrics data
**Errors:** 400 Bad Request for invalid parameters

```json
{
  "timeRange": "1h",
  "metrics": [
    {
      "type": "throughput",
      "name": "messages_per_second",
      "data": [
        {"timestamp": "2025-07-29T10:00:00Z", "value": 45.2},
        {"timestamp": "2025-07-29T10:01:00Z", "value": 52.1}
      ]
    },
    {
      "type": "latency",
      "name": "database_insert_ms",
      "data": [
        {"timestamp": "2025-07-29T10:00:00Z", "value": 12.5},
        {"timestamp": "2025-07-29T10:01:00Z", "value": 15.8}
      ]
    }
  ]
}
```

### GET /api/sensors/readings

**Purpose:** Query historical sensor data for dashboard visualization and analytics
**Parameters:**
- `machineId` (required): UUID of the CNC machine
- `sensorTypes` (optional): comma-separated list of sensor types
- `startTime` (required): ISO timestamp for query start
- `endTime` (required): ISO timestamp for query end
- `aggregation` (optional): "raw", "1min", "5min", "1hour" (default: "raw")
- `limit` (optional): maximum records to return (default: 1000, max: 10000)
**Response:** Time-series sensor data
**Errors:** 400 Bad Request for invalid parameters, 404 Not Found for invalid machine ID

```json
{
  "machineId": "123e4567-e89b-12d3-a456-426614174000",
  "timeRange": {
    "start": "2025-07-29T09:00:00Z",
    "end": "2025-07-29T10:00:00Z"
  },
  "aggregation": "1min",
  "readings": [
    {
      "sensorType": "temperature",
      "unit": "celsius",
      "data": [
        {"timestamp": "2025-07-29T09:00:00Z", "value": 65.2, "quality": 192},
        {"timestamp": "2025-07-29T09:01:00Z", "value": 66.1, "quality": 192}
      ]
    },
    {
      "sensorType": "vibration",
      "unit": "mm/s",
      "data": [
        {"timestamp": "2025-07-29T09:00:00Z", "value": 2.3, "quality": 192},
        {"timestamp": "2025-07-29T09:01:00Z", "value": 2.1, "quality": 192}
      ]
    }
  ]
}
```

### GET /api/machines/status

**Purpose:** Get current status and latest sensor readings for all or specific CNC machines
**Parameters:**
- `machineIds` (optional): comma-separated list of machine UUIDs
- `includeMetrics` (optional): boolean to include performance metrics (default: false)
**Response:** Current machine status with latest sensor readings
**Errors:** 404 Not Found for invalid machine IDs

```json
{
  "machines": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "name": "CNC-MILL-001",
      "status": "running",
      "lastDataReceived": "2025-07-29T10:29:45Z",
      "dataQualityScore": 0.98,
      "currentReadings": [
        {
          "sensorType": "temperature",
          "value": 67.5,
          "unit": "celsius",
          "timestamp": "2025-07-29T10:29:45Z",
          "quality": 192
        },
        {
          "sensorType": "spindle_speed",
          "value": 1250,
          "unit": "rpm",
          "timestamp": "2025-07-29T10:29:45Z",
          "quality": 192
        }
      ],
      "metrics": {
        "messagesPerMinute": 12,
        "uptime": 0.995
      }
    }
  ]
}
```

### POST /api/pipeline/restart

**Purpose:** Administrative endpoint to restart the MQTT pipeline service
**Parameters:** 
- `force` (optional): boolean to force restart even if processing messages (default: false)
**Response:** Restart acknowledgment
**Errors:** 403 Forbidden without admin authentication, 409 Conflict if force=false and processing

```json
{
  "message": "Pipeline restart initiated",
  "timestamp": "2025-07-29T10:30:00Z",
  "estimatedDowntime": "5-10 seconds"
}
```

### GET /api/pipeline/errors

**Purpose:** Retrieve recent data validation and processing errors for troubleshooting
**Parameters:**
- `timeRange` (optional): "1h", "24h", "7d" (default: "1h")
- `errorTypes` (optional): comma-separated list of error types
- `machineId` (optional): filter errors for specific machine
- `limit` (optional): maximum records to return (default: 100, max: 1000)
**Response:** Error log entries
**Errors:** 400 Bad Request for invalid parameters

```json
{
  "errors": [
    {
      "id": 12345,
      "machineId": "123e4567-e89b-12d3-a456-426614174000",
      "topicPath": "plant/factory1/line2/cnc001/sensors/temperature",
      "errorType": "schema_validation",
      "errorMessage": "Invalid temperature value: expected number, received string",
      "timestamp": "2025-07-29T10:25:30Z",
      "rawPayload": {
        "temperature": "invalid_value",
        "timestamp": 1722247530
      }
    }
  ],
  "totalCount": 156,
  "errorSummary": {
    "schema_validation": 45,
    "range_check": 89,
    "type_conversion": 22
  }
}
```

## Controllers

### PipelineController
- **healthCheck()**: Service health monitoring and status reporting
- **getMetrics()**: Performance metrics aggregation and filtering
- **restart()**: Administrative pipeline service restart

### SensorDataController
- **getReadings()**: Historical sensor data queries with aggregation
- **getCurrentStatus()**: Latest sensor readings and machine status
- **validateReading()**: Internal method for data validation

### ErrorController
- **getErrors()**: Error log queries and filtering
- **getErrorSummary()**: Error statistics and trending

## Integration Points

### MQTT Message Processing
Pipeline subscribes to UNS topic hierarchy and processes messages through validation before database storage.

### Supabase Real-time Integration
Triggers real-time events on sensor_readings table changes for dashboard updates.

### Monitoring Integration
Exposes metrics in Prometheus format for external monitoring systems.

## Authentication & Authorization

- Pipeline health and metrics endpoints: Public (monitoring)
- Sensor data queries: API key required
- Administrative endpoints: Admin role required
- Error logs: Admin role required