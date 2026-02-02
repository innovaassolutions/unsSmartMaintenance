// Tag-based Image Library Service with intelligent matching and manual extraction

import { 
  ImageAsset, 
  ImageTags, 
  MaintenanceContext, 
  ImageSearchCriteria, 
  ImageSearchResult,
  ExtractedImage,
  ManualExtractionJob
} from '@/lib/types/ImageLibrary';

export class ImageLibraryService {
  private static imageCache: Map<string, ImageAsset[]> = new Map();
  private static searchCache: Map<string, ImageSearchResult[]> = new Map();

  // Intelligent image selection based on maintenance context
  static async getRelevantImages(context: MaintenanceContext): Promise<ImageSearchResult[]> {
    const cacheKey = JSON.stringify(context);
    
    if (this.searchCache.has(cacheKey)) {
      return this.searchCache.get(cacheKey)!;
    }

    const searchCriteria: ImageSearchCriteria = {
      requiredTags: {
        machines: [context.machineType, 'universal']
      },
      context,
      maxResults: 20,
      minQualityScore: 0.6,
      approvedOnly: true,
      sortBy: 'relevance'
    };

    const results = await this.searchImages(searchCriteria);
    this.searchCache.set(cacheKey, results);
    
    return results;
  }

  // Advanced search with multi-criteria matching
  static async searchImages(criteria: ImageSearchCriteria): Promise<ImageSearchResult[]> {
    // In production, this would query your database
    const allImages = await this.getAllImages();
    
    const scoredResults = allImages
      .filter(image => this.matchesBasicCriteria(image, criteria))
      .map(image => this.scoreImageRelevance(image, criteria))
      .filter(result => result.relevanceScore >= (criteria.minQualityScore || 0))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, criteria.maxResults || 10);

