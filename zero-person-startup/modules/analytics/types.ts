/**
 * Analytics Module Types
 * Defines interfaces and types for autonomous analytics and reporting
 */

export interface Metric {
  id: string;
  name: string;
  category: MetricCategory;
  value: number;
  unit: string;
  timestamp: Date;
  trend: 'up' | 'down' | 'stable';
  changePercent?: number;
  target?: number;
  status?: 'on-track' | 'warning' | 'critical';
}

export type MetricCategory = 
  | 'revenue'
  | 'customer'
  | 'operations'
  | 'marketing'
  | 'product'
  | 'financial';

export interface KPI {
  id: string;
  name: string;
  description: string;
  formula: string;
  category: MetricCategory;
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  target: number;
  threshold: {
    critical: number;
    warning: number;
  };
  dependencies: string[]; // Other KPI IDs
  lastCalculated?: Date;
  currentValue?: number;
  historicalValues: TimeSeriesData[];
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

export interface Report {
  id: string;
  name: string;
  type: ReportType;
  schedule: ReportSchedule;
  recipients: string[];
  format: 'pdf' | 'html' | 'csv' | 'json';
  template: string;
  filters?: ReportFilter[];
  lastGenerated?: Date;
  nextScheduled?: Date;
  status: 'active' | 'paused' | 'draft';
}

export type ReportType = 
  | 'dashboard'
  | 'summary'
  | 'detailed'
  | 'comparison'
  | 'forecast'
  | 'custom';

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'on-demand';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  timezone: string;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in';
  value: any;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  layout: DashboardLayout;
  refreshInterval: number; // seconds
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: DataSource;
  visualization: VisualizationConfig;
  position: WidgetPosition;
  size: WidgetSize;
  refreshInterval?: number;
}

export type WidgetType = 
  | 'metric'
  | 'chart'
  | 'table'
  | 'gauge'
  | 'map'
  | 'list'
  | 'text';

export interface DataSource {
  type: 'kpi' | 'metric' | 'query' | 'api';
  id?: string;
  query?: string;
  endpoint?: string;
  aggregation?: AggregationType;
  timeRange?: TimeRange;
}

export type AggregationType = 'sum' | 'average' | 'count' | 'min' | 'max' | 'last';

export interface TimeRange {
  type: 'relative' | 'absolute';
  value?: string; // e.g., '7d', '1m', '1y' for relative
  start?: Date;
  end?: Date;
}

export interface VisualizationConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter';
  colors?: string[];
  legend?: boolean;
  grid?: boolean;
  animation?: boolean;
  format?: string; // Number format
}

export interface WidgetPosition {
  x: number;
  y: number;
}

export interface WidgetSize {
  width: number;
  height: number;
}

export interface DashboardLayout {
  type: 'grid' | 'freeform';
  columns: number;
  rowHeight: number;
}

export interface Insight {
  id: string;
  type: InsightType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric?: string;
  value?: number;
  threshold?: number;
  recommendation?: string;
  timestamp: Date;
  acknowledged: boolean;
  actionTaken?: string;
}

export type InsightType = 
  | 'anomaly'
  | 'trend'
  | 'forecast'
  | 'correlation'
  | 'threshold'
  | 'pattern';

export interface Forecast {
  id: string;
  metric: string;
  model: ForecastModel;
  period: number; // days ahead
  predictions: TimeSeriesData[];
  confidence: number;
  accuracy?: number;
  lastUpdated: Date;
}

export type ForecastModel = 
  | 'linear'
  | 'exponential'
  | 'seasonal'
  | 'arima'
  | 'neural';

export interface DataPipeline {
  id: string;
  name: string;
  source: DataSourceConfig;
  transformations: Transformation[];
  destination: DataDestination;
  schedule: PipelineSchedule;
  status: 'active' | 'paused' | 'failed';
  lastRun?: Date;
  nextRun?: Date;
}

export interface DataSourceConfig {
  type: 'database' | 'api' | 'file' | 'stream';
  connection: Record<string, any>;
  query?: string;
  format?: string;
}

export interface Transformation {
  type: 'filter' | 'map' | 'aggregate' | 'join' | 'calculate';
  config: Record<string, any>;
}

export interface DataDestination {
  type: 'database' | 'file' | 'api' | 'cache';
  config: Record<string, any>;
}

export interface PipelineSchedule {
  type: 'cron' | 'interval' | 'realtime';
  expression?: string;
  interval?: number;
}

export interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  eventType: AnalyticsEventType;
  source: string;
  data: Record<string, any>;
  processed: boolean;
}

export type AnalyticsEventType = 
  | 'page_view'
  | 'user_action'
  | 'transaction'
  | 'error'
  | 'performance'
  | 'custom';

export interface AnalyticsConfig {
  tracking: {
    enabled: boolean;
    events: string[];
    sampling: number; // 0-1
    anonymize: boolean;
  };
  reporting: {
    defaultTimezone: string;
    workingHours: {
      start: string;
      end: string;
    };
    fiscalYearStart: number; // month
  };
  alerts: {
    enabled: boolean;
    channels: AlertChannel[];
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  retention: {
    raw: number; // days
    aggregated: number; // days
    reports: number; // days
  };
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: Record<string, any>;
  enabled: boolean;
}

export interface AnalyticsMetrics {
  kpis: {
    total: number;
    calculated: number;
    onTrack: number;
    warning: number;
    critical: number;
  };
  reports: {
    total: number;
    scheduled: number;
    generated: number;
    failed: number;
  };
  insights: {
    total: number;
    unacknowledged: number;
    critical: number;
    actionable: number;
  };
  data: {
    eventsProcessed: number;
    pipelinesActive: number;
    storageUsed: number;
    queryCount: number;
  };
}