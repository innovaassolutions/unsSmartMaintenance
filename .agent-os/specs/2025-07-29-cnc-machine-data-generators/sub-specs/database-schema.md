# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-29-cnc-machine-data-generators/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Schema Changes

### New Tables

#### CNC_Machines Table
- **Purpose**: Store configuration and metadata for simulated CNC machines
- **Relationships**: Links to existing UNS topic hierarchy

#### Machine_States Table
- **Purpose**: Track current operational state and simulation parameters for each machine
- **Relationships**: Foreign key to CNC_Machines table

### Table Specifications

#### CNC_Machines
```sql
CREATE TABLE cnc_machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  machine_type VARCHAR(50) NOT NULL, -- 'mill_3axis', 'mill_4axis', 'mill_5axis', 'lathe'
  manufacturer VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  location VARCHAR(100) NOT NULL,
  specifications JSONB NOT NULL, -- max_spindle_speed, axis_ranges, capabilities
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cnc_machines_machine_id ON cnc_machines(machine_id);
CREATE INDEX idx_cnc_machines_type ON cnc_machines(machine_type);
CREATE INDEX idx_cnc_machines_location ON cnc_machines(location);
```

#### Machine_States
```sql
CREATE TABLE machine_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_id VARCHAR(50) REFERENCES cnc_machines(machine_id) ON DELETE CASCADE,
  current_state VARCHAR(20) NOT NULL, -- 'idle', 'loading', 'machining', 'unloading', 'maintenance', 'error'
  state_start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  simulation_active BOOLEAN DEFAULT FALSE,
  simulation_parameters JSONB DEFAULT '{}', -- speed_multiplier, error_probability, etc.
  current_job_id VARCHAR(50),
  last_sensor_update TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_machine_states_machine_id ON machine_states(machine_id);
CREATE INDEX idx_machine_states_current_state ON machine_states(current_state);
CREATE INDEX idx_machine_states_simulation_active ON machine_states(simulation_active);
```

### Seed Data Requirements

#### Predefined CNC Machines (10 machines)
1. **Mill-001**: 3-axis vertical mill, Haas VF-2, maximum spindle speed 8100 RPM
2. **Mill-002**: 4-axis horizontal mill, Mazak HCN-5000, maximum spindle speed 12000 RPM  
3. **Mill-003**: 5-axis machining center, DMG Mori DMU 50, maximum spindle speed 18000 RPM
4. **Mill-004**: 3-axis vertical mill, Fadal VMC-4020, maximum spindle speed 6000 RPM
5. **Lathe-001**: CNC turning center, Haas ST-20, maximum spindle speed 4000 RPM
6. **Lathe-002**: Multi-axis lathe, Mazak Integrex 200, maximum spindle speed 5000 RPM
7. **Mill-005**: 3-axis vertical mill, Brother TC-32B, maximum spindle speed 20000 RPM
8. **Mill-006**: 4-axis machining center, Okuma Genos M560-V, maximum spindle speed 15000 RPM
9. **Lathe-003**: CNC lathe, DMG Mori NLX 2500, maximum spindle speed 3500 RPM
10. **Mill-007**: 5-axis machining center, Hermle C30 U, maximum spindle speed 24000 RPM

### Migration Strategy

- **Phase 1**: Create new tables with proper indexes and constraints
- **Phase 2**: Insert seed data for 10 predefined CNC machines  
- **Phase 3**: Initialize machine_states records with default idle state
- **Phase 4**: Verify foreign key relationships and data integrity

### Data Integrity Rules

- **Machine IDs**: Must be unique and match UNS topic naming conventions
- **State Transitions**: Only valid state transitions allowed via application logic
- **Simulation Parameters**: JSON validation for required parameter structure
- **Timestamps**: All state changes must have accurate timestamp tracking

### Performance Considerations

- **Indexing**: Primary indexes on machine_id and current_state for fast queries
- **JSONB**: Use JSONB for flexible specification and parameter storage with GIN indexes if needed
- **Updates**: Frequent state updates optimized with targeted column updates
- **Cascading**: Proper cascade deletion for referential integrity