// Manual Extraction Service for processing maintenance manuals and extracting images

import { 
  ExtractedImage, 
  ManualExtractionJob, 
  ImageTags 
} from '@/lib/types/ImageLibrary';

export class ManualExtractionService {
  private static processingJobs: Map<string, ManualExtractionJob> = new Map();
  
  // Main entry point for manual processing
  static async processManual(
    pdfFile: File, 
    machineType: string, 
    machineModel?: string,
    options?: Partial<ManualExtractionJob['options']>
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: ManualExtractionJob = {
      id: jobId,
      pdfFile,
      machineType,
      machineModel,
      status: 'queued',
      progress: 0,
      startedAt: new Date().toISOString(),
      extractedImages: [],
      options: {
        extractDiagrams: true,
        extractPhotos: true,
        extractSchematics: true,
        minImageSize: 100, // minimum 100x100 pixels
        autoTagging: true,
        duplicateDetection: true,
        ...options
      }
    };

    this.processingJobs.set(jobId, job);
    
    // Start async processing
    this.processJobAsync(job);
    
    return jobId;
  }

  // Get job status and progress
  static getJobStatus(jobId: string): ManualExtractionJob | null {
    return this.processingJobs.get(jobId) || null;
  }

  // Async processing pipeline
  private static async processJobAsync(job: ManualExtractionJob): Promise<void> {
    try {
      job.status = 'processing';
      job.progress = 10;
      this.updateJob(job);

      // Step 1: Extract images from PDF
      const rawImages = await this.extractImagesFromPDF(job.pdfFile);
      job.progress = 40;
      this.updateJob(job);

      // Step 2: Filter by size and type
      const filteredImages = this.filterImagesByOptions(rawImages, job.options);
      job.progress = 60;
      this.updateJob(job);

      // Step 3: Auto-tag images
      const taggedImages = await this.autoTagImages(
        filteredImages, 
        job.machineType, 
        job.machineModel,
        job.pdfFile.name
      );
      job.progress = 80;
      this.updateJob(job);

      // Step 4: Remove duplicates
      const uniqueImages = job.options.duplicateDetection 
        ? await this.removeDuplicates(taggedImages)
        : taggedImages;
      
      job.extractedImages = uniqueImages;
      job.progress = 100;
      job.status = 'completed';
      job.completedAt = new Date().toISOString();
      
      this.updateJob(job);
      
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      this.updateJob(job);
    }
  }

  // Extract images from PDF (mock implementation)
  private static async extractImagesFromPDF(pdfFile: File): Promise<ExtractedImage[]> {
    // Mock extraction - in production, use libraries like pdf2pic, pdf-lib, or pdf.js
    const mockImages: ExtractedImage[] = [];
    
    // Simulate different types of extracted content
    const extractionTypes = [
      {
        type: 'safety-diagram',
        caption: 'Figure 3.1: Lockout/Tagout Procedure',
        page: 15,
        confidence: 0.92
      },
      {
        type: 'component-photo',
        caption: 'Figure 5.2: Electrode Assembly Components',
        page: 34,
        confidence: 0.88
      },
      {
        type: 'procedure-steps',
        caption: 'Figure 7.1: Step-by-Step Replacement Process',
        page: 52,
        confidence: 0.85
      },
      {
        type: 'schematic',
        caption: 'Figure 2.3: Electrical Wiring Schematic',
        page: 12,
        confidence: 0.79
      },
      {
        type: 'troubleshooting',
        caption: 'Figure 9.1: Common Failure Modes',
        page: 67,
        confidence: 0.82
      }
    ];

    for (const extraction of extractionTypes) {
      // Generate mock image buffer (in production, extract actual image)
      const imageBuffer = Buffer.from('mock-image-data');
      
      const extracted: ExtractedImage = {
        imageBuffer,
        suggestedFilename: `${extraction.type}_page${extraction.page}_${pdfFile.name.replace('.pdf', '')}.jpg`,
        extractionContext: {
          sourceDocument: pdfFile.name,
          pageNumber: extraction.page,
          figureNumber: extraction.caption.match(/Figure (\d+\.\d+)/)?.[1],
          captionText: extraction.caption,
          surroundingText: this.generateSurroundingText(extraction.type)
        },
        suggestedTags: this.generateTagsFromExtraction(extraction.type, extraction.caption),
        confidenceScore: extraction.confidence
      };

      mockImages.push(extracted);
    }

    return mockImages;
  }

