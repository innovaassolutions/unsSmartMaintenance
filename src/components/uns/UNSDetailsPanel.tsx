'use client';

import { useState, useEffect } from 'react';
import {
  Copy,
  Database,
  Clock,
  MapPin,
  Tag,
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  Code,
  Filter,
  BarChart3,
} from 'lucide-react';
import { SelectedTag } from '@/app/uns-viewer/page';

interface TagHistory {
  time: string;
  value: number | null;
  value_bool: boolean | null;
}

interface TagDetails {
  tagName: string;
  virtualPath: string;
  location: string;
  topic: string;
  latestValue: number | null;
  latestValueBool: boolean | null;
  latestTimestamp: string;
  source: string;
  history: TagHistory[];
  statistics: {
    count: number;
    min: number | null;
    max: number | null;
    avg: number | null;
    stddev: number | null;
  };
}

interface MachineOverview {
  machineId: string;
  name: string;
  location: string;
  virtualPaths: Record<string, number>;
  totalTags: number;
  lastUpdate: string;
  healthStatus: 'healthy' | 'warning' | 'critical';
  dataQuality: number;
}

interface Props {
  selectedTag: SelectedTag | null;
  selectedMachine: string | null;
}

export default function UNSDetailsPanel({ selectedTag, selectedMachine }: Props) {
  const [tagDetails, setTagDetails] = useState<TagDetails | null>(null);
  const [machineOverview, setMachineOverview] = useState<MachineOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('1h');

  useEffect(() => {
    if (selectedTag) {
      fetchTagDetails();
    } else if (selectedMachine) {
      fetchMachineOverview();
    } else {
      setTagDetails(null);
      setMachineOverview(null);
    }
  }, [selectedTag, selectedMachine, timeRange]);

  const fetchTagDetails = async () => {
    if (!selectedTag) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/uns/tag-details?` +
        `tagName=${encodeURIComponent(selectedTag.tagName)}&` +
        `virtualPath=${encodeURIComponent(selectedTag.virtualPath)}&` +
        `machineId=${encodeURIComponent(selectedTag.machineId)}&` +
        `timeRange=${timeRange}`
      );
      const result = await response.json();

      if (result.success) {
        setTagDetails(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch tag details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMachineOverview = async () => {
    if (!selectedMachine) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/uns/machine-overview?machineId=${encodeURIComponent(selectedMachine)}&timeRange=${timeRange}`
      );
      const result = await response.json();

      if (result.success) {
        setMachineOverview(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch machine overview');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  const generateSQLQuery = (tag: SelectedTag) => {
    return `-- UNS Tag Query
SELECT
  time,
  value,
  value_bool,
  topic,
  source
FROM uns_data
WHERE tag_name = '${tag.tagName}'
  AND virtual_path = '${tag.virtualPath}'
  AND location LIKE '%${tag.machineId}%'
ORDER BY time DESC
LIMIT 100;`;
  };

  const formatValue = (value: number | null, valueBool: boolean | null) => {
    if (valueBool !== null) {
      return valueBool ? 'ON (true)' : 'OFF (false)';
    }
    if (value !== null) {
      if (Math.abs(value) >= 1000) {
        return value.toLocaleString();
      }
      return value.toFixed(3);
    }
    return 'N/A';
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Default state - no selection
  if (!selectedTag && !selectedMachine) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b bg-white">
          <h2 className="font-semibold text-gray-900 mb-2">UNS Details Panel</h2>
          <p className="text-sm text-gray-600">
            Select a machine or tag from the tree to view detailed information
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Unified Namespace Explorer
            </h3>
            <p className="text-gray-600 max-w-md">
              This panel shows real-time tag values, historical data, and SQL query generation
              for selected UNS data points following ISA-95 standards.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b bg-white">
          <h2 className="font-semibold text-gray-900">UNS Details Panel</h2>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />
            <p className="text-sm text-gray-600">Loading details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-6 border-b bg-white">
          <h2 className="font-semibold text-gray-900">UNS Details Panel</h2>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 mb-1">Error loading data</p>
            <p className="text-xs text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Tag details view
  if (selectedTag && tagDetails) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-6 bg-white border-b">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900 mb-1">Tag Details</h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Tag className="w-4 h-4" />
                <span className="font-medium">{tagDetails.tagName}</span>
                <span className="text-gray-400">•</span>
                <span>{tagDetails.virtualPath}</span>
              </div>
            </div>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border rounded px-3 py-2 bg-white"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>

          {/* Current Value */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-orange-700 font-medium">Current Value</div>
                <div className="text-2xl font-bold text-orange-900 mt-1">
                  {formatValue(tagDetails.latestValue, tagDetails.latestValueBool)}
                </div>
              </div>
              <div className="text-right text-sm text-orange-700">
                <div>Last Updated</div>
                <div className="font-medium mt-1">
                  {formatTimestamp(tagDetails.latestTimestamp)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Location Information */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location & Topic
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ISA-95 Location:</span>
                <span className="font-mono text-gray-900">{tagDetails.location}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">UNS Topic:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-gray-900 truncate max-w-xs">
                    {tagDetails.topic}
                  </span>
                  <button
                    onClick={() => copyToClipboard(tagDetails.topic)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Virtual Path:</span>
                <span className="font-medium text-gray-900">{tagDetails.virtualPath}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Source:</span>
                <span className="text-gray-900">{tagDetails.source}</span>
              </div>
            </div>
          </div>

          {/* Statistics */}
          {tagDetails.statistics && tagDetails.statistics.count > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Statistics ({timeRange})
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Data Points:</span>
                  <div className="font-semibold text-gray-900">{tagDetails.statistics.count}</div>
                </div>
                {tagDetails.statistics.min !== null && (
                  <>
                    <div>
                      <span className="text-gray-600">Average:</span>
                      <div className="font-semibold text-gray-900">
                        {tagDetails.statistics.avg?.toFixed(3) || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Minimum:</span>
                      <div className="font-semibold text-gray-900">
                        {tagDetails.statistics.min.toFixed(3)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Maximum:</span>
                      <div className="font-semibold text-gray-900">
                        {tagDetails.statistics.max?.toFixed(3) || 'N/A'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* SQL Query Generator */}
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Code className="w-4 h-4" />
              SQL Query
            </h3>
            <div className="bg-gray-900 rounded p-3 text-sm">
              <pre className="text-green-400 whitespace-pre-wrap overflow-x-auto">
                {generateSQLQuery(selectedTag)}
              </pre>
            </div>
            <button
              onClick={() => copyToClipboard(generateSQLQuery(selectedTag))}
              className="mt-2 flex items-center gap-2 px-3 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors"
            >
              <Copy className="w-4 h-4" />
              Copy Query
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Machine overview view (placeholder - would need API implementation)
  if (selectedMachine && machineOverview) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="p-6 bg-white border-b">
          <h2 className="font-semibold text-gray-900 mb-2">Machine Overview</h2>
          <p className="text-sm text-gray-600">{selectedMachine}</p>
        </div>
        <div className="flex-1 p-6">
          <div className="text-center text-gray-500">
            Machine overview implementation pending...
          </div>
        </div>
      </div>
    );
  }

  // Machine selected but no overview data
  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="p-6 bg-white border-b">
        <h2 className="font-semibold text-gray-900 mb-2">Machine Overview</h2>
        <p className="text-sm text-gray-600">{selectedMachine}</p>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Select a specific tag to view detailed information, or machine overview data will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
}