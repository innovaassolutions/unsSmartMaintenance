/**
 * CNC Machine Database Seeder
 * Populates the database with the 10 predefined CNC machines and their topics
 */

import { MachineRegistry } from './machine-registry';
import { AutoProvisioningTopicRegistry } from '@/lib/mqtt/topic-provisioning';
import { CNC_MACHINES } from '@/lib/simulation/cnc-data-generator';
import { CreateCNCMachineInput, CreateTopicRegistryInput, StandardUnits } from '@/types/uns-types';

export interface SeedingResult {
  machinesSeeded: number;
  topicsSeeded: number;
  errors: string[];
  summary: {
    totalExpected: number;
    machinesSuccess: number;
    topicsSuccess: number;
    machinesSkipped: number;
    topicsSkipped: number;
  };
}

/**
 * CNC Machine and Topic Seeder
 */
export class CNCMachineSeeder {
  private machineRegistry: MachineRegistry;
  private topicRegistry: AutoProvisioningTopicRegistry;

  constructor() {
    this.machineRegistry = new MachineRegistry();
    this.topicRegistry = new AutoProvisioningTopicRegistry();
  }

  /**
   * Seed all CNC machines and their associated topics
   */
  public async seedAll(options: { skipExisting?: boolean } = {}): Promise<SeedingResult> {
    const result: SeedingResult = {
      machinesSeeded: 0,
      topicsSeeded: 0,
      errors: [],
      summary: {
        totalExpected: CNC_MACHINES.length,
        machinesSuccess: 0,
        topicsSuccess: 0,
        machinesSkipped: 0,
        topicsSkipped: 0,
      },
    };

    console.log(`Starting to seed ${CNC_MACHINES.length} CNC machines...`);

    for (const machineConfig of CNC_MACHINES) {
      try {
        // Seed the machine
        const machineResult = await this.seedMachine(machineConfig, options.skipExisting);
        
        if (machineResult.created) {
          result.machinesSeeded++;
          result.summary.machinesSuccess++;
          console.log(`✓ Machine ${machineConfig.machine_id} seeded successfully`);
        } else {
          result.summary.machinesSkipped++;
          console.log(`- Machine ${machineConfig.machine_id} already exists, skipped`);
        }

        // Seed topics for this machine
        const topicsResult = await this.seedMachineTopics(machineConfig, options.skipExisting);
        result.topicsSeeded += topicsResult.created;
        result.summary.topicsSuccess += topicsResult.created;
        result.summary.topicsSkipped += topicsResult.skipped;
        
        console.log(`✓ Created ${topicsResult.created} topics for machine ${machineConfig.machine_id}`);

      } catch (error) {
        const errorMessage = `Failed to seed machine ${machineConfig.machine_id}: ${error instanceof Error ? error.message : String(error)}`;
        result.errors.push(errorMessage);
        console.error(`✗ ${errorMessage}`);
      }
    }

    console.log('\n=== Seeding Summary ===');
    console.log(`Machines: ${result.summary.machinesSuccess} created, ${result.summary.machinesSkipped} skipped`);
    console.log(`Topics: ${result.summary.topicsSuccess} created, ${result.summary.topicsSkipped} skipped`);
    console.log(`Errors: ${result.errors.length}`);

    return result;
  }

