import { SystemMetrics, HealthStatus, ModuleStatus } from '../../shared/interfaces';

export interface MonitoringConfig {
  metricsCollectionInterval: number;
  healthCheckInterval: number;
  alertThresholds: AlertThresholds;
  enableAutoHealing: boolean;
  metricsRetentionDays: number;
  enableAlerting: boolean;
}

export interface AlertThresholds {
  cpuUsage: number;
  memoryUsage: number;
  taskQueueSize: number;
  failureRate: number;
  responseTime: number;
}

export interface Monitor {
  name: string;
  collect(): Promise<MetricData>;
  getHealth(): Promise<HealthCheck>;
}

export interface MetricData {
  name: string;
  value: number | Record<string, any>;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface HealthCheck {
  status: HealthStatus;
  message?: string;
  details?: Record<string, any>;
  lastCheck: Date;
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertType {
  THRESHOLD_EXCEEDED = 'threshold_exceeded',
  HEALTH_CHECK_FAILED = 'health_check_failed',
  MODULE_OFFLINE = 'module_offline',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  ERROR_RATE_HIGH = 'error_rate_high'
}

export interface HealingAction {
  id: string;
  name: string;
  condition: (metrics: SystemMetrics, alerts: Alert[]) => boolean;
  execute: () => Promise<HealingResult>;
  cooldownPeriod: number; // milliseconds
  lastExecuted?: Date;
}

export interface HealingResult {
  success: boolean;
  action: string;
  details?: Record<string, any>;
  error?: string;
}

export interface MetricsStore {
  store(metric: MetricData): Promise<void>;
  query(options: MetricsQuery): Promise<MetricData[]>;
  aggregate(options: AggregationOptions): Promise<AggregatedMetrics>;
  cleanup(olderThan: Date): Promise<number>;
}

export interface MetricsQuery {
  name?: string;
  startTime?: Date;
  endTime?: Date;
  tags?: Record<string, string>;
  limit?: number;
}

export interface AggregationOptions {
  metric: string;
  aggregation: AggregationType;
  interval: AggregationInterval;
  startTime: Date;
  endTime: Date;
}

export enum AggregationType {
  AVG = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  COUNT = 'count'
}

export enum AggregationInterval {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week'
}

export interface AggregatedMetrics {
  metric: string;
  aggregation: AggregationType;
  interval: AggregationInterval;
  data: Array<{
    timestamp: Date;
    value: number;
  }>;
}

export interface MonitoringDashboard {
  currentMetrics: SystemMetrics;
  alerts: Alert[];
  moduleHealth: Map<string, ModuleStatus>;
  trends: Map<string, TrendData>;
}

export interface TrendData {
  metric: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  dataPoints: Array<{
    timestamp: Date;
    value: number;
  }>;
}