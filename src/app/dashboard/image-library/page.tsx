'use client';

import Layout from '@/components/layout/Layout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ImageLibraryManager from '@/components/maintenance/ImageLibraryManager';
import { Camera } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function ImageLibraryPage() {
  return (
    <ProtectedRoute>
      <Layout
        title="Image Library"
        status={{
          message: 'Image Library System Active',
          isHealthy: true,
        }}
      >
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Camera className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Intelligent Image Library
              </h1>
              <p className="text-gray-600">
                Tag-based visual maintenance guidance system with PDF manual
                extraction
              </p>
            </div>
          </div>

          {/* Feature Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-2">
                Smart Image Selection
              </h3>
              <p className="text-orange-100">
                AI automatically selects relevant images based on machine type,
                issue, and procedure context
              </p>
            </div>
            <div className="bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-2">
                PDF Manual Extraction
              </h3>
              <p className="text-orange-100">
                Automatically extract and tag images from maintenance manuals
                with AI-powered categorization
              </p>
            </div>
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 text-white">
              <h3 className="font-semibold text-lg mb-2">
                Universal Asset Reuse
              </h3>
              <p className="text-orange-100">
                Tag-based system allows one image to be used across multiple
                machines and procedures
              </p>
            </div>
          </div>
        </div>

        {/* Image Library Manager */}
        <ImageLibraryManager
          allowUpload={true}
          allowManualExtraction={true}
          selectionMode={false}
        />
      </Layout>
    </ProtectedRoute>
  );
}
