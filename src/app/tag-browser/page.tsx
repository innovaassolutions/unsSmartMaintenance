'use client';

import { useState } from 'react';
import TagTree from '@/components/tag-browser/TagTree';
import TagDetailsPanel from '@/components/tag-browser/TagDetailsPanel';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export const dynamic = 'force-dynamic';

export default function TagBrowserPage() {
  const [selectedTag, setSelectedTag] = useState<{
    tagName: string;
    virtualPath: string;
  } | null>(null);

  const handleTagSelect = (tagName: string, virtualPath: string) => {
    setSelectedTag({ tagName, virtualPath });
  };

  return (
    <ProtectedRoute>
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                UNS Tag Browser
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Explore your Unified Namespace data with real-time values and
                detailed analytics
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Live Data</span>
            </div>
          </div>
        </div>

        {/* Main Content - Two Panel Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Tag Tree */}
          <div className="w-1/3 border-r bg-white">
            <TagTree onTagSelect={handleTagSelect} selectedTag={selectedTag} />
          </div>

          {/* Right Panel - Tag Details */}
          <div className="flex-1 bg-gray-50">
            <TagDetailsPanel selectedTag={selectedTag} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
