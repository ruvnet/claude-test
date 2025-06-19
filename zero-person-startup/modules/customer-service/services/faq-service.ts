/**
 * Autonomous FAQ Management Service
 * Manages frequently asked questions with intelligent search and auto-updating
 */

import { EventEmitter } from 'events';
import { FAQEntry, CustomerServiceConfig } from '../types.js';

export class FAQService extends EventEmitter {
  private faqEntries: Map<string, FAQEntry> = new Map();
  private searchIndex: SearchIndex;
  private config: CustomerServiceConfig['faq'];
  private queryAnalyzer: QueryAnalyzer;

  constructor(config: CustomerServiceConfig['faq']) {
    super();
    this.config = config;
    this.searchIndex = new SearchIndex();
    this.queryAnalyzer = new QueryAnalyzer();
    this.initializeDefaultFAQs();
  }

  /**
   * Initialize with common FAQ entries
   */
  private initializeDefaultFAQs(): void {
    const defaultFAQs = [
      {
        question: 'How do I reset my password?',
        answer: 'You can reset your password by clicking the "Forgot Password" link on the login page. Enter your email address and we\'ll send you a password reset link.',
        category: 'account',
        tags: ['password', 'login', 'reset', 'account']
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for enterprise accounts.',
        category: 'billing',
        tags: ['payment', 'billing', 'credit card', 'paypal']
      },
      {
        question: 'How can I track my order?',
        answer: 'You can track your order by logging into your account and navigating to "My Orders". Click on any order to see detailed tracking information.',
        category: 'orders',
        tags: ['order', 'tracking', 'delivery', 'status']
      },
      {
        question: 'What is your refund policy?',
        answer: 'We offer a 30-day money-back guarantee on all products. If you\'re not satisfied, contact our support team for a full refund.',
        category: 'billing',
        tags: ['refund', 'money back', 'guarantee', 'return']
      },
      {
        question: 'How do I cancel my subscription?',
        answer: 'You can cancel your subscription anytime from your account settings. Go to "Subscription" and click "Cancel Subscription". Your access will continue until the end of the billing period.',
        category: 'billing',
        tags: ['cancel', 'subscription', 'billing', 'unsubscribe']
      }
    ];

    defaultFAQs.forEach(faq => {
      this.createFAQEntry(faq.question, faq.answer, faq.category, faq.tags);
    });
  }

  /**
   * Create new FAQ entry
   */
  createFAQEntry(
    question: string,
    answer: string,
    category: string,
    tags: string[] = []
  ): FAQEntry {
    const id = this.generateFAQId();
    
    const entry: FAQEntry = {
      id,
      question,
      answer,
      category,
      tags: tags.length > 0 ? tags : this.extractTags(question, answer),
      viewCount: 0,
      helpfulCount: 0,
      lastUpdated: new Date(),
      relatedQuestions: []
    };

    this.faqEntries.set(id, entry);
    this.searchIndex.addEntry(entry);
    
    // Find related questions
    entry.relatedQuestions = this.findRelatedQuestions(entry);

    return entry;
  }

  /**
   * Search FAQ entries
   */
  async searchFAQ(query: string): Promise<FAQEntry[]> {
    if (!this.config.searchEnabled) {
      return [];
    }

    // Analyze query
    const analyzedQuery = await this.queryAnalyzer.analyze(query);
    
    // Search using multiple strategies
    const results = new Set<FAQEntry>();
    
    // 1. Full-text search
    const textMatches = this.searchIndex.search(query);
    textMatches.forEach(entry => results.add(entry));
    
    // 2. Tag-based search
    const tagMatches = this.searchByTags(analyzedQuery.keywords);
    tagMatches.forEach(entry => results.add(entry));
    
    // 3. Semantic search (simplified)
    const semanticMatches = this.semanticSearch(query);
    semanticMatches.forEach(entry => results.add(entry));

    // Rank results
    const rankedResults = this.rankResults(Array.from(results), query);
    
    // Track search query for analytics
    this.emit('search', {
      query,
      resultsCount: rankedResults.length,
      timestamp: new Date()
    });

    return rankedResults.slice(0, this.config.suggestionsCount);
  }

