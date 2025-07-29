/**
 * CNC Machine Data Simulator
 * Generates realistic sensor data for 10 CNC machines with various operational states
 */

import { MQTTPayload, OperationalStatus, StandardUnits } from '@/types/uns-types';

export interface CNCMachineConfig {
  machine_id: string;
  display_name: string;
  manufacturer: string;
  model: string;
  enterprise: string;
  site: string;
  area: string;
  work_cell: string;
  operational_status: OperationalStatus;
  capabilities: {
    spindle_rpm_max: number;
    axes: number;
    tool_changer: boolean;
    simultaneous_axes: number;
    coolant_system: boolean;
  };
  specifications: {
    spindle_power_kw: number;
    rapid_traverse_mm_min: number;
    work_envelope: string;
  };
}

export interface SensorReading {
  topicPath: string;
  payload: MQTTPayload;
}

export interface MachineOperationCycle {
  phase: 'idle' | 'loading' | 'machining' | 'unloading' | 'maintenance' | 'error';
  duration: number; // seconds
  startTime: Date;
}

/**
 * Predefined CNC machine configurations for the demo
 */
export const CNC_MACHINES: CNCMachineConfig[] = [
  {
    machine_id: 'cnc-001',
    display_name: 'Haas VF-2 Mill #1',
    manufacturer: 'Haas',
    model: 'VF-2',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'machining',
    work_cell: 'cell-01',
    operational_status: 'operational',
    capabilities: {
      spindle_rpm_max: 8100,
      axes: 3,
      tool_changer: true,
      simultaneous_axes: 3,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 15,
      rapid_traverse_mm_min: 25400,
      work_envelope: '762x406x508',
    },
  },
  {
    machine_id: 'cnc-002',
    display_name: 'Haas VF-2 Mill #2',
    manufacturer: 'Haas',
    model: 'VF-2',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'machining',
    work_cell: 'cell-01',
    operational_status: 'operational',
    capabilities: {
      spindle_rpm_max: 8100,
      axes: 3,
      tool_changer: true,
      simultaneous_axes: 3,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 15,
      rapid_traverse_mm_min: 25400,
      work_envelope: '762x406x508',
    },
  },
  {
    machine_id: 'cnc-003',
    display_name: 'DMG Mori NLX2500 Lathe #1',
    manufacturer: 'DMG Mori',
    model: 'NLX2500',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'turning',
    work_cell: 'cell-02',
    operational_status: 'operational',
    capabilities: {
      spindle_rpm_max: 4500,
      axes: 2,
      tool_changer: true,
      simultaneous_axes: 2,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 22,
      rapid_traverse_mm_min: 30000,
      work_envelope: '400x800x350',
    },
  },
  {
    machine_id: 'cnc-004',
    display_name: 'DMG Mori NLX2500 Lathe #2',
    manufacturer: 'DMG Mori',
    model: 'NLX2500',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'turning',
    work_cell: 'cell-02',
    operational_status: 'operational',
    capabilities: {
      spindle_rpm_max: 4500,
      axes: 2,
      tool_changer: true,
      simultaneous_axes: 2,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 22,
      rapid_traverse_mm_min: 30000,
      work_envelope: '400x800x350',
    },
  },
  {
    machine_id: 'cnc-005',
    display_name: 'Mazak Integrex i-300 Multi-Axis #1',
    manufacturer: 'Mazak',
    model: 'Integrex i-300',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'multi-axis',
    work_cell: 'cell-03',
    operational_status: 'operational',
    capabilities: {
      spindle_rpm_max: 6000,
      axes: 5,
      tool_changer: true,
      simultaneous_axes: 5,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 30,
      rapid_traverse_mm_min: 36000,
      work_envelope: '500x850x450',
    },
  },
  {
    machine_id: 'cnc-006',
    display_name: 'Mazak Integrex i-300 Multi-Axis #2',
    manufacturer: 'Mazak',
    model: 'Integrex i-300',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'multi-axis',
    work_cell: 'cell-03',
    operational_status: 'maintenance',
    capabilities: {
      spindle_rpm_max: 6000,
      axes: 5,
      tool_changer: true,
      simultaneous_axes: 5,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 30,
      rapid_traverse_mm_min: 36000,
      work_envelope: '500x850x450',
    },
  },
  {
    machine_id: 'cnc-007',
    display_name: 'Okuma Genos L250-E Lathe',
    manufacturer: 'Okuma',
    model: 'Genos L250-E',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'turning',
    work_cell: 'cell-04',
    operational_status: 'operational',
    capabilities: {
      spindle_rpm_max: 5000,
      axes: 2,
      tool_changer: true,
      simultaneous_axes: 2,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 18.5,
      rapid_traverse_mm_min: 24000,
      work_envelope: '350x780x300',
    },
  },
  {
    machine_id: 'cnc-008',
    display_name: 'Doosan DNM 500 Mill',
    manufacturer: 'Doosan',
    model: 'DNM 500',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'machining',
    work_cell: 'cell-05',
    operational_status: 'operational',
    capabilities: {
      spindle_rpm_max: 12000,
      axes: 3,
      tool_changer: true,
      simultaneous_axes: 3,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 11,
      rapid_traverse_mm_min: 36000,
      work_envelope: '500x400x330',
    },
  },
  {
    machine_id: 'cnc-009',
    display_name: 'Fanuc Robodrill α-T14iE Mill',
    manufacturer: 'Fanuc',
    model: 'Robodrill α-T14iE',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'precision',
    work_cell: 'cell-06',
    operational_status: 'operational',
    capabilities: {
      spindle_rpm_max: 24000,
      axes: 3,
      tool_changer: true,
      simultaneous_axes: 3,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 7.5,
      rapid_traverse_mm_min: 60000,
      work_envelope: '350x250x220',
    },
  },
  {
    machine_id: 'cnc-010',
    display_name: 'Mori Seiki NV5000 DCG Mill',
    manufacturer: 'Mori Seiki',
    model: 'NV5000 DCG',
    enterprise: 'uns-demo',
    site: 'factory-floor',
    area: 'precision',
    work_cell: 'cell-06',
    operational_status: 'offline',
    capabilities: {
      spindle_rpm_max: 15000,
      axes: 5,
      tool_changer: true,
      simultaneous_axes: 5,
      coolant_system: true,
    },
    specifications: {
      spindle_power_kw: 22,
      rapid_traverse_mm_min: 50000,
      work_envelope: '560x510x460',
    },
  },
];

