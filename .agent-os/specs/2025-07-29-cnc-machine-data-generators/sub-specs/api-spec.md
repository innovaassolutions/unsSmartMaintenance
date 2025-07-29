# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-29-cnc-machine-data-generators/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Endpoints

### GET /api/machines

**Purpose:** Retrieve list of all CNC machines with current status
**Parameters:** None
**Response:** 
```json
{
  "machines": [
    {
      "id": "uuid",
      "machineId": "Mill-001",
      "name": "Haas VF-2 Mill",
      "type": "mill_3axis",
      "manufacturer": "Haas",
      "location": "Bay 1",
      "currentState": "idle",
      "simulationActive": false,
      "lastUpdate": "2025-07-29T10:30:00Z"
    }
  ]
}
```
**Errors:** 500 - Database connection error

### GET /api/machines/{machineId}

**Purpose:** Get detailed information for specific machine
**Parameters:** machineId (path parameter)
**Response:**
```json
{
  "id": "uuid",
  "machineId": "Mill-001", 
  "name": "Haas VF-2 Mill",
  "type": "mill_3axis",
  "specifications": {
    "maxSpindleSpeed": 8100,
    "axisRanges": {"X": 762, "Y": 406, "Z": 508}
  },
  "currentState": "idle",
  "simulationParameters": {
    "speedMultiplier": 1.0,
    "errorProbability": 0.01
  }
}
```
**Errors:** 404 - Machine not found, 500 - Database error

### POST /api/machines/{machineId}/simulation/start

**Purpose:** Start data simulation for specific machine
**Parameters:** machineId (path), optional body parameters
**Request Body:**
```json
{
  "speedMultiplier": 1.0,
  "errorProbability": 0.01,
  "initialState": "idle"
}
```
**Response:**
```json
{
  "success": true,
  "machineId": "Mill-001",
  "simulationActive": true,
  "message": "Simulation started successfully"
}
```
**Errors:** 404 - Machine not found, 400 - Invalid parameters, 409 - Simulation already running

### POST /api/machines/{machineId}/simulation/stop

**Purpose:** Stop data simulation for specific machine
**Parameters:** machineId (path parameter)
**Response:**
```json
{
  "success": true,
  "machineId": "Mill-001", 
  "simulationActive": false,
  "message": "Simulation stopped successfully"
}
```
**Errors:** 404 - Machine not found, 409 - Simulation not running

### POST /api/machines/{machineId}/state

**Purpose:** Change operational state of machine (trigger state transition)
**Parameters:** machineId (path), newState (body)
**Request Body:**
```json
{
  "newState": "maintenance",
  "reason": "Scheduled maintenance"
}
```
**Response:**
```json
{
  "success": true,
  "machineId": "Mill-001",
  "previousState": "idle",
  "newState": "maintenance",
  "transitionTime": "2025-07-29T10:30:00Z"
}
```
**Errors:** 404 - Machine not found, 400 - Invalid state transition, 409 - Machine not in simulation

### POST /api/simulation/start-all

**Purpose:** Start simulation for all machines with default parameters
**Parameters:** None
**Response:**
```json
{
  "success": true,
  "startedMachines": ["Mill-001", "Mill-002", "Lathe-001"],
  "errors": []
}
```
**Errors:** 500 - Database error, 207 - Partial success with individual machine errors

### POST /api/simulation/stop-all

**Purpose:** Stop simulation for all currently running machines
**Parameters:** None  
**Response:**
```json
{
  "success": true,
  "stoppedMachines": ["Mill-001", "Mill-002"],
  "message": "All simulations stopped successfully"
}
```
**Errors:** 500 - Database error

### GET /api/simulation/status

**Purpose:** Get overall simulation status and statistics
**Parameters:** None
**Response:**
```json
{
  "totalMachines": 10,
  "activeSimulations": 3,
  "activeMachines": ["Mill-001", "Mill-002", "Lathe-001"],
  "dataPointsPerSecond": 15,
  "uptime": "02:30:45"
}
```
**Errors:** 500 - Database error

## Controllers

### MachineController
- **Actions**: index, show, startSimulation, stopSimulation, changeState
- **Business Logic**: Machine state validation, simulation parameter validation
- **Error Handling**: Proper HTTP status codes, detailed error messages

### SimulationController  
- **Actions**: startAll, stopAll, getStatus
- **Business Logic**: Bulk operations, aggregation statistics, system monitoring
- **Error Handling**: Partial failure handling, transaction rollback for critical operations

## Integration Points

- **Database**: Supabase client for machine and state management
- **MQTT**: MQTT.js client for real-time data publishing
- **UNS Topics**: Integration with existing topic registry system
- **Validation**: Zod schemas for request/response validation
- **Authentication**: Integration with existing auth middleware (when implemented)