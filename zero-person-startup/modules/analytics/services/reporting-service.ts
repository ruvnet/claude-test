/**
 * Autonomous Reporting Service
 * Generates and distributes automated reports
 */

import { EventEmitter } from 'events';
import {
  Report,
  ReportType,
  ReportSchedule,
  ReportFilter,
  Dashboard,
  Widget,
  KPI,
  Metric,
  TimeRange,
  AnalyticsConfig
} from '../types.js';

export class ReportingService extends EventEmitter {
  private reports: Map<string, Report> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private templates: Map<string, ReportTemplate> = new Map();
  private config: AnalyticsConfig['reporting'];
  private reportGenerator: ReportGenerator;
  private reportDistributor: ReportDistributor;

  constructor(config: AnalyticsConfig['reporting']) {
    super();
    this.config = config;
    this.reportGenerator = new ReportGenerator();
    this.reportDistributor = new ReportDistributor();
    this.initializeDefaultReports();
    this.startScheduler();
  }

  /**
   * Initialize default reports
   */
  private initializeDefaultReports(): void {
    // Daily Summary Report
    this.createReport({
      id: 'daily_summary',
      name: 'Daily Business Summary',
      type: 'summary',
      schedule: {
        frequency: 'daily',
        time: '08:00',
        timezone: this.config.defaultTimezone
      },
      recipients: ['admin@company.com'],
      format: 'html',
      template: 'daily_summary_template',
      status: 'active'
    });

    // Weekly Performance Report
    this.createReport({
      id: 'weekly_performance',
      name: 'Weekly Performance Report',
      type: 'detailed',
      schedule: {
        frequency: 'weekly',
        dayOfWeek: 1, // Monday
        time: '09:00',
        timezone: this.config.defaultTimezone
      },
      recipients: ['management@company.com'],
      format: 'pdf',
      template: 'weekly_performance_template',
      filters: [
        {
          field: 'category',
          operator: 'in',
          value: ['revenue', 'customer', 'operations']
        }
      ],
      status: 'active'
    });

    // Monthly Financial Report
    this.createReport({
      id: 'monthly_financial',
      name: 'Monthly Financial Report',
      type: 'detailed',
      schedule: {
        frequency: 'monthly',
        dayOfMonth: 1,
        time: '06:00',
        timezone: this.config.defaultTimezone
      },
      recipients: ['finance@company.com', 'cfo@company.com'],
      format: 'pdf',
      template: 'financial_report_template',
      filters: [
        {
          field: 'category',
          operator: 'equals',
          value: 'financial'
        }
      ],
      status: 'active'
    });

    this.initializeReportTemplates();
  }

  /**
   * Initialize report templates
   */
  private initializeReportTemplates(): void {
    // Daily Summary Template
    this.templates.set('daily_summary_template', {
      id: 'daily_summary_template',
      name: 'Daily Summary',
      sections: [
        {
          title: 'Key Metrics',
          type: 'metrics',
          metrics: ['monthly_revenue', 'orders_today', 'new_customers', 'average_order_value']
        },
        {
          title: 'Performance Highlights',
          type: 'highlights',
          kpis: ['conversion_rate', 'customer_satisfaction', 'order_fulfillment_time']
        },
        {
          title: 'Alerts & Issues',
          type: 'alerts',
          severity: ['critical', 'warning']
        }
      ]
    });

    // Weekly Performance Template
    this.templates.set('weekly_performance_template', {
      id: 'weekly_performance_template',
      name: 'Weekly Performance',
      sections: [
        {
          title: 'Executive Summary',
          type: 'summary',
          content: 'auto'
        },
        {
          title: 'Revenue Analysis',
          type: 'chart',
          chartType: 'line',
          metric: 'daily_revenue',
          timeRange: { type: 'relative', value: '7d' }
        },
        {
          title: 'Customer Metrics',
          type: 'table',
          metrics: ['new_customers', 'customer_retention', 'customer_lifetime_value']
        },
        {
          title: 'Operations Overview',
          type: 'dashboard',
          widgets: ['order_status', 'inventory_levels', 'fulfillment_performance']
        }
      ]
    });
  }

  /**
   * Start report scheduler
   */
  private startScheduler(): void {
    // Check every minute for scheduled reports
    setInterval(() => {
      this.checkScheduledReports();
    }, 60000);
  }

  /**
   * Check and execute scheduled reports
   */
  private async checkScheduledReports(): Promise<void> {
    const now = new Date();
    
    for (const report of this.reports.values()) {
      if (report.status !== 'active') continue;

      if (this.shouldRunReport(report, now)) {
        await this.generateAndDistributeReport(report.id);
      }
    }
  }

