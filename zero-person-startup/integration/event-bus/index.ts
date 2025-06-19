/**
 * Event Bus
 * Central event-driven communication system for all modules
 */

import { EventEmitter } from 'events';

export interface SystemEvent {
  id: string;
  timestamp: Date;
  source: string;
  target?: string;
  type: string;
  category: EventCategory;
  priority: EventPriority;
  data: any;
  metadata?: EventMetadata;
}

export type EventCategory = 
  | 'business'
  | 'system'
  | 'integration'
  | 'alert'
  | 'metric'
  | 'error';

export type EventPriority = 'low' | 'medium' | 'high' | 'critical';

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  sessionId?: string;
  version?: string;
  retryCount?: number;
}

export interface EventHandler {
  id: string;
  name: string;
  pattern: string | RegExp;
  handler: (event: SystemEvent) => Promise<void> | void;
  options?: EventHandlerOptions;
}

export interface EventHandlerOptions {
  priority?: number;
  filter?: (event: SystemEvent) => boolean;
  errorHandler?: (error: Error, event: SystemEvent) => void;
  maxRetries?: number;
  timeout?: number;
}

export interface EventBusConfig {
  maxListeners?: number;
  errorHandling?: 'throw' | 'log' | 'silent';
  persistence?: boolean;
  retryPolicy?: {
    maxRetries: number;
    retryDelay: number;
    backoffMultiplier: number;
  };
}

