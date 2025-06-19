import { Decision, DecisionContext, DecisionOption, DecisionType, DecisionOutcome } from '../../shared/interfaces';

export interface DecisionEngineConfig {
  defaultConfidenceThreshold: number;
  maxOptionsToEvaluate: number;
  enableLearning: boolean;
  decisionTimeout: number;
  historicalDataWeight: number;
}

export interface DecisionStrategy {
  name: string;
  evaluate(context: DecisionContext, options: DecisionOption[]): Promise<DecisionEvaluation>;
  canHandle(type: DecisionType): boolean;
}

export interface DecisionEvaluation {
  rankings: OptionRanking[];
  confidence: number;
  reasoning: string;
  recommendations?: string[];
}

export interface OptionRanking {
  option: DecisionOption;
  score: number;
  analysis: OptionAnalysis;
}

export interface OptionAnalysis {
  pros: string[];
  cons: string[];
  risks: RiskAssessment[];
  expectedOutcome: Record<string, any>;
}

export interface RiskAssessment {
  description: string;
  probability: number; // 0-1
  impact: number; // 1-10
  mitigation?: string;
}

export interface DecisionHistory {
  getDecisions(filter?: DecisionFilter): Promise<Decision[]>;
  recordDecision(decision: Decision): Promise<void>;
  recordOutcome(decisionId: string, outcome: DecisionOutcome): Promise<void>;
  getSuccessRate(type?: DecisionType): Promise<number>;
}

export interface DecisionFilter {
  type?: DecisionType;
  minConfidence?: number;
  startDate?: Date;
  endDate?: Date;
  outcomeSuccess?: boolean;
}

export interface LearningEngine {
  learn(decision: Decision, outcome: DecisionOutcome): Promise<void>;
  getPredictedOutcome(context: DecisionContext, option: DecisionOption): Promise<PredictedOutcome>;
  getModelAccuracy(): Promise<number>;
}

export interface PredictedOutcome {
  success: boolean;
  confidence: number;
  expectedMetrics: Record<string, number>;
  basedOnSamples: number;
}

export interface DecisionRule {
  id: string;
  name: string;
  condition: (context: DecisionContext) => boolean;
  action: (context: DecisionContext) => DecisionOption;
  priority: number;
  enabled: boolean;
}

export interface DecisionMetrics {
  totalDecisions: number;
  decisionsByType: Record<DecisionType, number>;
  averageConfidence: number;
  successRate: number;
  averageDecisionTime: number;
  learningModelAccuracy?: number;
}