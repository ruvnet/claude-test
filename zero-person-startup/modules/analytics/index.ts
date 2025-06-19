/**
 * Analytics Module
 * Autonomous analytics and reporting system with KPI tracking and insights
 */

import { EventEmitter } from 'events';
import { KPIService } from './services/kpi-service.js';
import { ReportingService } from './services/reporting-service.js';
import {
  AnalyticsConfig,
  AnalyticsMetrics,
  KPI,
  Report,
  Dashboard,
  Insight,
  Metric,
  MetricCategory,
  ReportFilter,
  ReportType
} from './types.js';

export class AnalyticsModule extends EventEmitter {
  private kpiService: KPIService;
  private reportingService: ReportingService;
  private config: AnalyticsConfig;
  private insights: Map<string, Insight> = new Map();
  private events: AnalyticsEvent[] = [];

  constructor(config?: Partial<AnalyticsConfig>) {
    super();
    
    // Default configuration
    this.config = {
      tracking: {
        enabled: true,
        events: ['page_view', 'user_action', 'transaction', 'error'],
        sampling: 1.0, // Track 100% of events
        anonymize: false,
        ...config?.tracking
      },
      reporting: {
        defaultTimezone: 'UTC',
        workingHours: {
          start: '09:00',
          end: '17:00'
        },
        fiscalYearStart: 1, // January
        ...config?.reporting
      },
      alerts: {
        enabled: true,
        channels: [
          {
            type: 'email',
            config: { defaultRecipient: 'admin@company.com' },
            enabled: true
          }
        ],
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        },
        ...config?.alerts
      },
      retention: {
        raw: 30, // 30 days
        aggregated: 365, // 1 year
        reports: 90, // 90 days
        ...config?.retention
      }
    };

    // Initialize services
    this.kpiService = new KPIService(this.config.tracking);
    this.reportingService = new ReportingService(this.config.reporting);

