/**
 * Autonomous KPI Tracking Service
 * Monitors and calculates key performance indicators
 */

import { EventEmitter } from 'events';
import {
  KPI,
  Metric,
  MetricCategory,
  TimeSeriesData,
  Insight,
  InsightType,
  AnalyticsConfig
} from '../types.js';

export class KPIService extends EventEmitter {
  private kpis: Map<string, KPI> = new Map();
  private metrics: Map<string, Metric[]> = new Map();
  private calculations: Map<string, Function> = new Map();
  private config: AnalyticsConfig['tracking'];
  private insightEngine: InsightEngine;

  constructor(config: AnalyticsConfig['tracking']) {
    super();
    this.config = config;
    this.insightEngine = new InsightEngine();
    this.initializeDefaultKPIs();
    this.startMonitoring();
  }

  /**
   * Initialize default KPIs
   */
  private initializeDefaultKPIs(): void {
    // Revenue KPIs
    this.registerKPI({
      id: 'monthly_revenue',
      name: 'Monthly Revenue',
      description: 'Total revenue for the current month',
      formula: 'SUM(order.total) WHERE order.status = "delivered" AND order.date >= MONTH_START',
      category: 'revenue',
      frequency: 'daily',
      target: 100000,
      threshold: {
        critical: 50000,
        warning: 80000
      },
      dependencies: [],
      historicalValues: []
    });

    this.registerKPI({
      id: 'average_order_value',
      name: 'Average Order Value',
      description: 'Average value of completed orders',
      formula: 'AVG(order.total) WHERE order.status = "delivered"',
      category: 'revenue',
      frequency: 'hourly',
      target: 150,
      threshold: {
        critical: 80,
        warning: 120
      },
      dependencies: [],
      historicalValues: []
    });

    // Customer KPIs
    this.registerKPI({
      id: 'customer_satisfaction',
      name: 'Customer Satisfaction Score',
      description: 'Average customer satisfaction rating',
      formula: 'AVG(feedback.rating) WHERE feedback.type = "satisfaction"',
      category: 'customer',
      frequency: 'daily',
      target: 4.5,
      threshold: {
        critical: 3.5,
        warning: 4.0
      },
      dependencies: [],
      historicalValues: []
    });

    this.registerKPI({
      id: 'customer_retention',
      name: 'Customer Retention Rate',
      description: 'Percentage of customers who make repeat purchases',
      formula: '(COUNT(DISTINCT customer.id WHERE purchases > 1) / COUNT(DISTINCT customer.id)) * 100',
      category: 'customer',
      frequency: 'weekly',
      target: 80,
      threshold: {
        critical: 60,
        warning: 70
      },
      dependencies: [],
      historicalValues: []
    });

    // Operations KPIs
    this.registerKPI({
      id: 'order_fulfillment_time',
      name: 'Average Order Fulfillment Time',
      description: 'Average time from order placement to delivery',
      formula: 'AVG(order.delivered_at - order.created_at) WHERE order.status = "delivered"',
      category: 'operations',
      frequency: 'hourly',
      target: 48, // hours
      threshold: {
        critical: 96,
        warning: 72
      },
      dependencies: [],
      historicalValues: []
    });

    this.registerKPI({
      id: 'inventory_turnover',
      name: 'Inventory Turnover Rate',
      description: 'How many times inventory is sold and replaced',
      formula: 'COGS / AVG(inventory.value)',
      category: 'operations',
      frequency: 'weekly',
      target: 12, // times per year
      threshold: {
        critical: 4,
        warning: 8
      },
      dependencies: [],
      historicalValues: []
    });

    // Marketing KPIs
    this.registerKPI({
      id: 'conversion_rate',
      name: 'Conversion Rate',
      description: 'Percentage of visitors who make a purchase',
      formula: '(COUNT(order) / COUNT(session)) * 100',
      category: 'marketing',
      frequency: 'hourly',
      target: 3.5,
      threshold: {
        critical: 1.5,
        warning: 2.5
      },
      dependencies: [],
      historicalValues: []
    });

    this.registerKPI({
      id: 'customer_acquisition_cost',
      name: 'Customer Acquisition Cost',
      description: 'Average cost to acquire a new customer',
      formula: 'SUM(marketing.spend) / COUNT(DISTINCT new_customer)',
      category: 'marketing',
      frequency: 'daily',
      target: 50,
      threshold: {
        critical: 100,
        warning: 75
      },
      dependencies: [],
      historicalValues: []
    });
  }

