# Unified Namespace (UNS) Demo Build Specification

## CNC Machine Preventative & Prescriptive Maintenance System

## Maintenance Strategy Definitions

### Preventive Maintenance

**Preventive Maintenance** is a proactive maintenance strategy that involves regularly scheduled inspections, servicing, and repairs performed on equipment before failures occur. The goal is to prevent unexpected breakdowns and extend equipment lifespan through systematic maintenance activities.

**Key Characteristics:**

- **Time-based**: Scheduled at predetermined intervals (calendar time, operating hours, cycles)
- **Condition-based**: Triggered by sensor thresholds or performance indicators
- **Predictable**: Uses historical data and manufacturer recommendations
- **Cost-effective**: Reduces emergency repairs and unplanned downtime

**Preventive Maintenance Activities in CNC Machines:**

- Lubrication of moving parts on scheduled intervals
- Tool replacement based on operating hours or part counts
- Calibration of sensors and measurement systems
- Cleaning and inspection of coolant systems
- Regular bearing inspection and replacement
- Spindle maintenance and balancing

### Prescriptive Maintenance

**Prescriptive Maintenance** represents the next evolution of maintenance strategy, using advanced analytics, machine learning, and AI to not only predict when maintenance should occur, but also prescribe the optimal maintenance actions to take.

**Key Characteristics:**

- **AI-driven**: Uses machine learning algorithms to analyze complex data patterns
- **Action-oriented**: Provides specific recommendations for maintenance actions
- **Optimized**: Considers multiple factors including cost, risk, and operational impact
- **Continuous**: Adapts recommendations based on real-time data and outcomes

**Prescriptive Maintenance Capabilities:**

- **Failure Prediction**: ML models predict specific failure modes and timeframes
- **Action Recommendations**: AI suggests optimal maintenance actions with cost-benefit analysis
- **Resource Optimization**: Recommends optimal timing considering production schedules
- **Risk Assessment**: Evaluates probability and impact of various failure scenarios
- **Decision Support**: Provides maintenance priority scoring and resource allocation

**Example Prescriptive Recommendations:**

- "Replace spindle bearing in CNC-003 within 72 hours to prevent catastrophic failure (85% confidence)"
- "Adjust coolant flow rate to 15.2 L/min to extend tool life by 15% and reduce thermal stress"
- "Schedule tool change during planned downtime window to optimize production efficiency"

---

### 1. Project Overview

**Objective**: Build a Unified Namespace demonstration system for 10 CNC machines using simulated data to showcase preventative and prescriptive maintenance capabilities.

**Goals**:

- Demonstrate real-time data collection and normalization across heterogeneous CNC machines
- Implement predictive analytics for equipment failure prevention
- Showcase prescriptive maintenance recommendations
- Provide unified dashboard for operational visibility
- Enable data-driven decision making for maintenance scheduling

---

### 2. System Architecture