  /**
   * Check if report should run
   */
  private shouldRunReport(report: Report, now: Date): boolean {
    const schedule = report.schedule;
    
    // Check if already run today
    if (report.lastGenerated) {
      const lastRun = new Date(report.lastGenerated);
      if (
        lastRun.getDate() === now.getDate() &&
        lastRun.getMonth() === now.getMonth() &&
        lastRun.getFullYear() === now.getFullYear()
      ) {
        return false;
      }
    }

    // Check schedule
    switch (schedule.frequency) {
      case 'daily':
        return this.checkTimeMatch(now, schedule.time!);
        
      case 'weekly':
        return now.getDay() === schedule.dayOfWeek && 
               this.checkTimeMatch(now, schedule.time!);
               
      case 'monthly':
        return now.getDate() === schedule.dayOfMonth && 
               this.checkTimeMatch(now, schedule.time!);
               
      case 'quarterly':
        const quarterMonths = [0, 3, 6, 9];
        return quarterMonths.includes(now.getMonth()) &&
               now.getDate() === 1 &&
               this.checkTimeMatch(now, schedule.time!);
               
      default:
        return false;
    }
  }

  /**
   * Check if current time matches scheduled time
   */
  private checkTimeMatch(now: Date, scheduledTime: string): boolean {
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    return now.getHours() === hours && now.getMinutes() === minutes;
  }

  /**
   * Create new report
   */
  createReport(reportData: Report): Report {
    this.reports.set(reportData.id, reportData);
    
    this.emit('report-created', {
      reportId: reportData.id,
      name: reportData.name,
      schedule: reportData.schedule
    });

    return reportData;
  }

