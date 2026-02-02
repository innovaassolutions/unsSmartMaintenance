'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Bot,
  Activity,
  TrendingUp,
  AlertCircle,
  Plus,
  Settings,
  Play,
  Pause,
  Edit2,
  Trash2,
  Eye,
  Brain,
  Zap,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  Save,
  Calendar,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface AIAgent {
  id: string;
  name: string;
  description: string;
  type:
    | 'predictive'
    | 'quality'
    | 'optimization'
    | 'planning'
    | 'diagnostic'
    | 'safety';
  status: 'active' | 'inactive' | 'training' | 'error';
  performance: number;
  activeTasks: number;
  totalTasks: number;
  accuracy: number;
  lastUpdated: string;
  createdAt: string;
  model: string;
  version: string;
  prompt: {
    system: string;
    userTemplate: string;
    examples: { input: string; output: string }[];
  };
  config: {
    temperature: number;
    maxTokens: number;
    interval: number; // in minutes
    triggers: string[];
  };
  metrics: {
    successRate: number;
    avgResponseTime: number;
    totalRuns: number;
    errorsToday: number;
  };
}

const mockAgents: AIAgent[] = [
  {
    id: '1',
    name: 'Predictive Maintenance Agent',
    description:
      'Analyzes sensor data to predict equipment failures and recommend maintenance schedules',
    type: 'predictive',
    status: 'active',
    performance: 98.5,
    activeTasks: 8,
    totalTasks: 156,
    accuracy: 94.2,
    lastUpdated: '2024-01-15 14:30',
    createdAt: '2023-12-01',
    model: 'GPT-4',
    version: '2.1.0',
    prompt: {
      system:
        'You are an expert predictive maintenance AI analyzing industrial equipment sensor data. Your task is to identify patterns that indicate potential equipment failures and recommend proactive maintenance actions.',
      userTemplate:
        'Analyze the following sensor data for {machine_type} machine {machine_id}:\n\nSensor readings:\n{sensor_data}\n\nMachine history:\n{maintenance_history}\n\nProvide analysis and recommendations.',
      examples: [
        {
          input:
            'Temperature: 85°C (normal: 60-75°C), Vibration: 12mm/s (normal: <8mm/s), Machine: CNC-001',
          output:
            '⚠️ MAINTENANCE RECOMMENDED: Temperature 13% above normal, vibration 50% above baseline. Suggests bearing wear. Schedule inspection within 3-5 days before critical failure.',
        },
      ],
    },
    config: {
      temperature: 0.3,
      maxTokens: 500,
      interval: 15,
      triggers: ['sensor_threshold_exceeded', 'pattern_anomaly_detected'],
    },
    metrics: {
      successRate: 98.5,
      avgResponseTime: 1.2,
      totalRuns: 2456,
      errorsToday: 2,
    },
  },
  {
    id: '2',
    name: 'Quality Control Agent',
    description:
      'Monitors production quality metrics and identifies defect patterns in real-time',
    type: 'quality',
    status: 'active',
    performance: 96.2,
    activeTasks: 12,
    totalTasks: 89,
    accuracy: 92.8,
    lastUpdated: '2024-01-15 14:28',
    createdAt: '2023-11-15',
    model: 'GPT-4',
    version: '1.8.2',
    prompt: {
      system:
        'You are a quality control expert AI specializing in manufacturing defect analysis. Analyze production data to identify quality issues, root causes, and corrective actions.',
      userTemplate:
        'Quality control analysis for batch {batch_id} on line {production_line}:\n\nQuality metrics:\n{quality_data}\n\nDefect patterns:\n{defect_data}\n\nAnalyze and provide quality assessment.',
      examples: [
        {
          input:
            'Batch: B-2024-001, Defect rate: 2.3% (target: <1%), Primary defects: surface irregularities (67%), dimensional variance (23%)',
          output:
            '🔍 QUALITY ALERT: Defect rate 130% above target. Surface irregularities indicate tooling wear on Station 3. Recommend immediate tool inspection and replacement.',
        },
      ],
    },
    config: {
      temperature: 0.2,
      maxTokens: 400,
      interval: 10,
      triggers: ['quality_threshold_breach', 'defect_pattern_detected'],
    },
    metrics: {
      successRate: 96.2,
      avgResponseTime: 0.9,
      totalRuns: 1834,
      errorsToday: 5,
    },
  },
  {
    id: '3',
    name: 'Energy Optimization Agent',
    description:
      'Optimizes energy consumption across manufacturing processes to reduce costs and environmental impact',
    type: 'optimization',
    status: 'active',
    performance: 99.1,
    activeTasks: 5,
    totalTasks: 34,
    accuracy: 97.3,
    lastUpdated: '2024-01-15 14:25',
    createdAt: '2024-01-02',
    model: 'Claude-3',
    version: '1.2.0',
    prompt: {
      system:
        'You are an energy optimization specialist AI for manufacturing facilities. Analyze energy consumption patterns and recommend efficiency improvements while maintaining production quality.',
      userTemplate:
        'Energy optimization analysis for {time_period}:\n\nConsumption data:\n{energy_data}\n\nProduction schedule:\n{production_schedule}\n\nProvide energy optimization recommendations.',
      examples: [
        {
          input:
            'Peak usage: 245kW (06:00-14:00), Off-peak: 89kW, Equipment idle time: 23% during peak hours',
          output:
            '⚡ OPTIMIZATION OPPORTUNITY: Reschedule non-critical processes to off-peak hours. Potential 18% cost reduction (~$2,400/month). Implement smart scheduling for auxiliary equipment.',
        },
      ],
    },
    config: {
      temperature: 0.4,
      maxTokens: 600,
      interval: 60,
      triggers: ['peak_usage_detected', 'efficiency_opportunity'],
    },
    metrics: {
      successRate: 99.1,
      avgResponseTime: 1.8,
      totalRuns: 456,
      errorsToday: 0,
    },
  },
  {
    id: '4',
    name: 'Production Planning Agent',
    description:
      'Optimizes production schedules based on demand forecasts, resource availability, and capacity constraints',
    type: 'planning',
    status: 'training',
    performance: 94.8,
    activeTasks: 0,
    totalTasks: 67,
    accuracy: 89.5,
    lastUpdated: '2024-01-15 10:15',
    createdAt: '2023-10-20',
    model: 'GPT-4',
    version: '1.9.1',
    prompt: {
      system:
        'You are a production planning AI expert specializing in manufacturing optimization. Create efficient production schedules considering demand, resources, lead times, and constraints.',
      userTemplate:
        'Production planning request:\n\nDemand forecast:\n{demand_data}\n\nResource availability:\n{resource_data}\n\nConstraints:\n{constraints}\n\nGenerate optimized production schedule.',
      examples: [
        {
          input:
            'Demand: 500 units Widget-A (Due: Jan 25), 300 units Widget-B (Due: Jan 30), Available capacity: 80 units/day, Setup time: 2 hours between products',
          output:
            '📅 OPTIMAL SCHEDULE: Start Widget-A on Jan 18 (7 days, including setup), transition to Widget-B on Jan 25. Buffer of 1 day for Widget-B delivery. Utilization: 94%',
        },
      ],
    },
    config: {
      temperature: 0.5,
      maxTokens: 800,
      interval: 1440, // daily
      triggers: ['demand_change', 'resource_availability_change'],
    },
    metrics: {
      successRate: 94.8,
      avgResponseTime: 3.2,
      totalRuns: 234,
      errorsToday: 1,
    },
  },
  {
    id: '5',
    name: 'Safety Compliance Agent',
    description:
      'Monitors safety protocols and identifies potential hazards in real-time manufacturing operations',
    type: 'safety',
    status: 'error',
    performance: 87.3,
    activeTasks: 0,
    totalTasks: 23,
    accuracy: 95.7,
    lastUpdated: '2024-01-14 16:45',
    createdAt: '2024-01-08',
    model: 'GPT-4',
    version: '1.0.3',
    prompt: {
      system:
        'You are a manufacturing safety expert AI focused on OSHA compliance and hazard identification. Monitor operations for safety violations and recommend immediate corrective actions.',
      userTemplate:
        'Safety monitoring alert:\n\nIncident type: {incident_type}\nLocation: {location}\nPersonnel involved: {personnel}\nEnvironmental conditions: {conditions}\n\nAssess safety risk and provide immediate response recommendations.',
      examples: [
        {
          input:
            'Incident: Worker entered restricted zone without PPE, Location: Cell-A, Conditions: Machine operational, high noise',
          output:
            '🚨 IMMEDIATE ACTION REQUIRED: Stop operations in Cell-A. Evacuate worker, enforce PPE requirements. Conduct safety briefing before resuming. Document incident per OSHA 1904.7.',
        },
      ],
    },
    config: {
      temperature: 0.1,
      maxTokens: 300,
      interval: 5,
      triggers: ['safety_violation_detected', 'emergency_shutdown'],
    },
    metrics: {
      successRate: 87.3,
      avgResponseTime: 0.6,
      totalRuns: 89,
      errorsToday: 8,
    },
  },
];

