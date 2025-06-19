/**
 * Customer Service Module
 * Autonomous customer service system with chatbot, ticketing, and FAQ management
 */

import { EventEmitter } from 'events';
import { ChatbotService } from './services/chatbot-service.js';
import { TicketService } from './services/ticket-service.js';
import { FAQService } from './services/faq-service.js';
import {
  CustomerServiceConfig,
  CustomerServiceMetrics,
  CustomerServiceEvent,
  Customer,
  Ticket,
  FAQEntry,
  ChatbotContext
} from './types.js';

export class CustomerServiceModule extends EventEmitter {
  private chatbot: ChatbotService;
  private ticketing: TicketService;
  private faq: FAQService;
  private config: CustomerServiceConfig;
  private customers: Map<string, Customer> = new Map();

  constructor(config?: Partial<CustomerServiceConfig>) {
    super();
    
    // Default configuration
    this.config = {
      chatbot: {
        enabled: true,
        welcomeMessage: 'Hello! I\'m here to help. How can I assist you today?',
        fallbackMessage: 'I\'m not sure I understand. Could you please rephrase or type "agent" to speak with a human?',
        maxIdleTime: 300000, // 5 minutes
        transferThreshold: 0.6,
        ...config?.chatbot
      },
      ticketing: {
        autoAssignment: true,
        slaSettings: {
          responseTime: {
            urgent: 900000,    // 15 minutes
            high: 3600000,     // 1 hour
            medium: 14400000,  // 4 hours
            low: 86400000      // 24 hours
          },
          resolutionTime: {
            urgent: 14400000,  // 4 hours
            high: 86400000,    // 24 hours
            medium: 259200000, // 3 days
            low: 604800000     // 7 days
          }
        },
        categorization: {
          enabled: true,
          categories: ['technical', 'billing', 'account', 'feature', 'general']
        },
        ...config?.ticketing
      },
      faq: {
        searchEnabled: true,
        suggestionsCount: 5,
        autoUpdate: true,
        ...config?.faq
      }
    };

    // Initialize services
    this.chatbot = new ChatbotService(this.config.chatbot);
    this.ticketing = new TicketService(this.config.ticketing);
    this.faq = new FAQService(this.config.faq);

    this.setupEventHandlers();
  }

  /**
   * Setup inter-service event handlers
   */
  private setupEventHandlers(): void {
    // Handle chatbot actions
    this.chatbot.on('action', async (event) => {
      switch (event.action) {
        case 'create_ticket':
          await this.createTicketFromChat(event);
          break;
        case 'search_faq':
          await this.searchFAQFromChat(event);
          break;
        case 'check_order_status':
          await this.checkOrderStatus(event);
          break;
        case 'transfer_to_agent':
          await this.transferToAgent(event);
          break;
      }
    });

    // Handle chatbot events
    this.chatbot.on('event', (event) => {
      this.emit('event', {
        ...event,
        source: 'chatbot'
      });
    });

    // Handle ticketing events
    this.ticketing.on('event', (event) => {
      this.emit('event', {
        ...event,
        source: 'ticketing'
      });
    });

    // Handle SLA breaches
    this.ticketing.on('sla-breach', (breach) => {
      this.emit('alert', {
        type: 'sla-breach',
        severity: 'high',
        data: breach,
        timestamp: new Date()
      });
    });

    // Handle FAQ events
    this.faq.on('event', (event) => {
      this.emit('event', {
        ...event,
        source: 'faq'
      });
    });

    // Handle FAQ review requests
    this.faq.on('review-needed', (review) => {
      this.emit('task', {
        type: 'faq-review',
        priority: 'medium',
        data: review,
        timestamp: new Date()
      });
    });
  }

