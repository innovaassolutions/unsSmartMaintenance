'use client';

import React, { useState } from 'react';
import { 
  Calendar,
  Brain,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Package,
  Truck,
  Wrench,
  TrendingUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

// Mock data for intelligent scheduling
const scheduledTasks = [
  {
    id: 'MAINT-2024-001',
    machineId: 'cw-l1-01',
    machineName: 'Contact Welder L1-01',
    taskType: 'Predictive',
    priority: 'High',
    aiPrediction: {
      issueType: 'Electrode Degradation',
      confidence: 0.92,
      predictedFailureDate: '2024-01-20T14:00:00Z',
      estimatedDowntime: '2.5 hours'
    },
    scheduling: {
      optimalDate: '2024-01-15T08:00:00Z',
      scheduledDate: '2024-01-15T08:00:00Z',
      technician: 'Mike Johnson',
      skillLevel: 'Senior',
      availability: 'Available'
    },
    resources: {
      partsReady: true,
      toolsReady: true,
      partsArrival: null,
      supplierLeadTime: null
    },
    constraints: {
      productionImpact: 'Low',
      productionWindow: 'Morning Shift Preferred',
      weatherDependency: false,
      powerShutdownRequired: true
    },
    optimizationFactors: [
      'Parts availability confirmed',
      'Technician expertise match',
      'Minimal production impact',
      'Power shutdown scheduled',
      'AI confidence level high'
    ],
    status: 'Optimally Scheduled',
    estimatedCost: 245.50
  },
  {
    id: 'MAINT-2024-002',
    machineId: 'wind-l1-01',
    machineName: 'Coil Winder L1-01',
    taskType: 'Predictive',
    priority: 'Medium',
    aiPrediction: {
      issueType: 'Bearing Vibration Anomaly',
      confidence: 0.87,
      predictedFailureDate: '2024-01-25T10:00:00Z',
      estimatedDowntime: '3.5 hours'
    },
    scheduling: {
      optimalDate: '2024-01-22T13:00:00Z',
      scheduledDate: '2024-01-23T09:00:00Z',
      technician: 'Sarah Chen',
      skillLevel: 'Expert',
      availability: 'Available'
    },
    resources: {
      partsReady: false,
      toolsReady: true,
      partsArrival: '2024-01-21T12:00:00Z',
      supplierLeadTime: 'Precision Bearings Inc - 7 days'
    },
    constraints: {
      productionImpact: 'Medium',
      productionWindow: 'Afternoon Shift Only',
      weatherDependency: false,
      powerShutdownRequired: false
    },
    optimizationFactors: [
      'Delayed for parts arrival',
      'Production schedule conflict resolved',
      'Expert technician assigned',
      'Specialty tools available',
      'AI prediction window allows delay'
    ],
    status: 'Parts Pending',
    estimatedCost: 425.00
  },
  {
    id: 'MAINT-2024-003',
    machineId: 'press-l1-01',
    machineName: 'Assembly Press L1-01',
    taskType: 'Emergency',
    priority: 'Critical',
    aiPrediction: {
      issueType: 'Hydraulic Seal Failure',
      confidence: 0.95,
      predictedFailureDate: '2024-01-14T16:00:00Z',
      estimatedDowntime: '4 hours'
    },
    scheduling: {
      optimalDate: '2024-01-14T18:00:00Z',
      scheduledDate: '2024-01-14T18:00:00Z',
      technician: 'David Wilson',
      skillLevel: 'Senior',
      availability: 'On-Call'
    },
    resources: {
      partsReady: true,
      toolsReady: true,
      partsArrival: null,
      supplierLeadTime: null
    },
    constraints: {
      productionImpact: 'High',
      productionWindow: 'After Hours Only',
      weatherDependency: false,
      powerShutdownRequired: true
    },
    optimizationFactors: [
      'Emergency override activated',
      'All resources immediately available',
      'After-hours scheduling to minimize impact',
      'Senior technician on standby',
      'Critical failure prediction'
    ],
    status: 'Emergency Scheduled',
    estimatedCost: 380.00
  },
  {
    id: 'MAINT-2024-004',
    machineId: 'mold-l1-01',
    machineName: 'Injection Molder L1-01',
    taskType: 'Preventive',
    priority: 'Medium',
    aiPrediction: {
      issueType: 'Heater Element Aging',
      confidence: 0.78,
      predictedFailureDate: '2024-02-05T12:00:00Z',
      estimatedDowntime: '1.5 hours'
    },
    scheduling: {
      optimalDate: '2024-01-29T14:00:00Z',
      scheduledDate: '2024-01-30T10:00:00Z',
      technician: 'Alex Rodriguez',
      skillLevel: 'Intermediate',
      availability: 'Available'
    },
    resources: {
      partsReady: false,
      toolsReady: true,
      partsArrival: '2024-01-28T15:00:00Z',
      supplierLeadTime: 'ThermoControl Systems - 10 days'
    },
    constraints: {
      productionImpact: 'Medium',
      productionWindow: 'Flexible',
      weatherDependency: false,
      powerShutdownRequired: false
    },
    optimizationFactors: [
      'Scheduled around parts delivery',
      'Production schedule flexibility',
      'Preventive maintenance window',
      'Technician training opportunity',
      'Cost optimization achieved'
    ],
    status: 'Optimally Scheduled',
    estimatedCost: 165.00
  }
];

const technicians = [
  {
    id: 1,
    name: 'Mike Johnson',
    skillLevel: 'Senior',
    specialties: ['Welding', 'Electrical', 'Mechanical'],
    availability: 'Available',
    currentAssignments: 2,
    efficiency: 0.94,
    certification: 'Level III Certified'
  },
  {
    id: 2,
    name: 'Sarah Chen',
    skillLevel: 'Expert',
    specialties: ['Mechanical', 'Bearings', 'Precision Work'],
    availability: 'Available',
    currentAssignments: 1,
    efficiency: 0.97,
    certification: 'Master Technician'
  },
  {
    id: 3,
    name: 'David Wilson',
    skillLevel: 'Senior',
    specialties: ['Hydraulics', 'Pneumatics', 'Emergency Repair'],
    availability: 'On-Call',
    currentAssignments: 3,
    efficiency: 0.91,
    certification: 'Level III Certified'
  },
  {
    id: 4,
    name: 'Alex Rodriguez',
    skillLevel: 'Intermediate',
    specialties: ['Electrical', 'Controls', 'Preventive Maintenance'],
    availability: 'Available',
    currentAssignments: 1,
    efficiency: 0.88,
    certification: 'Level II Certified'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Optimally Scheduled':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Parts Pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Emergency Scheduled':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Resource Conflict':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Critical':
      return 'text-red-600';
    case 'High':
      return 'text-orange-600';
    case 'Medium':
      return 'text-yellow-600';
    case 'Low':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
};

interface IntelligentSchedulingProps {
  className?: string;
}

export default function IntelligentScheduling({ className = '' }: IntelligentSchedulingProps) {
  const [selectedView, setSelectedView] = useState<'schedule' | 'technicians' | 'optimization'>('schedule');
  const [expandedTask, setExpandedTask] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const handleReschedule = (task: any) => {
    setSelectedTask(task);
    setShowRescheduleModal(true);
  };

  const handleOptimizeSchedule = () => {
    alert('AI optimization running...\n\nSchedule optimized! Found 3 efficiency improvements:\n• Reduced total downtime by 2.5 hours\n• Optimized technician assignments\n• Aligned 2 tasks with parts delivery');
  };

  return (
    <div className={`bg-white rounded-xl shadow-card ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Intelligent Scheduling</h2>
              <p className="text-gray-600 mt-1">AI-optimized maintenance scheduling with resource planning</p>
            </div>
          </div>
          
          <button
            onClick={handleOptimizeSchedule}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Brain className="h-4 w-4" />
            <span>AI Optimize</span>
          </button>
        </div>

        {/* View Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mt-4">
          <button
            onClick={() => setSelectedView('schedule')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'schedule'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Schedule View
          </button>
          <button
            onClick={() => setSelectedView('technicians')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'technicians'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Resource Allocation
          </button>
          <button
            onClick={() => setSelectedView('optimization')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedView === 'optimization'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Optimization Metrics
          </button>
        </div>
      </div>

      {selectedView === 'schedule' && (
        <div className="p-6">
          <div className="space-y-4">
            {scheduledTasks.map((task) => (
              <div
                key={task.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                {/* Task Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Wrench className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900">{task.id}</h3>
                        <AlertTriangle className={`h-4 w-4 ${getPriorityColor(task.priority)}`} />
                      </div>
                      <p className="text-sm text-gray-600">{task.machineName}</p>
                      <p className="text-xs text-purple-600 font-medium">{task.aiPrediction.issueType}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                    <button
                      onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedTask === task.id ? (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-500" />
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Prediction Summary */}
                <div className="bg-purple-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">AI Prediction</span>
                    <span className="text-xs text-purple-700">
                      {Math.round(task.aiPrediction.confidence * 100)}% confidence
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-purple-600 font-medium">Predicted Failure</p>
                      <p className="text-purple-900">
                        {new Date(task.aiPrediction.predictedFailureDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-600 font-medium">Downtime</p>
                      <p className="text-purple-900">{task.aiPrediction.estimatedDowntime}</p>
                    </div>
                    <div>
                      <p className="text-purple-600 font-medium">Scheduled</p>
                      <p className="text-purple-900">
                        {new Date(task.scheduling.scheduledDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-600 font-medium">Cost</p>
                      <p className="text-purple-900">${task.estimatedCost}</p>
                    </div>
                  </div>
                </div>

                {/* Resource Status */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-gray-600">Technician</p>
                      <p className="font-medium text-gray-900">{task.scheduling.technician}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {task.resources.partsReady ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <div>
                      <p className="text-gray-600">Parts</p>
                      <p className="font-medium text-gray-900">
                        {task.resources.partsReady ? 'Ready' : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Wrench className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-gray-600">Tools</p>
                      <p className="font-medium text-gray-900">
                        {task.resources.toolsReady ? 'Ready' : 'Pending'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-gray-600">Impact</p>
                      <p className="font-medium text-gray-900">{task.constraints.productionImpact}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTask === task.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Optimization Factors</h4>
                        <ul className="space-y-1">
                          {task.optimizationFactors.map((factor, index) => (
                            <li key={index} className="flex items-start space-x-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{factor}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Constraints & Requirements</h4>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">Production Window:</span>
                            <span className="ml-2 font-medium text-gray-900">{task.constraints.productionWindow}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Power Shutdown:</span>
                            <span className="ml-2 font-medium text-gray-900">
                              {task.constraints.powerShutdownRequired ? 'Required' : 'Not Required'}
                            </span>
                          </div>
                          {task.resources.supplierLeadTime && (
                            <div>
                              <span className="text-gray-600">Parts Lead Time:</span>
                              <span className="ml-2 font-medium text-gray-900">{task.resources.supplierLeadTime}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center space-x-3">
                      <button
                        onClick={() => handleReschedule(task)}
                        className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm"
                      >
                        Reschedule
                      </button>
                      <button className="px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm">
                        Approve Schedule
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === 'technicians' && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {technicians.map(tech => (
              <div key={tech.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tech.name}</h3>
                    <p className="text-sm text-gray-600">{tech.skillLevel}</p>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Availability</p>
                    <p className="font-medium text-gray-900">{tech.availability}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Current Load</p>
                    <p className="font-medium text-gray-900">{tech.currentAssignments} tasks</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Efficiency</p>
                    <p className="font-medium text-gray-900">{Math.round(tech.efficiency * 100)}%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Specialties</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tech.specialties.map(specialty => (
                        <span key={specialty} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {specialty}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedView === 'optimization' && (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-900">Schedule Efficiency</span>
              </div>
              <p className="text-2xl font-bold text-green-900">94.2%</p>
              <p className="text-sm text-green-700">+2.1% from last month</p>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Avg Response Time</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">2.4 hrs</p>
              <p className="text-sm text-blue-700">-15% from last month</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <span className="font-semibold text-purple-900">AI Accuracy</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">91.7%</p>
              <p className="text-sm text-purple-700">Prediction confidence</p>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Recent Optimizations</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">Consolidated 3 maintenance tasks to reduce downtime by 4 hours</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">Optimized technician assignments based on skill matching</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">Aligned maintenance with supplier delivery schedules</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-gray-700">Reduced emergency maintenance by 28% through predictive scheduling</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reschedule Task</h3>
                  <p className="text-sm text-gray-600">{selectedTask.id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Schedule Date
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    defaultValue="2024-01-16T09:00"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Reschedule
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                    <option>Parts availability delay</option>
                    <option>Technician unavailable</option>
                    <option>Production schedule conflict</option>
                    <option>Equipment access issue</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button
                  onClick={() => {
                    alert('Task rescheduled successfully! AI will optimize surrounding tasks.');
                    setShowRescheduleModal(false);
                  }}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}