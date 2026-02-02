'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import {
  Lightbulb,
  Plus,
  Settings,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Zap,
  Database,
  Cloud,
  Webhook,
  Globe,
  X,
  Save,
  TestTube,
  RefreshCw,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Integration {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'webhook' | 'database' | 'cloud' | 'iot' | 'erp';
  status: 'active' | 'inactive' | 'error' | 'testing';
  provider: string;
  configuredAt: string;
  lastSync: string;
  endpoint?: string;
  apiKey?: string;
  webhookUrl?: string;
  config: Record<string, unknown>;
  metrics: {
    requests: number;
    errors: number;
    uptime: string;
  };
}

interface IntegrationTemplate {
  id: string;
  name: string;
  description: string;
  type: 'api' | 'webhook' | 'database' | 'cloud' | 'iot' | 'erp';
  provider: string;
  icon: React.ReactNode;
  popular: boolean;
  configFields: {
    name: string;
    type: 'text' | 'password' | 'url' | 'select';
    label: string;
    required: boolean;
    options?: string[];
  }[];
}

const mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Supabase Database',
    description: 'Primary database for dashboard data and user management',
    type: 'database',
    status: 'active',
    provider: 'Supabase',
    configuredAt: '2024-01-10',
    lastSync: '2024-01-15 14:30',
    config: {
      url: 'https://your-project.supabase.co',
      realtime: true,
    },
    metrics: {
      requests: 12543,
      errors: 2,
      uptime: '99.8%',
    },
  },
  {
    id: '2',
    name: 'EMQX MQTT Broker',
    description: 'IoT device communication and real-time sensor data',
    type: 'iot',
    status: 'active',
    provider: 'EMQX Cloud',
    configuredAt: '2024-01-05',
    lastSync: '2024-01-15 14:28',
    endpoint: 'broker.emqx.io:1883',
    config: {
      port: 1883,
      ssl: true,
      keepalive: 60,
    },
    metrics: {
      requests: 45234,
      errors: 12,
      uptime: '99.9%',
    },
  },
  {
    id: '3',
    name: 'Email Notifications',
    description: 'Automated email alerts for maintenance and system events',
    type: 'api',
    status: 'active',
    provider: 'SendGrid',
    configuredAt: '2024-01-08',
    lastSync: '2024-01-15 12:15',
    config: {
      apiKey: 'SG.*********************',
      fromEmail: 'alerts@company.com',
    },
    metrics: {
      requests: 234,
      errors: 1,
      uptime: '99.5%',
    },
  },
  {
    id: '4',
    name: 'Maintenance Webhook',
    description: 'Webhook endpoint for external maintenance management system',
    type: 'webhook',
    status: 'inactive',
    provider: 'Custom',
    configuredAt: '2024-01-12',
    lastSync: 'Never',
    webhookUrl: 'https://api.maintenace-system.com/webhooks/alerts',
    config: {
      events: ['work_order_created', 'equipment_failure'],
      authentication: 'bearer_token',
    },
    metrics: {
      requests: 0,
      errors: 0,
      uptime: '0%',
    },
  },
  {
    id: '5',
    name: 'TimescaleDB Analytics',
    description:
      'Time-series database for sensor data and predictive analytics',
    type: 'database',
    status: 'error',
    provider: 'TimescaleDB',
    configuredAt: '2024-01-03',
    lastSync: '2024-01-14 08:30',
    config: {
      host: 'localhost',
      port: 5432,
      database: 'sensors',
    },
    metrics: {
      requests: 8765,
      errors: 45,
      uptime: '94.2%',
    },
  },
];