  /**
   * Seed a single CNC machine
   */
  public async seedMachine(machineConfig: any, skipExisting: boolean = true): Promise<{ created: boolean; machine?: any }> {
    try {
      // Check if machine already exists
      const existingMachine = await this.machineRegistry.getMachineById(machineConfig.machine_id);
      
      if (existingMachine && skipExisting) {
        return { created: false, machine: existingMachine };
      }

      // Prepare machine data for database
      const machineData: CreateCNCMachineInput = {
        machine_id: machineConfig.machine_id,
        display_name: machineConfig.display_name,
        manufacturer: machineConfig.manufacturer,
        model: machineConfig.model,
        enterprise: machineConfig.enterprise,
        site: machineConfig.site,
        area: machineConfig.area,
        work_cell: machineConfig.work_cell,
        installation_date: new Date('2023-01-15'), // Standard installation date
        operational_status: machineConfig.operational_status,
        capabilities: machineConfig.capabilities,
        specifications: machineConfig.specifications,
      };

      const machine = await this.machineRegistry.addMachine(machineData);
      return { created: true, machine };

    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        if (skipExisting) {
          const existingMachine = await this.machineRegistry.getMachineById(machineConfig.machine_id);
          return { created: false, machine: existingMachine };
        }
      }
      throw error;
    }
  }

  /**
   * Seed topics for a specific machine
   */
  public async seedMachineTopics(machineConfig: any, skipExisting: boolean = true): Promise<{ created: number; skipped: number }> {
    const result = { created: 0, skipped: 0 };
    
    // Base topic path for this machine
    const baseTopicPath = `${machineConfig.enterprise}/${machineConfig.site}/${machineConfig.area}/${machineConfig.work_cell}/${machineConfig.machine_id}`;

    // Define all sensor topics for this machine
    const sensorTopics = this.generateMachineTopics(machineConfig, baseTopicPath);

    for (const topicData of sensorTopics) {
      try {
        // Check if topic already exists
        const existingTopic = await this.topicRegistry.findTopicByPath(topicData.topic_path);
        
        if (existingTopic && skipExisting) {
          result.skipped++;
          continue;
        }

        // Register the topic (this will auto-provision to EMQX)
        await this.topicRegistry.registerTopic(topicData);
        result.created++;

      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          result.skipped++;
        } else {
          throw error;
        }
      }
    }

    return result;
  }

  /**
   * Generate all topic definitions for a machine
   */
  private generateMachineTopics(machineConfig: any, baseTopicPath: string): CreateTopicRegistryInput[] {
    const topics: CreateTopicRegistryInput[] = [];

    // Sensor topics (informational layer)
    const sensorTopics = [
      {
        metric_name: 'spindle-speed',
        description: 'Current spindle rotation speed',
        unit: StandardUnits.RPM,
        data_type: 'number' as const,
        min_value: 0,
        max_value: machineConfig.capabilities.spindle_rpm_max,
      },
      {
        metric_name: 'spindle-load',
        description: 'Spindle load percentage',
        unit: StandardUnits.PERCENT,
        data_type: 'number' as const,
        min_value: 0,
        max_value: 100,
      },
      {
        metric_name: 'feedrate',
        description: 'Current feed rate',
        unit: 'mm/min',
        data_type: 'number' as const,
        min_value: 0,
        max_value: machineConfig.specifications.rapid_traverse_mm_min,
      },
      {
        metric_name: 'vibration',
        description: 'Machine vibration level',
        unit: 'mm/s',
        data_type: 'number' as const,
        min_value: 0,
        max_value: 10,
      },
      {
        metric_name: 'temperature',
        description: 'Machine temperature',
        unit: StandardUnits.CELSIUS,
        data_type: 'number' as const,
        min_value: 0,
        max_value: 100,
      },
      {
        metric_name: 'current-tool',
        description: 'Currently selected tool number',
        unit: 'tool_number',
        data_type: 'number' as const,
        min_value: 1,
        max_value: 99,
      },
    ];

    // Add axis position topics
    const axisLabels = ['x', 'y', 'z', 'a', 'b', 'c'].slice(0, machineConfig.capabilities.axes);
    axisLabels.forEach(axis => {
      sensorTopics.push({
        metric_name: `position-${axis}`,
        description: `${axis.toUpperCase()}-axis position`,
        unit: axis.charCodeAt(0) >= 97 && axis.charCodeAt(0) <= 99 ? 'degrees' : StandardUnits.MILLIMETER,
        data_type: 'number' as const,
        min_value: axis.charCodeAt(0) >= 97 && axis.charCodeAt(0) <= 99 ? -180 : -500,
        max_value: axis.charCodeAt(0) >= 97 && axis.charCodeAt(0) <= 99 ? 180 : 500,
      });
    });

    // Add coolant topics if machine has coolant system
    if (machineConfig.capabilities.coolant_system) {
      sensorTopics.push(
        {
          metric_name: 'coolant-pressure',
          description: 'Coolant system pressure',
          unit: StandardUnits.BAR,
          data_type: 'number' as const,
          min_value: 0,
          max_value: 10,
        },
        {
          metric_name: 'coolant-flow',
          description: 'Coolant flow rate',
          unit: StandardUnits.LITERS_PER_MINUTE,
          data_type: 'number' as const,
          min_value: 0,
          max_value: 50,
        }
      );
    }

    // Create sensor topics
    sensorTopics.forEach(sensor => {
      topics.push({
        topic_path: `${baseTopicPath}/info/sensors/${sensor.metric_name}`,
        topic_type: 'informational',
        enterprise: machineConfig.enterprise,
        site: machineConfig.site,
        area: machineConfig.area,
        work_cell: machineConfig.work_cell,
        work_unit: machineConfig.machine_id,
        data_category: 'sensors',
        metric_name: sensor.metric_name,
        description: sensor.description,
        unit: sensor.unit,
        data_type: sensor.data_type,
        min_value: sensor.min_value,
        max_value: sensor.max_value,
        is_active: true,
      });
    });

    // Status topics
    const statusTopics = [
      {
        metric_name: 'operational',
        description: 'Machine operational status',
        data_type: 'string' as const,
      },
      {
        metric_name: 'cycle-phase',
        description: 'Current operational cycle phase',
        data_type: 'string' as const,
      },
    ];

    statusTopics.forEach(status => {
      topics.push({
        topic_path: `${baseTopicPath}/info/status/${status.metric_name}`,
        topic_type: 'informational',
        enterprise: machineConfig.enterprise,
        site: machineConfig.site,
        area: machineConfig.area,
        work_cell: machineConfig.work_cell,
        work_unit: machineConfig.machine_id,
        data_category: 'status',
        metric_name: status.metric_name,
        description: status.description,
        data_type: status.data_type,
        is_active: true,
      });
    });

    // Production topics
    const productionTopics = [
      {
        metric_name: 'parts-count',
        description: 'Total parts produced',
        unit: 'parts',
        data_type: 'number' as const,
        min_value: 0,
      },
      {
        metric_name: 'efficiency',
        description: 'Machine efficiency percentage',
        unit: StandardUnits.PERCENT,
        data_type: 'number' as const,
        min_value: 0,
        max_value: 100,
      },
    ];

    productionTopics.forEach(production => {
      topics.push({
        topic_path: `${baseTopicPath}/info/production/${production.metric_name}`,
        topic_type: 'informational',
        enterprise: machineConfig.enterprise,
        site: machineConfig.site,
        area: machineConfig.area,
        work_cell: machineConfig.work_cell,
        work_unit: machineConfig.machine_id,
        data_category: 'production',
        metric_name: production.metric_name,
        description: production.description,
        unit: production.unit,
        data_type: production.data_type,
        min_value: production.min_value,
        max_value: production.max_value,
        is_active: true,
      });
    });

    return topics;
  }

  /**
   * Clear all seeded data (for testing/reset purposes)
   */
  public async clearAll(): Promise<{ machinesCleared: number; topicsCleared: number }> {
    console.log('Warning: This will clear all CNC machines and their topics from the database');
    
    let machinesCleared = 0;
    let topicsCleared = 0;

    // Clear machines
    for (const machineConfig of CNC_MACHINES) {
      try {
        // Note: This would need to be implemented in MachineRegistry
        // await this.machineRegistry.deleteMachine(machineConfig.machine_id);
        // machinesCleared++;
        console.log(`Would clear machine: ${machineConfig.machine_id}`);
      } catch (error) {
        console.error(`Failed to clear machine ${machineConfig.machine_id}:`, error);
      }
    }

    // Clear topics would be more complex as we'd need to identify all topics for these machines
    console.log('Topic clearing not implemented yet');

    return { machinesCleared, topicsCleared };
  }
}

