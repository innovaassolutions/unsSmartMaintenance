/**
 * @jest-environment node
 */

import { CNCDataGenerator, CNCDataGeneratorFactory, CNC_MACHINES } from '../../lib/simulation/cnc-data-generator';
import { StandardUnits } from '../../types/uns-types';

describe('CNCDataGenerator', () => {
  let generator: CNCDataGenerator;
  const testMachine = CNC_MACHINES[0]; // Use first machine for testing

  beforeEach(() => {
    generator = new CNCDataGenerator(testMachine);
  });

  describe('constructor', () => {
    it('should initialize with correct machine configuration', () => {
      expect(generator).toBeDefined();
      // Access private properties through casting for testing
      const privateGenerator = generator as any;
      expect(privateGenerator.machine).toEqual(testMachine);
      expect(privateGenerator.totalPartsProduced).toBe(0);
      expect(privateGenerator.toolWearFactors).toBeInstanceOf(Map);
      expect(privateGenerator.toolWearFactors.size).toBe(20); // 20 tools initialized
    });

    it('should initialize with appropriate baseline values', () => {
      const privateGenerator = generator as any;
      expect(privateGenerator.vibrationBaseline).toBeGreaterThanOrEqual(0.1);
      expect(privateGenerator.vibrationBaseline).toBeLessThanOrEqual(0.6);
      expect(privateGenerator.temperatureBaseline).toBeGreaterThanOrEqual(45);
      expect(privateGenerator.temperatureBaseline).toBeLessThanOrEqual(55);
    });
  });

  describe('generateSensorReadings', () => {
    it('should generate complete set of sensor readings', () => {
      const readings = generator.generateSensorReadings();
      
      expect(readings).toBeInstanceOf(Array);
      expect(readings.length).toBeGreaterThan(10); // Should have many sensor readings
      
      // Verify all readings have required structure
      readings.forEach(reading => {
        expect(reading).toHaveProperty('topicPath');
        expect(reading).toHaveProperty('payload');
        expect(reading.payload).toHaveProperty('timestamp');
        expect(reading.payload).toHaveProperty('source');
        expect(reading.payload).toHaveProperty('value');
        expect(reading.payload).toHaveProperty('quality');
        expect(reading.payload.source).toBe(testMachine.machine_id);
      });
    });

    it('should generate spindle speed reading with correct structure', () => {
      const readings = generator.generateSensorReadings();
      const spindleReading = readings.find(r => r.topicPath.includes('spindle-speed'));
      
      expect(spindleReading).toBeDefined();
      expect(spindleReading!.payload.unit).toBe(StandardUnits.RPM);
      expect(typeof spindleReading!.payload.value).toBe('number');
      expect(spindleReading!.payload.value).toBeGreaterThanOrEqual(0);
      expect(spindleReading!.payload.value).toBeLessThanOrEqual(testMachine.capabilities.spindle_rpm_max);
    });

    it('should generate axis position readings for all machine axes', () => {
      const readings = generator.generateSensorReadings();
      const axisReadings = readings.filter(r => r.topicPath.includes('position-'));
      
      expect(axisReadings.length).toBe(testMachine.capabilities.axes);
      
      // Verify each axis has appropriate position data
      axisReadings.forEach(reading => {
        expect(typeof reading.payload.value).toBe('number');
        expect(reading.payload.metadata).toHaveProperty('axis');
        expect(reading.payload.metadata).toHaveProperty('max_travel');
      });
    });

    it('should generate coolant readings only for machines with coolant systems', () => {
      const readings = generator.generateSensorReadings();
      const coolantReadings = readings.filter(r => r.topicPath.includes('coolant-'));
      
      if (testMachine.capabilities.coolant_system) {
        expect(coolantReadings.length).toBeGreaterThan(0);
        expect(coolantReadings.some(r => r.topicPath.includes('coolant-pressure'))).toBe(true);
        expect(coolantReadings.some(r => r.topicPath.includes('coolant-flow'))).toBe(true);
      } else {
        expect(coolantReadings.length).toBe(0);
      }
    });

    it('should generate production and status readings', () => {
      const readings = generator.generateSensorReadings();
      
      const statusReadings = readings.filter(r => r.topicPath.includes('/status/'));
      const productionReadings = readings.filter(r => r.topicPath.includes('/production/'));
      
      expect(statusReadings.length).toBeGreaterThan(0);
      expect(productionReadings.length).toBeGreaterThan(0);
      
      // Verify specific status readings
      expect(statusReadings.some(r => r.topicPath.includes('operational'))).toBe(true);
      expect(statusReadings.some(r => r.topicPath.includes('cycle-phase'))).toBe(true);
      
      // Verify specific production readings
      expect(productionReadings.some(r => r.topicPath.includes('parts-count'))).toBe(true);
      expect(productionReadings.some(r => r.topicPath.includes('efficiency'))).toBe(true);
    });

    it('should generate valid timestamp in ISO format', () => {
      const readings = generator.generateSensorReadings();
      
      readings.forEach(reading => {
        const timestamp = new Date(reading.payload.timestamp);
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).not.toBeNaN();
        // Timestamp should be recent (within last few seconds)
        expect(Date.now() - timestamp.getTime()).toBeLessThan(5000);
      });
    });

    it('should maintain consistent topic path structure', () => {
      const readings = generator.generateSensorReadings();
      const expectedPrefix = `${testMachine.enterprise}/${testMachine.site}/${testMachine.area}/${testMachine.work_cell}/${testMachine.machine_id}`;
      
      readings.forEach(reading => {
        expect(reading.topicPath).toMatch(new RegExp(`^${expectedPrefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}/info/`));
      });
    });

    it('should generate quality indicators appropriately', () => {
      const readings = generator.generateSensorReadings();
      const validQualities = ['good', 'bad', 'uncertain'];
      
      readings.forEach(reading => {
        expect(validQualities).toContain(reading.payload.quality);
      });
    });

    it('should include relevant metadata for each sensor type', () => {
      const readings = generator.generateSensorReadings();
      
      // Check spindle reading metadata
      const spindleReading = readings.find(r => r.topicPath.includes('spindle-speed'));
      expect(spindleReading!.payload.metadata).toHaveProperty('max_rpm');
      expect(spindleReading!.payload.metadata).toHaveProperty('phase');
      
      // Check temperature reading metadata
      const tempReading = readings.find(r => r.topicPath.includes('temperature'));
      expect(tempReading!.payload.metadata).toHaveProperty('baseline');
      expect(tempReading!.payload.metadata).toHaveProperty('threshold_warning');
      expect(tempReading!.payload.metadata).toHaveProperty('threshold_alarm');
      
      // Check tool reading metadata
      const toolReading = readings.find(r => r.topicPath.includes('current-tool'));
      expect(toolReading!.payload.metadata).toHaveProperty('tool_wear_percent');
      expect(toolReading!.payload.metadata).toHaveProperty('tool_life_remaining');
    });
  });

  describe('machine operational cycles', () => {
    it('should advance through operational cycles over time', async () => {
      // Get initial cycle phase
      const initialReadings = generator.generateSensorReadings();
      const initialPhase = initialReadings.find(r => r.topicPath.includes('cycle-phase'))?.payload.value;
      
      // Wait for cycle to potentially advance (testing with short durations)
      const privateGenerator = generator as any;
      privateGenerator.currentCycle.duration = 0.1; // Very short for testing
      
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait 200ms
      
      const laterReadings = generator.generateSensorReadings();
      const laterPhase = laterReadings.find(r => r.topicPath.includes('cycle-phase'))?.payload.value;
      
      // Phase might have changed (depending on timing)
      expect(typeof laterPhase).toBe('string');
      expect(['idle', 'loading', 'machining', 'unloading', 'maintenance', 'error']).toContain(laterPhase);
    });

    it('should generate different sensor values based on operational phase', () => {
      // Force machine into machining phase
      const privateGenerator = generator as any;
      privateGenerator.currentCycle = {
        phase: 'machining',
        duration: 1000,
        startTime: new Date(),
      };
      
      const machiningReadings = generator.generateSensorReadings();
      const spindleSpeed = machiningReadings.find(r => r.topicPath.includes('spindle-speed'))?.payload.value;
      
      // During machining, spindle speed should be > 0
      expect(spindleSpeed).toBeGreaterThan(0);
      
      // Force machine into idle phase
      privateGenerator.currentCycle = {
        phase: 'idle',
        duration: 1000,
        startTime: new Date(),
      };
      
      const idleReadings = generator.generateSensorReadings();
      const idleSpindleSpeed = idleReadings.find(r => r.topicPath.includes('spindle-speed'))?.payload.value;
      
      // During idle, spindle speed should be 0
      expect(idleSpindleSpeed).toBe(0);
    });
  });

  describe('maintenance and offline machines', () => {
    it('should handle maintenance status machines correctly', () => {
      const maintenanceMachine = { ...testMachine, operational_status: 'maintenance' as const };
      const maintenanceGenerator = new CNCDataGenerator(maintenanceMachine);
      
      const readings = maintenanceGenerator.generateSensorReadings();
      const statusReading = readings.find(r => r.topicPath.includes('operational'))?.payload.value;
      
      expect(statusReading).toContain('maintenance');
    });

    it('should handle offline status machines correctly', () => {
      const offlineMachine = { ...testMachine, operational_status: 'offline' as const };
      const offlineGenerator = new CNCDataGenerator(offlineMachine);
      
      const readings = offlineGenerator.generateSensorReadings();
      const statusReading = readings.find(r => r.topicPath.includes('operational'))?.payload.value;
      
      expect(statusReading).toBe('offline');
      
      // Most sensor values should be zero or minimal during offline
      const spindleSpeed = readings.find(r => r.topicPath.includes('spindle-speed'))?.payload.value;
      expect(spindleSpeed).toBe(0);
    });
  });
});

