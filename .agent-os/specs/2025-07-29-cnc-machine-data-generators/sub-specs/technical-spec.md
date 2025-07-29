# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-29-cnc-machine-data-generators/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Technical Requirements

- **Machine Types**: Support 3-4 different CNC machine types (3-axis mill, 4-axis mill, 5-axis mill, CNC lathe)
- **Sensor Data**: Generate realistic readings for spindle speed (0-12000 RPM), axis positions (X/Y/Z coordinates), temperature (20-85°C), vibration (0-100 Hz), power consumption (0-50kW)
- **State Management**: Five operational states with realistic transition logic and timing
- **Data Frequency**: Sensor readings published every 1-2 seconds with configurable intervals
- **UNS Integration**: All data published to existing UNS topic hierarchy using MQTT.js client
- **Persistence**: Machine configurations and current states stored in Supabase database
- **Real-time**: All data changes immediately reflected in MQTT topics for dashboard consumption

## Approach Options

**Option A: Class-based TypeScript Implementation**
- Pros: Type safety, object-oriented design, easy to extend and maintain
- Cons: Slightly more complex initial setup

**Option B: Functional Programming Approach** (Selected)
- Pros: Simpler implementation, easier testing, functional composition, better performance
- Cons: Less familiar to some developers

**Option C: Worker Thread Implementation**
- Pros: True parallel processing, no blocking of main thread
- Cons: Unnecessary complexity for simulation workload, harder to debug

**Rationale:** Selected functional approach for simplicity and testability. The simulation workload is not CPU-intensive enough to require worker threads, and the functional approach aligns well with React/Next.js patterns.

## External Dependencies

- **MQTT.js** - MQTT client for publishing sensor data to EMQX Cloud broker
- **Justification:** Already integrated in the project for UNS topic management, provides reliable WebSocket MQTT connectivity

- **uuid** - Generate unique identifiers for data points and sessions
- **Justification:** Standard library for unique ID generation, needed for data tracking and correlation

- **date-fns** - Date/time manipulation for realistic timestamp generation
- **Justification:** Provides utility functions for realistic time-based data patterns and operational scheduling

## Implementation Architecture

### Core Components

1. **MachineGenerator Class**: Individual machine simulation with sensor data generation
2. **FactoryManager Class**: Orchestrates all machine generators and provides centralized control
3. **SensorDataGenerator**: Utility functions for realistic sensor value generation with noise and patterns
4. **StateManager**: Handles operational state transitions with realistic timing and triggers
5. **UNSPublisher**: Interface for publishing data to UNS MQTT topics

### Data Flow

```
FactoryManager → MachineGenerator → SensorDataGenerator → UNSPublisher → EMQX Cloud → Dashboards
```

### State Transition Logic

- **Idle → Loading**: Manual trigger or scheduled job start
- **Loading → Machining**: After setup time (30-120 seconds)
- **Machining → Unloading**: After job completion (5-45 minutes)
- **Unloading → Idle**: After cleanup time (15-60 seconds)
- **Any State → Maintenance**: Scheduled or triggered maintenance
- **Any State → Error**: Random failure events (low probability)

### Sensor Data Patterns

- **Normal Operation**: Sensor values within expected ranges with realistic noise
- **State Transitions**: Appropriate sensor changes during state changes
- **Degradation Patterns**: Gradual changes over time to simulate wear
- **Error Conditions**: Anomalous sensor readings during error states