  /**
   * Generate and distribute report
   */
  async generateAndDistributeReport(reportId: string): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    try {
      // Generate report content
      const content = await this.reportGenerator.generate(
        report,
        this.templates.get(report.template)!,
        await this.getReportData(report)
      );

      // Distribute report
      await this.reportDistributor.distribute(report, content);

      // Update report status
      report.lastGenerated = new Date();
      report.nextScheduled = this.calculateNextRun(report.schedule);

      this.emit('report-generated', {
        reportId: report.id,
        recipients: report.recipients.length,
        format: report.format
      });

    } catch (error) {
      this.emit('error', {
        type: 'report-generation',
        reportId: report.id,
        error: error.message
      });
    }
  }

  /**
   * Get data for report
   */
  private async getReportData(report: Report): Promise<any> {
    // This would fetch actual data based on report configuration
    // For now, return mock data
    return {
      metrics: {
        monthly_revenue: 125000,
        orders_today: 156,
        new_customers: 23,
        average_order_value: 145.50
      },
      kpis: [
        { id: 'conversion_rate', value: 3.2, target: 3.5, status: 'warning' },
        { id: 'customer_satisfaction', value: 4.6, target: 4.5, status: 'on-track' },
        { id: 'order_fulfillment_time', value: 36, target: 48, status: 'on-track' }
      ],
      alerts: [
        { severity: 'warning', message: 'Inventory low for 5 products' },
        { severity: 'critical', message: 'Payment processor response time high' }
      ],
      charts: {
        daily_revenue: [
          { date: '2024-01-01', value: 18500 },
          { date: '2024-01-02', value: 22300 },
          { date: '2024-01-03', value: 19800 },
          { date: '2024-01-04', value: 21200 },
          { date: '2024-01-05', value: 20100 },
          { date: '2024-01-06', value: 17800 },
          { date: '2024-01-07', value: 25300 }
        ]
      }
    };
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(schedule: ReportSchedule): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule.frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'quarterly':
        next.setMonth(next.getMonth() + 3);
        break;
    }

    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      next.setHours(hours, minutes, 0, 0);
    }

    return next;
  }

  /**
   * Create dashboard
   */
  createDashboard(dashboardData: Omit<Dashboard, 'createdAt' | 'updatedAt'>): Dashboard {
    const dashboard: Dashboard = {
      ...dashboardData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.dashboards.set(dashboard.id, dashboard);

    this.emit('dashboard-created', {
      dashboardId: dashboard.id,
      name: dashboard.name,
      widgetCount: dashboard.widgets.length
    });

    return dashboard;
  }

  /**
   * Update dashboard
   */
  updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Dashboard {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    Object.assign(dashboard, updates, {
      updatedAt: new Date()
    });

    return dashboard;
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(dashboardId: string): Promise<any> {
    const dashboard = this.dashboards.get(dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const widgetData: Record<string, any> = {};

    for (const widget of dashboard.widgets) {
      widgetData[widget.id] = await this.getWidgetData(widget);
    }

    return {
      dashboard,
      data: widgetData,
      lastRefreshed: new Date()
    };
  }

  /**
   * Get widget data
   */
  private async getWidgetData(widget: Widget): Promise<any> {
    // This would fetch actual data based on widget configuration
    // For now, return mock data based on widget type
    switch (widget.type) {
      case 'metric':
        return {
          value: Math.random() * 10000,
          change: Math.random() * 20 - 10,
          trend: 'up'
        };
        
      case 'chart':
        return {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          datasets: [{
            label: widget.title,
            data: Array(7).fill(0).map(() => Math.random() * 1000)
          }]
        };
        
      case 'table':
        return {
          headers: ['Metric', 'Value', 'Target', 'Status'],
          rows: [
            ['Revenue', '$125,000', '$100,000', 'on-track'],
            ['Orders', '1,234', '1,000', 'on-track'],
            ['Customers', '5,678', '5,000', 'on-track']
          ]
        };
        
      default:
        return {};
    }
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): Report | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Get all reports
   */
  getAllReports(): Report[] {
    return Array.from(this.reports.values());
  }

  /**
   * Get dashboard by ID
   */
  getDashboard(dashboardId: string): Dashboard | undefined {
    return this.dashboards.get(dashboardId);
  }

  /**
   * Get all dashboards
   */
  getAllDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  /**
   * Generate on-demand report
   */
  async generateOnDemandReport(
    type: ReportType,
    filters?: ReportFilter[],
    format: Report['format'] = 'pdf'
  ): Promise<string> {
    const report: Report = {
      id: `ondemand_${Date.now()}`,
      name: `On-Demand ${type} Report`,
      type,
      schedule: {
        frequency: 'on-demand',
        timezone: this.config.defaultTimezone
      },
      recipients: [],
      format,
      template: `${type}_template`,
      filters,
      status: 'active'
    };

    const content = await this.reportGenerator.generate(
      report,
      this.templates.get(report.template)!,
      await this.getReportData(report)
    );

    return content;
  }
}

/**
 * Report Generator
 */
class ReportGenerator {
  async generate(report: Report, template: ReportTemplate, data: any): Promise<string> {
    // Generate report based on format
    switch (report.format) {
      case 'html':
        return this.generateHTML(template, data);
      case 'pdf':
        return this.generatePDF(template, data);
      case 'csv':
        return this.generateCSV(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      default:
        throw new Error(`Unsupported format: ${report.format}`);
    }
  }

  private generateHTML(template: ReportTemplate, data: any): string {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${template.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #333; }
          .section { margin: 20px 0; }
          .metric { display: inline-block; margin: 10px; padding: 10px; border: 1px solid #ddd; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .alert { padding: 10px; margin: 10px 0; border-radius: 4px; }
          .alert.warning { background-color: #fff3cd; }
          .alert.critical { background-color: #f8d7da; }
        </style>
      </head>
      <body>
        <h1>${template.name}</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
    `;

    for (const section of template.sections) {
      html += `<div class="section"><h2>${section.title}</h2>`;
      
      switch (section.type) {
        case 'metrics':
          html += '<div class="metrics">';
          for (const metric of section.metrics || []) {
            const value = data.metrics[metric];
            html += `<div class="metric"><strong>${metric}:</strong> ${value}</div>`;
          }
          html += '</div>';
          break;
          
        case 'alerts':
          for (const alert of data.alerts || []) {
            html += `<div class="alert ${alert.severity}">${alert.message}</div>`;
          }
          break;
          
        case 'table':
          html += '<table>';
          html += '<tr>' + data.headers.map(h => `<th>${h}</th>`).join('') + '</tr>';
          for (const row of data.rows) {
            html += '<tr>' + row.map(cell => `<td>${cell}</td>`).join('') + '</tr>';
          }
          html += '</table>';
          break;
      }
      
      html += '</div>';
    }

    html += '</body></html>';
    return html;
  }

  private generatePDF(template: ReportTemplate, data: any): string {
    // In reality, would use a PDF generation library
    // For now, return a placeholder
    return `PDF Report: ${template.name}\nGenerated: ${new Date().toISOString()}\nData: ${JSON.stringify(data)}`;
  }

  private generateCSV(data: any): string {
    // Simple CSV generation
    const rows: string[] = [];
    
    // Add headers
    rows.push('Metric,Value,Target,Status');
    
    // Add data
    for (const kpi of data.kpis || []) {
      rows.push(`${kpi.id},${kpi.value},${kpi.target},${kpi.status}`);
    }
    
    return rows.join('\n');
  }
}

/**
 * Report Distributor
 */
class ReportDistributor {
  async distribute(report: Report, content: string): Promise<void> {
    // Distribute to all recipients
    for (const recipient of report.recipients) {
      await this.sendReport(recipient, report, content);
    }
  }

  private async sendReport(recipient: string, report: Report, content: string): Promise<void> {
    // In reality, would send via email, Slack, etc.
    // For now, just emit an event
    console.log(`Sending ${report.name} to ${recipient}`);
  }
}

// Type definitions for internal use
interface ReportTemplate {
  id: string;
  name: string;
  sections: ReportSection[];
}

interface ReportSection {
  title: string;
  type: 'metrics' | 'highlights' | 'alerts' | 'summary' | 'chart' | 'table' | 'dashboard';
  metrics?: string[];
  kpis?: string[];
  severity?: string[];
  content?: string;
  chartType?: string;
  metric?: string;
  timeRange?: TimeRange;
  widgets?: string[];
}