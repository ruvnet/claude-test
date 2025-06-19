/**
 * Autonomous Ticket Management Service
 * Handles support ticket lifecycle, assignment, and resolution
 */

import { EventEmitter } from 'events';
import {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketInteraction,
  Customer,
  CustomerServiceEvent,
  CustomerServiceConfig,
  SLASettings
} from '../types.js';

export class TicketService extends EventEmitter {
  private tickets: Map<string, Ticket> = new Map();
  private config: CustomerServiceConfig['ticketing'];
  private categoryClassifier: CategoryClassifier;
  private priorityAnalyzer: PriorityAnalyzer;

  constructor(config: CustomerServiceConfig['ticketing']) {
    super();
    this.config = config;
    this.categoryClassifier = new CategoryClassifier(config.categorization.categories);
    this.priorityAnalyzer = new PriorityAnalyzer();
  }

  /**
   * Create a new support ticket
   */
  async createTicket(
    customerId: string,
    subject: string,
    description: string,
    channel?: string
  ): Promise<Ticket> {
    const ticketId = this.generateTicketId();
    
    // Analyze ticket for categorization and priority
    const category = this.config.categorization.enabled 
      ? await this.categoryClassifier.classify(subject, description)
      : 'general';
    
    const priority = await this.priorityAnalyzer.analyze(subject, description);
    const tags = this.extractTags(subject, description);

    const ticket: Ticket = {
      id: ticketId,
      customerId,
      subject,
      description,
      status: 'open',
      priority,
      category,
      tags,
      createdAt: new Date(),
      updatedAt: new Date(),
      interactions: [
        {
          id: this.generateInteractionId(),
          timestamp: new Date(),
          from: 'customer',
          message: description
        }
      ]
    };

    // Auto-assignment if enabled
    if (this.config.autoAssignment) {
      ticket.assignedTo = await this.autoAssignAgent(ticket);
      if (ticket.assignedTo) {
        ticket.status = 'in-progress';
      }
    }

    this.tickets.set(ticketId, ticket);

    // Emit event
    this.emit('event', {
      eventType: 'ticket.created',
      ticketId,
      customerId,
      data: { category, priority, channel },
      timestamp: new Date()
    });

    // Set SLA timers
    this.setSLATimers(ticket);

    // Check for auto-resolution possibilities
    this.checkAutoResolution(ticket);

    return ticket;
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<Ticket> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const previousStatus = ticket.status;
    ticket.status = status;
    ticket.updatedAt = new Date();

    if (status === 'resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
      const resolutionTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
      
      // Add resolution interaction
      ticket.interactions.push({
        id: this.generateInteractionId(),
        timestamp: new Date(),
        from: 'system',
        message: 'Ticket has been resolved'
      });
    }

    // Emit event
    this.emit('event', {
      eventType: 'ticket.updated',
      ticketId,
      customerId: ticket.customerId,
      data: { previousStatus, newStatus: status },
      timestamp: new Date()
    });

    return ticket;
  }

  /**
   * Add interaction to ticket
   */
  async addInteraction(
    ticketId: string,
    from: 'customer' | 'agent' | 'system',
    message: string,
    attachments?: string[]
  ): Promise<TicketInteraction> {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const interaction: TicketInteraction = {
      id: this.generateInteractionId(),
      timestamp: new Date(),
      from,
      message,
      attachments
    };

    ticket.interactions.push(interaction);
    ticket.updatedAt = new Date();

    // Update status based on interaction
    if (from === 'customer' && ticket.status === 'waiting-customer') {
      ticket.status = 'in-progress';
    } else if (from === 'agent' && ticket.status === 'open') {
      ticket.status = 'in-progress';
    }

    // Check for resolution keywords
    if (this.containsResolutionKeywords(message)) {
      await this.suggestResolution(ticketId);
    }

    return interaction;
  }

  /**
   * Auto-assign ticket to appropriate agent
   */
  private async autoAssignAgent(ticket: Ticket): Promise<string | undefined> {
    // Implement intelligent agent assignment based on:
    // - Agent availability
    // - Agent expertise matching ticket category
    // - Current workload
    // - Historical performance
    
    // For now, return a mock agent ID
    const agents = ['agent_001', 'agent_002', 'agent_003'];
    const categoryAgentMap: Record<string, string> = {
      'technical': 'agent_001',
      'billing': 'agent_002',
      'general': 'agent_003'
    };

    return categoryAgentMap[ticket.category] || agents[0];
  }

  /**
   * Check if ticket can be auto-resolved
   */
  private async checkAutoResolution(ticket: Ticket): Promise<void> {
    // Check if similar tickets have been resolved before
    const similarTickets = this.findSimilarResolvedTickets(ticket);
    
    if (similarTickets.length > 0) {
      // Suggest resolution based on similar tickets
      const suggestedResolution = this.generateSuggestedResolution(similarTickets);
      
      await this.addInteraction(
        ticket.id,
        'system',
        `Suggested resolution based on similar tickets: ${suggestedResolution}`
      );
    }
  }

  /**
   * Find similar resolved tickets
   */
  private findSimilarResolvedTickets(ticket: Ticket): Ticket[] {
    const similarTickets: Ticket[] = [];
    
    for (const [id, existingTicket] of this.tickets) {
      if (
        existingTicket.status === 'resolved' &&
        existingTicket.category === ticket.category &&
        this.calculateSimilarity(ticket.subject, existingTicket.subject) > 0.7
      ) {
        similarTickets.push(existingTicket);
      }
    }

    return similarTickets.slice(0, 3); // Return top 3 similar tickets
  }

