'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Factory, TrendingUp, Wrench, Activity, Zap } from 'lucide-react';
import PromotionalLanding from '@/components/PromotionalLanding';
import { useAuth } from '@/contexts/NoAuthContext';

interface SystemStatus {
  pipeline: {
    status: string;
    isHealthy: boolean;
  };
  machines: {
    total: number;
    connected: number;
    active: number;
    offline: number;
  };
}

export default function Home() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const showLanding = !user || searchParams.get('landing') === 'true';

  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        // Fetch pipeline health
        const pipelineResponse = await fetch('/api/pipeline/health');
        const pipelineData = await pipelineResponse.json();

        // Fetch machine status
        const machinesResponse = await fetch('/api/pipeline/machine-status');
        const machinesData = await machinesResponse.json();

        setSystemStatus({
          pipeline: {
            status: pipelineData.pipeline.status,
            isHealthy: pipelineData.pipeline.isHealthy,
          },
          machines: machinesData.summary || {
            total: 0,
            connected: 0,
            active: 0,
            offline: 0,
          },
        });
      } catch (error) {
        console.error('Failed to fetch system status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const dashboardRoles = [
    {
      title: 'Executive Dashboard',
      description:
        'High-level KPI metrics and operational overview for C-suite decision-making',
      icon: TrendingUp,
      href: '/dashboard/executive',
      color: 'bg-blue-500 hover:bg-blue-600',
      users: 'C-suite Management',
    },
    {
      title: 'Factory Manager',
      description:
        'Comprehensive operational visibility with real-time machine monitoring',
      icon: Factory,
      href: '/dashboard/factory',
      color: 'bg-green-500 hover:bg-green-600',
      users: 'Factory Managers',
    },
    {
      title: 'Production Manager',
      description:
        'Production planning, scheduling optimization, and status monitoring',
      icon: Activity,
      href: '/dashboard/production',
      color: 'bg-orange-500 hover:bg-orange-600',
      users: 'Production Managers',
    },
    {
      title: 'Maintenance Technician',
      description:
        'Equipment health diagnostics, maintenance schedules, and predictive alerts',
      icon: Wrench,
      href: '/dashboard/maintenance',
      color: 'bg-purple-500 hover:bg-purple-600',
      users: 'Maintenance Technicians',
    },
  ];

  // Show promotional landing for unauthenticated users
  // Use ?landing=true to preview the landing page while NoAuthContext always provides a user
  if (showLanding) {
    return <PromotionalLanding />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  UNS Demo System
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Unified Namespace for Smart Manufacturing
                </p>
              </div>
            </div>

            {/* System Status Indicator */}
            <div className="flex items-center space-x-4">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-4 w-20 bg-gray-300 rounded"></div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      systemStatus?.pipeline.isHealthy
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}
                  ></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pipeline {systemStatus?.pipeline.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* System Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            System Overview
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm animate-pulse"
                >
                  <div className="h-4 w-20 bg-gray-300 rounded mb-2"></div>
                  <div className="h-8 w-16 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Machines
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {systemStatus?.machines.total || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Connected
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {systemStatus?.machines.connected || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Active
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {systemStatus?.machines.active || 0}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Offline
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {systemStatus?.machines.offline || 0}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Role-Based Dashboards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Role-Based Dashboards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {dashboardRoles.map((role, index) => {
              const IconComponent = role.icon;
              return (
                <Link
                  key={index}
                  href={role.href}
                  className="group bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-start space-x-4">
                    <div
                      className={`p-3 rounded-lg ${role.color} transition-colors duration-200`}
                    >
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors duration-200">
                        {role.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {role.description}
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        For {role.users}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/api/pipeline/health"
              target="_blank"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              View Pipeline Health
            </Link>
            <Link
              href="/api/pipeline/machine-status"
              target="_blank"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors duration-200"
            >
              Machine Status API
            </Link>
            <Link
              href="/api/pipeline/sensor-data"
              target="_blank"
              className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors duration-200"
            >
              Live Sensor Data
            </Link>
            <Link
              href="/api/pipeline/metrics"
              target="_blank"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors duration-200"
            >
              Performance Metrics
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
