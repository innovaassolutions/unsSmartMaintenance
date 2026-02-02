// Intelligent Image Service for contextual maintenance procedure images
// This service provides smart image selection based on machine type, issue type, and procedure steps

export interface ProcedureImage {
  url: string;
  category: 'safety' | 'tool' | 'procedure' | 'component' | 'verification';
  title: string;
  description: string;
  stepNumber?: number;
  safetyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface IntelligentImageContext {
  machineType: string;
  issueType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  stepNumber?: number;
}

export class IntelligentImageService {
  // Base image URLs - using realistic placeholder service for demo
  private static getBaseImageUrl(category: string, machine: string, specific?: string): string {
    const seed = this.generateSeed(machine + category + (specific || ''));
    return `https://picsum.photos/seed/${seed}/400/300`;
  }

  // Generate consistent seed for same parameters
  private static generateSeed(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  }

  // Smart image selection based on machine and issue type
  static getContextualImages(context: IntelligentImageContext): ProcedureImage[] {
    const images: ProcedureImage[] = [];
    
    // Always include safety images first (highest priority)
    images.push(...this.getSafetyImages(context));
    
    // Add component identification images
    images.push(...this.getComponentImages(context));
    
    // Add procedure-specific images
    images.push(...this.getProcedureImages(context));
    
    // Add verification images
    images.push(...this.getVerificationImages(context));
    
    return images;
  }

  private static getSafetyImages(context: IntelligentImageContext): ProcedureImage[] {
    const baseImages: ProcedureImage[] = [
      {
        url: this.getBaseImageUrl('safety-lockout', context.machineType),
        category: 'safety',
        title: 'Lockout/Tagout Procedure',
        description: `Power isolation points for ${context.machineType}`,
        safetyLevel: 'critical'
      },
      {
        url: this.getBaseImageUrl('safety-ppe', context.machineType),
        category: 'safety', 
        title: 'Required Personal Protective Equipment',
        description: 'PPE requirements for this maintenance procedure',
        safetyLevel: 'high'
      }
    ];

    // Add machine-specific safety requirements
    if (context.machineType.toLowerCase().includes('welder')) {
      baseImages.push({
        url: this.getBaseImageUrl('safety-arc-flash', context.machineType),
        category: 'safety',
        title: 'Arc Flash Protection',
        description: 'Arc flash suit and face shield requirements',
        safetyLevel: 'critical'
      });
    }

    if (context.machineType.toLowerCase().includes('press') || context.machineType.toLowerCase().includes('mold')) {
      baseImages.push({
        url: this.getBaseImageUrl('safety-hydraulic', context.machineType),
        category: 'safety',
        title: 'Hydraulic System Safety',
        description: 'Pressure relief and hydraulic safety procedures',
        safetyLevel: 'high'
      });
    }

    return baseImages;
  }

  private static getComponentImages(context: IntelligentImageContext): ProcedureImage[] {
    const componentMap: Record<string, ProcedureImage[]> = {
      'electrode-degradation': [
        {
          url: this.getBaseImageUrl('component-electrode-location', context.machineType),
          category: 'component',
          title: 'Electrode Location Identification',
          description: 'Visual guide to electrode access points'
        },
        {
          url: this.getBaseImageUrl('component-electrode-wear', context.machineType),
          category: 'component',
          title: 'Electrode Wear Patterns',
          description: 'Normal vs. excessive wear comparison'
        }
      ],
      'bearing-wear': [
        {
          url: this.getBaseImageUrl('component-bearing-location', context.machineType),
          category: 'component',
          title: 'Bearing Assembly Location',
          description: 'Access points and bearing identification'
        },
        {
          url: this.getBaseImageUrl('component-bearing-damage', context.machineType),
          category: 'component',
          title: 'Bearing Damage Assessment',
          description: 'Visual indicators of bearing failure'
        }
      ],
      'hydraulic-leak': [
        {
          url: this.getBaseImageUrl('component-hydraulic-system', context.machineType),
          category: 'component',
          title: 'Hydraulic System Overview',
          description: 'Key components and connection points'
        }
      ]
    };

    return componentMap[context.issueType] || [];
  }

  private static getProcedureImages(context: IntelligentImageContext): ProcedureImage[] {
    const procedureKey = `${context.machineType.toLowerCase()}-${context.issueType}`;
    
    return [
      {
        url: this.getBaseImageUrl('procedure-tools', procedureKey),
        category: 'tool',
        title: 'Required Tools Setup',
        description: 'Tool arrangement and preparation'
      },
      {
        url: this.getBaseImageUrl('procedure-step1', procedureKey),
        category: 'procedure',
        title: 'Disassembly Process',
        description: 'Step-by-step component removal',
        stepNumber: 1
      },
      {
        url: this.getBaseImageUrl('procedure-step2', procedureKey),
        category: 'procedure',
        title: 'Component Installation',
        description: 'Proper installation technique',
        stepNumber: 2
      },
      {
        url: this.getBaseImageUrl('procedure-step3', procedureKey),
        category: 'procedure',
        title: 'Calibration & Adjustment',
        description: 'Final adjustments and torque specifications',
        stepNumber: 3
      }
    ];
  }

  private static getVerificationImages(context: IntelligentImageContext): ProcedureImage[] {
    return [
      {
        url: this.getBaseImageUrl('verification-testing', context.machineType),
        category: 'verification',
        title: 'Post-Maintenance Testing',
        description: 'Verification procedures and test points'
      },
      {
        url: this.getBaseImageUrl('verification-documentation', context.machineType),
        category: 'verification',
        title: 'Documentation Requirements',
        description: 'Required documentation and sign-offs'
      }
    ];
  }

  // Get images for specific step
  static getStepImages(context: IntelligentImageContext, stepNumber: number): ProcedureImage[] {
    const allImages = this.getContextualImages({ ...context, stepNumber });
    return allImages.filter(img => img.stepNumber === stepNumber || img.category === 'safety');
  }

  // Get priority-ordered images (safety first)
  static getPriorityOrderedImages(context: IntelligentImageContext): ProcedureImage[] {
    const images = this.getContextualImages(context);
    
    return images.sort((a, b) => {
      const priorityOrder = { 'safety': 1, 'component': 2, 'tool': 3, 'procedure': 4, 'verification': 5 };
      const aPriority = priorityOrder[a.category] || 6;
      const bPriority = priorityOrder[b.category] || 6;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Within same category, sort by safety level
      const safetyOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };
      const aSafety = safetyOrder[a.safetyLevel || 'low'];
      const bSafety = safetyOrder[b.safetyLevel || 'low'];
      
      return aSafety - bSafety;
    });
  }
}