/**
 * CNC Machine Data Generator class
 * Simulates realistic sensor data for individual machines
 */
export class CNCDataGenerator {
  private machine: CNCMachineConfig;
  private currentCycle: MachineOperationCycle;
  private lastUpdate: Date;
  private cycleStartTime: Date;
  private totalPartsProduced: number = 0;
  private toolWearFactors: Map<number, number> = new Map(); // tool_id -> wear_factor (0-1)
  private vibrationBaseline: number;
  private temperatureBaseline: number;

  constructor(machine: CNCMachineConfig) {
    this.machine = machine;
    this.lastUpdate = new Date();
    this.cycleStartTime = new Date();
    this.vibrationBaseline = Math.random() * 0.5 + 0.1; // 0.1-0.6 mm/s baseline
    this.temperatureBaseline = Math.random() * 10 + 45; // 45-55°C baseline
    
    // Initialize with idle state for operational machines
    this.currentCycle = this.initializeCycle();
    
    // Initialize tool wear factors for 20 tools
    for (let i = 1; i <= 20; i++) {
      this.toolWearFactors.set(i, Math.random() * 0.3); // 0-30% initial wear
    }
  }

  private initializeCycle(): MachineOperationCycle {
    if (this.machine.operational_status === 'maintenance') {
      return {
        phase: 'maintenance',
        duration: 3600, // 1 hour maintenance
        startTime: new Date(),
      };
    } else if (this.machine.operational_status === 'offline') {
      return {
        phase: 'idle',
        duration: Infinity, // Indefinite offline
        startTime: new Date(),
      };
    } else {
      // Start with idle phase for operational machines
      return {
        phase: 'idle',
        duration: Math.random() * 300 + 60, // 1-5 minutes idle
        startTime: new Date(),
      };
    }
  }

  /**
   * Updates the machine's operational cycle based on elapsed time
   */
  private updateCycle(): void {
    const now = new Date();
    const elapsedSeconds = (now.getTime() - this.currentCycle.startTime.getTime()) / 1000;

    if (elapsedSeconds >= this.currentCycle.duration) {
      // Cycle phase completed, move to next phase
      this.advanceCyclePhase();
    }
  }

