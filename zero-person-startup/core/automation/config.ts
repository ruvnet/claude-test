import { AutomationConfig } from './types';

export const defaultAutomationConfig: AutomationConfig = {
  maxConcurrentWorkflows: 20,
  workflowTimeout: 3600000, // 1 hour
  enableScheduling: true,
  enableEventTriggers: true,
  retryPolicy: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000 // 1 second
  }
};

export function createAutomationConfig(overrides?: Partial<AutomationConfig>): AutomationConfig {
  return {
    ...defaultAutomationConfig,
    ...overrides,
    retryPolicy: {
      ...defaultAutomationConfig.retryPolicy,
      ...(overrides?.retryPolicy || {})
    }
  };
}