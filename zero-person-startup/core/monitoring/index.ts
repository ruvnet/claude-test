import { v4 as uuidv4 } from 'uuid';
import { 
  SystemMetrics, 
  HealthStatus, 
  ModuleStatus,
  SystemEvent,
  EventType 
} from '../../shared/interfaces';
import { 
  MonitoringConfig,
  Monitor,
  MetricData,
  HealthCheck,
  Alert,
  AlertSeverity,
  AlertType,
  HealingAction,
  HealingResult,
  MetricsQuery,
  MonitoringDashboard,
  TrendData
} from './types';
import { createMonitoringConfig } from './config';

export class SystemMonitor {
  private config: MonitoringConfig;
  private monitors: Map<string, Monitor>;
  private metrics: Map<string, MetricData[]>;
  private alerts: Alert[];
  private healingActions: Map<string, HealingAction>;
  private moduleHealth: Map<string, ModuleStatus>;
  private metricsInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private eventHandlers: Map<EventType, Function[]>;

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = createMonitoringConfig(config);
    this.monitors = new Map();
    this.metrics = new Map();
    this.alerts = [];
    this.healingActions = new Map();
    this.moduleHealth = new Map();
    this.eventHandlers = new Map();

    // Register default healing actions
    this.registerDefaultHealingActions();
  }

  public start(): void {
    // Start metrics collection
    this.metricsInterval = setInterval(
      () => this.collectMetrics(),
      this.config.metricsCollectionInterval
    );

    // Start health checks
    this.healthCheckInterval = setInterval(
      () => this.performHealthChecks(),
      this.config.healthCheckInterval
    );

    // Initial collection
    this.collectMetrics();
    this.performHealthChecks();
  }

  public stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }

  private registerDefaultHealingActions(): void {
    // Register memory cleanup action
    this.registerHealingAction({
      id: 'memory-cleanup',
      name: 'Memory Cleanup',
      condition: (metrics) => metrics.memory > this.config.alertThresholds.memoryUsage,
      execute: async () => {
        // In a real implementation, this would trigger garbage collection
        // or clear caches
        return {
          success: true,
          action: 'Cleared caches and triggered garbage collection',
          details: { freedMemory: '100MB' }
        };
      },
      cooldownPeriod: 300000 // 5 minutes
    });

    // Register task queue optimization
    this.registerHealingAction({
      id: 'optimize-task-queue',
      name: 'Optimize Task Queue',
      condition: (metrics) => metrics.activeTaskCount > this.config.alertThresholds.taskQueueSize,
      execute: async () => {
        // In a real implementation, this would rebalance or prioritize tasks
        return {
          success: true,
          action: 'Rebalanced task queue priorities',
          details: { optimizedTasks: 50 }
        };
      },
      cooldownPeriod: 600000 // 10 minutes
    });
  }

  public registerMonitor(name: string, monitor: Monitor): void {
    this.monitors.set(name, monitor);
  }

  public registerHealingAction(action: HealingAction): void {
    this.healingActions.set(action.id, action);
  }

  private async collectMetrics(): Promise<void> {
    const systemMetrics = await this.collectSystemMetrics();
    
    // Collect from all registered monitors
    for (const [name, monitor] of this.monitors) {
      try {
        const metric = await monitor.collect();
        this.storeMetric(metric);
      } catch (error) {
        console.error(`Failed to collect metrics from ${name}:`, error);
      }
    }

    // Check thresholds and create alerts
    this.checkThresholds(systemMetrics);

    // Execute healing actions if needed
    if (this.config.enableAutoHealing) {
      await this.executeHealingActions(systemMetrics);
    }
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    // In a real implementation, these would be actual system metrics
    const metrics: SystemMetrics = {
      timestamp: new Date(),
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      activeTaskCount: Math.floor(Math.random() * 50),
      completedTaskCount: Math.floor(Math.random() * 1000),
      failedTaskCount: Math.floor(Math.random() * 10),
      averageTaskDuration: Math.random() * 5000,
      systemHealth: HealthStatus.HEALTHY,
      moduleStatus: Object.fromEntries(this.moduleHealth)
    };

    // Store system metrics
    this.storeMetric({
      name: 'system.cpu',
      value: metrics.cpu,
      timestamp: metrics.timestamp
    });

    this.storeMetric({
      name: 'system.memory',
      value: metrics.memory,
      timestamp: metrics.timestamp
    });

    this.storeMetric({
      name: 'tasks.active',
      value: metrics.activeTaskCount,
      timestamp: metrics.timestamp
    });

    return metrics;
  }

  private storeMetric(metric: MetricData): void {
    const metrics = this.metrics.get(metric.name) || [];
    metrics.push(metric);
    
    // Keep only recent metrics based on retention
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.metricsRetentionDays);
    
    const recentMetrics = metrics.filter(m => m.timestamp > cutoffDate);
    this.metrics.set(metric.name, recentMetrics);
  }

  private async performHealthChecks(): Promise<void> {
    const overallHealth: HealthStatus[] = [];

    for (const [name, monitor] of this.monitors) {
      try {
        const health = await monitor.getHealth();
        const moduleStatus: ModuleStatus = {
          name,
          status: health.status,
          lastHeartbeat: new Date(),
          metrics: health.details
        };
        
        this.moduleHealth.set(name, moduleStatus);
        overallHealth.push(health.status);

        if (health.status === HealthStatus.CRITICAL || health.status === HealthStatus.OFFLINE) {
          this.createAlert({
            type: AlertType.MODULE_OFFLINE,
            severity: AlertSeverity.CRITICAL,
            message: `Module ${name} is ${health.status}: ${health.message || 'No details'}`
          });
        }
      } catch (error) {
        this.moduleHealth.set(name, {
          name,
          status: HealthStatus.OFFLINE,
          lastHeartbeat: new Date()
        });

        this.createAlert({
          type: AlertType.HEALTH_CHECK_FAILED,
          severity: AlertSeverity.ERROR,
          message: `Health check failed for ${name}: ${error}`
        });
      }
    }

    // Update overall system health
    const systemHealth = this.determineOverallHealth(overallHealth);
    if (systemHealth !== HealthStatus.HEALTHY) {
      this.emitEvent(EventType.SYSTEM_ERROR, {
        health: systemHealth,
        modules: Object.fromEntries(this.moduleHealth)
      });
    }
  }

  private determineOverallHealth(moduleHealthStatuses: HealthStatus[]): HealthStatus {
    if (moduleHealthStatuses.includes(HealthStatus.OFFLINE)) {
      return HealthStatus.CRITICAL;
    }
    if (moduleHealthStatuses.includes(HealthStatus.CRITICAL)) {
      return HealthStatus.CRITICAL;
    }
    if (moduleHealthStatuses.includes(HealthStatus.WARNING)) {
      return HealthStatus.WARNING;
    }
    return HealthStatus.HEALTHY;
  }

  private checkThresholds(metrics: SystemMetrics): void {
    const thresholds = this.config.alertThresholds;

    if (metrics.cpu > thresholds.cpuUsage) {
      this.createAlert({
        type: AlertType.THRESHOLD_EXCEEDED,
        severity: AlertSeverity.WARNING,
        message: `CPU usage ${metrics.cpu.toFixed(2)}% exceeds threshold ${thresholds.cpuUsage}%`,
        metric: 'cpu',
        value: metrics.cpu,
        threshold: thresholds.cpuUsage
      });
    }

    if (metrics.memory > thresholds.memoryUsage) {
      this.createAlert({
        type: AlertType.THRESHOLD_EXCEEDED,
        severity: AlertSeverity.WARNING,
        message: `Memory usage ${metrics.memory.toFixed(2)}% exceeds threshold ${thresholds.memoryUsage}%`,
        metric: 'memory',
        value: metrics.memory,
        threshold: thresholds.memoryUsage
      });
    }

    if (metrics.activeTaskCount > thresholds.taskQueueSize) {
      this.createAlert({
        type: AlertType.THRESHOLD_EXCEEDED,
        severity: AlertSeverity.ERROR,
        message: `Task queue size ${metrics.activeTaskCount} exceeds threshold ${thresholds.taskQueueSize}`,
        metric: 'taskQueue',
        value: metrics.activeTaskCount,
        threshold: thresholds.taskQueueSize
      });
    }

    const failureRate = metrics.completedTaskCount > 0 
      ? (metrics.failedTaskCount / metrics.completedTaskCount) * 100 
      : 0;

    if (failureRate > thresholds.failureRate) {
      this.createAlert({
        type: AlertType.ERROR_RATE_HIGH,
        severity: AlertSeverity.CRITICAL,
        message: `Task failure rate ${failureRate.toFixed(2)}% exceeds threshold ${thresholds.failureRate}%`,
        metric: 'failureRate',
        value: failureRate,
        threshold: thresholds.failureRate
      });
    }
  }

  private createAlert(alertData: Partial<Alert>): void {
    if (!this.config.enableAlerting) return;

    const alert: Alert = {
      id: uuidv4(),
      severity: alertData.severity || AlertSeverity.INFO,
      type: alertData.type || AlertType.THRESHOLD_EXCEEDED,
      message: alertData.message || 'Unknown alert',
      metric: alertData.metric,
      value: alertData.value,
      threshold: alertData.threshold,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    
    if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.ERROR) {
      this.emitEvent(EventType.METRIC_THRESHOLD, alert);
    }
  }

  private async executeHealingActions(metrics: SystemMetrics): Promise<void> {
    for (const [, action] of this.healingActions) {
      // Check cooldown
      if (action.lastExecuted) {
        const timeSinceLastExecution = Date.now() - action.lastExecuted.getTime();
        if (timeSinceLastExecution < action.cooldownPeriod) {
          continue;
        }
      }

      // Check condition
      if (action.condition(metrics, this.alerts)) {
        try {
          const result = await action.execute();
          action.lastExecuted = new Date();

          if (result.success) {
            console.log(`Healing action '${action.name}' executed successfully:`, result.action);
          } else {
            this.createAlert({
              type: AlertType.HEALTH_CHECK_FAILED,
              severity: AlertSeverity.ERROR,
              message: `Healing action '${action.name}' failed: ${result.error}`
            });
          }
        } catch (error) {
          this.createAlert({
            type: AlertType.HEALTH_CHECK_FAILED,
            severity: AlertSeverity.ERROR,
            message: `Healing action '${action.name}' threw error: ${error}`
          });
        }
      }
    }
  }

  public async getMetrics(query: MetricsQuery): Promise<MetricData[]> {
    let results: MetricData[] = [];

    if (query.name) {
      const metrics = this.metrics.get(query.name) || [];
      results = [...metrics];
    } else {
      // Get all metrics
      for (const metrics of this.metrics.values()) {
        results.push(...metrics);
      }
    }

    // Apply filters
    if (query.startTime) {
      results = results.filter(m => m.timestamp >= query.startTime!);
    }

    if (query.endTime) {
      results = results.filter(m => m.timestamp <= query.endTime!);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getDashboard(): MonitoringDashboard {
    const currentMetrics = this.collectSystemMetrics();
    const trends = this.calculateTrends();

    return {
      currentMetrics: currentMetrics as any, // Would be async in real implementation
      alerts: this.alerts.filter(a => !a.resolved),
      moduleHealth: new Map(this.moduleHealth),
      trends
    };
  }

  private calculateTrends(): Map<string, TrendData> {
    const trends = new Map<string, TrendData>();

    for (const [metricName, metrics] of this.metrics) {
      if (metrics.length < 2) continue;

      const recentMetrics = metrics.slice(-10); // Last 10 data points
      const values = recentMetrics.map(m => typeof m.value === 'number' ? m.value : 0);
      
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const changePercent = ((lastValue - firstValue) / firstValue) * 100;

      let trend: 'up' | 'down' | 'stable';
      if (Math.abs(changePercent) < 5) {
        trend = 'stable';
      } else if (changePercent > 0) {
        trend = 'up';
      } else {
        trend = 'down';
      }

      trends.set(metricName, {
        metric: metricName,
        trend,
        changePercent,
        dataPoints: recentMetrics.map(m => ({
          timestamp: m.timestamp,
          value: typeof m.value === 'number' ? m.value : 0
        }))
      });
    }

    return trends;
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  public getAlerts(includeResolved: boolean = false): Alert[] {
    return includeResolved 
      ? [...this.alerts]
      : this.alerts.filter(a => !a.resolved);
  }

  private emitEvent(type: EventType, data: any): void {
    const event: SystemEvent = {
      id: uuidv4(),
      type,
      source: 'SystemMonitor',
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