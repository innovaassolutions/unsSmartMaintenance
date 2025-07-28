# Development Guide

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- npm package manager
- Git

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in your environment variables in `.env.local`

### Development Server

Start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/                  # Next.js App Router
│   ├── globals.css      # Global styles and Tailwind imports
│   ├── layout.tsx       # Root layout component
│   └── page.tsx         # Home page
├── components/          # Reusable React components
│   ├── ui/             # shadcn/ui components
│   ├── charts/         # Chart components for data visualization
│   ├── dashboards/     # Role-specific dashboard components
│   └── layout/         # Layout and navigation components
├── lib/                # Utility libraries and configurations
│   ├── mqtt/           # MQTT client and message handling
│   ├── database/       # Supabase client and database utilities
│   └── utils/          # Helper functions and constants
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── contexts/           # React Context providers
└── __tests__/          # Test files
```

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report

## Code Standards

### Style Guide

- Use single quotes for strings
- 2 spaces for indentation
- Semicolons required
- Snake_case for methods and variables
- CamelCase for classes and modules
- UPPER_SNAKE_CASE for constants

### Component Guidelines

- Use TypeScript for all components
- Follow the component structure in `src/components/`
- Use shadcn/ui components where possible
- Implement proper prop typing
- Include JSDoc comments for complex functions

### Testing

- Write tests for all new components and utilities
- Use Jest and React Testing Library
- Aim for high test coverage
- Include unit tests and integration tests

## Technology Stack

### Core Framework

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **React 19**: UI library

### Styling

- **TailwindCSS 4**: Utility-first CSS framework
- **shadcn/ui**: Component library
- **Industrial Theme**: Custom color palette for manufacturing UIs

### Data & Real-time

- **Supabase**: PostgreSQL database and real-time subscriptions
- **EMQX Cloud**: MQTT broker for IoT messaging
- **Upstash Redis**: Caching and MQTT-to-web bridge
- **Zustand**: State management

### Visualization

- **Recharts**: Charts and data visualization
- **ReactFlow**: Network topology diagrams
- **Lucide React**: Icon library

### Development Tools

- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Jest**: Testing framework
- **Husky**: Git hooks
- **lint-staged**: Pre-commit linting

## Environment Variables

Required environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# EMQX Cloud MQTT Configuration
NEXT_PUBLIC_MQTT_BROKER_URL=your_emqx_cloud_broker_url
NEXT_PUBLIC_MQTT_BROKER_PORT=8083
NEXT_PUBLIC_MQTT_USERNAME=your_mqtt_username
NEXT_PUBLIC_MQTT_PASSWORD=your_mqtt_password

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

## Contributing

1. Follow the established code style and patterns
2. Write tests for new features
3. Update documentation as needed
4. Use conventional commit messages
5. Ensure all tests pass before committing

## Architecture Notes

### UNS (Unified Namespace) Structure

The application implements a hierarchical topic structure:

```
UNSDemo/Factory1/ProductionFloor/Line1/Machine[X]/[DataType]/[Parameter]
```

### Data Flow

```
CNC Machines → MQTT (EMQX Cloud) → Redis (Upstash) → Next.js App → Supabase → Real-time Dashboards
```

### Dashboard Architecture

- **Executive Dashboard**: High-level KPIs and operational metrics
- **Factory Manager**: Comprehensive operational visibility
- **Production Manager**: Real-time production status and scheduling
- **Maintenance Technician**: Equipment health and maintenance alerts
