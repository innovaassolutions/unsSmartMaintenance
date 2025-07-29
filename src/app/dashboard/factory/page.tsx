'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  Factory, 
  ArrowLeft, 
  Activity, 
  Thermometer, 
  Zap, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Wifi,
  WifiOff
} from 'lucide-react'

interface MachineDetails {
  id: string
  machine_id: string
  display_name: string
  pipeline_status: string
  data_quality_score: number
  last_data_received: string
  total_messages_received: number
  recent_readings_count: number
}

interface SensorReading {
  sensor_type: string
  value_numeric: number
  value_text: string
  unit: string
  timestamp: string
  quality_code: number
}

export default function FactoryManagerDashboard() {
  const [machines, setMachines] = useState<MachineDetails[]>([])
  const [selectedMachine, setSelectedMachine] = useState<MachineDetails | null>(null)
  const [sensorData, setSensorData] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [sensorLoading, setSensorLoading] = useState(false)

  useEffect(() => {
    const fetchMachineData = async () => {
      try {
        const response = await fetch('/api/pipeline/machine-status')
        const data = await response.json()
        
        if (data.machines) {
          setMachines(data.machines)
          // Auto-select first connected machine
          const connectedMachine = data.machines.find((m: MachineDetails) => m.pipeline_status === 'connected')
          if (connectedMachine && !selectedMachine) {
            setSelectedMachine(connectedMachine)
            fetchSensorData(connectedMachine.id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch machine data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMachineData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchMachineData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchSensorData = async (machineId: string) => {
    setSensorLoading(true)
    try {
      const response = await fetch(`/api/pipeline/sensor-data?machineId=${machineId}&limit=10`)
      const data = await response.json()
      
      if (data.readings) {
        setSensorData(data.readings)
      }
    } catch (error) {
      console.error('Failed to fetch sensor data:', error)
    } finally {
      setSensorLoading(false)
    }
  }

  const handleMachineSelect = (machine: MachineDetails) => {
    setSelectedMachine(machine)
    fetchSensorData(machine.id)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-200'
      case 'disconnected': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-200'
      case 'error': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-200'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />
      case 'disconnected': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getSensorIcon = (sensorType: string) => {
    switch (sensorType) {
      case 'temperature': return <Thermometer className="h-4 w-4" />
      case 'power': return <Zap className="h-4 w-4" />
      case 'vibration': return <Activity className="h-4 w-4" />
      default: return <Settings className="h-4 w-4" />
    }
  }

  const formatSensorValue = (reading: SensorReading) => {
    if (reading.value_numeric !== null) {
      return `${reading.value_numeric}${reading.unit ? ` ${reading.unit}` : ''}`
    }
    return reading.value_text || 'N/A'
  }

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
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
                <div className="p-2 bg-green-600 rounded-lg">
                  <Factory className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Factory Manager</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Real-time equipment monitoring and control</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Total Equipment</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {machines.length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-300">Online</p>
                <p className="text-lg font-semibold text-green-600">
                  {machines.filter(m => m.pipeline_status === 'connected').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Machine List */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Equipment Status</h2>
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
                  <div className="space-y-2">
                    {machines.map((machine) => (
                      <button
                        key={machine.id}
                        onClick={() => handleMachineSelect(machine)}
                        className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                          selectedMachine?.id === machine.id
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {machine.pipeline_status === 'connected' ? (
                              <Wifi className="h-4 w-4 text-green-600" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-red-600" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {machine.display_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {machine.machine_id}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(machine.pipeline_status)}`}>
                              {getStatusIcon(machine.pipeline_status)}
                              <span className="ml-1 capitalize">{machine.pipeline_status}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Quality: <span className={getQualityColor(machine.data_quality_score)}>
                                {machine.data_quality_score}%
                              </span>
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Machine Details */}
          <div className="lg:col-span-2">
            {selectedMachine ? (
              <div className="space-y-6">
                {/* Machine Overview */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {selectedMachine.display_name}
                    </h2>
                    <div className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(selectedMachine.pipeline_status)}`}>
                      {getStatusIcon(selectedMachine.pipeline_status)}
                      <span className="ml-2 capitalize">{selectedMachine.pipeline_status}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Data Quality</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {selectedMachine.data_quality_score}%
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Activity className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900 dark:text-green-200">Messages</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                        {selectedMachine.total_messages_received?.toLocaleString() || 0}
                      </p>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Clock className="h-4 w-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900 dark:text-purple-200">Recent Data</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {selectedMachine.recent_readings_count || 0}
                      </p>
                    </div>
                  </div>

                  {selectedMachine.last_data_received && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Last data received: {new Date(selectedMachine.last_data_received).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Real-time Sensor Data */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Real-time Sensor Data</h3>
                  </div>
                  <div className="p-4">
                    {sensorLoading ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="animate-pulse">
                            <div className="h-12 bg-gray-300 rounded"></div>
                          </div>
                        ))}
                      </div>
                    ) : sensorData.length > 0 ? (
                      <div className="space-y-3">
                        {sensorData.slice(0, 6).map((reading, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-white dark:bg-slate-600 rounded-lg">
                                {getSensorIcon(reading.sensor_type)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                  {reading.sensor_type.replace('_', ' ')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Quality: {reading.quality_code}/255
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                {formatSensorValue(reading)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(reading.timestamp).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Settings className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          No sensor data available for this machine
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8">
                <div className="text-center">
                  <Factory className="mx-auto h-16 w-16 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                    Select a Machine
                  </h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Choose a machine from the list to view detailed information and real-time sensor data.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}