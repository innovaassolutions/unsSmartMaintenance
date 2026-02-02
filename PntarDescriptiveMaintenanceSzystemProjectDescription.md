# Project: UNS Smart Maintenance Demo System

## 🎯 Project Overview

- **What it does**: A Unified Namespace demonstration platform that helps factory managers, production managers, and maintenance teams optimize CNC machine operations through real-time data collection, predictive analytics, and prescriptive maintenance recommendations
- **Industry/Domain**: Industrial Manufacturing, IoT, Predictive Maintenance, Industry 4.0
- **Current Status**: Working prototype with complete role-based dashboards, real-time data pipeline, and UMH-Core UNS integration

## 🏗️ Current Tech Stack

### Frontend

- **Framework**: Next.js 15.4.4 with App Router
- **Styling**: TailwindCSS v4 with NovaPredict Design System
- **UI Libraries**: shadcn/ui components, Lucide React icons
- **Charts/Visualization**: Recharts for data visualization, custom ReliabilityMetrics components
- **State Management**: React Context (AuthContext), useState/useEffect hooks

### Backend/Database

- **Current**: Supabase (PostgreSQL) for user auth, metadata, and application data
- **Time-series**: TimescaleDB Community Edition for sensor readings and machine status (5.7M+ records)
- **Message Queue**: UMH-Core with embedded Redpanda for UNS architecture
- **Industrial Gateway**: UMH-Core with MQTT-to-UNS transformation, Benthos-UMH processing

### Infrastructure

- **Hosting**: Vercel with GitHub integration for Next.js deployment
- **Environment**: Local development, staging, and production deployment ready

## 📊 Data Architecture

### Current Data Flow

```
CNC Simulator → HiveMQ MQTT → UMH-Core MQTT-to-UNS → Embedded Redpanda → UNS-to-Supabase Bridge → Supabase PostgreSQL → Real-time Dashboards
```

### Sensor Data Structure

- **5.7M+ records** in TimescaleDB
- **23 sensor types**: machine_state, vibration_x/y/z, temperatures, spindle_speed, etc.
- **10 CNC machines**: cw-l1-01, insert-l1-01, press-l1-01, test-l1-01, wind-l1-01, plus 5 additional machines
- **Location**: FCL Components, Johor Relay Plant
- **UNS Topic Format**: ISA-95 compliant (umh.v1.demo-factory.plant1.machining.cell-01.cnc-001.\_raw.sensor)

## 🖥️ Current UI Structure

### Pages

- **Dashboard**: Main overview with system status, reliability metrics, and role-based navigation
- **Scheduling**: Calendar view with maintenance scheduling and work order management
- **Maintenance**: Equipment health dashboard with predictive alerts and maintenance KPIs
- **Factory**: Real-time machine monitoring with sensor data visualization
- **Executive**: High-level KPI metrics for C-suite decision-making
- **AI Agents**: AI-powered analytics and predictive maintenance interface
- **Device Fleet**: Device management and fleet optimization tools

### Key Components (with brief descriptions)

- `Layout.tsx` - Main layout wrapper with sidebar navigation and header
- `Sidebar.tsx` - Navigation panel with role-based menu organization
- `ReliabilityMetrics.tsx` - Comprehensive equipment reliability KPI visualization
- `WorkOrderForm.tsx` - Modal form for creating maintenance work orders
- `ProtectedRoute.tsx` - Authentication wrapper for secure page access
- `AuthContext.tsx` - User authentication state management

### What Data Currently Displays

- **From Supabase**: User profiles, machine definitions, topic registry, maintenance records
- **From TimescaleDB**: Real-time sensor data, machine status, historical trends
- **Real-time Features**: Live dashboard updates via Supabase real-time subscriptions, MQTT data streaming

## 🎨 Current UI Screenshots/Mockups

The system features a modern, industrial-grade interface with:

- **NovaPredict Design System**: Custom color palette with industrial-optimized colors
- **Responsive Layout**: Collapsible sidebar with hover-based expansion
- **Role-Based Dashboards**: Tailored interfaces for different user personas
- **Real-Time Charts**: MTBF, MTTR, OEE, Uptime, Failure Rate visualizations
- **Interactive Calendar**: Maintenance scheduling with drag-and-drop capabilities
- **Professional Branding**: NovaPredict logo and mascot integration

## 📁 Project Structure

/project-root
├── /src
│ ├── /app (Next.js 15 App Router)
│ │ ├── /dashboard (Role-based dashboards)
│ │ ├── /api (REST API endpoints)
│ │ ├── /login (Authentication page)
│ │ └── globals.css (NovaPredict Design System styles)
│ ├── /components
│ │ ├── /layout (Sidebar, Header, Layout)
│ │ ├── /charts (ReliabilityMetrics, KPISummary)
│ │ ├── /forms (WorkOrderForm)
│ │ ├── /auth (ProtectedRoute)
│ │ └── /ui (shadcn/ui components)
│ ├── /lib (Database connections, utilities)
│ ├── /contexts (AuthContext)
│ └── /types (TypeScript definitions)
├── /prisma (Database schema and migrations)
├── /public (Static assets including NovaPredict branding)
└── /docs (Project documentation)

## 🎯 Goals & Objectives

### Immediate Goals

- **Primary**: Complete UNS-to-Supabase Bridge integration for real-time data flow
- **Secondary**: Implement predictive analytics engine with ML models

### Future Vision

- **Predictive Maintenance**: ML models using sensor data for 2-4 week failure forecasting
- **Advanced Analytics**: Comprehensive business intelligence and trend analysis
- **Real-time Capabilities**: Sub-100ms latency from sensor to dashboard updates

## ❓ Specific Questions/Challenges

1. **Data Format Alignment**: UMH-Core produces different topic format than existing code expects
2. **Bridge Integration**: Verify UNS-to-Supabase Bridge data flow to PostgreSQL
3. **Dashboard Integration**: Connect role-based dashboards to UNS data stream
4. **Performance Optimization**: Maintain sub-100ms latency under production load

## 📋 Priority Order

1. **Complete UNS Bridge Integration** - Verify data flow from UMH-Core to Supabase
2. **Align Source Code** - Update Next.js app to consume UMH-Core topic format
3. **Implement Predictive Analytics** - ML models for equipment failure prediction
4. **Production Deployment** - Enterprise-grade deployment with monitoring

## 🔧 Development Environment

- **OS**: macOS (darwin 24.6.0)
- **Node Version**: 20+ LTS
- **Database Access**: Supabase managed PostgreSQL, TimescaleDB Community Edition
- **Local Setup**: npm install, npm run dev, environment variables configuration
- **Testing**: Jest with React Testing Library (53 tests passing)
- **Code Quality**: ESLint, Prettier, Husky pre-commit hooks