  /**
   * Record FAQ view
   */
  recordView(faqId: string): void {
    const entry = this.faqEntries.get(faqId);
    if (entry) {
      entry.viewCount++;
      
      this.emit('event', {
        eventType: 'faq.viewed',
        faqId,
        timestamp: new Date()
      });

      // Auto-update popular FAQs if enabled
      if (this.config.autoUpdate && entry.viewCount % 100 === 0) {
        this.optimizeFAQEntry(entry);
      }
    }
  }

  /**
   * Record helpful vote
   */
  recordHelpful(faqId: string, helpful: boolean): void {
    const entry = this.faqEntries.get(faqId);
    if (entry) {
      if (helpful) {
        entry.helpfulCount++;
      }
      
      // Calculate helpful rate
      const helpfulRate = entry.helpfulCount / entry.viewCount;
      
      // If helpful rate is low, flag for review
      if (helpfulRate < 0.5 && entry.viewCount > 50) {
        this.emit('review-needed', {
          faqId,
          helpfulRate,
          reason: 'low_helpful_rate'
        });
      }
    }
  }

  /**
   * Update FAQ entry
   */
  updateFAQEntry(faqId: string, updates: Partial<FAQEntry>): FAQEntry | null {
    const entry = this.faqEntries.get(faqId);
    if (!entry) {
      return null;
    }

    Object.assign(entry, updates, {
      lastUpdated: new Date()
    });

    // Update search index
    this.searchIndex.updateEntry(entry);
    
    // Update related questions
    entry.relatedQuestions = this.findRelatedQuestions(entry);

    return entry;
  }

  /**
   * Search by tags
   */
  private searchByTags(tags: string[]): FAQEntry[] {
    const results: FAQEntry[] = [];
    
    for (const entry of this.faqEntries.values()) {
      const matchCount = tags.filter(tag => 
        entry.tags.some(entryTag => entryTag.includes(tag))
      ).length;
      
      if (matchCount > 0) {
        results.push(entry);
      }
    }

    return results;
  }

