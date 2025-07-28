# UNS Smart Maintenance Demo System

A Unified Namespace demonstration platform that helps factory managers, production managers, and maintenance teams optimize CNC machine operations through real-time data collection, predictive analytics, and prescriptive maintenance recommendations.

## 🏭 Overview

The UNS Smart Maintenance system addresses critical challenges in industrial manufacturing by implementing a Unified Namespace architecture that transforms fragmented machine data into actionable insights. Our platform demonstrates how modern IoT and AI technologies can shift maintenance strategies from reactive to predictive, resulting in significant cost savings and operational efficiency improvements.

## 🎯 Key Features

### Core Capabilities

- **Real-Time Data Collection** - Continuous monitoring and normalization of CNC machine data across heterogeneous equipment
- **Predictive Analytics Engine** - Machine learning models that identify potential equipment failures 2-4 weeks in advance
- **Prescriptive Maintenance Recommendations** - AI-powered suggestions for optimal maintenance timing and actions
- **Unified Data Architecture** - Standardized namespace for seamless data integration and scalability

### Role-Based Dashboards

- **Executive KPI Dashboard** - High-level operational metrics for C-suite decision-making
- **Production Manager Dashboard** - Real-time production status and scheduling optimization
- **Factory Manager Dashboard** - Comprehensive operational visibility with drill-down analysis
- **Maintenance Technician Dashboard** - Equipment health status and predictive alerts

## 🏗️ Technical Architecture

### Technology Stack

- **Frontend:** Next.js 15 with TypeScript and React
- **UI Framework:** TailwindCSS with shadcn/ui components
- **Database:** Supabase (PostgreSQL) with real-time subscriptions
- **MQTT Broker:** EMQX Cloud for IoT messaging
- **Data Bridge:** Upstash Redis for MQTT-to-web integration
- **Charts:** Recharts for data visualization
- **Deployment:** Vercel with GitHub integration

### Data Flow Architecture

```
Simulated CNC Machines → MQTT Topics (UNS Hierarchy) → EMQX Cloud → Upstash Redis → Next.js App → Supabase → Real-time Dashboards
```

### UNS Topic Hierarchy

- **Descriptive Layer:** Physical location and equipment identification
- **Functional Layer:** Machine capabilities and operational functions
- **Informative Layer:** Real-time data streams and status information
- **Ad Hoc Layer:** Temporary data and event-driven communications

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ LTS
- npm (latest version)
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/innovaassolutions/unsSmartMaintenance.git
   cd unsSmartMaintenance
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your configuration values
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode

## 🧪 Development

### Code Quality

This project uses:

- **ESLint** with Next.js and TypeScript rules
- **Prettier** for consistent code formatting
- **Husky** and **lint-staged** for pre-commit hooks
- **Jest** and **React Testing Library** for testing

### Project Structure

```
├── .agent-os/          # Agent OS documentation and specs
├── app/                # Next.js app directory
├── components/         # Reusable React components
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
├── __tests__/          # Test files
└── public/             # Static assets
```

## 🎭 User Personas

### Factory Manager (35-55 years old)

- **Goal:** Minimize downtime, optimize production efficiency
- **Pain Points:** Lack of real-time visibility, reactive maintenance

### Production Manager (30-50 years old)

- **Goal:** Maintain production targets, prevent breakdowns
- **Pain Points:** Difficulty predicting failures, inefficient scheduling

### C-suite Management (45-65 years old)

- **Goal:** Achieve operational excellence, demonstrate ROI
- **Pain Points:** Limited operational insights, high maintenance costs

### Maintenance Technician (25-45 years old)

- **Goal:** Prevent equipment failures, optimize schedules
- **Pain Points:** Reactive approach, limited predictive insights

## 📊 Expected Benefits

- **50% faster** integration of new machines
- **30-40% reduction** in unplanned downtime
- **60% faster** decision-making process
- **3-5x cost savings** vs reactive maintenance

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software developed by Innova Solutions.

## 🏢 About Innova Solutions

This UNS Smart Maintenance demo system showcases Innova Solutions' expertise in Industry 4.0 digital transformation, combining modern web technologies with industrial IoT to deliver measurable business value.

---

**Built with ❤️ for the future of smart manufacturing**
