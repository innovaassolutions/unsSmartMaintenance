/**
 * Contact Welder Maintenance Recommendation Engine
 * Intelligent maintenance planning based on predictive analytics and failure patterns
 * Provides actionable recommendations with cost-benefit analysis
 */

import type { ContactWelderFeatures } from './contact-welder-features';
import type { FailurePrediction } from './contact-welder-degradation-analysis';

interface MaintenanceAction {
  id: string;
  type: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  priority: 1 | 2 | 3 | 4 | 5;                    // 5 = immediate, 1 = routine
  category: 'ELECTRICAL' | 'MECHANICAL' | 'THERMAL' | 'PROCESS';
  
  // Action Details
  title: string;
  description: string;
  detailed_procedure: string[];
  safety_requirements: string[];
  
  // Resource Requirements
  estimated_duration_hours: number;
  required_parts: Array<{
    part_name: string;
    part_number?: string;
    quantity: number;
    estimated_cost: number;
    lead_time_days: number;
  }>;
  required_tools: string[];
  required_skills: string[];
  
  // Impact Analysis
  cost_estimate: number;                          // Total cost in USD
  downtime_hours: number;                         // Expected downtime
  risk_reduction_percentage: number;              // 0-100%
  quality_improvement_percentage: number;         // 0-100%
  energy_savings_percentage: number;              // 0-100%
  
  // Timing
  recommended_completion_date: Date;
  latest_completion_date: Date;
  optimal_maintenance_window: {
    start: Date;
    end: Date;
    reason: string;
  };
  
  // Dependencies
  prerequisites: string[];                        // Other actions that must be completed first
  related_actions: string[];                      // Actions that can be done together
  
  // Justification
  failure_indicators: string[];
  expected_benefits: string[];
  consequences_of_delay: string[];
}

interface MaintenancePlan {
  machine_id: string;
  plan_generation_date: Date;
  plan_horizon_days: number;
  
  // Executive Summary
  total_estimated_cost: number;
  total_estimated_downtime: number;
  overall_risk_reduction: number;
  expected_roi_percentage: number;                // Return on investment
  
  // Action Plan
  immediate_actions: MaintenanceAction[];         // Next 7 days
  short_term_actions: MaintenanceAction[];       // 1-4 weeks
  medium_term_actions: MaintenanceAction[];      // 1-3 months
  long_term_actions: MaintenanceAction[];        // 3+ months
  
  // Scheduling Optimization
  optimized_schedule: Array<{
    week_start: Date;
    week_end: Date;
    planned_actions: MaintenanceAction[];
    total_downtime_hours: number;
    total_cost: number;
    production_impact: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT';
  }>;
  
  // Cost-Benefit Analysis
  cost_benefit_analysis: {
    total_maintenance_cost: number;
    avoided_failure_cost: number;
    productivity_improvement_value: number;
    net_benefit: number;
    payback_period_months: number;
  };
  
  // Risk Assessment
  risk_factors: Array<{
    factor: string;
    current_risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    risk_after_maintenance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    mitigation_actions: string[];
  }>;
}

interface MaintenanceKnowledgeBase {
  failure_patterns: Record<string, {
    typical_causes: string[];
    recommended_actions: string[];
    prevention_strategies: string[];
    cost_impact: { min: number; max: number };
  }>;
  
  component_lifecycles: Record<string, {
    normal_lifespan_cycles: number;
    warning_threshold_cycles: number;
    replacement_indicators: string[];
    maintenance_schedule: string[];
  }>;
  
  seasonal_considerations: Record<string, {
    season: 'SPRING' | 'SUMMER' | 'FALL' | 'WINTER';
    recommended_actions: string[];
    special_considerations: string[];
  }>;
}

export class ContactWelderMaintenanceEngine {
  private knowledgeBase: MaintenanceKnowledgeBase;
  
  constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  /**
   * Generate comprehensive maintenance plan for Contact Welder
   */
  async generateMaintenancePlan(
    machineId: string,
    currentFeatures: ContactWelderFeatures,
    failurePrediction: FailurePrediction,
    historicalMaintenanceData?: any[]
  ): Promise<MaintenancePlan> {
    
    console.log(`🔧 Generating maintenance plan for Contact Welder ${machineId}`);
    
    // Step 1: Analyze current condition and generate actions
    const allActions = await this.generateMaintenanceActions(
      machineId,
      currentFeatures,
      failurePrediction
    );
    
    // Step 2: Prioritize and categorize actions by timeframe
    const categorizedActions = this.categorizeActionsByTimeframe(allActions);
    
    // Step 3: Optimize scheduling
    const optimizedSchedule = this.optimizeMaintenanceSchedule(
      categorizedActions,
      failurePrediction.prediction_horizon_days
    );
    
    // Step 4: Perform cost-benefit analysis
    const costBenefitAnalysis = this.performCostBenefitAnalysis(
      allActions,
      currentFeatures,
      failurePrediction
    );
    
    // Step 5: Assess risk factors
    const riskFactors = this.assessRiskFactors(currentFeatures, failurePrediction, allActions);
    
    // Step 6: Compile final plan
    const plan: MaintenancePlan = {
      machine_id: machineId,
      plan_generation_date: new Date(),
      plan_horizon_days: failurePrediction.prediction_horizon_days,
      
      total_estimated_cost: allActions.reduce((sum, action) => sum + action.cost_estimate, 0),
      total_estimated_downtime: allActions.reduce((sum, action) => sum + action.downtime_hours, 0),
      overall_risk_reduction: this.calculateOverallRiskReduction(allActions),
      expected_roi_percentage: costBenefitAnalysis.net_benefit > 0 ? 
        (costBenefitAnalysis.net_benefit / costBenefitAnalysis.total_maintenance_cost) * 100 : 0,
      
      immediate_actions: categorizedActions.immediate,
      short_term_actions: categorizedActions.short_term,
      medium_term_actions: categorizedActions.medium_term,
      long_term_actions: categorizedActions.long_term,
      
      optimized_schedule: optimizedSchedule,
      cost_benefit_analysis: costBenefitAnalysis,
      risk_factors: riskFactors
    };

    console.log(`✅ Maintenance plan generated: ${allActions.length} actions, $${plan.total_estimated_cost} total cost`);
    return plan;
  }

  /**
   * Generate specific maintenance actions based on current condition
   */
  private async generateMaintenanceActions(
    machineId: string,
    features: ContactWelderFeatures,
    prediction: FailurePrediction
  ): Promise<MaintenanceAction[]> {
    const actions: MaintenanceAction[] = [];
    const now = new Date();

    // 1. Contact Resistance Actions
    if (features.resistance_degradation_index > 0.7) {
      const priority = features.resistance_degradation_index > 0.9 ? 5 : 4;
      const daysUntilCompletion = priority === 5 ? 1 : 3;
      
      actions.push({
        id: `${machineId}-contact-replacement-${Date.now()}`,
        type: priority === 5 ? 'EMERGENCY' : 'PREDICTIVE',
        priority: priority as 5 | 4,
        category: 'ELECTRICAL',
        
        title: 'Replace Contact Tips and Electrode Assembly',
        description: 'Critical contact resistance degradation detected requiring immediate tip replacement',
        detailed_procedure: [
          'Power down and lockout Contact Welder system',
          'Allow cooling period of 30 minutes minimum',
          'Remove worn contact tips using proper extraction tools',
          'Clean electrode surfaces with approved cleaning solution',
          'Install new contact tips with proper torque specifications',
          'Apply thread locker to prevent loosening',
          'Verify electrical continuity and resistance measurements',
          'Perform test weld cycle and quality inspection',
          'Update maintenance records and reset cycle counters'
        ],
        safety_requirements: [
          'Lockout/tagout procedures required',
          'Personal protective equipment (PPE) mandatory',
          'Ensure proper ventilation during cleaning',
          'Use insulated tools only',
          'Verify power isolation before work begins'
        ],
        
        estimated_duration_hours: 4,
        required_parts: [
          {
            part_name: 'Contact Tips (Set of 2)',
            part_number: 'CW-TIP-001',
            quantity: 1,
            estimated_cost: 150,
            lead_time_days: 1
          },
          {
            part_name: 'Electrode Assembly',
            part_number: 'CW-ELEC-ASSY-001',
            quantity: 1,
            estimated_cost: 300,
            lead_time_days: 3
          },
          {
            part_name: 'Thread Locker',
            quantity: 1,
            estimated_cost: 25,
            lead_time_days: 0
          }
        ],
        required_tools: ['Torque wrench', 'Extraction tools', 'Multimeter', 'Cleaning supplies'],
        required_skills: ['Electrical maintenance', 'Contact welder systems'],
        
        cost_estimate: 475,
        downtime_hours: 4,
        risk_reduction_percentage: 85,
        quality_improvement_percentage: 40,
        energy_savings_percentage: 15,
        
        recommended_completion_date: new Date(now.getTime() + daysUntilCompletion * 24 * 60 * 60 * 1000),
        latest_completion_date: new Date(now.getTime() + (daysUntilCompletion + 2) * 24 * 60 * 60 * 1000),
        optimal_maintenance_window: {
          start: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 72 * 60 * 60 * 1000),
          reason: 'Weekend production window with minimal impact'
        },
        
        prerequisites: [],
        related_actions: ['electrical-calibration', 'cooling-inspection'],
        
        failure_indicators: ['High contact resistance', 'Excessive heat generation', 'Poor weld quality'],
        expected_benefits: [
          'Restore optimal electrical conductivity',
          'Eliminate overheating issues',
          'Improve weld consistency and quality',
          'Prevent catastrophic failure'
        ],
        consequences_of_delay: [
          'Complete electrode failure within 7 days',
          'Potential fire hazard from overheating',
          'Significant production quality issues',
          'Emergency replacement at 3x cost'
        ]
      });
    }

