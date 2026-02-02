'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Search, Database, Factory, Building2, Cpu, Tag, Activity } from 'lucide-react';

interface TagNode {
  name: string;
  type: 'enterprise' | 'site' | 'area' | 'line' | 'workCell' | 'tag';
  children?: TagNode[];
  tagCount?: number;
  value?: number;
  valueBool?: boolean;
  lastUpdate?: string;
  topic?: string;
  count?: number;
  virtualPath?: string;
}

interface TagTreeProps {
  onTagSelect: (tagName: string, virtualPath: string) => void;
  selectedTag?: { tagName: string; virtualPath: string } | null;
}

export default function TagTree({ onTagSelect, selectedTag }: TagTreeProps) {
  const [treeData, setTreeData] = useState<TagNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredData, setFilteredData] = useState<TagNode[]>([]);

  useEffect(() => {
    fetchTreeData();
    const interval = setInterval(fetchTreeData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredData(filterTreeData(treeData, searchTerm));
    } else {
      setFilteredData(treeData);
    }
  }, [treeData, searchTerm]);

  const fetchTreeData = async () => {
    try {
      const response = await fetch('/api/tag-browser/tree');
      const result = await response.json();

      if (result.success) {
        setTreeData(result.tree);
        setError(null);

        // Auto-expand first level on initial load
        if (expandedNodes.size === 0 && result.tree.length > 0) {
          const newExpanded = new Set<string>();
          result.tree.forEach((node: TagNode) => {
            newExpanded.add(node.name);
            if (node.children) {
              node.children.forEach((child: TagNode) => {
                newExpanded.add(`${node.name}.${child.name}`);
              });
            }
          });
          setExpandedNodes(newExpanded);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch tree data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filterTreeData = (nodes: TagNode[], term: string): TagNode[] => {
    const filtered: TagNode[] = [];

    for (const node of nodes) {
      if (node.name.toLowerCase().includes(term.toLowerCase())) {
        filtered.push(node);
      } else if (node.children) {
        const filteredChildren = filterTreeData(node.children, term);
        if (filteredChildren.length > 0) {
          filtered.push({ ...node, children: filteredChildren });
        }
      }
    }

    return filtered;
  };

  const toggleNode = (nodePath: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodePath)) {
      newExpanded.delete(nodePath);
    } else {
      newExpanded.add(nodePath);
    }
    setExpandedNodes(newExpanded);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'enterprise': return <Building2 className="w-4 h-4 text-blue-600" />;
      case 'site': return <Factory className="w-4 h-4 text-green-600" />;
      case 'area': return <Database className="w-4 h-4 text-purple-600" />;
      case 'line': return <Activity className="w-4 h-4 text-orange-600" />;
      case 'workCell': return <Cpu className="w-4 h-4 text-red-600" />;
      case 'tag': return <Tag className="w-4 h-4 text-gray-600" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const formatValue = (node: TagNode) => {
    if (node.valueBool !== undefined) {
      return node.valueBool ? 'ON' : 'OFF';
    }
    if (node.value !== undefined) {
      return node.value.toFixed(2);
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

  const renderNode = (node: TagNode, path: string = '', level: number = 0) => {
    const nodePath = path ? `${path}.${node.name}` : node.name;
    const isExpanded = expandedNodes.has(nodePath);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedTag && node.type === 'tag' &&
                     selectedTag.tagName === node.name &&
                     selectedTag.virtualPath === node.virtualPath;

    return (
      <div key={nodePath} className="select-none">
        <div
          className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm
            ${isSelected ? 'bg-orange-50 border-l-4 border-orange-500' : ''}
            ${level > 0 ? `ml-${Math.min(level * 4, 16)}` : ''}`}
          onClick={() => {
            if (node.type === 'tag' && node.virtualPath) {
              onTagSelect(node.name, node.virtualPath);
            } else if (hasChildren) {
              toggleNode(nodePath);
            }
          }}
        >
          {hasChildren && (
            <button className="flex-shrink-0">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}

          {!hasChildren && <div className="w-4" />}

          <div className="flex-shrink-0">
            {getNodeIcon(node.type)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">{node.name}</span>
              {node.tagCount !== undefined && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                  {node.tagCount} tags
                </span>
              )}
            </div>

            {node.type === 'tag' && (
              <div className="text-xs text-gray-500 mt-1">
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-orange-600">
                    {formatValue(node)}
                  </span>
                  {node.lastUpdate && (
                    <span>{formatTimestamp(node.lastUpdate)}</span>
                  )}
                  {node.count && (
                    <span>{node.count.toLocaleString()} records</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child, nodePath, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2 text-orange-500" />
          <p className="text-sm text-gray-600">Loading UNS tree...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error loading tree</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchTreeData}
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
        <h2 className="font-semibold text-lg mb-3">UNS Tag Browser</h2>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto">
        {filteredData.length > 0 ? (
          <div className="py-2">
            {filteredData.map(node => renderNode(node))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            {searchTerm ? 'No tags found matching your search' : 'No data available'}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t p-3 bg-gray-50 text-xs text-gray-600">
        <div className="flex items-center justify-between">
          <span>Auto-refresh: 10s</span>
          <span>{filteredData.length} items</span>
        </div>
      </div>
    </div>
  );
}