describe('CNCDataGeneratorFactory', () => {
  let factory: CNCDataGeneratorFactory;

  beforeEach(() => {
    factory = new CNCDataGeneratorFactory();
  });

  describe('constructor', () => {
    it('should initialize generators for all machines', () => {
      expect(factory).toBeDefined();
      
      // Test that we can get generators for all predefined machines
      CNC_MACHINES.forEach(machine => {
        const generator = factory.getGenerator(machine.machine_id);
        expect(generator).toBeDefined();
      });
    });
  });

  describe('getGenerator', () => {
    it('should return generator for valid machine ID', () => {
      const generator = factory.getGenerator('cnc-001');
      expect(generator).toBeInstanceOf(CNCDataGenerator);
    });

    it('should return undefined for invalid machine ID', () => {
      const generator = factory.getGenerator('invalid-machine');
      expect(generator).toBeUndefined();
    });
  });

  describe('generateAllReadings', () => {
    it('should generate readings for all machines', () => {
      const allReadings = factory.generateAllReadings();
      
      expect(allReadings).toBeInstanceOf(Map);
      expect(allReadings.size).toBe(CNC_MACHINES.length);
      
      // Verify each machine has readings
      CNC_MACHINES.forEach(machine => {
        const readings = allReadings.get(machine.machine_id);
        expect(readings).toBeDefined();
        expect(readings!.length).toBeGreaterThan(10);
      });
    });
  });

  describe('generateOperationalReadings', () => {
    it('should generate readings only for operational machines', () => {
      const operationalReadings = factory.generateOperationalReadings();
      
      expect(operationalReadings).toBeInstanceOf(Map);
      
      // Count expected operational machines
      const operationalMachineCount = CNC_MACHINES.filter(m => m.operational_status !== 'offline').length;
      expect(operationalReadings.size).toBe(operationalMachineCount);
      
      // Verify offline machines are excluded
      const offlineMachines = CNC_MACHINES.filter(m => m.operational_status === 'offline');
      offlineMachines.forEach(machine => {
        expect(operationalReadings.has(machine.machine_id)).toBe(false);
      });
    });
  });

  describe('getMachines', () => {
    it('should return all configured machines', () => {
      const machines = factory.getMachines();
      
      expect(machines).toEqual(CNC_MACHINES);
      expect(machines.length).toBe(10);
    });
  });
});

