import { 
  WorkflowDefinition, 
  WorkflowStep, 
  WorkflowExecution, 
  WorkflowTrigger,
  TaskStatus 
} from '../../shared/interfaces';

export interface AutomationConfig {
  maxConcurrentWorkflows: number;
  workflowTimeout: number;
  enableScheduling: boolean;
  enableEventTriggers: boolean;
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelay: number;
  };
}

export interface WorkflowEngine {
  register(workflow: WorkflowDefinition): Promise<void>;
  execute(workflowId: string, context?: WorkflowContext): Promise<WorkflowExecution>;
  cancel(executionId: string): Promise<void>;
  getExecution(executionId: string): Promise<WorkflowExecution | null>;
  listExecutions(filter?: ExecutionFilter): Promise<WorkflowExecution[]>;
}

export interface WorkflowContext {
  variables: Record<string, any>;
  triggeredBy?: string;
  metadata?: Record<string, any>;
}

export interface ExecutionFilter {
  workflowId?: string;
  status?: TaskStatus | TaskStatus[];
  startedAfter?: Date;
  startedBefore?: Date;
  limit?: number;
}

export interface StepExecutor {
  type: string;
  execute(step: WorkflowStep, context: ExecutionContext): Promise<StepResult>;
  validate?(step: WorkflowStep): ValidationResult;
}

export interface ExecutionContext {
  workflowId: string;
  executionId: string;
  variables: Record<string, any>;
  stepHistory: StepExecution[];
}

export interface StepResult {
  success: boolean;
  output?: any;
  error?: Error;
  nextStep?: string;
  variables?: Record<string, any>;
}

export interface StepExecution {
  stepId: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  result?: StepResult;
  attempts: number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export interface TriggerManager {
  register(workflowId: string, trigger: WorkflowTrigger): Promise<void>;
  unregister(workflowId: string, triggerId?: string): Promise<void>;
  evaluate(): Promise<string[]>; // Returns workflow IDs to execute
}

export interface Scheduler {
  schedule(workflowId: string, cronExpression: string): Promise<void>;
  unschedule(workflowId: string): Promise<void>;
  getNextRun(workflowId: string): Promise<Date | null>;
  listScheduled(): Promise<ScheduledWorkflow[]>;
}

export interface ScheduledWorkflow {
  workflowId: string;
  cronExpression: string;
  nextRun: Date;
  lastRun?: Date;
  enabled: boolean;
}

export interface EventBus {
  subscribe(pattern: string, handler: EventHandler): string;
  unsubscribe(subscriptionId: string): void;
  publish(event: AutomationEvent): Promise<void>;
}

export interface EventHandler {
  (event: AutomationEvent): Promise<void> | void;
}

export interface AutomationEvent {
  id: string;
  type: string;
  source: string;
  timestamp: Date;
  data: any;
  correlationId?: string;
}

export interface ProcessTemplate {
  id: string;
  name: string;
  description: string;
  category: ProcessCategory;
  workflow: WorkflowDefinition;
  requiredVariables: VariableDefinition[];
  estimatedDuration: number;
  tags: string[];
}

export enum ProcessCategory {
  CUSTOMER_ONBOARDING = 'customer_onboarding',
  ORDER_PROCESSING = 'order_processing',
  CONTENT_GENERATION = 'content_generation',
  DATA_PROCESSING = 'data_processing',
  SYSTEM_MAINTENANCE = 'system_maintenance',
  MARKETING_AUTOMATION = 'marketing_automation',
  FINANCIAL_OPERATIONS = 'financial_operations'
}

export interface VariableDefinition {
  name: string;
  type: VariableType;
  required: boolean;
  defaultValue?: any;
  description?: string;
  validation?: VariableValidation;
}

export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object'
}

export interface VariableValidation {
  pattern?: string; // Regex pattern
  min?: number;
  max?: number;
  enum?: any[];
  custom?: (value: any) => boolean;
}

export interface AutomationMetrics {
  totalWorkflows: number;
  activeExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  workflowsByCategory: Record<ProcessCategory, number>;
  executionsByStatus: Record<TaskStatus, number>;
}