    this.setupServiceIntegration();
    this.initializeDefaultDashboards();
    this.startDataProcessing();
  }

  /**
   * Setup inter-service communication
   */
  private setupServiceIntegration(): void {
    // KPI events
    this.kpiService.on('metric', (metric: Metric) => {
      this.emit('metric', metric);
    });

    this.kpiService.on('insight', (insight: Insight) => {
      this.handleInsight(insight);
    });

    this.kpiService.on('alert', (alert: any) => {
      this.handleAlert({
        ...alert,
        source: 'kpi'
      });
    });

    // Reporting events
    this.reportingService.on('report-generated', (event: any) => {
      this.emit('report-generated', event);
    });

    this.reportingService.on('dashboard-created', (event: any) => {
      this.emit('dashboard-created', event);
    });

    // Error handling
    [this.kpiService, this.reportingService].forEach(service => {
      service.on('error', (error: any) => {
        this.emit('error', {
          ...error,
          module: 'analytics'
        });
      });
    });
  }

  /**
   * Initialize default dashboards
   */
  private initializeDefaultDashboards(): void {
    // Executive Dashboard
    this.reportingService.createDashboard({
      id: 'executive_dashboard',
      name: 'Executive Dashboard',
      description: 'High-level business metrics and KPIs',
      widgets: [
        {
          id: 'revenue_metric',
          type: 'metric',
          title: 'Monthly Revenue',
          dataSource: { type: 'kpi', id: 'monthly_revenue' },
          visualization: { format: '$0,0' },
          position: { x: 0, y: 0 },
          size: { width: 3, height: 2 }
        },
        {
          id: 'orders_chart',
          type: 'chart',
          title: 'Daily Orders',
          dataSource: { 
            type: 'metric',
            aggregation: 'count',
            timeRange: { type: 'relative', value: '30d' }
          },
          visualization: { chartType: 'line', animation: true },
          position: { x: 3, y: 0 },
          size: { width: 6, height: 4 }
        },
        {
          id: 'customer_metrics',
          type: 'table',
          title: 'Customer Metrics',
          dataSource: { type: 'query', query: 'customer_summary' },
          visualization: {},
          position: { x: 0, y: 2 },
          size: { width: 3, height: 4 }
        },
        {
          id: 'conversion_gauge',
          type: 'gauge',
          title: 'Conversion Rate',
          dataSource: { type: 'kpi', id: 'conversion_rate' },
          visualization: { colors: ['#ff0000', '#ffff00', '#00ff00'] },
          position: { x: 9, y: 0 },
          size: { width: 3, height: 2 }
        }
      ],
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 60
      },
      refreshInterval: 300, // 5 minutes
      isPublic: false,
      createdBy: 'system'
    });

    // Operations Dashboard
    this.reportingService.createDashboard({
      id: 'operations_dashboard',
      name: 'Operations Dashboard',
      description: 'Real-time operations monitoring',
      widgets: [
        {
          id: 'order_status',
          type: 'chart',
          title: 'Order Status',
          dataSource: { type: 'query', query: 'order_status_breakdown' },
          visualization: { chartType: 'donut' },
          position: { x: 0, y: 0 },
          size: { width: 4, height: 3 }
        },
        {
          id: 'inventory_levels',
          type: 'list',
          title: 'Low Stock Items',
          dataSource: { type: 'query', query: 'low_stock_products' },
          visualization: {},
          position: { x: 4, y: 0 },
          size: { width: 4, height: 3 }
        },
        {
          id: 'fulfillment_metrics',
          type: 'table',
          title: 'Fulfillment Performance',
          dataSource: { type: 'query', query: 'fulfillment_metrics' },
          visualization: {},
          position: { x: 8, y: 0 },
          size: { width: 4, height: 3 }
        }
      ],
      layout: {
        type: 'grid',
        columns: 12,
        rowHeight: 80
      },
      refreshInterval: 60, // 1 minute
      isPublic: false,
      createdBy: 'system'
    });
  }

  /**
   * Start data processing
   */
  private startDataProcessing(): void {
    // Process events every 10 seconds
    setInterval(() => {
      this.processEvents();
    }, 10000);

    // Clean up old data daily
    setInterval(() => {
      this.cleanupOldData();
    }, 86400000);
  }

  /**
   * Track analytics event
   */
  trackEvent(eventType: string, data: Record<string, any>): void {
    if (!this.config.tracking.enabled) return;
    
    // Apply sampling
    if (Math.random() > this.config.tracking.sampling) return;

    // Anonymize if configured
    if (this.config.tracking.anonymize) {
      data = this.anonymizeData(data);
    }

    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType: eventType as any,
      source: data.source || 'unknown',
      data,
      processed: false
    };

    this.events.push(event);

    // Keep only recent events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-5000);
    }
  }

  /**
   * Process queued events
   */
  private processEvents(): void {
    const unprocessedEvents = this.events.filter(e => !e.processed);
    
    for (const event of unprocessedEvents) {
      // Update relevant metrics based on event type
      switch (event.eventType) {
        case 'transaction':
          this.updateTransactionMetrics(event.data);
          break;
        case 'page_view':
          this.updatePageViewMetrics(event.data);
          break;
        case 'user_action':
          this.updateUserActionMetrics(event.data);
          break;
        case 'error':
          this.updateErrorMetrics(event.data);
          break;
      }
      
      event.processed = true;
    }
  }

  /**
   * Update transaction metrics
   */
  private updateTransactionMetrics(data: any): void {
    // This would update actual metrics
    // For now, emit metric event
    this.emit('metric', {
      id: `transaction_${Date.now()}`,
      name: 'Transaction',
      category: 'revenue',
      value: data.amount || 0,
      unit: '$',
      timestamp: new Date(),
      trend: 'stable'
    });
  }

  /**
   * Update page view metrics
   */
  private updatePageViewMetrics(data: any): void {
    // Track page views
    this.emit('metric', {
      id: `pageview_${Date.now()}`,
      name: 'Page View',
      category: 'marketing',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      trend: 'stable'
    });
  }

  /**
   * Update user action metrics
   */
  private updateUserActionMetrics(data: any): void {
    // Track user actions
    this.emit('metric', {
      id: `action_${Date.now()}`,
      name: data.action || 'Unknown Action',
      category: 'product',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      trend: 'stable'
    });
  }

  /**
   * Update error metrics
   */
  private updateErrorMetrics(data: any): void {
    // Track errors
    this.emit('metric', {
      id: `error_${Date.now()}`,
      name: 'Error',
      category: 'operations',
      value: 1,
      unit: 'count',
      timestamp: new Date(),
      trend: 'up'
    });
  }

  /**
   * Handle new insight
   */
  private handleInsight(insight: Insight): void {
    this.insights.set(insight.id, insight);
    
    // Send alert if critical
    if (insight.severity === 'critical' && this.config.alerts.enabled) {
      this.sendAlert({
        type: 'insight',
        severity: 'critical',
        title: insight.title,
        description: insight.description,
        recommendation: insight.recommendation
      });
    }

    this.emit('insight', insight);
  }

  /**
   * Handle alert
   */
  private handleAlert(alert: any): void {
    if (!this.config.alerts.enabled) return;
    
    // Check quiet hours
    if (this.config.alerts.quietHours.enabled) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (this.isInQuietHours(currentTime)) {
        // Queue alert for later
        return;
      }
    }

    this.sendAlert(alert);
  }

  /**
   * Send alert through configured channels
   */
  private sendAlert(alert: any): void {
    for (const channel of this.config.alerts.channels) {
      if (!channel.enabled) continue;
      
      switch (channel.type) {
        case 'email':
          this.sendEmailAlert(alert, channel.config);
          break;
        case 'slack':
          this.sendSlackAlert(alert, channel.config);
          break;
        case 'webhook':
          this.sendWebhookAlert(alert, channel.config);
          break;
      }
    }

    this.emit('alert-sent', alert);
  }

  /**
   * Send email alert (mock implementation)
   */
  private sendEmailAlert(alert: any, config: any): void {
    console.log(`Email alert to ${config.defaultRecipient}: ${alert.title}`);
  }

  /**
   * Send Slack alert (mock implementation)
   */
  private sendSlackAlert(alert: any, config: any): void {
    console.log(`Slack alert to ${config.channel}: ${alert.title}`);
  }

  /**
   * Send webhook alert (mock implementation)
   */
  private sendWebhookAlert(alert: any, config: any): void {
    console.log(`Webhook alert to ${config.url}: ${alert.title}`);
  }

  /**
   * Clean up old data
   */
  private cleanupOldData(): void {
    const now = new Date();
    
    // Clean up old events
    const eventCutoff = new Date(now.getTime() - this.config.retention.raw * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(e => e.timestamp > eventCutoff);
    
    // Clean up old insights
    const insightCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (const [id, insight] of this.insights) {
      if (insight.timestamp < insightCutoff) {
        this.insights.delete(id);
      }
    }
  }

  /**
   * Get comprehensive metrics
   */
  async getMetrics(): Promise<AnalyticsMetrics> {
    const kpiSummary = this.kpiService.getKPISummary();
    const reports = this.reportingService.getAllReports();
    const insights = Array.from(this.insights.values());
    
    return {
      kpis: {
        total: kpiSummary.total,
        calculated: kpiSummary.total, // All are calculated
        onTrack: kpiSummary.byStatus.onTrack,
        warning: kpiSummary.byStatus.warning,
        critical: kpiSummary.byStatus.critical
      },
      reports: {
        total: reports.length,
        scheduled: reports.filter(r => r.status === 'active').length,
        generated: reports.filter(r => r.lastGenerated).length,
        failed: 0 // Would track actual failures
      },
      insights: {
        total: insights.length,
        unacknowledged: insights.filter(i => !i.acknowledged).length,
        critical: insights.filter(i => i.severity === 'critical').length,
        actionable: insights.filter(i => i.recommendation).length
      },
      data: {
        eventsProcessed: this.events.filter(e => e.processed).length,
        pipelinesActive: 0, // Would track actual pipelines
        storageUsed: this.calculateStorageUsed(),
        queryCount: 0 // Would track actual queries
      }
    };
  }

  /**
   * Get module status
   */
  getStatus(): any {
    const metrics = this.kpiService.getKPISummary();
    const reports = this.reportingService.getAllReports();
    const dashboards = this.reportingService.getAllDashboards();
    
    return {
      module: 'analytics',
      status: 'operational',
      services: {
        kpi: {
          enabled: true,
          totalKPIs: metrics.total,
          lastCalculated: new Date(metrics.lastCalculated)
        },
        reporting: {
          enabled: true,
          activeReports: reports.filter(r => r.status === 'active').length,
          dashboards: dashboards.length
        },
        tracking: {
          enabled: this.config.tracking.enabled,
          eventsTracked: this.events.length,
          sampling: this.config.tracking.sampling
        }
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Helper methods
   */
  
  private anonymizeData(data: any): any {
    const anonymized = { ...data };
    
    // Remove PII fields
    const piiFields = ['email', 'name', 'phone', 'address', 'ip'];
    piiFields.forEach(field => {
      if (anonymized[field]) {
        anonymized[field] = 'REDACTED';
      }
    });
    
    return anonymized;
  }

  private isInQuietHours(currentTime: string): boolean {
    const { start, end } = this.config.alerts.quietHours;
    
    if (start < end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Quiet hours span midnight
      return currentTime >= start || currentTime <= end;
    }
  }

  private calculateStorageUsed(): number {
    // Rough estimate of storage used
    const eventSize = this.events.length * 200; // 200 bytes per event
    const insightSize = this.insights.size * 500; // 500 bytes per insight
    const kpiSize = this.kpiService.getAllKPIs().length * 10000; // 10KB per KPI with history
    
    return eventSize + insightSize + kpiSize;
  }

  private generateEventId(): string {
    return `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Public API
   */
  
  // KPI Management
  registerKPI(kpi: KPI): void {
    this.kpiService.registerKPI(kpi);
  }

  async calculateKPI(kpiId: string): Promise<number> {
    return this.kpiService.calculateKPI(kpiId);
  }

  getKPI(kpiId: string): KPI | undefined {
    return this.kpiService.getKPI(kpiId);
  }

  getKPIsByCategory(category: MetricCategory): KPI[] {
    return this.kpiService.getKPIsByCategory(category);
  }

  // Reporting
  createReport(report: Report): Report {
    return this.reportingService.createReport(report);
  }

  async generateReport(reportId: string): Promise<void> {
    return this.reportingService.generateAndDistributeReport(reportId);
  }

  async generateOnDemandReport(
    type: ReportType,
    filters?: ReportFilter[],
    format?: Report['format']
  ): Promise<string> {
    return this.reportingService.generateOnDemandReport(type, filters, format);
  }

  // Dashboards
  createDashboard(dashboard: Omit<Dashboard, 'createdAt' | 'updatedAt'>): Dashboard {
    return this.reportingService.createDashboard(dashboard);
  }

  async getDashboardData(dashboardId: string): Promise<any> {
    return this.reportingService.getDashboardData(dashboardId);
  }

  // Insights
  getInsights(acknowledged?: boolean): Insight[] {
    const insights = Array.from(this.insights.values());
    if (acknowledged !== undefined) {
      return insights.filter(i => i.acknowledged === acknowledged);
    }
    return insights;
  }

  acknowledgeInsight(insightId: string, actionTaken?: string): void {
    const insight = this.insights.get(insightId);
    if (insight) {
      insight.acknowledged = true;
      if (actionTaken) {
        insight.actionTaken = actionTaken;
      }
    }
  }

  /**
   * Service access
   */
  
  getKPIService(): KPIService {
    return this.kpiService;
  }

  getReportingService(): ReportingService {
    return this.reportingService;
  }
}

// Export types and main module
export * from './types.js';
export default AnalyticsModule;

// Analytics event type for internal use
interface AnalyticsEvent {
  id: string;
  timestamp: Date;
  eventType: 'page_view' | 'user_action' | 'transaction' | 'error' | 'performance' | 'custom';
  source: string;
  data: Record<string, any>;
  processed: boolean;
}