  /**
   * Start KPI monitoring
   */
  private startMonitoring(): void {
    // Real-time monitoring
    setInterval(() => {
      this.calculateRealtimeKPIs();
    }, 60000); // Every minute

    // Hourly calculations
    setInterval(() => {
      this.calculateHourlyKPIs();
    }, 3600000); // Every hour

    // Daily calculations
    setInterval(() => {
      this.calculateDailyKPIs();
      this.generateInsights();
    }, 86400000); // Every day
  }

  /**
   * Register a new KPI
   */
  registerKPI(kpi: KPI): void {
    this.kpis.set(kpi.id, kpi);
    
    // Register calculation function if provided
    if (kpi.formula) {
      this.calculations.set(kpi.id, this.createCalculationFunction(kpi.formula));
    }

    this.emit('kpi-registered', {
      kpiId: kpi.id,
      name: kpi.name,
      category: kpi.category
    });
  }

  /**
   * Calculate KPI value
   */
  async calculateKPI(kpiId: string): Promise<number> {
    const kpi = this.kpis.get(kpiId);
    if (!kpi) {
      throw new Error(`KPI ${kpiId} not found`);
    }

    // Get calculation function
    const calculateFn = this.calculations.get(kpiId);
    if (!calculateFn) {
      throw new Error(`No calculation function for KPI ${kpiId}`);
    }

    // Calculate dependencies first
    if (kpi.dependencies.length > 0) {
      for (const depId of kpi.dependencies) {
        await this.calculateKPI(depId);
      }
    }

    // Execute calculation
    const value = await calculateFn(this.getDataContext());
    
    // Update KPI
    kpi.lastCalculated = new Date();
    kpi.currentValue = value;
    
    // Add to historical values
    kpi.historicalValues.push({
      timestamp: new Date(),
      value
    });

    // Keep only last 1000 data points
    if (kpi.historicalValues.length > 1000) {
      kpi.historicalValues = kpi.historicalValues.slice(-1000);
    }

    // Check thresholds and emit alerts
    this.checkThresholds(kpi);

    // Record as metric
    this.recordMetric({
      id: `kpi_${kpiId}_${Date.now()}`,
      name: kpi.name,
      category: kpi.category,
      value,
      unit: this.getUnitFromFormula(kpi.formula),
      timestamp: new Date(),
      trend: this.calculateTrend(kpi.historicalValues),
      changePercent: this.calculateChangePercent(kpi.historicalValues),
      target: kpi.target,
      status: this.getKPIStatus(value, kpi)
    });

    return value;
  }

