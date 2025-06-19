#!/usr/bin/env node
/**
 * Zero Person Startup System
 * Main startup script that initializes and orchestrates all modules
 */

import { EventEmitter } from 'events';

// Import business modules
import CustomerServiceModule from '../modules/customer-service/index.js';
import OperationsModule from '../modules/operations/index.js';
import AnalyticsModule from '../modules/analytics/index.js';
import MarketingModule from '../modules/marketing/index.js';

// Import integration layer
import { eventBus, EventChannel } from '../integration/event-bus/index.js';
import { apiGateway } from '../integration/api-gateway/index.js';
import { messageQueue } from '../integration/message-queue/index.js';

interface SystemConfig {
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  modules: {
    customerService: boolean;
    operations: boolean;
    analytics: boolean;
    marketing: boolean;
  };
  integration: {
    eventBus: boolean;
    apiGateway: boolean;
    messageQueue: boolean;
  };
  api: {
    port: number;
    host: string;
  };
}

class ZeroPersonStartup extends EventEmitter {
  private config: SystemConfig;
  private modules: Map<string, any> = new Map();
  private eventChannel: EventChannel;
  private isRunning: boolean = false;
  private startTime?: Date;

  constructor(config?: Partial<SystemConfig>) {
    super();
    
    this.config = {
      name: 'Zero Person Startup',
      version: '1.0.0',
      environment: 'development',
      modules: {
        customerService: true,
        operations: true,
        analytics: true,
        marketing: true
      },
      integration: {
        eventBus: true,
        apiGateway: true,
        messageQueue: true
      },
      api: {
        port: 3000,
        host: 'localhost'
      },
      ...config
    };

    this.eventChannel = eventBus.createChannel('system');
  }

