/**
 * Marketing Module Types
 * Defines interfaces and types for autonomous marketing automation
 */

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  objective: CampaignObjective;
  target: TargetAudience;
  budget: Budget;
  schedule: CampaignSchedule;
  channels: MarketingChannel[];
  content: CampaignContent[];
  performance: CampaignPerformance;
  createdAt: Date;
  updatedAt: Date;
  startDate: Date;
  endDate?: Date;
}

export type CampaignType = 
  | 'email'
  | 'social'
  | 'content'
  | 'paid-ads'
  | 'multi-channel'
  | 'influencer'
  | 'referral';

export type CampaignStatus = 
  | 'draft'
  | 'scheduled'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled';

export type CampaignObjective = 
  | 'awareness'
  | 'engagement'
  | 'conversion'
  | 'retention'
  | 'advocacy';

export interface TargetAudience {
  segments: AudienceSegment[];
  demographics?: Demographics;
  behaviors?: string[];
  interests?: string[];
  customAttributes?: Record<string, any>;
  estimatedSize?: number;
}

export interface AudienceSegment {
  id: string;
  name: string;
  criteria: SegmentCriteria[];
  size: number;
  lastUpdated: Date;
}

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'in' | 'not';
  value: any;
}

export interface Demographics {
  ageRange?: { min: number; max: number };
  gender?: string[];
  location?: string[];
  language?: string[];
  income?: { min: number; max: number };
}

export interface Budget {
  total: number;
  spent: number;
  currency: string;
  allocation: BudgetAllocation[];
  dailyLimit?: number;
}

export interface BudgetAllocation {
  channel: string;
  amount: number;
  percentage: number;
}

export interface CampaignSchedule {
  type: 'immediate' | 'scheduled' | 'recurring';
  startDate: Date;
  endDate?: Date;
  timezone: string;
  recurringPattern?: RecurringPattern;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  time?: string;
}

export type MarketingChannel = 
  | 'email'
  | 'sms'
  | 'push'
  | 'facebook'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'google-ads'
  | 'youtube'
  | 'blog'
  | 'website';

export interface CampaignContent {
  id: string;
  type: ContentType;
  channel: MarketingChannel;
  variant?: string; // For A/B testing
  subject?: string; // For email
  body: string;
  media?: MediaAsset[];
  cta?: CallToAction;
  personalization?: PersonalizationRule[];
  schedule?: Date;
  status: 'draft' | 'approved' | 'published';
}

export type ContentType = 
  | 'text'
  | 'image'
  | 'video'
  | 'carousel'
  | 'story'
  | 'article'
  | 'landing-page';

export interface MediaAsset {
  id: string;
  type: 'image' | 'video' | 'gif';
  url: string;
  alt?: string;
  thumbnail?: string;
  dimensions?: { width: number; height: number };
  size?: number;
}

export interface CallToAction {
  text: string;
  url: string;
  style?: CTAStyle;
  tracking?: boolean;
}

export interface CTAStyle {
  color?: string;
  backgroundColor?: string;
  borderRadius?: string;
  fontSize?: string;
}

export interface PersonalizationRule {
  field: string;
  type: 'replace' | 'conditional';
  value?: string;
  condition?: string;
  fallback?: string;
}

export interface CampaignPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roi: number;
  ctr: number; // Click-through rate
  conversionRate: number;
  avgOrderValue?: number;
  engagement?: EngagementMetrics;
}

export interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  saves: number;
  videoViews?: number;
  avgWatchTime?: number;
}

export interface ContentTemplate {
  id: string;
  name: string;
  type: ContentType;
  channel: MarketingChannel;
  structure: any; // Template structure
  variables: string[];
  preview?: string;
  category: string;
  tags: string[];
  usageCount: number;
  rating?: number;
}

export interface ContentGenerationRequest {
  type: ContentType;
  topic: string;
  tone: ContentTone;
  length: ContentLength;
  keywords?: string[];
  targetAudience?: string;
  callToAction?: string;
  constraints?: ContentConstraints;
}

export type ContentTone = 
  | 'professional'
  | 'casual'
  | 'friendly'
  | 'authoritative'
  | 'humorous'
  | 'inspirational';

export type ContentLength = 
  | 'short' // < 100 words
  | 'medium' // 100-500 words
  | 'long' // 500+ words
  | 'custom';

export interface ContentConstraints {
  maxLength?: number;
  minLength?: number;
  requiredElements?: string[];
  excludeElements?: string[];
  brandGuidelines?: string[];
}

