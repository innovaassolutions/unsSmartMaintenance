# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-29-mqtt-supabase-pipeline/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Test Coverage

### Unit Tests

**MQTTConsumer**
- Connection establishment with valid credentials
- Automatic reconnection after network failure
- Topic subscription with QoS settings
- Message parsing and extraction
- Connection error handling and logging
- Graceful shutdown and cleanup

**DataValidator**
- Schema validation for different sensor types
- Numeric range validation for sensor readings
- Data type conversion and sanitization
- Invalid payload rejection and error logging
- Quality code validation and default assignment
- Timestamp parsing and normalization

**DatabaseService**
- Batch insert operations for sensor readings
- Connection pool management and health checks
- Transaction handling for data consistency
- Time-series data partitioning verification
- Metric recording for pipeline performance
- Error logging for failed database operations

**MessageProcessor**
- End-to-end message processing pipeline
- Error handling for validation failures
- Retry logic for transient database errors
- Dead letter queue for persistently failing messages
- Message acknowledgment and flow control
- Performance metrics collection and reporting

### Integration Tests

**MQTT to Database Flow**
- Complete message flow from MQTT subscription to database storage
- Data integrity verification across the pipeline
- Performance testing with high message volumes
- Connection recovery after database outages
- Message ordering preservation for time-series data
- Real-time subscription triggering for dashboard updates

**API Endpoint Integration**
- Health check endpoint with live pipeline status
- Sensor data queries with proper filtering and aggregation
- Error log retrieval with accurate timestamps and metadata
- Pipeline metrics collection and reporting accuracy
- Administrative restart functionality with graceful shutdown
- Authentication and authorization for protected endpoints

**Database Schema Integration**
- TimescaleDB hypertable creation and optimization
- Automatic data compression and retention policies
- View materialization for dashboard performance
- Foreign key constraints and referential integrity
- Index performance for common query patterns
- Migration scripts execution and rollback testing

### Feature Tests

**High-Volume Data Processing**
- Process 500+ messages per second without data loss
- Maintain sub-second latency under peak load
- Memory usage stability during extended operation
- CPU utilization optimization for batch processing
- Network bandwidth efficiency for MQTT communication
- Database connection pooling under concurrent load

**Pipeline Reliability and Recovery**
- Automatic recovery from MQTT broker disconnection
- Database connection failure handling and reconnection
- Service restart with state preservation and message replay
- Error rate monitoring and alerting threshold validation
- Data quality scoring and degradation detection
- Graceful shutdown with message processing completion

**Real-Time Dashboard Integration**
- Supabase real-time event triggering for new sensor data
- WebSocket connection management for multiple dashboard clients
- Data freshness verification in dashboard interfaces
- Message filtering and routing for role-based access
- Performance impact measurement of real-time subscriptions
- Scalability testing with multiple concurrent dashboard users

### Mocking Requirements

**MQTT Broker Mock**: Simulate EMQX Cloud with configurable message patterns, connection failures, and QoS behavior
**Database Mock**: Mock Supabase client with controllable latency, connection errors, and transaction behavior
**Time Mock**: Control timestamp generation for deterministic testing of time-series data
**Network Mock**: Simulate network conditions including latency, packet loss, and intermittent connectivity
**System Resource Mock**: Control memory and CPU constraints for performance testing scenarios

## Test Data

### Sensor Reading Test Cases
- Valid temperature readings: 20-80°C with 0.1°C precision
- Valid vibration data: 0-10 mm/s with quality codes 192, 64, 0
- Valid spindle speed: 0-3000 RPM with integer values
- Invalid data: null values, out-of-range numbers, wrong data types
- Edge cases: maximum/minimum values, floating-point precision limits

### MQTT Message Formats
```json
{
  "valid_temperature": {
    "timestamp": "2025-07-29T10:30:00Z",
    "machineId": "123e4567-e89b-12d3-a456-426614174000",
    "sensorType": "temperature",
    "value": 65.2,
    "unit": "celsius",
    "quality": 192
  },
  "invalid_schema": {
    "timestamp": "invalid_timestamp",
    "machineId": "not_a_uuid",
    "value": "not_a_number"
  },
  "missing_fields": {
    "timestamp": "2025-07-29T10:30:00Z",
    "value": 45.2
  }
}
```

### Performance Test Scenarios
- **Baseline Load**: 50 messages/second across 10 machines
- **Peak Load**: 500 messages/second with burst patterns
- **Sustained Load**: 200 messages/second for 24-hour duration
- **Recovery Test**: Service restart during peak message processing
- **Network Degradation**: Increased latency and packet loss simulation

## Test Environment Setup

### Database Configuration
- Separate test database with TimescaleDB extension
- Automated schema migration for test isolation
- Test data cleanup between test runs
- Connection pooling configuration for concurrent tests

### MQTT Test Broker
- Local Mosquitto broker for unit and integration tests
- Test topic hierarchy matching production UNS structure
- Configurable message publishing rates and patterns
- Authentication and authorization simulation

### Monitoring and Observability
- Test metrics collection and validation
- Log output verification for error conditions
- Performance benchmark recording and comparison
- Test coverage reporting with minimum 90% requirement