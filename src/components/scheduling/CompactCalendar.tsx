'use client';

import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  Clock,
  Wrench,
  Play,
  CheckCircle,
  Plus
} from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'maintenance' | 'production' | 'inspection';
  priority: 'High' | 'Medium' | 'Low';
  equipment: string;
  time?: string;
}

interface CompactCalendarProps {
  events: CalendarEvent[];
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date | null;
}

export default function CompactCalendar({ 
  events, 
  onDateSelect, 
  selectedDate 
}: CompactCalendarProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Get start of current week (Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  // Generate 7 days of the current week
  const getWeekDays = () => {
    const weekStart = getWeekStart(currentWeek);
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  // Navigation functions
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeek(prevWeek);
  };

  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentWeek(today);
    onDateSelect?.(today);
  };

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateString);
  };

  // Event type styling
  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'maintenance':
        return 'bg-blue-500';
      case 'production':
        return 'bg-green-500';
      case 'inspection':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  const weekDays = getWeekDays();
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  
  const formatWeekRange = () => {
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    const year = weekEnd.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date) => {
    return selectedDate && date.toDateString() === selectedDate.toDateString();
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Weekly Schedule
        </h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            Today
          </button>
          <button
            onClick={goToPreviousWeek}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold text-gray-900 min-w-[180px] text-center">
            {formatWeekRange()}
          </div>
          <button
            onClick={goToNextWeek}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Compact Week View */}
      <div className="grid grid-cols-7 gap-1 bg-gray-100 rounded-lg p-2">
        {weekDays.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          
          return (
            <div
              key={index}
              className={`
                p-3 bg-white rounded-md cursor-pointer transition-all duration-200 min-h-[80px]
                ${isToday(date) ? 'ring-2 ring-orange-400 bg-orange-50' : ''}
                ${isSelected(date) ? 'ring-2 ring-blue-400 bg-blue-50' : ''}
                hover:bg-gray-50
              `}
              onClick={() => onDateSelect?.(date)}
            >
              {/* Date Header */}
              <div className="text-center mb-2">
                <div className="text-xs font-medium text-gray-600">{dayName}</div>
                <div className={`text-sm font-semibold ${
                  isToday(date) ? 'text-orange-600' : 'text-gray-900'
                }`}>
                  {date.getDate()}
                </div>
              </div>

              {/* Event Indicators */}
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className={`flex items-center justify-center w-full h-4 rounded ${getEventTypeColor(event.type)} text-white`}
                    title={`${event.title} (${event.priority} Priority)`}
                  >
                    {event.type === 'maintenance' && <Wrench className="h-2.5 w-2.5" />}
                    {event.type === 'production' && <Play className="h-2.5 w-2.5" />}
                    {event.type === 'inspection' && <CheckCircle className="h-2.5 w-2.5" />}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500 text-center">
                    <Plus className="h-3 w-3 mx-auto" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1.5 bg-blue-500 rounded-full"></div>
          <span className="text-gray-600">Maintenance</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1.5 bg-green-500 rounded-full"></div>
          <span className="text-gray-600">Production</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-1.5 bg-purple-500 rounded-full"></div>
          <span className="text-gray-600">Inspection</span>
        </div>
      </div>
    </div>
  );
}