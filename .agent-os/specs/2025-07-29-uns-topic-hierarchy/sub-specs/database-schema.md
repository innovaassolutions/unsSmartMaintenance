# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-29-uns-topic-hierarchy/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Schema Changes

### New Tables

#### topic_registry
Stores the complete UNS topic hierarchy and metadata for validation and management.

```sql
CREATE TABLE topic_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_path TEXT NOT NULL UNIQUE,
  topic_type VARCHAR(20) NOT NULL CHECK (topic_type IN ('descriptive', 'functional', 'informational', 'ad_hoc')),
  enterprise VARCHAR(50) NOT NULL,
  site VARCHAR(50) NOT NULL,
  area VARCHAR(50) NOT NULL,
  work_cell VARCHAR(50) NOT NULL,
  work_unit VARCHAR(50) NOT NULL,
  data_category VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  description TEXT,
  unit VARCHAR(20),
  data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('number', 'string', 'boolean', 'object')),
  min_value DECIMAL,
  max_value DECIMAL,
  schema_definition JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### cnc_machines
Defines the 10 simulated CNC machines and their physical/logical organization.

```sql
CREATE TABLE cnc_machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id VARCHAR(20) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(50),
  model VARCHAR(50),
  enterprise VARCHAR(50) NOT NULL,
  site VARCHAR(50) NOT NULL,
  area VARCHAR(50) NOT NULL,
  work_cell VARCHAR(50) NOT NULL,
  installation_date DATE,
  operational_status VARCHAR(20) DEFAULT 'operational' CHECK (operational_status IN ('operational', 'maintenance', 'offline', 'error')),
  capabilities JSONB,
  specifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### topic_subscriptions
Manages role-based access control for topic subscriptions by user type.

```sql
CREATE TABLE topic_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role VARCHAR(50) NOT NULL CHECK (user_role IN ('factory_manager', 'production_manager', 'maintenance_technician', 'executive')),
  topic_pattern TEXT NOT NULL,
  access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('read', 'write', 'admin')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes and Constraints

```sql
-- Performance indexes for topic lookups
CREATE INDEX idx_topic_registry_path ON topic_registry(topic_path);
CREATE INDEX idx_topic_registry_hierarchy ON topic_registry(enterprise, site, area, work_cell, work_unit);
CREATE INDEX idx_topic_registry_type ON topic_registry(topic_type);
CREATE INDEX idx_topic_registry_active ON topic_registry(is_active) WHERE is_active = true;

-- Machine lookup indexes
CREATE INDEX idx_cnc_machines_id ON cnc_machines(machine_id);
CREATE INDEX idx_cnc_machines_location ON cnc_machines(enterprise, site, area, work_cell);
CREATE INDEX idx_cnc_machines_status ON cnc_machines(operational_status);

-- Subscription pattern matching
CREATE INDEX idx_topic_subscriptions_role ON topic_subscriptions(user_role);
CREATE INDEX idx_topic_subscriptions_active ON topic_subscriptions(is_active) WHERE is_active = true;

-- Foreign key relationships
ALTER TABLE topic_registry ADD CONSTRAINT fk_topic_machine 
  FOREIGN KEY (work_unit) REFERENCES cnc_machines(machine_id);
```

### Data Migration Scripts

#### Initial CNC Machine Setup
```sql
-- Insert 10 simulated CNC machines
INSERT INTO cnc_machines (machine_id, display_name, manufacturer, model, enterprise, site, area, work_cell, capabilities, specifications) VALUES
('cnc-001', 'Haas VF-2 Mill #1', 'Haas', 'VF-2', 'uns-demo', 'factory-floor', 'machining', 'cell-01', 
 '{"spindle_rpm": 8100, "axes": 3, "tool_changer": true}', 
 '{"work_envelope": "30x16x20", "spindle_power": "20hp"}'),
('cnc-002', 'Haas VF-2 Mill #2', 'Haas', 'VF-2', 'uns-demo', 'factory-floor', 'machining', 'cell-01',
 '{"spindle_rpm": 8100, "axes": 3, "tool_changer": true}', 
 '{"work_envelope": "30x16x20", "spindle_power": "20hp"}'),
('cnc-003', 'DMG Mori NLX2500', 'DMG Mori', 'NLX2500', 'uns-demo', 'factory-floor', 'turning', 'cell-02',
 '{"spindle_rpm": 4000, "axes": 2, "live_tooling": true}', 
 '{"max_diameter": "320mm", "max_length": "650mm"}'),
('cnc-004', 'DMG Mori NLX2500', 'DMG Mori', 'NLX2500', 'uns-demo', 'factory-floor', 'turning', 'cell-02',
 '{"spindle_rpm": 4000, "axes": 2, "live_tooling": true}', 
 '{"max_diameter": "320mm", "max_length": "650mm"}'),
('cnc-005', 'Mazak Integrex i-300', 'Mazak', 'Integrex i-300', 'uns-demo', 'factory-floor', 'multi-axis', 'cell-03',
 '{"spindle_rpm": 6000, "axes": 5, "mill_turn": true}', 
 '{"simultaneous_5axis": true, "b_axis": 120}');

-- Continue with remaining machines...
```

#### Topic Registry Population
```sql
-- Populate standard UNS topics for each machine
INSERT INTO topic_registry (topic_path, topic_type, enterprise, site, area, work_cell, work_unit, data_category, metric_name, description, unit, data_type, schema_definition) VALUES
('uns-demo/factory-floor/machining/cell-01/cnc-001/info/sensors/spindle-speed', 'informational', 'uns-demo', 'factory-floor', 'machining', 'cell-01', 'cnc-001', 'sensors', 'spindle-speed', 'Current spindle rotation speed', 'rpm', 'number', '{"type": "number", "minimum": 0, "maximum": 8100}'),
('uns-demo/factory-floor/machining/cell-01/cnc-001/info/status/operational-state', 'informational', 'uns-demo', 'factory-floor', 'machining', 'cell-01', 'cnc-001', 'status', 'operational-state', 'Current machine operational status', null, 'string', '{"type": "string", "enum": ["running", "idle", "maintenance", "error", "setup"]}'),
('uns-demo/factory-floor/machining/cell-01/cnc-001/desc/identity/manufacturer', 'descriptive', 'uns-demo', 'factory-floor', 'machining', 'cell-01', 'cnc-001', 'identity', 'manufacturer', 'Equipment manufacturer name', null, 'string', '{"type": "string", "maxLength": 50}');
```

## Rationale

### Topic Registry Centralization
The topic_registry table provides centralized management of all UNS topics, enabling validation, schema enforcement, and role-based access control. This is essential for maintaining data quality and consistency across the MQTT ecosystem.

### Machine-Centric Organization
The cnc_machines table establishes the physical and logical organization of equipment, supporting the ISA-95 hierarchical structure while providing flexibility for different machine types and configurations.

### Role-Based Access Control
The topic_subscriptions table enables fine-grained access control based on user roles, supporting the multi-dashboard architecture where different users need access to different data sets.

## Performance Considerations

- JSONB storage provides efficient querying of machine capabilities and specifications
- Partial indexes on active records improve query performance
- Topic path indexing enables fast MQTT topic resolution
- Hierarchical indexing supports drill-down queries from enterprise to work unit level