export interface SocialMediaPost {
  id: string;
  platform: MarketingChannel;
  content: string;
  media?: MediaAsset[];
  hashtags: string[];
  mentions?: string[];
  scheduledTime?: Date;
  publishedTime?: Date;
  status: PostStatus;
  performance?: PostPerformance;
}

export type PostStatus = 
  | 'draft'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'deleted';

export interface PostPerformance {
  reach: number;
  impressions: number;
  engagement: EngagementMetrics;
  clicks: number;
  profileVisits?: number;
}

export interface EmailCampaign {
  id: string;
  campaignId: string;
  subject: string;
  preheader?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  htmlContent: string;
  textContent?: string;
  segments: string[];
  sendTime?: Date;
  status: EmailStatus;
  performance?: EmailPerformance;
}

export type EmailStatus = 
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled';

export interface EmailPerformance {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  complained: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  cto: number; // Click-to-open rate
}

export interface MarketingAutomation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  status: 'active' | 'paused' | 'draft';
  createdAt: Date;
  lastTriggered?: Date;
  timesTriggered: number;
}

export interface AutomationTrigger {
  type: TriggerType;
  event?: string;
  schedule?: CampaignSchedule;
  criteria?: any;
}

export type TriggerType = 
  | 'event'
  | 'schedule'
  | 'segment-entry'
  | 'segment-exit'
  | 'behavior'
  | 'manual';

export interface AutomationCondition {
  type: 'if' | 'wait' | 'split';
  criteria?: any;
  duration?: number; // For wait conditions
  branches?: AutomationBranch[]; // For split conditions
}

export interface AutomationBranch {
  name: string;
  criteria: any;
  actions: AutomationAction[];
}

export interface AutomationAction {
  type: ActionType;
  config: any;
  delay?: number; // Delay in minutes before executing
}

export type ActionType = 
  | 'send-email'
  | 'send-sms'
  | 'add-to-segment'
  | 'remove-from-segment'
  | 'update-attribute'
  | 'trigger-webhook'
  | 'create-task'
  | 'score-lead';

export interface MarketingEvent {
  id: string;
  timestamp: Date;
  eventType: MarketingEventType;
  entityId: string;
  entityType: 'campaign' | 'content' | 'automation' | 'lead';
  data: Record<string, any>;
  source: string;
}

export type MarketingEventType = 
  | 'campaign.created'
  | 'campaign.launched'
  | 'campaign.completed'
  | 'content.generated'
  | 'content.published'
  | 'email.sent'
  | 'email.opened'
  | 'email.clicked'
  | 'social.posted'
  | 'automation.triggered'
  | 'lead.scored';

export interface MarketingConfig {
  channels: {
    email: EmailConfig;
    social: SocialConfig;
    content: ContentConfig;
  };
  automation: {
    enabled: boolean;
    maxActionsPerDay: number;
    defaultDelay: number;
  };
  ai: {
    contentGeneration: boolean;
    personalization: boolean;
    optimization: boolean;
    model: string;
  };
  compliance: {
    gdpr: boolean;
    canSpam: boolean;
    doubleOptIn: boolean;
    retentionDays: number;
  };
}

export interface EmailConfig {
  provider: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  unsubscribeUrl: string;
  trackingDomain?: string;
}

export interface SocialConfig {
  platforms: Record<string, SocialPlatformConfig>;
  scheduler: {
    enabled: boolean;
    defaultTimes: string[];
    timezone: string;
  };
  monitoring: {
    enabled: boolean;
    keywords: string[];
    competitors: string[];
  };
}

export interface SocialPlatformConfig {
  enabled: boolean;
  credentials: any;
  postingTimes?: string[];
  hashtagStrategy: 'trending' | 'branded' | 'mixed';
}

export interface ContentConfig {
  templates: boolean;
  aiGeneration: boolean;
  approval: boolean;
  seo: {
    enabled: boolean;
    keywords: string[];
    metaDescription: boolean;
  };
}

export interface MarketingMetrics {
  campaigns: {
    total: number;
    active: number;
    scheduled: number;
    completed: number;
    avgRoi: number;
  };
  content: {
    generated: number;
    published: number;
    engagement: number;
    topPerforming: any[];
  };
  email: {
    sent: number;
    delivered: number;
    avgOpenRate: number;
    avgClickRate: number;
    subscribers: number;
  };
  social: {
    posts: number;
    followers: number;
    engagement: number;
    reach: number;
    growth: number;
  };
  automation: {
    active: number;
    triggered: number;
    completed: number;
    conversion: number;
  };
}