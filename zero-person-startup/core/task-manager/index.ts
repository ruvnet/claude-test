import { v4 as uuidv4 } from 'uuid';
import { Task, TaskStatus, Priority, SystemEvent, EventType } from '../../shared/interfaces';
import { 
  TaskManagerConfig, 
  TaskQueue, 
  TaskFilter, 
  TaskExecutor, 
  TaskResult, 
  TaskAssigner,
  TaskMetrics 
} from './types';
import { createTaskManagerConfig } from './config';

export class TaskManager {
  private config: TaskManagerConfig;
  private taskQueue: Map<string, Task>;
  private executors: Map<string, TaskExecutor>;
  private activeTaskCount: number = 0;
  private metrics: TaskMetrics;
  private eventHandlers: Map<EventType, Function[]>;

  constructor(config?: Partial<TaskManagerConfig>) {
    this.config = createTaskManagerConfig(config);
    this.taskQueue = new Map();
    this.executors = new Map();
    this.eventHandlers = new Map();
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): TaskMetrics {
    return {
      totalTasks: 0,
      completedTasks: 0,
      failedTasks: 0,
      averageDuration: 0,
      tasksByStatus: {
        [TaskStatus.PENDING]: 0,
        [TaskStatus.IN_PROGRESS]: 0,
        [TaskStatus.COMPLETED]: 0,
        [TaskStatus.FAILED]: 0,
        [TaskStatus.CANCELLED]: 0
      },
      tasksByPriority: {
        [Priority.LOW]: 0,
        [Priority.MEDIUM]: 0,
        [Priority.HIGH]: 0,
        [Priority.CRITICAL]: 0
      }
    };
  }

  public async createTask(
    title: string, 
    description: string, 
    priority: Priority = Priority.MEDIUM,
    metadata?: Record<string, any>
  ): Promise<Task> {
    const task: Task = {
      id: uuidv4(),
      title,
      description,
      status: TaskStatus.PENDING,
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata
    };

    this.taskQueue.set(task.id, task);
    this.updateMetrics(task, 'created');
    this.emitEvent(EventType.TASK_CREATED, task);

    if (this.config.autoAssignEnabled) {
      await this.assignTask(task);
    }

    return task;
  }

  public async executeNextTask(): Promise<TaskResult | null> {
    if (this.activeTaskCount >= this.config.maxConcurrentTasks) {
      return null;
    }

    const task = await this.getNextTask();
    if (!task) {
      return null;
    }

    return this.executeTask(task);
  }

