import { v4 as uuidv4 } from 'uuid';
import { 
  WorkflowDefinition, 
  WorkflowStep, 
  WorkflowExecution,
  WorkflowTrigger,
  TaskStatus,
  StepType,
  TriggerType,
  SystemEvent,
  EventType,
  ExecutionHistory
} from '../../shared/interfaces';
import { 
  AutomationConfig,
  WorkflowEngine,
  WorkflowContext,
  ExecutionFilter,
  StepExecutor,
  ExecutionContext,
  StepResult,
  StepExecution,
  TriggerManager,
  EventBus,
  AutomationEvent,
  ProcessTemplate,
  ProcessCategory,
  AutomationMetrics,
  ScheduledWorkflow
} from './types';
import { createAutomationConfig } from './config';

export class ProcessAutomation implements WorkflowEngine {
  private config: AutomationConfig;
  private workflows: Map<string, WorkflowDefinition>;
  private executions: Map<string, WorkflowExecution>;
  private stepExecutors: Map<string, StepExecutor>;
  private eventBus: SimpleEventBus;
  private scheduledWorkflows: Map<string, ScheduledWorkflow>;
  private templates: Map<string, ProcessTemplate>;
  private metrics: AutomationMetrics;
  private activeExecutions: Set<string>;
  private eventHandlers: Map<EventType, Function[]>;

  constructor(config?: Partial<AutomationConfig>) {
    this.config = createAutomationConfig(config);
    this.workflows = new Map();
    this.executions = new Map();
    this.stepExecutors = new Map();
    this.eventBus = new SimpleEventBus();
    this.scheduledWorkflows = new Map();
    this.templates = new Map();
    this.activeExecutions = new Set();
    this.eventHandlers = new Map();
    this.metrics = this.initializeMetrics();

    // Register default step executors
    this.registerDefaultExecutors();

    // Register default process templates
    this.registerDefaultTemplates();
  }