  /**
   * Semantic search (simplified implementation)
   */
  private semanticSearch(query: string): FAQEntry[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    const results: Array<{ entry: FAQEntry; score: number }> = [];

    for (const entry of this.faqEntries.values()) {
      const entryText = `${entry.question} ${entry.answer}`.toLowerCase();
      let score = 0;

      // Calculate word overlap
      queryWords.forEach(word => {
        if (entryText.includes(word)) {
          score += 1;
        }
        // Partial matches
        if (entryText.includes(word.substring(0, Math.min(word.length, 4)))) {
          score += 0.5;
        }
      });

      if (score > 0) {
        results.push({ entry, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .map(result => result.entry);
  }

  /**
   * Rank search results
   */
  private rankResults(results: FAQEntry[], query: string): FAQEntry[] {
    return results.sort((a, b) => {
      // Calculate relevance scores
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate relevance score for ranking
   */
  private calculateRelevanceScore(entry: FAQEntry, query: string): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const questionLower = entry.question.toLowerCase();
    
    // Exact match in question
    if (questionLower.includes(queryLower)) {
      score += 10;
    }
    
    // Word matches in question
    const queryWords = queryLower.split(/\s+/);
    queryWords.forEach(word => {
      if (questionLower.includes(word)) {
        score += 2;
      }
    });
    
    // Popularity factor
    score += Math.log(entry.viewCount + 1) * 0.5;
    
    // Helpfulness factor
    if (entry.viewCount > 0) {
      score += (entry.helpfulCount / entry.viewCount) * 5;
    }
    
    // Recency factor
    const daysSinceUpdate = (Date.now() - entry.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    score -= daysSinceUpdate * 0.01;
    
    return score;
  }

  /**
   * Find related questions
   */
  private findRelatedQuestions(entry: FAQEntry): string[] {
    const related: Array<{ id: string; score: number }> = [];
    
    for (const [id, otherEntry] of this.faqEntries) {
      if (id === entry.id) continue;
      
      // Calculate similarity based on tags and category
      let score = 0;
      
      // Same category
      if (otherEntry.category === entry.category) {
        score += 3;
      }
      
      // Common tags
      const commonTags = entry.tags.filter(tag => otherEntry.tags.includes(tag));
      score += commonTags.length * 2;
      
      if (score > 0) {
        related.push({ id, score });
      }
    }
    
    return related
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.id);
  }

  /**
   * Optimize FAQ entry based on usage patterns
   */
  private optimizeFAQEntry(entry: FAQEntry): void {
    // Analyze common search queries that led to this FAQ
    // Suggest improvements to question wording or answer content
    
    this.emit('optimization-suggestion', {
      faqId: entry.id,
      currentQuestion: entry.question,
      suggestions: [
        'Consider adding more specific keywords to improve searchability',
        'Break down complex answers into bullet points for better readability'
      ]
    });
  }

  /**
   * Extract tags from content
   */
  private extractTags(question: string, answer: string): string[] {
    const text = `${question} ${answer}`.toLowerCase();
    const tags: string[] = [];
    
    // Extract nouns and important terms
    const words = text.split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['what', 'when', 'where', 'how', 'why', 'the', 'and', 'for'].includes(word));
    
    // Add unique words as tags
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Get FAQ by ID
   */
  getFAQEntry(id: string): FAQEntry | undefined {
    return this.faqEntries.get(id);
  }

  /**
   * Get FAQs by category
   */
  getFAQsByCategory(category: string): FAQEntry[] {
    return Array.from(this.faqEntries.values())
      .filter(entry => entry.category === category);
  }

  /**
   * Get popular FAQs
   */
  getPopularFAQs(limit: number = 10): FAQEntry[] {
    return Array.from(this.faqEntries.values())
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit);
  }

  /**
   * Get FAQ metrics
   */
  getMetrics(): any {
    const entries = Array.from(this.faqEntries.values());
    const totalViews = entries.reduce((sum, entry) => sum + entry.viewCount, 0);
    const totalHelpful = entries.reduce((sum, entry) => sum + entry.helpfulCount, 0);
    
    return {
      totalEntries: entries.length,
      totalViews,
      totalHelpful,
      averageHelpfulRate: totalViews > 0 ? totalHelpful / totalViews : 0,
      categoryCounts: this.getCategoryCounts(),
      popularQuestions: this.getPopularFAQs(5)
    };
  }

  /**
   * Get category counts
   */
  private getCategoryCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const entry of this.faqEntries.values()) {
      counts[entry.category] = (counts[entry.category] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Generate unique FAQ ID
   */
  private generateFAQId(): string {
    return `FAQ_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Simple search index for FAQ entries
 */
class SearchIndex {
  private index: Map<string, Set<FAQEntry>> = new Map();

  addEntry(entry: FAQEntry): void {
    // Index by words
    const words = this.tokenize(`${entry.question} ${entry.answer}`);
    
    words.forEach(word => {
      if (!this.index.has(word)) {
        this.index.set(word, new Set());
      }
      this.index.get(word)!.add(entry);
    });
  }

  updateEntry(entry: FAQEntry): void {
    // Remove old index entries
    for (const [word, entries] of this.index) {
      entries.delete(entry);
      if (entries.size === 0) {
        this.index.delete(word);
      }
    }
    
    // Re-index
    this.addEntry(entry);
  }

  search(query: string): FAQEntry[] {
    const words = this.tokenize(query);
    const resultSets: Set<FAQEntry>[] = [];
    
    words.forEach(word => {
      if (this.index.has(word)) {
        resultSets.push(this.index.get(word)!);
      }
    });
    
    if (resultSets.length === 0) {
      return [];
    }
    
    // Find entries that appear in all result sets (AND operation)
    const intersection = resultSets.reduce((acc, set) => {
      return new Set([...acc].filter(x => set.has(x)));
    });
    
    return Array.from(intersection);
  }

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^a-z0-9]/g, ''));
  }
}

/**
 * Query analyzer for understanding search intent
 */
class QueryAnalyzer {
  async analyze(query: string): Promise<{ keywords: string[]; intent?: string }> {
    const keywords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Detect intent based on question words
    let intent: string | undefined;
    
    if (query.includes('how')) intent = 'how-to';
    else if (query.includes('what')) intent = 'definition';
    else if (query.includes('when')) intent = 'timing';
    else if (query.includes('why')) intent = 'explanation';
    else if (query.includes('where')) intent = 'location';
    
    return { keywords, intent };
  }
}