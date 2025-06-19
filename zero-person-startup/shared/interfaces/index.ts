// Shared interfaces for the zero person startup system

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Task extends BaseEntity {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignedModule?: string;
  dependencies?: string[];
  result?: any;
  error?: string;
  estimatedDuration?: number;
  actualDuration?: number;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum Priority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface Decision extends BaseEntity {
  context: DecisionContext;
  options: DecisionOption[];
  selectedOption?: DecisionOption;
  confidence: number;
  reasoning: string;
  outcome?: DecisionOutcome;
}

export interface DecisionContext {
  taskId?: string;
  type: DecisionType;
  data: Record<string, any>;
  constraints?: DecisionConstraint[];
}

export enum DecisionType {
  RESOURCE_ALLOCATION = 'resource_allocation',
  STRATEGY_SELECTION = 'strategy_selection',
  PROCESS_OPTIMIZATION = 'process_optimization',
  ERROR_HANDLING = 'error_handling',
  PRIORITY_ADJUSTMENT = 'priority_adjustment'
}

export interface DecisionOption {
  id: string;
  description: string;
  score: number;
  risks: string[];
  benefits: string[];
}

export interface DecisionConstraint {
  type: string;
  value: any;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in';
}

export interface DecisionOutcome {
  success: boolean;
  metrics: Record<string, number>;
  feedback?: string;
}

export interface SystemMetrics {
  timestamp: Date;
  cpu: number;
  memory: number;
  activeTaskCount: number;
  completedTaskCount: number;
  failedTaskCount: number;
  averageTaskDuration: number;
  systemHealth: HealthStatus;
  moduleStatus: Record<string, ModuleStatus>;
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  OFFLINE = 'offline'
}

export interface ModuleStatus {
  name: string;
  status: HealthStatus;
  lastHeartbeat: Date;
  metrics?: Record<string, any>;
}

export interface WorkflowDefinition extends BaseEntity {
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  enabled: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  config: Record<string, any>;
  nextSteps?: ConditionalNext[];
  retryPolicy?: RetryPolicy;
}

export enum StepType {
  TASK = 'task',
  DECISION = 'decision',
  PARALLEL = 'parallel',
  WAIT = 'wait',
  CONDITION = 'condition'
}

export interface ConditionalNext {
  condition: string;
  stepId: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'linear' | 'exponential';
  initialDelay: number;
}

export interface WorkflowTrigger {
  type: TriggerType;
  config: Record<string, any>;
}

export enum TriggerType {
  SCHEDULE = 'schedule',
  EVENT = 'event',
  MANUAL = 'manual',
  CONDITION = 'condition'
}

export interface WorkflowExecution extends BaseEntity {
  workflowId: string;
  status: TaskStatus;
  currentStep?: string;
  variables: Record<string, any>;
  history: ExecutionHistory[];
}

export interface ExecutionHistory {
  stepId: string;
  status: TaskStatus;
  startTime: Date;
  endTime?: Date;
  output?: any;
  error?: string;
}

// Event system interfaces
export interface SystemEvent {
  id: string;
  type: EventType;
  source: string;
  timestamp: Date;
  data: any;
}

export enum EventType {
  TASK_CREATED = 'task_created',
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  DECISION_MADE = 'decision_made',
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  SYSTEM_ERROR = 'system_error',
  METRIC_THRESHOLD = 'metric_threshold'
}

// Module communication interfaces
export interface ModuleMessage {
  from: string;
  to: string;
  type: MessageType;
  payload: any;
  correlationId?: string;
}

export enum MessageType {
  REQUEST = 'request',
  RESPONSE = 'response',
  EVENT = 'event',
  COMMAND = 'command'
}