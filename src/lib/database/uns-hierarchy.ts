/**
 * UNSHierarchy Class for ISA-95 Hierarchy Management
 * Manages the construction and parsing of ISA-95 compliant topic hierarchies
 */

export interface HierarchyComponents {
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  work_unit: string;
  layer?: string;
  data_category?: string;
  metric_name?: string;
}

export interface ISA95Levels {
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  work_unit: string;
}

export class UNSHierarchy {
  private readonly REQUIRED_HIERARCHY_DEPTH = 8;
  private readonly ISA95_LEVELS = 5;

  /**
   * Build complete topic path from hierarchy components
   */
  buildTopicPath(components: HierarchyComponents): string {
    const requiredFields = ['enterprise', 'site', 'area', 'work_cell', 'work_unit', 'layer', 'data_category', 'metric_name'];
    
    // Validate all required components are provided
    const missingFields = requiredFields.filter(field => !components[field as keyof HierarchyComponents]);
    if (missingFields.length > 0) {
      throw new Error('Missing required hierarchy components');
    }

    const { enterprise, site, area, work_cell, work_unit, layer, data_category, metric_name } = components as Required<HierarchyComponents>;

    return `${enterprise}/${site}/${area}/${work_cell}/${work_unit}/${layer}/${data_category}/${metric_name}`;
  }

  /**
   * Extract ISA-95 levels from topic path string
   */
  parseHierarchyLevels(topicPath: string): ISA95Levels {
    const pathParts = topicPath.split('/');
    
    if (pathParts.length < this.ISA95_LEVELS) {
      throw new Error('Insufficient hierarchy depth');
    }

    const [enterprise, site, area, work_cell, work_unit] = pathParts;

    return {
      enterprise,
      site,
      area,
      work_cell,
      work_unit,
    };
  }

  /**
   * Validate topic has required 5-level depth structure
   */
  validateHierarchyDepth(topicPath: string): void {
    const pathParts = topicPath.split('/');
    
    if (pathParts.length < this.REQUIRED_HIERARCHY_DEPTH) {
      throw new Error('Insufficient hierarchy depth');
    }

    // Validate that all parts are non-empty
    if (pathParts.some(part => part.trim().length === 0)) {
      throw new Error('Invalid hierarchy structure - empty components');
    }
  }

  /**
   * Get all parent-level topics for given machine
   * Returns wildcard patterns for hierarchical subscription
   */
  getParentTopics(machineId: string): string[] {
    // This method would need to be implemented based on the machine's
    // actual hierarchy position. For now, return example patterns.
    
    const baseHierarchy = this.getMachineHierarchy(machineId);
    if (!baseHierarchy) {
      return [];
    }

    const { enterprise, site, area, work_cell } = baseHierarchy;

    return [
      `${enterprise}/${site}/${area}/${work_cell}/${machineId}/+/+/+`,
      `${enterprise}/${site}/${area}/${work_cell}/+/+/+/+`,
      `${enterprise}/${site}/${area}/+/+/+/+/+`,
      `${enterprise}/${site}/+/+/+/+/+/+`,
      `${enterprise}/+/+/+/+/+/+/+`,
    ];
  }

  /**
   * Get machine hierarchy information
   * This would typically query the database, but for testing we'll use default values
   */
  private getMachineHierarchy(machineId: string): ISA95Levels | null {
    // Default hierarchy for CNC machines in the demo system
    const defaultHierarchy: ISA95Levels = {
      enterprise: 'uns-demo',
      site: 'factory-floor',
      area: 'machining',
      work_cell: 'cell-01',
      work_unit: machineId,
    };

    // In a real implementation, this would query the database
    // for the machine's actual hierarchy position
    return defaultHierarchy;
  }