  /**
   * Start a customer interaction
   */
  async startInteraction(customerId?: string, channel: string = 'chat'): Promise<any> {
    // Get or create customer
    let customer: Customer;
    if (customerId && this.customers.has(customerId)) {
      customer = this.customers.get(customerId)!;
    } else {
      customer = await this.createCustomer({
        name: 'Guest User',
        email: `guest_${Date.now()}@example.com`
      });
    }

    // Start appropriate interaction based on channel
    switch (channel) {
      case 'chat':
        return await this.chatbot.startSession(customer.id);
      case 'email':
        return { customerId: customer.id, channel: 'email', status: 'ready' };
      case 'ticket':
        return { customerId: customer.id, channel: 'ticket', status: 'ready' };
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Create customer record
   */
  async createCustomer(data: {
    name: string;
    email: string;
    phone?: string;
  }): Promise<Customer> {
    const customerId = this.generateCustomerId();
    
    const customer: Customer = {
      id: customerId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      history: [],
      preferences: {
        language: 'en',
        communicationChannel: 'email',
        notificationSettings: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: false,
          frequency: 'realtime'
        }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.customers.set(customerId, customer);

    this.emit('event', {
      eventType: 'customer.created',
      customerId,
      timestamp: new Date(),
      source: 'customer-service'
    });

    return customer;
  }

  /**
   * Create ticket from chat interaction
   */
  private async createTicketFromChat(event: any): Promise<void> {
    const session = this.chatbot.getSession(event.sessionId);
    if (!session) return;

    // Extract ticket details from conversation
    const lastUserMessage = session.conversationHistory
      .filter(msg => msg.role === 'user')
      .pop();

    if (lastUserMessage && session.customerId) {
      const ticket = await this.ticketing.createTicket(
        session.customerId,
        'Support Request from Chat',
        lastUserMessage.content,
        'chat'
      );

      // Add response to chat
      await this.chatbot.processMessage(
        event.sessionId,
        `I've created ticket ${ticket.id} for you. Our team will review it shortly.`
      );
    }
  }

  /**
   * Search FAQ from chat
   */
  private async searchFAQFromChat(event: any): Promise<void> {
    const results = await this.faq.searchFAQ(event.data.query);
    
    if (results.length > 0) {
      const response = `I found these relevant articles:\n\n${
        results.map((faq, index) => 
          `${index + 1}. ${faq.question}\n${faq.answer.substring(0, 100)}...`
        ).join('\n\n')
      }`;
      
      await this.chatbot.processMessage(event.sessionId, response);
      
      // Record FAQ views
      results.forEach(faq => this.faq.recordView(faq.id));
    } else {
      await this.chatbot.processMessage(
        event.sessionId,
        'I couldn\'t find any relevant articles. Would you like me to create a support ticket instead?'
      );
    }
  }

  /**
   * Check order status (integration point)
   */
  private async checkOrderStatus(event: any): Promise<void> {
    // This would integrate with the operations module
    this.emit('integration-request', {
      module: 'operations',
      action: 'check_order_status',
      data: event.data,
      callback: async (orderStatus: any) => {
        const message = orderStatus 
          ? `Your order ${event.data.orderId} is ${orderStatus.status}. Estimated delivery: ${orderStatus.estimatedDelivery}`
          : `I couldn't find order ${event.data.orderId}. Please check the order number and try again.`;
        
        await this.chatbot.processMessage(event.sessionId, message);
      }
    });
  }

  /**
   * Transfer chat to human agent
   */
  private async transferToAgent(event: any): Promise<void> {
    const session = this.chatbot.getSession(event.sessionId);
    if (!session || !session.customerId) return;

    // Create high-priority ticket
    const ticket = await this.ticketing.createTicket(
      session.customerId,
      'Chat Transfer Request',
      `Customer requested transfer to agent. Reason: ${event.data.reason}\n\nChat history:\n${
        session.conversationHistory.map(msg => 
          `${msg.role}: ${msg.content}`
        ).join('\n')
      }`,
      'chat-transfer'
    );

    await this.ticketing.updateTicketStatus(ticket.id, 'in-progress');

    await this.chatbot.processMessage(
      event.sessionId,
      `I've connected you with an agent. Your ticket number is ${ticket.id}. An agent will be with you shortly.`
    );

    // End chat session after transfer
    setTimeout(() => {
      this.chatbot.endSession(event.sessionId);
    }, 5000);
  }

  /**
   * Process incoming message (unified entry point)
   */
  async processMessage(customerId: string, message: string, channel: string = 'chat'): Promise<any> {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Record interaction
    const interaction = {
      id: this.generateInteractionId(),
      timestamp: new Date(),
      type: channel as any,
      channel,
      content: message,
      resolved: false
    };
    customer.history.push(interaction);

    // Route based on channel
    switch (channel) {
      case 'chat':
        // Find or create chat session
        let session = Array.from(this.chatbot['sessions'].values())
          .find(s => s.customerId === customerId);
        
        if (!session) {
          session = await this.chatbot.startSession(customerId);
        }
        
        return await this.chatbot.processMessage(session.sessionId, message);
      
      case 'email':
        // Create ticket from email
        return await this.ticketing.createTicket(
          customerId,
          this.extractEmailSubject(message),
          message,
          'email'
        );
      
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }
  }

  /**
   * Get comprehensive metrics
   */
  async getMetrics(): Promise<CustomerServiceMetrics> {
    const ticketMetrics = this.ticketing.getMetrics();
    const faqMetrics = this.faq.getMetrics();
    const activeChatSessions = this.chatbot.getActiveSessions();

    return {
      tickets: {
        total: ticketMetrics.total,
        open: ticketMetrics.open,
        resolved: ticketMetrics.resolved,
        averageResolutionTime: ticketMetrics.averageResolutionTime,
        satisfactionScore: 4.2 // Placeholder - would calculate from feedback
      },
      chat: {
        totalSessions: activeChatSessions * 10, // Estimate based on active
        averageDuration: 300000, // 5 minutes average
        transferRate: 0.15, // 15% transfer rate
        resolutionRate: 0.85 // 85% resolution rate
      },
      faq: {
        totalViews: faqMetrics.totalViews,
        searchQueries: faqMetrics.totalEntries * 5, // Estimate
        helpfulRate: faqMetrics.averageHelpfulRate,
        topQuestions: faqMetrics.popularQuestions
      }
    };
  }

  /**
   * Get module status
   */
  getStatus(): any {
    return {
      module: 'customer-service',
      status: 'operational',
      services: {
        chatbot: {
          enabled: this.config.chatbot.enabled,
          activeSessions: this.chatbot.getActiveSessions()
        },
        ticketing: {
          enabled: true,
          metrics: this.ticketing.getMetrics()
        },
        faq: {
          enabled: this.config.faq.searchEnabled,
          totalEntries: this.faq.getMetrics().totalEntries
        }
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Helper methods
   */
  
  private generateCustomerId(): string {
    return `CUST_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateInteractionId(): string {
    return `INT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private extractEmailSubject(message: string): string {
    const lines = message.split('\n');
    const subjectLine = lines.find(line => line.startsWith('Subject:'));
    return subjectLine ? subjectLine.replace('Subject:', '').trim() : 'Email Inquiry';
  }

  /**
   * Public API exports
   */
  
  getChatbotService(): ChatbotService {
    return this.chatbot;
  }

  getTicketingService(): TicketService {
    return this.ticketing;
  }

  getFAQService(): FAQService {
    return this.faq;
  }
}

// Export types and main module
export * from './types.js';
export default CustomerServiceModule;