  private advanceCyclePhase(): void {
    const now = new Date();
    
    switch (this.currentCycle.phase) {
      case 'idle':
        this.currentCycle = {
          phase: 'loading',
          duration: Math.random() * 120 + 30, // 30s-2.5min loading
          startTime: now,
        };
        break;
      case 'loading':
        this.currentCycle = {
          phase: 'machining',
          duration: Math.random() * 1800 + 600, // 10-40min machining
          startTime: now,
        };
        break;
      case 'machining':
        this.currentCycle = {
          phase: 'unloading',
          duration: Math.random() * 60 + 15, // 15s-1.25min unloading
          startTime: now,
        };
        this.totalPartsProduced++;
        break;
      case 'unloading':
        // Random chance of maintenance or error
        const random = Math.random();
        if (random < 0.05) { // 5% chance of error
          this.currentCycle = {
            phase: 'error',
            duration: Math.random() * 600 + 300, // 5-15min error resolution
            startTime: now,
          };
        } else if (random < 0.15) { // 10% chance of maintenance
          this.currentCycle = {
            phase: 'maintenance',
            duration: Math.random() * 3600 + 900, // 15min-1.25hr maintenance
            startTime: now,
          };
        } else {
          this.currentCycle = {
            phase: 'idle',
            duration: Math.random() * 300 + 60, // 1-5min idle
            startTime: now,
          };
        }
        break;
      case 'maintenance':
      case 'error':
        this.currentCycle = {
          phase: 'idle',
          duration: Math.random() * 300 + 60, // 1-5min idle after recovery
          startTime: now,
        };
        break;
    }
  }

  /**
   * Generates realistic sensor readings for the current machine state
   */
  public generateSensorReadings(): SensorReading[] {
    this.updateCycle();
    const now = new Date();
    const readings: SensorReading[] = [];

    // Base topic path for this machine
    const baseTopicPath = `${this.machine.enterprise}/${this.machine.site}/${this.machine.area}/${this.machine.work_cell}/${this.machine.machine_id}`;

    // Generate spindle speed data
    readings.push({
      topicPath: `${baseTopicPath}/info/sensors/spindle-speed`,
      payload: this.generateSpindleSpeedPayload(now),
    });

    // Generate spindle load data
    readings.push({
      topicPath: `${baseTopicPath}/info/sensors/spindle-load`,
      payload: this.generateSpindleLoadPayload(now),
    });

    // Generate axis positions (X, Y, Z for all machines, additional for multi-axis)
    const axisLabels = ['x', 'y', 'z', 'a', 'b', 'c'].slice(0, this.machine.capabilities.axes);
    axisLabels.forEach(axis => {
      readings.push({
        topicPath: `${baseTopicPath}/info/sensors/position-${axis}`,
        payload: this.generateAxisPositionPayload(axis, now),
      });
    });

    // Generate feedrate data
    readings.push({
      topicPath: `${baseTopicPath}/info/sensors/feedrate`,
      payload: this.generateFeedratePayload(now),
    });

    // Generate vibration data
    readings.push({
      topicPath: `${baseTopicPath}/info/sensors/vibration`,
      payload: this.generateVibrationPayload(now),
    });

    // Generate temperature data
    readings.push({
      topicPath: `${baseTopicPath}/info/sensors/temperature`,
      payload: this.generateTemperaturePayload(now),
    });

    // Generate tool data
    readings.push({
      topicPath: `${baseTopicPath}/info/sensors/current-tool`,
      payload: this.generateCurrentToolPayload(now),
    });

    // Generate coolant data
    if (this.machine.capabilities.coolant_system) {
      readings.push({
        topicPath: `${baseTopicPath}/info/sensors/coolant-pressure`,
        payload: this.generateCoolantPressurePayload(now),
      });
      
      readings.push({
        topicPath: `${baseTopicPath}/info/sensors/coolant-flow`,
        payload: this.generateCoolantFlowPayload(now),
      });
    }

    // Generate operational status data
    readings.push({
      topicPath: `${baseTopicPath}/info/status/operational`,
      payload: this.generateOperationalStatusPayload(now),
    });

    // Generate cycle information
    readings.push({
      topicPath: `${baseTopicPath}/info/status/cycle-phase`,
      payload: this.generateCyclePhasePayload(now),
    });

    // Generate production data
    readings.push({
      topicPath: `${baseTopicPath}/info/production/parts-count`,
      payload: this.generatePartsCountPayload(now),
    });

    // Generate efficiency metrics
    readings.push({
      topicPath: `${baseTopicPath}/info/production/efficiency`,
      payload: this.generateEfficiencyPayload(now),
    });

    this.lastUpdate = now;
    return readings;
  }

