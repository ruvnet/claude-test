/**
 * Message Queue
 * Asynchronous message processing and task management system
 */

import { EventEmitter } from 'events';
import { EventChannel, eventBus } from '../event-bus/index.js';

export interface Message {
  id: string;
  queue: string;
  type: string;
  payload: any;
  priority: MessagePriority;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  attempts: number;
  maxAttempts: number;
  status: MessageStatus;
  error?: string;
  metadata?: MessageMetadata;
}

export type MessagePriority = 0 | 1 | 2 | 3 | 4; // 0 = highest, 4 = lowest
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'dead-letter';

export interface MessageMetadata {
  correlationId?: string;
  causationId?: string;
  source?: string;
  userId?: string;
  ttl?: number; // Time to live in ms
  delayUntil?: Date;
  retryPolicy?: RetryPolicy;
}

export interface Queue {
  name: string;
  type: QueueType;
  config: QueueConfig;
  consumers: Consumer[];
  dlq?: string; // Dead letter queue name
  metrics: QueueMetrics;
}

export type QueueType = 'standard' | 'priority' | 'delayed' | 'broadcast';

export interface QueueConfig {
  maxSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  visibilityTimeout?: number;
  messageRetention?: number;
  concurrency?: number;
  rateLimit?: RateLimit;
}

export interface RateLimit {
  messages: number;
  period: number; // in ms
}

export interface Consumer {
  id: string;
  queue: string;
  handler: MessageHandler;
  options?: ConsumerOptions;
  status: 'active' | 'paused' | 'stopped';
  metrics: ConsumerMetrics;
}

export type MessageHandler = (message: Message) => Promise<void> | void;

export interface ConsumerOptions {
  concurrency?: number;
  batchSize?: number;
  timeout?: number;
  errorHandler?: (error: Error, message: Message) => void;
  filter?: (message: Message) => boolean;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

export interface QueueMetrics {
  size: number;
  processing: number;
  completed: number;
  failed: number;
  throughput: number;
  avgProcessingTime: number;
  oldestMessage?: Date;
}

export interface ConsumerMetrics {
  processed: number;
  failed: number;
  avgProcessingTime: number;
  lastProcessed?: Date;
}

export interface MessageQueueConfig {
  defaultConcurrency?: number;
  defaultMaxRetries?: number;
  defaultRetryDelay?: number;
  defaultVisibilityTimeout?: number;
  persistMessages?: boolean;
  enableMetrics?: boolean;
  cleanupInterval?: number;
}

export interface Job {
  id: string;
  type: string;
  data: any;
  schedule?: JobSchedule;
  status: JobStatus;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export type JobStatus = 'scheduled' | 'running' | 'completed' | 'failed';

export interface JobSchedule {
  type: 'once' | 'recurring';
  at?: Date;
  cron?: string;
  interval?: number;
  timezone?: string;
}

export class MessageQueue extends EventEmitter {
  private queues: Map<string, Queue> = new Map();
  private messages: Map<string, Message> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  private jobs: Map<string, Job> = new Map();
  private config: MessageQueueConfig;
  private eventChannel: EventChannel;
  private processing: Set<string> = new Set();
  private scheduledJobs: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: MessageQueueConfig) {
    super();
    
    this.config = {
      defaultConcurrency: 5,
      defaultMaxRetries: 3,
      defaultRetryDelay: 1000,
      defaultVisibilityTimeout: 30000,
      persistMessages: true,
      enableMetrics: true,
      cleanupInterval: 300000, // 5 minutes
      ...config
    };

    this.eventChannel = eventBus.createChannel('message-queue');
    
    this.setupDefaultQueues();
    this.startCleanup();
    this.startMetricsCollection();
  }

  /**
   * Setup default queues
   */
  private setupDefaultQueues(): void {
    // Default queues
    this.createQueue('default', 'standard');
    this.createQueue('priority', 'priority');
    this.createQueue('delayed', 'delayed');
    this.createQueue('dead-letter', 'standard', {
      messageRetention: 604800000 // 7 days
    });

    // Business-specific queues
    this.createQueue('email', 'standard', {
      rateLimit: { messages: 100, period: 60000 } // 100 per minute
    });
    
    this.createQueue('analytics', 'standard', {
      concurrency: 10
    });
    
    this.createQueue('notifications', 'priority');
  }

