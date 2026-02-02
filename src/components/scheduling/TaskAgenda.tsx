'use client';

import { useState } from 'react';
import {
  Wrench,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Filter,
  Plus,
  User,
  Play,
  Pause,
  Edit,
} from 'lucide-react';

interface MaintenanceTask {
  id: number;
  equipment: string;
  type: string;
  scheduledDate: string;
  scheduledTime?: string;
  priority: 'High' | 'Medium' | 'Low';
  technician: string;
  estimatedDuration: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Delayed';
  description?: string;
}

interface TaskAgendaProps {
  tasks: MaintenanceTask[];
  selectedDate?: Date | null;
  onCreateTask?: () => void;
  onEditTask?: (task: MaintenanceTask) => void;
}

export default function TaskAgenda({ 
  tasks, 
  selectedDate, 
  onCreateTask,
  onEditTask 
}: TaskAgendaProps) {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Filter tasks based on selected date if provided
  const getFilteredTasks = () => {
    let filteredTasks = tasks;

    // Filter by selected date
    if (selectedDate) {
      const selectedDateString = selectedDate.toISOString().split('T')[0];
      filteredTasks = filteredTasks.filter(task => task.scheduledDate === selectedDateString);
    }

    // Filter by status
    if (filterStatus !== 'all') {
      filteredTasks = filteredTasks.filter(task => 
        task.status.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    // Filter by priority
    if (filterPriority !== 'all') {
      filteredTasks = filteredTasks.filter(task => 
        task.priority.toLowerCase() === filterPriority.toLowerCase()
      );
    }

    // Sort by date and priority
    return filteredTasks.sort((a, b) => {
      // First sort by date
      const dateComparison = new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      if (dateComparison !== 0) return dateComparison;

      // Then by priority
      const priorityOrder = { High: 3, Medium: 2, Low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Scheduled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Delayed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'In Progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'Scheduled':
        return <Clock className="h-4 w-4 text-gray-600" />;
      case 'Delayed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const filteredTasks = getFilteredTasks();

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {selectedDate ? `Tasks for ${formatDate(selectedDate.toISOString())}` : 'All Tasks'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Filters */}
          <div className="flex items-center space-x-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="in progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="delayed">Delayed</option>
            </select>
            
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {onCreateTask && (
            <button
              onClick={onCreateTask}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 rounded-lg hover:bg-orange-600 transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No tasks found for the selected criteria</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {/* Status Icon */}
                  <div className="mt-1">
                    {getStatusIcon(task.status)}
                  </div>

                  {/* Task Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900 truncate">
                        {task.equipment} - {task.type}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>

                    {/* Task Metadata */}
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(task.scheduledDate)}</span>
                        {task.scheduledTime && (
                          <span className="text-gray-400">at {task.scheduledTime}</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{task.estimatedDuration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <User className="h-4 w-4" />
                        <span>{task.technician}</span>
                      </div>
                    </div>

                    {task.description && (
                      <p className="text-sm text-gray-500 mt-2">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {onEditTask && (
                  <button
                    onClick={() => onEditTask(task)}
                    className="ml-3 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    title="Edit task"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}