import { TaskManagerConfig } from './types';

export const defaultTaskManagerConfig: TaskManagerConfig = {
  maxConcurrentTasks: 10,
  taskTimeout: 300000, // 5 minutes
  retryAttempts: 3,
  priorityQueueEnabled: true,
  autoAssignEnabled: true
};

export function createTaskManagerConfig(overrides?: Partial<TaskManagerConfig>): TaskManagerConfig {
  return {
    ...defaultTaskManagerConfig,
    ...overrides
  };
}