  private generateSpindleSpeedPayload(timestamp: Date): MQTTPayload {
    let rpm = 0;
    
    switch (this.currentCycle.phase) {
      case 'machining':
        // Variable RPM based on machining operation
        const baseRpm = this.machine.capabilities.spindle_rpm_max * (0.3 + Math.random() * 0.6);
        rpm = baseRpm + (Math.sin(Date.now() / 10000) * baseRpm * 0.1); // Small variation
        break;
      case 'loading':
      case 'unloading':
        rpm = this.machine.capabilities.spindle_rpm_max * 0.1; // Low speed positioning
        break;
      default:
        rpm = 0;
    }

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.max(0, Math.round(rpm)),
      unit: StandardUnits.RPM,
      quality: rpm > 0 ? 'good' : 'good',
      metadata: {
        max_rpm: this.machine.capabilities.spindle_rpm_max,
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateSpindleLoadPayload(timestamp: Date): MQTTPayload {
    let loadPercent = 0;
    
    switch (this.currentCycle.phase) {
      case 'machining':
        // Variable load based on cutting conditions
        loadPercent = 30 + Math.random() * 50 + Math.sin(Date.now() / 15000) * 20;
        break;
      case 'loading':
      case 'unloading':
        loadPercent = 5 + Math.random() * 10; // Light positioning load
        break;
      default:
        loadPercent = 0;
    }

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.max(0, Math.min(100, Math.round(loadPercent * 10) / 10)),
      unit: StandardUnits.PERCENT,
      quality: loadPercent > 95 ? 'uncertain' : 'good',
      metadata: {
        power_rating_kw: this.machine.specifications.spindle_power_kw,
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateAxisPositionPayload(axis: string, timestamp: Date): MQTTPayload {
    // Parse work envelope to get axis limits
    const envelope = this.machine.specifications.work_envelope;
    const dimensions = envelope.split('x').map(d => parseFloat(d));
    
    let maxPosition = 100; // default
    const axisIndex = ['x', 'y', 'z', 'a', 'b', 'c'].indexOf(axis.toLowerCase());
    if (axisIndex < dimensions.length) {
      maxPosition = dimensions[axisIndex];
    }

    let position = 0;
    
    switch (this.currentCycle.phase) {
      case 'machining':
        // Smooth movement within work envelope
        position = (maxPosition / 2) + Math.sin(Date.now() / 8000 + axisIndex) * (maxPosition * 0.3);
        break;
      case 'loading':
      case 'unloading':
        // Move to loading position
        position = axisIndex === 0 ? maxPosition * 0.1 : maxPosition * 0.5;
        break;
      default:
        // Home position
        position = 0;
    }

    // Rotary axes (A, B, C) have different ranges
    if (axisIndex >= 3) {
      position = (position / maxPosition) * 360 - 180; // -180 to +180 degrees
      maxPosition = 360;
    }

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.round(position * 100) / 100,
      unit: axisIndex >= 3 ? 'degrees' : StandardUnits.MILLIMETER,
      quality: 'good',
      metadata: {
        axis: axis.toUpperCase(),
        max_travel: maxPosition,
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateFeedratePayload(timestamp: Date): MQTTPayload {
    let feedrate = 0;
    
    switch (this.currentCycle.phase) {
      case 'machining':
        // Variable feedrate based on operation
        feedrate = 100 + Math.random() * 1500 + Math.sin(Date.now() / 12000) * 300;
        break;
      case 'loading':
      case 'unloading':
        feedrate = this.machine.specifications.rapid_traverse_mm_min * 0.1; // Slow positioning
        break;
      default:
        feedrate = 0;
    }

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.max(0, Math.round(feedrate)),
      unit: 'mm/min',
      quality: 'good',
      metadata: {
        rapid_traverse: this.machine.specifications.rapid_traverse_mm_min,
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateVibrationPayload(timestamp: Date): MQTTPayload {
    let vibration = this.vibrationBaseline;
    
    switch (this.currentCycle.phase) {
      case 'machining':
        // Higher vibration during cutting
        vibration += Math.random() * 2.0 + Math.sin(Date.now() / 3000) * 0.5;
        break;
      case 'error':
        // Abnormal vibration during errors
        vibration += Math.random() * 5.0;
        break;
      default:
        vibration += Math.random() * 0.2;
    }

    const quality = vibration > 5.0 ? 'bad' : vibration > 3.0 ? 'uncertain' : 'good';

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.round(vibration * 100) / 100,
      unit: 'mm/s',
      quality,
      metadata: {
        baseline: this.vibrationBaseline,
        threshold_warning: 3.0,
        threshold_alarm: 5.0,
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateTemperaturePayload(timestamp: Date): MQTTPayload {
    let temperature = this.temperatureBaseline;
    
    switch (this.currentCycle.phase) {
      case 'machining':
        // Higher temperature during cutting
        temperature += Math.random() * 20 + 10;
        break;
      case 'error':
        // Potentially high temperature during errors
        temperature += Math.random() * 30;
        break;
      default:
        temperature += Math.random() * 5;
    }

    const quality = temperature > 90 ? 'bad' : temperature > 75 ? 'uncertain' : 'good';

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.round(temperature * 10) / 10,
      unit: StandardUnits.CELSIUS,
      quality,
      metadata: {
        baseline: this.temperatureBaseline,
        threshold_warning: 75,
        threshold_alarm: 90,
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateCurrentToolPayload(timestamp: Date): MQTTPayload {
    let toolNumber = 1;
    
    if (this.currentCycle.phase === 'machining') {
      // Simulate tool changes during machining cycle
      const cycleProgress = (Date.now() - this.currentCycle.startTime.getTime()) / (this.currentCycle.duration * 1000);
      toolNumber = Math.floor(cycleProgress * 5) + 1; // Use tools 1-5 during cycle
    }

    const toolWear = this.toolWearFactors.get(toolNumber) || 0;

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: toolNumber,
      unit: 'tool_number',
      quality: toolWear > 0.8 ? 'uncertain' : 'good',
      metadata: {
        tool_wear_percent: Math.round(toolWear * 100),
        tool_life_remaining: Math.round((1 - toolWear) * 100),
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateCoolantPressurePayload(timestamp: Date): MQTTPayload {
    let pressure = 0;
    
    switch (this.currentCycle.phase) {
      case 'machining':
        pressure = 3.5 + Math.random() * 1.0 + Math.sin(Date.now() / 5000) * 0.2; // 3.5-4.5 bar
        break;
      case 'loading':
      case 'unloading':
        pressure = 2.0 + Math.random() * 0.5; // Lower pressure for positioning
        break;
      default:
        pressure = 0.5 + Math.random() * 0.3; // Standby pressure
    }

    const quality = pressure < 2.0 && this.currentCycle.phase === 'machining' ? 'bad' : 'good';

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.round(pressure * 10) / 10,
      unit: StandardUnits.BAR,
      quality,
      metadata: {
        min_operating_pressure: 2.0,
        nominal_pressure: 4.0,
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateCoolantFlowPayload(timestamp: Date): MQTTPayload {
    let flowRate = 0;
    
    switch (this.currentCycle.phase) {
      case 'machining':
        flowRate = 15 + Math.random() * 10 + Math.sin(Date.now() / 7000) * 3; // 15-25 L/min
        break;
      case 'loading':
      case 'unloading':
        flowRate = 5 + Math.random() * 3; // Lower flow for chip clearing
        break;
      default:
        flowRate = 1 + Math.random() * 2; // Minimal circulation
    }

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.round(flowRate * 10) / 10,
      unit: StandardUnits.LITERS_PER_MINUTE,
      quality: 'good',
      metadata: {
        nominal_flow: 20,
        phase: this.currentCycle.phase,
      },
    };
  }

  private generateOperationalStatusPayload(timestamp: Date): MQTTPayload {
    let status = this.machine.operational_status;
    
    // Map cycle phase to more detailed status
    let detailedStatus = status;
    if (status === 'operational') {
      switch (this.currentCycle.phase) {
        case 'machining':
          detailedStatus = 'running';
          break;
        case 'loading':
        case 'unloading':
          detailedStatus = 'setup';
          break;
        case 'idle':
          detailedStatus = 'idle';
          break;
        case 'error':
          detailedStatus = 'error';
          break;
        case 'maintenance':
          detailedStatus = 'maintenance';
          break;
      }
    }

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: detailedStatus,
      unit: 'status',
      quality: 'good',
      metadata: {
        base_status: this.machine.operational_status,
        cycle_phase: this.currentCycle.phase,
        uptime_hours: Math.round((Date.now() - this.cycleStartTime.getTime()) / 3600000),
      },
    };
  }

  private generateCyclePhasePayload(timestamp: Date): MQTTPayload {
    const elapsedSeconds = Math.round((Date.now() - this.currentCycle.startTime.getTime()) / 1000);
    const remainingSeconds = Math.max(0, Math.round(this.currentCycle.duration - elapsedSeconds));

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: this.currentCycle.phase,
      unit: 'phase',
      quality: 'good',
      metadata: {
        elapsed_seconds: elapsedSeconds,
        remaining_seconds: remainingSeconds,
        total_duration: Math.round(this.currentCycle.duration),
        progress_percent: Math.round((elapsedSeconds / this.currentCycle.duration) * 100),
      },
    };
  }

  private generatePartsCountPayload(timestamp: Date): MQTTPayload {
    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: this.totalPartsProduced,
      unit: 'parts',
      quality: 'good',
      metadata: {
        shift_start: this.cycleStartTime.toISOString(),
        parts_per_hour: Math.round(this.totalPartsProduced / ((Date.now() - this.cycleStartTime.getTime()) / 3600000) * 10) / 10,
      },
    };
  }

  private generateEfficiencyPayload(timestamp: Date): MQTTPayload {
    const totalRuntime = (Date.now() - this.cycleStartTime.getTime()) / 1000;
    let machiningTime = 0;
    
    // Estimate machining time based on cycle phase
    if (this.currentCycle.phase === 'machining') {
      machiningTime += (Date.now() - this.currentCycle.startTime.getTime()) / 1000;
    }
    
    // Add estimated previous machining cycles
    machiningTime += this.totalPartsProduced * 1200; // Assume 20 min avg per part
    
    const efficiency = Math.min(100, (machiningTime / totalRuntime) * 100);

    return {
      timestamp: timestamp.toISOString(),
      source: this.machine.machine_id,
      value: Math.round(efficiency * 10) / 10,
      unit: StandardUnits.PERCENT,
      quality: 'good',
      metadata: {
        machining_time_seconds: Math.round(machiningTime),
        total_runtime_seconds: Math.round(totalRuntime),
        target_efficiency: 75,
        current_phase: this.currentCycle.phase,
      },
    };
  }
}

/**
 * Factory class for managing multiple CNC machine data generators
 */
export class CNCDataGeneratorFactory {
  private generators: Map<string, CNCDataGenerator> = new Map();

  constructor() {
    // Initialize all machines
    CNC_MACHINES.forEach(machine => {
      this.generators.set(machine.machine_id, new CNCDataGenerator(machine));
    });
  }

  /**
   * Get generator for a specific machine
   */
  public getGenerator(machineId: string): CNCDataGenerator | undefined {
    return this.generators.get(machineId);
  }

  /**
   * Generate sensor readings for all machines
   */
  public generateAllReadings(): Map<string, SensorReading[]> {
    const allReadings = new Map<string, SensorReading[]>();
    
    this.generators.forEach((generator, machineId) => {
      allReadings.set(machineId, generator.generateSensorReadings());
    });
    
    return allReadings;
  }

  /**
   * Generate sensor readings for operational machines only
   */
  public generateOperationalReadings(): Map<string, SensorReading[]> {
    const operationalReadings = new Map<string, SensorReading[]>();
    
    this.generators.forEach((generator, machineId) => {
      const machine = CNC_MACHINES.find(m => m.machine_id === machineId);
      if (machine && machine.operational_status !== 'offline') {
        operationalReadings.set(machineId, generator.generateSensorReadings());
      }
    });
    
    return operationalReadings;
  }

  /**
   * Get all configured machines
   */
  public getMachines(): CNCMachineConfig[] {
    return CNC_MACHINES;
  }
}