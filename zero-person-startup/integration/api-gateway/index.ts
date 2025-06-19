/**
 * API Gateway
 * Unified interface for external integrations and API management
 */

import { EventEmitter } from 'events';
import { EventChannel, eventBus } from '../event-bus/index.js';

export interface APIRoute {
  id: string;
  path: string;
  method: HTTPMethod;
  handler: RouteHandler;
  middleware?: Middleware[];
  authentication?: AuthenticationConfig;
  rateLimit?: RateLimitConfig;
  validation?: ValidationSchema;
  documentation?: APIDocumentation;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';

export type RouteHandler = (
  request: APIRequest,
  response: APIResponse
) => Promise<void> | void;

export type Middleware = (
  request: APIRequest,
  response: APIResponse,
  next: () => void
) => Promise<void> | void;

export interface APIRequest {
  id: string;
  method: HTTPMethod;
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  headers: Record<string, string>;
  body?: any;
  user?: AuthenticatedUser;
  context: RequestContext;
}

export interface APIResponse {
  status: (code: number) => APIResponse;
  json: (data: any) => void;
  text: (data: string) => void;
  error: (error: APIError) => void;
  redirect: (url: string) => void;
  headers: Record<string, string>;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface RequestContext {
  startTime: number;
  correlationId: string;
  source: string;
  metadata?: Record<string, any>;
}

export interface AuthenticationConfig {
  type: 'apiKey' | 'jwt' | 'oauth' | 'basic';
  required: boolean;
  roles?: string[];
  permissions?: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: APIRequest) => string;
}

export interface ValidationSchema {
  params?: Record<string, any>;
  query?: Record<string, any>;
  body?: Record<string, any>;
  headers?: Record<string, any>;
}

export interface APIDocumentation {
  summary: string;
  description?: string;
  tags?: string[];
  requestBody?: any;
  responses?: Record<string, any>;
}

export interface APIError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export interface ExternalService {
  id: string;
  name: string;
  baseUrl: string;
  authentication: ExternalAuthConfig;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  circuitBreaker?: CircuitBreakerConfig;
}

export interface ExternalAuthConfig {
  type: 'apiKey' | 'oauth2' | 'basic' | 'custom';
  credentials: any;
  headerName?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  retryableStatuses?: number[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
}

export interface APIGatewayConfig {
  port?: number;
  host?: string;
  basePath?: string;
  corsEnabled?: boolean;
  corsOptions?: CORSOptions;
  globalRateLimit?: RateLimitConfig;
  healthCheckPath?: string;
  metricsEnabled?: boolean;
}

export interface CORSOptions {
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
}

export class APIGateway extends EventEmitter {
  private routes: Map<string, APIRoute> = new Map();
  private externalServices: Map<string, ExternalService> = new Map();
  private middleware: Middleware[] = [];
  private config: APIGatewayConfig;
  private eventChannel: EventChannel;
  private rateLimitStore: Map<string, RateLimitEntry[]> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private metrics: APIMetrics;

  constructor(config?: APIGatewayConfig) {
    super();
    
    this.config = {
      port: 3000,
      host: 'localhost',
      basePath: '/api',
      corsEnabled: true,
      corsOptions: {
        origins: ['*'],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        headers: ['Content-Type', 'Authorization'],
        credentials: true
      },
      healthCheckPath: '/health',
      metricsEnabled: true,
      ...config
    };

    this.eventChannel = eventBus.createChannel('api-gateway');
    
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      requestsByEndpoint: new Map(),
      errorsByType: new Map()
    };

    this.setupDefaultRoutes();
    this.setupGlobalMiddleware();
  }

  /**
   * Setup default routes
   */
  private setupDefaultRoutes(): void {
    // Health check endpoint
    this.route('GET', this.config.healthCheckPath!, async (req, res) => {
      const health = await this.getHealthStatus();
      res.status(health.status === 'healthy' ? 200 : 503).json(health);
    });

    // Metrics endpoint
    if (this.config.metricsEnabled) {
      this.route('GET', '/metrics', async (req, res) => {
        res.json(this.getMetrics());
      });
    }

    // API documentation
    this.route('GET', '/docs', async (req, res) => {
      res.json(this.generateAPIDocs());
    });
  }

  /**
   * Setup global middleware
   */
  private setupGlobalMiddleware(): void {
    // CORS middleware
    if (this.config.corsEnabled) {
      this.use(this.corsMiddleware());
    }

    // Request logging
    this.use(this.loggingMiddleware());

    // Request ID and correlation
    this.use(this.correlationMiddleware());

    // Global rate limiting
    if (this.config.globalRateLimit) {
      this.use(this.rateLimitMiddleware(this.config.globalRateLimit));
    }
  }

