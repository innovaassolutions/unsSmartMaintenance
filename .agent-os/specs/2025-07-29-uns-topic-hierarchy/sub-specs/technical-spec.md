# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-29-uns-topic-hierarchy/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Technical Requirements

### ISA-95 Hierarchical Structure
- Implement 5-level ISA-95 hierarchy: Enterprise/Site/Area/WorkCell/WorkUnit
- Support for flexible equipment grouping and logical organization
- Hierarchical access control for different user roles
- Scalable structure supporting additional manufacturing sites

### UNS Four-Layer Architecture
- **Descriptive Layer**: Physical asset identification and location mapping
- **Functional Layer**: Equipment capabilities, operational parameters, and control functions  
- **Informational Layer**: Real-time sensor data, status updates, and operational metrics
- **Ad-hoc Layer**: Temporary communications, alerts, maintenance requests, and event-driven data

### MQTT Topic Performance Requirements
- Support for 10 concurrent CNC machines with 50+ data points each
- Message throughput: 500+ messages/second during peak operation
- Topic retention: 24-hour message history for troubleshooting
- QoS Level 1 for critical operational data, QoS Level 0 for high-frequency sensor readings

### Data Payload Standards
- JSON schema validation for all message payloads
- Timestamp standardization using ISO 8601 format with UTC timezone
- Unit standardization following International System of Units (SI)
- Message size optimization: maximum 1KB per MQTT message

## Approach Options

**Option A: Flat Topic Structure with Metadata**
- Pros: Simple implementation, fast topic lookups, minimal nesting
- Cons: Limited hierarchical organization, difficult role-based access control

**Option B: Deep Hierarchical Topic Structure** (Selected)
- Pros: True ISA-95 compliance, excellent role-based access, scalable organization
- Cons: More complex topic management, potential performance considerations

**Option C: Hybrid Approach with Topic Aliases**
- Pros: Best of both worlds, backward compatibility
- Cons: Additional complexity, potential confusion with dual addressing

**Rationale:** Selected Option B because ISA-95 compliance is essential for industrial adoption, and the hierarchical structure directly supports our multi-role dashboard requirements. The performance considerations are manageable with proper EMQX Cloud configuration.

## External Dependencies

### Topic Hierarchy Management
- **mqtt-pattern** - MQTT topic pattern matching and validation
- **Justification:** Provides robust topic pattern matching for subscription management and access control validation

### Schema Validation
- **ajv** - JSON schema validation for MQTT payloads
- **Justification:** Industry-standard JSON schema validator with excellent performance and comprehensive validation features

### Topic Documentation
- **@asyncapi/parser** - AsyncAPI specification for MQTT topic documentation
- **Justification:** Enables automated documentation generation and API contract management for MQTT topics

## Implementation Architecture

### Topic Naming Convention
```
{enterprise}/{site}/{area}/{workcell}/{workunit}/{layer}/{datatype}/{metric}
```

Example Topics:
```
uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed
uns-demo/factory-floor/machining/cell-01/cnc-001/info/status/operational-state  
uns-demo/factory-floor/machining/cell-01/cnc-001/func/capabilities/max-rpm
uns-demo/factory-floor/machining/cell-01/cnc-001/desc/identity/manufacturer
```

### CNC Machine Data Categories
- **Sensors**: Temperature, vibration, spindle speed, feed rate, power consumption
- **Status**: Operational state, alarm conditions, program execution, tool status
- **Production**: Part count, cycle time, quality metrics, efficiency ratios
- **Maintenance**: Tool wear, scheduled maintenance, fault history, component health

### Message Payload Schema
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "cnc-001",
  "value": 1250.5,
  "unit": "rpm",
  "quality": "good",
  "metadata": {
    "location": "cell-01",
    "operator": "tech-001"
  }
}
```