  private initializeMetrics(): AutomationMetrics {
    return {
      totalWorkflows: 0,
      activeExecutions: 0,
      completedExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      workflowsByCategory: {
        [ProcessCategory.CUSTOMER_ONBOARDING]: 0,
        [ProcessCategory.ORDER_PROCESSING]: 0,
        [ProcessCategory.CONTENT_GENERATION]: 0,
        [ProcessCategory.DATA_PROCESSING]: 0,
        [ProcessCategory.SYSTEM_MAINTENANCE]: 0,
        [ProcessCategory.MARKETING_AUTOMATION]: 0,
        [ProcessCategory.FINANCIAL_OPERATIONS]: 0
      },
      executionsByStatus: {
        [TaskStatus.PENDING]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.COMPLETED]: 0,
        [TaskStatus.FAILED]: 0,
        [TaskStatus.CANCELLED]: 0
      }
    };
  }

  private registerDefaultExecutors(): void {
    // Task step executor
    this.registerStepExecutor('task', {
      type: StepType.TASK,
      execute: async (step, context) => {
        // In a real implementation, this would create and execute a task
        console.log(`Executing task step: ${step.name}`);
        return {
          success: true,
          output: { taskId: uuidv4(), result: 'Task completed' },
          variables: { [`${step.id}_result`]: 'success' }
        };
      }
    });

    // Decision step executor
    this.registerStepExecutor('decision', {
      type: StepType.DECISION,
      execute: async (step, context) => {
        // In a real implementation, this would use the Decision Engine
        const condition = step.config.condition as string;
        const result = this.evaluateCondition(condition, context.variables);
        
        const nextStep = step.nextSteps?.find(ns => 
          this.evaluateCondition(ns.condition, context.variables)
        );

        return {
          success: true,
          output: { decision: result },
          nextStep: nextStep?.stepId
        };
      }
    });

    // Wait step executor
    this.registerStepExecutor('wait', {
      type: StepType.WAIT,
      execute: async (step, context) => {
        const duration = step.config.duration as number || 1000;
        await new Promise(resolve => setTimeout(resolve, duration));
        return { success: true };
      }
    });

    // Condition step executor
    this.registerStepExecutor('condition', {
      type: StepType.CONDITION,
      execute: async (step, context) => {
        const condition = step.config.condition as string;
        const result = this.evaluateCondition(condition, context.variables);
        
        if (result) {
          return { 
            success: true, 
            nextStep: step.config.trueStep as string 
          };
        } else {
          return { 
            success: true, 
            nextStep: step.config.falseStep as string 
          };
        }
      }
    });
  }

  private registerDefaultTemplates(): void {
    // Customer onboarding template
    this.templates.set('customer-onboarding', {
      id: 'customer-onboarding',
      name: 'Customer Onboarding',
      description: 'Automated customer onboarding process',
      category: ProcessCategory.CUSTOMER_ONBOARDING,
      workflow: {
        id: 'customer-onboarding-workflow',
        name: 'Customer Onboarding Workflow',
        description: 'Onboard new customers automatically',
        steps: [
          {
            id: 'create-account',
            name: 'Create Customer Account',
            type: StepType.TASK,
            config: { taskType: 'create-account' }
          },
          {
            id: 'send-welcome-email',
            name: 'Send Welcome Email',
            type: StepType.TASK,
            config: { taskType: 'send-email', template: 'welcome' }
          },
          {
            id: 'setup-initial-data',
            name: 'Setup Initial Data',
            type: StepType.TASK,
            config: { taskType: 'setup-data' }
          }
        ],
        triggers: [
          {
            type: TriggerType.EVENT,
            config: { eventType: 'customer.signup' }
          }
        ],
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      requiredVariables: [
        {
          name: 'customerEmail',
          type: 'string' as any,
          required: true,
          description: 'Customer email address'
        },
        {
          name: 'customerName',
          type: 'string' as any,
          required: true,
          description: 'Customer full name'
        }
      ],
      estimatedDuration: 300000, // 5 minutes
      tags: ['customer', 'onboarding', 'automated']
    });
  }

  public async register(workflow: WorkflowDefinition): Promise<void> {
    this.workflows.set(workflow.id, workflow);
    this.metrics.totalWorkflows++;

    // Register triggers if enabled
    if (workflow.enabled && workflow.triggers) {
      for (const trigger of workflow.triggers) {
        await this.registerTrigger(workflow.id, trigger);
      }
    }

    this.emitEvent(EventType.WORKFLOW_STARTED, workflow);
  }

  public async execute(workflowId: string, context?: WorkflowContext): Promise<WorkflowExecution> {
    if (this.activeExecutions.size >= this.config.maxConcurrentWorkflows) {
      throw new Error('Maximum concurrent workflows reached');
    }

    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      status: TaskStatus.IN_PROGRESS,
      currentStep: workflow.steps[0]?.id,
      variables: context?.variables || {},
      history: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: context?.metadata
    };

    this.executions.set(execution.id, execution);
    this.activeExecutions.add(execution.id);
    this.metrics.activeExecutions++;
    this.metrics.executionsByStatus[TaskStatus.IN_PROGRESS]++;

    // Execute workflow asynchronously
    this.executeWorkflowAsync(workflow, execution);

    return execution;
  }

  private async executeWorkflowAsync(
    workflow: WorkflowDefinition, 
    execution: WorkflowExecution
  ): Promise<void> {
    const startTime = Date.now();

    try {
      let currentStepId = execution.currentStep;

      while (currentStepId) {
        const step = workflow.steps.find(s => s.id === currentStepId);
        if (!step) {
          throw new Error(`Step not found: ${currentStepId}`);
        }

        const stepResult = await this.executeStep(step, execution);
        
        if (!stepResult.success) {
          throw new Error(`Step failed: ${step.name}`);
        }

        // Determine next step
        currentStepId = stepResult.nextStep || this.getNextStep(workflow, step);
        execution.currentStep = currentStepId;

        // Update variables if provided
        if (stepResult.variables) {
          Object.assign(execution.variables, stepResult.variables);
        }
      }

      // Workflow completed successfully
      execution.status = TaskStatus.COMPLETED;
      this.metrics.completedExecutions++;
      this.emitEvent(EventType.WORKFLOW_COMPLETED, execution);

    } catch (error) {
      execution.status = TaskStatus.FAILED;
      this.metrics.failedExecutions++;
      console.error(`Workflow execution failed:`, error);
      
    } finally {
      execution.updatedAt = new Date();
      this.activeExecutions.delete(execution.id);
      this.metrics.activeExecutions--;
      
      // Update metrics
      this.metrics.executionsByStatus[TaskStatus.IN_PROGRESS]--;
      this.metrics.executionsByStatus[execution.status]++;
      
      const duration = Date.now() - startTime;
      const totalDuration = this.metrics.averageExecutionTime * 
        (this.metrics.completedExecutions + this.metrics.failedExecutions - 1);
      this.metrics.averageExecutionTime = 
        (totalDuration + duration) / (this.metrics.completedExecutions + this.metrics.failedExecutions);
    }
  }

  private async executeStep(
    step: WorkflowStep, 
    execution: WorkflowExecution
  ): Promise<StepResult> {
    const executor = this.stepExecutors.get(step.type);
    if (!executor) {
      throw new Error(`No executor found for step type: ${step.type}`);
    }

    const stepExecution: StepExecution = {
      stepId: step.id,
      status: TaskStatus.IN_PROGRESS,
      startTime: new Date(),
      attempts: 1
    };

    const context: ExecutionContext = {
      workflowId: execution.workflowId,
      executionId: execution.id,
      variables: execution.variables,
      stepHistory: execution.history
    };

    try {
      const result = await this.executeWithRetry(
        () => executor.execute(step, context),
        step.retryPolicy
      );

      stepExecution.status = TaskStatus.COMPLETED;
      stepExecution.endTime = new Date();
      stepExecution.result = result;

      execution.history.push({
        stepId: step.id,
        status: TaskStatus.COMPLETED,
        startTime: stepExecution.startTime,
        endTime: stepExecution.endTime,
        output: result.output
      });

      return result;

    } catch (error) {
      stepExecution.status = TaskStatus.FAILED;
      stepExecution.endTime = new Date();

      execution.history.push({
        stepId: step.id,
        status: TaskStatus.FAILED,
        startTime: stepExecution.startTime,
        endTime: stepExecution.endTime,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>, 
    retryPolicy?: any
  ): Promise<T> {
    const policy = retryPolicy || this.config.retryPolicy;
    let lastError: Error;

    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < policy.maxAttempts) {
          const delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  private getNextStep(workflow: WorkflowDefinition, currentStep: WorkflowStep): string | undefined {
    const currentIndex = workflow.steps.findIndex(s => s.id === currentStep.id);
    const nextStep = workflow.steps[currentIndex + 1];
    return nextStep?.id;
  }

  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // Simple condition evaluation - in a real implementation, this would be more sophisticated
    try {
      // WARNING: This is unsafe and should use a proper expression evaluator in production
      const func = new Function('variables', `with(variables) { return ${condition}; }`);
      return func(variables);
    } catch (error) {
      console.error('Failed to evaluate condition:', condition, error);
      return false;
    }
  }

  public registerStepExecutor(type: string, executor: StepExecutor): void {
    this.stepExecutors.set(type, executor);
  }

  private async registerTrigger(workflowId: string, trigger: WorkflowTrigger): Promise<void> {
    switch (trigger.type) {
      case TriggerType.SCHEDULE:
        if (this.config.enableScheduling) {
          const cronExpression = trigger.config.cron as string;
          this.scheduledWorkflows.set(workflowId, {
            workflowId,
            cronExpression,
            nextRun: this.calculateNextRun(cronExpression),
            enabled: true
          });
        }
        break;

      case TriggerType.EVENT:
        if (this.config.enableEventTriggers) {
          const eventType = trigger.config.eventType as string;
          this.eventBus.subscribe(eventType, async (event) => {
            await this.execute(workflowId, {
              variables: event.data,
              triggeredBy: 'event',
              metadata: { eventId: event.id }
            });
          });
        }
        break;
    }
  }

  private calculateNextRun(cronExpression: string): Date {
    // Simplified - in a real implementation, use a cron parser
    return new Date(Date.now() + 3600000); // 1 hour from now
  }

  public async cancel(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    if (execution.status !== TaskStatus.IN_PROGRESS) {
      throw new Error('Can only cancel in-progress executions');
    }

    execution.status = TaskStatus.CANCELLED;
    execution.updatedAt = new Date();
    this.activeExecutions.delete(executionId);
    this.metrics.activeExecutions--;
  }

  public async getExecution(executionId: string): Promise<WorkflowExecution | null> {
    return this.executions.get(executionId) || null;
  }

  public async listExecutions(filter?: ExecutionFilter): Promise<WorkflowExecution[]> {
    let executions = Array.from(this.executions.values());

    if (filter) {
      if (filter.workflowId) {
        executions = executions.filter(e => e.workflowId === filter.workflowId);
      }

      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        executions = executions.filter(e => statuses.includes(e.status));
      }

      if (filter.startedAfter) {
        executions = executions.filter(e => e.createdAt >= filter.startedAfter!);
      }

      if (filter.startedBefore) {
        executions = executions.filter(e => e.createdAt <= filter.startedBefore!);
      }

      if (filter.limit) {
        executions = executions.slice(0, filter.limit);
      }
    }

    return executions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public getMetrics(): AutomationMetrics {
    return { ...this.metrics };
  }

  public getTemplates(): ProcessTemplate[] {
    return Array.from(this.templates.values());
  }

  public async createWorkflowFromTemplate(
    templateId: string, 
    variables: Record<string, any>
  ): Promise<WorkflowDefinition> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Validate required variables
    for (const varDef of template.requiredVariables) {
      if (varDef.required && !(varDef.name in variables)) {
        throw new Error(`Missing required variable: ${varDef.name}`);
      }
    }

    // Create workflow instance from template
    const workflow: WorkflowDefinition = {
      ...template.workflow,
      id: uuidv4(),
      name: `${template.workflow.name} - ${new Date().toISOString()}`,
      metadata: { templateId, variables }
    };

    await this.register(workflow);
    return workflow;
  }

  private emitEvent(type: EventType, data: any): void {
    const event: SystemEvent = {
      id: uuidv4(),
      type,
      source: 'ProcessAutomation',
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

// Simple event bus implementation
class SimpleEventBus implements EventBus {
  private subscriptions: Map<string, Map<string, (event: AutomationEvent) => any>>;

  constructor() {
    this.subscriptions = new Map();
  }

  subscribe(pattern: string, handler: (event: AutomationEvent) => any): string {
    const id = uuidv4();
    const handlers = this.subscriptions.get(pattern) || new Map();
    handlers.set(id, handler);
    this.subscriptions.set(pattern, handlers);
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    for (const [, handlers] of this.subscriptions) {
      handlers.delete(subscriptionId);
    }
  }

  async publish(event: AutomationEvent): Promise<void> {
    const handlers = this.subscriptions.get(event.type) || new Map();
    for (const [, handler] of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }
  }
}

// Export types and config
export * from './types';
export * from './config';