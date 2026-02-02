'use client';

import { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Building,
  Factory,
  MapPin,
  Layers,
  Cpu,
  Activity,
  Thermometer,
  Gauge,
  Zap,
  Settings,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { SelectedTag } from '@/app/uns-viewer/page';

interface UNSTag {
  tagName: string;
  value: number | null;
  valueBool: boolean | null;
  timestamp: string;
  topic: string;
  source: string;
  location: string;
  virtualPath: string;
}

interface UNSMachine {
  machineId: string;
  name: string;
  location: string;
  virtualPaths: Record<string, UNSTag[]>;
  tagCount: number;
  lastUpdate: string;
}

interface UNSHierarchy {
  enterprise: string;
  site: string;
  area: string;
  line: string;
  machines: Record<string, UNSMachine>;
  metadata: {
    totalRecords: number;
    totalMachines: number;
    timeRange: string;
    lastUpdate: string;
  };
}

interface Props {
  onTagSelect: (tag: SelectedTag) => void;
  onMachineSelect: (machineId: string) => void;
  selectedTag: SelectedTag | null;
  selectedMachine: string | null;
}

const virtualPathConfig = {
  sensors: {
    name: 'Sensors',
    icon: Thermometer,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Temperature, pressure, and general sensor measurements',
  },
  vibration: {
    name: 'Vibration',
    icon: Activity,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Vibration monitoring and analysis data',
  },
  production: {
    name: 'Production',
    icon: TrendingUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Production metrics and quality indicators',
  },
  process: {
    name: 'Process',
    icon: Settings,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Process control parameters and setpoints',
  },
  electrical: {
    name: 'Electrical',
    icon: Zap,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    description: 'Electrical measurements and power monitoring',
  },
  default: {
    name: 'Data',
    icon: Gauge,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'General industrial data',
  },
};

export default function UNSTreeNavigation({
  onTagSelect,
  onMachineSelect,
  selectedTag,
  selectedMachine,
}: Props) {
  const [data, setData] = useState<UNSHierarchy | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['enterprise', 'site', 'area', 'line'])); // Auto-expand hierarchy
  const [expandedMachines, setExpandedMachines] = useState<Set<string>>(new Set());
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState('10m');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
      setLastRefresh(new Date());
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/uns/hierarchy?timeRange=${timeRange}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);

        // Auto-expand first machine if none are expanded
        if (expandedMachines.size === 0 && result.data.machines) {
          const firstMachine = Object.keys(result.data.machines)[0];
          if (firstMachine) {
            setExpandedMachines(new Set([firstMachine]));
            onMachineSelect(firstMachine);
          }
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch UNS data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeKey: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeKey)) {
      newExpanded.delete(nodeKey);
    } else {
      newExpanded.add(nodeKey);
    }
    setExpandedNodes(newExpanded);
  };

  const toggleMachine = (machineId: string) => {
    const newExpanded = new Set(expandedMachines);
    if (newExpanded.has(machineId)) {
      newExpanded.delete(machineId);
      if (selectedMachine === machineId) {
        onMachineSelect(''); // Clear selection
      }
    } else {
      newExpanded.add(machineId);
      onMachineSelect(machineId);
    }
    setExpandedMachines(newExpanded);
  };

  const toggleVirtualPath = (pathKey: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(pathKey)) {
      newExpanded.delete(pathKey);
    } else {
      newExpanded.add(pathKey);
    }
    setExpandedPaths(newExpanded);
  };

  const handleTagClick = (tag: UNSTag, machineId: string) => {
    onTagSelect({
      tagName: tag.tagName,
      virtualPath: tag.virtualPath,
      machineId: machineId,
      location: tag.location,
      topic: tag.topic,
    });
  };

  const formatValue = (tag: UNSTag) => {
    if (tag.valueBool !== null) {
      return tag.valueBool ? 'ON' : 'OFF';
    }
    if (tag.value !== null) {
      if (Math.abs(tag.value) >= 1000) {
        return tag.value.toLocaleString();
      }
      return tag.value.toFixed(2);
    }
    return 'N/A';
  };

  const getValueColor = (tag: UNSTag) => {
    if (tag.valueBool !== null) {
      return tag.valueBool ? 'text-green-600' : 'text-gray-500';
    }
    return 'text-gray-900';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900 mb-2">UNS Tree Navigation</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RotateCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-gray-600">Loading UNS data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900 mb-2">UNS Tree Navigation</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-600 text-sm mb-2">Error loading UNS data</p>
            <p className="text-gray-500 text-xs">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tree Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">UNS Tree Navigation</h2>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs border rounded px-2 py-1 bg-white"
          >
            <option value="1m">1 minute</option>
            <option value="5m">5 minutes</option>
            <option value="10m">10 minutes</option>
            <option value="1h">1 hour</option>
            <option value="24h">24 hours</option>
          </select>
        </div>

        {/* Note: ISA-95 hierarchy now shown in tree structure below */}

        {/* Metadata */}
        <div className="mt-3 pt-3 border-t text-xs text-gray-500">
          <div className="flex justify-between">
            <span>{data.metadata.totalMachines} machines</span>
            <span>{data.metadata.totalRecords} tags</span>
          </div>
          <div className="mt-1 text-right">
            Last: {formatTimestamp(lastRefresh.toISOString())}
          </div>
        </div>
      </div>

      {/* Tree Content - Full ISA-95 Hierarchy */}
      <div className="flex-1 overflow-y-auto">
        {/* Enterprise Level */}
        <div className="border-b">
          <button
            onClick={() => toggleNode('enterprise')}
            className="w-full px-2 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
          >
            {expandedNodes.has('enterprise') ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <Building className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-sm text-gray-900">{data.enterprise}</span>
            <span className="text-xs text-gray-500 ml-auto">Enterprise</span>
          </button>

          {/* Site Level */}
          {expandedNodes.has('enterprise') && (
            <div className="ml-6 border-l border-gray-200">
              <button
                onClick={() => toggleNode('site')}
                className="w-full px-2 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
              >
                {expandedNodes.has('site') ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
                <Factory className="w-4 h-4 text-green-600" />
                <span className="font-medium text-sm text-gray-900">{data.site}</span>
                <span className="text-xs text-gray-500 ml-auto">Site</span>
              </button>

              {/* Area Level */}
              {expandedNodes.has('site') && (
                <div className="ml-6 border-l border-gray-200">
                  <button
                    onClick={() => toggleNode('area')}
                    className="w-full px-2 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    {expandedNodes.has('area') ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                    <MapPin className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm text-gray-900">{data.area}</span>
                    <span className="text-xs text-gray-500 ml-auto">Area</span>
                  </button>

                  {/* Line Level */}
                  {expandedNodes.has('area') && (
                    <div className="ml-6 border-l border-gray-200">
                      <button
                        onClick={() => toggleNode('line')}
                        className="w-full px-2 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left"
                      >
                        {expandedNodes.has('line') ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        <Layers className="w-4 h-4 text-orange-600" />
                        <span className="font-medium text-sm text-gray-900">{data.line}</span>
                        <span className="text-xs text-gray-500 ml-auto">Line</span>
                      </button>

                      {/* Work Cells (Machines) Level */}
                      {expandedNodes.has('line') && (
                        <div className="ml-6 border-l border-gray-200">
                          {Object.entries(data.machines).map(([machineId, machine]) => {
                            const isExpanded = expandedMachines.has(machineId);
                            const isSelected = selectedMachine === machineId;

                            return (
                              <div key={machineId}>
                                {/* Machine Header */}
                                <button
                                  onClick={() => toggleMachine(machineId)}
                                  className={`w-full px-2 py-2 flex items-center gap-2 hover:bg-gray-50 transition-colors text-left ${
                                    isSelected ? 'bg-orange-50 border-r-2 border-orange-500' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                    <Cpu className="w-4 h-4 text-red-600" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm text-gray-900 truncate">
                                        {machine.name}
                                      </div>
                                      <div className="text-xs text-gray-500 truncate">
                                        {machineId} • {machine.tagCount} tags
                                      </div>
                                    </div>
                                  </div>
                                </button>

                                {/* Virtual Paths */}
                                {isExpanded && (
                                  <div className="ml-6 border-l border-gray-200 bg-gray-50">
                                    {Object.entries(machine.virtualPaths).map(([virtualPath, tags]) => {
                                      const config =
                                        virtualPathConfig[virtualPath as keyof typeof virtualPathConfig] ||
                                        virtualPathConfig.default;
                                      const pathKey = `${machineId}-${virtualPath}`;
                                      const isPathExpanded = expandedPaths.has(pathKey);
                                      const IconComponent = config.icon;

                                      return (
                                        <div key={virtualPath}>
                                          {/* Virtual Path Header */}
                                          <button
                                            onClick={() => toggleVirtualPath(pathKey)}
                                            className="w-full px-2 py-2 flex items-center gap-2 hover:bg-white transition-colors text-left"
                                          >
                                            {isPathExpanded ? (
                                              <ChevronDown className="w-3 h-3 text-gray-400" />
                                            ) : (
                                              <ChevronRight className="w-3 h-3 text-gray-400" />
                                            )}
                                            <IconComponent className={`w-3 h-3 ${config.color}`} />
                                            <span className="text-sm font-medium text-gray-700">
                                              {config.name}
                                            </span>
                                            <span className="text-xs text-gray-500 ml-auto">
                                              {tags.length}
                                            </span>
                                          </button>

                                          {/* Tags */}
                                          {isPathExpanded && (
                                            <div className="ml-6 border-l border-gray-200 bg-white">
                                              {tags.map((tag, idx) => {
                                                const isTagSelected =
                                                  selectedTag?.tagName === tag.tagName &&
                                                  selectedTag?.virtualPath === tag.virtualPath &&
                                                  selectedTag?.machineId === machineId;

                                                return (
                                                  <button
                                                    key={idx}
                                                    onClick={() => handleTagClick(tag, machineId)}
                                                    className={`w-full px-2 py-2 flex items-center justify-between hover:bg-gray-50 transition-colors text-left text-xs ${
                                                      isTagSelected ? 'bg-orange-50 border-r-2 border-orange-500' : ''
                                                    }`}
                                                  >
                                                    <div className="flex-1 min-w-0">
                                                      <div className="font-medium text-gray-700 truncate">
                                                        {tag.tagName}
                                                      </div>
                                                      <div className="text-gray-500 truncate">
                                                        {formatTimestamp(tag.timestamp)}
                                                      </div>
                                                    </div>
                                                    <div className={`text-right font-mono ${getValueColor(tag)}`}>
                                                      {formatValue(tag)}
                                                    </div>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}