    // 2. Thermal Management Actions
    if (features.thermal_stress_index > 0.6) {
      const priority = features.thermal_stress_index > 0.8 ? 4 : 3;
      
      actions.push({
        id: `${machineId}-thermal-maintenance-${Date.now()}`,
        type: 'PREDICTIVE',
        priority: priority as 4 | 3,
        category: 'THERMAL',
        
        title: 'Cooling System Inspection and Service',
        description: 'Elevated thermal stress requiring cooling system maintenance',
        detailed_procedure: [
          'Check coolant levels and top off if necessary',
          'Inspect cooling lines for leaks or blockages',
          'Clean heat exchanger surfaces',
          'Test coolant flow rate and pressure',
          'Replace coolant filter if contaminated',
          'Verify temperature sensor calibration',
          'Check thermal protection system operation'
        ],
        safety_requirements: [
          'Handle coolant with appropriate PPE',
          'Follow environmental disposal procedures',
          'Verify system pressure before service'
        ],
        
        estimated_duration_hours: 2,
        required_parts: [
          {
            part_name: 'Coolant Filter',
            quantity: 1,
            estimated_cost: 50,
            lead_time_days: 1
          },
          {
            part_name: 'Coolant (1 gallon)',
            quantity: 1,
            estimated_cost: 75,
            lead_time_days: 0
          }
        ],
        required_tools: ['Pressure gauge', 'Flow meter', 'Cleaning supplies'],
        required_skills: ['Cooling systems', 'Basic mechanical maintenance'],
        
        cost_estimate: 125,
        downtime_hours: 2,
        risk_reduction_percentage: 60,
        quality_improvement_percentage: 25,
        energy_savings_percentage: 10,
        
        recommended_completion_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        latest_completion_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        optimal_maintenance_window: {
          start: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 9 * 24 * 60 * 60 * 1000),
          reason: 'Scheduled maintenance window'
        },
        
        prerequisites: [],
        related_actions: ['contact-replacement'],
        
        failure_indicators: ['High operating temperature', 'Thermal cycling stress'],
        expected_benefits: [
          'Maintain optimal operating temperature',
          'Prevent thermal damage to components',
          'Improve system reliability'
        ],
        consequences_of_delay: [
          'Accelerated component degradation',
          'Reduced component lifespan',
          'Potential thermal protection shutdown'
        ]
      });
    }

    // 3. Electrical System Calibration
    if (features.electrical_health_score < 0.7) {
      actions.push({
        id: `${machineId}-electrical-calibration-${Date.now()}`,
        type: 'PREVENTIVE',
        priority: 3,
        category: 'ELECTRICAL',
        
        title: 'Electrical System Calibration and Testing',
        description: 'Electrical parameter drift requiring recalibration',
        detailed_procedure: [
          'Perform baseline electrical measurements',
          'Calibrate current control system',
          'Adjust voltage regulation parameters',
          'Test weld parameter consistency',
          'Update control system parameters',
          'Verify safety interlocks operation',
          'Document new parameter settings'
        ],
        safety_requirements: [
          'Qualified electrician required',
          'Lockout/tagout procedures',
          'Use appropriate electrical safety equipment'
        ],
        
        estimated_duration_hours: 3,
        required_parts: [],
        required_tools: ['Calibration equipment', 'Electrical meters', 'Parameter adjustment tools'],
        required_skills: ['Electrical calibration', 'Control systems'],
        
        cost_estimate: 200,
        downtime_hours: 3,
        risk_reduction_percentage: 40,
        quality_improvement_percentage: 35,
        energy_savings_percentage: 20,
        
        recommended_completion_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        latest_completion_date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        optimal_maintenance_window: {
          start: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000),
          reason: 'Best performed after contact replacement'
        },
        
        prerequisites: ['contact-replacement'],
        related_actions: [],
        
        failure_indicators: ['Parameter drift', 'Inconsistent weld quality'],
        expected_benefits: [
          'Restore optimal welding parameters',
          'Improve process consistency',
          'Optimize energy efficiency'
        ],
        consequences_of_delay: [
          'Continued quality degradation',
          'Higher energy consumption',
          'Increased wear on components'
        ]
      });
    }

    // 4. Process Stability Optimization
    if (features.process_stability_score < 0.8) {
      actions.push({
        id: `${machineId}-process-optimization-${Date.now()}`,
        type: 'PREVENTIVE',
        priority: 2,
        category: 'PROCESS',
        
        title: 'Process Parameter Optimization',
        description: 'Fine-tune welding parameters for improved stability',
        detailed_procedure: [
          'Analyze process variation patterns',
          'Adjust timing parameters',
          'Optimize pressure settings',
          'Fine-tune current ramping profiles',
          'Test parameter changes with sample parts',
          'Document optimized settings',
          'Train operators on new parameters'
        ],
        safety_requirements: [
          'Follow standard operating procedures',
          'Use proper PPE during testing'
        ],
        
        estimated_duration_hours: 4,
        required_parts: [],
        required_tools: ['Process monitoring equipment', 'Test samples'],
        required_skills: ['Process engineering', 'Statistical analysis'],
        
        cost_estimate: 150,
        downtime_hours: 2,
        risk_reduction_percentage: 25,
        quality_improvement_percentage: 30,
        energy_savings_percentage: 5,
        
        recommended_completion_date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
        latest_completion_date: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
        optimal_maintenance_window: {
          start: new Date(now.getTime() + 19 * 24 * 60 * 60 * 1000),
          end: new Date(now.getTime() + 23 * 24 * 60 * 60 * 1000),
          reason: 'After electrical calibration completion'
        },
        
        prerequisites: ['electrical-calibration'],
        related_actions: [],
        
        failure_indicators: ['Process variation', 'Inconsistent weld quality'],
        expected_benefits: [
          'Improved process repeatability',
          'Enhanced product quality',
          'Reduced operator intervention'
        ],
        consequences_of_delay: [
          'Continued quality variation',
          'Higher scrap rates',
          'Customer quality complaints'
        ]
      });
    }

    return actions;
  }

  /**
   * Categorize actions by timeframe
   */
  private categorizeActionsByTimeframe(actions: MaintenanceAction[]): {
    immediate: MaintenanceAction[];
    short_term: MaintenanceAction[];
    medium_term: MaintenanceAction[];
    long_term: MaintenanceAction[];
  } {
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const fourWeeks = 28 * 24 * 60 * 60 * 1000;
    const threeMonths = 90 * 24 * 60 * 60 * 1000;

    return {
      immediate: actions.filter(action => 
        action.recommended_completion_date.getTime() - now.getTime() <= oneWeek
      ),
      short_term: actions.filter(action => {
        const timeToCompletion = action.recommended_completion_date.getTime() - now.getTime();
        return timeToCompletion > oneWeek && timeToCompletion <= fourWeeks;
      }),
      medium_term: actions.filter(action => {
        const timeToCompletion = action.recommended_completion_date.getTime() - now.getTime();
        return timeToCompletion > fourWeeks && timeToCompletion <= threeMonths;
      }),
      long_term: actions.filter(action => {
        const timeToCompletion = action.recommended_completion_date.getTime() - now.getTime();
        return timeToCompletion > threeMonths;
      })
    };
  }

  /**
   * Optimize maintenance scheduling
   */
  private optimizeMaintenanceSchedule(
    categorizedActions: any,
    horizonDays: number
  ): MaintenancePlan['optimized_schedule'] {
    const schedule = [];
    const now = new Date();
    const weeksInHorizon = Math.ceil(horizonDays / 7);
    
    // Combine all actions and sort by priority and date
    const allActions = [
      ...categorizedActions.immediate,
      ...categorizedActions.short_term,
      ...categorizedActions.medium_term,
      ...categorizedActions.long_term
    ].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.recommended_completion_date.getTime() - b.recommended_completion_date.getTime();
    });

    // Assign actions to optimal weeks
    for (let week = 1; week <= weeksInHorizon; week++) {
      const weekStart = new Date(now.getTime() + (week - 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const weekActions = allActions.filter(action => 
        action.recommended_completion_date >= weekStart && 
        action.recommended_completion_date <= weekEnd
      );

      if (weekActions.length > 0) {
        const totalDowntime = weekActions.reduce((sum, action) => sum + action.downtime_hours, 0);
        const totalCost = weekActions.reduce((sum, action) => sum + action.cost_estimate, 0);
        
        let productionImpact: 'MINIMAL' | 'MODERATE' | 'SIGNIFICANT' = 'MINIMAL';
        if (totalDowntime > 16) productionImpact = 'SIGNIFICANT';
        else if (totalDowntime > 8) productionImpact = 'MODERATE';

        schedule.push({
          week_start: weekStart,
          week_end: weekEnd,
          planned_actions: weekActions,
          total_downtime_hours: totalDowntime,
          total_cost: totalCost,
          production_impact: productionImpact
        });
      }
    }

    return schedule;
  }

  /**
   * Perform cost-benefit analysis
   */
  private performCostBenefitAnalysis(
    actions: MaintenanceAction[],
    features: ContactWelderFeatures,
    prediction: FailurePrediction
  ): MaintenancePlan['cost_benefit_analysis'] {
    const totalMaintenanceCost = actions.reduce((sum, action) => sum + action.cost_estimate, 0);
    
    // Estimate avoided failure costs
    const failureCostEstimate = this.estimateFailureCost(features, prediction);
    const failureProbability = prediction.failure_probability_28_days / 100;
    const avoidedFailureCost = failureCostEstimate * failureProbability;
    
    // Estimate productivity improvements
    const averageQualityImprovement = actions.reduce((sum, action) => 
      sum + action.quality_improvement_percentage, 0) / actions.length;
    const productivityImprovementValue = averageQualityImprovement * 10000; // $10k per 1% quality improvement
    
    const netBenefit = avoidedFailureCost + productivityImprovementValue - totalMaintenanceCost;
    const paybackPeriod = netBenefit > 0 ? (totalMaintenanceCost / (netBenefit / 12)) : Infinity;

    return {
      total_maintenance_cost: totalMaintenanceCost,
      avoided_failure_cost: avoidedFailureCost,
      productivity_improvement_value: productivityImprovementValue,
      net_benefit: netBenefit,
      payback_period_months: Math.min(60, paybackPeriod)
    };
  }

  /**
   * Assess risk factors
   */
  private assessRiskFactors(
    features: ContactWelderFeatures,
    prediction: FailurePrediction,
    actions: MaintenanceAction[]
  ): MaintenancePlan['risk_factors'] {
    const factors = [];

    // Contact resistance risk
    if (features.resistance_degradation_index > 0.5) {
      const currentRisk = features.resistance_degradation_index > 0.8 ? 'CRITICAL' : 
                         features.resistance_degradation_index > 0.6 ? 'HIGH' : 'MEDIUM';
      const riskAfterMaintenance = actions.some(a => a.category === 'ELECTRICAL') ? 'LOW' : currentRisk;
      
      factors.push({
        factor: 'Contact Resistance Degradation',
        current_risk_level: currentRisk,
        risk_after_maintenance: riskAfterMaintenance,
        mitigation_actions: actions.filter(a => a.category === 'ELECTRICAL').map(a => a.title)
      });
    }

    // Thermal stress risk
    if (features.thermal_stress_index > 0.4) {
      const currentRisk = features.thermal_stress_index > 0.7 ? 'HIGH' : 'MEDIUM';
      const riskAfterMaintenance = actions.some(a => a.category === 'THERMAL') ? 'LOW' : currentRisk;
      
      factors.push({
        factor: 'Thermal Stress',
        current_risk_level: currentRisk,
        risk_after_maintenance: riskAfterMaintenance,
        mitigation_actions: actions.filter(a => a.category === 'THERMAL').map(a => a.title)
      });
    }

    return factors;
  }

  /**
   * Calculate overall risk reduction
   */
  private calculateOverallRiskReduction(actions: MaintenanceAction[]): number {
    if (actions.length === 0) return 0;
    
    // Weight risk reductions by priority
    const weightedReduction = actions.reduce((sum, action) => {
      const weight = action.priority / 5; // Normalize priority to 0-1
      return sum + (action.risk_reduction_percentage * weight);
    }, 0);
    
    return Math.min(100, weightedReduction / actions.length);
  }

  /**
   * Estimate failure cost
   */
  private estimateFailureCost(
    features: ContactWelderFeatures,
    prediction: FailurePrediction
  ): number {
    let baseCost = 5000; // Base failure cost
    
    // Adjust based on severity
    if (features.resistance_degradation_index > 0.8) baseCost *= 2;
    if (features.thermal_stress_index > 0.7) baseCost *= 1.5;
    if (prediction.failure_probability_14_days > 80) baseCost *= 1.8;
    
    return baseCost;
  }

  /**
   * Initialize maintenance knowledge base
   */
  private initializeKnowledgeBase(): MaintenanceKnowledgeBase {
    return {
      failure_patterns: {
        resistance_degradation: {
          typical_causes: ['Contact tip wear', 'Electrode contamination', 'Poor electrical connections'],
          recommended_actions: ['Replace contact tips', 'Clean electrodes', 'Check connections'],
          prevention_strategies: ['Regular inspection', 'Proper material handling', 'Scheduled replacement'],
          cost_impact: { min: 200, max: 2000 }
        },
        thermal_overload: {
          typical_causes: ['Cooling system failure', 'Blocked air flow', 'Excessive duty cycle'],
          recommended_actions: ['Service cooling system', 'Clear blockages', 'Adjust duty cycle'],
          prevention_strategies: ['Regular cooling maintenance', 'Monitor temperatures', 'Proper scheduling'],
          cost_impact: { min: 150, max: 1500 }
        }
      },
      
      component_lifecycles: {
        contact_tips: {
          normal_lifespan_cycles: 50000,
          warning_threshold_cycles: 40000,
          replacement_indicators: ['High resistance', 'Physical wear', 'Poor weld quality'],
          maintenance_schedule: ['Inspect every 1000 cycles', 'Replace every 40000 cycles']
        },
        cooling_system: {
          normal_lifespan_cycles: 500000,
          warning_threshold_cycles: 400000,
          replacement_indicators: ['Low flow rate', 'High temperature', 'Coolant contamination'],
          maintenance_schedule: ['Check monthly', 'Service quarterly', 'Replace coolant annually']
        }
      },
      
      seasonal_considerations: {
        summer: {
          season: 'SUMMER',
          recommended_actions: ['Enhanced cooling maintenance', 'Monitor ambient temperature'],
          special_considerations: ['Higher cooling loads', 'Increased maintenance frequency']
        },
        winter: {
          season: 'WINTER',
          recommended_actions: ['Check heating systems', 'Monitor condensation'],
          special_considerations: ['Cold start procedures', 'Condensation prevention']
        }
      }
    };
  }
}

export default ContactWelderMaintenanceEngine;