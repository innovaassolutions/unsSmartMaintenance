-- TimescaleDB Setup Script for UNS Smart Maintenance
-- This script creates the time-series optimized tables and hypertables

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ==============================================
-- TIME-SERIES TABLES
-- ==============================================

-- Sensor Readings (High-frequency time-series data)
CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID DEFAULT gen_random_uuid(),
    sensor_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    value DECIMAL(15,6) NOT NULL,
    quality_code INTEGER DEFAULT 1,
    metadata JSONB,
    PRIMARY KEY (id, timestamp)
);

-- Create hypertable for sensor_readings (partitioned by time)
SELECT create_hypertable('sensor_readings', 'timestamp', 
    chunk_time_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Create indexes for sensor_readings
CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor_id_time 
    ON sensor_readings (sensor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_readings_timestamp 
    ON sensor_readings (timestamp DESC);

-- Machine Status (Operational state changes)
CREATE TABLE IF NOT EXISTS machine_status (
    id UUID DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'idle', 'maintenance', 'fault', 'offline')),
    uptime_seconds INTEGER,
    cycle_count INTEGER,
    efficiency_percent DECIMAL(5,2),
    metadata JSONB,
    PRIMARY KEY (id, timestamp)
);

-- Create hypertable for machine_status
SELECT create_hypertable('machine_status', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes for machine_status
CREATE INDEX IF NOT EXISTS idx_machine_status_machine_id_time 
    ON machine_status (machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_machine_status_timestamp 
    ON machine_status (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_machine_status_status 
    ON machine_status (status, timestamp DESC);

-- Alerts (Event-driven notifications)
CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL,
    sensor_id UUID,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('warning', 'critical', 'info')),
    severity INTEGER NOT NULL CHECK (severity BETWEEN 1 AND 5),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID,
    acknowledged_at TIMESTAMPTZ,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    metadata JSONB,
    PRIMARY KEY (id, timestamp)
);

-- Create hypertable for alerts
SELECT create_hypertable('alerts', 'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes for alerts
CREATE INDEX IF NOT EXISTS idx_alerts_machine_id_time 
    ON alerts (machine_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp 
    ON alerts (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_type_resolved 
    ON alerts (alert_type, resolved, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity 
    ON alerts (severity, timestamp DESC);

-- Maintenance Records (Time-based maintenance activities)
CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID DEFAULT gen_random_uuid(),
    machine_id UUID NOT NULL,
    category_id UUID,
    scheduled_date TIMESTAMPTZ NOT NULL,
    completed_date TIMESTAMPTZ,
    maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('preventive', 'corrective', 'predictive')),
    description TEXT NOT NULL,
    performed_by UUID,
    duration_minutes INTEGER,
    cost DECIMAL(10,2),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, scheduled_date)
);

-- Create hypertable for maintenance_records (using scheduled_date as time dimension)
SELECT create_hypertable('maintenance_records', 'scheduled_date',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- Create indexes for maintenance_records
CREATE INDEX IF NOT EXISTS idx_maintenance_records_machine_id_date 
    ON maintenance_records (machine_id, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_type_status 
    ON maintenance_records (maintenance_type, status, scheduled_date DESC);
CREATE INDEX IF NOT EXISTS idx_maintenance_records_created_at 
    ON maintenance_records (created_at DESC);

-- ==============================================
-- CONTINUOUS AGGREGATES (Pre-computed views)
-- ==============================================

-- Sensor readings aggregated by hour
CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT 
    sensor_id,
    time_bucket('1 hour', timestamp) AS bucket,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as reading_count,
    STDDEV(value) as stddev_value
FROM sensor_readings
GROUP BY sensor_id, bucket
WITH NO DATA;

-- Refresh policy for hourly aggregates
SELECT add_continuous_aggregate_policy('sensor_readings_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Machine status aggregated by hour
CREATE MATERIALIZED VIEW IF NOT EXISTS machine_status_hourly
WITH (timescaledb.continuous) AS
SELECT 
    machine_id,
    time_bucket('1 hour', timestamp) AS bucket,
    mode() WITHIN GROUP (ORDER BY status) as dominant_status,
    AVG(efficiency_percent) as avg_efficiency,
    SUM(uptime_seconds) as total_uptime_seconds,
    COUNT(*) as status_changes
FROM machine_status
GROUP BY machine_id, bucket
WITH NO DATA;

-- Refresh policy for machine status hourly aggregates
SELECT add_continuous_aggregate_policy('machine_status_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- ==============================================
-- DATA RETENTION POLICIES
-- ==============================================

-- Keep raw sensor readings for 90 days, then compress
SELECT add_retention_policy('sensor_readings', 
    INTERVAL '90 days',
    if_not_exists => TRUE
);

-- Keep raw machine status for 180 days
SELECT add_retention_policy('machine_status', 
    INTERVAL '180 days',
    if_not_exists => TRUE
);

-- Keep alerts for 1 year
SELECT add_retention_policy('alerts', 
    INTERVAL '1 year',
    if_not_exists => TRUE
);

-- Maintenance records kept indefinitely (business requirement)

-- ==============================================
-- COMPRESSION POLICIES (Disabled - requires columnstore)
-- ==============================================

-- Note: Compression requires columnstore which may not be available in all TimescaleDB Cloud tiers
-- Uncomment these if your TimescaleDB instance supports compression:

-- SELECT add_compression_policy('sensor_readings', 
--     INTERVAL '7 days',
--     if_not_exists => TRUE
-- );

-- SELECT add_compression_policy('machine_status', 
--     INTERVAL '14 days',
--     if_not_exists => TRUE
-- );

-- ==============================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================

-- Enable RLS on all tables
ALTER TABLE sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE machine_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be refined based on application needs)
-- Allow all operations for service role, restrict for others based on organization_id

-- Note: These policies will need to be updated once we establish 
-- the relationship between TimescaleDB data and Supabase organization data

COMMIT;