const integrationTemplates: IntegrationTemplate[] = [
  {
    id: 'slack',
    name: 'Slack Notifications',
    description: 'Send alerts and notifications to Slack channels',
    type: 'api',
    provider: 'Slack',
    icon: <Zap className="h-6 w-6" />,
    popular: true,
    configFields: [
      {
        name: 'webhook_url',
        type: 'url',
        label: 'Webhook URL',
        required: true,
      },
      {
        name: 'channel',
        type: 'text',
        label: 'Default Channel',
        required: true,
      },
    ],
  },
  {
    id: 'microsoft-teams',
    name: 'Microsoft Teams',
    description: 'Integration with Microsoft Teams for notifications',
    type: 'api',
    provider: 'Microsoft',
    icon: <Globe className="h-6 w-6" />,
    popular: true,
    configFields: [
      {
        name: 'webhook_url',
        type: 'url',
        label: 'Teams Webhook URL',
        required: true,
      },
    ],
  },
  {
    id: 'sap',
    name: 'SAP ERP Integration',
    description: 'Connect with SAP for inventory and work order management',
    type: 'erp',
    provider: 'SAP',
    icon: <Database className="h-6 w-6" />,
    popular: false,
    configFields: [
      { name: 'server', type: 'text', label: 'SAP Server', required: true },
      { name: 'client', type: 'text', label: 'Client Number', required: true },
      { name: 'username', type: 'text', label: 'Username', required: true },
      { name: 'password', type: 'password', label: 'Password', required: true },
    ],
  },
  {
    id: 'aws-iot',
    name: 'AWS IoT Core',
    description: 'Amazon Web Services IoT device management and data ingestion',
    type: 'cloud',
    provider: 'Amazon Web Services',
    icon: <Cloud className="h-6 w-6" />,
    popular: false,
    configFields: [
      {
        name: 'region',
        type: 'select',
        label: 'AWS Region',
        required: true,
        options: ['us-east-1', 'us-west-2', 'eu-west-1'],
      },
      {
        name: 'access_key',
        type: 'text',
        label: 'Access Key ID',
        required: true,
      },
      {
        name: 'secret_key',
        type: 'password',
        label: 'Secret Access Key',
        required: true,
      },
    ],
  },
  {
    id: 'prometheus',
    name: 'Prometheus Metrics',
    description: 'Export metrics to Prometheus for monitoring and alerting',
    type: 'api',
    provider: 'Prometheus',
    icon: <Activity className="h-6 w-6" />,
    popular: false,
    configFields: [
      {
        name: 'endpoint',
        type: 'url',
        label: 'Prometheus Endpoint',
        required: true,
      },
      { name: 'job_name', type: 'text', label: 'Job Name', required: true },
    ],
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(mockIntegrations);
  const [showAddModal, setShowAddModal] = useState(false);
  const [, setEditingIntegration] = useState<Integration | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState<Integration | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<IntegrationTemplate | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'testing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
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
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'testing':
        return <TestTube className="h-4 w-4 text-yellow-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'api':
        return <Zap className="h-5 w-5" />;
      case 'webhook':
        return <Webhook className="h-5 w-5" />;
      case 'database':
        return <Database className="h-5 w-5" />;
      case 'cloud':
        return <Cloud className="h-5 w-5" />;
      case 'iot':
        return <Activity className="h-5 w-5" />;
      case 'erp':
        return <Settings className="h-5 w-5" />;
      default:
        return <Globe className="h-5 w-5" />;
    }
  };

  const handleTestIntegration = async (integration: Integration) => {
    // Update status to testing
    setIntegrations(prev =>
      prev.map(i => (i.id === integration.id ? { ...i, status: 'testing' } : i))
    );

    // Simulate API test
    setTimeout(() => {
      setIntegrations(prev =>
        prev.map(i =>
          i.id === integration.id
            ? { ...i, status: 'active', lastSync: new Date().toLocaleString() }
            : i
        )
      );
    }, 2000);
  };

  const handleDeleteIntegration = (integration: Integration) => {
    setIntegrations(prev => prev.filter(i => i.id !== integration.id));
    setShowDeleteConfirm(null);
  };

  return (
    <ProtectedRoute>
      <Layout
        title="Integrations"
        status={{
          message: 'All Integrations Running',
          isHealthy: true,
        }}
      >
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Lightbulb className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Integrations
                </h1>
                <p className="text-gray-600">
                  Manage API connections, webhooks, and third-party services
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Integration</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Integrations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {integrations.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {integrations.filter(i => i.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Errors</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {integrations.filter(i => i.status === 'error').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-card">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Activity className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {integrations
                      .reduce((sum, i) => sum + i.metrics.requests, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {integrations.map(integration => (
            <div
              key={integration.id}
              className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTypeIcon(integration.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {integration.provider}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(integration.status)}
                    <span
                      className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(integration.status)}`}
                    >
                      {integration.status.charAt(0).toUpperCase() +
                        integration.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">
                  {integration.description}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {integration.metrics.requests.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">Requests</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {integration.metrics.errors}
                    </p>
                    <p className="text-xs text-gray-600">Errors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">
                      {integration.metrics.uptime}
                    </p>
                    <p className="text-xs text-gray-600">Uptime</p>
                  </div>
                </div>

                {/* Last Sync */}
                <div className="mb-4">
                  <p className="text-xs text-gray-600">
                    Last sync:{' '}
                    <span className="text-gray-900">
                      {integration.lastSync}
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleTestIntegration(integration)}
                    disabled={integration.status === 'testing'}
                    className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {integration.status === 'testing' ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <TestTube className="h-4 w-4" />
                    )}
                    <span>
                      {integration.status === 'testing' ? 'Testing...' : 'Test'}
                    </span>
                  </button>
                  <button
                    onClick={() => setEditingIntegration(integration)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(integration)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Integration Modal */}
        {showAddModal && (
          <AddIntegrationModal
            templates={integrationTemplates}
            selectedTemplate={selectedTemplate}
            onSelectTemplate={setSelectedTemplate}
            onClose={() => {
              setShowAddModal(false);
              setSelectedTemplate(null);
            }}
            onSave={newIntegration => {
              setIntegrations(prev => [
                ...prev,
                {
                  ...newIntegration,
                  id: Date.now().toString(),
                  status: 'testing' as const,
                  configuredAt: new Date().toISOString().split('T')[0],
                  lastSync: 'Never',
                  metrics: { requests: 0, errors: 0, uptime: '0%' },
                },
              ]);
              setShowAddModal(false);
              setSelectedTemplate(null);
            }}
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
                  Delete Integration
                </h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete the{' '}
                <strong>{showDeleteConfirm.name}</strong> integration? This will
                stop all data synchronization and cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteIntegration(showDeleteConfirm)}
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

// Add Integration Modal Component
function AddIntegrationModal({
  templates,
  selectedTemplate,
  onSelectTemplate,
  onClose,
  onSave,
}: {
  templates: IntegrationTemplate[];
  selectedTemplate: IntegrationTemplate | null;
  onSelectTemplate: (template: IntegrationTemplate | null) => void;
  onClose: () => void;
  onSave: (
    integration: Omit<
      Integration,
      'id' | 'status' | 'configuredAt' | 'lastSync' | 'metrics'
    >
  ) => void;
}) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [step, setStep] = useState<'select' | 'configure'>('select');

  const handleTemplateSelect = (template: IntegrationTemplate) => {
    onSelectTemplate(template);
    setStep('configure');
    // Initialize form data with empty values
    const initialData: Record<string, string> = {};
    template.configFields.forEach(field => {
      initialData[field.name] = '';
    });
    setFormData(initialData);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;

    const integration = {
      name: selectedTemplate.name,
      description: selectedTemplate.description,
      type: selectedTemplate.type,
      provider: selectedTemplate.provider,
      config: formData,
    };

    onSave(integration);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">
            {step === 'select'
              ? 'Add Integration'
              : `Configure ${selectedTemplate?.name}`}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === 'select' ? (
          <div>
            {/* Popular Integrations */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-900 mb-3">
                Popular Integrations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates
                  .filter(t => t.popular)
                  .map(template => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          {template.icon}
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">
                            {template.name}
                          </h5>
                          <p className="text-sm text-gray-600">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* All Integrations */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-3">
                All Integrations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {template.icon}
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-900">
                          {template.name}
                        </h5>
                        <p className="text-xs text-gray-600">
                          {template.provider}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {template.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          selectedTemplate && (
            <div>
              {/* Back Button */}
              <button
                onClick={() => {
                  setStep('select');
                  onSelectTemplate(null);
                }}
                className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 mb-4"
              >
                <span>← Back to integrations</span>
              </button>

              {/* Configuration Form */}
              <div className="space-y-6">
                {selectedTemplate.configFields.map(field => (
                  <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.name] || ''}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required={field.required}
                      >
                        <option value="">Select {field.label}</option>
                        {field.options?.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={formData[field.name] || ''}
                        onChange={e =>
                          setFormData(prev => ({
                            ...prev,
                            [field.name]: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        required={field.required}
                      />
                    )}
                  </div>
                ))}
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
                  <span>Create Integration</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
