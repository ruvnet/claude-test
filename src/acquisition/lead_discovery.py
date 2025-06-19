#!/usr/bin/env python3
"""
Automated Lead Discovery System
Customer Acquisition Automation - Lead Generation Pipeline
"""

import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import json
import time
import random
from urllib.parse import urljoin, urlparse
import pandas as pd
from bs4 import BeautifulSoup
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class Lead:
    """Lead data structure"""
    name: str
    company: str
    title: str
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    phone: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    location: Optional[str] = None
    score: float = 0.0
    source: str = "unknown"
    discovered_at: datetime = None
    enriched_data: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.discovered_at is None:
            self.discovered_at = datetime.utcnow()
        if self.enriched_data is None:
            self.enriched_data = {}

class LinkedInLeadDiscovery:
    """LinkedIn Sales Navigator API integration for lead discovery"""
    
    def __init__(self, api_key: str, rate_limit_requests: int = 100):
        self.api_key = api_key
        self.rate_limit_requests = rate_limit_requests
        self.session = self._create_session()
        self.last_request_time = 0
        
    def _create_session(self) -> requests.Session:
        """Create session with retry strategy"""
        session = requests.Session()
        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "OPTIONS"],
            backoff_factor=1
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        return session
    
    def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        min_interval = 60 / self.rate_limit_requests  # requests per minute
        
        if time_since_last_request < min_interval:
            sleep_time = min_interval - time_since_last_request
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    async def search_prospects(self, 
                             keywords: List[str],
                             location: str = None,
                             industry: str = None,
                             company_size: str = None,
                             seniority: str = None,
                             limit: int = 100) -> List[Lead]:
        """Search for prospects using LinkedIn Sales Navigator"""
        leads = []
        
        try:
            # Mock implementation - replace with actual LinkedIn API calls
            search_params = {
                'keywords': ' '.join(keywords),
                'location': location,
                'industry': industry,
                'company_size': company_size,
                'seniority': seniority,
                'limit': limit
            }
            
            logger.info(f"Searching LinkedIn prospects with params: {search_params}")
            
            # Simulate API response
            mock_leads = self._generate_mock_linkedin_leads(limit)
            for mock_lead in mock_leads:
                lead = Lead(
                    name=mock_lead['name'],
                    company=mock_lead['company'],
                    title=mock_lead['title'],
                    linkedin_url=mock_lead['linkedin_url'],
                    industry=mock_lead['industry'],
                    location=mock_lead['location'],
                    source="linkedin_sales_navigator",
                    enriched_data=mock_lead
                )
                leads.append(lead)
                
            logger.info(f"Discovered {len(leads)} LinkedIn prospects")
            
        except Exception as e:
            logger.error(f"Error searching LinkedIn prospects: {e}")
            
        return leads
    
    def _generate_mock_linkedin_leads(self, count: int) -> List[Dict]:
        """Generate mock LinkedIn leads for development"""
        mock_leads = []
        titles = ["CEO", "CTO", "VP Marketing", "Head of Sales", "Founder", "Director"]
        companies = ["TechCorp Inc", "InnovateLLC", "StartupXYZ", "Enterprise Solutions", "Digital Dynamics"]
        industries = ["Technology", "Healthcare", "Finance", "Manufacturing", "Retail"]
        locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA", "Boston, MA"]
        
        for i in range(count):
            mock_lead = {
                'name': f"John Prospect {i+1}",
                'company': random.choice(companies),
                'title': random.choice(titles),
                'linkedin_url': f"https://linkedin.com/in/prospect{i+1}",
                'industry': random.choice(industries),
                'location': random.choice(locations),
                'company_size': random.choice(["1-10", "11-50", "51-200", "201-500", "500+"]),
                'connection_degree': random.choice(["1st", "2nd", "3rd"])
            }
            mock_leads.append(mock_lead)
            
        return mock_leads