/**
 * Utility function to seed CNC machines with default settings
 */
export async function seedCNCMachines(options?: { skipExisting?: boolean }): Promise<SeedingResult> {
  const seeder = new CNCMachineSeeder();
  return await seeder.seedAll(options);
}

/**
 * Utility function to seed only a specific machine
 */
export async function seedSpecificMachine(machineId: string, options?: { skipExisting?: boolean }): Promise<SeedingResult> {
  const seeder = new CNCMachineSeeder();
  const machine = CNC_MACHINES.find(m => m.machine_id === machineId);
  
  if (!machine) {
    throw new Error(`Machine ${machineId} not found in predefined machines`);
  }

  const result: SeedingResult = {
    machinesSeeded: 0,
    topicsSeeded: 0,
    errors: [],
    summary: {
      totalExpected: 1,
      machinesSuccess: 0,
      topicsSuccess: 0,
      machinesSkipped: 0,
      topicsSkipped: 0,
    },
  };

  try {
    const machineResult = await seeder.seedMachine(machine, options?.skipExisting);
    const topicsResult = await seeder.seedMachineTopics(machine, options?.skipExisting);
    
    if (machineResult.created) {
      result.machinesSeeded = 1;
      result.summary.machinesSuccess = 1;
    } else {
      result.summary.machinesSkipped = 1;
    }
    
    result.topicsSeeded = topicsResult.created;
    result.summary.topicsSuccess = topicsResult.created;
    result.summary.topicsSkipped = topicsResult.skipped;

  } catch (error) {
    result.errors.push(`Failed to seed machine ${machineId}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}