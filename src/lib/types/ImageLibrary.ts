// Core types for the flexible tag-based image library system

export interface ImageTags {
  // Core categorization
  category: 'safety' | 'procedure' | 'component' | 'tool' | 'verification' | 'diagnostic';
  
  // Machine compatibility (supports multiple machines per image)
  machines: string[];  // ['contact-welder', 'spot-welder', 'universal']
  
  // Component universality - one image can apply to multiple components
  components: string[]; // ['electrodes', 'bearings', 'hydraulic-seals', 'motors']
  
  // Process applicability - procedures this image supports
  procedures: string[]; // ['replacement', 'calibration', 'inspection', 'troubleshooting']
  
  // Safety classifications
  safetyLevel: 'low' | 'medium' | 'high' | 'critical';
  hazardTypes: string[]; // ['electrical', 'hydraulic', 'mechanical', 'thermal', 'chemical']
  
  // Contextual metadata
  stepTypes: string[];  // ['preparation', 'disassembly', 'installation', 'testing', 'cleanup']
  skillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  
  // Source tracking for traceability
  source: 'manual' | 'photo' | 'diagram' | 'ai-generated' | 'field-capture';
  sourceDocument?: string; // 'Fanuc_Manual_v2.3.pdf' or 'Field_Photo_2024'
  
  // Content descriptors for AI matching
  keywords: string[]; // ['lockout', 'tagout', 'power-isolation', 'multimeter']
  
  // Quality and relevance metrics
  qualityScore?: number; // 0-1 based on image clarity, relevance
  contextRelevance?: number; // 0-1 how well it matches typical use cases
}

export interface ImageAsset {
  id: string;
  filename: string;
  originalFilename: string;
  url: string;
  thumbnailUrl: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  
  // Flexible tagging system
  tags: ImageTags;
  
  // Metadata and tracking
  uploadedBy: string;
  uploadedAt: string;
  lastModified: string;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'needs-review';
  approvedBy?: string;
  approvedAt?: string;
  
  // Usage analytics
  usageCount: number;
  lastUsed?: string;
  effectivenessScore?: number; // Based on user feedback
  
  // Version control
  version: string;
  previousVersions?: string[]; // IDs of previous versions
  
  // AI enhancement data
  aiSuggestedTags?: Partial<ImageTags>;
  aiConfidenceScore?: number;
  
  // User feedback
  userRatings?: {
    userId: string;
    rating: number; // 1-5 stars
    feedback?: string;
    timestamp: string;
  }[];
}

export interface MaintenanceContext {
  machineType: string;
  machineModel?: string;
  issueType: string;
  procedureType: string;
  componentType?: string;
  safetyRequirements: string[];
  technicianSkillLevel: 'basic' | 'intermediate' | 'advanced' | 'expert';
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface ImageSearchCriteria {
  // Required matches
  requiredTags?: Partial<ImageTags>;
  
  // Preferred matches (boost relevance score)
  preferredTags?: Partial<ImageTags>;
  
  // Context for intelligent matching
  context?: MaintenanceContext;
  
  // Result preferences
  maxResults?: number;
  minQualityScore?: number;
  approvedOnly?: boolean;
  
  // Sorting preferences
  sortBy?: 'relevance' | 'quality' | 'usage' | 'date' | 'effectiveness';
  sortOrder?: 'asc' | 'desc';
}

export interface ImageSearchResult {
  image: ImageAsset;
  relevanceScore: number;
  matchReasons: string[]; // Explanations for why this image was selected
  suggestedUseCase: string;
}

export interface ExtractedImage {
  imageBuffer: Buffer;
  suggestedFilename: string;
  extractionContext: {
    sourceDocument: string;
    pageNumber: number;
    figureNumber?: string;
    captionText?: string;
    surroundingText?: string[];
  };
  suggestedTags: Partial<ImageTags>;
  confidenceScore: number;
}

export interface ManualExtractionJob {
  id: string;
  pdfFile: File;
  machineType: string;
  machineModel?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  startedAt: string;
  completedAt?: string;
  extractedImages: ExtractedImage[];
  error?: string;
  
  // Processing options
  options: {
    extractDiagrams: boolean;
    extractPhotos: boolean;
    extractSchematics: boolean;
    minImageSize: number; // pixels
    autoTagging: boolean;
    duplicateDetection: boolean;
  };
}