-- Seed data for testing the Zero-Person Startup Platform

-- Insert test organizations
INSERT INTO organizations (id, name, slug, description, website) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'TechVentures Inc', 'techventures', 'A cutting-edge technology startup accelerator', 'https://techventures.example.com'),
('550e8400-e29b-41d4-a716-446655440002', 'Innovation Labs', 'innovationlabs', 'Building the future of AI-powered businesses', 'https://innovationlabs.example.com');

-- Insert test users
INSERT INTO users (id, email, full_name) VALUES
('550e8400-e29b-41d4-a716-446655440101', 'john@techventures.com', 'John Doe'),
('550e8400-e29b-41d4-a716-446655440102', 'jane@techventures.com', 'Jane Smith'),
('550e8400-e29b-41d4-a716-446655440103', 'alice@innovationlabs.com', 'Alice Johnson');

-- Link users to organizations
INSERT INTO organization_members (organization_id, user_id, role) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440101', 'owner'),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440102', 'admin'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440103', 'owner');

-- Insert test startups
INSERT INTO startups (id, organization_id, name, description, vision, mission, industry, lifecycle_stage, created_by) VALUES
(
  '550e8400-e29b-41d4-a716-446655440201',
  '550e8400-e29b-41d4-a716-446655440001',
  'CloudSync Pro',
  'Enterprise cloud synchronization and collaboration platform',
  'To become the leading platform for seamless cloud integration across all enterprise systems',
  'Empowering businesses with unified cloud experiences that boost productivity and collaboration',
  'Enterprise Software',
  'mvp',
  '550e8400-e29b-41d4-a716-446655440101'
),
(
  '550e8400-e29b-41d4-a716-446655440202',
  '550e8400-e29b-41d4-a716-446655440001',
  'HealthTrack AI',
  'AI-powered personal health monitoring and prediction system',
  'Transform healthcare through predictive AI that prevents illness before it occurs',
  'Making preventive healthcare accessible and personalized for everyone',
  'HealthTech',
  'validation',
  '550e8400-e29b-41d4-a716-446655440102'
),
(
  '550e8400-e29b-41d4-a716-446655440203',
  '550e8400-e29b-41d4-a716-446655440002',
  'EcoMarket',
  'Sustainable products marketplace with carbon tracking',
  'Create a world where every purchase contributes to environmental sustainability',
  'Connecting conscious consumers with verified sustainable products and tracking their positive impact',
  'E-commerce',
  'idea',
  '550e8400-e29b-41d4-a716-446655440103'
);

-- The AI agents will be automatically created by the trigger

-- Insert some initial lifecycle tasks for the startups
INSERT INTO lifecycle_tasks (startup_id, lifecycle_stage, title, description, category, priority, status) VALUES
-- CloudSync Pro (MVP stage)
('550e8400-e29b-41d4-a716-446655440201', 'mvp', 'Complete API Documentation', 'Create comprehensive API documentation for developers', 'development', 'high', 'in_progress'),
('550e8400-e29b-41d4-a716-446655440201', 'mvp', 'Setup User Analytics', 'Implement Mixpanel or Amplitude for user behavior tracking', 'product', 'high', 'pending'),
('550e8400-e29b-41d4-a716-446655440201', 'mvp', 'Launch Beta Program', 'Recruit and onboard 50 beta users', 'marketing', 'critical', 'pending'),
('550e8400-e29b-41d4-a716-446655440201', 'mvp', 'Security Audit', 'Conduct security audit of the platform', 'development', 'high', 'pending'),

-- HealthTrack AI (Validation stage)
('550e8400-e29b-41d4-a716-446655440202', 'validation', 'Regulatory Compliance Research', 'Research HIPAA and medical device regulations', 'legal', 'critical', 'in_progress'),
('550e8400-e29b-41d4-a716-446655440202', 'validation', 'User Interview Campaign', 'Interview 30 potential users about health tracking needs', 'validation', 'high', 'pending'),
('550e8400-e29b-41d4-a716-446655440202', 'validation', 'Build Landing Page', 'Create landing page with email capture', 'marketing', 'medium', 'completed'),
('550e8400-e29b-41d4-a716-446655440202', 'validation', 'Competitor Analysis', 'Analyze top 10 health tracking apps', 'market', 'medium', 'pending'),

-- EcoMarket (Idea stage)
('550e8400-e29b-41d4-a716-446655440203', 'idea', 'Market Research', 'Research sustainable product market size and trends', 'market', 'high', 'pending'),
('550e8400-e29b-41d4-a716-446655440203', 'idea', 'Define Success Metrics', 'Establish KPIs for marketplace success', 'business', 'high', 'pending'),
('550e8400-e29b-41d4-a716-446655440203', 'idea', 'Supplier Outreach Plan', 'Create strategy for onboarding sustainable suppliers', 'business', 'medium', 'pending');

