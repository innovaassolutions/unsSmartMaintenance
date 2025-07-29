/**
 * CNC Machine Registry
 * Manages CNC machine data in the database with ISA-95 hierarchy support
 */

import { getSupabaseClient } from './supabase-client';
import { CNCMachine, CreateCNCMachineInput, OperationalStatus, LocationFilter } from '@/types/uns-types';

export class MachineRegistry {
  private supabase;

  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Add a new CNC machine to the registry
   */
  async addMachine(machineData: CreateCNCMachineInput): Promise<CNCMachine> {
    // Validate required ISA-95 hierarchy fields
    const requiredFields = ['enterprise', 'site', 'area', 'work_cell'];
    for (const field of requiredFields) {
      if (!machineData[field as keyof CreateCNCMachineInput]) {
        throw new Error(`Missing required ISA-95 hierarchy fields: ${field}`);
      }
    }

    // Validate operational status
    const validStatuses: OperationalStatus[] = ['operational', 'maintenance', 'offline', 'error'];
    if (!validStatuses.includes(machineData.operational_status)) {
      throw new Error('Invalid operational status');
    }

    // Check for duplicate machine_id
    const existingMachine = await this.getMachineById(machineData.machine_id);
    if (existingMachine) {
      throw new Error('Machine ID already exists');
    }

    const { data, error } = await this.supabase
      .from('cnc_machines')
      .insert([machineData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add machine: ${error.message}`);
    }

    return data as CNCMachine;
  }

  /**
   * Get a machine by its machine_id
   */
  async getMachineById(machineId: string): Promise<CNCMachine | null> {
    const { data, error } = await this.supabase
      .from('cnc_machines')
      .select('*')
      .eq('machine_id', machineId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw new Error(`Failed to get machine: ${error.message}`);
    }

    return data as CNCMachine;
  }

  /**
   * Update machine operational status
   */
  async updateMachineStatus(machineId: string, newStatus: OperationalStatus): Promise<CNCMachine> {
    // Validate status transition logic
    const currentMachine = await this.getMachineById(machineId);
    if (!currentMachine) {
      throw new Error('Machine not found');
    }

    // Define valid status transitions
    const validTransitions: Record<OperationalStatus, OperationalStatus[]> = {
      'operational': ['maintenance', 'offline', 'error'],
      'maintenance': ['operational', 'offline'],
      'offline': ['operational', 'maintenance'],
      'error': ['maintenance', 'offline']
    };

    const currentStatus = currentMachine.operational_status;
    if (currentStatus !== newStatus && !validTransitions[currentStatus]?.includes(newStatus)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
    }

    const { data, error } = await this.supabase
      .from('cnc_machines')
      .update({ 
        operational_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('machine_id', machineId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update machine status: ${error.message}`);
    }

    return data as CNCMachine;
  }

  /**
   * Get machines by location filter (ISA-95 hierarchy)
   */
  async getMachinesByLocation(filter: LocationFilter): Promise<CNCMachine[]> {
    let query = this.supabase.from('cnc_machines').select('*');

    // Apply filters based on ISA-95 hierarchy
    if (filter.enterprise) {
      query = query.eq('enterprise', filter.enterprise);
    }
    if (filter.site) {
      query = query.eq('site', filter.site);
    }
    if (filter.area) {
      query = query.eq('area', filter.area);
    }
    if (filter.work_cell) {
      query = query.eq('work_cell', filter.work_cell);
    }

    const { data, error } = await query.order('machine_id');

    if (error) {
      throw new Error(`Failed to get machines by location: ${error.message}`);
    }

    return data as CNCMachine[];
  }

  /**
   * Validate that a machine ID exists and is active
   */
  async validateMachineId(machineId: string): Promise<boolean> {
    const machine = await this.getMachineById(machineId);
    return machine !== null;
  }

  /**
   * Get all machines
   */
  async getAllMachines(): Promise<CNCMachine[]> {
    const { data, error } = await this.supabase
      .from('cnc_machines')
      .select('*')
      .order('machine_id');

    if (error) {
      throw new Error(`Failed to get all machines: ${error.message}`);
    }

    return data as CNCMachine[];
  }

