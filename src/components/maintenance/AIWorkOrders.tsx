'use client';

import React, { useState } from 'react';
import { 
  Brain, 
  FileText, 
  Camera, 
  Download, 
  Eye,
  Clock,
  User,
  Wrench,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

// Mock data for AI-generated work orders based on relay assembly plant machines
const aiWorkOrders = [
  {
    id: 'WO-2024-001',
    machineId: 'cw-l1-01',
    machineName: 'Contact Welder L1-01',
    machineType: 'Contact Welder',
    aiPrediction: {
      issueType: 'Electrode Degradation',
      confidence: 0.92,
      predictedFailureDate: '2024-01-20',
      priority: 'High',
      description: 'AI analysis detected 15% increase in weld resistance over past 72 hours. Electrode replacement recommended within 48 hours to prevent quality issues.'
    },
    generatedDocument: {
      title: 'Contact Welder Electrode Replacement Procedure - CW-L1-01',
      sections: [
        {
          title: 'Safety Precautions',
          steps: [
            'Lock out/tag out main power supply',
            'Verify zero energy state with multimeter',
            'Don proper PPE: safety glasses, insulated gloves, arc flash suit'
          ]
        },
        {
          title: 'Electrode Replacement Process',
          steps: [
            'Open electrode chamber using 19mm wrench',
            'Remove worn electrodes and inspect for copper buildup',
            'Clean electrode holders with wire brush',
            'Install new electrodes (Part #CW-ELECTRODE-001)',
            'Torque to 45 Nm as per manual section 4.3'
          ]
        },
        {
          title: 'Post-Installation Testing',
          steps: [
            'Perform continuity test on weld circuit',
            'Run test weld on sample materials',
            'Verify weld current within 350-400A range',
            'Document electrode installation in maintenance log'
          ]
        }
      ],
      estimatedTime: '2.5 hours',
      requiredParts: [
        { partNumber: 'CW-ELECTRODE-001', description: 'Copper Welding Electrode', quantity: 2 },
        { partNumber: 'CW-BRUSH-001', description: 'Wire Brush Kit', quantity: 1 }
      ],
      images: [
        'https://picsum.photos/seed/safety-lockout-cw/400/300',
        'https://picsum.photos/seed/electrode-wear-cw/400/300',
        'https://picsum.photos/seed/procedure-electrode-replacement/400/300',
        'https://picsum.photos/seed/verification-testing-cw/400/300'
      ],
      // Enhanced intelligent image context
      imageContext: {
        machineType: 'contact-welder',
        issueType: 'electrode-degradation',
        safetyRequirements: ['electrical', 'arc-flash'],
        procedureType: 'replacement'
      }
    },
    technician: 'Mike Johnson',
    status: 'AI Generated',
    createdAt: '2024-01-12T10:30:00Z'
  },
  {
    id: 'WO-2024-002',
    machineId: 'wind-l1-01',
    machineName: 'Coil Winder L1-01',
    machineType: 'Coil Winder',
    aiPrediction: {
      issueType: 'Bearing Vibration Anomaly',
      confidence: 0.87,
      predictedFailureDate: '2024-01-25',
      priority: 'Medium',
      description: 'Vibration sensors show 8dB increase in bearing frequency. Bearing replacement scheduled for next maintenance window.'
    },
    generatedDocument: {
      title: 'Spindle Bearing Replacement - Coil Winder L1-01',
      sections: [
        {
          title: 'Pre-Work Preparation',
          steps: [
            'Schedule production downtime (4-hour window)',
            'Gather bearing puller kit and hydraulic press',
            'Prepare clean workspace with lint-free cloths'
          ]
        },
        {
          title: 'Bearing Replacement',
          steps: [
            'Remove spindle housing cover (Section 6.2)',
            'Use bearing puller to extract worn bearing',
            'Clean bearing race with degreasing solvent',
            'Press-fit new bearing (Part #WIND-BEARING-002)',
            'Apply specified grease quantity (15ml)'
          ]
        }
      ],
      estimatedTime: '3.5 hours',
      requiredParts: [
        { partNumber: 'WIND-BEARING-002', description: 'Spindle Bearing Assembly', quantity: 1 },
        { partNumber: 'GREASE-001', description: 'High-Speed Bearing Grease', quantity: 1 }
      ],
      images: [
        '/images/machines/coil-winder-bearing.jpg',
        '/images/procedures/bearing-replacement.jpg'
      ]
    },
    technician: 'Sarah Chen',
    status: 'Pending Approval',
    createdAt: '2024-01-12T14:15:00Z'
  },
  {
    id: 'WO-2024-003',
    machineId: 'press-l1-01',
    machineName: 'Assembly Press L1-01',
    machineType: 'Assembly Press',
    aiPrediction: {
      issueType: 'Hydraulic Seal Leak',
      confidence: 0.95,
      predictedFailureDate: '2024-01-18',
      priority: 'High',
      description: 'Pressure sensors indicate 5% drop in hydraulic pressure over 48 hours. Seal replacement required immediately.'
    },
    generatedDocument: {
      title: 'Hydraulic Seal Replacement - Assembly Press L1-01',
      sections: [
        {
          title: 'Hydraulic System Shutdown',
          steps: [
            'Reduce system pressure to zero via relief valve',
            'Lock out hydraulic pump motor',
            'Drain hydraulic fluid into collection container'
          ]
        },
        {
          title: 'Seal Replacement Procedure',
          steps: [
            'Remove cylinder head bolts (24mm socket)',
            'Extract piston assembly carefully',
            'Remove old seals using seal pick tools',
            'Install new seal kit (Part #PRESS-SEAL-002)',
            'Lubricate seals with hydraulic fluid before assembly'
          ]
        }
      ],
      estimatedTime: '4 hours',
      requiredParts: [
        { partNumber: 'PRESS-SEAL-002', description: 'Hydraulic Seal Kit', quantity: 1 },
        { partNumber: 'HYD-FLUID-001', description: 'Hydraulic Fluid ISO 32', quantity: 5 }
      ],
      images: [
        '/images/machines/assembly-press-hydraulics.jpg',
        '/images/procedures/hydraulic-seal-replacement.jpg'
      ]
    },
    technician: 'David Wilson',
    status: 'Approved',
    createdAt: '2024-01-11T09:45:00Z'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'AI Generated':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Pending Approval':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Approved':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'In Progress':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'text-red-600';
    case 'Medium':
      return 'text-yellow-600';
    case 'Low':
      return 'text-green-600';
    default:
      return 'text-gray-600';
  }
};

interface AIWorkOrdersProps {
  className?: string;
}

export default function AIWorkOrders({ className = '' }: AIWorkOrdersProps) {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<any>(null);
  const [showDocument, setShowDocument] = useState(false);

  const handleViewDocument = (workOrder: any) => {
    setSelectedWorkOrder(workOrder);
    setShowDocument(true);
  };

  const handleApproveWorkOrder = (workOrderId: string) => {
    // Mock approval action
    console.log(`Approving work order: ${workOrderId}`);
    alert('Work order approved and assigned to technician!');
  };

  return (
    <div className={`bg-white rounded-xl shadow-card ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI-Generated Work Orders</h2>
              <p className="text-gray-600 mt-1">Predictive maintenance tasks with auto-generated procedures</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Brain className="h-4 w-4" />
            <span>AI Confidence: 91% avg</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {aiWorkOrders.map((workOrder) => (
            <div
              key={workOrder.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              {/* Work Order Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Wrench className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{workOrder.id}</h3>
                    <p className="text-sm text-gray-600">{workOrder.machineName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(workOrder.status)}`}
                  >
                    {workOrder.status}
                  </span>
                </div>
              </div>

              {/* AI Prediction Summary */}
              <div className="bg-blue-50 rounded-lg p-3 mb-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className={`h-4 w-4 mt-0.5 ${getPriorityColor(workOrder.aiPrediction.priority)}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {workOrder.aiPrediction.issueType}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {workOrder.aiPrediction.description}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Confidence: {Math.round(workOrder.aiPrediction.confidence * 100)}%</span>
                      <span>Predicted Failure: {workOrder.aiPrediction.predictedFailureDate}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Order Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-500">Technician</p>
                  <p className="font-medium text-gray-900">{workOrder.technician}</p>
                </div>
                <div>
                  <p className="text-gray-500">Est. Duration</p>
                  <p className="font-medium text-gray-900">{workOrder.generatedDocument.estimatedTime}</p>
                </div>
                <div>
                  <p className="text-gray-500">Parts Required</p>
                  <p className="font-medium text-gray-900">{workOrder.generatedDocument.requiredParts.length} items</p>
                </div>
                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">
                    {new Date(workOrder.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handleViewDocument(workOrder)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-sm font-medium">View AI Document</span>
                </button>
                
                {workOrder.status === 'AI Generated' && (
                  <button
                    onClick={() => handleApproveWorkOrder(workOrder.id)}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">Approve</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Document Modal */}
      {showDocument && selectedWorkOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedWorkOrder.generatedDocument.title}
                    </h3>
                    <p className="text-sm text-gray-600">AI-Generated Maintenance Procedure</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDocument(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Document Header */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">AI-Generated Procedure</span>
                  <span className="text-sm text-blue-700">
                    ({Math.round(selectedWorkOrder.aiPrediction.confidence * 100)}% confidence)
                  </span>
                </div>
                <p className="text-sm text-blue-800">
                  This procedure was automatically generated based on machine manual analysis, 
                  sensor data patterns, and maintenance best practices.
                </p>
              </div>

              {/* Machine Images */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">Machine Reference Images</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedWorkOrder.generatedDocument.images.map((image: string, index: number) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 text-center">
                      <Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Machine Image {index + 1}</p>
                      <p className="text-xs text-gray-500">{image}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Procedure Sections */}
              <div className="space-y-6">
                {selectedWorkOrder.generatedDocument.sections.map((section: any, sectionIndex: number) => (
                  <div key={sectionIndex}>
                    <h4 className="font-semibold text-gray-900 mb-3">{section.title}</h4>
                    <div className="space-y-2">
                      {section.steps.map((step: string, stepIndex: number) => (
                        <div key={stepIndex} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {stepIndex + 1}
                          </span>
                          <p className="text-gray-700">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Required Parts */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Required Parts & Materials</h4>
                <div className="space-y-2">
                  {selectedWorkOrder.generatedDocument.requiredParts.map((part: any, index: number) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-medium text-gray-900">{part.partNumber}</p>
                        <p className="text-sm text-gray-600">{part.description}</p>
                      </div>
                      <span className="text-sm font-medium text-gray-700">Qty: {part.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center space-x-3">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </button>
                <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Approve & Assign</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}