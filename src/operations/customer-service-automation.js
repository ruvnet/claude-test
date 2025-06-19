/**
 * Customer Service Automation System
 * AI-powered support ticket management with intelligent routing and self-service capabilities
 */

import { OpenAI } from 'openai';
import { createZendeskClient } from '@zendesk/api';
import { IntercomClient } from '@intercom/client';
import { EventEmitter } from 'events';

export class CustomerServiceAutomation extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.zendesk = createZendeskClient(config.zendesk);
    this.intercom = new IntercomClient(config.intercom);
    this.mlModels = new Map();
    this.knowledgeBase = new Map();
    this.ticketProcessingQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the customer service automation system
   */
  async initialize() {
    console.log('Initializing Customer Service Automation System...');
    
    // Load AI models for ticket classification and sentiment analysis
    await this.loadMLModels();
    
    // Initialize knowledge base
    await this.initializeKnowledgeBase();
    
    // Set up webhooks and event listeners
    await this.setupWebhooks();
    
    // Start ticket processing queue
    this.startTicketProcessing();
    
    console.log('Customer Service Automation System initialized successfully');
  }

  /**
   * Load machine learning models for customer service automation
   */
  async loadMLModels() {
    console.log('Loading ML models for customer service...');
    
    // Ticket classification model
    this.mlModels.set('ticketClassifier', {
      categories: [
        'billing', 'technical_support', 'feature_request', 
        'bug_report', 'account_management', 'general_inquiry'
      ],
      priority: ['low', 'medium', 'high', 'urgent'],
      complexity: ['simple', 'moderate', 'complex'],
      sentiment: ['positive', 'neutral', 'negative', 'frustrated']
    });

    // SLA rules
    this.mlModels.set('slaRules', {
      urgent: { responseTime: 15, resolutionTime: 240 }, // 15 min, 4 hours
      high: { responseTime: 60, resolutionTime: 480 },   // 1 hour, 8 hours
      medium: { responseTime: 240, resolutionTime: 1440 }, // 4 hours, 24 hours
      low: { responseTime: 1440, resolutionTime: 4320 }    // 24 hours, 72 hours
    });

    console.log('ML models loaded successfully');
  }

  /**
   * Initialize knowledge base for self-service
   */
  async initializeKnowledgeBase() {
    console.log('Initializing knowledge base...');
    
    const knowledgeBaseStructure = {
      faqs: new Map(),
      articles: new Map(),
      tutorials: new Map(),
      troubleshooting: new Map(),
      productGuides: new Map()
    };

    // Sample knowledge base entries
    knowledgeBaseStructure.faqs.set('password-reset', {
      question: 'How do I reset my password?',
      answer: 'To reset your password, click "Forgot Password" on the login page and follow the instructions sent to your email.',
      category: 'account_management',
      keywords: ['password', 'reset', 'login', 'forgot'],
      popularity: 0.95,
      lastUpdated: new Date()
    });

    knowledgeBaseStructure.faqs.set('billing-inquiry', {
      question: 'How can I view my billing history?',
      answer: 'Access your billing history in Account Settings > Billing > History. You can download invoices and view payment details.',
      category: 'billing',
      keywords: ['billing', 'invoice', 'payment', 'history'],
      popularity: 0.88,
      lastUpdated: new Date()
    });

    this.knowledgeBase = knowledgeBaseStructure;
    console.log('Knowledge base initialized with sample content');
  }

  /**
   * Set up webhooks for real-time ticket processing
   */
  async setupWebhooks() {
    console.log('Setting up webhooks and event listeners...');
    
    // Zendesk webhook handler
    this.on('zendesk:ticket:created', this.handleNewTicket.bind(this));
    this.on('zendesk:ticket:updated', this.handleTicketUpdate.bind(this));
    
    // Intercom webhook handler
    this.on('intercom:conversation:created', this.handleNewConversation.bind(this));
    
    console.log('Webhooks configured successfully');
  }

  /**
   * Process new support ticket with AI-powered triage
   */
  async handleNewTicket(ticketData) {
    try {
      console.log(`Processing new ticket: ${ticketData.id}`);
      
      // Add to processing queue
      this.ticketProcessingQueue.push({
        id: ticketData.id,
        type: 'ticket',
        data: ticketData,
        timestamp: new Date()
      });

      // Emit event for monitoring
      this.emit('ticket:queued', { ticketId: ticketData.id });
      
    } catch (error) {
      console.error('Error handling new ticket:', error);
      this.emit('error', { type: 'ticket_processing', error });
    }
  }

  /**
   * Start the ticket processing queue
   */
  startTicketProcessing() {
    setInterval(async () => {
      if (!this.isProcessing && this.ticketProcessingQueue.length > 0) {
        this.isProcessing = true;
        await this.processTicketQueue();
        this.isProcessing = false;
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process tickets in the queue
   */
  async processTicketQueue() {
    while (this.ticketProcessingQueue.length > 0) {
      const ticketItem = this.ticketProcessingQueue.shift();
      await this.analyzeAndRouteTicket(ticketItem.data);
    }
  }

  /**
   * Analyze ticket content and route appropriately
   */
  async analyzeAndRouteTicket(ticket) {
    try {
      console.log(`Analyzing ticket ${ticket.id}`);
      
      // Use OpenAI to analyze ticket content
      const analysis = await this.analyzeTicketWithAI(ticket);
      
      // Check if ticket can be auto-resolved
      const autoResolution = await this.checkAutoResolution(ticket, analysis);
      
      if (autoResolution.canResolve) {
        await this.autoResolveTicket(ticket, autoResolution);
        return;
      }

      // Route to appropriate agent/team
      const routing = await this.determineRouting(analysis);
      await this.routeTicket(ticket, routing);
      
      // Set SLA timers
      await this.setSLATimers(ticket, analysis.priority);
      
      console.log(`Ticket ${ticket.id} processed and routed to ${routing.team}`);
      
    } catch (error) {
      console.error(`Error processing ticket ${ticket.id}:`, error);
      // Route to general support as fallback
      await this.routeTicket(ticket, { team: 'general', agent: null, priority: 'medium' });
    }
  }

  /**
   * Analyze ticket using OpenAI
   */
  async analyzeTicketWithAI(ticket) {
    const prompt = `
Analyze this customer support ticket and provide structured analysis:

Subject: ${ticket.subject}
Description: ${ticket.description}
Customer Tier: ${ticket.customer?.tier || 'standard'}

Please analyze and return JSON with:
1. category (billing, technical_support, feature_request, bug_report, account_management, general_inquiry)
2. priority (low, medium, high, urgent)
3. sentiment (positive, neutral, negative, frustrated)
4. complexity (simple, moderate, complex)
5. urgency_indicators (array of phrases that indicate urgency)
6. technical_keywords (array of technical terms found)
7. confidence (0-1 score for classification confidence)
8. suggested_resolution_time (estimated time in minutes)

Return only valid JSON.
`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      // Add additional analysis
      analysis.keywords = this.extractKeywords(ticket.description);
      analysis.customerHistory = await this.getCustomerHistory(ticket.customer?.id);
      
      return analysis;
      
    } catch (error) {
      console.error('Error analyzing ticket with AI:', error);
      
      // Fallback analysis
      return {
        category: 'general_inquiry',
        priority: 'medium',
        sentiment: 'neutral',
        complexity: 'moderate',
        confidence: 0.5,
        suggested_resolution_time: 240
      };
    }
  }

  /**
   * Check if ticket can be auto-resolved
   */
  async checkAutoResolution(ticket, analysis) {
    // Common auto-resolvable scenarios
    const autoResolvablePatterns = [
      {
        pattern: /password.*reset/i,
        category: 'account_management',
        solution: 'password_reset_instructions',
        confidence: 0.9
      },
      {
        pattern: /forgot.*username/i,
        category: 'account_management',
        solution: 'username_recovery_instructions',
        confidence: 0.85
      },
      {
        pattern: /billing.*question/i,
        category: 'billing',
        solution: 'billing_faq_reference',
        confidence: 0.7
      }
    ];

    for (const pattern of autoResolvablePatterns) {
      if (pattern.pattern.test(ticket.description) && 
          analysis.category === pattern.category &&
          analysis.complexity === 'simple') {
        
        return {
          canResolve: true,
          solution: pattern.solution,
          confidence: pattern.confidence,
          estimatedResolutionTime: 5 // 5 minutes
        };
      }
    }

    return { canResolve: false };
  }

  /**
   * Auto-resolve ticket with appropriate solution
   */
  async autoResolveTicket(ticket, autoResolution) {
    try {
      const solution = this.getAutoResolutionTemplate(autoResolution.solution);
      
      // Create response
      const response = {
        ticket_id: ticket.id,
        public: true,
        body: solution.body,
        author_id: this.config.botUserId
      };

      // Update ticket status
      await this.zendesk.tickets.update(ticket.id, {
        status: 'solved',
        tags: [...(ticket.tags || []), 'auto_resolved'],
        custom_fields: [
          { id: this.config.customFields.resolution_method, value: 'automated' },
          { id: this.config.customFields.resolution_time, value: autoResolution.estimatedResolutionTime }
        ]
      });

      // Add comment with solution
      await this.zendesk.tickets.comments.create(ticket.id, response);
      
      console.log(`Ticket ${ticket.id} auto-resolved with solution: ${autoResolution.solution}`);
      
      // Emit event for tracking
      this.emit('ticket:auto_resolved', {
        ticketId: ticket.id,
        solution: autoResolution.solution,
        confidence: autoResolution.confidence
      });
      
    } catch (error) {
      console.error(`Error auto-resolving ticket ${ticket.id}:`, error);
      // Fall back to normal routing
      await this.routeTicket(ticket, { team: 'general', priority: 'medium' });
    }
  }

  /**
   * Determine optimal routing for ticket
   */
  async determineRouting(analysis) {
    const routingRules = {
      billing: {
        team: 'billing',
        skills: ['billing', 'payments', 'subscriptions'],
        escalation: analysis.priority === 'urgent' ? 'billing_manager' : null
      },
      technical_support: {
        team: 'technical',
        skills: ['troubleshooting', 'api', 'integrations'],
        escalation: analysis.complexity === 'complex' ? 'senior_technical' : null
      },
      feature_request: {
        team: 'product',
        skills: ['product_knowledge', 'roadmap'],
        escalation: null
      },
      bug_report: {
        team: 'technical',
        skills: ['debugging', 'testing', 'development'],
        escalation: analysis.priority === 'urgent' ? 'engineering' : null
      },
      account_management: {
        team: 'account_management',
        skills: ['account_setup', 'user_management'],
        escalation: null
      }
    };

    const routing = routingRules[analysis.category] || {
      team: 'general',
      skills: ['general_support'],
      escalation: null
    };

    // Find best available agent
    const availableAgent = await this.findBestAgent(routing.team, routing.skills, analysis.priority);
    
    return {
      ...routing,
      agent: availableAgent,
      priority: analysis.priority,
      estimatedResolutionTime: analysis.suggested_resolution_time
    };
  }

  /**
   * Route ticket to appropriate team/agent
   */
  async routeTicket(ticket, routing) {
    try {
      const updateData = {
        assignee_id: routing.agent?.id,
        group_id: routing.team_id,
        priority: routing.priority,
        tags: [...(ticket.tags || []), `routed_to_${routing.team}`, `priority_${routing.priority}`],
        custom_fields: [
          { id: this.config.customFields.routing_method, value: 'ai_automated' },
          { id: this.config.customFields.estimated_resolution, value: routing.estimatedResolutionTime }
        ]
      };

      await this.zendesk.tickets.update(ticket.id, updateData);
      
      // Notify assigned agent
      if (routing.agent) {
        await this.notifyAgent(routing.agent, ticket, routing);
      }
      
      console.log(`Ticket ${ticket.id} routed to ${routing.team} team`);
      
    } catch (error) {
      console.error(`Error routing ticket ${ticket.id}:`, error);
    }
  }

  /**
   * Set SLA timers for ticket
   */
  async setSLATimers(ticket, priority) {
    const slaRules = this.mlModels.get('slaRules')[priority];
    
    if (slaRules) {
      const responseDeadline = new Date(Date.now() + slaRules.responseTime * 60000);
      const resolutionDeadline = new Date(Date.now() + slaRules.resolutionTime * 60000);
      
      // Schedule SLA monitoring
      setTimeout(() => {
        this.checkSLACompliance(ticket.id, 'response');
      }, slaRules.responseTime * 60000);
      
      setTimeout(() => {
        this.checkSLACompliance(ticket.id, 'resolution');
      }, slaRules.resolutionTime * 60000);
      
      console.log(`SLA timers set for ticket ${ticket.id}: Response by ${responseDeadline.toISOString()}, Resolution by ${resolutionDeadline.toISOString()}`);
    }
  }

  /**
   * Find best available agent for routing
   */
  async findBestAgent(team, requiredSkills, priority) {
    // Mock agent selection logic
    const agents = await this.getAvailableAgents(team);
    
    // Score agents based on skills, availability, and workload
    const scoredAgents = agents.map(agent => ({
      ...agent,
      score: this.calculateAgentScore(agent, requiredSkills, priority)
    }));
    
    // Return highest scoring available agent
    const bestAgent = scoredAgents
      .filter(agent => agent.status === 'available')
      .sort((a, b) => b.score - a.score)[0];
    
    return bestAgent || null;
  }

  /**
   * Calculate agent score for routing
   */
  calculateAgentScore(agent, requiredSkills, priority) {
    let score = 0;
    
    // Skill matching
    const matchingSkills = agent.skills.filter(skill => requiredSkills.includes(skill));
    score += (matchingSkills.length / requiredSkills.length) * 40;
    
    // Availability factor
    score += agent.availability * 20;
    
    // Workload factor (lower is better)
    score += (1 - agent.currentWorkload) * 20;
    
    // Experience factor
    score += agent.experienceLevel * 10;
    
    // Priority handling capability
    if (priority === 'urgent' && agent.canHandleUrgent) {
      score += 10;
    }
    
    return score;
  }

  /**
   * Get available agents for a team
   */
  async getAvailableAgents(team) {
    // Mock data - in production, this would query your agent management system
    return [
      {
        id: 'agent_001',
        name: 'Alice Johnson',
        team: 'technical',
        skills: ['troubleshooting', 'api', 'integrations'],
        status: 'available',
        availability: 0.9,
        currentWorkload: 0.3,
        experienceLevel: 0.8,
        canHandleUrgent: true
      },
      {
        id: 'agent_002',
        name: 'Bob Smith',
        team: 'billing',
        skills: ['billing', 'payments', 'subscriptions'],
        status: 'available',
        availability: 0.7,
        currentWorkload: 0.6,
        experienceLevel: 0.9,
        canHandleUrgent: true
      }
    ].filter(agent => agent.team === team);
  }

  /**
   * Handle ticket updates
   */
  async handleTicketUpdate(ticketData) {
    console.log(`Ticket ${ticketData.id} updated`);
    
    // Check if escalation is needed
    if (ticketData.status === 'open' && ticketData.updated_at) {
      await this.checkEscalationCriteria(ticketData);
    }
    
    // Update knowledge base if resolution provided
    if (ticketData.status === 'solved') {
      await this.updateKnowledgeBase(ticketData);
    }
  }

  /**
   * Handle new conversation from Intercom
   */
  async handleNewConversation(conversationData) {
    console.log(`Processing new conversation: ${conversationData.id}`);
    
    // Convert conversation to ticket format for processing
    const ticketData = this.convertConversationToTicket(conversationData);
    await this.handleNewTicket(ticketData);
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .slice(0, 10); // Top 10 keywords
  }

  /**
   * Get customer history for context
   */
  async getCustomerHistory(customerId) {
    if (!customerId) return null;
    
    try {
      // Get recent tickets from customer
      const recentTickets = await this.zendesk.search({
        query: `requester:${customerId} type:ticket`,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      
      return {
        totalTickets: recentTickets.count,
        recentIssues: recentTickets.results.slice(0, 5).map(t => ({
          subject: t.subject,
          status: t.status,
          created_at: t.created_at
        })),
        satisfactionRating: await this.getCustomerSatisfactionScore(customerId)
      };
      
    } catch (error) {
      console.error('Error getting customer history:', error);
      return null;
    }
  }

  /**
   * Get auto-resolution template
   */
  getAutoResolutionTemplate(solutionType) {
    const templates = {
      password_reset_instructions: {
        body: `Hello,

Thank you for contacting us about password reset.

To reset your password:
1. Go to our login page
2. Click "Forgot Password?"
3. Enter your email address
4. Check your email for reset instructions
5. Follow the link in the email to create a new password

If you don't receive the email within 5 minutes, please check your spam folder.

If you continue to have issues, please reply to this ticket and we'll be happy to assist you further.

Best regards,
Customer Support Team (Automated Response)`
      },
      username_recovery_instructions: {
        body: `Hello,

Thank you for contacting us about username recovery.

To recover your username:
1. Go to our login page
2. Click "Forgot Username?"
3. Enter the email address associated with your account
4. Your username will be sent to your email

If you don't remember which email you used, please reply to this ticket with any email addresses you might have used, and we'll help you locate your account.

Best regards,
Customer Support Team (Automated Response)`
      },
      billing_faq_reference: {
        body: `Hello,

Thank you for your billing inquiry.

For common billing questions, please check our FAQ section:
- View billing history: Account Settings > Billing > History
- Download invoices: Available in your billing history
- Update payment method: Account Settings > Billing > Payment Methods
- Cancel subscription: Account Settings > Subscription > Cancel

If your question isn't covered in the FAQ or you need specific assistance with your account, please reply to this ticket with more details.

Best regards,
Customer Support Team (Automated Response)`
      }
    };
    
    return templates[solutionType] || {
      body: 'Thank you for contacting us. We have received your request and will respond shortly.'
    };
  }

  /**
   * Check SLA compliance
   */
  async checkSLACompliance(ticketId, type) {
    try {
      const ticket = await this.zendesk.tickets.show(ticketId);
      
      if (type === 'response' && !ticket.first_response_at) {
        console.log(`SLA breach: Response time exceeded for ticket ${ticketId}`);
        await this.handleSLABreach(ticket, 'response');
      } else if (type === 'resolution' && ticket.status !== 'solved') {
        console.log(`SLA breach: Resolution time exceeded for ticket ${ticketId}`);
        await this.handleSLABreach(ticket, 'resolution');
      }
      
    } catch (error) {
      console.error(`Error checking SLA compliance for ticket ${ticketId}:`, error);
    }
  }

  /**
   * Handle SLA breach
   */
  async handleSLABreach(ticket, breachType) {
    // Escalate ticket
    await this.escalateTicket(ticket, `SLA ${breachType} breach`);
    
    // Notify management
    this.emit('sla:breach', {
      ticketId: ticket.id,
      breachType,
      customer: ticket.requester,
      assignee: ticket.assignee
    });
  }

  /**
   * Escalate ticket
   */
  async escalateTicket(ticket, reason) {
    try {
      const escalationData = {
        priority: this.getEscalatedPriority(ticket.priority),
        tags: [...(ticket.tags || []), 'escalated', `escalation_reason_${reason.replace(/\s+/g, '_')}`],
        custom_fields: [
          { id: this.config.customFields.escalation_reason, value: reason },
          { id: this.config.customFields.escalated_at, value: new Date().toISOString() }
        ]
      };

      await this.zendesk.tickets.update(ticket.id, escalationData);
      
      // Assign to senior agent or manager
      const escalationAgent = await this.getEscalationAgent(ticket);
      if (escalationAgent) {
        await this.zendesk.tickets.update(ticket.id, { assignee_id: escalationAgent.id });
      }
      
      console.log(`Ticket ${ticket.id} escalated: ${reason}`);
      
    } catch (error) {
      console.error(`Error escalating ticket ${ticket.id}:`, error);
    }
  }

  /**
   * Get escalated priority level
   */
  getEscalatedPriority(currentPriority) {
    const priorityEscalation = {
      'low': 'normal',
      'normal': 'high',
      'high': 'urgent',
      'urgent': 'urgent' // Already at highest
    };
    
    return priorityEscalation[currentPriority] || 'high';
  }

  /**
   * Update knowledge base from resolved tickets
   */
  async updateKnowledgeBase(resolvedTicket) {
    try {
      // Extract solution from ticket comments
      const comments = await this.zendesk.tickets.comments.list(resolvedTicket.id);
      const solutionComment = comments.find(c => c.public && c.body.toLowerCase().includes('solution'));
      
      if (solutionComment) {
        const keywords = this.extractKeywords(resolvedTicket.subject + ' ' + resolvedTicket.description);
        
        // Create or update FAQ entry
        const faqKey = keywords.join('_').toLowerCase();
        
        this.knowledgeBase.faqs.set(faqKey, {
          question: resolvedTicket.subject,
          answer: solutionComment.body,
          category: resolvedTicket.tags?.find(tag => tag.startsWith('category_'))?.replace('category_', '') || 'general',
          keywords: keywords,
          popularity: 0.1, // Start with low popularity
          lastUpdated: new Date(),
          sourceTicket: resolvedTicket.id
        });
        
        console.log(`Knowledge base updated with solution from ticket ${resolvedTicket.id}`);
      }
      
    } catch (error) {
      console.error('Error updating knowledge base:', error);
    }
  }

  /**
   * Search knowledge base for self-service
   */
  async searchKnowledgeBase(query, category = null) {
    const results = [];
    const queryKeywords = this.extractKeywords(query.toLowerCase());
    
    // Search FAQs
    for (const [key, faq] of this.knowledgeBase.faqs) {
      if (category && faq.category !== category) continue;
      
      const matchScore = this.calculateMatchScore(queryKeywords, faq.keywords);
      
      if (matchScore > 0.3) { // Minimum relevance threshold
        results.push({
          type: 'faq',
          title: faq.question,
          content: faq.answer,
          category: faq.category,
          score: matchScore * faq.popularity,
          lastUpdated: faq.lastUpdated
        });
      }
    }
    
    // Sort by relevance score
    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Calculate match score between query and content keywords
   */
  calculateMatchScore(queryKeywords, contentKeywords) {
    const matches = queryKeywords.filter(keyword => 
      contentKeywords.some(contentKeyword => 
        contentKeyword.includes(keyword) || keyword.includes(contentKeyword)
      )
    );
    
    return matches.length / Math.max(queryKeywords.length, contentKeywords.length);
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ticketsProcessed: this.metrics.ticketsProcessed || 0,
      autoResolutionRate: this.metrics.autoResolutionRate || 0,
      averageResponseTime: this.metrics.averageResponseTime || 0,
      customerSatisfactionScore: this.metrics.customerSatisfactionScore || 0,
      slaCompliance: this.metrics.slaCompliance || 0,
      knowledgeBaseUsage: this.knowledgeBase.faqs.size
    };
  }
}

export default CustomerServiceAutomation;