/**
 * Customer Service Module Types
 * Defines interfaces and types for the autonomous customer service system
 */

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  history: CustomerInteraction[];
  preferences: CustomerPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPreferences {
  language: string;
  communicationChannel: 'email' | 'chat' | 'phone' | 'sms';
  notificationSettings: NotificationSettings;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  frequency: 'realtime' | 'daily' | 'weekly';
}

export interface CustomerInteraction {
  id: string;
  timestamp: Date;
  type: 'ticket' | 'chat' | 'email' | 'phone' | 'faq';
  channel: string;
  subject?: string;
  content: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  resolved: boolean;
  resolutionTime?: number;
  agentId?: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  tags: string[];
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  interactions: TicketInteraction[];
  satisfaction?: number;
}

export type TicketStatus = 'open' | 'in-progress' | 'waiting-customer' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TicketInteraction {
  id: string;
  timestamp: Date;
  from: 'customer' | 'agent' | 'system';
  message: string;
  attachments?: string[];
}

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  viewCount: number;
  helpfulCount: number;
  lastUpdated: Date;
  relatedQuestions?: string[];
}

export interface ChatbotContext {
  sessionId: string;
  customerId?: string;
  conversationHistory: ChatMessage[];
  currentIntent?: string;
  extractedEntities?: Record<string, any>;
  sentiment: 'positive' | 'neutral' | 'negative';
  language: string;
}

export interface ChatMessage {
  id: string;
  timestamp: Date;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface CustomerServiceEvent {
  id: string;
  timestamp: Date;
  eventType: CustomerServiceEventType;
  customerId?: string;
  ticketId?: string;
  data: Record<string, any>;
  source: string;
}

export type CustomerServiceEventType = 
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.resolved'
  | 'ticket.closed'
  | 'chat.started'
  | 'chat.ended'
  | 'faq.viewed'
  | 'customer.created'
  | 'customer.updated'
  | 'satisfaction.submitted';

export interface CustomerServiceConfig {
  chatbot: {
    enabled: boolean;
    welcomeMessage: string;
    fallbackMessage: string;
    maxIdleTime: number;
    transferThreshold: number;
  };
  ticketing: {
    autoAssignment: boolean;
    slaSettings: SLASettings;
    categorization: {
      enabled: boolean;
      categories: string[];
    };
  };
  faq: {
    searchEnabled: boolean;
    suggestionsCount: number;
    autoUpdate: boolean;
  };
}

export interface SLASettings {
  responseTime: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  resolutionTime: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface CustomerServiceMetrics {
  tickets: {
    total: number;
    open: number;
    resolved: number;
    averageResolutionTime: number;
    satisfactionScore: number;
  };
  chat: {
    totalSessions: number;
    averageDuration: number;
    transferRate: number;
    resolutionRate: number;
  };
  faq: {
    totalViews: number;
    searchQueries: number;
    helpfulRate: number;
    topQuestions: FAQEntry[];
  };
}