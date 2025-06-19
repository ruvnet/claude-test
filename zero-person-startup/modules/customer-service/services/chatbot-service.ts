/**
 * Autonomous Chatbot Service
 * Provides intelligent automated customer support through natural language processing
 */

import { EventEmitter } from 'events';
import { 
  ChatbotContext, 
  ChatMessage, 
  Customer, 
  CustomerServiceEvent,
  CustomerServiceConfig 
} from '../types.js';

export class ChatbotService extends EventEmitter {
  private sessions: Map<string, ChatbotContext> = new Map();
  private intents: Map<string, IntentHandler> = new Map();
  private config: CustomerServiceConfig['chatbot'];

  constructor(config: CustomerServiceConfig['chatbot']) {
    super();
    this.config = config;
    this.initializeIntents();
  }

  /**
   * Initialize default intent handlers
   */
  private initializeIntents(): void {
    // Greeting intent
    this.registerIntent('greeting', {
      patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
      handler: async (context) => {
        return {
          message: this.config.welcomeMessage || 'Hello! How can I help you today?',
          suggestedActions: ['Check order status', 'Report an issue', 'Browse FAQ', 'Talk to agent']
        };
      }
    });

    // Order status intent
    this.registerIntent('order_status', {
      patterns: ['order', 'status', 'tracking', 'shipment', 'delivery'],
      handler: async (context) => {
        const orderId = this.extractOrderId(context);
        if (orderId) {
          return {
            message: `I'm checking the status of order ${orderId} for you...`,
            action: 'check_order_status',
            data: { orderId }
          };
        }
        return {
          message: 'I can help you check your order status. Could you please provide your order number?',
          expectedInput: 'order_id'
        };
      }
    });

    // Issue reporting intent
    this.registerIntent('report_issue', {
      patterns: ['problem', 'issue', 'broken', 'not working', 'help', 'support'],
      handler: async (context) => {
        return {
          message: 'I understand you\'re experiencing an issue. Can you please describe what\'s happening?',
          action: 'create_ticket',
          expectedInput: 'issue_description'
        };
      }
    });

    // FAQ intent
    this.registerIntent('faq', {
      patterns: ['how', 'what', 'when', 'where', 'why', 'can i', 'do you'],
      handler: async (context) => {
        const question = context.conversationHistory[context.conversationHistory.length - 1]?.content;
        return {
          message: 'Let me search our FAQ for an answer...',
          action: 'search_faq',
          data: { query: question }
        };
      }
    });

    // Agent transfer intent
    this.registerIntent('agent_transfer', {
      patterns: ['agent', 'human', 'person', 'representative', 'talk to someone'],
      handler: async (context) => {
        return {
          message: 'I\'ll connect you with a human agent. Please wait a moment...',
          action: 'transfer_to_agent',
          data: { reason: 'customer_request' }
        };
      }
    });
  }

  /**
   * Start a new chat session
   */
  async startSession(customerId?: string, initialMessage?: string): Promise<ChatbotContext> {
    const sessionId = this.generateSessionId();
    const context: ChatbotContext = {
      sessionId,
      customerId,
      conversationHistory: [],
      sentiment: 'neutral',
      language: 'en'
    };

    if (initialMessage) {
      await this.processMessage(sessionId, initialMessage);
    } else {
      // Send welcome message
      const welcomeMessage: ChatMessage = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        role: 'assistant',
        content: this.config.welcomeMessage
      };
      context.conversationHistory.push(welcomeMessage);
    }

    this.sessions.set(sessionId, context);
    
    this.emit('event', {
      eventType: 'chat.started',
      sessionId,
      customerId,
      timestamp: new Date()
    });

    // Set idle timeout
    this.setIdleTimeout(sessionId);