class WebScrapingEngine:
    """Web scraping engine for prospect discovery"""
    
    def __init__(self, proxy_rotation: bool = True):
        self.proxy_rotation = proxy_rotation
        self.proxies = self._get_proxy_list() if proxy_rotation else []
        self.session = self._create_session()
        
    def _get_proxy_list(self) -> List[str]:
        """Get list of proxies for rotation"""
        # Mock proxy list - replace with actual proxy service
        return [
            "http://proxy1:8080",
            "http://proxy2:8080", 
            "http://proxy3:8080"
        ]
    
    def _create_session(self) -> requests.Session:
        """Create web scraping session with headers"""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        return session
    
    async def scrape_directory(self, directory_url: str, target_industry: str) -> List[Lead]:
        """Scrape industry directories for prospects"""
        leads = []
        
        try:
            # Add random delay to avoid detection
            await asyncio.sleep(random.uniform(1, 3))
            
            # Use random proxy if available
            proxy = random.choice(self.proxies) if self.proxies else None
            proxies = {'http': proxy, 'https': proxy} if proxy else None
            
            response = self.session.get(directory_url, proxies=proxies, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Mock scraping logic - customize based on target directory structure
            company_listings = soup.find_all('div', class_='company-listing')
            
            for listing in company_listings[:50]:  # Limit to 50 per directory
                try:
                    name = listing.find('h3', class_='company-name')
                    contact = listing.find('div', class_='contact-info')
                    
                    if name and contact:
                        lead = Lead(
                            name=contact.get_text().strip() if contact else "Unknown",
                            company=name.get_text().strip(),
                            title="Decision Maker",
                            industry=target_industry,
                            source=f"directory_scraping_{urlparse(directory_url).netloc}",
                            enriched_data={'directory_url': directory_url}
                        )
                        leads.append(lead)
                        
                except Exception as e:
                    logger.warning(f"Error parsing listing: {e}")
                    continue
                    
            logger.info(f"Scraped {len(leads)} leads from directory: {directory_url}")
            
        except Exception as e:
            logger.error(f"Error scraping directory {directory_url}: {e}")
            
        return leads
    
    async def analyze_competitor_customers(self, competitor_domains: List[str]) -> List[Lead]:
        """Analyze competitor customer base"""
        leads = []
        
        for domain in competitor_domains:
            try:
                # Scrape competitor customer testimonials, case studies, etc.
                customer_page_urls = [
                    f"https://{domain}/customers",
                    f"https://{domain}/case-studies",
                    f"https://{domain}/testimonials",
                    f"https://{domain}/success-stories"
                ]
                
                for url in customer_page_urls:
                    try:
                        response = self.session.get(url, timeout=30)
                        if response.status_code == 200:
                            soup = BeautifulSoup(response.content, 'html.parser')
                            
                            # Extract customer information
                            customer_mentions = soup.find_all(['h3', 'h4', 'strong'], 
                                                            string=lambda text: text and 
                                                            any(keyword in text.lower() for keyword in 
                                                                ['ceo', 'cto', 'director', 'manager', 'head']))
                            
                            for mention in customer_mentions[:10]:
                                try:
                                    parent = mention.find_parent(['div', 'section', 'article'])
                                    if parent:
                                        company_text = parent.get_text()
                                        # Extract company name and title
                                        lines = [line.strip() for line in company_text.split('\n') if line.strip()]
                                        
                                        if len(lines) >= 2:
                                            lead = Lead(
                                                name=lines[0],
                                                company=lines[1] if len(lines) > 1 else "Unknown",
                                                title="Decision Maker",
                                                source=f"competitor_analysis_{domain}",
                                                enriched_data={'competitor_domain': domain, 'source_url': url}
                                            )
                                            leads.append(lead)
                                            
                                except Exception as e:
                                    logger.warning(f"Error parsing customer mention: {e}")
                                    continue
                                    
                    except Exception as e:
                        logger.warning(f"Error accessing {url}: {e}")
                        continue
                        
            except Exception as e:
                logger.error(f"Error analyzing competitor {domain}: {e}")
                continue
                
        logger.info(f"Discovered {len(leads)} leads from competitor analysis")
        return leads

class SocialMediaListener:
    """Social media listening for buying intent signals"""
    
    def __init__(self, platforms: List[str] = None):
        self.platforms = platforms or ['twitter', 'linkedin', 'reddit']
        self.buying_intent_keywords = [
            'looking for', 'need help with', 'seeking solution',
            'comparing options', 'budget approved', 'ready to buy',
            'evaluate vendors', 'procurement process'
        ]
    
    async def monitor_buying_signals(self, industry_keywords: List[str]) -> List[Lead]:
        """Monitor social media for buying intent signals"""
        leads = []
        
        try:
            # Mock social media monitoring - replace with actual API integrations
            mock_mentions = self._generate_mock_social_mentions(industry_keywords)
            
            for mention in mock_mentions:
                # Analyze sentiment and buying intent
                intent_score = self._calculate_buying_intent(mention['content'])
                
                if intent_score > 0.7:  # High buying intent threshold
                    lead = Lead(
                        name=mention['author'],
                        company=mention.get('company', 'Unknown'),
                        title=mention.get('title', 'Unknown'),
                        source=f"social_listening_{mention['platform']}",
                        score=intent_score,
                        enriched_data={
                            'social_content': mention['content'],
                            'platform': mention['platform'],
                            'engagement': mention['engagement'],
                            'intent_keywords': mention['intent_keywords']
                        }
                    )
                    leads.append(lead)
                    
            logger.info(f"Identified {len(leads)} high-intent leads from social listening")
            
        except Exception as e:
            logger.error(f"Error in social media listening: {e}")
            
        return leads
    
    def _generate_mock_social_mentions(self, keywords: List[str]) -> List[Dict]:
        """Generate mock social media mentions"""
        mentions = []
        platforms = ['twitter', 'linkedin', 'reddit']
        
        for i in range(20):
            mention = {
                'author': f"User{i+1}",
                'company': f"Company{i+1}",
                'title': random.choice(['CEO', 'CTO', 'VP', 'Director']),
                'content': f"We're looking for a solution to help with {random.choice(keywords)}. Budget is approved and ready to move forward.",
                'platform': random.choice(platforms),
                'engagement': random.randint(10, 100),
                'intent_keywords': ['looking for', 'budget approved', 'ready to move']
            }
            mentions.append(mention)
            
        return mentions
    
    def _calculate_buying_intent(self, content: str) -> float:
        """Calculate buying intent score from content"""
        intent_score = 0.0
        content_lower = content.lower()
        
        # Check for buying intent keywords
        for keyword in self.buying_intent_keywords:
            if keyword in content_lower:
                intent_score += 0.2
                
        # Check for urgency indicators
        urgency_keywords = ['urgent', 'asap', 'immediately', 'quickly', 'soon']
        for keyword in urgency_keywords:
            if keyword in content_lower:
                intent_score += 0.1
                
        # Check for budget indicators
        budget_keywords = ['budget', 'funding', 'approved', 'allocated', 'investment']
        for keyword in budget_keywords:
            if keyword in content_lower:
                intent_score += 0.15
                
        return min(intent_score, 1.0)  # Cap at 1.0

class LeadDiscoveryOrchestrator:
    """Main orchestrator for lead discovery pipeline"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.linkedin_discovery = LinkedInLeadDiscovery(
            api_key=config.get('linkedin_api_key', 'mock_key')
        )
        self.web_scraper = WebScrapingEngine(
            proxy_rotation=config.get('use_proxies', True)
        )
        self.social_listener = SocialMediaListener(
            platforms=config.get('social_platforms', ['twitter', 'linkedin'])
        )
        
    async def discover_leads(self, 
                           target_keywords: List[str],
                           target_industry: str,
                           target_location: str = None,
                           competitor_domains: List[str] = None) -> List[Lead]:
        """Main lead discovery workflow"""
        all_leads = []
        
        try:
            logger.info("Starting comprehensive lead discovery...")
            
            # 1. LinkedIn prospect search
            logger.info("Searching LinkedIn prospects...")
            linkedin_leads = await self.linkedin_discovery.search_prospects(
                keywords=target_keywords,
                location=target_location,
                industry=target_industry
            )
            all_leads.extend(linkedin_leads)
            
            # 2. Web scraping from directories
            logger.info("Scraping industry directories...")
            directory_urls = self.config.get('directory_urls', [])
            for directory_url in directory_urls:
                directory_leads = await self.web_scraper.scrape_directory(
                    directory_url, target_industry
                )
                all_leads.extend(directory_leads)
                
            # 3. Competitor customer analysis
            if competitor_domains:
                logger.info("Analyzing competitor customers...")
                competitor_leads = await self.web_scraper.analyze_competitor_customers(
                    competitor_domains
                )
                all_leads.extend(competitor_leads)
                
            # 4. Social media listening
            logger.info("Monitoring social media for buying signals...")
            social_leads = await self.social_listener.monitor_buying_signals(
                target_keywords
            )
            all_leads.extend(social_leads)
            
            # Remove duplicates based on email/linkedin_url
            unique_leads = self._deduplicate_leads(all_leads)
            
            logger.info(f"Discovery complete: {len(unique_leads)} unique leads found")
            
            return unique_leads
            
        except Exception as e:
            logger.error(f"Error in lead discovery orchestration: {e}")
            return []
    
    def _deduplicate_leads(self, leads: List[Lead]) -> List[Lead]:
        """Remove duplicate leads"""
        seen = set()
        unique_leads = []
        
        for lead in leads:
            # Create unique identifier
            identifier = (lead.email or lead.linkedin_url or f"{lead.name}_{lead.company}").lower()
            
            if identifier not in seen:
                seen.add(identifier)
                unique_leads.append(lead)
                
        return unique_leads
    
    def export_leads(self, leads: List[Lead], output_format: str = 'json') -> str:
        """Export leads to specified format"""
        if output_format == 'json':
            leads_data = [asdict(lead) for lead in leads]
            # Convert datetime objects to strings
            for lead_data in leads_data:
                if 'discovered_at' in lead_data and lead_data['discovered_at']:
                    lead_data['discovered_at'] = lead_data['discovered_at'].isoformat()
            return json.dumps(leads_data, indent=2)
            
        elif output_format == 'csv':
            leads_data = []
            for lead in leads:
                lead_dict = asdict(lead)
                lead_dict['discovered_at'] = lead_dict['discovered_at'].isoformat() if lead_dict['discovered_at'] else ''
                lead_dict['enriched_data'] = json.dumps(lead_dict['enriched_data']) if lead_dict['enriched_data'] else ''
                leads_data.append(lead_dict)
                
            df = pd.DataFrame(leads_data)
            return df.to_csv(index=False)
            
        else:
            raise ValueError(f"Unsupported output format: {output_format}")

# Example usage and configuration
async def main():
    """Example usage of the lead discovery system"""
    config = {
        'linkedin_api_key': 'your_linkedin_api_key',
        'use_proxies': True,
        'social_platforms': ['twitter', 'linkedin', 'reddit'],
        'directory_urls': [
            'https://example-directory.com/companies',
            'https://another-directory.com/businesses'
        ]
    }
    
    orchestrator = LeadDiscoveryOrchestrator(config)
    
    # Discover leads
    leads = await orchestrator.discover_leads(
        target_keywords=['SaaS', 'software', 'automation'],
        target_industry='Technology',
        target_location='San Francisco Bay Area',
        competitor_domains=['competitor1.com', 'competitor2.com']
    )
    
    # Export results
    json_output = orchestrator.export_leads(leads, 'json')
    print(f"Discovered {len(leads)} leads")
    print(json_output[:500] + "..." if len(json_output) > 500 else json_output)

if __name__ == "__main__":
    asyncio.run(main())