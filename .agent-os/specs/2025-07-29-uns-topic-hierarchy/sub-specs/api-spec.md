# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-29-uns-topic-hierarchy/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Endpoints

### GET /api/uns/topics

**Purpose:** Retrieve UNS topic hierarchy with optional filtering and pagination
**Parameters:** 
- `enterprise` (optional): Filter by enterprise level
- `site` (optional): Filter by site level  
- `area` (optional): Filter by area level
- `work_cell` (optional): Filter by work cell level
- `work_unit` (optional): Filter by work unit (machine) level
- `topic_type` (optional): Filter by UNS layer (descriptive, functional, informational, ad_hoc)
- `active_only` (optional): Return only active topics (default: true)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 50, max: 200)

**Response:** 
```json
{
  "topics": [
    {
      "id": "uuid",
      "topic_path": "uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed",
      "topic_type": "informational",
      "hierarchy": {
        "enterprise": "uns-demo",
        "site": "factory-floor", 
        "area": "machining",
        "work_cell": "cell-01",
        "work_unit": "cnc-001"
      },
      "data_category": "sensors",
      "metric_name": "spindle-speed",
      "description": "Current spindle rotation speed",
      "unit": "rpm",
      "data_type": "number",
      "schema_definition": {"type": "number", "minimum": 0, "maximum": 8100},
      "is_active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "total_pages": 3
  }
}
```
**Errors:** 400 (Invalid filter parameters), 500 (Database error)

### POST /api/uns/topics

**Purpose:** Create new UNS topic registration
**Parameters:** Request body with topic definition
**Request Body:**
```json
{
  "topic_path": "uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/new-metric",
  "topic_type": "informational",
  "enterprise": "uns-demo",
  "site": "factory-floor",
  "area": "machining", 
  "work_cell": "cell-01",
  "work_unit": "cnc-001",
  "data_category": "sensors",
  "metric_name": "new-metric",
  "description": "Description of new metric",
  "unit": "units",
  "data_type": "number",
  "schema_definition": {"type": "number", "minimum": 0},
  "min_value": 0,
  "max_value": 1000
}
```
**Response:** 
```json
{
  "id": "uuid",
  "topic_path": "uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/new-metric",
  "message": "Topic registered successfully"
}
```
**Errors:** 400 (Invalid topic format, duplicate topic), 401 (Unauthorized), 500 (Database error)

### PUT /api/uns/topics/:id

**Purpose:** Update existing UNS topic registration
**Parameters:** Topic ID in URL path, updated topic definition in request body
**Request Body:** Same as POST /api/uns/topics
**Response:** 
```json
{
  "id": "uuid",
  "topic_path": "updated/topic/path",
  "message": "Topic updated successfully"
}
```
**Errors:** 400 (Invalid data), 404 (Topic not found), 401 (Unauthorized), 500 (Database error)

### DELETE /api/uns/topics/:id

**Purpose:** Deactivate UNS topic (soft delete)
**Parameters:** Topic ID in URL path
**Response:**
```json
{
  "id": "uuid", 
  "message": "Topic deactivated successfully"
}
```
**Errors:** 404 (Topic not found), 401 (Unauthorized), 500 (Database error)

### GET /api/uns/machines

**Purpose:** Retrieve CNC machine registry with hierarchy information
**Parameters:**
- `enterprise` (optional): Filter by enterprise
- `site` (optional): Filter by site
- `area` (optional): Filter by area  
- `work_cell` (optional): Filter by work cell
- `status` (optional): Filter by operational status

**Response:**
```json
{
  "machines": [
    {
      "id": "uuid",
      "machine_id": "cnc-001",
      "display_name": "Haas VF-2 Mill #1",
      "manufacturer": "Haas",
      "model": "VF-2",
      "hierarchy": {
        "enterprise": "uns-demo",
        "site": "factory-floor",
        "area": "machining", 
        "work_cell": "cell-01"
      },
      "operational_status": "operational",
      "capabilities": {"spindle_rpm": 8100, "axes": 3},
      "specifications": {"work_envelope": "30x16x20"}
    }
  ]
}
```
**Errors:** 400 (Invalid parameters), 500 (Database error)

### POST /api/uns/validate-topic

**Purpose:** Validate topic path against UNS naming conventions and schema
**Parameters:** Topic validation request in body
**Request Body:**
```json
{
  "topic_path": "uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed",
  "payload": {
    "timestamp": "2025-01-15T10:30:00.000Z",
    "source": "cnc-001", 
    "value": 1250.5,
    "unit": "rpm"
  }
}
```
**Response:**
```json
{
  "valid": true,
  "topic_exists": true,
  "schema_valid": true,
  "hierarchy_valid": true,
  "validation_details": {
    "topic_structure": "valid",
    "payload_schema": "valid", 
    "data_range": "valid"
  }
}
```
**Errors:** 400 (Invalid request format), 422 (Validation failed), 500 (Validation service error)

### GET /api/uns/subscriptions/:role

**Purpose:** Get topic subscription patterns for specific user role
**Parameters:** User role in URL path (factory_manager, production_manager, maintenance_technician, executive)
**Response:**
```json
{
  "role": "factory_manager",
  "subscriptions": [
    {
      "topic_pattern": "uns-demo/+/+/+/+/info/status/+",
      "access_level": "read",
      "description": "All machine status information"
    },
    {
      "topic_pattern": "uns-demo/+/+/+/+/info/production/+", 
      "access_level": "read",
      "description": "Production metrics and KPIs"
    }
  ]
}
```
**Errors:** 400 (Invalid role), 404 (Role not found), 500 (Database error)

## Controllers

### TopicController
- **validateTopicPath()**: Validates topic against ISA-95 and UNS naming conventions
- **registerTopic()**: Creates new topic registration with schema validation
- **updateTopic()**: Updates existing topic metadata and schema
- **deactivateTopic()**: Soft deletes topic registration
- **getTopicHierarchy()**: Retrieves topic tree structure for navigation

### MachineController  
- **getMachineRegistry()**: Returns registered CNC machines with hierarchy
- **validateMachineExists()**: Confirms machine ID exists in registry
- **getMachineCapabilities()**: Returns machine specifications and capabilities
- **updateMachineStatus()**: Updates operational status of machines

### SubscriptionController
- **getRoleSubscriptions()**: Returns MQTT topic patterns for user roles
- **validateAccess()**: Checks if user role can access specific topics
- **generateTopicPatterns()**: Creates MQTT wildcard patterns for role-based access

## Integration Requirements

### EMQX Cloud Authentication
- API endpoints must validate EMQX Cloud connectivity
- Topic registration automatically configures EMQX ACL rules
- Real-time validation of topic publishing permissions

### Schema Registry Integration
- Topic schemas stored in database and validated on registration
- JSON Schema validation for all MQTT message payloads
- Version control for schema updates and backward compatibility

### Supabase Real-time Integration
- Topic registry changes trigger real-time notifications
- Machine status updates propagate to connected dashboards
- Role-based subscription management with RLS policies