  /**
   * Generate topic patterns for different access levels
   */
  generateAccessPatterns(role: string, hierarchy: ISA95Levels): string[] {
    const { enterprise, site, area, work_cell, work_unit } = hierarchy;
    
    switch (role) {
      case 'executive':
        return [
          `${enterprise}/+/+/+/+/info/production/+`,
          `${enterprise}/+/+/+/+/info/efficiency/+`,
        ];
      
      case 'factory_manager':
        return [
          `${enterprise}/${site}/+/+/+/info/+/+`,
          `${enterprise}/${site}/+/+/+/func/+/+`,
        ];
      
      case 'production_manager':
        return [
          `${enterprise}/${site}/${area}/+/+/info/production/+`,
          `${enterprise}/${site}/${area}/+/+/info/status/+`,
        ];
      
      case 'maintenance_technician':
        return [
          `${enterprise}/${site}/${area}/${work_cell}/+/info/sensors/+`,
          `${enterprise}/${site}/${area}/${work_cell}/+/info/maintenance/+`,
          `${enterprise}/${site}/${area}/${work_cell}/+/adhoc/alerts/+`,
        ];
      
      default:
        return [];
    }
  }

  /**
   * Validate hierarchy component naming conventions
   */
  validateComponentName(component: string, level: string): boolean {
    // Component names should be lowercase, alphanumeric with hyphens/underscores
    const validNameRegex = /^[a-z0-9][a-z0-9\-_]*[a-z0-9]$|^[a-z0-9]$/;
    
    if (!validNameRegex.test(component)) {
      return false;
    }

    // Additional level-specific validations could be added here
    switch (level) {
      case 'enterprise':
        return component.length >= 3 && component.length <= 50;
      case 'site':
        return component.length >= 3 && component.length <= 50;
      case 'area':
        return component.length >= 3 && component.length <= 50;
      case 'work_cell':
        return component.length >= 3 && component.length <= 50;
      case 'work_unit':
        return component.length >= 3 && component.length <= 50;
      default:
        return true;
    }
  }

  /**
   * Build hierarchical context for a topic
   */
  buildHierarchyContext(topicPath: string): HierarchyComponents {
    const pathParts = topicPath.split('/');
    
    if (pathParts.length < this.REQUIRED_HIERARCHY_DEPTH) {
      throw new Error('Invalid topic path for hierarchy context');
    }

    const [enterprise, site, area, work_cell, work_unit, layer, data_category, metric_name] = pathParts;

    return {
      enterprise,
      site,
      area,
      work_cell,
      work_unit,
      layer,
      data_category,
      metric_name,
    };
  }

  /**
   * Generate topic template for a machine
   */
  generateMachineTopicTemplate(machineId: string, layer: string, category: string, metric: string): string {
    const hierarchy = this.getMachineHierarchy(machineId);
    if (!hierarchy) {
      throw new Error(`Machine hierarchy not found for ${machineId}`);
    }

    const { enterprise, site, area, work_cell } = hierarchy;
    return `${enterprise}/${site}/${area}/${work_cell}/${machineId}/${layer}/${category}/${metric}`;
  }

  /**
   * Get hierarchy depth for a topic path
   */
  getHierarchyDepth(topicPath: string): number {
    return topicPath.split('/').length;
  }

  /**
   * Check if topic belongs to specific hierarchy level
   */
  isAtHierarchyLevel(topicPath: string, level: 'enterprise' | 'site' | 'area' | 'work_cell' | 'work_unit'): boolean {
    const hierarchy = this.parseHierarchyLevels(topicPath);
    
    switch (level) {
      case 'enterprise':
        return hierarchy.site === '+' || hierarchy.site.includes('*');
      case 'site':
        return hierarchy.area === '+' || hierarchy.area.includes('*');
      case 'area':
        return hierarchy.work_cell === '+' || hierarchy.work_cell.includes('*');
      case 'work_cell':
        return hierarchy.work_unit === '+' || hierarchy.work_unit.includes('*');
      case 'work_unit':
        return !hierarchy.work_unit.includes('+') && !hierarchy.work_unit.includes('*');
      default:
        return false;
    }
  }
}