  /**
   * Get machines by operational status
   */
  async getMachinesByStatus(status: OperationalStatus): Promise<CNCMachine[]> {
    const { data, error } = await this.supabase
      .from('cnc_machines')
      .select('*')
      .eq('operational_status', status)
      .order('machine_id');

    if (error) {
      throw new Error(`Failed to get machines by status: ${error.message}`);
    }

    return data as CNCMachine[];
  }

  /**
   * Update machine capabilities
   */
  async updateMachineCapabilities(machineId: string, capabilities: Record<string, any>): Promise<CNCMachine> {
    const { data, error } = await this.supabase
      .from('cnc_machines')
      .update({ 
        capabilities,
        updated_at: new Date().toISOString()
      })
      .eq('machine_id', machineId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update machine capabilities: ${error.message}`);
    }

    return data as CNCMachine;
  }

  /**
   * Update machine specifications
   */
  async updateMachineSpecifications(machineId: string, specifications: Record<string, any>): Promise<CNCMachine> {
    const { data, error } = await this.supabase
      .from('cnc_machines')
      .update({ 
        specifications,
        updated_at: new Date().toISOString()
      })
      .eq('machine_id', machineId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update machine specifications: ${error.message}`);
    }

    return data as CNCMachine;
  }

  /**
   * Get machine hierarchy summary (for dashboard display)
   */
  async getMachineHierarchySummary(): Promise<{
    enterprises: string[];
    sites: string[];
    areas: string[];
    work_cells: string[];
    total_machines: number;
    by_status: Record<OperationalStatus, number>;
  }> {
    const machines = await this.getAllMachines();

    const enterprises = [...new Set(machines.map(m => m.enterprise))];
    const sites = [...new Set(machines.map(m => m.site))];
    const areas = [...new Set(machines.map(m => m.area))];
    const work_cells = [...new Set(machines.map(m => m.work_cell))];

    const by_status = machines.reduce((acc, machine) => {
      acc[machine.operational_status] = (acc[machine.operational_status] || 0) + 1;
      return acc;
    }, {} as Record<OperationalStatus, number>);

    return {
      enterprises: enterprises.sort(),
      sites: sites.sort(),
      areas: areas.sort(),
      work_cells: work_cells.sort(),
      total_machines: machines.length,
      by_status,
    };
  }

  /**
   * Search machines with flexible criteria
   */
  async searchMachines(criteria: {
    manufacturer?: string;
    model?: string;
    operational_status?: OperationalStatus;
    enterprise?: string;
    site?: string;
    area?: string;
    work_cell?: string;
  }): Promise<CNCMachine[]> {
    let query = this.supabase.from('cnc_machines').select('*');

    Object.entries(criteria).forEach(([key, value]) => {
      if (value !== undefined) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query.order('machine_id');

    if (error) {
      throw new Error(`Failed to search machines: ${error.message}`);
    }

    return data as CNCMachine[];
  }

  /**
   * Get machine statistics
   */
  async getMachineStatistics(): Promise<{
    total: number;
    operational: number;
    maintenance: number;
    offline: number;
    error: number;
    by_manufacturer: Record<string, number>;
    by_area: Record<string, number>;
    uptime_percentage: number;
  }> {
    const machines = await this.getAllMachines();
    
    const stats = {
      total: machines.length,
      operational: machines.filter(m => m.operational_status === 'operational').length,
      maintenance: machines.filter(m => m.operational_status === 'maintenance').length,
      offline: machines.filter(m => m.operational_status === 'offline').length,
      error: machines.filter(m => m.operational_status === 'error').length,
      by_manufacturer: {} as Record<string, number>,
      by_area: {} as Record<string, number>,
      uptime_percentage: 0,
    };

    // Calculate manufacturer distribution
    machines.forEach(machine => {
      const manufacturer = machine.manufacturer || 'Unknown';
      stats.by_manufacturer[manufacturer] = (stats.by_manufacturer[manufacturer] || 0) + 1;
    });

    // Calculate area distribution
    machines.forEach(machine => {
      stats.by_area[machine.area] = (stats.by_area[machine.area] || 0) + 1;
    });

    // Calculate uptime percentage (operational + maintenance machines)
    const availableMachines = stats.operational + stats.maintenance;
    stats.uptime_percentage = stats.total > 0 ? Math.round((availableMachines / stats.total) * 100) : 0;

    return stats;
  }
}