  /**
   * Register a route
   */
  route(
    method: HTTPMethod,
    path: string,
    handler: RouteHandler,
    options?: {
      middleware?: Middleware[];
      authentication?: AuthenticationConfig;
      rateLimit?: RateLimitConfig;
      validation?: ValidationSchema;
      documentation?: APIDocumentation;
    }
  ): void {
    const routeId = `${method}:${path}`;
    
    const route: APIRoute = {
      id: routeId,
      path: this.config.basePath + path,
      method,
      handler,
      ...options
    };

    this.routes.set(routeId, route);

    this.emit('route-registered', {
      method,
      path: route.path,
      authenticated: !!options?.authentication
    });
  }

  /**
   * Use middleware
   */
  use(middleware: Middleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Register external service
   */
  registerExternalService(service: ExternalService): void {
    this.externalServices.set(service.id, service);
    
    // Create circuit breaker if configured
    if (service.circuitBreaker) {
      this.circuitBreakers.set(
        service.id,
        new CircuitBreaker(service.circuitBreaker)
      );
    }

    this.emit('service-registered', {
      serviceId: service.id,
      name: service.name,
      baseUrl: service.baseUrl
    });
  }

  /**
   * Call external service
   */
  async callExternalService<T = any>(
    serviceId: string,
    options: {
      method: HTTPMethod;
      path: string;
      headers?: Record<string, string>;
      params?: Record<string, any>;
      body?: any;
    }
  ): Promise<T> {
    const service = this.externalServices.get(serviceId);
    if (!service) {
      throw new Error(`External service ${serviceId} not found`);
    }

    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(serviceId);
    if (circuitBreaker && !circuitBreaker.canExecute()) {
      throw new Error(`Circuit breaker open for service ${serviceId}`);
    }

    try {
      const response = await this.executeExternalCall(service, options);
      
      if (circuitBreaker) {
        circuitBreaker.recordSuccess();
      }

      return response;
    } catch (error) {
      if (circuitBreaker) {
        circuitBreaker.recordFailure();
      }
      
      // Retry if configured
      if (service.retryPolicy) {
        return await this.retryExternalCall(service, options, error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Execute external API call
   */
  private async executeExternalCall(
    service: ExternalService,
    options: any
  ): Promise<any> {
    const url = `${service.baseUrl}${options.path}`;
    const headers = {
      ...options.headers,
      ...this.getAuthHeaders(service)
    };

    // Simulate HTTP call
    const startTime = Date.now();
    
    try {
      // In reality, would use fetch or axios
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const mockResponse = {
        data: { success: true },
        status: 200
      };

      const duration = Date.now() - startTime;
      
      this.eventChannel.publish('external-call', {
        serviceId: service.id,
        method: options.method,
        path: options.path,
        duration,
        status: mockResponse.status
      });

      return mockResponse.data;
    } catch (error) {
      throw new Error(`External service call failed: ${error}`);
    }
  }

  /**
   * Retry external call with backoff
   */
  private async retryExternalCall(
    service: ExternalService,
    options: any,
    originalError: Error
  ): Promise<any> {
    const retryPolicy = service.retryPolicy!;
    let lastError = originalError;

    for (let attempt = 1; attempt <= retryPolicy.maxRetries; attempt++) {
      const delay = retryPolicy.retryDelay * Math.pow(retryPolicy.backoffMultiplier, attempt - 1);
      
      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        return await this.executeExternalCall(service, options);
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw lastError;
  }

  /**
   * Get authentication headers for external service
   */
  private getAuthHeaders(service: ExternalService): Record<string, string> {
    const auth = service.authentication;
    const headers: Record<string, string> = {};

    switch (auth.type) {
      case 'apiKey':
        headers[auth.headerName || 'X-API-Key'] = auth.credentials.apiKey;
        break;
      case 'basic':
        const credentials = Buffer.from(
          `${auth.credentials.username}:${auth.credentials.password}`
        ).toString('base64');
        headers['Authorization'] = `Basic ${credentials}`;
        break;
      case 'oauth2':
        headers['Authorization'] = `Bearer ${auth.credentials.accessToken}`;
        break;
    }

    return headers;
  }

  /**
   * Handle incoming request
   */
  async handleRequest(request: APIRequest): Promise<APIResponse> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    this.metrics.activeConnections++;

    // Create response object
    const response: APIResponse = this.createResponse();

    try {
      // Find matching route
      const route = this.findRoute(request.method, request.path);
      if (!route) {
        throw {
          code: 'ROUTE_NOT_FOUND',
          message: 'Route not found',
          statusCode: 404
        };
      }

      // Update metrics
      const endpointKey = `${route.method}:${route.path}`;
      this.metrics.requestsByEndpoint.set(
        endpointKey,
        (this.metrics.requestsByEndpoint.get(endpointKey) || 0) + 1
      );

      // Execute middleware chain
      await this.executeMiddleware(request, response, [
        ...this.middleware,
        ...(route.middleware || []),
        // Authentication middleware
        (req, res, next) => this.authenticationMiddleware(route, req, res, next),
        // Validation middleware
        (req, res, next) => this.validationMiddleware(route, req, res, next),
        // Rate limiting middleware
        (req, res, next) => route.rateLimit 
          ? this.rateLimitMiddleware(route.rateLimit)(req, res, next)
          : next(),
        // Route handler
        async (req, res) => await route.handler(req, res)
      ]);

      this.metrics.successfulRequests++;
    } catch (error) {
      this.metrics.failedRequests++;
      this.handleError(error as APIError, response);
    } finally {
      this.metrics.activeConnections--;
      
      // Update average response time
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);
    }

    return response;
  }

  /**
   * Find matching route
   */
  private findRoute(method: HTTPMethod, path: string): APIRoute | null {
    // Remove base path
    const routePath = path.startsWith(this.config.basePath!) 
      ? path.substring(this.config.basePath!.length)
      : path;

    // Try exact match first
    const exactKey = `${method}:${routePath}`;
    if (this.routes.has(exactKey)) {
      return this.routes.get(exactKey)!;
    }

    // Try pattern matching
    for (const [key, route] of this.routes) {
      if (route.method === method && this.matchPath(routePath, route.path)) {
        return route;
      }
    }

    return null;
  }

  /**
   * Match path with parameters
   */
  private matchPath(requestPath: string, routePath: string): boolean {
    const requestParts = requestPath.split('/');
    const routeParts = routePath.split('/');

    if (requestParts.length !== routeParts.length) {
      return false;
    }

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        // Parameter placeholder
        continue;
      }
      if (routeParts[i] !== requestParts[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute middleware chain
   */
  private async executeMiddleware(
    request: APIRequest,
    response: APIResponse,
    middlewares: Middleware[]
  ): Promise<void> {
    let index = 0;

    const next = async () => {
      if (index >= middlewares.length) return;
      
      const middleware = middlewares[index++];
      await middleware(request, response, next);
    };

    await next();
  }

  /**
   * CORS middleware
   */
  private corsMiddleware(): Middleware {
    return (req, res, next) => {
      const cors = this.config.corsOptions!;
      
      res.headers['Access-Control-Allow-Origin'] = cors.origins.join(',');
      res.headers['Access-Control-Allow-Methods'] = cors.methods.join(',');
      res.headers['Access-Control-Allow-Headers'] = cors.headers.join(',');
      
      if (cors.credentials) {
        res.headers['Access-Control-Allow-Credentials'] = 'true';
      }

      if (req.method === 'OPTIONS') {
        res.status(204).text('');
      } else {
        next();
      }
    };
  }

  /**
   * Logging middleware
   */
  private loggingMiddleware(): Middleware {
    return async (req, res, next) => {
      const startTime = Date.now();
      
      this.eventChannel.publish('request', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        correlationId: req.context.correlationId
      });

      next();

      const duration = Date.now() - startTime;
      
      this.eventChannel.publish('response', {
        method: req.method,
        path: req.path,
        duration,
        correlationId: req.context.correlationId
      });
    };
  }

  /**
   * Correlation middleware
   */
  private correlationMiddleware(): Middleware {
    return (req, res, next) => {
      req.context.correlationId = req.headers['x-correlation-id'] || 
        `REQ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      res.headers['X-Correlation-ID'] = req.context.correlationId;
      
      next();
    };
  }

  /**
   * Authentication middleware
   */
  private authenticationMiddleware(
    route: APIRoute,
    req: APIRequest,
    res: APIResponse,
    next: () => void
  ): void {
    if (!route.authentication) {
      return next();
    }

    const auth = route.authentication;
    
    // Simulate authentication
    const token = req.headers['authorization'];
    
    if (!token && auth.required) {
      throw {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401
      };
    }

    // Mock user
    req.user = {
      id: 'user_123',
      email: 'user@example.com',
      roles: ['user'],
      permissions: ['read']
    };

    // Check roles
    if (auth.roles && !auth.roles.some(role => req.user!.roles.includes(role))) {
      throw {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions',
        statusCode: 403
      };
    }

    next();
  }

  /**
   * Validation middleware
   */
  private validationMiddleware(
    route: APIRoute,
    req: APIRequest,
    res: APIResponse,
    next: () => void
  ): void {
    if (!route.validation) {
      return next();
    }

    // Simple validation - in reality would use a validation library
    const validation = route.validation;
    
    if (validation.body && req.body) {
      // Validate body
    }
    
    if (validation.query) {
      // Validate query parameters
    }

    next();
  }

  /**
   * Rate limiting middleware
   */
  private rateLimitMiddleware(config: RateLimitConfig): Middleware {
    return (req, res, next) => {
      const key = config.keyGenerator 
        ? config.keyGenerator(req)
        : req.user?.id || req.context.source;

      const now = Date.now();
      const windowStart = now - config.windowMs;

      // Get or create rate limit entries
      if (!this.rateLimitStore.has(key)) {
        this.rateLimitStore.set(key, []);
      }

      const entries = this.rateLimitStore.get(key)!;
      
      // Remove old entries
      const validEntries = entries.filter(entry => entry.timestamp > windowStart);
      this.rateLimitStore.set(key, validEntries);

      // Check limit
      if (validEntries.length >= config.maxRequests) {
        throw {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          statusCode: 429,
          details: {
            limit: config.maxRequests,
            window: config.windowMs,
            retry: windowStart + config.windowMs - now
          }
        };
      }

      // Add new entry
      validEntries.push({ timestamp: now });
      
      next();
    };
  }

  /**
   * Create response object
   */
  private createResponse(): APIResponse {
    let statusCode = 200;
    const headers: Record<string, string> = {};

    return {
      status: (code: number) => {
        statusCode = code;
        return this.createResponse();
      },
      json: (data: any) => {
        headers['Content-Type'] = 'application/json';
        console.log(`Response [${statusCode}]:`, data);
      },
      text: (data: string) => {
        headers['Content-Type'] = 'text/plain';
        console.log(`Response [${statusCode}]:`, data);
      },
      error: (error: APIError) => {
        statusCode = error.statusCode;
        headers['Content-Type'] = 'application/json';
        console.error(`Error [${statusCode}]:`, error);
      },
      redirect: (url: string) => {
        statusCode = 302;
        headers['Location'] = url;
      },
      headers
    };
  }

  /**
   * Handle errors
   */
  private handleError(error: APIError, response: APIResponse): void {
    const errorType = error.code || 'INTERNAL_ERROR';
    
    this.metrics.errorsByType.set(
      errorType,
      (this.metrics.errorsByType.get(errorType) || 0) + 1
    );

    response.error({
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'Internal server error',
      statusCode: error.statusCode || 500,
      details: error.details
    });
  }

  /**
   * Get health status
   */
  private async getHealthStatus(): Promise<any> {
    const checks = {
      api: true,
      eventBus: eventBus.getMetrics().eventsPublished > 0,
      externalServices: await this.checkExternalServices()
    };

    const healthy = Object.values(checks).every(status => status === true);

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      checks,
      metrics: this.getMetrics()
    };
  }

  /**
   * Check external services health
   */
  private async checkExternalServices(): Promise<boolean> {
    for (const [serviceId, service] of this.externalServices) {
      try {
        await this.callExternalService(serviceId, {
          method: 'GET',
          path: '/health'
        });
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  /**
   * Generate API documentation
   */
  private generateAPIDocs(): any {
    const routes = Array.from(this.routes.values()).map(route => ({
      method: route.method,
      path: route.path,
      authenticated: !!route.authentication,
      rateLimit: route.rateLimit,
      documentation: route.documentation
    }));

    return {
      title: 'Zero Person Startup API',
      version: '1.0.0',
      basePath: this.config.basePath,
      routes
    };
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(newTime: number): void {
    const current = this.metrics.averageResponseTime;
    const total = this.metrics.successfulRequests + this.metrics.failedRequests;
    
    this.metrics.averageResponseTime = 
      (current * (total - 1) + newTime) / total;
  }

  /**
   * Get metrics
   */
  getMetrics(): APIMetrics {
    return {
      ...this.metrics,
      requestsByEndpoint: Object.fromEntries(this.metrics.requestsByEndpoint),
      errorsByType: Object.fromEntries(this.metrics.errorsByType)
    };
  }

  /**
   * Start API Gateway server
   */
  async start(): Promise<void> {
    // In reality, would start an HTTP server
    console.log(`API Gateway started on ${this.config.host}:${this.config.port}`);
    
    this.emit('started', {
      host: this.config.host,
      port: this.config.port,
      basePath: this.config.basePath
    });
  }

  /**
   * Stop API Gateway server
   */
  async stop(): Promise<void> {
    console.log('API Gateway stopped');
    this.emit('stopped');
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(private config: CircuitBreakerConfig) {}

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }

    return true; // half-open
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }
}

/**
 * API Metrics interface
 */
interface APIMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  activeConnections: number;
  requestsByEndpoint: any;
  errorsByType: any;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  timestamp: number;
}

// Create singleton instance
export const apiGateway = new APIGateway();

export default APIGateway;