/**
 * Support Ticket Management System
 * Advanced ticket lifecycle management with AI-powered categorization and SLA monitoring
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

export class SupportTicketManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.tickets = new Map();
    this.slaTimers = new Map();
    this.categoriesConfig = new Map();
    this.priorityRules = new Map();
    this.escalationRules = new Map();
    this.performanceMetrics = {
      totalTickets: 0,
      resolvedTickets: 0,
      slaBreaches: 0,
      autoResolutions: 0,
      averageResolutionTime: 0
    };
    
    this.initializeConfiguration();
  }

  /**
   * Initialize ticket management configuration
   */
  initializeConfiguration() {
    // Ticket categories configuration
    this.categoriesConfig = new Map([
      ['billing', {
        name: 'Billing & Payments',
        defaultPriority: 'medium',
        slaHours: 24,
        autoResolvable: true,
        requiredSkills: ['billing', 'payments'],
        escalationTriggers: ['chargeback', 'dispute', 'refund_request']
      }],
      ['technical_support', {
        name: 'Technical Support',
        defaultPriority: 'high',
        slaHours: 4,
        autoResolvable: false,
        requiredSkills: ['technical', 'troubleshooting'],
        escalationTriggers: ['system_down', 'data_loss', 'security_issue']
      }],
      ['feature_request', {
        name: 'Feature Request',
        defaultPriority: 'low',
        slaHours: 72,
        autoResolvable: false,
        requiredSkills: ['product_management'],
        escalationTriggers: ['enterprise_customer', 'multiple_requests']
      }],
      ['bug_report', {
        name: 'Bug Report',
        defaultPriority: 'high',
        slaHours: 8,
        autoResolvable: false,
        requiredSkills: ['technical', 'qa'],
        escalationTriggers: ['critical_bug', 'security_vulnerability']
      }],
      ['account_management', {
        name: 'Account Management',
        defaultPriority: 'medium',
        slaHours: 12,
        autoResolvable: true,
        requiredSkills: ['account_management'],
        escalationTriggers: ['account_suspension', 'data_deletion']
      }]
    ]);

    // Priority rules
    this.priorityRules = new Map([
      ['urgent', {
        slaMinutes: 15,
        escalationAfterMinutes: 30,
        requiresImmediate: true,
        notifications: ['slack', 'sms', 'email']
      }],
      ['high', {
        slaMinutes: 240,
        escalationAfterMinutes: 480,
        requiresImmediate: false,
        notifications: ['slack', 'email']
      }],
      ['medium', {
        slaMinutes: 1440,
        escalationAfterMinutes: 2880,
        requiresImmediate: false,
        notifications: ['email']
      }],
      ['low', {
        slaMinutes: 4320,
        escalationAfterMinutes: 8640,
        requiresImmediate: false,
        notifications: ['email']
      }]
    ]);

    console.log('Support ticket management configuration initialized');
  }

  /**
   * Create a new support ticket
   */
  async createTicket(ticketData) {
    try {
      const ticketId = this.generateTicketId();
      const currentTime = new Date();

      const ticket = {
        id: ticketId,
        subject: ticketData.subject,
        description: ticketData.description,
        customer: ticketData.customer,
        channel: ticketData.channel || 'web',
        status: 'new',
        priority: 'medium', // Will be updated by AI analysis
        category: null, // Will be determined by AI
        assignee: null,
        team: null,
        createdAt: currentTime,
        updatedAt: currentTime,
        slaDeadline: null,
        escalated: false,
        autoResolved: false,
        resolutionTime: null,
        satisfactionRating: null,
        tags: ticketData.tags || [],
        customFields: ticketData.customFields || {},
        timeline: [{
          timestamp: currentTime,
          action: 'created',
          actor: 'system',
          details: 'Ticket created'
        }],
        communications: [],
        relatedTickets: [],
        knowledgeBaseHits: []
      };

      this.tickets.set(ticketId, ticket);
      this.performanceMetrics.totalTickets++;

      console.log(`Created new ticket: ${ticketId}`);
      
      // Emit event for processing
      this.emit('ticket:created', ticket);
      
      return ticket;
      
    } catch (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Update ticket with AI analysis results
   */
  async updateTicketWithAnalysis(ticketId, analysis) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    try {
      // Update ticket with analysis
      ticket.category = analysis.category;
      ticket.priority = analysis.priority;
      ticket.sentiment = analysis.sentiment;
      ticket.complexity = analysis.complexity;
      ticket.confidence = analysis.confidence;
      ticket.updatedAt = new Date();
      
      // Add analysis to timeline
      ticket.timeline.push({
        timestamp: new Date(),
        action: 'analyzed',
        actor: 'ai_system',
        details: `Categorized as ${analysis.category}, Priority: ${analysis.priority}`
      });

      // Set SLA deadline based on priority
      await this.setSLADeadline(ticket);
      
      // Add category-specific tags
      const categoryConfig = this.categoriesConfig.get(analysis.category);
      if (categoryConfig) {
        ticket.tags.push(`category:${analysis.category}`);
        ticket.tags.push(`complexity:${analysis.complexity}`);
      }

      this.tickets.set(ticketId, ticket);
      
      console.log(`Updated ticket ${ticketId} with AI analysis`);
      this.emit('ticket:analyzed', { ticket, analysis });
      
      return ticket;
      
    } catch (error) {
      console.error(`Error updating ticket ${ticketId} with analysis:`, error);
      throw error;
    }
  }

  /**
   * Assign ticket to agent/team
   */
  async assignTicket(ticketId, assignment) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    try {
      ticket.assignee = assignment.agent;
      ticket.team = assignment.team;
      ticket.status = 'assigned';
      ticket.updatedAt = new Date();
      
      // Add to timeline
      ticket.timeline.push({
        timestamp: new Date(),
        action: 'assigned',
        actor: 'routing_system',
        details: `Assigned to ${assignment.agent?.name || assignment.team} team`
      });

      this.tickets.set(ticketId, ticket);
      
      console.log(`Assigned ticket ${ticketId} to ${assignment.agent?.name || assignment.team}`);
      this.emit('ticket:assigned', { ticket, assignment });
      
      return ticket;
      
    } catch (error) {
      console.error(`Error assigning ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Set SLA deadline for ticket
   */
  async setSLADeadline(ticket) {
    const priorityConfig = this.priorityRules.get(ticket.priority);
    const categoryConfig = this.categoriesConfig.get(ticket.category);
    
    if (priorityConfig) {
      const slaMinutes = Math.min(
        priorityConfig.slaMinutes,
        categoryConfig ? categoryConfig.slaHours * 60 : Infinity
      );
      
      ticket.slaDeadline = new Date(ticket.createdAt.getTime() + slaMinutes * 60000);
      
      // Set SLA monitoring timer
      this.setSLATimer(ticket.id, slaMinutes);
      
      console.log(`SLA deadline set for ticket ${ticket.id}: ${ticket.slaDeadline.toISOString()}`);
    }
  }

  /**
   * Set SLA monitoring timer
   */
  setSLATimer(ticketId, minutes) {
    const timerId = setTimeout(() => {
      this.handleSLABreach(ticketId);
    }, minutes * 60000);
    
    this.slaTimers.set(ticketId, timerId);
  }

  /**
   * Handle SLA breach
   */
  async handleSLABreach(ticketId) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket || ticket.status === 'solved' || ticket.status === 'closed') {
      return; // Ticket already resolved
    }

    try {
      ticket.slaBreached = true;
      ticket.updatedAt = new Date();
      
      // Add to timeline
      ticket.timeline.push({
        timestamp: new Date(),
        action: 'sla_breach',
        actor: 'system',
        details: 'SLA deadline exceeded'
      });

      // Escalate ticket
      await this.escalateTicket(ticketId, 'SLA breach');
      
      this.performanceMetrics.slaBreaches++;
      
      console.log(`SLA breach for ticket ${ticketId}`);
      this.emit('ticket:sla_breach', ticket);
      
    } catch (error) {
      console.error(`Error handling SLA breach for ticket ${ticketId}:`, error);
    }
  }

  /**
   * Escalate ticket
   */
  async escalateTicket(ticketId, reason) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    try {
      // Increase priority if not already at highest
      const currentPriority = ticket.priority;
      const escalatedPriority = this.getEscalatedPriority(currentPriority);
      
      ticket.priority = escalatedPriority;
      ticket.escalated = true;
      ticket.escalationReason = reason;
      ticket.escalatedAt = new Date();
      ticket.updatedAt = new Date();
      
      // Add to timeline
      ticket.timeline.push({
        timestamp: new Date(),
        action: 'escalated',
        actor: 'system',
        details: `Escalated due to: ${reason}. Priority changed from ${currentPriority} to ${escalatedPriority}`
      });

      // Reassign to senior agent or manager
      const escalationAssignment = await this.getEscalationAssignment(ticket);
      if (escalationAssignment) {
        await this.assignTicket(ticketId, escalationAssignment);
      }

      this.tickets.set(ticketId, ticket);
      
      console.log(`Escalated ticket ${ticketId}: ${reason}`);
      this.emit('ticket:escalated', { ticket, reason });
      
      return ticket;
      
    } catch (error) {
      console.error(`Error escalating ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Get escalated priority level
   */
  getEscalatedPriority(currentPriority) {
    const escalationMap = {
      'low': 'medium',
      'medium': 'high',
      'high': 'urgent',
      'urgent': 'urgent' // Already at max
    };
    
    return escalationMap[currentPriority] || 'high';
  }

  /**
   * Add communication to ticket
   */
  async addCommunication(ticketId, communication) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    try {
      const comm = {
        id: this.generateCommunicationId(),
        timestamp: new Date(),
        type: communication.type, // 'email', 'chat', 'phone', 'internal_note'
        direction: communication.direction, // 'inbound', 'outbound'
        author: communication.author,
        recipient: communication.recipient,
        subject: communication.subject,
        body: communication.body,
        attachments: communication.attachments || [],
        isPublic: communication.isPublic !== false // Default to public
      };

      ticket.communications.push(comm);
      ticket.updatedAt = new Date();
      
      // Update status if this is a response
      if (communication.direction === 'outbound' && ticket.status === 'new') {
        ticket.status = 'open';
        ticket.firstResponseAt = new Date();
      }

      // Add to timeline
      ticket.timeline.push({
        timestamp: new Date(),
        action: 'communication_added',
        actor: communication.author.type,
        details: `${communication.type} ${communication.direction}: ${communication.subject || 'New message'}`
      });

      this.tickets.set(ticketId, ticket);
      
      console.log(`Added ${communication.type} communication to ticket ${ticketId}`);
      this.emit('ticket:communication_added', { ticket, communication: comm });
      
      return comm;
      
    } catch (error) {
      console.error(`Error adding communication to ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Resolve ticket
   */
  async resolveTicket(ticketId, resolution) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    try {
      const resolvedAt = new Date();
      const resolutionTime = resolvedAt.getTime() - ticket.createdAt.getTime();
      
      ticket.status = 'solved';
      ticket.resolvedAt = resolvedAt;
      ticket.resolutionTime = resolutionTime;
      ticket.resolution = resolution;
      ticket.updatedAt = resolvedAt;

      // Clear SLA timer
      if (this.slaTimers.has(ticketId)) {
        clearTimeout(this.slaTimers.get(ticketId));
        this.slaTimers.delete(ticketId);
      }

      // Add to timeline
      ticket.timeline.push({
        timestamp: resolvedAt,
        action: 'resolved',
        actor: resolution.resolvedBy?.type || 'agent',
        details: `Ticket resolved: ${resolution.summary}`
      });

      // Update metrics
      this.performanceMetrics.resolvedTickets++;
      this.updateAverageResolutionTime(resolutionTime);
      
      if (resolution.method === 'automated') {
        this.performanceMetrics.autoResolutions++;
        ticket.autoResolved = true;
      }

      this.tickets.set(ticketId, ticket);
      
      console.log(`Resolved ticket ${ticketId} in ${Math.round(resolutionTime / 60000)} minutes`);
      this.emit('ticket:resolved', { ticket, resolution });
      
      // Request satisfaction survey
      this.requestSatisfactionSurvey(ticket);
      
      return ticket;
      
    } catch (error) {
      console.error(`Error resolving ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId, closeReason = 'resolved') {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    try {
      ticket.status = 'closed';
      ticket.closedAt = new Date();
      ticket.closeReason = closeReason;
      ticket.updatedAt = new Date();

      // Add to timeline
      ticket.timeline.push({
        timestamp: new Date(),
        action: 'closed',
        actor: 'system',
        details: `Ticket closed: ${closeReason}`
      });

      this.tickets.set(ticketId, ticket);
      
      console.log(`Closed ticket ${ticketId}: ${closeReason}`);
      this.emit('ticket:closed', { ticket, closeReason });
      
      return ticket;
      
    } catch (error) {
      console.error(`Error closing ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Reopen ticket
   */
  async reopenTicket(ticketId, reason) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    try {
      ticket.status = 'open';
      ticket.reopenedAt = new Date();
      ticket.reopenReason = reason;
      ticket.updatedAt = new Date();

      // Reset resolution data
      ticket.resolvedAt = null;
      ticket.resolution = null;

      // Add to timeline
      ticket.timeline.push({
        timestamp: new Date(),
        action: 'reopened',
        actor: 'system',
        details: `Ticket reopened: ${reason}`
      });

      // Reset SLA if needed
      await this.setSLADeadline(ticket);

      this.tickets.set(ticketId, ticket);
      
      console.log(`Reopened ticket ${ticketId}: ${reason}`);
      this.emit('ticket:reopened', { ticket, reason });
      
      return ticket;
      
    } catch (error) {
      console.error(`Error reopening ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Search tickets
   */
  searchTickets(criteria) {
    const results = [];
    
    for (const [ticketId, ticket] of this.tickets) {
      let matches = true;
      
      // Status filter
      if (criteria.status && ticket.status !== criteria.status) {
        matches = false;
      }
      
      // Priority filter
      if (criteria.priority && ticket.priority !== criteria.priority) {
        matches = false;
      }
      
      // Category filter
      if (criteria.category && ticket.category !== criteria.category) {
        matches = false;
      }
      
      // Customer filter
      if (criteria.customerId && ticket.customer?.id !== criteria.customerId) {
        matches = false;
      }
      
      // Date range filter
      if (criteria.dateFrom && ticket.createdAt < criteria.dateFrom) {
        matches = false;
      }
      
      if (criteria.dateTo && ticket.createdAt > criteria.dateTo) {
        matches = false;
      }
      
      // Text search
      if (criteria.query) {
        const searchText = (ticket.subject + ' ' + ticket.description).toLowerCase();
        if (!searchText.includes(criteria.query.toLowerCase())) {
          matches = false;
        }
      }
      
      if (matches) {
        results.push(ticket);
      }
    }
    
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get ticket by ID
   */
  getTicket(ticketId) {
    return this.tickets.get(ticketId);
  }

  /**
   * Get tickets by status
   */
  getTicketsByStatus(status) {
    return Array.from(this.tickets.values()).filter(ticket => ticket.status === status);
  }

  /**
   * Get overdue tickets
   */
  getOverdueTickets() {
    const now = new Date();
    return Array.from(this.tickets.values()).filter(ticket => 
      ticket.slaDeadline && 
      ticket.slaDeadline < now && 
      !['solved', 'closed'].includes(ticket.status)
    );
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    const now = new Date();
    const overdueTickets = this.getOverdueTickets();
    const activeTickets = Array.from(this.tickets.values()).filter(t => 
      !['solved', 'closed'].includes(t.status)
    );

    return {
      ...this.performanceMetrics,
      activeTickets: activeTickets.length,
      overdueTickets: overdueTickets.length,
      slaComplianceRate: this.calculateSLAComplianceRate(),
      autoResolutionRate: this.performanceMetrics.totalTickets > 0 ? 
        (this.performanceMetrics.autoResolutions / this.performanceMetrics.totalTickets) * 100 : 0,
      averageResolutionTimeHours: Math.round(this.performanceMetrics.averageResolutionTime / (1000 * 60 * 60) * 100) / 100
    };
  }

  /**
   * Calculate SLA compliance rate
   */
  calculateSLAComplianceRate() {
    const resolvedTickets = Array.from(this.tickets.values()).filter(t => t.status === 'solved');
    if (resolvedTickets.length === 0) return 100;
    
    const compliantTickets = resolvedTickets.filter(t => !t.slaBreached);
    return Math.round((compliantTickets.length / resolvedTickets.length) * 100);
  }

  /**
   * Update average resolution time
   */
  updateAverageResolutionTime(newResolutionTime) {
    const totalResolved = this.performanceMetrics.resolvedTickets;
    const currentAverage = this.performanceMetrics.averageResolutionTime;
    
    this.performanceMetrics.averageResolutionTime = 
      ((currentAverage * (totalResolved - 1)) + newResolutionTime) / totalResolved;
  }

  /**
   * Request satisfaction survey
   */
  async requestSatisfactionSurvey(ticket) {
    try {
      // In a real implementation, this would send a survey email/SMS
      console.log(`Satisfaction survey requested for ticket ${ticket.id}`);
      
      this.emit('survey:requested', {
        ticketId: ticket.id,
        customer: ticket.customer,
        resolutionTime: ticket.resolutionTime
      });
      
    } catch (error) {
      console.error(`Error requesting satisfaction survey for ticket ${ticket.id}:`, error);
    }
  }

  /**
   * Record satisfaction rating
   */
  async recordSatisfactionRating(ticketId, rating, feedback = null) {
    const ticket = this.tickets.get(ticketId);
    if (!ticket) {
      throw new Error(`Ticket ${ticketId} not found`);
    }

    try {
      ticket.satisfactionRating = rating;
      ticket.satisfactionFeedback = feedback;
      ticket.satisfactionRecordedAt = new Date();
      
      // Add to timeline
      ticket.timeline.push({
        timestamp: new Date(),
        action: 'satisfaction_recorded',
        actor: 'customer',
        details: `Satisfaction rating: ${rating}/5${feedback ? ' with feedback' : ''}`
      });

      this.tickets.set(ticketId, ticket);
      
      console.log(`Satisfaction rating recorded for ticket ${ticketId}: ${rating}/5`);
      this.emit('satisfaction:recorded', { ticket, rating, feedback });
      
      return ticket;
      
    } catch (error) {
      console.error(`Error recording satisfaction rating for ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Generate ticket ID
   */
  generateTicketId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TKT-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Generate communication ID
   */
  generateCommunicationId() {
    return createHash('sha256')
      .update(`${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Get escalation assignment
   */
  async getEscalationAssignment(ticket) {
    // Mock escalation logic - in production, this would query your agent management system
    const escalationTeams = {
      'billing': { team: 'billing_escalation', agent: { id: 'mgr_billing', name: 'Billing Manager' }},
      'technical_support': { team: 'senior_technical', agent: { id: 'mgr_technical', name: 'Technical Manager' }},
      'bug_report': { team: 'engineering', agent: { id: 'lead_engineer', name: 'Lead Engineer' }}
    };
    
    return escalationTeams[ticket.category] || { team: 'general_escalation', agent: null };
  }

  /**
   * Export tickets to CSV
   */
  exportTicketsToCSV(criteria = {}) {
    const tickets = this.searchTickets(criteria);
    
    const headers = [
      'Ticket ID', 'Subject', 'Status', 'Priority', 'Category', 'Customer',
      'Created At', 'Resolved At', 'Resolution Time (hrs)', 'SLA Breach',
      'Satisfaction Rating', 'Auto Resolved'
    ];
    
    const rows = tickets.map(ticket => [
      ticket.id,
      ticket.subject,
      ticket.status,
      ticket.priority,
      ticket.category || '',
      ticket.customer?.name || ticket.customer?.email || '',
      ticket.createdAt.toISOString(),
      ticket.resolvedAt?.toISOString() || '',
      ticket.resolutionTime ? Math.round(ticket.resolutionTime / (1000 * 60 * 60) * 100) / 100 : '',
      ticket.slaBreached ? 'Yes' : 'No',
      ticket.satisfactionRating || '',
      ticket.autoResolved ? 'Yes' : 'No'
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}

export default SupportTicketManager;