    return context;
  }

  /**
   * Process incoming message
   */
  async processMessage(sessionId: string, message: string): Promise<ChatMessage> {
    const context = this.sessions.get(sessionId);
    if (!context) {
      throw new Error('Session not found');
    }

    // Add user message to history
    const userMessage: ChatMessage = {
      id: this.generateMessageId(),
      timestamp: new Date(),
      role: 'user',
      content: message
    };
    context.conversationHistory.push(userMessage);

    // Analyze message
    const intent = await this.detectIntent(message, context);
    const sentiment = await this.analyzeSentiment(message);
    
    context.currentIntent = intent?.name;
    context.sentiment = sentiment;

    // Generate response
    let response: ChatMessage;
    
    if (intent && intent.confidence > 0.7) {
      const handlerResult = await intent.handler(context);
      response = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        role: 'assistant',
        content: handlerResult.message,
        intent: intent.name,
        confidence: intent.confidence,
        metadata: handlerResult
      };

      // Execute any actions
      if (handlerResult.action) {
        this.executeAction(handlerResult.action, handlerResult.data, context);
      }
    } else {
      // Fallback response
      response = {
        id: this.generateMessageId(),
        timestamp: new Date(),
        role: 'assistant',
        content: this.config.fallbackMessage || 'I\'m not sure I understand. Could you please rephrase that?',
        intent: 'unknown',
        confidence: 0
      };

      // Check if we should transfer to agent
      if (this.shouldTransferToAgent(context)) {
        this.executeAction('transfer_to_agent', { reason: 'low_confidence' }, context);
      }
    }

    context.conversationHistory.push(response);
    
    // Reset idle timeout
    this.setIdleTimeout(sessionId);

    return response;
  }

  /**
   * Detect intent from message
   */
  private async detectIntent(message: string, context: ChatbotContext): Promise<IntentMatch | null> {
    const normalizedMessage = message.toLowerCase();
    let bestMatch: IntentMatch | null = null;
    let highestConfidence = 0;

    for (const [intentName, handler] of this.intents) {
      const confidence = this.calculateIntentConfidence(normalizedMessage, handler.patterns);
      
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestMatch = {
          name: intentName,
          confidence,
          handler: handler.handler
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate confidence score for intent matching
   */
  private calculateIntentConfidence(message: string, patterns: string[]): number {
    let matchCount = 0;
    
    for (const pattern of patterns) {
      if (message.includes(pattern)) {
        matchCount++;
      }
    }

    return matchCount / patterns.length;
  }

  /**
   * Analyze sentiment of message
   */
  private async analyzeSentiment(message: string): Promise<'positive' | 'neutral' | 'negative'> {
    // Simple sentiment analysis based on keywords
    const positiveWords = ['thank', 'great', 'awesome', 'excellent', 'happy', 'good'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'angry', 'frustrated'];
    
    const lowerMessage = message.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
      if (lowerMessage.includes(word)) score++;
    });

    negativeWords.forEach(word => {
      if (lowerMessage.includes(word)) score--;
    });

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  /**
   * Check if should transfer to human agent
   */
  private shouldTransferToAgent(context: ChatbotContext): boolean {
    // Transfer if confidence is consistently low
    const recentMessages = context.conversationHistory.slice(-3);
    const lowConfidenceCount = recentMessages.filter(
      msg => msg.role === 'assistant' && (msg.confidence || 1) < this.config.transferThreshold
    ).length;

    return lowConfidenceCount >= 2;
  }

  /**
   * Execute action based on intent
   */
  private executeAction(action: string, data: any, context: ChatbotContext): void {
    this.emit('action', {
      sessionId: context.sessionId,
      customerId: context.customerId,
      action,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Register custom intent handler
   */
  registerIntent(name: string, handler: IntentHandler): void {
    this.intents.set(name, handler);
  }

  /**
   * End chat session
   */
  endSession(sessionId: string): void {
    const context = this.sessions.get(sessionId);
    if (context) {
      this.emit('event', {
        eventType: 'chat.ended',
        sessionId,
        customerId: context.customerId,
        timestamp: new Date(),
        data: {
          messageCount: context.conversationHistory.length,
          sentiment: context.sentiment
        }
      });
      
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Set idle timeout for session
   */
  private setIdleTimeout(sessionId: string): void {
    setTimeout(() => {
      if (this.sessions.has(sessionId)) {
        this.endSession(sessionId);
      }
    }, this.config.maxIdleTime);
  }

  /**
   * Extract order ID from context
   */
  private extractOrderId(context: ChatbotContext): string | null {
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1]?.content || '';
    const orderIdMatch = lastMessage.match(/\b\d{6,}\b/);
    return orderIdMatch ? orderIdMatch[0] : null;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get active sessions count
   */
  getActiveSessions(): number {
    return this.sessions.size;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): ChatbotContext | undefined {
    return this.sessions.get(sessionId);
  }
}

interface IntentHandler {
  patterns: string[];
  handler: (context: ChatbotContext) => Promise<any>;
}

interface IntentMatch {
  name: string;
  confidence: number;
  handler: (context: ChatbotContext) => Promise<any>;
}