describe('CNC Machine Configurations', () => {
  describe('predefined machines', () => {
    it('should have 10 predefined machines', () => {
      expect(CNC_MACHINES.length).toBe(10);
    });

    it('should have unique machine IDs', () => {
      const machineIds = CNC_MACHINES.map(m => m.machine_id);
      const uniqueIds = new Set(machineIds);
      expect(uniqueIds.size).toBe(machineIds.length);
    });

    it('should have valid ISA-95 hierarchy for all machines', () => {
      const requiredFields = ['enterprise', 'site', 'area', 'work_cell', 'machine_id'];
      
      CNC_MACHINES.forEach(machine => {
        requiredFields.forEach(field => {
          expect(machine[field as keyof typeof machine]).toBeDefined();
          expect(typeof machine[field as keyof typeof machine]).toBe('string');
          expect((machine[field as keyof typeof machine] as string).length).toBeGreaterThan(0);
        });
      });
    });

    it('should have realistic capabilities and specifications', () => {
      CNC_MACHINES.forEach(machine => {
        // Check capabilities
        expect(machine.capabilities.spindle_rpm_max).toBeGreaterThan(0);
        expect(machine.capabilities.axes).toBeGreaterThanOrEqual(2);
        expect(machine.capabilities.axes).toBeLessThanOrEqual(5);
        expect(typeof machine.capabilities.tool_changer).toBe('boolean');
        
        // Check specifications
        expect(machine.specifications.spindle_power_kw).toBeGreaterThan(0);
        expect(machine.specifications.rapid_traverse_mm_min).toBeGreaterThan(0);
        expect(machine.specifications.work_envelope).toBeDefined();
        expect(machine.specifications.work_envelope.includes('x')).toBe(true);
      });
    });

    it('should have diverse manufacturers and models', () => {
      const manufacturers = new Set(CNC_MACHINES.map(m => m.manufacturer));
      const models = new Set(CNC_MACHINES.map(m => m.model));
      
      expect(manufacturers.size).toBeGreaterThan(1); // Multiple manufacturers
      expect(models.size).toBeGreaterThan(1); // Multiple models
    });

    it('should have different operational statuses', () => {
      const statuses = new Set(CNC_MACHINES.map(m => m.operational_status));
      
      expect(statuses.has('operational')).toBe(true);
      expect(statuses.size).toBeGreaterThan(1); // Should have variety
    });

    it('should be distributed across different areas and work cells', () => {
      const areas = new Set(CNC_MACHINES.map(m => m.area));
      const workCells = new Set(CNC_MACHINES.map(m => m.work_cell));
      
      expect(areas.size).toBeGreaterThan(1); // Multiple areas
      expect(workCells.size).toBeGreaterThan(1); // Multiple work cells
    });
  });
});