  // Filter images based on processing options
  private static filterImagesByOptions(
    images: ExtractedImage[], 
    options: ManualExtractionJob['options']
  ): ExtractedImage[] {
    return images.filter(image => {
      // Size filtering would be done here in production
      // For now, simulate filtering based on content type
      const isSchematic = image.suggestedFilename.includes('schematic');
      const isDiagram = image.suggestedFilename.includes('diagram');
      const isPhoto = image.suggestedFilename.includes('photo');

      if (!options.extractSchematics && isSchematic) return false;
      if (!options.extractDiagrams && isDiagram) return false;
      if (!options.extractPhotos && isPhoto) return false;

      return true;
    });
  }

  // AI-powered auto-tagging based on extraction context
  private static async autoTagImages(
    images: ExtractedImage[], 
    machineType: string, 
    machineModel?: string,
    sourceDocument?: string
  ): Promise<ExtractedImage[]> {
    return images.map(image => {
      const enhancedTags = this.enhanceTagsWithAI(
        image.suggestedTags, 
        image.extractionContext,
        machineType,
        machineModel
      );
      
      return {
        ...image,
        suggestedTags: enhancedTags
      };
    });
  }

  // Enhanced AI tagging logic
  private static enhanceTagsWithAI(
    baseTags: Partial<ImageTags>,
    context: ExtractedImage['extractionContext'],
    machineType: string,
    machineModel?: string
  ): Partial<ImageTags> {
    const enhanced: Partial<ImageTags> = { ...baseTags };
    
    // Machine context
    enhanced.machines = [machineType];
    if (machineModel) {
      enhanced.machines.push(machineModel);
    }
    
    // Source tracking
    enhanced.source = 'manual';
    enhanced.sourceDocument = context.sourceDocument;
    
    // Content analysis based on caption and surrounding text
    const allText = [
      context.captionText,
      ...(context.surroundingText || [])
    ].join(' ').toLowerCase();

    // Safety detection
    const safetyIndicators = ['safety', 'warning', 'caution', 'danger', 'lockout', 'ppe', 'hazard'];
    if (safetyIndicators.some(indicator => allText.includes(indicator))) {
      enhanced.category = 'safety';
      enhanced.safetyLevel = 'high';
      enhanced.hazardTypes = this.detectHazardTypes(allText);
    }

    // Component detection
    enhanced.components = this.detectComponents(allText);
    
    // Procedure detection
    enhanced.procedures = this.detectProcedures(allText);
    
    // Step type detection
    enhanced.stepTypes = this.detectStepTypes(allText);
    
    // Skill level assessment
    enhanced.skillLevel = this.assessSkillLevel(allText, context.figureNumber);
    
    // Keywords extraction
    enhanced.keywords = this.extractKeywords(allText);

    return enhanced;
  }

  // Detect hazard types from text content
  private static detectHazardTypes(text: string): string[] {
    const hazardMap = {
      electrical: ['electrical', 'voltage', 'current', 'shock', 'arc', 'power'],
      hydraulic: ['hydraulic', 'pressure', 'fluid', 'leak', 'pump'],
      mechanical: ['mechanical', 'moving', 'crushing', 'pinch', 'rotation'],
      thermal: ['hot', 'heat', 'temperature', 'burn', 'cooling'],
      chemical: ['chemical', 'fluid', 'oil', 'solvent', 'toxic']
    };

    const detected: string[] = [];
    Object.entries(hazardMap).forEach(([hazard, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        detected.push(hazard);
      }
    });

    return detected;
  }

  // Detect relevant components from text
  private static detectComponents(text: string): string[] {
    const componentKeywords = {
      'electrodes': ['electrode', 'welding tip', 'contact'],
      'bearings': ['bearing', 'ball bearing', 'roller bearing'],
      'seals': ['seal', 'gasket', 'o-ring'],
      'motors': ['motor', 'drive', 'servo'],
      'sensors': ['sensor', 'probe', 'detector'],
      'valves': ['valve', 'solenoid', 'actuator'],
      'filters': ['filter', 'strainer', 'element']
    };

    const detected: string[] = [];
    Object.entries(componentKeywords).forEach(([component, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        detected.push(component);
      }
    });

    return detected;
  }

  // Detect procedure types from context
  private static detectProcedures(text: string): string[] {
    const procedureKeywords = {
      'replacement': ['replace', 'install', 'remove', 'change'],
      'inspection': ['inspect', 'check', 'examine', 'verify'],
      'calibration': ['calibrate', 'adjust', 'set', 'tune'],
      'troubleshooting': ['troubleshoot', 'diagnose', 'fault', 'problem'],
      'maintenance': ['maintain', 'service', 'preventive'],
      'testing': ['test', 'measure', 'validate', 'confirm']
    };

    const detected: string[] = [];
    Object.entries(procedureKeywords).forEach(([procedure, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        detected.push(procedure);
      }
    });

    return detected;
  }