#### 2.1 Core UNS Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                            UNIFIED NAMESPACE (UNS)                                  │
│                            EMQX Cloud MQTT Broker                                   │
│    Topic Structure: UNSDemo/Site_PlantA/Area_Production/Line_01/Cell_*/CNC_*/*     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  APPLICATION CONSUMERS (Context-Aware Subscribers)                                  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │   Plant HMI     │ │  Maintenance    │ │   Analytics     │ │    Quality      │  │
│  │   Subscribe:    │ │   Subscribe:    │ │   Subscribe:    │ │   Subscribe:    │  │
│  │   UNSDemo/+/+/  │ │   UNSDemo/+/+/  │ │   UNSDemo/+/+/  │ │   UNSDemo/+/+/  │  │
│  │   +/+/+/Status  │ │   +/+/+/Maint*  │ │   +/+/+/Sensors │ │   +/+/+/Quality │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  DATA ENRICHMENT & CONTEXT SERVICES                                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │   Historian     │ │   ML Analytics  │ │  Alarm Manager  │ │  Context Store  │  │
│  │   Subscribes:   │ │   Subscribes:   │ │   Subscribes:   │ │   Maintains:    │  │
│  │   UNSDemo/+/+/  │ │   UNSDemo/+/+/  │ │   UNSDemo/+/+/  │ │   - Asset Meta  │  │
│  │   +/+/+/*       │ │   +/+/+/Sensors │ │   +/+/+/Alerts  │ │   - Relationships│  │
│  │   (All Topics)  │ │   (Sensor Data) │ │   (Alerts Only) │ │   - Hierarchies │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  UNIFIED NAMESPACE MQTT BROKER                                                     │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │  EMQX Cloud with Data Integration to Upstash Redis                         │   │
│  │  - Retained messages for current state                                     │   │
│  │  - QoS levels based on data criticality                                    │   │
│  │  - Topic-based security and access control                                 │   │
│  │  - Sparkplug B compliance for standardized payloads                       │   │
│  │  - Automatic data forwarding to Upstash Redis for web integration         │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  EDGE DATA PUBLISHERS (Context-Aware Publishers)                                   │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐  │
│  │  CNC-001 Edge   │ │  CNC-002 Edge   │ │      ...        │ │  CNC-010 Edge   │  │
│  │  Publishes to:  │ │  Publishes to:  │ │                 │ │  Publishes to:  │  │
│  │  UNSDemo/Site_  │ │  UNSDemo/Site_  │ │                 │ │  UNSDemo/Site_  │  │
│  │  PlantA/Area_   │ │  PlantA/Area_   │ │                 │ │  PlantA/Area_   │  │
│  │  Production/    │ │  Production/    │ │                 │ │  Production/    │  │
│  │  Line_01/Cell_  │ │  Line_01/Cell_  │ │                 │ │  Line_02/Cell_  │  │
│  │  Machining/     │ │  Machining/     │ │                 │ │  Machining/     │  │
│  │  CNC_001/*      │ │  CNC_002/*      │ │                 │ │  CNC_010/*      │  │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  PHYSICAL ASSET LAYER                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────┐   │
│  │                         Plant Floor Assets                                  │   │
│  │  Line_01: CNC_001, CNC_002, CNC_003, CNC_004, CNC_005                      │   │
│  │  Line_02: CNC_006, CNC_007, CNC_008, CNC_009, CNC_010                      │   │
│  │                                                                             │   │
│  │  Each asset publishes to its unique UNS topic path                         │   │
│  │  Applications discover assets by subscribing to hierarchy levels           │   │
│  └─────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Key UNS Architectural Principles:**

1. **Publish-Subscribe Model**: All data flows through the central MQTT broker
2. **Context-Aware Topics**: Topic hierarchy provides semantic meaning
3. **Decoupled Applications**: Applications discover data through topic subscriptions
4. **Event-Driven Architecture**: Real-time data flow enables immediate response
5. **Self-Organizing**: New assets auto-register in the namespace hierarchy
6. **Bidirectional Communication**: Commands flow down, data flows up the hierarchy

#### 2.2 Technology Stack Architecture

**Frontend Framework**:

- **Next.js 15.x**: React-based full-stack framework with App Router
- **React 18+**: Component library with server/client components
- **TypeScript**: Type-safe development throughout the stack
- **Zustand**: Lightweight state management for complex real-time state

**Database & Backend**:

- **Supabase**: PostgreSQL database with real-time features
- **Prisma**: Type-safe ORM for database operations
- **Supabase Auth**: Built-in authentication and authorization
- **Supabase Realtime**: WebSocket-based real-time subscriptions
- **Row Level Security (RLS)**: Multi-tenant data isolation

**API Layer**:

- **Apollo Client**: GraphQL client for frontend data fetching
- **Supabase GraphQL**: Auto-generated GraphQL API from database schema
- **Next.js API Routes**: Custom business logic and integrations

**Styling & UI**:

- **TailwindCSS 3.x**: Utility-first CSS framework for industrial dashboards
- **shadcn/ui**: Modern React component library built on Radix UI
- **Lucide React**: Clean, consistent iconography for manufacturing interfaces
- **Next.js Font Optimization**: Performance-optimized Google Fonts loading

**Data Visualization**:

- **Recharts**: Industrial-grade charts for metrics and trends
- **ReactFlow**: Network topology visualization for UNS hierarchy
- **Real-time Charts**: Live updating dashboards with WebSocket integration

**MQTT & Real-time Communication**:

- **EMQX Cloud**: Managed MQTT broker for true MQTT protocol support
- **Upstash Redis**: Data bridge for MQTT-to-web integration and caching
- **MQTT.js**: JavaScript MQTT client with WebSocket support for browsers
- **Supabase Realtime**: Database change streams and dashboard real-time updates
- **EMQX-Upstash Integration**: Automatic data flow from MQTT to Redis to web app

**Development & Deployment**:

- **Vercel**: Optimized hosting for Next.js applications with GitHub integration
- **Supabase Cloud**: Managed database and backend services
- **EMQX Cloud**: Managed MQTT broker infrastructure
- **Upstash Redis**: Serverless Redis for MQTT data integration
- **npm**: Package management with Node.js 20+ LTS
- **TypeScript**: End-to-end type safety across the full stack

---

### 3. Data Model & Schema

#### 3.1 Unified Namespace Topic Hierarchy

The UNS represents the physical and logical structure of the manufacturing enterprise as an MQTT topic hierarchy. Each level provides context and enables semantic understanding of data relationships.

**Advanced UNS Namespace Architecture:**

The UNS implementation will utilize four distinct namespace types, each serving specific purposes in the data architecture:

1. **Descriptive/Definitional Namespace**: Contains rarely-changing data that defines the fundamental characteristics of assets
2. **Functional Namespace**: Houses processed, contextualized data and operational functions like OEE calculations
3. **Informative Namespace**: Provides aggregated data optimized for visualization and dashboard consumption
4. **Ad Hoc Namespace**: Supports dynamic, temporary data structures for specialized use cases

**Namespace Design Principles:**

- Each namespace type serves distinct data consumers and use cases
- Functional namespaces process raw edge data into meaningful business metrics
- Informative namespaces enable consistent visualization across multiple applications
- All namespaces maintain semantic hierarchy alignment with physical plant structure

**Enterprise Hierarchy Structure:**

```
UNSDemo/
├── Site_PlantA/
│   ├── Area_Production/
│   │   ├── Line_01/
│   │   │   ├── Cell_Machining/
│   │   │   │   ├── CNC_001/
│   │   │   │   │   ├── Identity/
│   │   │   │   │   │   ├── Type: "VerticalMachiningCenter"
│   │   │   │   │   │   ├── Model: "Haas_VF3"
│   │   │   │   │   │   ├── SerialNumber: "VF3-2024-001"
│   │   │   │   │   │   └── InstallDate: "2024-01-01"
│   │   │   │   │   ├── Status/
│   │   │   │   │   │   ├── Operational: "RUNNING"
│   │   │   │   │   │   ├── Mode: "AUTOMATIC"
│   │   │   │   │   │   ├── Program: "PART_2024_001"
│   │   │   │   │   │   └── Availability: 0.95
│   │   │   │   │   ├── Performance/
│   │   │   │   │   │   ├── OEE: 0.87
│   │   │   │   │   │   ├── CycleTime: 125.5
│   │   │   │   │   │   ├── PartCount: 1247
│   │   │   │   │   │   ├── Efficiency: 0.91
│   │   │   │   │   │   └── Quality: 0.98
│   │   │   │   │   ├── Mechanical/
│   │   │   │   │   │   ├── Spindle/
│   │   │   │   │   │   │   ├── Speed: 2500
│   │   │   │   │   │   │   ├── Load: 0.65
│   │   │   │   │   │   │   └── Temperature: 65.2
│   │   │   │   │   │   ├── Axes/
│   │   │   │   │   │   │   ├── X_Position: 125.67
│   │   │   │   │   │   │   ├── Y_Position: 89.23
│   │   │   │   │   │   │   ├── Z_Position: 45.12
│   │   │   │   │   │   │   └── FeedRate: 150.0
│   │   │   │   │   │   ├── Tooling/
│   │   │   │   │   │   │   ├── CurrentTool: 3
│   │   │   │   │   │   │   ├── ToolLife: 0.73
│   │   │   │   │   │   │   └── ToolChanges: 47
│   │   │   │   │   │   └── Coolant/
│   │   │   │   │   │       ├── FlowRate: 12.5
│   │   │   │   │   │       ├── Temperature: 23.5
│   │   │   │   │   │       └── Pressure: 2.1
│   │   │   │   │   ├── Sensors/
│   │   │   │   │   │   ├── Vibration/
│   │   │   │   │   │   │   ├── X_Amplitude: 0.25
│   │   │   │   │   │   │   ├── Y_Amplitude: 0.18
│   │   │   │   │   │   │   ├── Z_Amplitude: 0.31
│   │   │   │   │   │   │   └── Overall_RMS: 0.24
│   │   │   │   │   │   ├── Temperature/
│   │   │   │   │   │   │   ├── Spindle_Bearing: 65.2
│   │   │   │   │   │   │   ├── Motor_Winding: 78.5
│   │   │   │   │   │   │   ├── Coolant_Tank: 23.5
│   │   │   │   │   │   │   └── Ambient: 22.1
│   │   │   │   │   │   ├── Pressure/
│   │   │   │   │   │   │   ├── Hydraulic: 150.5
│   │   │   │   │   │   │   ├── Pneumatic: 6.2
│   │   │   │   │   │   │   └── Coolant: 2.1
│   │   │   │   │   │   └── Power/
│   │   │   │   │   │       ├── Consumption: 15.2
│   │   │   │   │   │       ├── Voltage: 415.3
│   │   │   │   │   │       ├── Current: 25.8
│   │   │   │   │   │       └── PowerFactor: 0.82
│   │   │   │   │   ├── Maintenance/
│   │   │   │   │   │   ├── Schedule/
│   │   │   │   │   │   │   ├── LastPM: "2024-01-01T08:00:00.000Z"
│   │   │   │   │   │   │   ├── NextPM: "2024-01-08T08:00:00.000Z"
│   │   │   │   │   │   │   └── HoursToService: 156.5
│   │   │   │   │   │   ├── Alerts/
│   │   │   │   │   │   │   ├── Active: []
│   │   │   │   │   │   │   ├── Warnings: []
│   │   │   │   │   │   │   └── Critical: []
│   │   │   │   │   │   └── History/
│   │   │   │   │   │       ├── LastService: "2024-01-01T08:00:00.000Z"
│   │   │   │   │   │       ├── ServiceType: "PreventiveMaintenance"
│   │   │   │   │   │       └── NextService: "2024-01-08T08:00:00.000Z"
│   │   │   │   │   └── Analytics/
│   │   │   │   │       ├── Predictions/
│   │   │   │   │       │   ├── ToolWear_Remaining: 72.5
│   │   │   │   │       │   ├── BearingHealth_Score: 0.85
│   │   │   │   │       │   ├── FailureProbability_7Day: 0.05
│   │   │   │   │       │   └── RecommendedAction: "None"
│   │   │   │   │       ├── Trends/
│   │   │   │   │       │   ├── Performance_Trend: "Stable"
│   │   │   │   │       │   ├── Efficiency_Delta: -0.02
│   │   │   │   │       │   └── Quality_Trend: "Improving"
│   │   │   │   │       └── KPIs/
│   │   │   │   │           ├── MTBF: 720.5
│   │   │   │   │           ├── MTTR: 2.5
│   │   │   │   │           └── Uptime_Percentage: 95.2
```

**Topic Naming Convention:**

- **Enterprise/Site/Area/Line/Cell/Asset/Category/Subcategory/DataPoint**
- Each level provides semantic context
- Forward slashes (/) separate hierarchy levels
- Underscores (\_) separate words within a level
- CamelCase for multi-word data points

**Key UNS Principles Implemented:**

1. **Hierarchical Organization**: Mirrors physical plant structure
2. **Semantic Context**: Each level adds meaning and context
3. **Contextual Data Access**: Applications can subscribe at any level
4. **Self-Describing**: Topic structure conveys data relationships
5. **Scalable**: Easy to add new sites, lines, or machines

#### 3.2 Advanced Namespace Implementation

**Edge/Raw Namespace Structure:**

```
UNSDemo/Site_PlantA/Area_Production/Line_01/Cell_Machining/CNC_001/Edge/
├── TagData/
│   ├── Spindle_Speed: 2500
│   ├── Feed_Rate: 150.0
│   ├── Tool_Position: 3
│   └── Coolant_Flow: 12.5
├── Counts/
│   ├── InFeed: 1247
│   ├── OutFeed: 1198
│   └── Waste: 49
└── States/
    ├── Operational: "RUNNING"
    ├── Mode: "AUTOMATIC"
    └── Program: "PART_2024_001"
```

**Functional Namespace Structure:**

```
UNSDemo/Site_PlantA/Area_Production/Line_01/Cell_Machining/CNC_001/Functions/
├── OEE/
│   ├── Availability: 0.95
│   ├── Performance: 0.91
│   ├── Quality: 0.98
│   ├── Overall: 0.87
│   └── LastCalculated: "2024-01-01T12:00:00Z"
├── Maintenance/
│   ├── NextPM: "2024-01-08T08:00:00Z"
│   ├── HoursToService: 156.5
│   └── MaintenanceScore: 0.85
├── Production/
│   ├── CycleTime: 125.5
│   ├── PartsPerHour: 28.8
│   └── EfficiencyTrend: "Stable"
└── Schedule/
    ├── CurrentJob: "WO-2024-001"
    ├── NextJob: "WO-2024-002"
    └── EstimatedCompletion: "2024-01-01T14:30:00Z"
```

**Informative Namespace Structure:**

```
UNSDemo/Site_PlantA/Area_Production/Line_01/Cell_Machining/CNC_001/Dashboard/
├── KPIs/
│   ├── OEE_Display: "87%"
│   ├── Status_Color: "green"
│   ├── Availability_Trend: [0.94, 0.95, 0.96, 0.95]
│   └── Alert_Count: 0
├── Charts/
│   ├── Production_Last24H: {...}
│   ├── Quality_Trend: {...}
│   └── Downtime_Breakdown: {...}
└── Widgets/
    ├── Current_Part: "PART_2024_001"
    ├── Progress_Percent: 85
    └── Estimated_Complete: "14:30"
```

#### 3.3 Database Schema (Prisma Models)

**Core Asset Management:**

```prisma
model Machine {
  id          String   @id @default(cuid())
  machineId   String   @unique
  name        String
  type        MachineType
  model       String
  serialNumber String
  installDate DateTime
  location    String
  status      MachineStatus @default(OFFLINE)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  sensorData      SensorReading[]
  maintenanceRecords MaintenanceRecord[]
  alerts          Alert[]
  performances    Performance[]

  @@map("machines")
}

model SensorReading {
  id        String   @id @default(cuid())
  machineId String
  sensorType String
  value     Float
  unit      String
  timestamp DateTime @default(now())
  quality   Float?   @default(1.0)

  // Relations
  machine   Machine  @relation(fields: [machineId], references: [id])

  @@map("sensor_readings")
  @@index([machineId, timestamp])
  @@index([sensorType, timestamp])
}

model MaintenanceRecord {
  id          String   @id @default(cuid())
  machineId   String
  type        MaintenanceType
  description String
  scheduledAt DateTime
  completedAt DateTime?
  technician  String?
  cost        Float?
  status      MaintenanceStatus @default(SCHEDULED)

  // Relations
  machine     Machine  @relation(fields: [machineId], references: [id])

  @@map("maintenance_records")
}

enum MachineType {
  VERTICAL_MACHINING_CENTER
  HORIZONTAL_MACHINING_CENTER
  TURNING_CENTER
  MULTI_AXIS_MACHINE
}

enum MachineStatus {
  RUNNING
  IDLE
  MAINTENANCE
  OFFLINE
  ERROR
}

enum MaintenanceType {
  PREVENTIVE
  CORRECTIVE
  PREDICTIVE
  EMERGENCY
}

enum MaintenanceStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

#### 3.4 Machine Types & Variations

**CNC Machine Profiles**:

1. **Vertical Machining Centers** (CNC-001, CNC-002, CNC-003)
   - 3-axis machines
   - Higher spindle speeds (up to 10,000 RPM)
   - Tool changers (20-40 tools)

2. **Horizontal Machining Centers** (CNC-004, CNC-005, CNC-006)
   - 4-axis machines with rotary table
   - Pallet changers
   - Higher material removal rates

3. **Turning Centers** (CNC-007, CNC-008)
   - Lathe-type operations
   - Live tooling capabilities
   - Bar feeders

4. **Multi-axis Machines** (CNC-009, CNC-010)
   - 5-axis simultaneous machining
   - Complex geometries
   - Advanced probe systems

---

### 4. Advanced UNS Data Operations (DataOps)

#### 4.1 Data Modeling Framework

Based on KMS best practices, the UNS will implement comprehensive data modeling to ensure semantic interoperability and efficient data flow:

**Data Model Requirements:**

```typescript
interface UNSDataModel {
  modelVersion: string;
  deviceId: string;
  sourceSystemId: string;
  sensorData: {
    temperature: number;
    vibration: number;
    pressure: number;
    power: number;
  };
  metadata: {
    type: string;
    manufacturer: string;
    model: string;
    specifications: {
      maxSpindleSpeed: number;
      toolCapacity: number;
      axes: number;
    };
  };
  status: {
    operationalState: string;
    mode: string;
    errorCodes: string[];
    maintenanceAlerts: string[];
  };
  operationalParams: {
    currentProgram: string;
    workOrder: string;
    operator: string;
  };
  dataQuality: {
    temperatureAccuracy: number;
    vibrationAccuracy: number;
  };
  location: {
    coordinates: string;
    facility: string;
  };
  timestamp: string;
}
```

#### 4.2 DataOps Implementation

**Data Transformation Pipeline:**

1. **Data Normalization**: Standardize units, formats, and data structures across heterogeneous CNC machines
2. **Data Contextualization**: Enrich raw sensor data with operational context, maintenance records, and production parameters
3. **Data Aggregation**: Create time-based aggregations for trending and historical analysis
4. **Data Validation**: Implement quality checks and anomaly detection for data integrity

**Functional Namespace Processing:**

- Subscribe to Edge namespace raw data
- Apply business logic and calculations (OEE, efficiency metrics)
- Publish processed results to functional namespaces
- Enable cross-domain data integration and analysis

**Dynamic Data Operations:**

- Real-time data normalization for multi-vendor CNC machines
- Contextual data enrichment using metadata and operational parameters
- Automated data quality scoring and validation
- Version-controlled data model evolution

#### 4.3 Advanced Scheduling Integration

**Work Order Management Enhancement:**
Based on KMS workshop patterns, implement advanced scheduling capabilities:

```typescript
// Production Schedule Namespace Structure
interface ScheduleNamespace {
  'UNSDemo/Site_PlantA/Area_Production/Schedule/': {
    FillOrders: {
      AllLines: any; // Master schedule for all production lines
      Priorities: any; // Dynamic priority adjustments
    };
    Line_01: {
      MachineSchedule: any; // Line-specific schedule
      CurrentJob: string;
      NextJob: string;
    };
    Optimization: {
      Efficiency: number;
      Recommendations: any[];
      Constraints: any;
    };
  };
}
```

**Real-time Schedule Optimization:**

- Dynamic work order prioritization based on real-time conditions
- Predictive scheduling using historical performance data
- Automated schedule adjustments for maintenance windows
- Cross-line optimization for maximum throughput

---

### 5. Data Simulation Strategy

#### 5.1 Simulation Engine Architecture

```typescript
// Base CNC Simulator Class
class CNCSimulator {
  constructor(
    private machineId: string,
    private machineType: MachineType,
    private config: SimulatorConfig
  ) {
    this.state = new MachineState(config);
    this.dataGenerator = new DataGenerator(machineType);
    this.faultInjector = new FaultInjector();
  }

  generateRealtimeData(): UNSDataModel {
    return {
      ...this.generateOperationalData(),
      ...this.generateSensorData(),
      ...this.generateMaintenanceData(),
    };
  }
}
```

#### 5.2 Realistic Data Patterns

**Normal Operation Patterns**:

- Cyclic patterns based on machining cycles
- Tool wear progression over time
- Temperature variations with load
- Vibration signatures specific to operations

**Anomaly Injection**:

- Gradual tool wear leading to quality issues
- Bearing degradation patterns
- Coolant system failures
- Power supply irregularities
- Spindle imbalance development

**Seasonal Variations**:

- Ambient temperature effects
- Production schedule variations
- Maintenance window impacts

#### 5.3 Data Generation Specifications

**Frequency**:

- High-frequency sensors: 10Hz (vibration, power)
- Medium-frequency: 1Hz (temperature, position)
- Low-frequency: 0.1Hz (operational status, part counts)

**Data Volume Estimation**:

- Per machine: ~50 data points per second
- 10 machines: ~500 data points per second
- Daily volume: ~43.2M data points
- Storage: ~2GB per day (with compression)

---

### 6. Preventative Maintenance Features

#### 6.1 Condition Monitoring

**Vibration Analysis**:

- FFT analysis for bearing condition
- Spindle balance monitoring
- Tool chatter detection

**Thermal Monitoring**:

- Bearing temperature trending
- Coolant system efficiency
- Thermal expansion compensation

**Performance Metrics**:

- Cycle time degradation
- Surface finish quality trends
- Tool life consumption rates

#### 6.2 Maintenance Scheduling

**Time-based Maintenance**:

- Scheduled PM based on operating hours
- Calendar-based inspections
- Lubrication schedules

**Condition-based Maintenance**:

- Trigger maintenance based on sensor thresholds
- Trend analysis for early intervention
- Predictive replacement scheduling

**Integration Points**:

- ERP system connectivity for work order generation
- Inventory management for parts availability
- Technician scheduling and dispatch

---

### 7. Prescriptive Maintenance Capabilities

#### 7.1 Machine Learning Models

**Failure Prediction Models**:

```typescript
interface MLModels {
  bearing_failure: 'RandomForestClassifier';
  tool_wear: 'SVR';
  spindle_degradation: 'LSTMModel';
  coolant_system: 'LogisticRegression';
}
```

**Feature Engineering**:

- Statistical features (mean, std, skewness, kurtosis)
- Frequency domain features (FFT coefficients)
- Time domain features (RMS, peak, crest factor)
- Operational context features (material, program, tool)

#### 7.2 Recommendation Engine

**Action Recommendations**:

- Immediate: Stop machine, change tool, adjust parameters
- Short-term: Schedule maintenance, order parts, adjust production
- Long-term: Equipment upgrade, process optimization, training needs

**Cost-Benefit Analysis**:

- Maintenance cost vs. downtime cost
- Part replacement cost vs. catastrophic failure cost
- Energy optimization recommendations

**Decision Support**:

- Risk assessment matrices
- Maintenance priority scoring
- Resource allocation optimization

---

### 8. User Interface Design

#### 8.1 Dashboard Hierarchy

**Plant Overview Dashboard**:

- Overall equipment effectiveness (OEE)
- Production metrics
- Alert summary
- Resource utilization

**Machine Detail View**:

- Real-time operational status
- Performance trends
- Maintenance history
- Predictive analytics results

**Maintenance Manager Dashboard**:

- Work order queue
- Parts inventory status
- Technician assignments
- Maintenance KPIs

#### 8.2 Visualization Components

**Real-time Widgets** (using Recharts):

- Status indicators with color coding
- Real-time line charts and area charts
- Alert notification panels
- Progress bars for maintenance intervals

**Analytics Views** (using ReactFlow):

- UNS hierarchy visualization
- Network topology for asset relationships
- Trend analysis charts
- Correlation matrices
- Predictive model confidence intervals
- Maintenance effectiveness metrics

---

### 9. Implementation Phases

#### Phase 1: Foundation (Weeks 1-2)

- [ ] Set up Next.js + TypeScript development environment
- [ ] Configure Supabase with Prisma ORM
- [ ] Set up EMQX Cloud deployment and configure Upstash Redis integration
- [ ] Create CNC simulator framework with MQTT.js

#### Phase 2: Data Layer (Weeks 3-4)

- [ ] Implement Supabase database schema
- [ ] Create data ingestion pipeline with Prisma
- [ ] Build 10 CNC machine simulators
- [ ] Implement data validation and quality checks

#### Phase 3: Analytics Engine (Weeks 5-6)

- [ ] Develop basic anomaly detection
- [ ] Implement preventative maintenance logic
- [ ] Create machine learning pipeline
- [ ] Build recommendation engine

#### Phase 4: User Interface (Weeks 7-8)

- [ ] Develop plant overview dashboard with Recharts
- [ ] Create machine detail views with shadcn/ui
- [ ] Implement UNS hierarchy visualization with ReactFlow
- [ ] Add real-time alerting system with Supabase Realtime

#### Phase 5: Integration & Testing (Weeks 9-10)

- [ ] End-to-end system testing
- [ ] Performance optimization with Vercel deployment
- [ ] Documentation and training materials
- [ ] Demo scenario preparation

---

### 10. Technical Specifications

#### 10.1 Performance Requirements

- **Latency**: < 100ms for critical alerts
- **Throughput**: Handle 1000+ messages/second via EMQX Cloud
- **Availability**: 99.5% uptime target with Vercel + Supabase + EMQX Cloud
- **Scalability**: Support 50+ machines with minimal changes

#### 10.2 Security Considerations

- MQTT authentication and authorization via EMQX Cloud
- TLS encryption for data in transit (MQTT over TLS)
- Upstash Redis authentication for data bridge
- Supabase Row Level Security (RLS) for data access
- Next.js API authentication (JWT tokens)
- Network segmentation for OT/IT separation

#### 10.3 Data Retention

- Real-time data: 7 days in Supabase hot storage
- Aggregated data: 1 year in Supabase warm storage
- Historical trends: 5 years in Supabase cold storage
- Maintenance records: Permanent retention

---

### 11. Success Metrics

#### 11.1 Technical KPIs

- System availability and performance
- Data quality and completeness
- Prediction accuracy rates
- Alert false positive/negative rates

#### 11.2 Business KPIs

- Reduction in unplanned downtime
- Improvement in maintenance efficiency
- Cost savings from predictive maintenance
- Overall equipment effectiveness (OEE) improvement

#### 11.3 Demo Scenarios

1. **Normal Operations**: Show real-time monitoring with Recharts
2. **Predictive Alert**: Demonstrate early warning system
3. **UNS Hierarchy**: Visualize namespace structure with ReactFlow
4. **Maintenance Planning**: Show optimized scheduling
5. **Fault Response**: Demonstrate rapid issue resolution
6. **Performance Analytics**: Show trend analysis and insights

---

### 12. Future Enhancements

#### 12.1 Advanced Analytics

- Digital twin integration
- Augmented reality maintenance guidance
- Advanced ML models (deep learning, reinforcement learning)
- Cross-machine correlation analysis

#### 12.2 Integration Opportunities

- ERP/MES system connectivity via GraphQL
- Supplier integration for automatic parts ordering
- Quality management system integration
- Energy management optimization

#### 12.3 Scalability Considerations

- Multi-plant deployment with Vercel regions
- Cloud-native architecture with Supabase scaling
- Edge computing capabilities
- 5G connectivity for remote monitoring

---

**Document Version**: 2.2 (Corrected MQTT Architecture)  
**Last Updated**: 2025-01-28  
**Author**: System Architect (Corrected with EMQX Cloud + Upstash Redis)  
**Status**: Fully Aligned with corrected tech-stack.md

## Alignment Summary

**Key Alignments Made:**

- **MQTT Broker**: Corrected to EMQX Cloud (managed MQTT service) with Upstash Redis data integration
- **Charts**: Changed from Chart.js to Recharts for all data visualization
- **ORM**: Added Prisma explicitly throughout database sections
- **State Management**: Added Zustand for complex real-time state management
- **GraphQL**: Integrated Apollo Client + Supabase GraphQL architecture
- **Network Visualization**: Added ReactFlow for UNS hierarchy visualization
- **TypeScript**: Reinforced end-to-end TypeScript usage
- **Package Management**: Standardized on npm with Node.js 20+ LTS
- **Deployment**: Ensured Vercel + Supabase alignment throughout

**Corrected MQTT Architecture:**

- **EMQX Cloud**: Professional managed MQTT broker for IoT applications
- **Data Integration**: Built-in EMQX Cloud → Upstash Redis bridge for seamless data flow
- **WebSocket Support**: MQTT.js client library for browser-based MQTT over WebSocket
- **Dual Real-time Channels**: MQTT for device data + Supabase Realtime for dashboard updates
- **Scalable Design**: Supports thousands of concurrent MQTT connections
