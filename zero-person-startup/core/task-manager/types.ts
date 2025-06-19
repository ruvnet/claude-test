import { Task, TaskStatus, Priority } from '../../shared/interfaces';

export interface TaskManagerConfig {
  maxConcurrentTasks: number;
  taskTimeout: number;
  retryAttempts: number;
  priorityQueueEnabled: boolean;
  autoAssignEnabled: boolean;
}

export interface TaskQueue {
  add(task: Task): Promise<void>;
  get(id: string): Promise<Task | null>;
  getNext(): Promise<Task | null>;
  update(id: string, updates: Partial<Task>): Promise<void>;
  remove(id: string): Promise<void>;
  list(filter?: TaskFilter): Promise<Task[]>;
}

export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: Priority | Priority[];
  assignedModule?: string;
  createdAfter?: Date;
  createdBefore?: Date;
}

export interface TaskExecutor {
  execute(task: Task): Promise<TaskResult>;
  canExecute(task: Task): boolean;
}

export interface TaskResult {
  taskId: string;
  success: boolean;
  output?: any;
  error?: Error;
  duration: number;
  metadata?: Record<string, any>;
}

export interface TaskAssigner {
  assign(task: Task): Promise<string>;
  getModuleCapabilities(): Map<string, string[]>;
}

export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<Priority, number>;
}