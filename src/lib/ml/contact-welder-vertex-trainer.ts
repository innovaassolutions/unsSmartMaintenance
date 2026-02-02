/**
 * Contact Welder Vertex AI Model Training
 * Multi-variate anomaly detection and failure prediction using Google Cloud Vertex AI
 * Handles 20.7M records across 4 sensor types for 2-4 week failure prediction
 */

import { BigQuery } from '@google-cloud/bigquery';
import { GoogleAuth } from 'google-auth-library';
import { ContactWelderDataPipeline } from './contact-welder-data-pipeline';
import type { ContactWelderFeatures } from './contact-welder-features';

interface ModelTrainingConfig {
  projectId: string;
  region: string;
  datasetId: string;
  modelDisplayName: string;
  trainingBudgetMilliNodeHours: number;
  optimizationObjective: 'minimize-log-loss' | 'maximize-au-roc' | 'maximize-au-prc';
  validationFraction: number;
  testFraction: number;
}

interface TrainingJob {
  name: string;
  displayName: string;
  state: 'JOB_STATE_PENDING' | 'JOB_STATE_RUNNING' | 'JOB_STATE_SUCCEEDED' | 'JOB_STATE_FAILED';
  startTime: string;
  endTime?: string;
  error?: any;
  modelId?: string;
  modelVersionId?: string;
}

interface ModelEvaluation {
  auRoc: number;
  auPrc: number;
  logLoss: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  confusionMatrix: number[][];
  featureImportance: Array<{
    feature: string;
    importance: number;
  }>;
}

interface PredictionEndpoint {
  name: string;
  displayName: string;
  deployedModels: Array<{
    id: string;
    model: string;
    displayName: string;
    createTime: string;
  }>;
}

export class ContactWelderVertexTrainer {
  private auth: GoogleAuth;
  private bigQuery: BigQuery;
  private dataPipeline: ContactWelderDataPipeline;
  private config: ModelTrainingConfig;

