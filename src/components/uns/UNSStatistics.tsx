'use client';

import { useState, useEffect } from 'react';
import { Database, TrendingUp, Clock, HardDrive } from 'lucide-react';

interface Statistics {
  total_records: string;
  unique_tags: string;
  virtual_paths: string;
  earliest_record: string;
  latest_record: string;
  table_size: string;
}

interface TagCount {
  virtual_path: string;
  tag_name: string;
  record_count: string;
  last_update: string;
}

export default function UNSStatistics() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [tagCounts, setTagCounts] = useState<TagCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/uns/statistics');
      const result = await response.json();

      if (result.success) {
        setStatistics(result.statistics);
        setTagCounts(result.tagCounts);
      }
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !statistics) {
    return <div>Loading statistics...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Database className="w-4 h-4" />
            <span className="text-sm">Total Records</span>
          </div>
          <div className="text-2xl font-bold">
            {parseInt(statistics.total_records).toLocaleString()}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Unique Tags</span>
          </div>
          <div className="text-2xl font-bold">{statistics.unique_tags}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Virtual Paths</span>
          </div>
          <div className="text-2xl font-bold">{statistics.virtual_paths}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <HardDrive className="w-4 h-4" />
            <span className="text-sm">Table Size</span>
          </div>
          <div className="text-2xl font-bold">{statistics.table_size}</div>
        </div>
      </div>

      {/* Tag Counts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold">Tag Statistics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Virtual Path
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tag Name
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Records
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tagCounts.map((tag, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">{tag.virtual_path}</td>
                  <td className="px-6 py-4 text-sm font-medium">{tag.tag_name}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    {parseInt(tag.record_count).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-right text-gray-600">
                    {new Date(tag.last_update).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}