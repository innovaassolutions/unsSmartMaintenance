# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-29-emqx-mqtt-broker-setup/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## MQTT Integration Endpoints

The API endpoints support MQTT broker configuration, data ingestion from MQTT messages, and WebSocket bridge functionality for real-time dashboard updates.

## Endpoints

### POST /api/mqtt/webhook

**Purpose:** Receive MQTT messages from EMQX Cloud data bridge rules for database persistence
**Parameters:** MQTT message payload, topic, timestamp metadata
**Response:** Success confirmation with message processing status
**Errors:** 400 for invalid payload format, 500 for database errors

```typescript
interface MQTTWebhookPayload {
  topic: string;
  payload: string | object;
  timestamp: number;
  qos: 0 | 1 | 2;
  retain: boolean;
  client_id: string;
}

interface WebhookResponse {
  success: boolean;
  message_id?: string;
  error?: string;
  processed_at: string;
}
```

### GET /api/mqtt/topics

**Purpose:** Retrieve configured MQTT topic hierarchy and access rules
**Parameters:** Optional filter by topic_type, is_active status
**Response:** List of registered MQTT topics with metadata
**Errors:** 500 for database connection issues

```typescript
interface MQTTTopic {
  id: number;
  topic_path: string;
  topic_type: 'status' | 'telemetry' | 'alarms' | 'events' | 'commands' | 'responses';
  qos_level: 0 | 1 | 2;
  retain_messages: boolean;
  description: string;
  is_active: boolean;
}
```

### POST /api/mqtt/publish

**Purpose:** Publish messages to MQTT broker from web application (for commands/responses)
**Parameters:** Topic path, message payload, QoS level, retain flag
**Response:** Publication confirmation with message ID
**Errors:** 401 for authentication failure, 403 for topic permission denied, 500 for broker connection issues

```typescript
interface PublishRequest {
  topic: string;
  payload: object | string;
  qos?: 0 | 1 | 2;
  retain?: boolean;
}

interface PublishResponse {
  success: boolean;
  message_id: string;
  topic: string;
  published_at: string;
}
```

### GET /api/mqtt/status

**Purpose:** Health check for MQTT broker connectivity and system status
**Parameters:** None
**Response:** Broker connection status, active subscriptions, message throughput metrics
**Errors:** 503 for broker unavailable

```typescript
interface MQTTStatus {
  broker_connected: boolean;
  active_subscriptions: number;
  messages_per_minute: number;
  last_message_at: string;
  uptime_seconds: number;
  connection_errors: number;
}
```

### WebSocket Endpoint: /api/mqtt/websocket

**Purpose:** Real-time WebSocket bridge for MQTT message streaming to browser clients
**Protocol:** WebSocket with JSON message format
**Authentication:** Token-based authentication via query parameter
**Message Types:** subscription management, real-time data updates, connection status

```typescript
interface WSSubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  topics: string[];
  client_id: string;
}

interface WSDataMessage {
  type: 'data';
  topic: string;
  payload: object;
  timestamp: number;
  qos: 0 | 1 | 2;
}

interface WSStatusMessage {
  type: 'status';
  connected: boolean;
  subscriptions: string[];
  error?: string;
}
```

## MQTT Message Processing Controllers

### MQTTWebhookController

**Action:** processWebhookMessage
**Business Logic:** 
- Validate MQTT message format and topic structure
- Parse UNS topic hierarchy to extract machine and sensor information
- Transform message payload for database storage
- Store time-series data in TimescaleDB and metadata in Supabase
- Trigger real-time updates to connected WebSocket clients
- Handle message deduplication and error recovery

**Error Handling:**
- Invalid topic format: Log warning and store in dead letter queue
- Database connection failure: Retry with exponential backoff
- Payload parsing errors: Store raw message for manual review

### MQTTPublishController

**Action:** publishMessage
**Business Logic:**
- Authenticate client and validate topic access permissions
- Verify topic matches allowed UNS hierarchy patterns
- Connect to EMQX Cloud broker using stored credentials
- Publish message with specified QoS and retention settings
- Log publication for audit and debugging purposes

**Error Handling:**
- Broker connection failure: Return 503 with retry recommendation
- Topic permission denied: Return 403 with allowed topics list
- Message size exceeded: Return 413 with size limits

### WebSocketBridgeController

**Action:** handleConnection, manageSubscriptions, broadcastUpdates
**Business Logic:**
- Authenticate WebSocket connections using JWT tokens
- Maintain client subscription registry for targeted message delivery
- Subscribe to relevant MQTT topics based on client permissions
- Transform MQTT messages to WebSocket format and broadcast to subscribers
- Handle client disconnections and cleanup subscriptions

**Error Handling:**
- Authentication failure: Close connection with 401 status
- Subscription limit exceeded: Reject new subscriptions with error message
- Message broadcast failure: Log error and attempt reconnection

## Integration with EMQX Cloud

### Data Bridge Configuration
EMQX Cloud rule engine will be configured to forward messages to webhook endpoints:

```json
{
  "rule": {
    "sql": "SELECT topic, payload, timestamp, qos, retain, clientid FROM \"Factory01/+/+/+/+\"",
    "actions": [
      {
        "name": "webhook_action",
        "params": {
          "url": "https://your-app.vercel.app/api/mqtt/webhook",
          "method": "POST",
          "headers": {
            "content-type": "application/json",
            "authorization": "Bearer ${WEBHOOK_SECRET}"
          }
        }
      }
    ]
  }
}
```

### Authentication Strategy
- **Node.js Publishers**: Username/password authentication with machine-specific credentials
- **WebSocket Clients**: JWT token authentication for dashboard users
- **Webhook Endpoints**: Shared secret authentication for EMQX Cloud integration
- **API Endpoints**: Session-based authentication for web application users