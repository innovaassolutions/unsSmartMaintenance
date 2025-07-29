# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-29-emqx-mqtt-broker-setup/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Technical Requirements

- EMQX Cloud deployment with minimum 1,000 concurrent connections capacity for future scalability
- MQTT 5.0 protocol support with WebSocket binding for browser compatibility
- TLS/SSL encryption for all MQTT connections ensuring industrial-grade security
- QoS levels 0, 1, and 2 support for different data criticality requirements
- Retained message support for device status persistence
- Data integration rules for automatic forwarding to Upstash Redis and database systems
- Connection authentication using username/password and client certificates
- Topic access control lists (ACLs) for security isolation between different data types
- Message rate limiting and connection quotas for resource management
- Monitoring and alerting integration for broker health and performance metrics

## UNS Topic Hierarchy Design

Following Unified Namespace standards, the topic structure will organize data into four distinct layers:

### Descriptive Layer (Physical Context)
```
Factory01/Line{1-2}/Machine{01-05}/
```
- Factory01: Manufacturing facility identifier
- Line1, Line2: Production line organization (5 machines per line)
- Machine01-05: Individual CNC machine identification

### Functional Layer (Capabilities)
```
{Descriptive}/Spindle/
{Descriptive}/Coolant/
{Descriptive}/PowerConsumption/
{Descriptive}/Maintenance/
```
- Spindle: Spindle speed, load, temperature monitoring
- Coolant: Coolant flow, temperature, pressure systems
- PowerConsumption: Energy monitoring and efficiency metrics
- Maintenance: Equipment health, vibration, predictive indicators

### Informative Layer (Real-time Data)
```
{Descriptive}/{Functional}/Status
{Descriptive}/{Functional}/Telemetry
{Descriptive}/{Functional}/Alarms
{Descriptive}/{Functional}/Events
```
- Status: Current operational state and configuration
- Telemetry: Continuous sensor readings and measurements
- Alarms: Critical alerts and fault conditions
- Events: State changes and operational milestones

### Ad Hoc Layer (Temporary Communications)
```
{Descriptive}/Commands/
{Descriptive}/Responses/
```
- Commands: Operational instructions and parameter changes
- Responses: Acknowledgments and command execution results

## Approach Options

**Option A: Single EMQX Cloud Deployment with Rule Engine**
- Pros: Simplified architecture, built-in data integration, managed service reliability
- Cons: Vendor lock-in, potential cost scaling issues, limited customization

**Option B: Self-hosted Mosquitto with Custom Bridge Services** 
- Pros: Full control, cost predictability, unlimited customization
- Cons: Infrastructure management overhead, scaling complexity, maintenance burden

**Option C: EMQX Cloud with Hybrid Data Pipeline** (Selected)
- Pros: Managed broker reliability, flexible data routing, enterprise features, WebSocket support
- Cons: Multiple service dependencies, configuration complexity

**Rationale:** Option C provides the optimal balance of managed service benefits with architectural flexibility. EMQX Cloud offers enterprise-grade MQTT broker capabilities with built-in data integration rules, while maintaining flexibility for custom data processing pipelines. The WebSocket support enables seamless browser integration for real-time dashboards.

## MQTT Client Configuration

### Node.js Publisher (Simulated CNC Machines)
```typescript
const mqttConfig = {
  host: 'emqx-cloud-endpoint.com',
  port: 8883,
  protocol: 'mqtts',
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  keepalive: 60,
  clean: true,
  reconnectPeriod: 1000,
  clientId: `cnc_machine_${machineId}_${Date.now()}`
}
```

### Browser WebSocket Client (Dashboard)
```typescript
const wsConfig = {
  brokerUrl: 'wss://emqx-cloud-endpoint.com:8084/mqtt',
  options: {
    username: process.env.NEXT_PUBLIC_MQTT_WS_USERNAME,
    password: process.env.NEXT_PUBLIC_MQTT_WS_PASSWORD,
    clientId: `dashboard_${userId}_${Date.now()}`,
    keepalive: 30,
    clean: true
  }
}
```

## Data Bridge Architecture

### EMQX Rule Engine Configuration
Rules will automatically forward MQTT messages to multiple destinations:
1. **Upstash Redis** - Real-time caching for dashboard updates
2. **Webhook to Next.js API** - Database persistence and processing
3. **Retention Rules** - Message persistence for offline clients

### Data Flow Pipeline
```
CNC Machines → MQTT Broker → Rule Engine → [Redis Cache + Database + WebSocket Clients]
```

## External Dependencies

- **EMQX Cloud Serverless Plan** - Managed MQTT broker service with pay-per-use pricing
  - **Justification:** Provides enterprise-grade MQTT 5.0 features, built-in monitoring, and data integration capabilities without infrastructure overhead

- **mqtt package v5.x** - Node.js MQTT client library
  - **Justification:** Industry-standard library with comprehensive MQTT 5.0 support and TypeScript definitions

- **@upstash/redis package** - Redis client for data bridge integration
  - **Justification:** Optimized for serverless environments and seamless integration with EMQX Cloud data rules