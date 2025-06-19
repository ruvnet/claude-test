export interface BaseEntity {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type StartupStage = 'idea' | 'validation' | 'mvp' | 'growth' | 'scale' | 'exit';

export interface Startup extends BaseEntity {
  organizationId: string;
  name: string;
  description: string;
  industry: string;
  stage: StartupStage;
  logoUrl?: string;
  website?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Agent {
  id: string
  name: string
  type: 'researcher' | 'coder' | 'analyst' | 'architect' | 'reviewer' | 'debugger' | 'tester'
  status: 'idle' | 'running' | 'error' | 'completed'
  createdAt: Date
  lastActiveAt: Date
  capabilities: string[]
  metrics: {
    tasksCompleted: number
    successRate: number
    averageExecutionTime: number
  }
}

export interface Task {
  id: string
  title: string
  description: string
  assignedAgentId?: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  estimatedDuration?: number
  actualDuration?: number
  dependencies: string[]
  output?: Record<string, unknown>
  error?: string
}

export interface Workflow {
  id: string
  name: string
  description: string
  tasks: WorkflowTask[]
  status: 'draft' | 'active' | 'paused' | 'completed'
  createdAt: Date
  lastRunAt?: Date
  schedule?: {
    type: 'once' | 'recurring'
    cron?: string
    nextRunAt?: Date
  }
}

export interface WorkflowTask {
  id: string
  taskId: string
  position: { x: number; y: number }
  connections: string[]
  config: Record<string, unknown>
}

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  createdAt: Date
  subscription: {
    plan: 'free' | 'pro' | 'enterprise'
    status: 'active' | 'inactive' | 'cancelled'
    validUntil?: Date
  }
}