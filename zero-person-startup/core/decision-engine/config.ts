import { DecisionEngineConfig } from './types';

export const defaultDecisionEngineConfig: DecisionEngineConfig = {
  defaultConfidenceThreshold: 0.7,
  maxOptionsToEvaluate: 10,
  enableLearning: true,
  decisionTimeout: 30000, // 30 seconds
  historicalDataWeight: 0.3
};

export function createDecisionEngineConfig(overrides?: Partial<DecisionEngineConfig>): DecisionEngineConfig {
  return {
    ...defaultDecisionEngineConfig,
    ...overrides
  };
}