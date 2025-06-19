import { TaskManager } from './core/task-manager';
import { DecisionEngine } from './core/decision-engine';
import { SystemMonitor } from './core/monitoring';
import { ProcessAutomation } from './core/automation';
import { SystemConfig, createSystemConfig } from './config';
import { 
  Task, 
  Decision, 
  SystemMetrics, 
  WorkflowDefinition,
  EventType,
  Priority,
  DecisionType,
  DecisionOption,
  DecisionContext
} from './shared/interfaces';

export class ZeroPersonStartup {
  private config: SystemConfig;
  private taskManager: TaskManager;
  private decisionEngine: DecisionEngine;
  private systemMonitor: SystemMonitor;
  private processAutomation: ProcessAutomation;
  private isRunning: boolean = false;

  constructor(config?: Partial<SystemConfig>) {
    this.config = createSystemConfig(config);
    
    // Initialize core modules
    this.taskManager = new TaskManager(this.config.taskManager);
    this.decisionEngine = new DecisionEngine(this.config.decisionEngine);
    this.systemMonitor = new SystemMonitor(this.config.monitoring);
    this.processAutomation = new ProcessAutomation(this.config.automation);

    // Set up inter-module communication
    this.setupModuleCommunication();
  }

  private setupModuleCommunication(): void {
    // Task Manager -> Decision Engine: Make decisions about task assignments
    this.taskManager.on(EventType.TASK_CREATED, async (event: any) => {
      const task = event.data as Task;
      
      if (task.metadata?.requiresDecision) {
        const context: DecisionContext = {
          taskId: task.id,
          type: DecisionType.RESOURCE_ALLOCATION,
          data: { task }
        };

        const options: DecisionOption[] = this.generateTaskAssignmentOptions(task);
        const decision = await this.decisionEngine.makeDecision(context, options);
        
        if (decision.selectedOption) {
          await this.taskManager.updateTask(task.id, {
            assignedModule: decision.selectedOption.id
          });
        }
      }
    });

    // System Monitor -> Process Automation: Trigger healing workflows
    this.systemMonitor.on(EventType.METRIC_THRESHOLD, async (event: any) => {
      const alert = event.data;
      
      // Find and execute appropriate healing workflow
      const healingWorkflows = await this.processAutomation.listExecutions({
        status: ['pending', 'in_progress'] as any
      });

      if (healingWorkflows.length === 0 && alert.severity === 'critical') {
        // Create healing workflow from template
        await this.processAutomation.createWorkflowFromTemplate(
          'system-healing',
          { alert, timestamp: new Date() }
        );
      }
    });

    // Process Automation -> Task Manager: Create tasks from workflow steps
    this.processAutomation.registerStepExecutor('create-task', {
      type: 'task',
      execute: async (step, context) => {
        const task = await this.taskManager.createTask(
          step.config.title as string,
          step.config.description as string,
          step.config.priority as Priority || Priority.MEDIUM,
          { workflowId: context.workflowId, stepId: step.id }
        );

        return {
          success: true,
          output: { taskId: task.id },
          variables: { [`task_${step.id}`]: task.id }
        };
      }
    });

    // Register system monitors
    this.registerSystemMonitors();
  }

