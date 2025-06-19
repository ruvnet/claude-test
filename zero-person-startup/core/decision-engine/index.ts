import { v4 as uuidv4 } from 'uuid';
import { 
  Decision, 
  DecisionContext, 
  DecisionOption, 
  DecisionType, 
  DecisionOutcome,
  SystemEvent,
  EventType 
} from '../../shared/interfaces';
import { 
  DecisionEngineConfig, 
  DecisionStrategy, 
  DecisionEvaluation, 
  OptionRanking,
  DecisionHistory,
  DecisionFilter,
  DecisionRule,
  DecisionMetrics,
  RiskAssessment
} from './types';
import { createDecisionEngineConfig } from './config';

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private strategies: Map<string, DecisionStrategy>;
  private decisionHistory: Map<string, Decision>;
  private rules: Map<string, DecisionRule>;
  private metrics: DecisionMetrics;
  private eventHandlers: Map<EventType, Function[]>;

  constructor(config?: Partial<DecisionEngineConfig>) {
    this.config = createDecisionEngineConfig(config);
    this.strategies = new Map();
    this.decisionHistory = new Map();
    this.rules = new Map();
    this.eventHandlers = new Map();
    this.metrics = this.initializeMetrics();
    
    // Register default strategies
    this.registerDefaultStrategies();
  }

  private initializeMetrics(): DecisionMetrics {
    return {
      totalDecisions: 0,
      decisionsByType: {
        [DecisionType.RESOURCE_ALLOCATION]: 0,
        [DecisionType.STRATEGY_SELECTION]: 0,
        [DecisionType.PROCESS_OPTIMIZATION]: 0,
        [DecisionType.ERROR_HANDLING]: 0,
        [DecisionType.PRIORITY_ADJUSTMENT]: 0
      },
      averageConfidence: 0,
      successRate: 0,
      averageDecisionTime: 0
    };
  }

  private registerDefaultStrategies(): void {
    // Register a simple scoring strategy as default
    this.registerStrategy('default', {
      name: 'default',
      canHandle: () => true,
      evaluate: async (context, options) => {
        const rankings = options.map(option => ({
          option,
          score: this.calculateBaseScore(option),
          analysis: this.analyzeOption(option)
        }));

        rankings.sort((a, b) => b.score - a.score);

        return {
          rankings,
          confidence: this.calculateConfidence(rankings),
          reasoning: this.generateReasoning(context, rankings)
        };
      }
    });
  }

  public async makeDecision(
    context: DecisionContext,
    options: DecisionOption[]
  ): Promise<Decision> {
    const startTime = Date.now();

    // Check if any rules apply
    const applicableRule = this.findApplicableRule(context);
    if (applicableRule) {
      return this.applyRule(context, applicableRule);
    }

    // Limit options if necessary
    const evaluationOptions = options.slice(0, this.config.maxOptionsToEvaluate);

    // Find appropriate strategy
    const strategy = this.selectStrategy(context.type);
    if (!strategy) {
      throw new Error(`No strategy found for decision type: ${context.type}`);
    }

    // Evaluate options
    const evaluation = await this.evaluateWithTimeout(
      strategy.evaluate(context, evaluationOptions),
      this.config.decisionTimeout
    );

    // Create decision
    const decision: Decision = {
      id: uuidv4(),
      context,
      options: evaluationOptions,
      selectedOption: evaluation.rankings[0]?.option,
      confidence: evaluation.confidence,
      reasoning: evaluation.reasoning,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Record decision
    this.decisionHistory.set(decision.id, decision);
    this.updateMetrics(decision, Date.now() - startTime);
    this.emitEvent(EventType.DECISION_MADE, decision);

    return decision;
  }

  private calculateBaseScore(option: DecisionOption): number {
    // Simple scoring based on benefits vs risks
    const benefitScore = option.benefits.length * 10;
    const riskPenalty = option.risks.length * 5;
    return Math.max(0, option.score + benefitScore - riskPenalty);
  }

  private analyzeOption(option: DecisionOption): any {
    const risks: RiskAssessment[] = option.risks.map(risk => ({
      description: risk,
      probability: 0.5, // Default probability
      impact: 5, // Default impact
      mitigation: 'Monitor and adjust as needed'
    }));

    return {
      pros: option.benefits,
      cons: option.risks,
      risks,
      expectedOutcome: {
        success: option.score > 50,
        confidence: option.score / 100
      }
    };
  }

  private calculateConfidence(rankings: OptionRanking[]): number {
    if (rankings.length === 0) return 0;
    if (rankings.length === 1) return 0.8;

    // Calculate confidence based on score separation
    const topScore = rankings[0].score;
    const secondScore = rankings[1]?.score || 0;
    const separation = topScore - secondScore;
    const maxScore = Math.max(...rankings.map(r => r.score));

    return Math.min(0.95, 0.5 + (separation / maxScore) * 0.45);
  }

  private generateReasoning(context: DecisionContext, rankings: OptionRanking[]): string {
    if (rankings.length === 0) {
      return 'No viable options available for evaluation.';
    }

    const topOption = rankings[0];
    const reasons = [
      `Selected option "${topOption.option.description}" with score ${topOption.score.toFixed(2)}.`,
      `Key benefits: ${topOption.option.benefits.slice(0, 2).join(', ')}.`,
      topOption.option.risks.length > 0 
        ? `Main risks: ${topOption.option.risks.slice(0, 2).join(', ')}.`
        : 'No significant risks identified.'
    ];

    return reasons.join(' ');
  }

  private findApplicableRule(context: DecisionContext): DecisionRule | null {
    const enabledRules = Array.from(this.rules.values())
      .filter(rule => rule.enabled)
      .sort((a, b) => b.priority - a.priority);

    return enabledRules.find(rule => rule.condition(context)) || null;
  }

  private async applyRule(context: DecisionContext, rule: DecisionRule): Promise<Decision> {
    const selectedOption = rule.action(context);
    
    return {
      id: uuidv4(),
      context,
      options: [selectedOption],
      selectedOption,
      confidence: 1.0, // Rules have high confidence
      reasoning: `Applied rule: ${rule.name}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: { ruleId: rule.id }
    };
  }

  private selectStrategy(type: DecisionType): DecisionStrategy | null {
    // Try to find type-specific strategy first
    for (const [, strategy] of this.strategies) {
      if (strategy.canHandle(type)) {
        return strategy;
      }
    }
    
    // Fall back to default strategy
    return this.strategies.get('default') || null;
  }

  private async evaluateWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Decision evaluation timeout')), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  public registerStrategy(name: string, strategy: DecisionStrategy): void {
    this.strategies.set(name, strategy);
  }

  public registerRule(rule: DecisionRule): void {
    this.rules.set(rule.id, rule);
  }

  public async recordOutcome(decisionId: string, outcome: DecisionOutcome): Promise<void> {
    const decision = this.decisionHistory.get(decisionId);
    if (!decision) {
      throw new Error(`Decision not found: ${decisionId}`);
    }

    decision.outcome = outcome;
    decision.updatedAt = new Date();
    this.decisionHistory.set(decisionId, decision);

    // Update success rate
    await this.updateSuccessRate();

    // Learn from outcome if enabled
    if (this.config.enableLearning && decision.selectedOption) {
      // In a real implementation, this would update a machine learning model
      console.log(`Learning from decision ${decisionId} outcome:`, outcome.success);
    }
  }

  private async updateSuccessRate(): Promise<void> {
    const decisions = Array.from(this.decisionHistory.values());
    const decisionsWithOutcomes = decisions.filter(d => d.outcome);
    
    if (decisionsWithOutcomes.length === 0) {
      this.metrics.successRate = 0;
      return;
    }

    const successfulDecisions = decisionsWithOutcomes.filter(d => d.outcome!.success);
    this.metrics.successRate = successfulDecisions.length / decisionsWithOutcomes.length;
  }

  public async getDecisionHistory(filter?: DecisionFilter): Promise<Decision[]> {
    let decisions = Array.from(this.decisionHistory.values());

    if (filter) {
      if (filter.type !== undefined) {
        decisions = decisions.filter(d => d.context.type === filter.type);
      }

      if (filter.minConfidence !== undefined) {
        decisions = decisions.filter(d => d.confidence >= filter.minConfidence);
      }

      if (filter.startDate) {
        decisions = decisions.filter(d => d.createdAt >= filter.startDate);
      }

      if (filter.endDate) {
        decisions = decisions.filter(d => d.createdAt <= filter.endDate);
      }

      if (filter.outcomeSuccess !== undefined) {
        decisions = decisions.filter(d => 
          d.outcome && d.outcome.success === filter.outcomeSuccess
        );
      }
    }

    return decisions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private updateMetrics(decision: Decision, decisionTime: number): void {
    this.metrics.totalDecisions++;
    this.metrics.decisionsByType[decision.context.type]++;
    
    // Update average confidence
    const totalConfidence = this.metrics.averageConfidence * (this.metrics.totalDecisions - 1);
    this.metrics.averageConfidence = (totalConfidence + decision.confidence) / this.metrics.totalDecisions;
    
    // Update average decision time
    const totalTime = this.metrics.averageDecisionTime * (this.metrics.totalDecisions - 1);
    this.metrics.averageDecisionTime = (totalTime + decisionTime) / this.metrics.totalDecisions;
  }

  public getMetrics(): DecisionMetrics {
    return { ...this.metrics };
  }

  private emitEvent(type: EventType, data: any): void {
    const event: SystemEvent = {
      id: uuidv4(),
      type,
      source: 'DecisionEngine',
      timestamp: new Date(),
      data
    };

    const handlers = this.eventHandlers.get(type) || [];
    handlers.forEach(handler => handler(event));
  }

  public on(eventType: EventType, handler: Function): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
  }
}

// Export types and config
export * from './types';
export * from './config';