# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-29-emqx-mqtt-broker-setup/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Test Coverage

### Unit Tests

**MQTT Connection Utils**
- Test MQTT client configuration parsing and validation
- Test connection string generation with different protocols (mqtt/mqtts/ws/wss)
- Test authentication credential handling and encryption
- Test connection retry logic with exponential backoff
- Test graceful disconnection and cleanup procedures

**UNS Topic Validation**
- Test topic hierarchy validation against UNS standards
- Test topic path parsing for machine/sensor identification
- Test ACL rule matching for permission validation
- Test topic pattern wildcards (+, #) handling
- Test invalid topic format rejection

**Message Transformation**
- Test MQTT payload parsing for different sensor data types
- Test message timestamp normalization and timezone handling
- Test QoS level validation and conversion
- Test retained message flag processing
- Test message deduplication logic

**WebSocket Bridge Utils**
- Test WebSocket message format conversion from MQTT
- Test client subscription management and filtering
- Test broadcast targeting based on topic subscriptions
- Test connection state management and cleanup
- Test message buffering for offline clients

### Integration Tests

**EMQX Cloud Connection**
- Test successful connection to EMQX Cloud broker with valid credentials
- Test connection failure handling with invalid credentials
- Test SSL/TLS certificate validation in production environment
- Test connection persistence during network interruptions
- Test load balancing and failover scenarios

**MQTT Publish/Subscribe Workflow**
- Test end-to-end message flow from publisher to subscriber
- Test QoS 0, 1, and 2 message delivery guarantees
- Test retained message persistence and retrieval
- Test large message handling and size limits
- Test concurrent connections and message throughput

**Database Integration**
- Test MQTT webhook endpoint receives and processes messages correctly
- Test time-series data insertion into TimescaleDB via webhook
- Test metadata storage in Supabase for machine information
- Test error handling for database connection failures
- Test message processing performance under load

**WebSocket Real-time Updates**
- Test WebSocket connection establishment and authentication
- Test real-time message broadcasting to connected clients
- Test selective subscription filtering by topic patterns
- Test client disconnection handling and resource cleanup
- Test message ordering and timing accuracy

### Feature Tests

**Complete CNC Machine Data Flow**
- Test simulated CNC machine publishes sensor data following UNS hierarchy
- Test EMQX Cloud receives and routes messages through rule engine
- Test webhook processes messages and stores in database
- Test WebSocket clients receive real-time updates in dashboard
- Test data persistence and retrieval for historical analysis

**Multi-Machine Simulation**
- Test 10 concurrent CNC machines publishing different data types
- Test topic isolation and data organization by machine ID
- Test system performance under realistic production load
- Test message rate limiting and resource management
- Test graceful degradation under peak traffic conditions

**Security and Access Control**
- Test MQTT ACL rules prevent unauthorized topic access
- Test WebSocket authentication blocks unauthenticated connections
- Test API endpoint security with proper authentication headers
- Test message encryption in transit using TLS/SSL
- Test credential rotation and connection re-establishment

### Mocking Requirements

**EMQX Cloud Broker Service**
- Mock MQTT broker responses for connection success/failure scenarios
- Mock message publishing confirmations and error states
- Mock broker statistics and health monitoring responses
- Mock rule engine webhook delivery with various payloads
- Mock connection limit enforcement and rate limiting

**External Database Services**
- Mock Supabase API responses for configuration data queries
- Mock TimescaleDB time-series data insertion operations
- Mock database connection failures and timeout scenarios
- Mock query performance issues and slow response times
- Mock transaction rollback scenarios for data consistency

**WebSocket Client Connections**
- Mock browser WebSocket connections with different authentication states
- Mock client subscription requests and topic filtering
- Mock network disconnections and reconnection attempts
- Mock client-side message handling and error conditions
- Mock concurrent client connections for load testing

**CNC Machine Data Sources**
- Mock realistic sensor data generation for different machine types
- Mock machine state transitions (idle, running, maintenance, fault)
- Mock sensor reading variations and anomaly detection triggers
- Mock network connectivity issues for individual machines
- Mock machine configuration changes and parameter updates

## Test Data Requirements

### Realistic CNC Machine Data
- Spindle speed: 1000-8000 RPM with realistic variation patterns
- Coolant temperature: 18-25°C with thermal cycling behavior
- Power consumption: 5-50 kW based on operational state
- Vibration levels: 0.1-2.0 mm/s with predictive failure indicators
- Machine status: idle, running, maintenance, fault states

### UNS Topic Examples
```
Factory01/Line1/Machine01/Spindle/Telemetry
Factory01/Line1/Machine02/Coolant/Status
Factory01/Line2/Machine03/PowerConsumption/Telemetry
Factory01/Line2/Machine04/Maintenance/Alarms
Factory01/Line1/Machine05/Spindle/Events
```

### Message Payload Formats
```json
{
  "telemetry": {
    "spindle_speed": 4500,
    "spindle_load": 75.5,
    "spindle_temp": 42.3,
    "timestamp": "2025-07-29T12:34:56.789Z"
  },
  "status": {
    "operational_state": "running",
    "program_running": "PART_001_OP_010",
    "cycle_count": 1247,
    "last_maintenance": "2025-07-15T08:00:00Z"
  },
  "alarm": {
    "alarm_id": "ALM_001",
    "severity": "high",
    "message": "Spindle temperature exceeding normal range",
    "acknowledged": false,
    "timestamp": "2025-07-29T12:35:15.123Z"
  }
}
```

## Performance Benchmarks

### MQTT Message Throughput
- Target: 1000 messages per second across all 10 machines
- Latency: <100ms from publish to WebSocket delivery
- Memory usage: <500MB for broker connection management
- CPU usage: <50% during peak load scenarios

### Database Write Performance
- Target: 500 time-series inserts per second
- Batch processing: 50 messages per database transaction
- Query response time: <200ms for dashboard data retrieval
- Storage efficiency: Optimized for 1-year data retention