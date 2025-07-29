# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-07-29-uns-topic-hierarchy/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Test Coverage

### Unit Tests

**TopicValidator Class**
- `validateTopicPath()` - Validates ISA-95 compliant topic naming structure
- `validatePayloadSchema()` - Ensures JSON payload matches registered schema
- `parseTopicHierarchy()` - Correctly extracts hierarchy levels from topic path
- `validateDataRange()` - Confirms numeric values fall within defined min/max bounds
- `isValidUnit()` - Validates measurement units against standard units list

**TopicRegistry Class**
- `registerTopic()` - Successfully creates new topic registration with all required fields
- `updateTopicSchema()` - Updates existing topic schema while maintaining backward compatibility
- `deactivateTopic()` - Properly soft-deletes topic while preserving historical data
- `findTopicByPath()` - Retrieves topic metadata by exact path match
- `searchTopicsByPattern()` - Returns topics matching wildcard patterns

**MachineRegistry Class**
- `addMachine()` - Registers new CNC machine with complete hierarchy and capabilities
- `updateMachineStatus()` - Changes operational status with proper state transitions
- `getMachinesByLocation()` - Filters machines by enterprise/site/area/work_cell hierarchy
- `validateMachineId()` - Confirms machine ID exists and is active in registry

**UNSHierarchy Class**
- `buildTopicPath()` - Constructs valid topic path from hierarchy components
- `parseHierarchyLevels()` - Extracts ISA-95 levels from topic path string
- `validateHierarchyDepth()` - Ensures topic has required 5-level depth structure
- `getParentTopics()` - Returns all parent-level topics for given machine

### Integration Tests

**MQTT Topic Management Workflow**
- Topic registration creates valid MQTT topics in EMQX Cloud broker
- Schema validation prevents invalid payloads from being published
- Role-based subscription patterns correctly filter topics by user permissions
- Topic deactivation removes publishing permissions while preserving message history

**Database Integration**  
- Topic registry CRUD operations maintain referential integrity with CNC machines
- Hierarchical queries efficiently retrieve topics by location filters
- Topic schema updates trigger proper validation of existing message history
- Machine status changes propagate to related topics and subscriptions

**API Endpoint Integration**
- GET /api/uns/topics returns properly paginated and filtered results
- POST /api/uns/topics validates complete topic registration workflow
- Topic validation endpoint correctly identifies schema violations
- Role-based subscription endpoints return appropriate MQTT patterns

**Real-time Data Flow**
- Simulated CNC data publishes to correctly structured UNS topics
- Message payloads validate against registered schemas before storage
- Topic hierarchy enables efficient dashboard subscriptions by role
- Historical data retrieval works across all hierarchy levels

### Feature Tests

**End-to-End Topic Lifecycle**
- Industrial data architect registers new topic with complete schema definition
- CNC machine simulator publishes data to newly registered topic
- Factory manager dashboard subscribes to topic using wildcard patterns
- Maintenance technician accesses granular sensor data through specific topic subscription
- Topic schema evolution maintains backward compatibility with existing data

**Multi-Machine Topic Organization**
- All 10 CNC machines have complete topic hierarchies registered
- Topic paths correctly reflect physical location and logical organization
- Cross-machine queries work efficiently using hierarchy-based filtering
- Role-based access control prevents unauthorized topic access

**Schema Validation Workflow**
- Invalid JSON payloads are rejected with clear error messages
- Numeric values outside defined ranges trigger validation failures
- Required fields missing from payloads prevent message publication
- Schema updates validate against existing historical data

**Performance and Scalability**
- 500+ messages/second can be validated and routed through topic hierarchy
- Topic registry supports 1000+ registered topics with sub-second query response
- Hierarchical topic subscriptions scale to 100+ concurrent dashboard connections
- Database queries maintain performance with full 10-machine data load

## Mocking Requirements

### EMQX Cloud MQTT Broker
- **Mock Strategy**: Use MQTT.js test client with in-memory broker for unit tests
- Mock topic creation, ACL rule management, and message publishing/subscription
- Simulate connection failures and retry logic for broker unavailability
- Test wildcard topic subscription patterns and message routing

### Supabase Database Operations
- **Mock Strategy**: Use Supabase test client with Docker PostgreSQL instance
- Mock all database CRUD operations with proper transaction handling
- Simulate connection pooling and query timeout scenarios
- Test database constraint violations and error handling

### Schema Validation Services
- **Mock Strategy**: Mock AJV JSON schema validator with predefined test schemas
- Test schema compilation, validation success/failure scenarios
- Mock schema registry updates and version management
- Simulate performance under high-volume validation loads

### Time-based Operations
- **Mock Strategy**: Use Jest fake timers for timestamp-dependent operations
- Mock message timestamps for consistent test results
- Test timezone handling and ISO 8601 format validation
- Simulate time-based topic retention and cleanup operations

## Performance Test Requirements

### Topic Registration Load Test
- Register 1000+ topics simultaneously and measure response times
- Test database performance under concurrent topic creation requests
- Validate memory usage during large-scale topic hierarchy traversal

### MQTT Message Throughput Test
- Publish 500+ messages/second across all 10 CNC machines
- Measure topic validation performance under peak message load
- Test message queuing and backpressure handling

### Database Query Performance Test
- Execute hierarchical topic queries with response time < 100ms
- Test complex filtering operations across multiple hierarchy levels
- Validate index performance with full production data load

### Real-time Subscription Test
- Support 100+ concurrent dashboard subscriptions
- Test WebSocket connection stability under high message frequency
- Validate role-based filtering performance with complex subscription patterns