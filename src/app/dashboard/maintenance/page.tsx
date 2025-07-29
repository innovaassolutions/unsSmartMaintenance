'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Wrench, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar,
  Thermometer,
  Activity,
  Zap,
  Settings,
  TrendingUp,
  TrendingDown,
  Bell,
  Shield,
  Timer,
  Gauge
} from 'lucide-react'

interface MaintenanceAlert {
  id: string
  machineId: string
  machineName: string
  type: 'predictive' | 'preventive' | 'critical' | 'warning'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  estimatedFailureTime?: string
  recommendedAction: string
}

interface EquipmentHealth {
  machineId: string
  machineName: string
  healthScore: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  lastMaintenance: string
  nextMaintenance: string
  operatingHours: number
  temperature: number
  vibration: number
  powerUsage: number
}

interface MaintenanceTask {
  id: string
  machineId: string
  machineName: string
  type: 'scheduled' | 'predictive' | 'corrective'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  description: string
  estimatedDuration: number
  scheduledDate: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  assignedTo?: string
}

export default function MaintenanceDashboard() {
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([])
  const [equipment, setEquipment] = useState<EquipmentHealth[]>([])
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [selectedMachine, setSelectedMachine] = useState<EquipmentHealth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMaintenanceData = async () => {
      try {
        // Fetch machine status for maintenance analysis
        const machinesResponse = await fetch('/api/pipeline/machine-status')
        const machinesData = await machinesResponse.json()

        // Fetch sensor data for health monitoring
        const sensorResponse = await fetch('/api/pipeline/sensor-data?limit=50')
        const sensorData = await sensorResponse.json()

        // Transform machine data for maintenance view
        const equipmentHealth: EquipmentHealth[] = (machinesData.machines || []).map((machine: any, index: number) => {
          const healthScore = Math.round(75 + Math.random() * 20) // 75-95 health score
          const getStatus = (score: number) => {
            if (score >= 90) return 'excellent'
            if (score >= 80) return 'good'
            if (score >= 70) return 'fair'
            if (score >= 60) return 'poor'
            return 'critical'
          }

          return {
            machineId: machine.id,
            machineName: machine.display_name,
            healthScore,
            status: getStatus(healthScore),
            lastMaintenance: new Date(Date.now() - (7 + Math.random() * 14) * 24 * 60 * 60 * 1000).toISOString(),
            nextMaintenance: new Date(Date.now() + (3 + Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(),
            operatingHours: Math.round(1200 + Math.random() * 800), // 1200-2000 hours
            temperature: Math.round(65 + Math.random() * 20), // 65-85°C
            vibration: Math.round(5 + Math.random() * 15), // 5-20 units
            powerUsage: Math.round(850 + Math.random() * 300) // 850-1150W
          }
        })

        // Generate maintenance alerts
        const maintenanceAlerts: MaintenanceAlert[] = [
          {
            id: 'alert-001',
            machineId: equipmentHealth[0]?.machineId || 'machine-1',
            machineName: equipmentHealth[0]?.machineName || 'CNC Mill 001',
            type: 'predictive',
            severity: 'high',
            message: 'Spindle bearing temperature trending above normal range',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            estimatedFailureTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            recommendedAction: 'Schedule bearing inspection and lubrication within 72 hours'
          },
          {
            id: 'alert-002',
            machineId: equipmentHealth[1]?.machineId || 'machine-2',
            machineName: equipmentHealth[1]?.machineName || 'CNC Lathe 002',
            type: 'preventive',
            severity: 'medium',
            message: 'Scheduled maintenance due in 2 days',
            timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            recommendedAction: 'Complete routine maintenance checklist'
          },
          {
            id: 'alert-003',
            machineId: equipmentHealth[2]?.machineId || 'machine-3',
            machineName: equipmentHealth[2]?.machineName || 'Multi-Axis 003',
            type: 'critical',
            severity: 'critical',
            message: 'Vibration levels exceed safety thresholds',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            recommendedAction: 'Immediate shutdown and inspection required'
          },
          {
            id: 'alert-004',
            machineId: equipmentHealth[3]?.machineId || 'machine-4',
            machineName: equipmentHealth[3]?.machineName || 'CNC Mill 004',
            type: 'warning',
            severity: 'low',
            message: 'Coolant level below recommended minimum',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            recommendedAction: 'Refill coolant reservoir at next opportunity'
          }
        ]

        // Generate maintenance tasks
        const maintenanceTasks: MaintenanceTask[] = [
          {
            id: 'task-001',
            machineId: equipmentHealth[0]?.machineId || 'machine-1',
            machineName: equipmentHealth[0]?.machineName || 'CNC Mill 001',
            type: 'predictive',
            priority: 'high',
            description: 'Replace spindle bearings based on vibration analysis',
            estimatedDuration: 4,
            scheduledDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending',
            assignedTo: 'Tech Team A'
          },
          {
            id: 'task-002',
            machineId: equipmentHealth[1]?.machineId || 'machine-2',
            machineName: equipmentHealth[1]?.machineName || 'CNC Lathe 002',
            type: 'scheduled',
            priority: 'medium',
            description: 'Monthly preventive maintenance - full inspection',
            estimatedDuration: 2,
            scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          },
          {
            id: 'task-003',
            machineId: equipmentHealth[2]?.machineId || 'machine-3',
            machineName: equipmentHealth[2]?.machineName || 'Multi-Axis 003',
            type: 'corrective',
            priority: 'urgent',
            description: 'Emergency vibration dampener replacement',
            estimatedDuration: 6,
            scheduledDate: new Date().toISOString(),
            status: 'in_progress',
            assignedTo: 'Emergency Team'
          },
          {
            id: 'task-004',
            machineId: equipmentHealth[3]?.machineId || 'machine-4',
            machineName: equipmentHealth[3]?.machineName || 'CNC Mill 004',
            type: 'scheduled',
            priority: 'low',
            description: 'Coolant system flush and refill',
            estimatedDuration: 1,
            scheduledDate: new Date(Date.now() + 0.5 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'pending'
          }
        ]

        setEquipment(equipmentHealth)
        setAlerts(maintenanceAlerts)
        setTasks(maintenanceTasks)
        
        // Auto-select first machine with issues
        const problemMachine = equipmentHealth.find(eq => eq.healthScore < 85)
        setSelectedMachine(problemMachine || equipmentHealth[0])

      } catch (error) {
        console.error('Failed to fetch maintenance data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMaintenanceData()
    // Refresh every 60 seconds for maintenance monitoring
    const interval = setInterval(fetchMaintenanceData, 60000)
    return () => clearInterval(interval)
  }, [])

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-200 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-200 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-200 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-200 border-blue-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-200 border-gray-200'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return <AlertTriangle className="h-4 w-4" />
      case 'predictive': return <TrendingUp className="h-4 w-4" />
      case 'preventive': return <Calendar className="h-4 w-4" />
      case 'warning': return <Bell className="h-4 w-4" />
      default: return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      case 'good': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20'
      case 'fair': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      case 'poor': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-200'
      case 'in_progress': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-200'
      case 'pending': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-200'
      case 'overdue': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Maintenance Dashboard</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Equipment health diagnostics and maintenance schedules</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Critical Alerts</p>
                <p className="text-lg font-semibold text-red-600">
                  {alerts.filter(a => a.severity === 'critical').length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Pending Tasks</p>
                <p className="text-lg font-semibold text-purple-600">
                  {tasks.filter(t => t.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Maintenance Alerts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Active Alerts</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm animate-pulse">
                  <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 w-full bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 w-24 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alerts.map((alert) => (
                <div key={alert.id} className={`border rounded-lg p-4 ${getAlertColor(alert.severity)}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {getAlertIcon(alert.type)}
                      <span className="text-sm font-medium capitalize">{alert.type}</span>
                    </div>
                    <span className="text-xs font-medium uppercase px-2 py-1 rounded">
                      {alert.severity}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1">{alert.machineName}</h3>
                  <p className="text-sm mb-2">{alert.message}</p>
                  <p className="text-xs font-medium mb-2">
                    Action: {alert.recommendedAction}
                  </p>
                  <p className="text-xs opacity-75">
                    {new Date(alert.timestamp).toLocaleString()}
                    {alert.estimatedFailureTime && (
                      <span className="block">
                        Est. failure: {new Date(alert.estimatedFailureTime).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Equipment Health and Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Equipment Health */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Equipment Health</h3>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-300 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {equipment.map((machine) => (
                      <button
                        key={machine.machineId}
                        onClick={() => setSelectedMachine(machine)}
                        className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                          selectedMachine?.machineId === machine.machineId
                            ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {machine.machineName}
                            </p>
                            <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-1 ${getHealthColor(machine.status)}`}>
                              <Shield className="h-3 w-3 mr-1" />
                              {machine.status}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900 dark:text-white">
                              {machine.healthScore}%
                            </p>
                            <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  machine.healthScore >= 90 ? 'bg-green-500' :
                                  machine.healthScore >= 80 ? 'bg-blue-500' :
                                  machine.healthScore >= 70 ? 'bg-yellow-500' :
                                  machine.healthScore >= 60 ? 'bg-orange-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${machine.healthScore}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Machine Details and Maintenance Tasks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Selected Machine Details */}
            {selectedMachine && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  {selectedMachine.machineName} - Health Details
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Thermometer className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Temperature</span>
                    </div>
                    <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                      {selectedMachine.temperature}°C
                    </p>
                  </div>

                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900 dark:text-green-200">Vibration</span>
                    </div>
                    <p className="text-xl font-bold text-green-900 dark:text-green-100">
                      {selectedMachine.vibration}
                    </p>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Zap className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-900 dark:text-yellow-200">Power</span>
                    </div>
                    <p className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
                      {selectedMachine.powerUsage}W
                    </p>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <Gauge className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900 dark:text-purple-200">Hours</span>
                    </div>
                    <p className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {selectedMachine.operatingHours.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Last Maintenance</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(selectedMachine.lastMaintenance).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Next Maintenance</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(selectedMachine.nextMaintenance).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Maintenance Tasks */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Maintenance Tasks</h3>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-20 bg-gray-300 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getTaskStatusColor(task.status)}`}>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {task.status.replace('_', ' ')}
                            </div>
                            <div className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(task.priority)}`}>
                              {task.priority.toUpperCase()}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {task.estimatedDuration}h
                            </p>
                          </div>
                        </div>

                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {task.description}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          Machine: {task.machineName}
                        </p>

                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Scheduled: </span>
                            <span className="text-gray-900 dark:text-white">
                              {new Date(task.scheduledDate).toLocaleString()}
                            </span>
                          </div>
                          {task.assignedTo && (
                            <div>
                              <span className="text-gray-500 dark:text-gray-400">Assigned: </span>
                              <span className="text-gray-900 dark:text-white">{task.assignedTo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}