  /**
   * Start the system
   */
  async start(): Promise<void> {
    console.log(`🚀 Starting ${this.config.name} v${this.config.version}`);
    console.log(`Environment: ${this.config.environment}`);
    console.log('');

    this.startTime = new Date();

    try {
      // Initialize integration layer
      await this.initializeIntegration();

      // Initialize business modules
      await this.initializeModules();

      // Setup inter-module communication
      await this.setupCommunication();

      // Setup API routes
      await this.setupAPIRoutes();

      // Setup background jobs
      await this.setupBackgroundJobs();

      // Start services
      await this.startServices();

      this.isRunning = true;
      
      console.log('');
      console.log('✅ System started successfully!');
      console.log(`API Gateway: http://${this.config.api.host}:${this.config.api.port}`);
      console.log('');
      
      this.emit('started');
      
      // Show system status
      this.showStatus();

    } catch (error) {
      console.error('❌ Failed to start system:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Initialize integration layer
   */
  private async initializeIntegration(): Promise<void> {
    console.log('📡 Initializing integration layer...');

    if (this.config.integration.eventBus) {
      console.log('  ✓ Event Bus initialized');
      
      // Subscribe to system events
      eventBus.subscribe('*', (event) => {
        if (event.category === 'error') {
          console.error(`[${event.source}] Error:`, event.data);
        }
      });
    }

    if (this.config.integration.messageQueue) {
      console.log('  ✓ Message Queue initialized');
      
      // Setup dead letter queue handler
      messageQueue.subscribe('dead-letter', async (message) => {
        console.error('Dead letter message:', message);
        
        // Send alert
        this.eventChannel.publish('alert', {
          severity: 'high',
          type: 'dead-letter-message',
          message: `Message ${message.id} failed after ${message.attempts} attempts`
        });
      });
    }

    if (this.config.integration.apiGateway) {
      console.log('  ✓ API Gateway initialized');
    }
  }

  /**
   * Initialize business modules
   */
  private async initializeModules(): Promise<void> {
    console.log('🏢 Initializing business modules...');

    if (this.config.modules.customerService) {
      const customerService = new CustomerServiceModule();
      this.modules.set('customerService', customerService);
      console.log('  ✓ Customer Service module initialized');
    }

    if (this.config.modules.operations) {
      const operations = new OperationsModule();
      this.modules.set('operations', operations);
      console.log('  ✓ Operations module initialized');
    }

    if (this.config.modules.analytics) {
      const analytics = new AnalyticsModule();
      this.modules.set('analytics', analytics);
      console.log('  ✓ Analytics module initialized');
    }

    if (this.config.modules.marketing) {
      const marketing = new MarketingModule();
      this.modules.set('marketing', marketing);
      console.log('  ✓ Marketing module initialized');
    }
  }

  /**
   * Setup inter-module communication
   */
  private async setupCommunication(): Promise<void> {
    console.log('🔗 Setting up inter-module communication...');

    const customerService = this.modules.get('customerService');
    const operations = this.modules.get('operations');
    const analytics = this.modules.get('analytics');
    const marketing = this.modules.get('marketing');

    // Customer Service -> Operations integration
    if (customerService && operations) {
      customerService.on('integration-request', async (request: any) => {
        if (request.module === 'operations' && request.action === 'check_order_status') {
          const status = await operations.checkOrderStatus(request.data.orderId);
          if (request.callback) {
            request.callback(status);
          }
        }
      });
    }

    // All modules -> Analytics integration
    if (analytics) {
      // Track events from all modules
      for (const [name, module] of this.modules) {
        if (name !== 'analytics') {
          module.on('event', (event: any) => {
            analytics.trackEvent(event.eventType || event.type, {
              source: name,
              ...event
            });
          });
        }
      }
    }

    // Marketing -> Customer Service integration
    if (marketing && customerService) {
      marketing.on('social-mention', async (mention: any) => {
        if (mention.sentiment === 'negative') {
          // Create support ticket
          await customerService.processMessage(
            mention.author,
            mention.content,
            'social'
          );
        }
      });
    }

    // Setup message queue handlers
    this.setupMessageHandlers();

    console.log('  ✓ Inter-module communication established');
  }

  /**
   * Setup message queue handlers
   */
  private setupMessageHandlers(): void {
    const analytics = this.modules.get('analytics');
    const marketing = this.modules.get('marketing');
    const operations = this.modules.get('operations');

    // Analytics processing
    if (analytics) {
      messageQueue.subscribe('analytics', async (message) => {
        switch (message.type) {
          case 'calculate-kpi':
            await analytics.calculateKPI(message.payload.kpiId);
            break;
          case 'generate-report':
            await analytics.generateReport(message.payload.reportId);
            break;
        }
      }, { concurrency: 5 });
    }

    // Email sending
    if (marketing) {
      messageQueue.subscribe('email', async (message) => {
        // Rate limited to 100/minute
        console.log('Sending email:', message.payload.subject);
        // Email would be sent here
      }, { concurrency: 10 });
    }

    // Order processing
    if (operations) {
      messageQueue.subscribe('orders', async (message) => {
        switch (message.type) {
          case 'process-order':
            await operations.processOrder(message.payload);
            break;
        }
      }, { concurrency: 3 });
    }
  }

  /**
   * Setup API routes
   */
  private async setupAPIRoutes(): Promise<void> {
    console.log('🌐 Setting up API routes...');

    const customerService = this.modules.get('customerService');
    const operations = this.modules.get('operations');
    const analytics = this.modules.get('analytics');
    const marketing = this.modules.get('marketing');

    // System routes
    apiGateway.route('GET', '/status', async (req, res) => {
      res.json(this.getSystemStatus());
    });

    // Customer Service routes
    if (customerService) {
      apiGateway.route('POST', '/chat/start', async (req, res) => {
        const session = await customerService.startInteraction(
          req.body.customerId,
          'chat'
        );
        res.json(session);
      });

      apiGateway.route('POST', '/tickets', async (req, res) => {
        const ticket = await customerService.getTicketingService().createTicket(
          req.body.customerId,
          req.body.subject,
          req.body.description,
          'api'
        );
        res.json(ticket);
      });
    }

    // Operations routes
    if (operations) {
      apiGateway.route('POST', '/orders', async (req, res) => {
        try {
          const order = await operations.processOrder(req.body);
          res.json(order);
        } catch (error) {
          res.status(400).json({ error: (error as Error).message });
        }
      }, {
        authentication: { type: 'jwt', required: true }
      });

      apiGateway.route('GET', '/orders/:orderId', async (req, res) => {
        const order = operations.getOrderService().getOrder(req.params.orderId);
        if (order) {
          res.json(order);
        } else {
          res.status(404).json({ error: 'Order not found' });
        }
      });
    }

    // Analytics routes
    if (analytics) {
      apiGateway.route('GET', '/analytics/dashboard/:dashboardId', async (req, res) => {
        const data = await analytics.getDashboardData(req.params.dashboardId);
        res.json(data);
      });

      apiGateway.route('GET', '/analytics/kpis', async (req, res) => {
        const kpis = analytics.getKPIService().getAllKPIs();
        res.json(kpis);
      });
    }

    // Marketing routes
    if (marketing) {
      apiGateway.route('POST', '/campaigns', async (req, res) => {
        const campaign = await marketing.createCampaign(
          req.body.name,
          req.body.type,
          req.body.objective,
          req.body.config
        );
        res.json(campaign);
      }, {
        authentication: { type: 'apiKey', required: true }
      });

      apiGateway.route('POST', '/content/generate', async (req, res) => {
        const content = await marketing.generateContent(req.body);
        res.json(content);
      });
    }

    console.log('  ✓ API routes configured');
  }

  /**
   * Setup background jobs
   */
  private async setupBackgroundJobs(): Promise<void> {
    console.log('⏰ Setting up background jobs...');

    const analytics = this.modules.get('analytics');
    const operations = this.modules.get('operations');

    // Daily KPI calculation
    if (analytics) {
      await messageQueue.scheduleJob('calculate-daily-kpis', {}, {
        type: 'recurring',
        interval: 86400000, // 24 hours
        at: new Date(new Date().setHours(0, 0, 0, 0)) // Midnight
      });
    }

    // Inventory check every 6 hours
    if (operations) {
      await messageQueue.scheduleJob('check-inventory', {}, {
        type: 'recurring',
        interval: 21600000 // 6 hours
      });
    }

    // Cleanup old data weekly
    await messageQueue.scheduleJob('cleanup', {}, {
      type: 'recurring',
      interval: 604800000 // 7 days
    });

    console.log('  ✓ Background jobs scheduled');
  }

  /**
   * Start services
   */
  private async startServices(): Promise<void> {
    console.log('🚦 Starting services...');

    // Start API Gateway
    if (this.config.integration.apiGateway) {
      await apiGateway.start();
    }

    // Start processing queues
    const queues = ['default', 'priority', 'email', 'analytics', 'notifications'];
    queues.forEach(queue => {
      messageQueue.subscribe(queue, async (message) => {
        console.log(`Processing ${queue} message:`, message.type);
      });
    });

    console.log('  ✓ All services started');
  }

  /**
   * Stop the system
   */
  async stop(): Promise<void> {
    console.log('');
    console.log('🛑 Stopping system...');

    this.isRunning = false;

    // Stop API Gateway
    if (this.config.integration.apiGateway) {
      await apiGateway.stop();
    }

    // Stop modules
    for (const [name, module] of this.modules) {
      if (module.stop && typeof module.stop === 'function') {
        await module.stop();
      }
    }

    console.log('✅ System stopped');
    this.emit('stopped');
  }

  /**
   * Get system status
   */
  private getSystemStatus(): any {
    const uptime = this.startTime 
      ? Date.now() - this.startTime.getTime()
      : 0;

    const moduleStatuses: any = {};
    for (const [name, module] of this.modules) {
      if (module.getStatus && typeof module.getStatus === 'function') {
        moduleStatuses[name] = module.getStatus();
      }
    }

    return {
      system: {
        name: this.config.name,
        version: this.config.version,
        environment: this.config.environment,
        status: this.isRunning ? 'running' : 'stopped',
        uptime,
        startTime: this.startTime
      },
      modules: moduleStatuses,
      integration: {
        eventBus: eventBus.getMetrics(),
        messageQueue: messageQueue.getQueueMetrics(),
        apiGateway: apiGateway.getMetrics()
      }
    };
  }

  /**
   * Show system status
   */
  private showStatus(): void {
    const status = this.getSystemStatus();
    
    console.log('📊 System Status:');
    console.log('================');
    console.log(`Status: ${status.system.status}`);
    console.log(`Uptime: ${Math.floor(status.system.uptime / 1000)}s`);
    console.log('');
    
    console.log('Modules:');
    Object.entries(status.modules).forEach(([name, moduleStatus]: [string, any]) => {
      console.log(`  ${name}: ${moduleStatus.status}`);
    });
    console.log('');
    
    console.log('Integration:');
    console.log(`  Event Bus: ${status.integration.eventBus.eventsPublished} events`);
    console.log(`  Message Queue: ${Object.keys(status.integration.messageQueue).length} queues`);
    console.log(`  API Gateway: ${status.integration.apiGateway.totalRequests} requests`);
  }

  /**
   * Monitor system health
   */
  startHealthMonitoring(): void {
    setInterval(() => {
      const status = this.getSystemStatus();
      
      // Check module health
      for (const [name, moduleStatus] of Object.entries(status.modules)) {
        if ((moduleStatus as any).status !== 'operational') {
          this.eventChannel.publish('alert', {
            severity: 'high',
            module: name,
            status: (moduleStatus as any).status
          });
        }
      }

      // Check system metrics
      const eventBusMetrics = status.integration.eventBus;
      if (eventBusMetrics.eventsFailed > eventBusMetrics.eventsHandled * 0.1) {
        this.eventChannel.publish('alert', {
          severity: 'medium',
          component: 'eventBus',
          message: 'High event failure rate'
        });
      }
    }, 60000); // Every minute
  }
}

// Create and start the system
async function main() {
  const system = new ZeroPersonStartup({
    environment: (process.env.NODE_ENV as any) || 'development',
    api: {
      port: parseInt(process.env.PORT || '3000'),
      host: process.env.HOST || 'localhost'
    }
  });

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down gracefully...');
    await system.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down gracefully...');
    await system.stop();
    process.exit(0);
  });

  try {
    await system.start();
    system.startHealthMonitoring();
  } catch (error) {
    console.error('Failed to start system:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ZeroPersonStartup;