  /**
   * Calculate real-time KPIs
   */
  private async calculateRealtimeKPIs(): Promise<void> {
    const realtimeKPIs = Array.from(this.kpis.values())
      .filter(kpi => kpi.frequency === 'realtime');

    for (const kpi of realtimeKPIs) {
      try {
        await this.calculateKPI(kpi.id);
      } catch (error) {
        this.emit('error', {
          type: 'kpi-calculation',
          kpiId: kpi.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Calculate hourly KPIs
   */
  private async calculateHourlyKPIs(): Promise<void> {
    const hourlyKPIs = Array.from(this.kpis.values())
      .filter(kpi => kpi.frequency === 'hourly');

    for (const kpi of hourlyKPIs) {
      try {
        await this.calculateKPI(kpi.id);
      } catch (error) {
        this.emit('error', {
          type: 'kpi-calculation',
          kpiId: kpi.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Calculate daily KPIs
   */
  private async calculateDailyKPIs(): Promise<void> {
    const dailyKPIs = Array.from(this.kpis.values())
      .filter(kpi => ['daily', 'weekly', 'monthly'].includes(kpi.frequency));

    for (const kpi of dailyKPIs) {
      try {
        await this.calculateKPI(kpi.id);
      } catch (error) {
        this.emit('error', {
          type: 'kpi-calculation',
          kpiId: kpi.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Generate insights from KPIs
   */
  private async generateInsights(): Promise<void> {
    const insights: Insight[] = [];

    for (const kpi of this.kpis.values()) {
      if (!kpi.currentValue || !kpi.historicalValues.length) continue;

      // Anomaly detection
      const anomaly = this.insightEngine.detectAnomaly(kpi);
      if (anomaly) {
        insights.push(anomaly);
      }

      // Trend analysis
      const trend = this.insightEngine.analyzeTrend(kpi);
      if (trend) {
        insights.push(trend);
      }

      // Threshold alerts
      const threshold = this.insightEngine.checkThreshold(kpi);
      if (threshold) {
        insights.push(threshold);
      }
    }

    // Correlation analysis
    const correlations = this.insightEngine.findCorrelations(
      Array.from(this.kpis.values())
    );
    insights.push(...correlations);

    // Emit insights
    for (const insight of insights) {
      this.emit('insight', insight);
    }
  }

  /**
   * Check KPI thresholds
   */
  private checkThresholds(kpi: KPI): void {
    if (!kpi.currentValue) return;

    const value = kpi.currentValue;
    const isReversed = this.isReversedKPI(kpi.id); // Lower is better

    let status: 'on-track' | 'warning' | 'critical' = 'on-track';
    let severity: 'info' | 'warning' | 'critical' = 'info';

    if (isReversed) {
      if (value >= kpi.threshold.critical) {
        status = 'critical';
        severity = 'critical';
      } else if (value >= kpi.threshold.warning) {
        status = 'warning';
        severity = 'warning';
      }
    } else {
      if (value <= kpi.threshold.critical) {
        status = 'critical';
        severity = 'critical';
      } else if (value <= kpi.threshold.warning) {
        status = 'warning';
        severity = 'warning';
      }
    }

    if (status !== 'on-track') {
      this.emit('alert', {
        type: 'kpi-threshold',
        severity,
        kpi: kpi.name,
        value,
        threshold: status === 'critical' ? kpi.threshold.critical : kpi.threshold.warning,
        timestamp: new Date()
      });
    }
  }

  /**
   * Create calculation function from formula
   */
  private createCalculationFunction(formula: string): Function {
    // This is a simplified implementation
    // In reality, would parse and compile the formula
    return async (context: any) => {
      // Mock calculations based on formula keywords
      if (formula.includes('SUM')) {
        return Math.random() * 100000 + 50000; // Random revenue
      } else if (formula.includes('AVG')) {
        return Math.random() * 100 + 100; // Random average
      } else if (formula.includes('COUNT')) {
        return Math.floor(Math.random() * 1000); // Random count
      } else {
        return Math.random() * 100; // Default random value
      }
    };
  }

  /**
   * Get data context for calculations
   */
  private getDataContext(): any {
    return {
      metrics: this.metrics,
      kpis: this.kpis,
      now: new Date(),
      // Would include actual data sources
    };
  }

  /**
   * Calculate trend from historical values
   */
  private calculateTrend(values: TimeSeriesData[]): 'up' | 'down' | 'stable' {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-10); // Last 10 values
    const firstHalf = recent.slice(0, 5);
    const secondHalf = recent.slice(5);

    const avgFirst = firstHalf.reduce((sum, v) => sum + v.value, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, v) => sum + v.value, 0) / secondHalf.length;

    const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

    if (changePercent > 5) return 'up';
    if (changePercent < -5) return 'down';
    return 'stable';
  }

  /**
   * Calculate percentage change
   */
  private calculateChangePercent(values: TimeSeriesData[]): number {
    if (values.length < 2) return 0;

    const current = values[values.length - 1].value;
    const previous = values[values.length - 2].value;

    return ((current - previous) / previous) * 100;
  }

  /**
   * Get KPI status based on value and thresholds
   */
  private getKPIStatus(value: number, kpi: KPI): 'on-track' | 'warning' | 'critical' {
    const isReversed = this.isReversedKPI(kpi.id);

    if (isReversed) {
      if (value >= kpi.threshold.critical) return 'critical';
      if (value >= kpi.threshold.warning) return 'warning';
    } else {
      if (value <= kpi.threshold.critical) return 'critical';
      if (value <= kpi.threshold.warning) return 'warning';
    }

    return 'on-track';
  }

  /**
   * Check if KPI is reversed (lower is better)
   */
  private isReversedKPI(kpiId: string): boolean {
    const reversedKPIs = [
      'customer_acquisition_cost',
      'order_fulfillment_time',
      'support_response_time',
      'error_rate'
    ];
    return reversedKPIs.includes(kpiId);
  }

  /**
   * Get unit from formula
   */
  private getUnitFromFormula(formula: string): string {
    if (formula.includes('* 100')) return '%';
    if (formula.includes('time')) return 'hours';
    if (formula.includes('cost') || formula.includes('revenue')) return '$';
    if (formula.includes('COUNT')) return 'count';
    return 'value';
  }

  /**
   * Record metric
   */
  private recordMetric(metric: Metric): void {
    const category = metric.category;
    if (!this.metrics.has(category)) {
      this.metrics.set(category, []);
    }
    
    const categoryMetrics = this.metrics.get(category)!;
    categoryMetrics.push(metric);

    // Keep only last 1000 metrics per category
    if (categoryMetrics.length > 1000) {
      this.metrics.set(category, categoryMetrics.slice(-1000));
    }

    this.emit('metric', metric);
  }

  /**
   * Get KPI by ID
   */
  getKPI(kpiId: string): KPI | undefined {
    return this.kpis.get(kpiId);
  }

  /**
   * Get all KPIs
   */
  getAllKPIs(): KPI[] {
    return Array.from(this.kpis.values());
  }

  /**
   * Get KPIs by category
   */
  getKPIsByCategory(category: MetricCategory): KPI[] {
    return Array.from(this.kpis.values())
      .filter(kpi => kpi.category === category);
  }

  /**
   * Get metrics by category
   */
  getMetricsByCategory(category: MetricCategory): Metric[] {
    return this.metrics.get(category) || [];
  }

  /**
   * Get KPI summary
   */
  getKPISummary(): any {
    const kpis = Array.from(this.kpis.values());
    
    return {
      total: kpis.length,
      byCategory: this.groupBy(kpis, 'category'),
      byStatus: {
        onTrack: kpis.filter(k => this.getKPIStatus(k.currentValue || 0, k) === 'on-track').length,
        warning: kpis.filter(k => this.getKPIStatus(k.currentValue || 0, k) === 'warning').length,
        critical: kpis.filter(k => this.getKPIStatus(k.currentValue || 0, k) === 'critical').length
      },
      lastCalculated: Math.max(...kpis.map(k => k.lastCalculated?.getTime() || 0))
    };
  }

  /**
   * Helper to group by property
   */
  private groupBy(array: any[], property: string): Record<string, number> {
    return array.reduce((acc, item) => {
      const key = item[property];
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}

/**
 * Insight Engine for generating intelligent insights
 */
class InsightEngine {
  /**
   * Detect anomalies in KPI values
   */
  detectAnomaly(kpi: KPI): Insight | null {
    if (!kpi.currentValue || kpi.historicalValues.length < 20) return null;

    const values = kpi.historicalValues.slice(-20).map(h => h.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    const zScore = Math.abs((kpi.currentValue - mean) / stdDev);

    if (zScore > 3) {
      return {
        id: `anomaly_${kpi.id}_${Date.now()}`,
        type: 'anomaly',
        severity: 'warning',
        title: `Anomaly detected in ${kpi.name}`,
        description: `Current value (${kpi.currentValue}) is ${zScore.toFixed(1)} standard deviations from the mean`,
        metric: kpi.id,
        value: kpi.currentValue,
        timestamp: new Date(),
        acknowledged: false,
        recommendation: 'Investigate the cause of this unusual value'
      };
    }

    return null;
  }

  /**
   * Analyze trends in KPI values
   */
  analyzeTrend(kpi: KPI): Insight | null {
    if (kpi.historicalValues.length < 10) return null;

    const recent = kpi.historicalValues.slice(-10);
    const trend = this.calculateTrendStrength(recent);

    if (Math.abs(trend) > 0.7) {
      const direction = trend > 0 ? 'increasing' : 'decreasing';
      const severity = Math.abs(trend) > 0.9 ? 'critical' : 'warning';

      return {
        id: `trend_${kpi.id}_${Date.now()}`,
        type: 'trend',
        severity,
        title: `Strong ${direction} trend in ${kpi.name}`,
        description: `${kpi.name} has been ${direction} consistently over the last period`,
        metric: kpi.id,
        value: kpi.currentValue || 0,
        timestamp: new Date(),
        acknowledged: false,
        recommendation: trend > 0 
          ? 'Continue monitoring this positive trend'
          : 'Take action to reverse this negative trend'
      };
    }

    return null;
  }

  /**
   * Check threshold violations
   */
  checkThreshold(kpi: KPI): Insight | null {
    if (!kpi.currentValue) return null;

    const status = this.getKPIStatus(kpi.currentValue, kpi);
    
    if (status !== 'on-track') {
      return {
        id: `threshold_${kpi.id}_${Date.now()}`,
        type: 'threshold',
        severity: status === 'critical' ? 'critical' : 'warning',
        title: `${kpi.name} ${status} threshold reached`,
        description: `Current value (${kpi.currentValue}) has reached the ${status} threshold`,
        metric: kpi.id,
        value: kpi.currentValue,
        threshold: status === 'critical' ? kpi.threshold.critical : kpi.threshold.warning,
        timestamp: new Date(),
        acknowledged: false,
        recommendation: this.getThresholdRecommendation(kpi, status)
      };
    }

    return null;
  }

  /**
   * Find correlations between KPIs
   */
  findCorrelations(kpis: KPI[]): Insight[] {
    const insights: Insight[] = [];
    
    // Simple correlation detection
    // In reality, would use statistical correlation analysis
    
    return insights;
  }

  /**
   * Calculate trend strength (-1 to 1)
   */
  private calculateTrendStrength(values: TimeSeriesData[]): number {
    if (values.length < 2) return 0;

    let increasingCount = 0;
    let decreasingCount = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i].value > values[i - 1].value) {
        increasingCount++;
      } else if (values[i].value < values[i - 1].value) {
        decreasingCount++;
      }
    }

    const total = values.length - 1;
    return (increasingCount - decreasingCount) / total;
  }

  /**
   * Get KPI status
   */
  private getKPIStatus(value: number, kpi: KPI): 'on-track' | 'warning' | 'critical' {
    if (value <= kpi.threshold.critical) return 'critical';
    if (value <= kpi.threshold.warning) return 'warning';
    return 'on-track';
  }

  /**
   * Get threshold recommendation
   */
  private getThresholdRecommendation(kpi: KPI, status: string): string {
    const recommendations: Record<string, Record<string, string>> = {
      'monthly_revenue': {
        warning: 'Review marketing campaigns and sales strategies',
        critical: 'Urgent action needed: analyze customer churn and acquisition'
      },
      'customer_satisfaction': {
        warning: 'Review recent customer feedback and support tickets',
        critical: 'Immediate customer service improvements required'
      },
      'order_fulfillment_time': {
        warning: 'Optimize warehouse operations and shipping processes',
        critical: 'Review entire fulfillment pipeline for bottlenecks'
      }
    };

    return recommendations[kpi.id]?.[status] || 'Review and take appropriate action';
  }
}