export class EventBus extends EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventHistory: SystemEvent[] = [];
  private config: EventBusConfig;
  private subscriptions: Map<string, Set<string>> = new Map();
  private metrics: EventBusMetrics;

  constructor(config?: EventBusConfig) {
    super();
    
    this.config = {
      maxListeners: 100,
      errorHandling: 'log',
      persistence: false,
      retryPolicy: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      },
      ...config
    };

    this.setMaxListeners(this.config.maxListeners!);
    
    this.metrics = {
      eventsPublished: 0,
      eventsHandled: 0,
      eventsFailed: 0,
      averageHandlingTime: 0,
      handlerErrors: 0
    };

    this.setupErrorHandling();
  }

  /**
   * Publish an event to the bus
   */
  async publish(event: Omit<SystemEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: SystemEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date()
    };

    // Store in history
    if (this.config.persistence) {
      this.eventHistory.push(fullEvent);
      this.cleanupHistory();
    }

    // Update metrics
    this.metrics.eventsPublished++;

    // Emit for legacy EventEmitter compatibility
    this.emit(event.type, fullEvent);
    this.emit('*', fullEvent);

    // Process through registered handlers
    await this.processEvent(fullEvent);
  }

  /**
   * Subscribe to events
   */
  subscribe(
    pattern: string | RegExp,
    handler: (event: SystemEvent) => Promise<void> | void,
    options?: EventHandlerOptions
  ): string {
    const handlerId = this.generateHandlerId();
    
    const eventHandler: EventHandler = {
      id: handlerId,
      name: options?.priority ? `Handler-P${options.priority}` : 'Handler',
      pattern,
      handler,
      options
    };

    const patternKey = pattern.toString();
    
    if (!this.handlers.has(patternKey)) {
      this.handlers.set(patternKey, []);
    }
    
    const handlerList = this.handlers.get(patternKey)!;
    handlerList.push(eventHandler);
    
    // Sort by priority
    handlerList.sort((a, b) => (b.options?.priority || 0) - (a.options?.priority || 0));

    return handlerId;
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(handlerId: string): boolean {
    for (const [pattern, handlers] of this.handlers) {
      const index = handlers.findIndex(h => h.id === handlerId);
      if (index !== -1) {
        handlers.splice(index, 1);
        if (handlers.length === 0) {
          this.handlers.delete(pattern);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Create a module-specific event channel
   */
  createChannel(moduleId: string): EventChannel {
    return new EventChannel(this, moduleId);
  }

  /**
   * Process event through handlers
   */
  private async processEvent(event: SystemEvent): Promise<void> {
    const startTime = Date.now();
    const matchingHandlers: EventHandler[] = [];

    // Find matching handlers
    for (const [pattern, handlers] of this.handlers) {
      if (this.matchesPattern(event.type, pattern)) {
        matchingHandlers.push(...handlers);
      }
    }

    // Execute handlers
    const promises = matchingHandlers.map(handler => 
      this.executeHandler(handler, event)
    );

    try {
      await Promise.all(promises);
      this.metrics.eventsHandled++;
      
      // Update average handling time
      const handlingTime = Date.now() - startTime;
      this.updateAverageHandlingTime(handlingTime);
    } catch (error) {
      this.metrics.eventsFailed++;
      this.handleError(error as Error, event);
    }
  }

  /**
   * Execute a single handler
   */
  private async executeHandler(handler: EventHandler, event: SystemEvent): Promise<void> {
    // Apply filter if exists
    if (handler.options?.filter && !handler.options.filter(event)) {
      return;
    }

    // Set timeout if specified
    const timeout = handler.options?.timeout || 30000;
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Handler timeout')), timeout)
    );

    try {
      await Promise.race([
        handler.handler(event),
        timeoutPromise
      ]);
    } catch (error) {
      this.metrics.handlerErrors++;
      
      if (handler.options?.errorHandler) {
        handler.options.errorHandler(error as Error, event);
      } else {
        throw error;
      }
    }
  }

  /**
   * Check if event type matches pattern
   */
  private matchesPattern(eventType: string, pattern: string | RegExp): boolean {
    if (pattern === '*') return true;
    
    if (typeof pattern === 'string') {
      // Support wildcards
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        return regex.test(eventType);
      }
      return eventType === pattern;
    }
    
    return pattern.test(eventType);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.on('error', (error: Error) => {
      switch (this.config.errorHandling) {
        case 'throw':
          throw error;
        case 'log':
          console.error('EventBus Error:', error);
          break;
        case 'silent':
          // Do nothing
          break;
      }
    });
  }

  /**
   * Handle errors
   */
  private handleError(error: Error, event: SystemEvent): void {
    this.emit('error', error);
    this.emit('event-error', { error, event });
  }

  /**
   * Update average handling time
   */
  private updateAverageHandlingTime(newTime: number): void {
    const currentAvg = this.metrics.averageHandlingTime;
    const totalEvents = this.metrics.eventsHandled;
    
    this.metrics.averageHandlingTime = 
      (currentAvg * (totalEvents - 1) + newTime) / totalEvents;
  }

  /**
   * Clean up old events from history
   */
  private cleanupHistory(): void {
    const maxHistorySize = 10000;
    if (this.eventHistory.length > maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-maxHistorySize / 2);
    }
  }

  /**
   * Get event history
   */
  getHistory(filter?: {
    source?: string;
    type?: string;
    category?: EventCategory;
    startTime?: Date;
    endTime?: Date;
  }): SystemEvent[] {
    let events = [...this.eventHistory];

    if (filter) {
      if (filter.source) {
        events = events.filter(e => e.source === filter.source);
      }
      if (filter.type) {
        events = events.filter(e => e.type === filter.type);
      }
      if (filter.category) {
        events = events.filter(e => e.category === filter.category);
      }
      if (filter.startTime) {
        events = events.filter(e => e.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        events = events.filter(e => e.timestamp <= filter.endTime!);
      }
    }

    return events;
  }

  /**
   * Get metrics
   */
  getMetrics(): EventBusMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all handlers
   */
  clearHandlers(): void {
    this.handlers.clear();
    this.removeAllListeners();
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique handler ID
   */
  private generateHandlerId(): string {
    return `HDL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Event Channel for module-specific events
 */
export class EventChannel {
  constructor(
    private eventBus: EventBus,
    private moduleId: string
  ) {}

  /**
   * Publish event from this module
   */
  async publish(
    type: string,
    data: any,
    options?: {
      target?: string;
      category?: EventCategory;
      priority?: EventPriority;
      metadata?: EventMetadata;
    }
  ): Promise<void> {
    await this.eventBus.publish({
      source: this.moduleId,
      type: `${this.moduleId}.${type}`,
      category: options?.category || 'business',
      priority: options?.priority || 'medium',
      data,
      target: options?.target,
      metadata: options?.metadata
    });
  }

  /**
   * Subscribe to events for this module
   */
  subscribe(
    pattern: string,
    handler: (event: SystemEvent) => Promise<void> | void,
    options?: EventHandlerOptions
  ): string {
    // Adjust pattern to include module namespace
    const modulePattern = pattern.startsWith(this.moduleId) 
      ? pattern 
      : `${this.moduleId}.${pattern}`;
    
    return this.eventBus.subscribe(modulePattern, handler, options);
  }

  /**
   * Subscribe to events from other modules
   */
  subscribeExternal(
    sourceModule: string,
    pattern: string,
    handler: (event: SystemEvent) => Promise<void> | void,
    options?: EventHandlerOptions
  ): string {
    const externalPattern = `${sourceModule}.${pattern}`;
    return this.eventBus.subscribe(externalPattern, handler, options);
  }

  /**
   * Request data from another module
   */
  async request<T = any>(
    targetModule: string,
    action: string,
    data: any,
    timeout: number = 5000
  ): Promise<T> {
    const requestId = `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const responseEvent = `${targetModule}.response.${requestId}`;

    return new Promise<T>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.eventBus.unsubscribe(handlerId);
        reject(new Error(`Request timeout: ${targetModule}.${action}`));
      }, timeout);

      const handlerId = this.eventBus.subscribe(
        responseEvent,
        (event: SystemEvent) => {
          clearTimeout(timeoutHandle);
          this.eventBus.unsubscribe(handlerId);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result as T);
          }
        }
      );

      // Send request
      this.publish(`request.${action}`, data, {
        target: targetModule,
        metadata: { correlationId: requestId }
      });
    });
  }

  /**
   * Respond to requests
   */
  onRequest(
    action: string,
    handler: (data: any, event: SystemEvent) => Promise<any> | any
  ): string {
    return this.subscribe(`request.${action}`, async (event: SystemEvent) => {
      const correlationId = event.metadata?.correlationId;
      if (!correlationId) return;

      try {
        const result = await handler(event.data, event);
        
        // Send response
        await this.publish(`response.${correlationId}`, { result }, {
          target: event.source,
          metadata: { correlationId }
        });
      } catch (error) {
        // Send error response
        await this.publish(`response.${correlationId}`, { 
          error: (error as Error).message 
        }, {
          target: event.source,
          metadata: { correlationId }
        });
      }
    });
  }
}

/**
 * Event Bus Metrics
 */
interface EventBusMetrics {
  eventsPublished: number;
  eventsHandled: number;
  eventsFailed: number;
  averageHandlingTime: number;
  handlerErrors: number;
}

// Create singleton instance
export const eventBus = new EventBus({
  maxListeners: 200,
  errorHandling: 'log',
  persistence: true,
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    backoffMultiplier: 2
  }
});

export default EventBus;