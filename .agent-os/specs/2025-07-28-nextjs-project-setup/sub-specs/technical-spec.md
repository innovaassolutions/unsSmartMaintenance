# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-28-nextjs-project-setup/spec.md

> Created: 2025-07-28
> Version: 1.0.0

## Technical Requirements

- Next.js 15.x with App Router enabled for modern React patterns
- TypeScript 5.x with strict mode configuration for type safety
- Node.js 20+ LTS runtime environment
- TailwindCSS 3.x with PostCSS for utility-first styling
- ESLint and Prettier integration for code quality and consistency
- Environment variable configuration for development and production
- Vercel deployment configuration with proper build settings

## Approach Options

**Option A:** Manual project setup with individual dependency installation

- Pros: Full control over configuration, understanding of each component
- Cons: Time-consuming, potential for configuration errors, version conflicts

**Option B:** Next.js create-next-app with TypeScript template (Selected)

- Pros: Official template, optimized configuration, faster setup, proven reliability
- Cons: May include unnecessary dependencies, less educational value

**Rationale:** Option B provides a reliable foundation with official Next.js optimizations and reduces setup time, allowing focus on UNS-specific features rather than boilerplate configuration.

## External Dependencies

- **@types/node** - TypeScript definitions for Node.js APIs
- **Justification:** Required for server-side TypeScript compilation and Node.js API usage

- **mqtt** - MQTT client library for IoT communication
- **Justification:** Core requirement for UNS architecture and real-time machine data collection

- **@supabase/supabase-js** - Supabase client SDK
- **Justification:** Database integration and real-time subscriptions for industrial data

- **zustand** - Lightweight state management
- **Justification:** State management for dashboard data and user interactions

- **tailwindcss** - Utility-first CSS framework
- **Justification:** Rapid UI development and responsive design for industrial dashboards

- **@tailwindcss/typography** - Typography plugin for TailwindCSS
- **Justification:** Enhanced text styling for technical documentation and reports

- **shadcn/ui components** - Accessible React components
- **Justification:** Pre-built components optimized for dashboard interfaces

- **recharts** - React charting library
- **Justification:** Data visualization for machine metrics and analytics

- **lucide-react** - Modern icon library
- **Justification:** Consistent iconography for industrial interface elements

- **clsx** - Utility for constructing className strings
- **Justification:** Dynamic CSS class management for component states

- **@next/font** - Next.js font optimization
- **Justification:** Performance optimization for Google Fonts integration

## Configuration Files

### TypeScript Configuration

- Strict mode enabled for enhanced type checking
- Path mapping for clean imports (@/components, @/lib, etc.)
- Module resolution optimized for Next.js App Router

### ESLint Configuration

- Next.js recommended rules
- TypeScript-specific linting rules
- Import order enforcement
- Accessibility rule enforcement

### TailwindCSS Configuration

- Content paths for component scanning
- Custom color palette for industrial themes
- Plugin integration for typography and forms

### Environment Variables

- Development environment defaults
- Production environment templates
- Supabase and MQTT configuration placeholders