  private registerSystemMonitors(): void {
    // Task Manager Monitor
    this.systemMonitor.registerMonitor('task-manager', {
      name: 'TaskManager',
      collect: async () => {
        const metrics = this.taskManager.getMetrics();
        return {
          name: 'task-manager.metrics',
          value: metrics,
          timestamp: new Date()
        };
      },
      getHealth: async () => {
        const metrics = this.taskManager.getMetrics();
        const failureRate = metrics.totalTasks > 0 
          ? (metrics.failedTasks / metrics.totalTasks) * 100 
          : 0;

        return {
          status: failureRate > 20 ? 'warning' : 'healthy',
          message: `Failure rate: ${failureRate.toFixed(2)}%`,
          details: metrics,
          lastCheck: new Date()
        };
      }
    });

    // Decision Engine Monitor
    this.systemMonitor.registerMonitor('decision-engine', {
      name: 'DecisionEngine',
      collect: async () => {
        const metrics = this.decisionEngine.getMetrics();
        return {
          name: 'decision-engine.metrics',
          value: metrics,
          timestamp: new Date()
        };
      },
      getHealth: async () => {
        const metrics = this.decisionEngine.getMetrics();
        return {
          status: metrics.averageConfidence < 0.5 ? 'warning' : 'healthy',
          message: `Average confidence: ${metrics.averageConfidence.toFixed(2)}`,
          details: metrics,
          lastCheck: new Date()
        };
      }
    });

    // Process Automation Monitor
    this.systemMonitor.registerMonitor('process-automation', {
      name: 'ProcessAutomation',
      collect: async () => {
        const metrics = this.processAutomation.getMetrics();
        return {
          name: 'process-automation.metrics',
          value: metrics,
          timestamp: new Date()
        };
      },
      getHealth: async () => {
        const metrics = this.processAutomation.getMetrics();
        return {
          status: metrics.activeExecutions > 50 ? 'warning' : 'healthy',
          message: `Active workflows: ${metrics.activeExecutions}`,
          details: metrics,
          lastCheck: new Date()
        };
      }
    });
  }

  private generateTaskAssignmentOptions(task: Task): DecisionOption[] {
    // Generate assignment options based on available modules
    const options: DecisionOption[] = [
      {
        id: 'task-manager',
        description: 'Assign to Task Manager for default processing',
        score: 70,
        risks: ['May not have specialized capabilities'],
        benefits: ['Reliable execution', 'Good for general tasks']
      },
      {
        id: 'process-automation',
        description: 'Create automated workflow for task',
        score: 85,
        risks: ['Higher complexity', 'Longer setup time'],
        benefits: ['Fully automated', 'Repeatable process', 'Better tracking']
      },
      {
        id: 'manual-queue',
        description: 'Queue for manual review',
        score: 50,
        risks: ['Requires human intervention', 'Slower processing'],
        benefits: ['Human oversight', 'Complex decision handling']
      }
    ];

    return options;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('System is already running');
    }

    console.log(`Starting ${this.config.system.name} v${this.config.system.version}`);
    console.log(`Environment: ${this.config.system.environment}`);
    
    // Start monitoring
    this.systemMonitor.start();
    
    // Start task processing loop
    this.startTaskProcessingLoop();
    
    this.isRunning = true;
    console.log('System started successfully');
  }

  private startTaskProcessingLoop(): void {
    setInterval(async () => {
      try {
        await this.taskManager.processTaskQueue();
      } catch (error) {
        console.error('Error processing task queue:', error);
      }
    }, 5000); // Process every 5 seconds
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('System is not running');
    }

    console.log('Stopping system...');
    
    // Stop monitoring
    this.systemMonitor.stop();
    
    this.isRunning = false;
    console.log('System stopped');
  }

  // Public API methods

  public async createTask(
    title: string, 
    description: string, 
    priority?: Priority,
    metadata?: Record<string, any>
  ): Promise<Task> {
    return this.taskManager.createTask(title, description, priority, metadata);
  }

  public async makeDecision(
    context: DecisionContext,
    options: DecisionOption[]
  ): Promise<Decision> {
    return this.decisionEngine.makeDecision(context, options);
  }

  public async createWorkflow(workflow: WorkflowDefinition): Promise<void> {
    return this.processAutomation.register(workflow);
  }

  public async executeWorkflow(
    workflowId: string, 
    variables?: Record<string, any>
  ): Promise<any> {
    return this.processAutomation.execute(workflowId, { variables });
  }

  public getSystemMetrics(): any {
    return {
      dashboard: this.systemMonitor.getDashboard(),
      taskManager: this.taskManager.getMetrics(),
      decisionEngine: this.decisionEngine.getMetrics(),
      processAutomation: this.processAutomation.getMetrics()
    };
  }

  public getSystemHealth(): any {
    const dashboard = this.systemMonitor.getDashboard();
    return {
      overall: dashboard.currentMetrics,
      modules: Object.fromEntries(dashboard.moduleHealth),
      alerts: dashboard.alerts
    };
  }
}

// Export all public interfaces and types
export * from './shared/interfaces';
export * from './core/task-manager';
export * from './core/decision-engine';
export * from './core/monitoring';
export * from './core/automation';
export * from './config';