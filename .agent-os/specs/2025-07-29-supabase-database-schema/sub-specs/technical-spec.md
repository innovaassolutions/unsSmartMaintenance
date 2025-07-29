# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-29-supabase-database-schema/spec.md

> Created: 2025-07-29
> Version: 1.0.0

## Technical Requirements

- Supabase PostgreSQL database with real-time subscriptions enabled for live dashboard updates
- UNS hierarchy implementation using normalized table structure with proper foreign key relationships
- Time-series data storage optimized for high-frequency writes and efficient range queries
- Row Level Security (RLS) policies for secure multi-user access with role-based permissions
- Database indexing strategy supporting both real-time queries and historical data analysis
- JSON storage capabilities for flexible sensor data attributes and equipment specifications
- Timestamp-based partitioning strategy for long-term time-series data management
- Database migration system supporting versioned schema changes and rollback capabilities

## Approach Options

**Option A:** Single Time-Series Table with JSON Sensor Data
- Pros: Simple schema, flexible sensor data structure, easy to scale horizontally
- Cons: Complex querying for specific sensors, potential JSON query performance issues

**Option B:** Normalized Sensor Tables with Dedicated Time-Series Storage (Selected)
- Pros: Optimized queries, proper data typing, better performance for analytics
- Cons: More complex schema, requires careful planning for new sensor types

**Option C:** Hybrid Approach with Core Tables and JSON Extensions
- Pros: Balance of structure and flexibility, easier migrations
- Cons: Complexity in maintaining both structured and unstructured data

**Rationale:** Selected Option B because it provides the best performance for both real-time queries and historical analytics. The normalized approach aligns with industrial data standards and supports efficient indexing for the predictive analytics requirements. While more complex initially, it provides better long-term scalability and query performance for the dashboard requirements.

## External Dependencies

- **Supabase CLI** - Database migration management and local development
- **Justification:** Required for managing database schema changes, migrations, and local development environment synchronization

- **@supabase/supabase-js** - JavaScript client library for database operations
- **Justification:** Essential for connecting Next.js application to Supabase, handling authentication, and real-time subscriptions

- **Prisma ORM** - Database schema management and type-safe queries
- **Justification:** Provides type safety, migration management, and efficient query building for complex UNS data relationships