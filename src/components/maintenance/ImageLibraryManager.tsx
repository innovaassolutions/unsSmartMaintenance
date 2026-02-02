'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileImage,
  Tag,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Shield,
  Wrench,
  Camera,
  FileText,
  Plus,
  X,
  AlertTriangle
} from 'lucide-react';
import { ImageAsset, ImageTags, ManualExtractionJob } from '@/lib/types/ImageLibrary';
import { ImageLibraryService } from '@/lib/services/ImageLibraryService';
import { ManualExtractionService } from '@/lib/services/ManualExtractionService';

interface ImageLibraryManagerProps {
  onImageSelect?: (image: ImageAsset) => void;
  selectionMode?: boolean;
  allowUpload?: boolean;
  allowManualExtraction?: boolean;
}

export default function ImageLibraryManager({
  onImageSelect,
  selectionMode = false,
  allowUpload = true,
  allowManualExtraction = true
}: ImageLibraryManagerProps) {
  const [images, setImages] = useState<ImageAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExtractionModal, setShowExtractionModal] = useState(false);
  const [showImageDetails, setShowImageDetails] = useState<ImageAsset | null>(null);
  const [showEditModal, setShowEditModal] = useState<ImageAsset | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<ImageAsset | null>(null);
  const [extractionJobs, setExtractionJobs] = useState<ManualExtractionJob[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
    loadExtractionJobs();
  }, []);

  const loadImages = async () => {
    setLoading(true);
    try {
      // Mock loading - in production, fetch from API
      const mockImages = ImageLibraryService['getMockImageLibrary']();
      setImages(mockImages);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExtractionJobs = () => {
    const jobs = ManualExtractionService.getCompletedJobs();
    setExtractionJobs(jobs);
  };

  // Filter images based on search and tags
  const filteredImages = images.filter(image => {
    const matchesSearch = searchTerm === '' || 
      image.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      image.tags.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || 
      image.tags.category === selectedCategory;

    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => 
        image.tags.machines.includes(tag) ||
        image.tags.components.includes(tag) ||
        image.tags.procedures.includes(tag)
      );

    return matchesSearch && matchesCategory && matchesTags;
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // For demo, show upload modal with tagging interface
    setShowUploadModal(true);
  };

  const handlePDFUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const pdfFile = files[0];
    setShowExtractionModal(true);

    // Start extraction job
    try {
      const jobId = await ManualExtractionService.processManual(
        pdfFile,
        'contact-welder', // Would be selected by user
        undefined,
        {
          extractDiagrams: true,
          extractPhotos: true,
          extractSchematics: true,
          autoTagging: true,
          duplicateDetection: true
        }
      );

      // Poll for job completion (in production, use websockets)
      const pollInterval = setInterval(() => {
        const job = ManualExtractionService.getJobStatus(jobId);
        if (job && job.status === 'completed') {
          clearInterval(pollInterval);
          loadExtractionJobs();
          setShowExtractionModal(false);
        }
      }, 2000);
    } catch (error) {
      console.error('Failed to start extraction:', error);
      setShowExtractionModal(false);
    }
  };

  const handleEditImage = async (image: ImageAsset, updatedTags: ImageTags) => {
    try {
      // In production, this would call API to update the image
      const updatedImage: ImageAsset = {
        ...image,
        tags: updatedTags,
        lastModified: new Date().toISOString(),
        version: `${parseFloat(image.version) + 0.1}.0`,
        approvalStatus: 'needs-review' // Reset approval status when edited
      };

      // Update local state
      setImages(prevImages => 
        prevImages.map(img => img.id === image.id ? updatedImage : img)
      );

      setShowEditModal(null);
      console.log('Image updated:', updatedImage);
    } catch (error) {
      console.error('Failed to update image:', error);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      // In production, this would call API to delete the image
      setImages(prevImages => prevImages.filter(img => img.id !== imageId));
      setShowDeleteConfirm(null);
      console.log('Image deleted:', imageId);
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      safety: Shield,
      procedure: Wrench,
      component: Camera,
      tool: Wrench,
      verification: CheckCircle,
      diagnostic: Search
    };
    const Icon = icons[category as keyof typeof icons] || FileImage;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      approved: 'text-green-600 bg-green-50',
      pending: 'text-yellow-600 bg-yellow-50',
      rejected: 'text-red-600 bg-red-50',
      'needs-review': 'text-blue-600 bg-blue-50'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Image Library</h2>
          <p className="text-gray-600 mt-1">
            {filteredImages.length} images • Tag-based intelligent system
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {allowUpload && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Upload Images</span>
            </button>
          )}

          {allowManualExtraction && (
            <button
              onClick={() => pdfInputRef.current?.click()}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <span>Extract from PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search images by filename, tags, or keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="safety">Safety</option>
            <option value="procedure">Procedure</option>
            <option value="component">Component</option>
            <option value="tool">Tools</option>
            <option value="verification">Verification</option>
            <option value="diagnostic">Diagnostic</option>
          </select>

          {/* Common Tags Quick Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Quick Tags:</span>
            {['contact-welder', 'electrodes', 'safety', 'replacement'].map(tag => (
              <button
                key={tag}
                onClick={() => {
                  if (selectedTags.includes(tag)) {
                    setSelectedTags(selectedTags.filter(t => t !== tag));
                  } else {
                    setSelectedTags([...selectedTags, tag]);
                  }
                }}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          // Loading skeletons
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200 rounded-lg mb-2"></div>
              <div className="h-4 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))
        ) : filteredImages.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <FileImage className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No images found matching your criteria</p>
          </div>
        ) : (
          filteredImages.map(image => (
            <div
              key={image.id}
              className={`group relative bg-white border rounded-lg overflow-hidden transition-all duration-200 ${
                selectionMode ? 'cursor-pointer hover:shadow-lg hover:scale-105' : 'hover:shadow-md'
              }`}
              onClick={() => selectionMode && onImageSelect?.(image)}
            >
              {/* Image */}
              <div className="aspect-square relative overflow-hidden bg-gray-100">
                <img
                  src={image.thumbnailUrl}
                  alt={image.filename}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                
                {/* Category Badge */}
                <div className="absolute top-2 left-2 flex items-center space-x-1 px-2 py-1 bg-white/90 rounded-full text-xs">
                  {getCategoryIcon(image.tags.category)}
                  <span className="capitalize">{image.tags.category}</span>
                </div>

                {/* Status Badge */}
                <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(image.approvalStatus)}`}>
                  {image.approvalStatus === 'approved' && <CheckCircle className="h-3 w-3 inline mr-1" />}
                  {image.approvalStatus === 'pending' && <Clock className="h-3 w-3 inline mr-1" />}
                  {image.approvalStatus === 'rejected' && <XCircle className="h-3 w-3 inline mr-1" />}
                  <span className="capitalize">{image.approvalStatus}</span>
                </div>

                {/* Safety Level Indicator */}
                {image.tags.safetyLevel && (
                  <div className={`absolute bottom-2 left-2 w-3 h-3 rounded-full ${
                    image.tags.safetyLevel === 'critical' ? 'bg-red-500' :
                    image.tags.safetyLevel === 'high' ? 'bg-orange-500' :
                    image.tags.safetyLevel === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} title={`Safety Level: ${image.tags.safetyLevel}`}>
                  </div>
                )}

                {/* Hover Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowImageDetails(image);
                    }}
                    className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  
                  {!selectionMode && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEditModal(image);
                        }}
                        className="p-2 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition-colors"
                        title="Edit Tags"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(image);
                        }}
                        className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                        title="Delete Image"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  
                  {selectionMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onImageSelect?.(image);
                      }}
                      className="p-2 bg-green-500 rounded-full text-white hover:bg-green-600 transition-colors"
                      title="Select Image"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Image Info */}
              <div className="p-3">
                <h4 className="font-medium text-gray-900 text-sm truncate mb-1">
                  {image.originalFilename}
                </h4>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>Usage: {image.usageCount}</span>
                  {image.effectivenessScore && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-400" />
                      <span>{(image.effectivenessScore * 5).toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {/* Tags Preview */}
                <div className="flex flex-wrap gap-1">
                  {image.tags.machines.slice(0, 2).map(machine => (
                    <span key={machine} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                      {machine}
                    </span>
                  ))}
                  {image.tags.components.slice(0, 1).map(component => (
                    <span key={component} className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      {component}
                    </span>
                  ))}
                  {(image.tags.machines.length + image.tags.components.length) > 3 && (
                    <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                      +{image.tags.machines.length + image.tags.components.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Extraction Jobs Status */}
      {extractionJobs.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent PDF Extractions</h3>
          <div className="space-y-3">
            {extractionJobs.slice(0, 3).map(job => (
              <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{job.pdfFile.name}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {job.extractedImages.length} images extracted
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handlePDFUpload}
      />

      {/* Image Details Modal */}
      {showImageDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Image Details</h3>
                <button
                  onClick={() => setShowImageDetails(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Image */}
                <div>
                  <img
                    src={showImageDetails.url}
                    alt={showImageDetails.filename}
                    className="w-full rounded-lg"
                  />
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Filename:</strong> {showImageDetails.originalFilename}</div>
                      <div><strong>Category:</strong> {showImageDetails.tags.category}</div>
                      <div><strong>Source:</strong> {showImageDetails.tags.source}</div>
                      <div><strong>Uploaded:</strong> {new Date(showImageDetails.uploadedAt).toLocaleDateString()}</div>
                      <div><strong>Usage Count:</strong> {showImageDetails.usageCount}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Tags</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Machines:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {showImageDetails.tags.machines.map(machine => (
                            <span key={machine} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {machine}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Components:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {showImageDetails.tags.components.map(component => (
                            <span key={component} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                              {component}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Procedures:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {showImageDetails.tags.procedures.map(procedure => (
                            <span key={procedure} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                              {procedure}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {showImageDetails.tags.keywords.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Keywords</h4>
                      <div className="flex flex-wrap gap-1">
                        {showImageDetails.tags.keywords.map(keyword => (
                          <span key={keyword} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Image Modal */}
      {showEditModal && (
        <EditImageModal 
          image={showEditModal}
          onSave={handleEditImage}
          onCancel={() => setShowEditModal(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Image</h3>
                  <p className="text-gray-600">This action cannot be undone.</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <img 
                    src={showDeleteConfirm.thumbnailUrl} 
                    alt={showDeleteConfirm.filename}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{showDeleteConfirm.originalFilename}</p>
                    <p className="text-sm text-gray-600">Used {showDeleteConfirm.usageCount} times</p>
                    <p className="text-sm text-gray-500">Category: {showDeleteConfirm.tags.category}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteImage(showDeleteConfirm.id)}
                  className="flex-1 px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Image Modal Component
interface EditImageModalProps {
  image: ImageAsset;
  onSave: (image: ImageAsset, updatedTags: ImageTags) => void;
  onCancel: () => void;
}

function EditImageModal({ image, onSave, onCancel }: EditImageModalProps) {
  const [editedTags, setEditedTags] = useState<ImageTags>(image.tags);
  const [newMachine, setNewMachine] = useState('');
  const [newComponent, setNewComponent] = useState('');
  const [newProcedure, setNewProcedure] = useState('');

  const handleSave = () => {
    onSave(image, editedTags);
  };

  const addTag = (type: 'machines' | 'components' | 'procedures', value: string) => {
    if (value.trim() && !editedTags[type].includes(value.trim())) {
      setEditedTags(prev => ({
        ...prev,
        [type]: [...prev[type], value.trim()]
      }));
    }
  };

  const removeTag = (type: 'machines' | 'components' | 'procedures', value: string) => {
    setEditedTags(prev => ({
      ...prev,
      [type]: prev[type].filter(tag => tag !== value)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl max-h-[90vh] overflow-auto w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Edit Image Tags</h3>
            <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div>
              <img src={image.url} alt={image.filename} className="w-full rounded-lg mb-4" />
              <div className="text-sm text-gray-600">
                <p><strong>Filename:</strong> {image.originalFilename}</p>
                <p><strong>Usage:</strong> {image.usageCount} times</p>
              </div>
            </div>

            {/* Tag Editor */}
            <div className="space-y-6">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={editedTags.category}
                  onChange={(e) => setEditedTags(prev => ({ ...prev, category: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="safety">Safety</option>
                  <option value="procedure">Procedure</option>
                  <option value="component">Component</option>
                  <option value="tool">Tool</option>
                  <option value="verification">Verification</option>
                  <option value="diagnostic">Diagnostic</option>
                </select>
              </div>

              {/* Safety Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Safety Level</label>
                <select
                  value={editedTags.safetyLevel}
                  onChange={(e) => setEditedTags(prev => ({ ...prev, safetyLevel: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Machines */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Machines</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editedTags.machines.map(machine => (
                    <span key={machine} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                      {machine}
                      <button
                        onClick={() => removeTag('machines', machine)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMachine}
                    onChange={(e) => setNewMachine(e.target.value)}
                    placeholder="Add machine type..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTag('machines', newMachine);
                        setNewMachine('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      addTag('machines', newMachine);
                      setNewMachine('');
                    }}
                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Components */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Components</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editedTags.components.map(component => (
                    <span key={component} className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                      {component}
                      <button
                        onClick={() => removeTag('components', component)}
                        className="ml-1 text-green-500 hover:text-green-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newComponent}
                    onChange={(e) => setNewComponent(e.target.value)}
                    placeholder="Add component..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTag('components', newComponent);
                        setNewComponent('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      addTag('components', newComponent);
                      setNewComponent('');
                    }}
                    className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Procedures */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Procedures</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editedTags.procedures.map(procedure => (
                    <span key={procedure} className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                      {procedure}
                      <button
                        onClick={() => removeTag('procedures', procedure)}
                        className="ml-1 text-purple-500 hover:text-purple-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newProcedure}
                    onChange={(e) => setNewProcedure(e.target.value)}
                    placeholder="Add procedure..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addTag('procedures', newProcedure);
                        setNewProcedure('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      addTag('procedures', newProcedure);
                      setNewProcedure('');
                    }}
                    className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={onCancel}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}