  /**
   * Create a new queue
   */
  createQueue(
    name: string,
    type: QueueType = 'standard',
    config?: Partial<QueueConfig>
  ): Queue {
    if (this.queues.has(name)) {
      throw new Error(`Queue ${name} already exists`);
    }

    const queue: Queue = {
      name,
      type,
      config: {
        maxSize: 10000,
        maxRetries: this.config.defaultMaxRetries,
        retryDelay: this.config.defaultRetryDelay,
        visibilityTimeout: this.config.defaultVisibilityTimeout,
        messageRetention: 86400000, // 24 hours
        concurrency: this.config.defaultConcurrency,
        ...config
      },
      consumers: [],
      dlq: name === 'dead-letter' ? undefined : 'dead-letter',
      metrics: {
        size: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        throughput: 0,
        avgProcessingTime: 0
      }
    };

    this.queues.set(name, queue);

    this.emit('queue-created', {
      name,
      type,
      config: queue.config
    });

    return queue;
  }

  /**
   * Publish message to queue
   */
  async publish(
    queue: string,
    type: string,
    payload: any,
    options?: {
      priority?: MessagePriority;
      delay?: number;
      metadata?: Partial<MessageMetadata>;
    }
  ): Promise<string> {
    const queueObj = this.queues.get(queue);
    if (!queueObj) {
      throw new Error(`Queue ${queue} not found`);
    }

    // Check queue size limit
    if (queueObj.config.maxSize && queueObj.metrics.size >= queueObj.config.maxSize) {
      throw new Error(`Queue ${queue} is full`);
    }

    const messageId = this.generateMessageId();
    const now = new Date();
    
    const message: Message = {
      id: messageId,
      queue,
      type,
      payload,
      priority: options?.priority || 2,
      createdAt: now,
      attempts: 0,
      maxAttempts: queueObj.config.maxRetries!,
      status: 'pending',
      metadata: {
        ...options?.metadata,
        delayUntil: options?.delay ? new Date(now.getTime() + options.delay) : undefined
      }
    };

    this.messages.set(messageId, message);
    queueObj.metrics.size++;

    // Emit event
    this.eventChannel.publish('message.published', {
      messageId,
      queue,
      type,
      priority: message.priority
    });

    // Process immediately if not delayed
    if (!options?.delay) {
      this.processQueue(queue);
    }

    return messageId;
  }

  /**
   * Subscribe to queue
   */
  subscribe(
    queue: string,
    handler: MessageHandler,
    options?: ConsumerOptions
  ): string {
    const queueObj = this.queues.get(queue);
    if (!queueObj) {
      throw new Error(`Queue ${queue} not found`);
    }

    const consumerId = this.generateConsumerId();
    
    const consumer: Consumer = {
      id: consumerId,
      queue,
      handler,
      options: {
        concurrency: options?.concurrency || 1,
        timeout: options?.timeout || 30000,
        ...options
      },
      status: 'active',
      metrics: {
        processed: 0,
        failed: 0,
        avgProcessingTime: 0
      }
    };

    this.consumers.set(consumerId, consumer);
    queueObj.consumers.push(consumer);

    // Start processing
    this.processQueue(queue);

    this.emit('consumer-registered', {
      consumerId,
      queue,
      concurrency: consumer.options!.concurrency
    });

    return consumerId;
  }

  /**
   * Process messages in queue
   */
  private async processQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    // Get active consumers
    const activeConsumers = queue.consumers.filter(c => c.status === 'active');
    if (activeConsumers.length === 0) return;

    // Get pending messages
    const pendingMessages = this.getPendingMessages(queueName);
    if (pendingMessages.length === 0) return;

    // Process messages with consumers
    for (const consumer of activeConsumers) {
      const capacity = this.getConsumerCapacity(consumer);
      if (capacity <= 0) continue;

      const messagesToProcess = pendingMessages
        .filter(msg => !consumer.options?.filter || consumer.options.filter(msg))
        .slice(0, capacity);

      for (const message of messagesToProcess) {
        this.processMessage(message, consumer);
      }
    }
  }

