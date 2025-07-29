# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-29-mqtt-supabase-pipeline/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Schema Changes

### New Tables

#### sensor_readings
Time-series table for storing all CNC machine sensor data with TimescaleDB optimization.

```sql
CREATE TABLE sensor_readings (
  id BIGSERIAL PRIMARY KEY,
  machine_id UUID NOT NULL REFERENCES cnc_machines(id),
  sensor_type VARCHAR(50) NOT NULL,
  topic_path TEXT NOT NULL,
  value_numeric DECIMAL(12,4),
  value_text TEXT,
  value_boolean BOOLEAN,
  unit VARCHAR(20),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  quality_code INTEGER DEFAULT 192, -- OPC UA quality codes
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('sensor_readings', 'timestamp', chunk_time_interval => INTERVAL '1 hour');

-- Create indexes for efficient querying
CREATE INDEX idx_sensor_readings_machine_timestamp ON sensor_readings (machine_id, timestamp DESC);
CREATE INDEX idx_sensor_readings_sensor_type_timestamp ON sensor_readings (sensor_type, timestamp DESC);
CREATE INDEX idx_sensor_readings_topic_path ON sensor_readings (topic_path, timestamp DESC);
```

#### pipeline_metrics
System health and performance metrics for the data pipeline.

```sql
CREATE TABLE pipeline_metrics (
  id BIGSERIAL PRIMARY KEY,
  metric_type VARCHAR(50) NOT NULL, -- 'throughput', 'latency', 'error_rate', 'connection_status'
  metric_name VARCHAR(100) NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  unit VARCHAR(20),
  tags JSONB, -- Additional metadata like machine_id, service_name
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert to hypertable for metrics time-series
SELECT create_hypertable('pipeline_metrics', 'timestamp', chunk_time_interval => INTERVAL '6 hours');

-- Indexes for monitoring queries
CREATE INDEX idx_pipeline_metrics_type_timestamp ON pipeline_metrics (metric_type, timestamp DESC);
CREATE INDEX idx_pipeline_metrics_name_timestamp ON pipeline_metrics (metric_name, timestamp DESC);
```

#### data_validation_errors
Log of validation failures and data quality issues.

```sql
CREATE TABLE data_validation_errors (
  id BIGSERIAL PRIMARY KEY,
  machine_id UUID REFERENCES cnc_machines(id),
  topic_path TEXT NOT NULL,
  error_type VARCHAR(50) NOT NULL, -- 'schema_validation', 'range_check', 'type_conversion'
  error_message TEXT NOT NULL,
  raw_payload JSONB, -- Original message for debugging
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for error analysis
CREATE INDEX idx_validation_errors_machine_type ON data_validation_errors (machine_id, error_type, attempted_at DESC);
```

### Modified Tables

#### cnc_machines
Add fields for pipeline integration and data quality tracking.

```sql
ALTER TABLE cnc_machines ADD COLUMN IF NOT EXISTS last_data_received TIMESTAMPTZ;
ALTER TABLE cnc_machines ADD COLUMN IF NOT EXISTS data_quality_score DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE cnc_machines ADD COLUMN IF NOT EXISTS total_messages_received BIGINT DEFAULT 0;
ALTER TABLE cnc_machines ADD COLUMN IF NOT EXISTS pipeline_status VARCHAR(20) DEFAULT 'unknown';
```

### Data Retention Policies

Implement automatic data retention using TimescaleDB compression and retention policies.

```sql
-- Compress data older than 7 days
SELECT add_compression_policy('sensor_readings', INTERVAL '7 days');

-- Compress pipeline metrics older than 1 day
SELECT add_compression_policy('pipeline_metrics', INTERVAL '1 day');

-- Retain sensor readings for 2 years, pipeline metrics for 90 days
SELECT add_retention_policy('sensor_readings', INTERVAL '2 years');
SELECT add_retention_policy('pipeline_metrics', INTERVAL '90 days');

-- Retain validation errors for 30 days
SELECT add_retention_policy('data_validation_errors', INTERVAL '30 days');
```

### Views for Dashboard Integration

#### machine_current_status
Aggregated view of latest sensor readings per machine for dashboard efficiency.

```sql
CREATE VIEW machine_current_status AS
SELECT DISTINCT ON (machine_id, sensor_type)
  machine_id,
  sensor_type,
  value_numeric,
  value_text,
  value_boolean,
  unit,
  timestamp,
  quality_code
FROM sensor_readings
ORDER BY machine_id, sensor_type, timestamp DESC;
```

#### pipeline_health_summary
Real-time pipeline health metrics for monitoring dashboards.

```sql
CREATE VIEW pipeline_health_summary AS
SELECT
  metric_type,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  COUNT(*) as sample_count,
  MAX(timestamp) as last_updated
FROM pipeline_metrics
WHERE timestamp > NOW() - INTERVAL '5 minutes'
GROUP BY metric_type;
```

## Migration Scripts

### Prisma Schema Updates

```prisma
model SensorReading {
  id             BigInt    @id @default(autoincrement())
  machineId      String    @map("machine_id") @db.Uuid
  sensorType     String    @map("sensor_type") @db.VarChar(50)
  topicPath      String    @map("topic_path")
  valueNumeric   Decimal?  @map("value_numeric") @db.Decimal(12,4)
  valueText      String?   @map("value_text")
  valueBoolean   Boolean?  @map("value_boolean")
  unit           String?   @db.VarChar(20)
  timestamp      DateTime  @default(now())
  qualityCode    Int?      @map("quality_code") @default(192)
  createdAt      DateTime  @map("created_at") @default(now())
  
  machine        CncMachine @relation(fields: [machineId], references: [id])
  
  @@index([machineId, timestamp(sort: Desc)])
  @@index([sensorType, timestamp(sort: Desc)])
  @@index([topicPath, timestamp(sort: Desc)])
  @@map("sensor_readings")
}

model PipelineMetric {
  id          BigInt    @id @default(autoincrement())
  metricType  String    @map("metric_type") @db.VarChar(50)
  metricName  String    @map("metric_name") @db.VarChar(100)
  value       Decimal   @db.Decimal(10,4)
  unit        String?   @db.VarChar(20)
  tags        Json?
  timestamp   DateTime  @default(now())
  
  @@index([metricType, timestamp(sort: Desc)])
  @@index([metricName, timestamp(sort: Desc)])
  @@map("pipeline_metrics")
}

model DataValidationError {
  id            BigInt    @id @default(autoincrement())
  machineId     String?   @map("machine_id") @db.Uuid
  topicPath     String    @map("topic_path")
  errorType     String    @map("error_type") @db.VarChar(50)
  errorMessage  String    @map("error_message")
  rawPayload    Json?     @map("raw_payload")
  attemptedAt   DateTime  @map("attempted_at") @default(now())
  
  machine       CncMachine? @relation(fields: [machineId], references: [id])
  
  @@index([machineId, errorType, attemptedAt(sort: Desc)])
  @@map("data_validation_errors")
}
```

## Rationale

The schema design prioritizes time-series performance with TimescaleDB hypertables while maintaining relational integrity. Separate tables for different data types (sensor readings, metrics, errors) enable targeted optimization and retention policies. The use of JSONB for flexible metadata storage balances structure with adaptability for evolving sensor types and pipeline requirements.