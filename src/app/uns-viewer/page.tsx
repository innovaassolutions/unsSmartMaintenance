'use client';

import { useState } from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import UNSTreeNavigation from '@/components/uns/UNSTreeNavigation';
import UNSDetailsPanel from '@/components/uns/UNSDetailsPanel';

export const dynamic = 'force-dynamic';

export interface SelectedTag {
  tagName: string;
  virtualPath: string;
  machineId: string;
  location: string;
  topic: string;
}

export default function UNSViewerPage() {
  const [selectedTag, setSelectedTag] = useState<SelectedTag | null>(null);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  const handleTagSelect = (tag: SelectedTag) => {
    setSelectedTag(tag);
  };

  const handleMachineSelect = (machineId: string) => {
    setSelectedMachine(machineId);
    setSelectedTag(null); // Clear tag selection when machine changes
  };

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Unified Namespace Viewer
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Real-time industrial data organized by ISA-95 hierarchy from
                TimescaleDB
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span>Live Data • Auto-refresh 10s</span>
            </div>
          </div>
        </div>

        {/* Main Content - Two Panel Layout matching UMH standards */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - UNS Tree Navigation */}
          <div className="w-1/3 border-r bg-white overflow-hidden">
            <UNSTreeNavigation
              onTagSelect={handleTagSelect}
              onMachineSelect={handleMachineSelect}
              selectedTag={selectedTag}
              selectedMachine={selectedMachine}
            />
          </div>

          {/* Right Panel - Details Panel */}
          <div className="flex-1 bg-gray-50 overflow-hidden">
            <UNSDetailsPanel
              selectedTag={selectedTag}
              selectedMachine={selectedMachine}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
