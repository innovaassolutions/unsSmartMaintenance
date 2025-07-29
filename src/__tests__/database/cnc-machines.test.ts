/**
 * @jest-environment node
 */

import { MachineRegistry } from '../../lib/database/machine-registry';
import { CNCMachine } from '../../types/uns-types';

// Mock dependencies
jest.mock('../../lib/database/supabase-client');

describe('MachineRegistry', () => {
  let machineRegistry: MachineRegistry;

  beforeEach(() => {
    machineRegistry = new MachineRegistry();
  });

  describe('addMachine', () => {
    it('should register new CNC machine with complete hierarchy and capabilities', async () => {
      const machineData: Omit<CNCMachine, 'id' | 'created_at' | 'updated_at'> = {
        machine_id: 'cnc-001',
        display_name: 'Haas VF-2 Mill #1',
        manufacturer: 'Haas',
        model: 'VF-2',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        installation_date: new Date('2023-01-15'),
        operational_status: 'operational',
        capabilities: {
          spindle_rpm: 8100,
          axes: 3,
          tool_changer: true,
          simultaneous_axes: 3
        },
        specifications: {
          work_envelope: '30x16x20',
          spindle_power: '20hp',
          rapid_traverse: '1000 ipm',
          spindle_taper: 'CAT-40'
        }
      };

      const result = await machineRegistry.addMachine(machineData);

      expect(result).toHaveProperty('id');
      expect(result.machine_id).toBe(machineData.machine_id);
      expect(result.display_name).toBe(machineData.display_name);
      expect(result.operational_status).toBe('operational');
      expect(result.capabilities).toEqual(machineData.capabilities);
      expect(result.specifications).toEqual(machineData.specifications);
    });

    it('should reject machine registration with duplicate machine_id', async () => {
      const machineData: Omit<CNCMachine, 'id' | 'created_at' | 'updated_at'> = {
        machine_id: 'cnc-001',
        display_name: 'Test Machine',
        manufacturer: 'Test Manufacturer',
        model: 'Test Model',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        operational_status: 'operational',
        capabilities: { spindle_rpm: 5000 },
        specifications: { work_envelope: '20x10x10' }
      };

      // Register machine first time
      await machineRegistry.addMachine(machineData);

      // Attempt to register machine with same ID
      await expect(machineRegistry.addMachine(machineData))
        .rejects
        .toThrow('Machine ID already exists');
    });

    it('should validate required ISA-95 hierarchy fields', async () => {
      const incompleteData = {
        machine_id: 'cnc-002',
        display_name: 'Incomplete Machine',
        manufacturer: 'Test',
        model: 'Test',
        enterprise: 'uns-demo',
        // Missing site, area, work_cell
        operational_status: 'operational' as const,
        capabilities: {},
        specifications: {}
      };

      await expect(machineRegistry.addMachine(incompleteData as any))
        .rejects
        .toThrow('Missing required ISA-95 hierarchy fields');
    });

    it('should validate operational status values', async () => {
      const invalidStatusData = {
        machine_id: 'cnc-003',
        display_name: 'Test Machine',
        manufacturer: 'Test',
        model: 'Test',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        operational_status: 'invalid-status' as any,
        capabilities: {},
        specifications: {}
      };

      await expect(machineRegistry.addMachine(invalidStatusData))
        .rejects
        .toThrow('Invalid operational status');
    });
  });

  describe('updateMachineStatus', () => {
    let testMachineId: string;

    beforeEach(async () => {
      const machineData: Omit<CNCMachine, 'id' | 'created_at' | 'updated_at'> = {
        machine_id: 'cnc-status-test',
        display_name: 'Status Test Machine',
        manufacturer: 'Test',
        model: 'Test',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        operational_status: 'operational',
        capabilities: {},
        specifications: {}
      };

      const machine = await machineRegistry.addMachine(machineData);
      testMachineId = machine.machine_id;
    });

    it('should change operational status with proper state transitions', async () => {
      const validTransitions = [
        { from: 'operational', to: 'maintenance' as const },
        { from: 'maintenance', to: 'operational' as const },
        { from: 'operational', to: 'offline' as const },
        { from: 'offline', to: 'operational' as const }
      ];

      for (const transition of validTransitions) {
        // Set initial status
        await machineRegistry.updateMachineStatus(testMachineId, transition.from);
        
        // Test transition
        const result = await machineRegistry.updateMachineStatus(testMachineId, transition.to);
        expect(result.operational_status).toBe(transition.to);
        expect(result.updated_at).toBeDefined();
      }
    });

    it('should reject invalid status transitions', async () => {
      // Set machine to maintenance status
      await machineRegistry.updateMachineStatus(testMachineId, 'maintenance');

      // Try to transition directly to error (invalid transition)
      await expect(machineRegistry.updateMachineStatus(testMachineId, 'error'))
        .rejects
        .toThrow('Invalid status transition');
    });

    it('should update machine status with timestamp', async () => {
      const beforeUpdate = new Date();
      const result = await machineRegistry.updateMachineStatus(testMachineId, 'maintenance');
      const afterUpdate = new Date();

      expect(result.operational_status).toBe('maintenance');
      expect(new Date(result.updated_at)).toBeInstanceOf(Date);
      expect(new Date(result.updated_at).getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      expect(new Date(result.updated_at).getTime()).toBeLessThanOrEqual(afterUpdate.getTime());
    });
  });

  describe('getMachinesByLocation', () => {
    beforeEach(async () => {
      // Register machines in different locations
      const machines = [
        {
          machine_id: 'cnc-location-1',
          display_name: 'Machine 1',
          manufacturer: 'Haas',
          model: 'VF-2',
          enterprise: 'uns-demo',
          site: 'factory-floor',
          area: 'machining',
          work_cell: 'cell-01',
          operational_status: 'operational' as const,
          capabilities: {},
          specifications: {}
        },
        {
          machine_id: 'cnc-location-2',
          display_name: 'Machine 2',
          manufacturer: 'DMG Mori',
          model: 'NLX2500',
          enterprise: 'uns-demo',
          site: 'factory-floor',
          area: 'turning',
          work_cell: 'cell-02',
          operational_status: 'operational' as const,
          capabilities: {},
          specifications: {}
        },
        {
          machine_id: 'cnc-location-3',
          display_name: 'Machine 3',
          manufacturer: 'Haas',
          model: 'VF-2',
          enterprise: 'uns-demo',
          site: 'factory-floor',
          area: 'machining',
          work_cell: 'cell-01',
          operational_status: 'maintenance' as const,
          capabilities: {},
          specifications: {}
        }
      ];

      for (const machine of machines) {
        await machineRegistry.addMachine(machine);
      }
    });

    it('should filter machines by enterprise/site/area/work_cell hierarchy', async () => {
      // Filter by work cell
      const cellMachines = await machineRegistry.getMachinesByLocation({
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01'
      });

      expect(cellMachines).toHaveLength(2);
      expect(cellMachines.every(m => m.work_cell === 'cell-01')).toBe(true);
      expect(cellMachines.every(m => m.area === 'machining')).toBe(true);
    });

    it('should filter machines by area only', async () => {
      const areaMachines = await machineRegistry.getMachinesByLocation({
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining'
      });

      expect(areaMachines).toHaveLength(2);
      expect(areaMachines.every(m => m.area === 'machining')).toBe(true);
    });

    it('should return all machines when no filter provided', async () => {
      const allMachines = await machineRegistry.getMachinesByLocation({});
      expect(allMachines.length).toBeGreaterThanOrEqual(3);
    });

    it('should handle non-existent location filters', async () => {
      const noMachines = await machineRegistry.getMachinesByLocation({
        enterprise: 'non-existent',
        site: 'non-existent',
        area: 'non-existent',
        work_cell: 'non-existent'
      });

      expect(noMachines).toHaveLength(0);
    });
  });

  describe('validateMachineId', () => {
    let validMachineId: string;

    beforeEach(async () => {
      const machineData: Omit<CNCMachine, 'id' | 'created_at' | 'updated_at'> = {
        machine_id: 'cnc-validation-test',
        display_name: 'Validation Test Machine',
        manufacturer: 'Test',
        model: 'Test',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        operational_status: 'operational',
        capabilities: {},
        specifications: {}
      };

      const machine = await machineRegistry.addMachine(machineData);
      validMachineId = machine.machine_id;
    });

    it('should confirm machine ID exists and is active in registry', async () => {
      const isValid = await machineRegistry.validateMachineId(validMachineId);
      expect(isValid).toBe(true);
    });

    it('should return false for non-existent machine ID', async () => {
      const isValid = await machineRegistry.validateMachineId('non-existent-machine');
      expect(isValid).toBe(false);
    });

    it('should return machine details when validation passes', async () => {
      const machineDetails = await machineRegistry.getMachineById(validMachineId);
      
      expect(machineDetails).toBeDefined();
      expect(machineDetails?.machine_id).toBe(validMachineId);
      expect(machineDetails?.operational_status).toBe('operational');
    });
  });

  describe('Machine Capabilities and Specifications', () => {
    it('should properly store and retrieve complex JSON capabilities', async () => {
      const complexCapabilities = {
        spindle_rpm: 8100,
        axes: 3,
        tool_changer: true,
        simultaneous_axes: 3,
        coolant_system: {
          type: 'flood',
          pressure: 'high',
          through_spindle: true
        },
        control_system: {
          manufacturer: 'Haas',
          model: 'NGC',
          version: '100.19.000.1045'
        }
      };

      const machineData: Omit<CNCMachine, 'id' | 'created_at' | 'updated_at'> = {
        machine_id: 'cnc-complex-caps',
        display_name: 'Complex Capabilities Machine',
        manufacturer: 'Haas',
        model: 'VF-2',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        operational_status: 'operational',
        capabilities: complexCapabilities,
        specifications: {
          work_envelope: '30x16x20',
          weight: '4500 lbs',
          power_requirements: '220V 3-phase'
        }
      };

      const result = await machineRegistry.addMachine(machineData);

      expect(result.capabilities).toEqual(complexCapabilities);
      expect(result.capabilities.coolant_system.through_spindle).toBe(true);
      expect(result.capabilities.control_system.version).toBe('100.19.000.1045');
    });

    it('should handle empty capabilities and specifications gracefully', async () => {
      const machineData: Omit<CNCMachine, 'id' | 'created_at' | 'updated_at'> = {
        machine_id: 'cnc-empty-caps',
        display_name: 'Empty Capabilities Machine',
        manufacturer: 'Test',
        model: 'Test',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'machining',
        work_cell: 'cell-01',
        operational_status: 'operational',
        capabilities: {},
        specifications: {}
      };

      const result = await machineRegistry.addMachine(machineData);

      expect(result.capabilities).toEqual({});
      expect(result.specifications).toEqual({});
    });
  });

  describe('ISA-95 Hierarchy Integration', () => {
    it('should ensure machines properly integrate with topic hierarchy', async () => {
      const machineData: Omit<CNCMachine, 'id' | 'created_at' | 'updated_at'> = {
        machine_id: 'cnc-hierarchy-test',
        display_name: 'Hierarchy Test Machine',
        manufacturer: 'Mazak',
        model: 'Integrex i-300',
        enterprise: 'uns-demo',
        site: 'factory-floor',
        area: 'multi-axis',
        work_cell: 'cell-03',
        operational_status: 'operational',
        capabilities: {
          spindle_rpm: 6000,
          axes: 5,
          mill_turn: true
        },
        specifications: {
          simultaneous_5axis: true,
          b_axis: '120°'
        }
      };

      const machine = await machineRegistry.addMachine(machineData);

      // Verify the machine can be used as a work_unit in topic paths
      const expectedTopicPrefix = `${machine.enterprise}/${machine.site}/${machine.area}/${machine.work_cell}/${machine.machine_id}`;
      
      expect(expectedTopicPrefix).toBe('uns-demo/factory-floor/multi-axis/cell-03/cnc-hierarchy-test');
      
      // Verify hierarchy levels are properly set
      expect(machine.enterprise).toBe('uns-demo');
      expect(machine.site).toBe('factory-floor');
      expect(machine.area).toBe('multi-axis');
      expect(machine.work_cell).toBe('cell-03');
      expect(machine.machine_id).toBe('cnc-hierarchy-test');
    });
  });
});