  constructor(config?: Partial<ModelTrainingConfig>) {
    this.auth = new GoogleAuth({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    this.bigQuery = new BigQuery({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });

    this.dataPipeline = new ContactWelderDataPipeline();

    this.config = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'uns-smart-maintenance-ml',
      region: 'us-central1',
      datasetId: 'relay_manufacturing',
      modelDisplayName: 'contact-welder-failure-prediction-v1',
      trainingBudgetMilliNodeHours: 8000, // 8 node hours for AutoML
      optimizationObjective: 'maximize-au-roc',
      validationFraction: 0.2,
      testFraction: 0.1,
      ...config
    };
  }

  /**
   * Complete end-to-end model training pipeline
   */
  async trainContactWelderModel(): Promise<{
    trainingJob: TrainingJob;
    evaluation: ModelEvaluation | null;
    endpoint: PredictionEndpoint | null;
  }> {
    console.log('🚀 Starting Contact Welder ML Model Training Pipeline...');
    
    try {
      // Step 1: Prepare training dataset
      console.log('📊 Step 1: Preparing training dataset...');
      const dataset = await this.dataPipeline.prepareTrainingDataset();
      console.log(`✅ Dataset prepared: ${dataset.features.length} samples across ${dataset.metadata.machineCount} machines`);

      // Step 2: Export dataset to BigQuery ML format
      console.log('📤 Step 2: Exporting to BigQuery ML format...');
      const trainingTableId = await this.dataPipeline.exportToMLDataset(dataset, 'training');
      console.log(`✅ Training data exported to ${trainingTableId}`);

      // Step 3: Create AutoML training job
      console.log('🤖 Step 3: Creating AutoML training job...');
      const trainingJob = await this.createAutoMLTrainingJob(trainingTableId);
      console.log(`✅ Training job created: ${trainingJob.name}`);

      // Step 4: Monitor training progress
      console.log('⏳ Step 4: Monitoring training progress...');
      const completedJob = await this.monitorTrainingJob(trainingJob.name);
      console.log(`✅ Training completed with state: ${completedJob.state}`);

      // Step 5: Evaluate model performance
      let evaluation: ModelEvaluation | null = null;
      if (completedJob.state === 'JOB_STATE_SUCCEEDED' && completedJob.modelId) {
        console.log('📈 Step 5: Evaluating model performance...');
        evaluation = await this.evaluateModel(completedJob.modelId);
        console.log(`✅ Model evaluation complete - AUC-ROC: ${evaluation?.auRoc.toFixed(3)}`);
      }

      // Step 6: Deploy model to endpoint
      let endpoint: PredictionEndpoint | null = null;
      if (evaluation && evaluation.auRoc >= 0.85) { // Only deploy if model performance is good
        console.log('🚀 Step 6: Deploying model to prediction endpoint...');
        endpoint = await this.deployModel(completedJob.modelId!);
        console.log(`✅ Model deployed to endpoint: ${endpoint?.name}`);
      } else {
        console.log('⚠️ Model performance below threshold (AUC-ROC < 0.85), skipping deployment');
      }

      return { trainingJob: completedJob, evaluation, endpoint };

    } catch (error) {
      console.error('❌ Training pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Create AutoML Tables training job for Contact Welder failure prediction
   */
  private async createAutoMLTrainingJob(trainingTableId: string): Promise<TrainingJob> {
    const client = await this.auth.getClient();
    const parent = `projects/${this.config.projectId}/locations/${this.config.region}`;
    
    const trainingJobSpec = {
      displayName: this.config.modelDisplayName,
      inputDataConfig: {
        bigquerySource: {
          uri: `bq://${trainingTableId}`
        },
        gcsSource: null
      },
      modelToUpload: {
        displayName: this.config.modelDisplayName,
        description: 'Contact Welder failure prediction using multi-variate sensor analysis',
        predictionSchemaUri: '', // AutoML will infer
        versionDescription: 'Initial training on 20.7M sensor records',
        labels: {
          'model-type': 'contact-welder-prediction',
          'version': 'v1',
          'sensors': 'resistance-current-voltage-temperature'
        }
      },
      trainingTaskDefinition: 'gs://google-cloud-aiplatform/schema/trainingjob/definition/automl_tables_1.0.0.yaml',
      trainingTaskInputs: {
        targetColumn: 'failure_within_window', // Binary classification target
        predictionType: 'classification',
        optimizationObjective: this.config.optimizationObjective,
        budgetMilliNodeHours: this.config.trainingBudgetMilliNodeHours,
        disableEarlyStopping: false,
        
        // Advanced AutoML configuration for Contact Welder specifics
        transformations: [
          {
            auto: {
              columnName: 'resistance_degradation_index'
            }
          },
          {
            auto: {
              columnName: 'electrical_health_score'
            }
          },
          {
            auto: {
              columnName: 'thermal_stress_index'
            }
          },
          {
            auto: {
              columnName: 'process_stability_score'
            }
          },
          {
            categorical: {
              columnName: 'machine_id'
            }
          },
          {
            timestamp: {
              columnName: 'timestamp'
            }
          }
        ],
        
        // Data split configuration
        datasetSplit: {
          trainingFraction: 1.0 - this.config.validationFraction - this.config.testFraction,
          validationFraction: this.config.validationFraction,
          testFraction: this.config.testFraction
        },
        
        // Additional training parameters for time-series nature
        additionalExperiments: [
          'enable_early_stopping',
          'enable_feature_selection',
          'enable_ensemble_stacking'
        ]
      }
    };

    const url = `https://${this.config.region}-aiplatform.googleapis.com/v1/${parent}/trainingPipelines`;
    
    const response = await client.request({
      url,
      method: 'POST',
      data: trainingJobSpec
    });

    return {
      name: response.data.name,
      displayName: response.data.displayName,
      state: response.data.state,
      startTime: response.data.startTime || new Date().toISOString()
    };
  }

  /**
   * Monitor training job progress until completion
   */
  private async monitorTrainingJob(jobName: string): Promise<TrainingJob> {
    const client = await this.auth.getClient();
    const url = `https://${this.config.region}-aiplatform.googleapis.com/v1/${jobName}`;
    
    let job: TrainingJob;
    let attempts = 0;
    const maxAttempts = 360; // 6 hours with 1-minute intervals
    
    do {
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
      
      const response = await client.request({ url, method: 'GET' });
      job = {
        name: response.data.name,
        displayName: response.data.displayName,
        state: response.data.state,
        startTime: response.data.startTime,
        endTime: response.data.endTime,
        error: response.data.error,
        modelId: response.data.modelToUpload?.name,
        modelVersionId: response.data.modelToUpload?.versionId
      };
      
      console.log(`⏳ Training job ${job.state} (attempt ${attempts + 1}/${maxAttempts})`);
      attempts++;
      
    } while (
      job.state === 'JOB_STATE_PENDING' || 
      job.state === 'JOB_STATE_RUNNING' && 
      attempts < maxAttempts
    );

    if (attempts >= maxAttempts) {
      throw new Error('Training job timeout after 6 hours');
    }

    if (job.state === 'JOB_STATE_FAILED') {
      throw new Error(`Training job failed: ${JSON.stringify(job.error)}`);
    }

    return job;
  }

  /**
   * Evaluate trained model performance
   */
  private async evaluateModel(modelId: string): Promise<ModelEvaluation> {
    const client = await this.auth.getClient();
    const url = `https://${this.config.region}-aiplatform.googleapis.com/v1/${modelId}/evaluations`;
    
    const response = await client.request({ url, method: 'GET' });
    const evaluation = response.data.modelEvaluations[0];
    
    if (!evaluation) {
      throw new Error('No model evaluation found');
    }

    // Extract metrics for binary classification
    const metrics = evaluation.metrics;
    const auRoc = metrics.auRoc || 0;
    const auPrc = metrics.auPrc || 0;
    const logLoss = metrics.logLoss || 1;
    
    // Calculate additional metrics from confusion matrix
    const confusionMatrix = metrics.confusionMatrix || [[0, 0], [0, 0]];
    const [tn, fp, fn, tp] = [
      confusionMatrix[0][0], confusionMatrix[0][1],
      confusionMatrix[1][0], confusionMatrix[1][1]
    ];
    
    const accuracy = (tp + tn) / (tp + tn + fp + fn);
    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    
    // Extract feature importance
    const featureImportance = (metrics.featureAttributions || []).map((attr: any) => ({
      feature: attr.featureName,
      importance: attr.attribution
    })).sort((a: any, b: any) => b.importance - a.importance);

    return {
      auRoc,
      auPrc,
      logLoss,
      accuracy,
      precision,
      recall,
      f1Score,
      confusionMatrix,
      featureImportance
    };
  }

  /**
   * Deploy trained model to prediction endpoint
   */
  private async deployModel(modelId: string): Promise<PredictionEndpoint> {
    const client = await this.auth.getClient();
    const parent = `projects/${this.config.projectId}/locations/${this.config.region}`;
    
    // Step 1: Create endpoint
    const endpointSpec = {
      displayName: `${this.config.modelDisplayName}-endpoint`,
      description: 'Real-time Contact Welder failure prediction endpoint',
      labels: {
        'model-type': 'contact-welder-prediction',
        'environment': 'production'
      }
    };
    
    const endpointUrl = `https://${this.config.region}-aiplatform.googleapis.com/v1/${parent}/endpoints`;
    const endpointResponse = await client.request({
      url: endpointUrl,
      method: 'POST',
      data: endpointSpec
    });
    
    const endpointName = endpointResponse.data.name;
    console.log(`✅ Endpoint created: ${endpointName}`);
    
    // Step 2: Deploy model to endpoint
    const deploySpec = {
      deployedModel: {
        model: modelId,
        displayName: `${this.config.modelDisplayName}-deployment`,
        dedicatedResources: {
          machineSpec: {
            machineType: 'n1-standard-2',
            acceleratorType: '', // CPU only for production cost efficiency
            acceleratorCount: 0
          },
          minReplicaCount: 1,
          maxReplicaCount: 3
        },
        automaticResources: null, // Use dedicated resources for consistent performance
        enableAccessLogging: true,
        enableContainerLogging: true
      },
      trafficSplit: {
        '0': 100 // 100% traffic to this model version
      }
    };
    
    const deployUrl = `https://${this.config.region}-aiplatform.googleapis.com/v1/${endpointName}:deployModel`;
    const deployResponse = await client.request({
      url: deployUrl,
      method: 'POST',
      data: deploySpec
    });
    
    // Wait for deployment to complete
    const operationName = deployResponse.data.name;
    await this.waitForOperation(operationName);
    
    // Get final endpoint details
    const finalEndpointResponse = await client.request({
      url: `https://${this.config.region}-aiplatform.googleapis.com/v1/${endpointName}`,
      method: 'GET'
    });
    
    return {
      name: finalEndpointResponse.data.name,
      displayName: finalEndpointResponse.data.displayName,
      deployedModels: finalEndpointResponse.data.deployedModels || []
    };
  }

  /**
   * Wait for long-running operation to complete
   */
  private async waitForOperation(operationName: string): Promise<void> {
    const client = await this.auth.getClient();
    const url = `https://${this.config.region}-aiplatform.googleapis.com/v1/${operationName}`;
    
    let attempts = 0;
    const maxAttempts = 60; // 30 minutes with 30-second intervals
    
    do {
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      
      const response = await client.request({ url, method: 'GET' });
      const operation = response.data;
      
      if (operation.done) {
        if (operation.error) {
          throw new Error(`Operation failed: ${JSON.stringify(operation.error)}`);
        }
        console.log('✅ Operation completed successfully');
        return;
      }
      
      console.log(`⏳ Operation in progress (${attempts + 1}/${maxAttempts})`);
      attempts++;
      
    } while (attempts < maxAttempts);
    
    throw new Error('Operation timeout after 30 minutes');
  }

  /**
   * Test deployed model with sample Contact Welder data
   */
  async testModelPrediction(endpointName: string): Promise<{
    predictions: Array<{
      machineId: string;
      failureProbability: number;
      confidence: number;
      daysToFailure: number;
    }>;
  }> {
    const client = await this.auth.getClient();
    const url = `https://${this.config.region}-aiplatform.googleapis.com/v1/${endpointName}:predict`;
    
    // Create sample test data (in production, this would come from real sensors)
    const testInstances = [
      {
        machine_id: 'contact_welder_001',
        resistance_degradation_index: 0.75,
        electrical_health_score: 0.65,
        thermal_stress_index: 0.45,
        process_stability_score: 0.80,
        weld_quality_trend: -0.2,
        power_efficiency_index: 0.85,
        thermal_electrical_coupling: 0.65,
        failure_risk_score: 35.0,
        resistance_drift_rate: 0.05,
        temperature_cycling_stress: 2.3,
        current_consistency_index: 0.78,
        voltage_stability_factor: 0.82,
        remaining_useful_cycles: 5000,
        degradation_acceleration: 0.02,
        critical_threshold_proximity: 0.40,
        maintenance_urgency_score: 65.0
      }
    ];
    
    const response = await client.request({
      url,
      method: 'POST',
      data: {
        instances: testInstances
      }
    });
    
    const predictions = response.data.predictions.map((pred: any, index: number) => ({
      machineId: testInstances[index].machine_id,
      failureProbability: pred.scores?.[1] || pred.value || 0,
      confidence: Math.max(...(pred.scores || [pred.value || 0])),
      daysToFailure: Math.round((1 - (pred.scores?.[1] || pred.value || 0)) * 21) // Estimate based on probability
    }));
    
    return { predictions };
  }

  /**
   * Get training cost estimate
   */
  getTrainingCostEstimate(): {
    estimatedCostUSD: number;
    budgetHours: number;
    costPerHour: number;
  } {
    const costPerHour = 19.20; // AutoML Tables pricing per node hour
    const estimatedCost = (this.config.trainingBudgetMilliNodeHours / 1000) * costPerHour;
    
    return {
      estimatedCostUSD: estimatedCost,
      budgetHours: this.config.trainingBudgetMilliNodeHours / 1000,
      costPerHour
    };
  }
}

export default ContactWelderVertexTrainer;