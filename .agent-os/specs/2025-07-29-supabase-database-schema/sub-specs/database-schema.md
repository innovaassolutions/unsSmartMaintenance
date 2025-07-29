# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-29-supabase-database-schema/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Schema Changes

### New Tables

1. **machines** - Core machine registry with UNS hierarchy support
2. **machine_sensors** - Sensor configuration and metadata
3. **sensor_data** - Time-series sensor readings
4. **maintenance_records** - Historical maintenance activities
5. **maintenance_schedules** - Planned maintenance tasks
6. **alerts** - System alerts and notifications
7. **user_profiles** - Extended user information beyond Supabase auth
8. **user_roles** - Role-based access control

### New Indexes

- Time-series data indexes for efficient range queries
- UNS hierarchy path indexes for quick machine lookups
- Composite indexes for dashboard query optimization

### New Migrations

- Initial schema creation with all core tables
- RLS policy setup for secure data access
- Real-time subscription configuration

## Database Schema Specifications

### Core UNS and Machine Tables

```sql
-- Core machine registry following UNS hierarchy
CREATE TABLE machines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id VARCHAR(50) UNIQUE NOT NULL, -- e.g., "CNC_001"
  name VARCHAR(100) NOT NULL,
  manufacturer VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  serial_number VARCHAR(100),
  
  -- UNS Hierarchy Structure
  location VARCHAR(100) NOT NULL, -- Descriptive layer: "Factory_A/Line_1"
  functional_area VARCHAR(50) NOT NULL, -- Functional layer: "Machining"
  
  -- Machine specifications (JSON for flexibility)
  specifications JSONB DEFAULT '{}',
  operational_parameters JSONB DEFAULT '{}',
  
  -- Status and metadata
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'offline')),
  installation_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sensor configuration and metadata
CREATE TABLE machine_sensors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  sensor_type VARCHAR(50) NOT NULL, -- 'temperature', 'vibration', 'pressure', etc.
  sensor_name VARCHAR(100) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  min_value DECIMAL(10,3),
  max_value DECIMAL(10,3),
  warning_threshold DECIMAL(10,3),
  critical_threshold DECIMAL(10,3),
  mqtt_topic VARCHAR(200) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(machine_id, sensor_type, sensor_name)
);
```

### Time-Series Data Storage

```sql
-- Optimized time-series sensor data storage
CREATE TABLE sensor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sensor_id UUID REFERENCES machine_sensors(id) ON DELETE CASCADE,
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  value DECIMAL(12,4) NOT NULL,
  quality VARCHAR(10) DEFAULT 'good' CHECK (quality IN ('good', 'uncertain', 'bad')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Partitioning for time-series data (enable when data volume grows)
-- CREATE TABLE sensor_data_y2025m07 PARTITION OF sensor_data
-- FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
```

### Maintenance System Tables

```sql
-- Historical maintenance records
CREATE TABLE maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL, -- 'preventive', 'corrective', 'predictive'
  description TEXT NOT NULL,
  performed_by VARCHAR(100),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER,
  cost DECIMAL(10,2),
  parts_replaced TEXT[],
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Scheduled maintenance tasks
CREATE TABLE maintenance_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  maintenance_type VARCHAR(50) NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_duration_minutes INTEGER,
  assigned_to VARCHAR(100),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- System alerts and notifications
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  sensor_id UUID REFERENCES machine_sensors(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'threshold', 'prediction', 'maintenance', 'system'
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved'))
);
```

### User Management Tables

```sql
-- Extended user profiles (complements Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(100),
  role VARCHAR(50) NOT NULL CHECK (role IN ('factory_manager', 'production_manager', 'maintenance_tech', 'executive')),
  department VARCHAR(50),
  phone VARCHAR(20),
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Performance Indexes

```sql
-- Time-series data indexes for efficient queries
CREATE INDEX idx_sensor_data_machine_timestamp ON sensor_data(machine_id, timestamp DESC);
CREATE INDEX idx_sensor_data_sensor_timestamp ON sensor_data(sensor_id, timestamp DESC);
CREATE INDEX idx_sensor_data_timestamp ON sensor_data(timestamp DESC);

-- Machine lookup indexes
CREATE INDEX idx_machines_location ON machines(location);
CREATE INDEX idx_machines_functional_area ON machines(functional_area);
CREATE INDEX idx_machines_status ON machines(status);

-- Alert management indexes
CREATE INDEX idx_alerts_machine_status ON alerts(machine_id, status);
CREATE INDEX idx_alerts_triggered_at ON alerts(triggered_at DESC);
CREATE INDEX idx_alerts_severity ON alerts(severity);

-- Maintenance scheduling indexes
CREATE INDEX idx_maintenance_schedules_machine_date ON maintenance_schedules(machine_id, scheduled_date);
CREATE INDEX idx_maintenance_schedules_status ON maintenance_schedules(status);
```

### Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_sensors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Basic read policies (authenticated users can read all data)
CREATE POLICY "authenticated_read_machines" ON machines FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_sensors" ON machine_sensors FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_sensor_data" ON sensor_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_maintenance" ON maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_schedules" ON maintenance_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "authenticated_read_alerts" ON alerts FOR SELECT TO authenticated USING (true);

-- User profiles - users can read all profiles but only update their own
CREATE POLICY "authenticated_read_profiles" ON user_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_update_own_profile" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "users_insert_own_profile" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
```

## Rationale

The normalized approach provides optimal performance for both real-time data ingestion and analytical queries required by the UNS Smart Maintenance system. The UNS hierarchy is implemented through structured fields rather than a single path column, enabling efficient filtering and aggregation operations.

Time-series data is stored in a dedicated table with proper indexing to support both real-time dashboard queries and historical analysis for predictive models. JSON fields provide flexibility for machine specifications while maintaining structured data for critical operational fields.

Row Level Security ensures secure multi-user access while maintaining simplicity for the demonstration system. The maintenance-related tables support both preventive and predictive maintenance workflows, providing a foundation for the prescriptive maintenance features in later phases.

## Consequences

**Positive:**
- Optimized query performance for real-time dashboards across all user roles
- Scalable time-series data storage supporting high-frequency sensor data ingestion
- Flexible machine configuration storage accommodating heterogeneous CNC equipment
- Secure multi-user access with role-based data visibility

**Negative:**
- Complex schema requiring careful migration management as features evolve
- Multiple table joins required for comprehensive machine status queries
- Potential need for future partitioning as time-series data volume grows