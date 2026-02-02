'use client';

import { useState, useEffect } from 'react';
import { Clock, Database, TrendingUp, Activity, Copy, Check, BarChart3 } from 'lucide-react';

interface TagDetails {
  tagInfo: {
    tagName: string;
    virtualPath: string;
    currentValue: {
      value?: number;
      valueBool?: boolean;
      timestamp: string;
      topic: string;
    } | null;
  };
  statistics: {
    totalRecords: number;
    earliestRecord: string;
    latestRecord: string;
    avgValue?: number;
    minValue?: number;
    maxValue?: number;
    trueCount: number;
    falseCount: number;
  };
  history: Array<{
    timestamp: string;
    value?: number;
    valueBool?: boolean;
    topic: string;
  }>;
  timeSeries: Array<{
    timestamp: string;
    avgValue?: number;
    sampleCount: number;
  }>;
  sqlQueries: {
    currentQuery: string;
    historyQuery: string;
    statsQuery: string;
  };
}

interface TagDetailsPanelProps {
  selectedTag: { tagName: string; virtualPath: string } | null;
}

export default function TagDetailsPanel({ selectedTag }: TagDetailsPanelProps) {
  const [details, setDetails] = useState<TagDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('1h');
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTag) {
      fetchTagDetails();
      const interval = setInterval(fetchTagDetails, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [selectedTag, timeRange]);

  const fetchTagDetails = async () => {
    if (!selectedTag) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/tag-browser/tag-details?tagName=${encodeURIComponent(selectedTag.tagName)}&virtualPath=${encodeURIComponent(selectedTag.virtualPath)}&timeRange=${timeRange}`
      );
      const result = await response.json();

      if (result.success) {
        setDetails(result);
        setError(null);
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

  const formatValue = (value?: number, valueBool?: boolean) => {
    if (valueBool !== undefined) {
      return valueBool ? 'ON' : 'OFF';
    }
    if (value !== undefined) {
      return value.toFixed(2);
    }
    return 'N/A';
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const copyToClipboard = async (text: string, queryType: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedQuery(queryType);
      setTimeout(() => setCopiedQuery(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!selectedTag) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <Database className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium mb-2">Select a tag to view details</p>
          <p className="text-sm">Choose any tag from the tree on the left to see its statistics, history, and SQL queries.</p>
        </div>
      </div>
    );
  }

  if (loading && !details) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />
          <p className="text-sm text-gray-600">Loading tag details...</p>
        </div>
      </div>
    );
  }

  if (error && !details) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error loading details</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchTagDetails}
            className="mt-2 px-3 py-1 text-xs bg-red-100 hover:bg-red-200 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold text-lg text-gray-900">{selectedTag.tagName}</h2>
            <p className="text-sm text-gray-600 mt-1">{selectedTag.virtualPath}</p>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="5m">Last 5 minutes</option>
            <option value="1h">Last 1 hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
          </select>
        </div>

        {/* Current Value */}
        {details?.tagInfo.currentValue && (
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Value</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatValue(details.tagInfo.currentValue.value, details.tagInfo.currentValue.valueBool)}
                </p>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>{formatTimestamp(details.tagInfo.currentValue.timestamp)}</p>
                <p className="text-xs">{details.tagInfo.currentValue.topic}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {details && (
          <div className="p-4 space-y-6">
            {/* Statistics */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-500" />
                Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Total Records</p>
                  <p className="text-xl font-bold">{details.statistics.totalRecords.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Data Range</p>
                  <p className="text-xs">
                    {formatTimestamp(details.statistics.earliestRecord)} to {formatTimestamp(details.statistics.latestRecord)}
                  </p>
                </div>

                {details.statistics.avgValue !== null && (
                  <>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Average Value</p>
                      <p className="text-xl font-bold">{details.statistics.avgValue?.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Min / Max</p>
                      <p className="text-sm">
                        {details.statistics.minValue?.toFixed(2)} / {details.statistics.maxValue?.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}

                {(details.statistics.trueCount > 0 || details.statistics.falseCount > 0) && (
                  <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                    <p className="text-sm text-gray-600">Boolean Distribution</p>
                    <div className="flex justify-between mt-1">
                      <span className="text-sm">TRUE: {details.statistics.trueCount}</span>
                      <span className="text-sm">FALSE: {details.statistics.falseCount}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent History */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                Recent History ({timeRange})
              </h3>
              <div className="bg-gray-50 rounded-lg max-h-64 overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Timestamp</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Value</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-700">Topic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.history.map((record, index) => (
                      <tr key={index} className="border-b border-gray-200 hover:bg-white">
                        <td className="px-3 py-2 text-xs">{formatTimestamp(record.timestamp)}</td>
                        <td className="px-3 py-2 font-medium">
                          {formatValue(record.value, record.valueBool)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-xs">{record.topic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {details.history.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No data in selected time range</div>
                )}
              </div>
            </div>

            {/* SQL Queries */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-orange-500" />
                SQL Queries
              </h3>
              <div className="space-y-3">
                {Object.entries(details.sqlQueries).map(([queryType, query]) => (
                  <div key={queryType} className="bg-gray-900 rounded-lg overflow-hidden">
                    <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300 capitalize">
                        {queryType.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <button
                        onClick={() => copyToClipboard(query, queryType)}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                      >
                        {copiedQuery === queryType ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copiedQuery === queryType ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3 text-sm text-gray-300 overflow-x-auto">
                      <code>{query}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-3 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Auto-refresh: 10s</span>
          {loading && <span className="text-orange-600">Refreshing...</span>}
        </div>
      </div>
    </div>
  );
}