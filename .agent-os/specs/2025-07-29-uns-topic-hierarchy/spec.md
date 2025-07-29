# Spec Requirements Document

> Spec: UNS Topic Hierarchy Design and Implementation
> Created: 2025-07-29
> Status: Planning

## Overview

Design and implement a standardized Unified Namespace (UNS) topic hierarchy following ISA-95 standards for 10 simulated CNC machines. This specification establishes the foundational data architecture that enables seamless data integration, real-time monitoring, and predictive analytics across heterogeneous manufacturing equipment.

## User Stories

### Industrial Data Architect

As an Industrial Data Architect, I want to implement a standardized UNS topic hierarchy, so that all CNC machine data is organized in a consistent, discoverable structure that supports both real-time operations and historical analytics.

The architect needs to define topic structures that follow ISA-95 hierarchical levels (Enterprise > Site > Area > Work Cell > Work Unit) while accommodating the four UNS layers (Descriptive, Functional, Informational, Ad-hoc). Each CNC machine must have clearly defined topics for sensor data, operational status, maintenance alerts, and production metrics.

### Factory Manager Dashboard Integration

As a Factory Manager, I want real-time access to standardized machine data through MQTT topics, so that my dashboard can display comprehensive operational visibility across all 10 CNC machines without requiring custom integration for each machine type.

The topic hierarchy must support role-based data access where factory managers can subscribe to high-level operational metrics, production status, and equipment health indicators. Topics must be structured to enable efficient dashboard queries and real-time updates.

### Maintenance Technician Data Access  

As a Maintenance Technician, I want detailed equipment diagnostics available through structured MQTT topics, so that I can proactively monitor machine health, identify potential failures, and access historical maintenance data for troubleshooting.

The topic structure must provide granular access to sensor readings, vibration data, temperature monitoring, tool wear indicators, and maintenance schedules. Each machine's diagnostic data must be easily discoverable and consistently formatted.

## Spec Scope

1. **ISA-95 Compliant Topic Structure** - Define hierarchical topic organization following Enterprise/Site/Area/WorkCell/WorkUnit standards
2. **Four-Layer UNS Architecture** - Implement Descriptive, Functional, Informational, and Ad-hoc topic layers for comprehensive data organization
3. **CNC Machine Topic Mapping** - Create standardized topic templates for 10 simulated CNC machines with sensor data, operational status, and maintenance information
4. **MQTT Topic Validation System** - Develop topic naming conventions, validation rules, and management utilities for consistent data structure
5. **Data Payload Schemas** - Define JSON schema standards for sensor readings, machine status updates, alerts, and historical data payloads

## Out of Scope

- Physical CNC machine integration (using simulated data)
- Real-time data processing algorithms (handled in separate pipeline spec)
- User interface dashboard implementation (covered in Phase 2)
- Machine learning model integration (addressed in Phase 3)
- Multi-tenant or enterprise security features (Phase 5 scope)

## Expected Deliverable

1. **Functional UNS Topic Hierarchy** - Complete topic structure deployed to EMQX Cloud with all 10 CNC machines represented
2. **Topic Management System** - Administrative interface for topic validation, schema enforcement, and hierarchy management
3. **Data Schema Documentation** - Comprehensive documentation of all payload formats, topic naming conventions, and usage patterns

## Spec Documentation

- Tasks: @.agent-os/specs/2025-07-29-uns-topic-hierarchy/tasks.md
- Technical Specification: @.agent-os/specs/2025-07-29-uns-topic-hierarchy/sub-specs/technical-spec.md
- Database Schema: @.agent-os/specs/2025-07-29-uns-topic-hierarchy/sub-specs/database-schema.md
- API Specification: @.agent-os/specs/2025-07-29-uns-topic-hierarchy/sub-specs/api-spec.md
- Tests Specification: @.agent-os/specs/2025-07-29-uns-topic-hierarchy/sub-specs/tests.md