# Technical Stack

> Last Updated: 2025-07-28
> Version: 1.0.0

## Core Technologies

### Application Framework

- **Framework:** Next.js
- **Version:** 15.x
- **Language:** TypeScript
- **Runtime:** Node.js 20+ LTS

### Database

- **Application Data:** Supabase (PostgreSQL) - User auth, metadata, static data
- **Time-Series Data:** TimescaleDB Cloud - Sensor readings, machine status, alerts
- **Version:** Latest stable
- **ORM:** Prisma (multi-database support)
- **Real-time:** Supabase subscriptions

## Frontend Stack

### JavaScript Framework

- **Framework:** React
- **Version:** Latest stable (via Next.js)
- **State Management:** Zustand

### Import Strategy

- **Strategy:** Node.js modules
- **Package Manager:** npm
- **Node Version:** 20+ LTS

### CSS Framework

- **Framework:** TailwindCSS
- **Version:** 3.x
- **PostCSS:** Yes

### UI Components

- **Library:** shadcn/ui
- **Version:** Latest
- **Installation:** Via npm

## Specialized Architecture

### Real-time & IoT

- **MQTT Broker:** EMQX Cloud (managed MQTT service)
- **Data Bridge:** Upstash Redis (MQTT-to-web integration)
- **MQTT Client:** MQTT.js (WebSocket support for browsers)
- **WebSocket:** Supabase real-time
- **GraphQL Client:** Apollo Client
- **GraphQL Server:** Supabase GraphQL

### Data Visualization

- **Charts:** Recharts
- **Network Topology:** ReactFlow
- **Icons:** Lucide React

## Assets & Media

### Fonts

- **Provider:** Google Fonts
- **Loading Strategy:** Next.js font optimization

### Storage

- **Provider:** Supabase Storage
- **CDN:** Supabase Edge Network
- **Access:** Row Level Security (RLS)

## Infrastructure

### Application Hosting

- **Platform:** Vercel
- **Service:** Next.js hosting
- **Region:** Auto (Edge Network)

### Database Hosting

- **Provider:** Supabase
- **Service:** Managed PostgreSQL
- **Backups:** Automated daily

### MQTT Infrastructure

- **MQTT Broker:** EMQX Cloud
- **Data Integration:** EMQX Cloud → Upstash Redis bridge
- **Caching Layer:** Upstash Redis
- **Protocol:** MQTT 5.0 with WebSocket support

## Deployment

### CI/CD Pipeline

- **Platform:** Vercel (GitHub integration)
- **Trigger:** Push to main/staging branches
- **Tests:** Run before deployment

### Environments

- **Production:** main branch
- **Staging:** staging branch
- **Preview:** PR-based (automatic)

## UNS Demo System Specific Architecture

### Data Flow for CNC Machine Simulation

```
Simulated CNC Machines → MQTT Topics (UNS Hierarchy) → EMQX Cloud → Upstash Redis → Next.js App → Supabase → Real-time Dashboards
```

### UNS Topic Hierarchy

- **Descriptive Layer:** Physical location and equipment identification
- **Functional Layer:** Machine capabilities and operational functions
- **Informative Layer:** Real-time data streams and status information
- **Ad Hoc Layer:** Temporary data and event-driven communications

### Machine Learning & Analytics

- **Predictive Models:** Python-based ML services for failure prediction
- **Data Pipeline:** Real-time data ingestion and feature engineering
- **Model Serving:** API endpoints for predictive analytics integration

### Repository Configuration

- **Code Repository URL:** https://github.com/innovaassolutions/unsSmartMaintenance.git
- **Deployment Solution:** Vercel with GitHub integration
