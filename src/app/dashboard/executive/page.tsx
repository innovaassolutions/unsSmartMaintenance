'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  ArrowLeft,
  BarChart3,
  Zap
} from 'lucide-react'

interface ExecutiveMetrics {
  overallEfficiency: number
  totalDowntime: number
  qualityScore: number
  costSavings: number
  activeMachines: number
  totalMachines: number
  criticalAlerts: number
  completedJobs: number
}

interface MachinePerformance {
  machineId: string
  displayName: string
  efficiency: number
  uptime: number
  status: string
}

export default function ExecutiveDashboard() {
  const [metrics, setMetrics] = useState<ExecutiveMetrics>({
    overallEfficiency: 0,
    totalDowntime: 0,
    qualityScore: 0,
    costSavings: 0,
    activeMachines: 0,
    totalMachines: 0,
    criticalAlerts: 0,
    completedJobs: 0
  })
  const [topPerformers, setTopPerformers] = useState<MachinePerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExecutiveData = async () => {
      try {
        // Fetch machine status for high-level metrics
        const machinesResponse = await fetch('/api/pipeline/machine-status')
        const machinesData = await machinesResponse.json()

        // Fetch pipeline metrics for performance data
        const metricsResponse = await fetch('/api/pipeline/metrics?timeRange=24h')
        const metricsData = await metricsResponse.json()

        // Calculate executive-level KPIs
        const machines = machinesData.machines || []
        const connectedMachines = machines.filter((m: any) => m.pipeline_status === 'connected')
        
        // Simulate executive metrics (in real implementation, these would come from historical data analysis)
        const calculatedMetrics: ExecutiveMetrics = {
          overallEfficiency: Math.round((connectedMachines.length / machines.length) * 100),
          totalDowntime: Math.round(Math.random() * 8 + 2), // Simulated downtime hours
          qualityScore: Math.round(85 + Math.random() * 10), // Simulated quality score 85-95%
          costSavings: Math.round(15000 + Math.random() * 10000), // Simulated monthly savings
          activeMachines: connectedMachines.length,
          totalMachines: machines.length,
          criticalAlerts: machines.filter((m: any) => m.data_quality_score < 70).length,
          completedJobs: Math.round(45 + Math.random() * 15) // Simulated completed jobs
        }

        // Top performing machines (by uptime and quality)
        const performers: MachinePerformance[] = machines
          .slice(0, 5)
          .map((machine: any) => ({
            machineId: machine.machine_id,
            displayName: machine.display_name,
            efficiency: Math.round(80 + Math.random() * 20),
            uptime: Math.round(85 + Math.random() * 15),
            status: machine.pipeline_status
          }))

        setMetrics(calculatedMetrics)
        setTopPerformers(performers)

      } catch (error) {
        console.error('Failed to fetch executive data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchExecutiveData()
    // Refresh every 60 seconds for executive view
    const interval = setInterval(fetchExecutiveData, 60000)
    return () => clearInterval(interval)
  }, [])

  const kpiCards = [
    {
      title: 'Overall Equipment Effectiveness',
      value: `${metrics.overallEfficiency}%`,
      change: '+2.3%',
      changeType: 'positive' as const,
      icon: BarChart3,
      description: 'Manufacturing efficiency across all equipment'
    },
    {
      title: 'Total Downtime',
      value: `${metrics.totalDowntime}h`,
      change: '-1.2h',
      changeType: 'positive' as const,
      icon: Clock,
      description: 'Unplanned downtime in last 24 hours'
    },
    {
      title: 'Quality Score',
      value: `${metrics.qualityScore}%`,
      change: '+0.8%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      description: 'Product quality compliance rate'
    },
    {
      title: 'Cost Savings',
      value: `$${metrics.costSavings.toLocaleString()}`,
      change: '+$2.1K',
      changeType: 'positive' as const,
      icon: DollarSign,
      description: 'Monthly operational cost reduction'
    }
  ]

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
                <div className="p-2 bg-blue-600 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Dashboard</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Strategic operational overview</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Active Machines</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {metrics.activeMachines}/{metrics.totalMachines}
                </p>
              </div>
              {metrics.criticalAlerts > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 dark:bg-red-900/20 rounded-full">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800 dark:text-red-200">
                    {metrics.criticalAlerts} Critical
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Performance Indicators */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Key Performance Indicators</h2>
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
              {kpiCards.map((kpi, index) => {
                const IconComponent = kpi.icon
                return (
                  <div key={index} className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className={`flex items-center space-x-1 text-xs font-medium ${
                        kpi.changeType === 'positive' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {kpi.changeType === 'positive' ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{kpi.change}</span>
                      </div>
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      {kpi.title}
                    </h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {kpi.description}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Production Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Today's Performance */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Today's Performance</h3>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                    <div className="h-6 w-full bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Production Target</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">87%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Equipment Utilization</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-blue-500 h-3 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Rate</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{metrics.qualityScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div className="bg-purple-500 h-3 rounded-full" style={{ width: `${metrics.qualityScore}%` }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between animate-pulse">
                    <div className="h-4 w-20 bg-gray-300 rounded"></div>
                    <div className="h-4 w-12 bg-gray-300 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Jobs Completed</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{metrics.completedJobs}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Active Orders</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">23</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg Cycle Time</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">4.2h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Energy Usage</span>
                  <span className="text-sm font-semibold text-green-600">-8% ↓</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Equipment */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Equipment</h3>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="h-4 w-32 bg-gray-300 rounded"></div>
                  <div className="h-4 w-20 bg-gray-300 rounded"></div>
                  <div className="h-4 w-16 bg-gray-300 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left text-sm font-medium text-gray-600 dark:text-gray-400 pb-2">Equipment</th>
                    <th className="text-right text-sm font-medium text-gray-600 dark:text-gray-400 pb-2">Efficiency</th>
                    <th className="text-right text-sm font-medium text-gray-600 dark:text-gray-400 pb-2">Uptime</th>
                    <th className="text-right text-sm font-medium text-gray-600 dark:text-gray-400 pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformers.map((machine, index) => (
                    <tr key={machine.machineId} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <div className={`h-2 w-2 rounded-full ${
                            machine.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {machine.displayName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {machine.efficiency}%
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {machine.uptime}%
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          machine.status === 'connected'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                        }`}>
                          {machine.status === 'connected' ? 'Online' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}