# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-29-cnc-machine-data-generators/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Test Coverage

### Unit Tests

**MachineGenerator Class**
- Should initialize with valid machine configuration
- Should generate realistic sensor data within expected ranges
- Should handle state transitions according to business logic
- Should validate sensor data formats and ranges
- Should handle simulation start/stop operations correctly
- Should generate appropriate data patterns for each operational state

**FactoryManager Class**
- Should manage multiple machine generators simultaneously
- Should provide centralized control for all machines
- Should handle bulk operations (start all, stop all) correctly
- Should aggregate status information across all machines
- Should handle individual machine failures gracefully

**SensorDataGenerator Functions**
- Should generate realistic spindle speed values with appropriate noise
- Should generate axis position data within machine specifications
- Should generate temperature readings with realistic patterns
- Should generate vibration data with state-appropriate characteristics
- Should include timestamp and metadata in all generated data

**StateManager Class**
- Should enforce valid state transitions only
- Should calculate realistic timing for state changes
- Should trigger appropriate sensor changes during state transitions
- Should handle maintenance and error state logic correctly
- Should maintain state history for analysis

**UNSPublisher Integration**
- Should publish data to correct UNS topic hierarchy
- Should format messages according to UNS standards
- Should handle MQTT connection failures gracefully
- Should retry failed publications with exponential backoff
- Should maintain message ordering for time-series data

### Integration Tests

**Database Integration**
- Should create and retrieve machine configurations correctly
- Should update machine states and track changes
- Should handle concurrent state updates safely
- Should maintain referential integrity between machines and states
- Should perform seed data operations successfully

**MQTT Integration**
- Should establish connection to EMQX Cloud broker
- Should publish sensor data to appropriate topics
- Should handle broker disconnections and reconnections
- Should respect topic access control lists (ACLs)
- Should maintain data consistency during network issues

**API Endpoints**
- Should respond correctly to all defined endpoints
- Should validate request parameters and return appropriate errors
- Should handle authentication and authorization properly
- Should return consistent response formats
- Should handle concurrent requests safely

**End-to-End Simulation**
- Should run complete machine simulation cycles
- Should demonstrate realistic operational patterns
- Should handle multiple machines running simultaneously
- Should maintain data consistency across all components
- Should provide real-time data flow to connected dashboards

### Mocking Requirements

- **EMQX Cloud MQTT Broker**: Mock MQTT client for unit tests, use test broker for integration tests
- **Supabase Database**: Use test database with isolated test data, mock client for unit tests
- **Time-based Operations**: Mock Date.now() and setTimeout for deterministic timing tests
- **Random Number Generation**: Mock Math.random() for reproducible sensor data patterns
- **External API Calls**: Mock any external service calls for isolated testing

### Performance Tests

**Load Testing**
- Should handle 10 machines generating data simultaneously
- Should maintain sub-second response times for API endpoints
- Should process sensor updates without memory leaks
- Should handle sustained data generation for extended periods

**Data Generation Performance**
- Should generate sensor data points within target frequency (1-2 seconds)
- Should maintain consistent data generation rates under load
- Should handle rapid state transitions without data corruption
- Should scale to additional machines without performance degradation

### Test Data Management

**Machine Configurations**
- Predefined test machine configurations for each machine type
- Valid and invalid configuration data for boundary testing
- State transition test scenarios with expected outcomes

**Sensor Data Patterns**
- Expected data ranges for each sensor type and machine state
- Anomaly patterns for error condition testing
- State transition data patterns for validation

**Database Test Data**
- Clean test database setup and teardown procedures
- Isolated test data that doesn't interfere with other tests
- Seed data for consistent test scenarios across test runs