export default function AIAgentsDashboard() {
  const [agents, setAgents] = useState<AIAgent[]>(mockAgents);
  const [showAgentDetails, setShowAgentDetails] = useState<AIAgent | null>(
    null
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<AIAgent | null>(
    null
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'training':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'training':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'predictive':
        return <TrendingUp className="h-5 w-5" />;
      case 'quality':
        return <CheckCircle className="h-5 w-5" />;
      case 'optimization':
        return <Zap className="h-5 w-5" />;
      case 'planning':
        return <Calendar className="h-5 w-5" />;
      case 'diagnostic':
        return <Activity className="h-5 w-5" />;
      case 'safety':
        return <Shield className="h-5 w-5" />;
      default:
        return <Bot className="h-5 w-5" />;
    }
  };

  const handleToggleAgent = (agent: AIAgent) => {
    setAgents(prev =>
      prev.map(a =>
        a.id === agent.id
          ? { ...a, status: a.status === 'active' ? 'inactive' : 'active' }
          : a
      )
    );
  };

  const handleDeleteAgent = (agent: AIAgent) => {
    setAgents(prev => prev.filter(a => a.id !== agent.id));
    setShowDeleteConfirm(null);
  };

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const totalTasks = agents.reduce((sum, a) => sum + a.activeTasks, 0);
  const avgPerformance =
    agents.reduce((sum, a) => sum + a.performance, 0) / agents.length;
  const totalErrors = agents.reduce((sum, a) => sum + a.metrics.errorsToday, 0);

  return (
    <ProtectedRoute>
      <Layout
        title="AI Agent Management"
        status={{
          message: 'All Agents Operational',
          isHealthy: true,
        }}
      >
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Brain className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  AI Agent Management
                </h1>
                <p className="text-gray-600">
                  Configure and monitor AI agents for predictive maintenance and
                  optimization
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Agent</span>
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Bot className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Agents</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {activeAgents}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Processing Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalTasks}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Performance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {avgPerformance.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Errors Today</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {totalErrors}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Agent Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map(agent => (
            <div
              key={agent.id}
              className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer"
            >
              {/* Agent Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTypeIcon(agent.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {agent.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {agent.model} v{agent.version}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(agent.status)}
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(agent.status)}`}
                    >
                      {agent.status.charAt(0).toUpperCase() +
                        agent.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {agent.description}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {agent.performance}%
                    </p>
                    <p className="text-xs text-gray-600">Performance</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {agent.activeTasks}
                    </p>
                    <p className="text-xs text-gray-600">Active Tasks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {agent.accuracy}%
                    </p>
                    <p className="text-xs text-gray-600">Accuracy</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-gray-900">
                      {agent.metrics.errorsToday}
                    </p>
                    <p className="text-xs text-gray-600">Errors Today</p>
                  </div>
                </div>

                {/* Last Updated */}
                <p className="text-xs text-gray-500 mb-4">
                  Last updated: {agent.lastUpdated}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowAgentDetails(agent);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setEditingAgent(agent);
                    }}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Configure</span>
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleToggleAgent(agent);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    {agent.status === 'active' ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowDeleteConfirm(agent);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Agent Details Modal */}
        {showAgentDetails && (
          <AgentDetailsModal
            agent={showAgentDetails}
            onClose={() => setShowAgentDetails(null)}
            onEdit={() => {
              setEditingAgent(showAgentDetails);
              setShowAgentDetails(null);
            }}
          />
        )}

        {/* Agent Configuration Modal */}
        {editingAgent && (
          <AgentConfigModal
            agent={editingAgent}
            onSave={updatedAgent => {
              setAgents(prev =>
                prev.map(a => (a.id === updatedAgent.id ? updatedAgent : a))
              );
              setEditingAgent(null);
            }}
            onClose={() => setEditingAgent(null)}
          />
        )}

        {/* Add Agent Modal */}
        {showAddModal && (
          <AddAgentModal
            onSave={newAgent => {
              const agent: AIAgent = {
                ...newAgent,
                id: Date.now().toString(),
                status: 'inactive',
                performance: 0,
                activeTasks: 0,
                totalTasks: 0,
                accuracy: 0,
                lastUpdated: new Date().toLocaleString(),
                createdAt: new Date().toISOString().split('T')[0],
                version: '1.0.0',
                prompt: {
                  system: newAgent.prompt.system,
                  userTemplate: newAgent.prompt.userTemplate,
                  examples: [],
                },
                metrics: {
                  successRate: 0,
                  avgResponseTime: 0,
                  totalRuns: 0,
                  errorsToday: 0,
                },
              };
              setAgents(prev => [...prev, agent]);
              setShowAddModal(false);
            }}
            onClose={() => setShowAddModal(false)}
          />
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Agent
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete{' '}
                <strong>{showDeleteConfirm.name}</strong>? This will stop all
                active tasks and cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteAgent(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}

// Agent Details Modal Component
function AgentDetailsModal({
  agent,
  onClose,
  onEdit,
}: {
  agent: AIAgent;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bot className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {agent.name}
              </h3>
              <p className="text-gray-600">{agent.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent Information */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Agent Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Model:</span>
                  <span className="text-gray-900">{agent.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Version:</span>
                  <span className="text-gray-900">{agent.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="text-gray-900">{agent.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="text-gray-900 capitalize">{agent.type}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Performance Metrics
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {agent.metrics.successRate}%
                  </p>
                  <p className="text-gray-600">Success Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {agent.metrics.avgResponseTime}s
                  </p>
                  <p className="text-gray-600">Avg Response</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {agent.metrics.totalRuns}
                  </p>
                  <p className="text-gray-600">Total Runs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {agent.metrics.errorsToday}
                  </p>
                  <p className="text-gray-600">Errors Today</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Temperature:</span>
                  <span className="text-gray-900">
                    {agent.config.temperature}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Tokens:</span>
                  <span className="text-gray-900">
                    {agent.config.maxTokens}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interval:</span>
                  <span className="text-gray-900">
                    {agent.config.interval} min
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Triggers:</span>
                  <span className="text-gray-900">
                    {agent.config.triggers.length} configured
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Prompt Configuration */}
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">System Prompt</h4>
              <div className="bg-white rounded border p-3 text-sm text-gray-700 max-h-32 overflow-y-auto">
                {agent.prompt.system}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">User Template</h4>
              <div className="bg-white rounded border p-3 text-sm text-gray-700 max-h-32 overflow-y-auto font-mono">
                {agent.prompt.userTemplate}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">
                Example Interactions
              </h4>
              <div className="space-y-3">
                {agent.prompt.examples.map((example, index) => (
                  <div
                    key={index}
                    className="bg-white rounded border p-3 text-sm"
                  >
                    <div className="text-gray-600 mb-1">Input:</div>
                    <div className="text-gray-700 mb-2 font-mono text-xs">
                      {example.input}
                    </div>
                    <div className="text-gray-600 mb-1">Output:</div>
                    <div className="text-gray-700 font-mono text-xs">
                      {example.output}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-6 pt-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Edit2 className="h-4 w-4" />
            <span>Edit Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Agent Configuration Modal Component
function AgentConfigModal({
  agent,
  onSave,
  onClose,
}: {
  agent: AIAgent;
  onSave: (agent: AIAgent) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: agent.name,
    description: agent.description,
    systemPrompt: agent.prompt.system,
    userTemplate: agent.prompt.userTemplate,
    temperature: agent.config.temperature,
    maxTokens: agent.config.maxTokens,
    interval: agent.config.interval,
  });

  const handleSave = () => {
    const updatedAgent: AIAgent = {
      ...agent,
      name: formData.name,
      description: formData.description,
      prompt: {
        ...agent.prompt,
        system: formData.systemPrompt,
        userTemplate: formData.userTemplate,
      },
      config: {
        ...agent.config,
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        interval: formData.interval,
      },
      lastUpdated: new Date().toLocaleString(),
    };
    onSave(updatedAgent);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            Configure Agent
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Model Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    temperature: parseFloat(e.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                min="1"
                max="4000"
                value={formData.maxTokens}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    maxTokens: parseInt(e.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={formData.interval}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    interval: parseInt(e.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Prompt Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={e =>
                setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))
              }
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
              placeholder="Enter the system prompt that defines the agent's behavior and expertise..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Message Template
            </label>
            <textarea
              value={formData.userTemplate}
              onChange={e =>
                setFormData(prev => ({ ...prev, userTemplate: e.target.value }))
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
              placeholder="Template for user messages with variables like {machine_id}, {sensor_data}, etc."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Add Agent Modal Component
function AddAgentModal({
  onSave,
  onClose,
}: {
  onSave: (agent: Partial<AIAgent>) => void;
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'predictive' as AIAgent['type'],
    model: 'GPT-4',
    systemPrompt: '',
    userTemplate: '',
    temperature: 0.3,
    maxTokens: 500,
    interval: 15,
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'predictive':
        return TrendingUp;
      case 'quality':
        return CheckCircle;
      case 'optimization':
        return Zap;
      case 'planning':
        return Calendar;
      case 'diagnostic':
        return Activity;
      case 'safety':
        return Shield;
      default:
        return Bot;
    }
  };

  const agentTemplates = [
    {
      type: 'predictive' as const,
      name: 'Predictive Maintenance Agent',
      description:
        'Analyzes sensor data to predict equipment failures and recommend maintenance schedules',
      systemPrompt:
        'You are an expert predictive maintenance AI analyzing industrial equipment sensor data. Your task is to identify patterns that indicate potential equipment failures and recommend proactive maintenance actions.',
      userTemplate:
        'Analyze the following sensor data for {machine_type} machine {machine_id}:\n\nSensor readings:\n{sensor_data}\n\nMachine history:\n{maintenance_history}\n\nProvide analysis and recommendations.',
    },
    {
      type: 'quality' as const,
      name: 'Quality Control Agent',
      description:
        'Monitors production quality metrics and identifies defect patterns in real-time',
      systemPrompt:
        'You are a quality control expert AI specializing in manufacturing defect analysis. Analyze production data to identify quality issues, root causes, and corrective actions.',
      userTemplate:
        'Quality control analysis for batch {batch_id} on line {production_line}:\n\nQuality metrics:\n{quality_data}\n\nDefect patterns:\n{defect_data}\n\nAnalyze and provide quality assessment.',
    },
    {
      type: 'optimization' as const,
      name: 'Energy Optimization Agent',
      description:
        'Optimizes energy consumption across manufacturing processes to reduce costs and environmental impact',
      systemPrompt:
        'You are an energy optimization specialist AI for manufacturing facilities. Analyze energy consumption patterns and recommend efficiency improvements while maintaining production quality.',
      userTemplate:
        'Energy optimization analysis for {time_period}:\n\nConsumption data:\n{energy_data}\n\nProduction schedule:\n{production_schedule}\n\nProvide energy optimization recommendations.',
    },
    {
      type: 'planning' as const,
      name: 'Production Planning Agent',
      description:
        'Optimizes production schedules based on demand forecasts, resource availability, and capacity constraints',
      systemPrompt:
        'You are a production planning AI expert specializing in manufacturing optimization. Create efficient production schedules considering demand, resources, lead times, and constraints.',
      userTemplate:
        'Production planning request:\n\nDemand forecast:\n{demand_data}\n\nResource availability:\n{resource_data}\n\nConstraints:\n{constraints}\n\nGenerate optimized production schedule.',
    },
    {
      type: 'diagnostic' as const,
      name: 'Diagnostic Agent',
      description:
        'Diagnoses equipment issues and provides troubleshooting recommendations',
      systemPrompt:
        'You are a manufacturing diagnostic expert AI. Analyze equipment symptoms and operational data to identify root causes and provide step-by-step troubleshooting guidance.',
      userTemplate:
        'Equipment diagnostic request:\n\nMachine: {machine_id}\nSymptoms: {symptoms}\nOperational data: {operational_data}\nError codes: {error_codes}\n\nProvide diagnostic analysis and troubleshooting steps.',
    },
    {
      type: 'safety' as const,
      name: 'Safety Compliance Agent',
      description:
        'Monitors safety protocols and identifies potential hazards in real-time manufacturing operations',
      systemPrompt:
        'You are a manufacturing safety expert AI focused on OSHA compliance and hazard identification. Monitor operations for safety violations and recommend immediate corrective actions.',
      userTemplate:
        'Safety monitoring alert:\n\nIncident type: {incident_type}\nLocation: {location}\nPersonnel involved: {personnel}\nEnvironmental conditions: {conditions}\n\nAssess safety risk and provide immediate response recommendations.',
    },
  ];

  const handleTemplateSelect = (template: (typeof agentTemplates)[0]) => {
    setFormData(prev => ({
      ...prev,
      type: template.type,
      name: template.name,
      description: template.description,
      systemPrompt: template.systemPrompt,
      userTemplate: template.userTemplate,
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const newAgent = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
      model: formData.model,
      prompt: {
        system: formData.systemPrompt,
        userTemplate: formData.userTemplate,
      },
      config: {
        temperature: formData.temperature,
        maxTokens: formData.maxTokens,
        interval: formData.interval,
        triggers: [],
      },
    };

    onSave(newAgent);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Bot className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">
              Add New AI Agent
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Agent Templates */}
          <div>
            <h4 className="text-lg font-medium text-gray-900 mb-4">
              Choose Agent Type
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentTemplates.map((template, index) => {
                const IconComponent = getTypeIcon(template.type);
                return (
                  <div
                    key={index}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      formData.type === template.type
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-orange-300 hover:bg-orange-25'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="p-1 bg-orange-100 rounded">
                        <IconComponent className="h-4 w-4 text-orange-600" />
                      </div>
                      <h5 className="font-medium text-gray-900 text-sm">
                        {template.name}
                      </h5>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter agent name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <select
                value={formData.model}
                onChange={e =>
                  setFormData(prev => ({ ...prev, model: e.target.value }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="GPT-4">GPT-4</option>
                <option value="GPT-3.5-Turbo">GPT-3.5-Turbo</option>
                <option value="Claude-3">Claude-3</option>
                <option value="Gemini-Pro">Gemini-Pro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={e =>
                setFormData(prev => ({ ...prev, description: e.target.value }))
              }
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Describe what this agent does and its purpose"
            />
          </div>

          {/* Model Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Temperature
              </label>
              <input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    temperature: parseFloat(e.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Controls randomness (0 = deterministic, 2 = very creative)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                min="1"
                max="4000"
                value={formData.maxTokens}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    maxTokens: parseInt(e.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum response length
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Run Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={formData.interval}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    interval: parseInt(e.target.value),
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                How often the agent runs automatically
              </p>
            </div>
          </div>

          {/* Prompt Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              value={formData.systemPrompt}
              onChange={e =>
                setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
              placeholder="Enter the system prompt that defines the agent's behavior, expertise, and personality..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Message Template
            </label>
            <textarea
              value={formData.userTemplate}
              onChange={e =>
                setFormData(prev => ({ ...prev, userTemplate: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 font-mono text-sm"
              placeholder="Template for user messages with variables like {machine_id}, {sensor_data}, {timestamp}, etc."
            />
            <p className="text-xs text-gray-500 mt-1">
              Use variables in curly braces like {'{machine_id}'} for dynamic
              content
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Agent</span>
          </button>
        </div>
      </div>
    </div>
  );
}
