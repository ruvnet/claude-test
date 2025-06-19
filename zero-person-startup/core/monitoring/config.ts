import { MonitoringConfig, AlertThresholds } from './types';

export const defaultAlertThresholds: AlertThresholds = {
  cpuUsage: 80, // percent
  memoryUsage: 85, // percent
  taskQueueSize: 100, // number of tasks
  failureRate: 10, // percent
  responseTime: 5000 // milliseconds
};

export const defaultMonitoringConfig: MonitoringConfig = {
  metricsCollectionInterval: 60000, // 1 minute
  healthCheckInterval: 30000, // 30 seconds
  alertThresholds: defaultAlertThresholds,
  enableAutoHealing: true,
  metricsRetentionDays: 7,
  enableAlerting: true
};

export function createMonitoringConfig(overrides?: Partial<MonitoringConfig>): MonitoringConfig {
  return {
    ...defaultMonitoringConfig,
    ...overrides,
    alertThresholds: {
      ...defaultAlertThresholds,
      ...(overrides?.alertThresholds || {})
    }
  };
}