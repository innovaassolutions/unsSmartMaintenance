'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Activity, Database } from 'lucide-react';

interface TagData {
  tagName: string;
  value: number | null;
  valueBool: boolean | null;
  timestamp: string;
  topic: string;
  source: string;
}

interface HierarchyData {
  enterprise: string;
  site: string;
  area: string;
  line: string;
  workCell: string;
  virtualPaths: Record<string, TagData[]>;
  metadata: {
    totalRecords: number;
    timeRange: string;
    lastUpdate: string;
  };
}

const virtualPathConfig = {
  sensors: {
    name: 'Sensors',
    color: 'bg-blue-500',
    icon: '🌡️',
    description: 'General sensor measurements',
  },
  vibration: {
    name: 'Vibration',
    color: 'bg-purple-500',
    icon: '📊',
    description: 'Vibration monitoring data',
  },
  production: {
    name: 'Production',
    color: 'bg-green-500',
    icon: '⚙️',
    description: 'Production metrics',
  },
  process: {
    name: 'Process',
    color: 'bg-orange-500',
    icon: '🔄',
    description: 'Process control data',
  },
};

export default function UNSHierarchyViewer() {
  const [data, setData] = useState<HierarchyData | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['sensors']));
  const [timeRange, setTimeRange] = useState('1h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/uns/hierarchy?timeRange=${timeRange}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePath = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const formatValue = (tag: TagData) => {
    if (tag.valueBool !== null) {
      return tag.valueBool ? 'Active' : 'Inactive';
    }
    if (tag.value !== null) {
      return tag.value.toFixed(2);
    }
    return 'N/A';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading UNS data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error || 'No data available'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">Unified Namespace Data</h2>
            <p className="text-gray-600 text-sm mt-1">Real-time industrial data from TimescaleDB</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="5m">Last 5 minutes</option>
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
            </select>
          </div>
        </div>

        {/* ISA-95 Hierarchy Display */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Database className="w-4 h-4" />
            <span className="font-semibold">Location:</span>
            <span>{data.enterprise}</span>
            <span className="text-gray-400">→</span>
            <span>{data.site}</span>
            <span className="text-gray-400">→</span>
            <span>{data.area}</span>
            <span className="text-gray-400">→</span>
            <span>{data.line}</span>
            <span className="text-gray-400">→</span>
            <span className="font-semibold">{data.workCell}</span>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Records:</span>
            <span className="ml-2 font-semibold">{data.metadata.totalRecords}</span>
          </div>
          <div>
            <span className="text-gray-600">Time Range:</span>
            <span className="ml-2 font-semibold">{data.metadata.timeRange}</span>
          </div>
          <div>
            <span className="text-gray-600">Last Update:</span>
            <span className="ml-2 font-semibold">{formatTimestamp(data.metadata.lastUpdate)}</span>
          </div>
        </div>
      </div>

      {/* Virtual Paths */}
      <div className="space-y-3">
        {Object.entries(data.virtualPaths).map(([path, tags]) => {
          const config = virtualPathConfig[path as keyof typeof virtualPathConfig];
          const isExpanded = expandedPaths.has(path);

          return (
            <div key={path} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Path Header */}
              <button
                onClick={() => togglePath(path)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config?.icon || '📁'}</span>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{config?.name || path}</h3>
                    <p className="text-sm text-gray-600">{config?.description || `${path} data`}</p>
                  </div>
                  <span className={`${config?.color || 'bg-gray-500'} text-white text-xs px-2 py-1 rounded`}>
                    {tags.length} tags
                  </span>
                </div>
                {isExpanded ? <ChevronDown /> : <ChevronRight />}
              </button>

              {/* Tags List */}
              {isExpanded && (
                <div className="border-t">
                  {tags.map((tag, idx) => (
                    <div
                      key={idx}
                      className="px-6 py-3 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{tag.tagName}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            {tag.topic}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">
                            {formatValue(tag)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatTimestamp(tag.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}