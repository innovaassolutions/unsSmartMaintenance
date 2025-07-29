# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-29-mqtt-supabase-pipeline/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Technical Requirements

- Real-time MQTT subscription handling with automatic reconnection and QoS 1 message delivery guarantee
- High-throughput data processing capable of 500+ messages per second across 10 CNC machines
- Data validation with configurable schemas for different sensor types and machine models
- Time-series data storage with automatic partitioning and compression for optimal query performance
- Connection pool management for database operations with configurable concurrency limits
- Error handling with exponential backoff retry logic and dead letter queue for failed messages
- Pipeline monitoring with metrics collection for throughput, latency, error rates, and system health
- Graceful shutdown handling to prevent data loss during deployments or system maintenance

## Approach Options

**Option A: Server-Sent Events with Next.js API Routes**
- Pros: Simple integration with existing Next.js app, leverages current tech stack
- Cons: Limited scalability, memory issues with long-running connections, no built-in retry logic

**Option B: Dedicated Node.js Service with Background Processing (Selected)**
- Pros: Scalable architecture, can run independently, better resource management, production-ready patterns
- Cons: Additional deployment complexity, requires separate service monitoring

**Option C: Serverless Functions with Queue Processing**
- Pros: Auto-scaling, pay-per-use, no server management
- Cons: Cold start latency, timeout limitations, complex state management for real-time features

**Rationale:** Selected Option B because the pipeline requires long-running MQTT connections, high-throughput processing, and reliable state management. A dedicated service provides the stability and performance needed for production data ingestion while maintaining clear separation of concerns from the web application.

## External Dependencies

- **mqtt** (v5.3.4) - MQTT client library with support for MQTT 5.0 protocol features and WebSocket connections
  - Justification: Established library with comprehensive MQTT protocol support and reconnection handling

- **@supabase/supabase-js** (latest) - Supabase client for database operations and real-time subscriptions
  - Justification: Official client with optimized connection pooling and built-in retry mechanisms

- **zod** (v3.22.4) - TypeScript-first schema validation library for data validation
  - Justification: Type-safe validation with excellent TypeScript integration and performance

- **pino** (v8.16.2) - High-performance JSON logger for Node.js applications
  - Justification: Production-ready logging with structured output and low overhead

- **node-cron** (v3.0.3) - Task scheduler for maintenance operations and data aggregation
  - Justification: Simple cron-like scheduling for cleanup tasks and health checks

## Data Flow Architecture

```
CNC Simulators → MQTT Topics (UNS Hierarchy) → MQTT Consumer Service → Data Validation → TimescaleDB/Supabase → Supabase Real-time → Dashboards
```

### Component Responsibilities

1. **MQTT Consumer Service**: Subscribe to UNS topics, handle reconnections, buffer messages
2. **Data Validation Engine**: Schema validation, type checking, anomaly detection
3. **Database Layer**: Batch inserts, time-series optimization, connection management
4. **Real-time Broadcaster**: Trigger Supabase real-time events for dashboard updates
5. **Monitoring System**: Collect metrics, health checks, alerting

## Performance Requirements

- **Throughput**: Process 500+ sensor readings per second
- **Latency**: Sub-second data availability in Supabase tables
- **Reliability**: 99.9% uptime with automatic recovery from failures
- **Scalability**: Handle increasing machine count without architectural changes