-- Add some checklist items to tasks
UPDATE lifecycle_tasks 
SET checklist = '[
  {"id": "1", "item": "Review existing API docs", "completed": true},
  {"id": "2", "item": "Document all endpoints", "completed": true},
  {"id": "3", "item": "Add code examples", "completed": false},
  {"id": "4", "item": "Create SDK guides", "completed": false}
]'::jsonb
WHERE title = 'Complete API Documentation';

UPDATE lifecycle_tasks 
SET checklist = '[
  {"id": "1", "item": "Research HIPAA requirements", "completed": true},
  {"id": "2", "item": "Consult healthcare lawyer", "completed": false},
  {"id": "3", "item": "Document compliance needs", "completed": false},
  {"id": "4", "item": "Create compliance roadmap", "completed": false}
]'::jsonb
WHERE title = 'Regulatory Compliance Research';

-- Insert some test events
INSERT INTO events (organization_id, startup_id, user_id, event_type, title, description) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440101', 'milestone_reached', 'MVP Development Started', 'CloudSync Pro has entered the MVP development phase'),
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440102', 'task_completed', 'Landing Page Launched', 'HealthTrack AI landing page is now live and collecting signups'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440103', 'user_action', 'Startup Created', 'EcoMarket startup has been created and initialized');

-- Insert sample metrics for startups
UPDATE startups 
SET metrics = '{
  "mrr": 0,
  "users": 0,
  "conversion_rate": 0,
  "churn_rate": 0,
  "runway_months": 18,
  "burn_rate": 15000
}'::jsonb,
financials = '{
  "revenue": 0,
  "expenses": 15000,
  "funding_raised": 250000,
  "valuation": 1000000
}'::jsonb
WHERE id = '550e8400-e29b-41d4-a716-446655440201';

UPDATE startups 
SET metrics = '{
  "signups": 145,
  "survey_responses": 12,
  "interest_score": 8.5,
  "runway_months": 12
}'::jsonb,
financials = '{
  "revenue": 0,
  "expenses": 5000,
  "funding_raised": 50000,
  "valuation": 500000
}'::jsonb
WHERE id = '550e8400-e29b-41d4-a716-446655440202';

-- Assign some tasks to agents (the agents should have been created by triggers)
UPDATE lifecycle_tasks lt
SET assigned_agent_id = (
  SELECT id FROM ai_agents 
  WHERE startup_id = lt.startup_id 
  AND agent_type = 'cto'
  LIMIT 1
)
WHERE lt.title IN ('Complete API Documentation', 'Security Audit');

UPDATE lifecycle_tasks lt
SET assigned_agent_id = (
  SELECT id FROM ai_agents 
  WHERE startup_id = lt.startup_id 
  AND agent_type = 'product'
  LIMIT 1
)
WHERE lt.title IN ('Setup User Analytics', 'User Interview Campaign');

UPDATE lifecycle_tasks lt
SET assigned_agent_id = (
  SELECT id FROM ai_agents 
  WHERE startup_id = lt.startup_id 
  AND agent_type = 'ceo'
  LIMIT 1
)
WHERE lt.title IN ('Launch Beta Program', 'Market Research', 'Define Success Metrics');

-- Create a test document
INSERT INTO documents (organization_id, startup_id, name, description, file_path, file_size, mime_type, category, uploaded_by) VALUES
(
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440201',
  'Product Roadmap Q1 2024.pdf',
  'Detailed product roadmap for the first quarter',
  '/documents/550e8400-e29b-41d4-a716-446655440001/roadmap-q1-2024.pdf',
  524288,
  'application/pdf',
  'planning',
  '550e8400-e29b-41d4-a716-446655440101'
);

-- Create metrics snapshots
INSERT INTO metrics_snapshots (startup_id, metrics, snapshot_date) VALUES
(
  '550e8400-e29b-41d4-a716-446655440201',
  '{
    "mrr": 0,
    "users": 0,
    "conversion_rate": 0,
    "churn_rate": 0,
    "runway_months": 18,
    "burn_rate": 15000
  }'::jsonb,
  CURRENT_DATE
),
(
  '550e8400-e29b-41d4-a716-446655440202',
  '{
    "signups": 145,
    "survey_responses": 12,
    "interest_score": 8.5,
    "runway_months": 12
  }'::jsonb,
  CURRENT_DATE
);

-- Refresh the materialized view
REFRESH MATERIALIZED VIEW startup_metrics_summary;