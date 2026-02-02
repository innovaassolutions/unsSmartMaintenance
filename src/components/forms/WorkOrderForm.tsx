'use client';

import { useState } from 'react';
import { X, Calendar, Clock, Wrench, User, AlertTriangle } from 'lucide-react';

interface WorkOrderFormData {
  equipmentName: string;
  workType: string;
  scheduledDate: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  technician: string;
  duration: string;
  description: string;
}

interface WorkOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WorkOrderFormData) => void;
  title?: string;
}

const workTypes = [
  'Preventive Maintenance',
  'Corrective Maintenance',
  'Emergency Repair',
  'Inspection',
  'Calibration',
  'Installation',
  'Upgrade',
  'Other',
];

const technicians = [
  'Mike Johnson',
  'Sarah Chen',
  'David Wilson',
  'Lisa Rodriguez',
  'Tom Anderson',
  'Emily Davis',
  'James Brown',
  'Maria Garcia',
];

const priorities = ['Low', 'Medium', 'High', 'Critical'];

export default function WorkOrderForm({
  isOpen,
  onClose,
  onSubmit,
  title = 'Create Work Order',
}: WorkOrderFormProps) {
  const [formData, setFormData] = useState<WorkOrderFormData>({
    equipmentName: '',
    workType: '',
    scheduledDate: '',
    priority: 'Medium',
    technician: '',
    duration: '',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<WorkOrderFormData>>({});

  const handleInputChange = (field: keyof WorkOrderFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<WorkOrderFormData> = {};

    if (!formData.equipmentName.trim()) {
      newErrors.equipmentName = 'Equipment name is required';
    }
    if (!formData.workType) {
      newErrors.workType = 'Work type is required';
    }
    if (!formData.scheduledDate) {
      newErrors.scheduledDate = 'Scheduled date is required';
    }
    if (!formData.technician) {
      newErrors.technician = 'Technician assignment is required';
    }
    if (!formData.duration.trim()) {
      newErrors.duration = 'Duration is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
      // Reset form
      setFormData({
        equipmentName: '',
        workType: '',
        scheduledDate: '',
        priority: 'Medium',
        technician: '',
        duration: '',
        description: '',
      });
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      equipmentName: '',
      workType: '',
      scheduledDate: '',
      priority: 'Medium',
      technician: '',
      duration: '',
      description: '',
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Equipment Name */}
          <div>
            <label
              htmlFor="equipmentName"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Equipment Name *
            </label>
            <div className="relative">
              <Wrench className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="equipmentName"
                value={formData.equipmentName}
                onChange={e =>
                  handleInputChange('equipmentName', e.target.value)
                }
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                  errors.equipmentName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter equipment name (e.g., CNC-001)"
              />
            </div>
            {errors.equipmentName && (
              <p className="mt-1 text-sm text-red-600">
                {errors.equipmentName}
              </p>
            )}
          </div>

          {/* Work Type */}
          <div>
            <label
              htmlFor="workType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Type of Work Activity *
            </label>
            <select
              id="workType"
              value={formData.workType}
              onChange={e => handleInputChange('workType', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                errors.workType ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Select work type</option>
              {workTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.workType && (
              <p className="mt-1 text-sm text-red-600">{errors.workType}</p>
            )}
          </div>

          {/* Scheduled Date */}
          <div>
            <label
              htmlFor="scheduledDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Scheduled Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                id="scheduledDate"
                value={formData.scheduledDate}
                onChange={e =>
                  handleInputChange('scheduledDate', e.target.value)
                }
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                  errors.scheduledDate ? 'border-red-300' : 'border-gray-300'
                }`}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            {errors.scheduledDate && (
              <p className="mt-1 text-sm text-red-600">
                {errors.scheduledDate}
              </p>
            )}
          </div>

          {/* Priority and Technician Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priority */}
            <div>
              <label
                htmlFor="priority"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Priority
              </label>
              <select
                id="priority"
                value={formData.priority}
                onChange={e =>
                  handleInputChange(
                    'priority',
                    e.target.value as WorkOrderFormData['priority']
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>

            {/* Assign Technician */}
            <div>
              <label
                htmlFor="technician"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Assign Technician *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  id="technician"
                  value={formData.technician}
                  onChange={e =>
                    handleInputChange('technician', e.target.value)
                  }
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                    errors.technician ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select technician</option>
                  {technicians.map(tech => (
                    <option key={tech} value={tech}>
                      {tech}
                    </option>
                  ))}
                </select>
              </div>
              {errors.technician && (
                <p className="mt-1 text-sm text-red-600">{errors.technician}</p>
              )}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label
              htmlFor="duration"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Duration *
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                id="duration"
                value={formData.duration}
                onChange={e => handleInputChange('duration', e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200 ${
                  errors.duration ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 4 hours, 2 days, 30 minutes"
              />
            </div>
            {errors.duration && (
              <p className="mt-1 text-sm text-red-600">{errors.duration}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors duration-200"
              placeholder="Provide additional details about the work order..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors duration-200 flex items-center space-x-2"
            >
              <Wrench className="h-4 w-4" />
              <span>Create Work Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





















