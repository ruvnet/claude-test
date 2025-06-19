# Zero-Person Startup Platform - Supabase Backend

This directory contains the complete Supabase backend infrastructure for the Zero-Person Startup Platform.

## Architecture Overview

### Database Schema

The platform uses a multi-tenant architecture with the following core tables:

- **organizations**: Root tenant entity
- **users**: Platform users with authentication
- **organization_members**: Many-to-many relationship with role-based access
- **startups**: Individual startup projects within organizations  
- **ai_agents**: Virtual C-suite agents (CEO, CTO, CFO, etc.)
- **lifecycle_tasks**: Tasks across startup stages (idea → scale)
- **events**: Activity log and audit trail
- **documents**: File metadata for document management
- **agent_conversations**: AI agent interaction history
- **metrics_snapshots**: Time-series metrics data

### Security Features

- **Row Level Security (RLS)**: Enforced on all tables for multi-tenant isolation
- **Role-based Access Control**: owner, admin, member, viewer roles
- **Helper Functions**: Secure functions for permission checks
- **Signed URLs**: Secure document access with time-limited URLs

### Automation Features

1. **Auto Agent Creation**: When a startup is created, 5 default AI agents are automatically spawned
2. **Task Assignment**: Intelligent task routing based on agent capabilities
3. **Status Updates**: Agent status automatically updates based on task activity
4. **Event Logging**: Comprehensive audit trail for all actions
5. **Metrics Calculation**: Health scores and KPIs computed automatically

### Edge Functions

Three serverless functions power the AI orchestration:

1. **ai-orchestrator**: Handles AI agent actions (analyze, execute, plan, collaborate)
2. **webhook-handler**: Processes external webhooks for integrations
3. **task-automation**: Manages task dependencies, assignments, and completion

### Storage Buckets

Three storage buckets with different access policies:

- **documents**: Private organizational documents (50MB limit)
- **avatars**: Public user avatars (5MB limit)
- **logos**: Public organization logos (10MB limit)

## Setup Instructions

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase**:
   ```bash
   supabase init
   ```

3. **Start Local Development**:
   ```bash
   supabase start
   ```

4. **Run Migrations**:
   ```bash
   supabase db push
   ```

5. **Deploy Edge Functions**:
   ```bash
   supabase functions deploy ai-orchestrator
   supabase functions deploy webhook-handler
   supabase functions deploy task-automation
   ```

6. **Seed Test Data**:
   ```bash
   supabase db seed
   ```

## Environment Variables

Copy `.env.example` to `.env` in the functions directory and configure:

- `OPENAI_API_KEY`: For GPT-4 agent intelligence
- `ANTHROPIC_API_KEY`: For Claude agent intelligence (optional)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations
- `WEBHOOK_SECRET`: Secret for webhook signature verification

## API Integration

The frontend should use the Supabase client library to:

1. **Authentication**: Use Supabase Auth for user management
2. **Real-time**: Subscribe to table changes for live updates
3. **Storage**: Upload files directly to storage buckets
4. **Functions**: Call edge functions for AI operations

Example client initialization:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
```

## Key Features

### Multi-tenant Isolation
- All queries automatically filtered by organization membership
- RLS policies prevent cross-tenant data access
- Secure document storage with path-based isolation

### AI Agent System
- 10 agent types: CEO, CTO, CFO, COO, Product, Sales, Marketing, HR, Legal, Support
- Personality traits and communication styles
- Capability-based task routing
- Performance tracking and metrics

### Lifecycle Management
- 5 stages: Idea, Validation, MVP, Growth, Scale
- Stage-specific task templates
- Dependency management
- Progress tracking with checklists

### Real-time Capabilities
- Live status updates
- Activity feeds
- Agent collaboration
- Metric dashboards

## Monitoring & Maintenance

1. **Database Health**: Monitor the `startup_metrics_summary` materialized view
2. **Agent Performance**: Check `ai_agents.performance_metrics` 
3. **Task Completion**: Review overdue tasks and bottlenecks
4. **Storage Usage**: Monitor bucket sizes and clean up old files
5. **Function Logs**: Check edge function logs for errors

## Security Best Practices

1. Never expose service role keys to the client
2. Use RLS policies for all data access
3. Validate webhook signatures
4. Implement rate limiting on edge functions
5. Regular security audits of RLS policies
6. Monitor failed authentication attempts
7. Use signed URLs for sensitive documents

## Troubleshooting

Common issues and solutions:

1. **RLS Policy Errors**: Check user organization membership
2. **Agent Not Responding**: Verify API keys and rate limits
3. **Task Dependencies**: Use the task automation function to check
4. **Storage Errors**: Verify MIME types and file size limits
5. **Migration Failures**: Check for existing enum types or tables

For production deployment, ensure all environment variables are properly configured in your Supabase project dashboard.