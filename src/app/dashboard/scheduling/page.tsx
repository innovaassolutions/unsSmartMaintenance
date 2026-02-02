'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import WorkOrderForm from '@/components/forms/WorkOrderForm';
import CompactCalendar from '@/components/scheduling/CompactCalendar';
import TaskAgenda from '@/components/scheduling/TaskAgenda';
import { CheckCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface MaintenanceTask {
  id: number;
  equipment: string;
  type: string;
  scheduledDate: string;
  priority: 'High' | 'Medium' | 'Low';
  technician: string;
  estimatedDuration: string;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Delayed';
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'maintenance' | 'production' | 'inspection';
  priority: 'High' | 'Medium' | 'Low';
  equipment: string;
}

export default function SchedulingDashboard() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState<MaintenanceTask[]>(
    []
  );
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isWorkOrderFormOpen, setIsWorkOrderFormOpen] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleCreateWorkOrder = (data: Record<string, unknown>) => {
    console.log('New work order created:', data);

    // Create a new maintenance task
    const newTask: MaintenanceTask = {
      id: Date.now(), // Generate unique ID
      equipment: data.equipmentName,
      type: data.workType,
      scheduledDate: data.scheduledDate,
      priority: data.priority,
      technician: data.technician,
      estimatedDuration: data.duration,
      status: 'Scheduled',
    };

    // Add to maintenance tasks list
    setMaintenanceTasks(prev => [newTask, ...prev]);

    // Create a new calendar event
    const newEvent: CalendarEvent = {
      id: `event-${Date.now()}`,
      title: `${data.equipmentName} - ${data.workType}`,
      date: data.scheduledDate,
      type: 'maintenance',
      priority: data.priority,
      equipment: data.equipmentName,
    };

    // Add to calendar events
    setCalendarEvents(prev => [...prev, newEvent]);

    // Show success message
    setSuccessMessage(
      `Work order created successfully for ${data.equipmentName}!`
    );
    setShowSuccessMessage(true);

    // Hide success message after 5 seconds
    setTimeout(() => setShowSuccessMessage(false), 5000);

    // Close the form
    setIsWorkOrderFormOpen(false);
  };

  useEffect(() => {
    // Simulate loading maintenance data
    const loadData = async () => {
      try {
        // Mock maintenance tasks data
        const mockMaintenanceTasks: MaintenanceTask[] = [
          {
            id: 1,
            equipment: 'CNC-001',
            type: 'Preventive',
            scheduledDate: '2024-01-15',
            priority: 'High',
            technician: 'Mike Johnson',
            estimatedDuration: '4 hours',
            status: 'Scheduled',
          },
          {
            id: 2,
            equipment: 'CNC-003',
            type: 'Corrective',
            scheduledDate: '2024-01-16',
            priority: 'Medium',
            technician: 'Sarah Chen',
            estimatedDuration: '2 hours',
            status: 'In Progress',
          },
          {
            id: 3,
            equipment: 'CNC-005',
            type: 'Preventive',
            scheduledDate: '2024-01-18',
            priority: 'Low',
            technician: 'David Wilson',
            estimatedDuration: '3 hours',
            status: 'Scheduled',
          },
          {
            id: 4,
            equipment: 'CNC-002',
            type: 'Inspection',
            scheduledDate: '2024-01-20',
            priority: 'Medium',
            technician: 'Lisa Rodriguez',
            estimatedDuration: '1 hour',
            status: 'Scheduled',
          },
          {
            id: 5,
            equipment: 'CNC-004',
            type: 'Preventive',
            scheduledDate: '2024-01-22',
            priority: 'High',
            technician: 'Tom Anderson',
            estimatedDuration: '5 hours',
            status: 'Scheduled',
          },
        ];

        // Mock calendar events
        const mockCalendarEvents: CalendarEvent[] = [
          {
            id: '1',
            title: 'CNC-001 Preventive Maintenance',
            date: '2024-01-15',
            type: 'maintenance',
            priority: 'High',
            equipment: 'CNC-001',
          },
          {
            id: '2',
            title: 'CNC-003 Corrective Maintenance',
            date: '2024-01-16',
            type: 'maintenance',
            priority: 'Medium',
            equipment: 'CNC-003',
          },
          {
            id: '3',
            title: 'Production Line A Setup',
            date: '2024-01-17',
            type: 'production',
            priority: 'Medium',
            equipment: 'Production Line A',
          },
          {
            id: '4',
            title: 'CNC-005 Preventive Maintenance',
            date: '2024-01-18',
            type: 'maintenance',
            priority: 'Low',
            equipment: 'CNC-005',
          },
          {
            id: '5',
            title: 'Quality Inspection - Batch 3',
            date: '2024-01-19',
            type: 'inspection',
            priority: 'Medium',
            equipment: 'Quality Station',
          },
        ];

        setMaintenanceTasks(mockMaintenanceTasks);
        setCalendarEvents(mockCalendarEvents);
      } catch (error) {
        console.error('Failed to load scheduling data:', error);
      }
    };

    loadData();
  }, []);

  return (
    <ProtectedRoute>
      <Layout
        title="Scheduling Dashboard"
        status={{
          message: 'All Systems Operational',
          isHealthy: true,
        }}
      >
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Scheduling Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Production scheduling and maintenance planning
          </p>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                {successMessage}
              </span>
            </div>
          </div>
        )}

        {/* Compact Calendar */}
        <div className="mb-8">
          <CompactCalendar
            events={calendarEvents}
            onDateSelect={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        {/* Task Agenda */}
        <TaskAgenda
          tasks={maintenanceTasks}
          selectedDate={selectedDate}
          onCreateTask={() => setIsWorkOrderFormOpen(true)}
        />

        {/* Work Order Form Modal */}
        <WorkOrderForm
          isOpen={isWorkOrderFormOpen}
          onClose={() => setIsWorkOrderFormOpen(false)}
          onSubmit={handleCreateWorkOrder}
          title="Schedule Maintenance"
        />
      </Layout>
    </ProtectedRoute>
  );
}
