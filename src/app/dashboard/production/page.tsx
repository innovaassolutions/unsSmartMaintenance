'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Activity, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  CheckCircle, 
  AlertTriangle,
  BarChart3,
  Target,
  Package,
  Timer,
  TrendingUp,
  Settings
} from 'lucide-react'

interface ProductionJob {
  id: string
  name: string
  machineId: string
  machineName: string
  status: 'scheduled' | 'running' | 'paused' | 'completed' | 'delayed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  startTime: string
  estimatedDuration: number
  actualDuration?: number
  progress: number
  partCount: number
  targetCount: number
}

interface ProductionMetrics {
  todayTarget: number
  todayActual: number
  efficiency: number
  avgCycleTime: number
  onTimeDelivery: number
  qualityRate: number
}

interface MachineStatus {
  id: string
  name: string
  status: 'running' | 'idle' | 'maintenance' | 'offline'
  currentJob?: string
  utilization: number
}

export default function ProductionManagerDashboard() {
  const [jobs, setJobs] = useState<ProductionJob[]>([])
  const [metrics, setMetrics] = useState<ProductionMetrics>({
    todayTarget: 0,
    todayActual: 0,
    efficiency: 0,
    avgCycleTime: 0,
    onTimeDelivery: 0,
    qualityRate: 0
  })
  const [machines, setMachines] = useState<MachineStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProductionData = async () => {
      try {
        // Fetch machine status for production scheduling
        const machinesResponse = await fetch('/api/pipeline/machine-status')
        const machinesData = await machinesResponse.json()

        // Fetch pipeline metrics for production insights
        const metricsResponse = await fetch('/api/pipeline/metrics?timeRange=24h')
        const metricsData = await metricsResponse.json()

        // Transform machine data for production view
        const machineStatuses: MachineStatus[] = (machinesData.machines || []).map((machine: any) => ({
          id: machine.id,
          name: machine.display_name,
          status: machine.pipeline_status === 'connected' ? 'running' : 'offline',
          utilization: Math.round(70 + Math.random() * 25) // Simulated utilization 70-95%
        }))

        // Generate simulated production jobs
        const simulatedJobs: ProductionJob[] = [
          {
            id: 'job-001',
            name: 'Housing Assembly Batch A',
            machineId: machineStatuses[0]?.id || 'machine-1',
            machineName: machineStatuses[0]?.name || 'CNC Mill 001',
            status: 'running',
            priority: 'high',
            startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            estimatedDuration: 4,
            progress: 65,
            partCount: 130,
            targetCount: 200
          },
          {
            id: 'job-002',
            name: 'Precision Shaft Production',
            machineId: machineStatuses[1]?.id || 'machine-2',
            machineName: machineStatuses[1]?.name || 'CNC Lathe 002',
            status: 'scheduled',
            priority: 'medium',
            startTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
            estimatedDuration: 6,
            progress: 0,
            partCount: 0,
            targetCount: 150
          },
          {
            id: 'job-003',
            name: 'Engine Block Finishing',
            machineId: machineStatuses[2]?.id || 'machine-3',
            machineName: machineStatuses[2]?.name || 'Multi-Axis 003',
            status: 'paused',
            priority: 'critical',
            startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
            estimatedDuration: 8,
            progress: 25,
            partCount: 20,
            targetCount: 80
          },
          {
            id: 'job-004',
            name: 'Valve Cover Manufacturing',
            machineId: machineStatuses[3]?.id || 'machine-4',
            machineName: machineStatuses[3]?.name || 'CNC Mill 004',
            status: 'completed',
            priority: 'low',
            startTime: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8 hours ago
            estimatedDuration: 5,
            actualDuration: 4.5,
            progress: 100,
            partCount: 300,
            targetCount: 300
          },
          {
            id: 'job-005',
            name: 'Bracket Assembly Line',
            machineId: machineStatuses[4]?.id || 'machine-5',
            machineName: machineStatuses[4]?.name || 'CNC Lathe 005',
            status: 'delayed',
            priority: 'high',
            startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
            estimatedDuration: 3,
            progress: 10,
            partCount: 15,
            targetCount: 120
          }
        ]

        // Calculate production metrics
        const completedJobs = simulatedJobs.filter(job => job.status === 'completed')
        const runningJobs = simulatedJobs.filter(job => job.status === 'running')
        const totalActual = completedJobs.reduce((sum, job) => sum + job.partCount, 0) + 
                           runningJobs.reduce((sum, job) => sum + job.partCount, 0)
        const totalTarget = simulatedJobs.reduce((sum, job) => sum + job.targetCount, 0)

        const productionMetrics: ProductionMetrics = {
          todayTarget: totalTarget,
          todayActual: totalActual,
          efficiency: Math.round((totalActual / totalTarget) * 100),
          avgCycleTime: 4.2 + Math.random() * 2, // 4.2-6.2 minutes
          onTimeDelivery: Math.round(88 + Math.random() * 10), // 88-98%
          qualityRate: Math.round(92 + Math.random() * 6) // 92-98%
        }

        setJobs(simulatedJobs)
        setMachines(machineStatuses)
        setMetrics(productionMetrics)

      } catch (error) {
        console.error('Failed to fetch production data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProductionData()
    // Refresh every 45 seconds for production monitoring
    const interval = setInterval(fetchProductionData, 45000)
    return () => clearInterval(interval)
  }, [])

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-200'
      case 'scheduled': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-200'
      case 'paused': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-200'
      case 'completed': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-200'
      case 'delayed': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-200'
    }
  }

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="h-4 w-4" />
      case 'scheduled': return <Calendar className="h-4 w-4" />
      case 'paused': return <Pause className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'delayed': return <AlertTriangle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50 dark:bg-red-900/20'
      case 'high': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-900/20'
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h}h ${m}m`
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
                <div className="p-2 bg-orange-600 rounded-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Production Manager</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Production planning and scheduling optimization</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Today's Progress</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {metrics.todayActual} / {metrics.todayTarget}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Efficiency</p>
                <p className="text-lg font-semibold text-orange-600">
                  {metrics.efficiency}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Production Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Production Metrics</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm animate-pulse">
                  <div className="h-4 w-24 bg-gray-300 rounded mb-4"></div>
                  <div className="h-8 w-20 bg-gray-300 rounded mb-2"></div>
                  <div className="h-3 w-16 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="h-5 w-5 text-orange-600" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Production Target</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {metrics.efficiency}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {metrics.todayActual} of {metrics.todayTarget} parts
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Timer className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Cycle Time</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {metrics.avgCycleTime.toFixed(1)}m
                </p>
                <p className="text-xs text-green-600">
                  -2.3% vs target
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <Package className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">On-Time Delivery</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {metrics.onTimeDelivery}%
                </p>
                <p className="text-xs text-green-600">
                  +1.8% this week
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Rate</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {metrics.qualityRate}%
                </p>
                <p className="text-xs text-green-600">
                  +0.5% improvement
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Production Jobs and Machine Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Production Jobs */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Production Schedule</h3>
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
                    {jobs.map((job) => (
                      <div key={job.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getJobStatusColor(job.status)}`}>
                              {getJobStatusIcon(job.status)}
                              <span className="ml-1 capitalize">{job.status}</span>
                            </div>
                            <div className={`px-2 py-1 text-xs font-medium rounded ${getPriorityColor(job.priority)}`}>
                              {job.priority.toUpperCase()}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {job.partCount} / {job.targetCount}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Parts</p>
                          </div>
                        </div>

                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {job.name}
                        </h4>

                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Machine</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{job.machineName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {job.actualDuration ? formatDuration(job.actualDuration) : formatDuration(job.estimatedDuration)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-2">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Progress</span>
                            <span className="text-xs font-medium text-gray-900 dark:text-white">{job.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                job.status === 'completed' ? 'bg-green-500' :
                                job.status === 'running' ? 'bg-blue-500' :
                                job.status === 'delayed' ? 'bg-red-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${job.progress}%` }}
                            ></div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {job.status === 'scheduled' 
                            ? `Scheduled: ${new Date(job.startTime).toLocaleString()}`
                            : `Started: ${new Date(job.startTime).toLocaleString()}`
                          }
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Machine Utilization */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Machine Utilization</h3>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-16 bg-gray-300 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {machines.slice(0, 6).map((machine) => (
                      <div key={machine.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`h-3 w-3 rounded-full ${
                            machine.status === 'running' ? 'bg-green-500' :
                            machine.status === 'idle' ? 'bg-yellow-500' :
                            machine.status === 'maintenance' ? 'bg-orange-500' : 'bg-red-500'
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {machine.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                              {machine.status}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {machine.utilization}%
                          </p>
                          <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-1">
                            <div 
                              className="bg-blue-500 h-1 rounded-full"
                              style={{ width: `${machine.utilization}%` }}
                            ></div>
                          </div>
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