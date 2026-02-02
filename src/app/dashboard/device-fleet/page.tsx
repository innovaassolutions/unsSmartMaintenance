'use client';

import Layout from '@/components/layout/Layout';
import { Boxes, Wifi, WifiOff, Activity, AlertTriangle } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DeviceFleetDashboard() {
  return (
    <Layout
      title="Device Fleet Management"
      status={{
        message: 'All Devices Connected',
        isHealthy: true,
      }}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Boxes className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Device Fleet Management
            </h1>
            <p className="text-gray-600">
              Monitor and manage connected devices and sensors across the
              manufacturing floor
            </p>
          </div>
        </div>
      </div>

      {/* Device Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Devices</p>
              <p className="text-2xl font-bold text-gray-900">156</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Boxes className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Connected</p>
              <p className="text-2xl font-bold text-green-600">142</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Wifi className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offline</p>
              <p className="text-2xl font-bold text-red-600">14</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <WifiOff className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Alerts</p>
              <p className="text-2xl font-bold text-orange-600">8</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Device Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Device Categories
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { name: 'CNC Machines', count: 45, status: 'online' },
                { name: 'Sensors', count: 89, status: 'online' },
                { name: 'Robots', count: 12, status: 'online' },
                { name: 'Conveyors', count: 8, status: 'offline' },
                { name: 'Quality Control', count: 2, status: 'maintenance' },
              ].map((category, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        category.status === 'online'
                          ? 'bg-green-500'
                          : category.status === 'offline'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                      }`}
                    ></div>
                    <span className="font-medium text-gray-900">
                      {category.name}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {category.count} devices
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-card">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Activity
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                {
                  device: 'CNC-001',
                  action: 'Maintenance completed',
                  time: '2 min ago',
                  status: 'success',
                },
                {
                  device: 'Sensor-A12',
                  action: 'Calibration required',
                  time: '5 min ago',
                  status: 'warning',
                },
                {
                  device: 'Robot-03',
                  action: 'Task completed',
                  time: '8 min ago',
                  status: 'success',
                },
                {
                  device: 'Conveyor-B',
                  action: 'Connection lost',
                  time: '12 min ago',
                  status: 'error',
                },
              ].map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activity.status === 'success'
                        ? 'bg-green-500'
                        : activity.status === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.device}
                    </p>
                    <p className="text-xs text-gray-600">{activity.action}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Device Map */}
      <div className="bg-white rounded-lg shadow-card">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Floor Plan Overview
          </h3>
        </div>
        <div className="p-6">
          <div className="bg-gray-100 rounded-lg p-8 text-center">
            <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Interactive floor plan visualization coming soon
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Real-time device locations and status mapping
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
