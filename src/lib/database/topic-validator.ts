/**
 * TopicValidator Class for UNS Topic Hierarchy Validation
 * Validates MQTT topic paths, payloads, and data ranges according to ISA-95 standards
 */

import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

// Valid UNS layers according to specification
const VALID_UNS_LAYERS = ['desc', 'func', 'info', 'adhoc'] as const;
type UNSLayer = typeof VALID_UNS_LAYERS[number];

// Standard measurement units
const VALID_UNITS = [
  'rpm', 'celsius', 'fahrenheit', 'kelvin', 'kW', 'MW', 'kWh', 'MWh',
  'mm/s', 'mm', 'cm', 'm', 'bar', 'psi', 'Hz', 'kHz', 'MHz',
  'percent', '%', 'degrees', 'rad', 'mrad', 'g', 'kg', 'ton',
  'sec', 'min', 'hour', 'day', 'count', 'pcs', 'units'
] as const;

export interface TopicHierarchy {
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  work_unit: string;
  layer: string;
  data_category: string;
  metric_name: string;
}

export interface HierarchyComponents {
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  work_unit: string;
  [key: string]: any;
}

export class TopicValidator {
  private ajv: Ajv;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false,
    });
    addFormats(this.ajv);
  }

  /**
   * Validate ISA-95 compliant topic naming structure
   * Format: {enterprise}/{site}/{area}/{workcell}/{workunit}/{layer}/{datatype}/{metric}
   */
  validateTopicPath(topicPath: string): void {
    if (typeof topicPath !== 'string' || topicPath.length === 0) {
      throw new Error('Invalid topic path structure');
    }

    const pathParts = topicPath.split('/');

    // Must have exactly 8 parts for complete ISA-95 structure
    if (pathParts.length !== 8) {
      throw new Error('Invalid topic path structure');
    }

    // Validate each part is not empty
    if (pathParts.some(part => part.length === 0)) {
      throw new Error('Invalid topic path structure');
    }

    // Validate UNS layer (6th position, index 5)
    const layer = pathParts[5];
    if (!VALID_UNS_LAYERS.includes(layer as UNSLayer)) {
      throw new Error('Invalid UNS layer');
    }

    // Additional validations for path structure
    const [enterprise, site, area, work_cell, work_unit, uns_layer, data_category, metric_name] = pathParts;

    // Validate naming conventions (alphanumeric with hyphens/underscores)
    const validNameRegex = /^[a-z0-9][a-z0-9\-_]*[a-z0-9]$|^[a-z0-9]$/i;
    
    if (!validNameRegex.test(enterprise) || !validNameRegex.test(site) || 
        !validNameRegex.test(area) || !validNameRegex.test(work_cell) || 
        !validNameRegex.test(work_unit) || !validNameRegex.test(data_category) || 
        !validNameRegex.test(metric_name)) {
      throw new Error('Invalid topic path structure');
    }
  }

  /**
   * Validate JSON payload against registered schema
   */
  validatePayloadSchema(payload: any, schema: any): void {
    const validate = this.ajv.compile(schema);
    const valid = validate(payload);

    if (!valid) {
      const errors = validate.errors?.map(err => 
        `${err.instancePath || 'root'}: ${err.message}`
      ).join(', ') || 'Unknown validation error';
      throw new Error(`Payload validation failed: ${errors}`);
    }
  }

  /**
   * Parse topic hierarchy from path string
   */
  parseTopicHierarchy(topicPath: string): TopicHierarchy {
    this.validateTopicPath(topicPath);
    
    const [enterprise, site, area, work_cell, work_unit, layer, data_category, metric_name] = topicPath.split('/');
    
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
   * Validate numeric values fall within defined range
   */
  validateDataRange(value: number, minValue?: number, maxValue?: number): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('Value must be a valid number');
    }

    if (minValue !== undefined && value < minValue) {
      throw new Error(`Value ${value} is below minimum ${minValue}`);
    }

    if (maxValue !== undefined && value > maxValue) {
      throw new Error(`Value ${value} is above maximum ${maxValue}`);
    }
  }

  /**
   * Validate measurement units against standard units list
   */
  isValidUnit(unit: string): boolean {
    if (typeof unit !== 'string') {
      return false;
    }

    return VALID_UNITS.includes(unit as any) || unit === '';
  }

  /**
   * Get valid UNS layers
   */
  getValidLayers(): readonly string[] {
    return VALID_UNS_LAYERS;
  }

  /**
   * Get valid measurement units
   */
  getValidUnits(): readonly string[] {
    return VALID_UNITS;
  }

  /**
   * Create a JSON schema for topic payload validation
   */
  createPayloadSchema(dataType: string, minValue?: number, maxValue?: number, unit?: string): any {
    const baseSchema: any = {
      type: 'object',
      properties: {
        timestamp: {
          type: 'string',
          format: 'date-time'
        },
        source: {
          type: 'string',
          minLength: 1
        },
        quality: {
          type: 'string',
          enum: ['good', 'bad', 'uncertain']
        },
        metadata: {
          type: 'object'
        }
      },
      required: ['timestamp', 'source']
    };

    // Add value property based on data type
    switch (dataType) {
      case 'number':
        baseSchema.properties.value = {
          type: 'number'
        };
        if (minValue !== undefined) {
          baseSchema.properties.value.minimum = minValue;
        }
        if (maxValue !== undefined) {
          baseSchema.properties.value.maximum = maxValue;
        }
        baseSchema.required.push('value');
        break;

      case 'string':
        baseSchema.properties.value = {
          type: 'string',
          minLength: 1
        };
        baseSchema.required.push('value');
        break;

      case 'boolean':
        baseSchema.properties.value = {
          type: 'boolean'
        };
        baseSchema.required.push('value');
        break;

      case 'object':
        baseSchema.properties.value = {
          type: 'object'
        };
        baseSchema.required.push('value');
        break;

      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }

    // Add unit property if specified
    if (unit) {
      baseSchema.properties.unit = {
        type: 'string',
        const: unit
      };
      baseSchema.required.push('unit');
    }

    return baseSchema;
  }
}