    return scoredResults;
  }

  // Score image relevance based on context and criteria
  private static scoreImageRelevance(image: ImageAsset, criteria: ImageSearchCriteria): ImageSearchResult {
    let score = 0;
    const matchReasons: string[] = [];
    
    const { context, requiredTags, preferredTags } = criteria;

    // Machine compatibility scoring
    if (context?.machineType) {
      if (image.tags.machines.includes(context.machineType)) {
        score += 0.3;
        matchReasons.push(`Specific match for ${context.machineType}`);
      } else if (image.tags.machines.includes('universal')) {
        score += 0.15;
        matchReasons.push('Universal compatibility');
      }
    }

    // Component relevance scoring
    if (context?.componentType && image.tags.components.includes(context.componentType)) {
      score += 0.25;
      matchReasons.push(`Component-specific: ${context.componentType}`);
    }

    // Procedure type matching
    if (context?.procedureType && image.tags.procedures.includes(context.procedureType)) {
      score += 0.2;
      matchReasons.push(`Procedure match: ${context.procedureType}`);
    }

    // Safety priority boost
    if (image.tags.category === 'safety') {
      score += 0.15;
      matchReasons.push('Safety-critical content');
      
      // Extra boost for high-risk procedures
      if (context?.safetyRequirements.length && context.safetyRequirements.length > 2) {
        score += 0.1;
        matchReasons.push('High safety requirements procedure');
      }
    }

    // Skill level appropriateness
    if (context?.technicianSkillLevel) {
      const skillLevels = ['basic', 'intermediate', 'advanced', 'expert'];
      const contextLevel = skillLevels.indexOf(context.technicianSkillLevel);
      const imageLevel = skillLevels.indexOf(image.tags.skillLevel);
      
      if (Math.abs(contextLevel - imageLevel) <= 1) {
        score += 0.1;
        matchReasons.push(`Appropriate skill level: ${image.tags.skillLevel}`);
      }
    }

    // Quality and usage boost
    if (image.tags.qualityScore) {
      score += image.tags.qualityScore * 0.1;
    }
    
    if (image.usageCount > 10) {
      score += 0.05;
      matchReasons.push('Frequently used image');
    }

    // Effectiveness boost based on user ratings
    if (image.effectivenessScore && image.effectivenessScore > 0.8) {
      score += 0.05;
      matchReasons.push('Highly rated by users');
    }

    // Urgency-based prioritization
    if (context?.urgency === 'critical' && image.tags.category === 'safety') {
      score += 0.1;
      matchReasons.push('Critical safety priority');
    }

    const suggestedUseCase = this.generateUseCase(image, context);

    return {
      image,
      relevanceScore: Math.min(score, 1.0), // Cap at 1.0
      matchReasons,
      suggestedUseCase
    };
  }

  // Generate contextual use case description
  private static generateUseCase(image: ImageAsset, context?: MaintenanceContext): string {
    const category = image.tags.category;
    const procedure = context?.procedureType || 'maintenance';
    
    const useCaseTemplates = {
      safety: `Use for safety preparation during ${procedure}`,
      component: `Reference for component identification and assessment`,
      procedure: `Step-by-step guidance for ${procedure} procedure`,
      tool: `Tool setup and preparation reference`,
      verification: `Post-${procedure} verification and testing`,
      diagnostic: `Troubleshooting and diagnostic guidance`
    };

    return useCaseTemplates[category] || 'General maintenance reference';
  }

  // Basic criteria filtering
  private static matchesBasicCriteria(image: ImageAsset, criteria: ImageSearchCriteria): boolean {
    const { requiredTags, approvedOnly, minQualityScore } = criteria;

    // Approval status check
    if (approvedOnly && image.approvalStatus !== 'approved') {
      return false;
    }

    // Quality threshold check
    if (minQualityScore && image.tags.qualityScore && image.tags.qualityScore < minQualityScore) {
      return false;
    }

    // Required tags validation
    if (requiredTags) {
      if (requiredTags.category && image.tags.category !== requiredTags.category) {
        return false;
      }
      
      if (requiredTags.machines && !requiredTags.machines.some(m => image.tags.machines.includes(m))) {
        return false;
      }
      
      if (requiredTags.safetyLevel && image.tags.safetyLevel !== requiredTags.safetyLevel) {
        return false;
      }
    }

    return true;
  }

  // Get images by category with smart ordering
  static async getImagesByCategory(category: string, context?: MaintenanceContext): Promise<ImageSearchResult[]> {
    const criteria: ImageSearchCriteria = {
      requiredTags: { category: category as any },
      context,
      maxResults: 50,
      approvedOnly: true,
      sortBy: 'relevance'
    };

    return this.searchImages(criteria);
  }

  // Get priority-ordered images (safety first, then by relevance)
  static async getPriorityOrderedImages(context: MaintenanceContext): Promise<ImageSearchResult[]> {
    const allRelevant = await this.getRelevantImages(context);
    
    return allRelevant.sort((a, b) => {
      // Safety images always first
      if (a.image.tags.category === 'safety' && b.image.tags.category !== 'safety') {
        return -1;
      }
      if (b.image.tags.category === 'safety' && a.image.tags.category !== 'safety') {
        return 1;
      }
      
      // Then by safety level within safety category
      if (a.image.tags.category === 'safety' && b.image.tags.category === 'safety') {
        const safetyOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
        const aLevel = safetyOrder[a.image.tags.safetyLevel] || 0;
        const bLevel = safetyOrder[b.image.tags.safetyLevel] || 0;
        
        if (aLevel !== bLevel) {
          return bLevel - aLevel; // Higher safety level first
        }
      }
      
      // Finally by relevance score
      return b.relevanceScore - a.relevanceScore;
    });
  }

  // Upload and tag new image
  static async uploadImage(
    file: File, 
    tags: ImageTags, 
    uploadedBy: string
  ): Promise<ImageAsset> {
    // In production, this would upload to your storage service
    const imageAsset: ImageAsset = {
      id: this.generateId(),
      filename: `img_${Date.now()}_${file.name}`,
      originalFilename: file.name,
      url: URL.createObjectURL(file), // Temporary URL for demo
      thumbnailUrl: URL.createObjectURL(file), // Would generate thumbnail in production
      fileSize: file.size,
      dimensions: await this.getImageDimensions(file),
      tags,
      uploadedBy,
      uploadedAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      approvalStatus: 'pending',
      usageCount: 0,
      version: '1.0'
    };

    // Store in mock database (in production, save to database)
    await this.saveImage(imageAsset);
    
    return imageAsset;
  }

  // Auto-suggest tags based on filename and context
  static suggestTagsFromContext(filename: string, machineType?: string, sourceDocument?: string): Partial<ImageTags> {
    const suggestions: Partial<ImageTags> = {
      machines: [],
      components: [],
      procedures: [],
      keywords: [],
      hazardTypes: []
    };

    const lowerFilename = filename.toLowerCase();

    // Machine type suggestions
    if (machineType) {
      suggestions.machines = [machineType];
    }

    // Component suggestions based on filename
    const componentKeywords = {
      'electrode': ['electrodes'],
      'bearing': ['bearings'],
      'seal': ['hydraulic-seals'],
      'motor': ['motors'],
      'pump': ['hydraulic-pumps'],
      'valve': ['valves']
    };

    // Procedure suggestions
    const procedureKeywords = {
      'replace': ['replacement'],
      'install': ['installation'],
      'calibrat': ['calibration'],
      'inspect': ['inspection'],
      'test': ['testing'],
      'repair': ['repair']
    };

    // Safety category detection
    const safetyKeywords = ['safety', 'ppe', 'lockout', 'tagout', 'hazard', 'warning'];
    if (safetyKeywords.some(keyword => lowerFilename.includes(keyword))) {
      suggestions.category = 'safety';
      suggestions.safetyLevel = 'high';
    }

    // Apply keyword matching
    Object.entries(componentKeywords).forEach(([keyword, components]) => {
      if (lowerFilename.includes(keyword)) {
        suggestions.components = [...(suggestions.components || []), ...components];
      }
    });

    Object.entries(procedureKeywords).forEach(([keyword, procedures]) => {
      if (lowerFilename.includes(keyword)) {
        suggestions.procedures = [...(suggestions.procedures || []), ...procedures];
      }
    });

    return suggestions;
  }

  // Helper methods
  private static async getAllImages(): Promise<ImageAsset[]> {
    // Mock data for demo - in production, fetch from database
    return this.getMockImageLibrary();
  }

  private static async saveImage(image: ImageAsset): Promise<void> {
    // Mock save - in production, save to database
    console.log('Saving image:', image.id);
  }

  private static async getImageDimensions(file: File): Promise<{width: number, height: number}> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.src = URL.createObjectURL(file);
    });
  }

  private static generateId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Mock image library for demo
  private static getMockImageLibrary(): ImageAsset[] {
    return [
      {
        id: 'safety_lockout_001',
        filename: 'lockout_tagout_electrical.jpg',
        originalFilename: 'lockout_tagout_electrical.jpg',
        url: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=400&h=300&fit=crop&crop=center',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=200&h=150&fit=crop&crop=center',
        fileSize: 125000,
        dimensions: { width: 400, height: 300 },
        tags: {
          category: 'safety',
          machines: ['contact-welder', 'coil-winder', 'assembly-press', 'universal'],
          components: ['electrical-systems'],
          procedures: ['maintenance', 'repair', 'calibration', 'replacement'],
          safetyLevel: 'critical',
          hazardTypes: ['electrical'],
          stepTypes: ['preparation'],
          skillLevel: 'basic',
          source: 'manual',
          sourceDocument: 'Universal_Safety_Manual_v3.pdf',
          keywords: ['lockout', 'tagout', 'power-isolation', 'safety-switch'],
          qualityScore: 0.95,
          contextRelevance: 0.9
        },
        uploadedBy: 'safety_admin',
        uploadedAt: '2024-01-01T00:00:00Z',
        lastModified: '2024-01-01T00:00:00Z',
        approvalStatus: 'approved',
        approvedBy: 'safety_manager',
        approvedAt: '2024-01-01T01:00:00Z',
        usageCount: 245,
        lastUsed: '2024-01-12T08:30:00Z',
        effectivenessScore: 0.92,
        version: '1.0'
      },
      {
        id: 'component_electrode_001',
        filename: 'electrode_wear_comparison.jpg',
        originalFilename: 'electrode_wear_comparison.jpg',
        url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&crop=center',
        thumbnailUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=150&fit=crop&crop=center',
        fileSize: 89000,
        dimensions: { width: 400, height: 300 },
        tags: {
          category: 'component',
          machines: ['contact-welder', 'spot-welder'],
          components: ['electrodes'],
          procedures: ['inspection', 'replacement', 'troubleshooting'],
          safetyLevel: 'medium',
          hazardTypes: ['electrical'],
          stepTypes: ['diagnostic', 'assessment'],
          skillLevel: 'intermediate',
          source: 'manual',
          sourceDocument: 'Fanuc_ContactWelder_Manual_v2.pdf',
          keywords: ['electrode', 'wear', 'degradation', 'replacement-criteria'],
          qualityScore: 0.88,
          contextRelevance: 0.95
        },
        uploadedBy: 'maintenance_tech',
        uploadedAt: '2024-01-02T00:00:00Z',
        lastModified: '2024-01-02T00:00:00Z',
        approvalStatus: 'approved',
        approvedBy: 'technical_lead',
        approvedAt: '2024-01-02T02:00:00Z',
        usageCount: 67,
        lastUsed: '2024-01-11T14:20:00Z',
        effectivenessScore: 0.89,
        version: '1.0'
      },
      {
        id: 'safety_ppe_001',
        filename: 'ppe_requirements_electrical_work.jpg',
        originalFilename: 'ppe_requirements_electrical_work.jpg',
        url: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=400&h=300&fit=crop&crop=center',
        thumbnailUrl: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=200&h=150&fit=crop&crop=center',
        fileSize: 156000,
        dimensions: { width: 400, height: 300 },
        tags: {
          category: 'safety',
          machines: ['universal'],
          components: ['ppe-equipment'],
          procedures: ['preparation', 'electrical-work'],
          safetyLevel: 'critical',
          hazardTypes: ['electrical', 'arc-flash'],
          stepTypes: ['preparation'],
          skillLevel: 'basic',
          source: 'manual',
          sourceDocument: 'Electrical_Safety_Standards_v4.pdf',
          keywords: ['ppe', 'personal-protective-equipment', 'electrical-safety', 'arc-flash'],
          qualityScore: 0.92,
          contextRelevance: 0.88
        },
        uploadedBy: 'safety_admin',
        uploadedAt: '2024-01-03T00:00:00Z',
        lastModified: '2024-01-03T00:00:00Z',
        approvalStatus: 'approved',
        approvedBy: 'safety_manager',
        approvedAt: '2024-01-03T01:30:00Z',
        usageCount: 189,
        lastUsed: '2024-01-10T16:45:00Z',
        effectivenessScore: 0.91,
        version: '1.0'
      },
      {
        id: 'component_bearing_001',
        filename: 'bearing_wear_indicators.jpg',
        originalFilename: 'bearing_wear_indicators.jpg',
        url: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=400&h=300&fit=crop&crop=center',
        thumbnailUrl: 'https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=200&h=150&fit=crop&crop=center',
        fileSize: 134000,
        dimensions: { width: 400, height: 300 },
        tags: {
          category: 'component',
          machines: ['cnc-mill', 'lathe', 'grinder', 'universal'],
          components: ['bearings', 'rotating-equipment'],
          procedures: ['inspection', 'replacement', 'troubleshooting'],
          safetyLevel: 'medium',
          hazardTypes: ['mechanical'],
          stepTypes: ['diagnostic', 'assessment'],
          skillLevel: 'intermediate',
          source: 'field-capture',
          sourceDocument: 'Bearing_Maintenance_Guide_v2.pdf',
          keywords: ['bearing', 'wear', 'vibration', 'failure-analysis'],
          qualityScore: 0.85,
          contextRelevance: 0.93
        },
        uploadedBy: 'maintenance_tech',
        uploadedAt: '2024-01-04T00:00:00Z',
        lastModified: '2024-01-04T00:00:00Z',
        approvalStatus: 'approved',
        approvedBy: 'technical_lead',
        approvedAt: '2024-01-04T03:15:00Z',
        usageCount: 78,
        lastUsed: '2024-01-09T11:20:00Z',
        effectivenessScore: 0.86,
        version: '1.0'
      },
      {
        id: 'procedure_lubrication_001',
        filename: 'lubrication_points_cnc_mill.jpg',
        originalFilename: 'lubrication_points_cnc_mill.jpg',
        url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=400&h=300&fit=crop&crop=center',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=200&h=150&fit=crop&crop=center',
        fileSize: 167000,
        dimensions: { width: 400, height: 300 },
        tags: {
          category: 'procedure',
          machines: ['cnc-mill', 'cnc-lathe'],
          components: ['lubrication-system', 'guide-ways'],
          procedures: ['preventive-maintenance', 'lubrication'],
          safetyLevel: 'low',
          hazardTypes: ['chemical'],
          stepTypes: ['maintenance'],
          skillLevel: 'basic',
          source: 'manual',
          sourceDocument: 'Haas_CNC_Maintenance_Manual_v3.pdf',
          keywords: ['lubrication', 'grease-points', 'preventive-maintenance', 'guide-ways'],
          qualityScore: 0.91,
          contextRelevance: 0.89
        },
        uploadedBy: 'maintenance_tech',
        uploadedAt: '2024-01-05T00:00:00Z',
        lastModified: '2024-01-05T00:00:00Z',
        approvalStatus: 'approved',
        approvedBy: 'maintenance_supervisor',
        approvedAt: '2024-01-05T02:45:00Z',
        usageCount: 124,
        lastUsed: '2024-01-11T09:30:00Z',
        effectivenessScore: 0.88,
        version: '1.0'
      },
      {
        id: 'diagnostic_multimeter_001',
        filename: 'multimeter_electrical_testing.jpg',
        originalFilename: 'multimeter_electrical_testing.jpg',
        url: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&h=300&fit=crop&crop=center',
        thumbnailUrl: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=200&h=150&fit=crop&crop=center',
        fileSize: 112000,
        dimensions: { width: 400, height: 300 },
        tags: {
          category: 'diagnostic',
          machines: ['universal'],
          components: ['electrical-systems', 'control-panels'],
          procedures: ['troubleshooting', 'testing', 'calibration'],
          safetyLevel: 'high',
          hazardTypes: ['electrical'],
          stepTypes: ['diagnostic', 'testing'],
          skillLevel: 'intermediate',
          source: 'manual',
          sourceDocument: 'Electrical_Diagnostics_Training_v1.pdf',
          keywords: ['multimeter', 'voltage-testing', 'electrical-diagnostics', 'troubleshooting'],
          qualityScore: 0.87,
          contextRelevance: 0.84
        },
        uploadedBy: 'electrical_tech',
        uploadedAt: '2024-01-06T00:00:00Z',
        lastModified: '2024-01-06T00:00:00Z',
        approvalStatus: 'approved',
        approvedBy: 'electrical_supervisor',
        approvedAt: '2024-01-06T01:20:00Z',
        usageCount: 156,
        lastUsed: '2024-01-12T14:15:00Z',
        effectivenessScore: 0.85,
        version: '1.0'
      },
      {
        id: 'tool_calibration_001',
        filename: 'precision_measurement_tools.jpg',
        originalFilename: 'precision_measurement_tools.jpg',
        url: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400&h=300&fit=crop&crop=center',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=200&h=150&fit=crop&crop=center',
        fileSize: 145000,
        dimensions: { width: 400, height: 300 },
        tags: {
          category: 'tool',
          machines: ['cnc-mill', 'cnc-lathe', 'grinder'],
          components: ['measurement-tools', 'precision-instruments'],
          procedures: ['calibration', 'verification', 'setup'],
          safetyLevel: 'low',
          hazardTypes: [],
          stepTypes: ['setup', 'calibration'],
          skillLevel: 'advanced',
          source: 'manual',
          sourceDocument: 'Precision_Measurement_Guide_v2.pdf',
          keywords: ['calipers', 'micrometers', 'precision', 'measurement', 'calibration'],
          qualityScore: 0.93,
          contextRelevance: 0.87
        },
        uploadedBy: 'quality_tech',
        uploadedAt: '2024-01-07T00:00:00Z',
        lastModified: '2024-01-07T00:00:00Z',
        approvalStatus: 'approved',
        approvedBy: 'quality_manager',
        approvedAt: '2024-01-07T04:10:00Z',
        usageCount: 92,
        lastUsed: '2024-01-10T13:45:00Z',
        effectivenessScore: 0.90,
        version: '1.0'
      },
      {
        id: 'safety_emergency_001',
        filename: 'emergency_shutdown_procedures.jpg',
        originalFilename: 'emergency_shutdown_procedures.jpg',
        url: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=300&fit=crop&crop=center',
        thumbnailUrl: 'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=200&h=150&fit=crop&crop=center',
        fileSize: 178000,
        dimensions: { width: 400, height: 300 },
        tags: {
          category: 'safety',
          machines: ['universal'],
          components: ['emergency-systems', 'control-panels'],
          procedures: ['emergency-response', 'shutdown'],
          safetyLevel: 'critical',
          hazardTypes: ['mechanical', 'electrical', 'hydraulic'],
          stepTypes: ['emergency'],
          skillLevel: 'basic',
          source: 'manual',
          sourceDocument: 'Emergency_Response_Procedures_v5.pdf',
          keywords: ['emergency-stop', 'shutdown', 'safety-procedures', 'emergency-response'],
          qualityScore: 0.96,
          contextRelevance: 0.94
        },
        uploadedBy: 'safety_admin',
        uploadedAt: '2024-01-08T00:00:00Z',
        lastModified: '2024-01-08T00:00:00Z',
        approvalStatus: 'approved',
        approvedBy: 'safety_director',
        approvedAt: '2024-01-08T01:00:00Z',
        usageCount: 203,
        lastUsed: '2024-01-12T15:30:00Z',
        effectivenessScore: 0.95,
        version: '1.0'
      }
    ];
  }
}