  /**
   * Process single message
   */
  private async processMessage(message: Message, consumer: Consumer): Promise<void> {
    if (this.processing.has(message.id)) return;

    this.processing.add(message.id);
    message.status = 'processing';
    message.processedAt = new Date();
    message.attempts++;

    const queue = this.queues.get(message.queue)!;
    queue.metrics.processing++;

    const startTime = Date.now();

    try {
      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), consumer.options!.timeout!)
      );

      await Promise.race([
        consumer.handler(message),
        timeoutPromise
      ]);

      // Success
      message.status = 'completed';
      message.completedAt = new Date();
      
      queue.metrics.completed++;
      consumer.metrics.processed++;
      
      this.updateProcessingTime(queue, consumer, Date.now() - startTime);

      this.eventChannel.publish('message.completed', {
        messageId: message.id,
        queue: message.queue,
        type: message.type,
        duration: Date.now() - startTime
      });

    } catch (error) {
      // Failure
      message.error = (error as Error).message;
      
      if (message.attempts >= message.maxAttempts) {
        // Move to dead letter queue
        message.status = 'dead-letter';
        queue.metrics.failed++;
        consumer.metrics.failed++;
        
        if (queue.dlq) {
          this.moveToDeadLetter(message);
        }
        
        this.eventChannel.publish('message.failed', {
          messageId: message.id,
          queue: message.queue,
          type: message.type,
          error: message.error,
          attempts: message.attempts
        });
      } else {
        // Retry
        message.status = 'pending';
        const retryDelay = this.calculateRetryDelay(message);
        message.metadata!.delayUntil = new Date(Date.now() + retryDelay);
        
        this.eventChannel.publish('message.retry', {
          messageId: message.id,
          queue: message.queue,
          attempt: message.attempts,
          nextRetry: message.metadata!.delayUntil
        });
      }

      // Call error handler if provided
      if (consumer.options?.errorHandler) {
        consumer.options.errorHandler(error as Error, message);
      }
    } finally {
      queue.metrics.processing--;
      this.processing.delete(message.id);
      
      // Continue processing
      setImmediate(() => this.processQueue(message.queue));
    }
  }

  /**
   * Get pending messages for queue
   */
  private getPendingMessages(queueName: string): Message[] {
    const now = new Date();
    const messages = Array.from(this.messages.values())
      .filter(msg => 
        msg.queue === queueName &&
        msg.status === 'pending' &&
        (!msg.metadata?.delayUntil || msg.metadata.delayUntil <= now) &&
        (!msg.metadata?.ttl || msg.createdAt.getTime() + msg.metadata.ttl > now.getTime())
      );

    // Sort by priority and creation time
    if (this.queues.get(queueName)?.type === 'priority') {
      messages.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority; // Lower number = higher priority
        }
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    } else {
      messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    return messages;
  }

  /**
   * Get consumer capacity
   */
  private getConsumerCapacity(consumer: Consumer): number {
    const processingCount = Array.from(this.messages.values())
      .filter(msg => 
        msg.status === 'processing' && 
        this.isMessageBeingProcessedByConsumer(msg, consumer)
      ).length;

    return (consumer.options?.concurrency || 1) - processingCount;
  }

  /**
   * Check if message is being processed by consumer
   */
  private isMessageBeingProcessedByConsumer(message: Message, consumer: Consumer): boolean {
    // In a real implementation, would track which consumer is processing which message
    return false;
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(message: Message): number {
    const policy = message.metadata?.retryPolicy;
    const baseDelay = policy?.retryDelay || this.config.defaultRetryDelay!;
    const multiplier = policy?.backoffMultiplier || 2;
    
    return baseDelay * Math.pow(multiplier, message.attempts - 1);
  }

  /**
   * Move message to dead letter queue
   */
  private moveToDeadLetter(message: Message): void {
    const dlq = this.queues.get('dead-letter');
    if (!dlq) return;

    message.queue = 'dead-letter';
    message.status = 'pending';
    dlq.metrics.size++;
  }

  /**
   * Update processing time metrics
   */
  private updateProcessingTime(
    queue: Queue,
    consumer: Consumer,
    processingTime: number
  ): void {
    // Update queue metrics
    const queueTotal = queue.metrics.completed;
    queue.metrics.avgProcessingTime = 
      (queue.metrics.avgProcessingTime * (queueTotal - 1) + processingTime) / queueTotal;

    // Update consumer metrics
    const consumerTotal = consumer.metrics.processed;
    consumer.metrics.avgProcessingTime = 
      (consumer.metrics.avgProcessingTime * (consumerTotal - 1) + processingTime) / consumerTotal;
    
    consumer.metrics.lastProcessed = new Date();
  }

  /**
   * Schedule a job
   */
  async scheduleJob(
    type: string,
    data: any,
    schedule: JobSchedule
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: Job = {
      id: jobId,
      type,
      data,
      schedule,
      status: 'scheduled',
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);

    if (schedule.type === 'once' && schedule.at) {
      const delay = schedule.at.getTime() - Date.now();
      if (delay > 0) {
        const timeout = setTimeout(() => {
          this.executeJob(job);
          this.scheduledJobs.delete(jobId);
        }, delay);
        
        this.scheduledJobs.set(jobId, timeout);
      } else {
        // Execute immediately if time has passed
        this.executeJob(job);
      }
    } else if (schedule.type === 'recurring' && schedule.interval) {
      const interval = setInterval(() => {
        this.executeJob(job);
      }, schedule.interval);
      
      this.scheduledJobs.set(jobId, interval as any);
    }

    this.emit('job-scheduled', {
      jobId,
      type,
      schedule
    });

    return jobId;
  }

  /**
   * Execute scheduled job
   */
  private async executeJob(job: Job): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();

    try {
      // Publish job as message
      const messageId = await this.publish('default', `job.${job.type}`, job.data, {
        metadata: {
          causationId: job.id,
          source: 'scheduler'
        }
      });

      job.result = { messageId };
      job.status = 'completed';
      job.completedAt = new Date();

      this.eventChannel.publish('job.completed', {
        jobId: job.id,
        type: job.type,
        duration: job.completedAt.getTime() - job.startedAt.getTime()
      });

    } catch (error) {
      job.status = 'failed';
      job.error = (error as Error).message;
      job.completedAt = new Date();

      this.eventChannel.publish('job.failed', {
        jobId: job.id,
        type: job.type,
        error: job.error
      });
    }
  }

  /**
   * Cancel scheduled job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'scheduled') {
      return false;
    }

    const scheduled = this.scheduledJobs.get(jobId);
    if (scheduled) {
      if (job.schedule?.type === 'once') {
        clearTimeout(scheduled);
      } else {
        clearInterval(scheduled);
      }
      this.scheduledJobs.delete(jobId);
    }

    this.jobs.delete(jobId);
    return true;
  }

  /**
   * Start cleanup process
   */
  private startCleanup(): void {
    setInterval(() => {
      this.cleanupMessages();
      this.cleanupJobs();
    }, this.config.cleanupInterval!);
  }

  /**
   * Clean up old messages
   */
  private cleanupMessages(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, message] of this.messages) {
      const queue = this.queues.get(message.queue);
      if (!queue) continue;

      const age = now - message.createdAt.getTime();
      
      // Remove if exceeded retention or TTL
      if (
        age > queue.config.messageRetention! ||
        (message.metadata?.ttl && age > message.metadata.ttl)
      ) {
        this.messages.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('cleanup', {
        type: 'messages',
        count: cleaned
      });
    }
  }

  /**
   * Clean up completed jobs
   */
  private cleanupJobs(): void {
    const cutoff = Date.now() - 86400000; // 24 hours
    let cleaned = 0;

    for (const [id, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt.getTime() < cutoff
      ) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('cleanup', {
        type: 'jobs',
        count: cleaned
      });
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    if (!this.config.enableMetrics) return;

    setInterval(() => {
      for (const queue of this.queues.values()) {
        const throughput = this.calculateThroughput(queue);
        queue.metrics.throughput = throughput;
        
        // Find oldest pending message
        const pendingMessages = this.getPendingMessages(queue.name);
        queue.metrics.oldestMessage = pendingMessages[0]?.createdAt;
      }
    }, 10000); // Every 10 seconds
  }

  /**
   * Calculate queue throughput
   */
  private calculateThroughput(queue: Queue): number {
    // Messages per second over last minute
    const recentMessages = Array.from(this.messages.values())
      .filter(msg => 
        msg.queue === queue.name &&
        msg.completedAt &&
        msg.completedAt.getTime() > Date.now() - 60000
      );

    return recentMessages.length / 60;
  }

  /**
   * Get queue metrics
   */
  getQueueMetrics(queueName?: string): any {
    if (queueName) {
      const queue = this.queues.get(queueName);
      return queue ? queue.metrics : null;
    }

    const metrics: Record<string, QueueMetrics> = {};
    for (const [name, queue] of this.queues) {
      metrics[name] = queue.metrics;
    }
    return metrics;
  }

  /**
   * Get consumer metrics
   */
  getConsumerMetrics(consumerId?: string): any {
    if (consumerId) {
      const consumer = this.consumers.get(consumerId);
      return consumer ? consumer.metrics : null;
    }

    const metrics: Record<string, ConsumerMetrics> = {};
    for (const [id, consumer] of this.consumers) {
      metrics[id] = consumer.metrics;
    }
    return metrics;
  }

  /**
   * Pause consumer
   */
  pauseConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.status = 'paused';
      this.emit('consumer-paused', { consumerId });
    }
  }

  /**
   * Resume consumer
   */
  resumeConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer && consumer.status === 'paused') {
      consumer.status = 'active';
      this.processQueue(consumer.queue);
      this.emit('consumer-resumed', { consumerId });
    }
  }

  /**
   * Stop consumer
   */
  stopConsumer(consumerId: string): void {
    const consumer = this.consumers.get(consumerId);
    if (consumer) {
      consumer.status = 'stopped';
      
      // Remove from queue
      const queue = this.queues.get(consumer.queue);
      if (queue) {
        queue.consumers = queue.consumers.filter(c => c.id !== consumerId);
      }
      
      this.consumers.delete(consumerId);
      this.emit('consumer-stopped', { consumerId });
    }
  }

  /**
   * Generate IDs
   */
  private generateMessageId(): string {
    return `MSG_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateConsumerId(): string {
    return `CONS_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateJobId(): string {
    return `JOB_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Create singleton instance
export const messageQueue = new MessageQueue({
  defaultConcurrency: 5,
  defaultMaxRetries: 3,
  persistMessages: true,
  enableMetrics: true
});

export default MessageQueue;