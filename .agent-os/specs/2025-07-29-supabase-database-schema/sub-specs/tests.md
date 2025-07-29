# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-29-supabase-database-schema/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Test Coverage

### Unit Tests

**Database Connection and Configuration**
- Test Supabase client initialization with correct environment variables
- Test database connection establishment and authentication
- Test Prisma client initialization and schema synchronization
- Test environment variable validation for database configuration

**Database Schema Validation**
- Test all table creation with proper column types and constraints
- Test foreign key relationships between machines, sensors, and sensor_data tables
- Test unique constraints on machine_id and sensor configurations
- Test CHECK constraints on status fields and alert severity levels
- Test default value assignment for timestamps and status fields

**Row Level Security (RLS) Policies**
- Test RLS policy creation and activation on all tables
- Test authenticated user access permissions for read operations
- Test user profile update restrictions (users can only modify their own profiles)
- Test data isolation between different user roles and departments

### Integration Tests

**Machine and Sensor Management**
- Test complete machine registration workflow with sensor configuration
- Test sensor data insertion with proper foreign key relationships
- Test machine status updates and cascading effects on related data
- Test bulk sensor data insertion performance for high-frequency scenarios

**Time-Series Data Operations**
- Test sensor data insertion with various timestamp ranges and values
- Test time-series data retrieval with date range filtering
- Test aggregation queries for dashboard metrics (hourly, daily averages)
- Test data quality flag handling and filtering for analytics queries

**Maintenance System Workflows**
- Test maintenance record creation linked to specific machines
- Test maintenance schedule management with status transitions
- Test alert generation and acknowledgment workflows
- Test maintenance history queries for predictive analytics preparation

**Real-Time Subscriptions**
- Test Supabase real-time subscription setup for sensor_data table
- Test live data updates for dashboard components during sensor data insertion
- Test subscription filtering by machine_id and sensor_type
- Test connection handling and automatic reconnection scenarios

### Performance Tests

**Database Index Effectiveness**
- Test query performance for time-series data with timestamp-based indexes
- Test machine lookup performance using location and functional_area indexes  
- Test alert retrieval performance with composite indexes
- Benchmark sensor data insertion rates for 10 concurrent CNC machines

**Concurrent Operation Handling**
- Test simultaneous sensor data insertions from multiple machine simulators
- Test concurrent user sessions with dashboard queries and real-time updates
- Test maintenance record updates during active sensor data collection
- Test database performance under simulated production data volumes

### Mocking Requirements

- **Supabase Client:** Mock for unit tests to avoid database dependencies during CI/CD
- **MQTT Data Simulation:** Mock sensor data generators for consistent test scenarios
- **Time-based Tests:** Mock timestamp generation for predictable time-series test data
- **Authentication Context:** Mock Supabase auth context for RLS policy testing
- **Real-time Subscriptions:** Mock WebSocket connections for subscription testing