  // Detect step types from content
  private static detectStepTypes(text: string): string[] {
    const stepKeywords = {
      'preparation': ['prepare', 'setup', 'ready', 'before'],
      'disassembly': ['remove', 'disconnect', 'disassemble', 'take apart'],
      'installation': ['install', 'connect', 'assemble', 'mount'],
      'testing': ['test', 'verify', 'check', 'validate'],
      'cleanup': ['clean', 'dispose', 'restore', 'finish']
    };

    const detected: string[] = [];
    Object.entries(stepKeywords).forEach(([step, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        detected.push(step);
      }
    });

    return detected;
  }

  // Assess skill level based on content complexity
  private static assessSkillLevel(text: string, figureNumber?: string): 'basic' | 'intermediate' | 'advanced' | 'expert' {
    const complexityIndicators = {
      expert: ['calibration', 'programming', 'troubleshoot', 'diagnose'],
      advanced: ['adjust', 'measure', 'tolerance', 'specification'],
      intermediate: ['install', 'replace', 'connect', 'torque'],
      basic: ['clean', 'inspect', 'remove', 'safety']
    };

    // Check complexity indicators in order
    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => text.includes(indicator))) {
        return level as any;
      }
    }

    return 'basic';
  }

  // Extract relevant keywords
  private static extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const technicalWords = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'with', 'this', 'that', 'will', 'should', 'must'].includes(word)
    );
    
    // Return top 10 most relevant keywords
    return [...new Set(technicalWords)].slice(0, 10);
  }

  // Remove duplicate images based on similarity
  private static async removeDuplicates(images: ExtractedImage[]): Promise<ExtractedImage[]> {
    // Mock duplicate detection - in production, use perceptual hashing or ML
    const uniqueImages: ExtractedImage[] = [];
    const seenFilenames = new Set<string>();

    for (const image of images) {
      // Simple filename-based duplicate detection for demo
      const baseFilename = image.suggestedFilename.replace(/\d+/g, ''); // Remove numbers
      
      if (!seenFilenames.has(baseFilename)) {
        uniqueImages.push(image);
        seenFilenames.add(baseFilename);
      }
    }

    return uniqueImages;
  }

  // Generate mock surrounding text for context
  private static generateSurroundingText(extractionType: string): string[] {
    const textMap = {
      'safety-diagram': [
        'Before performing any maintenance, ensure proper lockout/tagout procedures are followed.',
        'Verify zero energy state using appropriate testing equipment.',
        'Personal protective equipment must be worn at all times.'
      ],
      'component-photo': [
        'The electrode assembly consists of multiple components that require periodic replacement.',
        'Inspect all components for wear and damage before reassembly.',
        'Use only approved replacement parts as specified in the parts list.'
      ],
      'procedure-steps': [
        'Follow the step-by-step procedure exactly as outlined.',
        'Each step must be completed before proceeding to the next.',
        'Document completion of each step in the maintenance log.'
      ],
      'schematic': [
        'Refer to the electrical schematic when troubleshooting circuit issues.',
        'All connections must be verified using a multimeter.',
        'Circuit protection devices are located as shown in the diagram.'
      ],
      'troubleshooting': [
        'Common failure modes are illustrated with their typical symptoms.',
        'Use the diagnostic flowchart to identify the root cause.',
        'Contact technical support if the issue persists after following these steps.'
      ]
    };

    return textMap[extractionType] || ['General maintenance information.'];
  }

  // Generate initial tags based on extraction type
  private static generateTagsFromExtraction(extractionType: string, caption: string): Partial<ImageTags> {
    const baseMap = {
      'safety-diagram': {
        category: 'safety' as const,
        safetyLevel: 'high' as const,
        stepTypes: ['preparation']
      },
      'component-photo': {
        category: 'component' as const,
        stepTypes: ['diagnostic', 'assessment']
      },
      'procedure-steps': {
        category: 'procedure' as const,
        stepTypes: ['installation', 'disassembly']
      },
      'schematic': {
        category: 'diagnostic' as const,
        skillLevel: 'advanced' as const
      },
      'troubleshooting': {
        category: 'diagnostic' as const,
        procedures: ['troubleshooting']
      }
    };

    return baseMap[extractionType] || { category: 'procedure' as const };
  }

  // Helper methods
  private static generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static updateJob(job: ManualExtractionJob): void {
    this.processingJobs.set(job.id, { ...job });
  }

  // Get all completed jobs
  static getCompletedJobs(): ManualExtractionJob[] {
    return Array.from(this.processingJobs.values())
      .filter(job => job.status === 'completed');
  }

  // Clean up old jobs
  static cleanupOldJobs(olderThanHours: number = 24): void {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    
    for (const [jobId, job] of this.processingJobs.entries()) {
      if (new Date(job.startedAt).getTime() < cutoffTime) {
        this.processingJobs.delete(jobId);
      }
    }
  }
}