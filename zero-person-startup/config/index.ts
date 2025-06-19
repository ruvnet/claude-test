import { TaskManagerConfig } from '../core/task-manager';
import { DecisionEngineConfig } from '../core/decision-engine';
import { MonitoringConfig } from '../core/monitoring';
import { AutomationConfig } from '../core/automation';

export interface SystemConfig {
  taskManager: TaskManagerConfig;
  decisionEngine: DecisionEngineConfig;
  monitoring: MonitoringConfig;
  automation: AutomationConfig;
  system: {
    name: string;
    version: string;
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
  };
}

export const defaultSystemConfig: SystemConfig = {
  taskManager: {
    maxConcurrentTasks: 10,
    taskTimeout: 300000,
    retryAttempts: 3,
    priorityQueueEnabled: true,
    autoAssignEnabled: true
  },
  decisionEngine: {
    defaultConfidenceThreshold: 0.7,
    maxOptionsToEvaluate: 10,
    enableLearning: true,
    decisionTimeout: 30000,
    historicalDataWeight: 0.3
  },
  monitoring: {
    metricsCollectionInterval: 60000,
    healthCheckInterval: 30000,
    alertThresholds: {
      cpuUsage: 80,
      memoryUsage: 85,
      taskQueueSize: 100,
      failureRate: 10,
      responseTime: 5000
    },
    enableAutoHealing: true,
    metricsRetentionDays: 7,
    enableAlerting: true
  },
  automation: {
    maxConcurrentWorkflows: 20,
    workflowTimeout: 3600000,
    enableScheduling: true,
    enableEventTriggers: true,
    retryPolicy: {
      maxAttempts: 3,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  },
  system: {
    name: 'Zero Person Startup System',
    version: '1.0.0',
    environment: 'development',
    debug: true
  }
};

export function createSystemConfig(overrides?: Partial<SystemConfig>): SystemConfig {
  return {
    taskManager: {
      ...defaultSystemConfig.taskManager,
      ...(overrides?.taskManager || {})
    },
    decisionEngine: {
      ...defaultSystemConfig.decisionEngine,
      ...(overrides?.decisionEngine || {})
    },
    monitoring: {
      ...defaultSystemConfig.monitoring,
      ...(overrides?.monitoring || {})
    },
    automation: {
      ...defaultSystemConfig.automation,
      ...(overrides?.automation || {})
    },
    system: {
      ...defaultSystemConfig.system,
      ...(overrides?.system || {})
    }
  };
}