  /**
   * Calculate text similarity (simple implementation)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  /**
   * Generate suggested resolution
   */
  private generateSuggestedResolution(similarTickets: Ticket[]): string {
    // Extract resolution patterns from similar tickets
    const resolutions = similarTickets
      .flatMap(ticket => ticket.interactions)
      .filter(interaction => interaction.from === 'agent')
      .map(interaction => interaction.message);

    // For now, return the most recent resolution
    return resolutions[resolutions.length - 1] || 'No resolution pattern found';
  }

  /**
   * Set SLA timers for ticket
   */
  private setSLATimers(ticket: Ticket): void {
    const slaSettings = this.config.slaSettings;
    const responseTime = slaSettings.responseTime[ticket.priority];
    const resolutionTime = slaSettings.resolutionTime[ticket.priority];

    // Set response timer
    setTimeout(() => {
      if (ticket.status === 'open') {
        this.emit('sla-breach', {
          ticketId: ticket.id,
          type: 'response',
          priority: ticket.priority
        });
      }
    }, responseTime);

    // Set resolution timer
    setTimeout(() => {
      if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
        this.emit('sla-breach', {
          ticketId: ticket.id,
          type: 'resolution',
          priority: ticket.priority
        });
      }
    }, resolutionTime);
  }

  /**
   * Extract tags from ticket content
   */
  private extractTags(subject: string, description: string): string[] {
    const text = `${subject} ${description}`.toLowerCase();
    const tags: string[] = [];

    // Extract product names, features, etc.
    const patterns = [
      /\b(login|password|account|billing|payment|subscription)\b/g,
      /\b(error|bug|crash|broken|issue)\b/g,
      /\b(feature|request|suggestion|improvement)\b/g
    ];

    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        tags.push(...matches);
      }
    });

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Check if message contains resolution keywords
   */
  private containsResolutionKeywords(message: string): boolean {
    const keywords = ['resolved', 'fixed', 'solved', 'working now', 'thank you'];
    const lowerMessage = message.toLowerCase();
    
    return keywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Suggest resolution for ticket
   */
  private async suggestResolution(ticketId: string): Promise<void> {
    await this.addInteraction(
      ticketId,
      'system',
      'It seems like this issue might be resolved. Would you like to close this ticket?'
    );
  }

  /**
   * Get ticket by ID
   */
  getTicket(ticketId: string): Ticket | undefined {
    return this.tickets.get(ticketId);
  }

  /**
   * Get tickets by customer
   */
  getCustomerTickets(customerId: string): Ticket[] {
    return Array.from(this.tickets.values())
      .filter(ticket => ticket.customerId === customerId);
  }

  /**
   * Get tickets by status
   */
  getTicketsByStatus(status: TicketStatus): Ticket[] {
    return Array.from(this.tickets.values())
      .filter(ticket => ticket.status === status);
  }

  /**
   * Get ticket metrics
   */
  getMetrics(): any {
    const tickets = Array.from(this.tickets.values());
    const resolved = tickets.filter(t => t.status === 'resolved');
    
    const totalResolutionTime = resolved.reduce((sum, ticket) => {
      if (ticket.resolvedAt) {
        return sum + (ticket.resolvedAt.getTime() - ticket.createdAt.getTime());
      }
      return sum;
    }, 0);

    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      inProgress: tickets.filter(t => t.status === 'in-progress').length,
      resolved: resolved.length,
      averageResolutionTime: resolved.length > 0 ? totalResolutionTime / resolved.length : 0,
      byPriority: {
        urgent: tickets.filter(t => t.priority === 'urgent').length,
        high: tickets.filter(t => t.priority === 'high').length,
        medium: tickets.filter(t => t.priority === 'medium').length,
        low: tickets.filter(t => t.priority === 'low').length
      }
    };
  }

  /**
   * Generate unique ticket ID
   */
  private generateTicketId(): string {
    return `TICKET_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }

  /**
   * Generate unique interaction ID
   */
  private generateInteractionId(): string {
    return `INT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Category classifier for tickets
 */
class CategoryClassifier {
  private categories: string[];
  private categoryKeywords: Map<string, string[]>;

  constructor(categories: string[]) {
    this.categories = categories;
    this.categoryKeywords = new Map([
      ['technical', ['error', 'bug', 'crash', 'not working', 'broken', 'issue']],
      ['billing', ['payment', 'invoice', 'charge', 'refund', 'subscription', 'bill']],
      ['account', ['login', 'password', 'email', 'profile', 'settings', 'access']],
      ['feature', ['request', 'suggestion', 'improvement', 'add', 'new feature']],
      ['general', ['help', 'question', 'how to', 'information', 'support']]
    ]);
  }

  async classify(subject: string, description: string): Promise<string> {
    const text = `${subject} ${description}`.toLowerCase();
    let bestCategory = 'general';
    let highestScore = 0;

    for (const [category, keywords] of this.categoryKeywords) {
      const score = keywords.filter(keyword => text.includes(keyword)).length;
      
      if (score > highestScore) {
        highestScore = score;
        bestCategory = category;
      }
    }

    return bestCategory;
  }
}

/**
 * Priority analyzer for tickets
 */
class PriorityAnalyzer {
  private urgentKeywords = ['urgent', 'critical', 'emergency', 'asap', 'immediately'];
  private highKeywords = ['important', 'high priority', 'serious', 'major'];

  async analyze(subject: string, description: string): Promise<TicketPriority> {
    const text = `${subject} ${description}`.toLowerCase();

    if (this.urgentKeywords.some(keyword => text.includes(keyword))) {
      return 'urgent';
    }
    
    if (this.highKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }

    // Analyze sentiment and other factors
    const exclamationCount = (text.match(/!/g) || []).length;
    if (exclamationCount > 2) {
      return 'high';
    }

    return 'medium';
  }
}