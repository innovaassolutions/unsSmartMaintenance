# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-29-emqx-mqtt-broker-setup/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## MQTT Configuration Schema Changes

Since this spec focuses on MQTT broker setup and doesn't directly require new database tables, the schema changes will be minimal and focused on configuration storage.

### New Tables Required

#### mqtt_connections
```sql
CREATE TABLE mqtt_connections (
  id SERIAL PRIMARY KEY,
  connection_name VARCHAR(100) NOT NULL UNIQUE,
  broker_endpoint VARCHAR(255) NOT NULL,
  port INTEGER NOT NULL DEFAULT 8883,
  protocol VARCHAR(10) NOT NULL DEFAULT 'mqtts',
  username VARCHAR(100),
  password_hash VARCHAR(255),
  client_id_prefix VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### mqtt_topics
```sql
CREATE TABLE mqtt_topics (
  id SERIAL PRIMARY KEY,
  topic_path VARCHAR(255) NOT NULL UNIQUE,
  topic_type VARCHAR(50) NOT NULL, -- 'status', 'telemetry', 'alarms', 'events', 'commands', 'responses'
  qos_level INTEGER DEFAULT 1 CHECK (qos_level IN (0, 1, 2)),
  retain_messages BOOLEAN DEFAULT false,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### mqtt_acl_rules
```sql
CREATE TABLE mqtt_acl_rules (
  id SERIAL PRIMARY KEY,
  connection_id INTEGER REFERENCES mqtt_connections(id) ON DELETE CASCADE,
  topic_pattern VARCHAR(255) NOT NULL,
  permission VARCHAR(10) NOT NULL CHECK (permission IN ('pub', 'sub', 'pubsub')),
  priority INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Existing Table Enhancements

#### machines table (if exists)
```sql
-- Add MQTT-specific columns to existing machines table
ALTER TABLE machines ADD COLUMN IF NOT EXISTS mqtt_client_id VARCHAR(100);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS mqtt_topic_prefix VARCHAR(255);
ALTER TABLE machines ADD COLUMN IF NOT EXISTS last_mqtt_message_at TIMESTAMP;
```

## Indexes for Performance

```sql
-- Optimize MQTT topic lookups
CREATE INDEX idx_mqtt_topics_path ON mqtt_topics(topic_path);
CREATE INDEX idx_mqtt_topics_type ON mqtt_topics(topic_type);

-- Optimize ACL rule queries
CREATE INDEX idx_mqtt_acl_connection_topic ON mqtt_acl_rules(connection_id, topic_pattern);

-- Optimize machine MQTT queries
CREATE INDEX idx_machines_mqtt_client ON machines(mqtt_client_id) WHERE mqtt_client_id IS NOT NULL;
```

## Data Migration Considerations

### Initial Data Population
```sql
-- Insert default MQTT connection configuration
INSERT INTO mqtt_connections (connection_name, broker_endpoint, port, protocol, client_id_prefix)
VALUES ('emqx_cloud_primary', 'YOUR_EMQX_ENDPOINT.com', 8883, 'mqtts', 'uns_demo');

-- Insert UNS topic hierarchy
INSERT INTO mqtt_topics (topic_path, topic_type, qos_level, retain_messages, description) VALUES
('Factory01/+/+/Spindle/Status', 'status', 1, true, 'CNC machine spindle operational status'),
('Factory01/+/+/Spindle/Telemetry', 'telemetry', 0, false, 'Real-time spindle sensor data'),
('Factory01/+/+/Coolant/Status', 'status', 1, true, 'Coolant system operational status'),
('Factory01/+/+/Coolant/Telemetry', 'telemetry', 0, false, 'Real-time coolant sensor data'),
('Factory01/+/+/PowerConsumption/Telemetry', 'telemetry', 0, false, 'Real-time power consumption data'),
('Factory01/+/+/Maintenance/Alarms', 'alarms', 2, true, 'Critical maintenance alerts'),
('Factory01/+/+/Maintenance/Events', 'events', 1, false, 'Maintenance state changes'),
('Factory01/+/Commands', 'commands', 2, false, 'Machine operational commands'),
('Factory01/+/Responses', 'responses', 1, false, 'Command acknowledgments');
```

## Rationale

The database schema changes are minimal because MQTT broker configuration is primarily handled by EMQX Cloud and environment variables. The tables focus on:

1. **Configuration Management**: Store connection details and topic definitions for application reference
2. **Security Control**: Manage ACL rules for topic access permissions
3. **Operational Visibility**: Track MQTT client associations with physical machines
4. **Topic Registry**: Maintain standardized UNS topic hierarchy for validation and documentation

This approach keeps the database lightweight while providing necessary configuration management and audit capabilities for the MQTT infrastructure.