  private async getNextTask(): Promise<Task | null> {
    const pendingTasks = Array.from(this.taskQueue.values())
      .filter(task => task.status === TaskStatus.PENDING)
      .sort((a, b) => {
        // Sort by priority (descending) then by creation time (ascending)
        if (b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return pendingTasks[0] || null;
  }

  private async executeTask(task: Task): Promise<TaskResult> {
    this.activeTaskCount++;
    task.status = TaskStatus.IN_PROGRESS;
    task.updatedAt = new Date();
    const startTime = Date.now();

    try {
      const executor = this.getExecutor(task);
      if (!executor) {
        throw new Error(`No executor found for task type: ${task.metadata?.type}`);
      }

      const result = await this.executeWithTimeout(
        executor.execute(task),
        this.config.taskTimeout
      );

      task.status = TaskStatus.COMPLETED;
      task.result = result.output;
      task.actualDuration = Date.now() - startTime;
      
      this.updateMetrics(task, 'completed');
      this.emitEvent(EventType.TASK_COMPLETED, task);

      return result;
    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error instanceof Error ? error.message : String(error);
      task.actualDuration = Date.now() - startTime;
      
      this.updateMetrics(task, 'failed');
      this.emitEvent(EventType.TASK_FAILED, { task, error });

      return {
        taskId: task.id,
        success: false,
        error: error as Error,
        duration: task.actualDuration
      };
    } finally {
      this.activeTaskCount--;
      task.updatedAt = new Date();
      this.taskQueue.set(task.id, task);
    }
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Task execution timeout')), timeout);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private getExecutor(task: Task): TaskExecutor | null {
    const type = task.metadata?.type || 'default';
    return this.executors.get(type) || this.executors.get('default') || null;
  }

  public registerExecutor(type: string, executor: TaskExecutor): void {
    this.executors.set(type, executor);
  }

  private async assignTask(task: Task): Promise<void> {
    // Simple assignment logic - can be enhanced with AI-based assignment
    const availableModules = Array.from(this.executors.keys());
    const taskType = task.metadata?.type || 'default';
    
    if (availableModules.includes(taskType)) {
      task.assignedModule = taskType;
    } else if (availableModules.length > 0) {
      // Assign to first available module as fallback
      task.assignedModule = availableModules[0];
    }

    task.updatedAt = new Date();
    this.taskQueue.set(task.id, task);
  }

  public async getTask(id: string): Promise<Task | null> {
    return this.taskQueue.get(id) || null;
  }

  public async listTasks(filter?: TaskFilter): Promise<Task[]> {
    let tasks = Array.from(this.taskQueue.values());

    if (filter) {
      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
        tasks = tasks.filter(task => statuses.includes(task.status));
      }

      if (filter.priority) {
        const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
        tasks = tasks.filter(task => priorities.includes(task.priority));
      }

      if (filter.assignedModule) {
        tasks = tasks.filter(task => task.assignedModule === filter.assignedModule);
      }

      if (filter.createdAfter) {
        tasks = tasks.filter(task => task.createdAt >= filter.createdAfter);
      }

      if (filter.createdBefore) {
        tasks = tasks.filter(task => task.createdAt <= filter.createdBefore);
      }
    }

    return tasks;
  }

  public async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    const task = this.taskQueue.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    Object.assign(task, updates, { updatedAt: new Date() });
    this.taskQueue.set(id, task);
  }

  public async cancelTask(id: string): Promise<void> {
    const task = this.taskQueue.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (task.status === TaskStatus.IN_PROGRESS) {
      throw new Error('Cannot cancel task in progress');
    }

    task.status = TaskStatus.CANCELLED;
    task.updatedAt = new Date();
    this.taskQueue.set(id, task);
    this.updateMetrics(task, 'cancelled');
  }

  private updateMetrics(task: Task, action: 'created' | 'completed' | 'failed' | 'cancelled'): void {
    switch (action) {
      case 'created':
        this.metrics.totalTasks++;
        this.metrics.tasksByStatus[task.status]++;
        this.metrics.tasksByPriority[task.priority]++;
        break;
      case 'completed':
        this.metrics.completedTasks++;
        this.metrics.tasksByStatus[TaskStatus.IN_PROGRESS]--;
        this.metrics.tasksByStatus[TaskStatus.COMPLETED]++;
        if (task.actualDuration) {
          const totalDuration = this.metrics.averageDuration * (this.metrics.completedTasks - 1);
          this.metrics.averageDuration = (totalDuration + task.actualDuration) / this.metrics.completedTasks;
        }
        break;
      case 'failed':
        this.metrics.failedTasks++;
        this.metrics.tasksByStatus[TaskStatus.IN_PROGRESS]--;
        this.metrics.tasksByStatus[TaskStatus.FAILED]++;
        break;
      case 'cancelled':
        this.metrics.tasksByStatus[TaskStatus.PENDING]--;
        this.metrics.tasksByStatus[TaskStatus.CANCELLED]++;
        break;
    }
  }

  public getMetrics(): TaskMetrics {
    return { ...this.metrics };
  }

  private emitEvent(type: EventType, data: any): void {
    const event: SystemEvent = {
      id: uuidv4(),
      type,
      source: 'TaskManager',
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

  public async processTaskQueue(): Promise<void> {
    while (this.activeTaskCount < this.config.maxConcurrentTasks) {
      const result = await this.executeNextTask();
      if (!result) {
        break; // No more tasks to execute
      }
    }
  }
}

// Export types and config
export * from './types';
export * from './config';