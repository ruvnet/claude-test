-- Function to automatically create default AI agents when a startup is created
CREATE OR REPLACE FUNCTION create_default_agents()
RETURNS TRIGGER AS $$
DECLARE
    agent_types agent_type[] := ARRAY['ceo', 'cto', 'cfo', 'coo', 'product']::agent_type[];
    agent_type agent_type;
    agent_config JSONB;
BEGIN
    FOREACH agent_type IN ARRAY agent_types
    LOOP
        -- Set specific configuration for each agent type
        CASE agent_type
            WHEN 'ceo' THEN
                agent_config := jsonb_build_object(
                    'name', 'Chief Executive Officer',
                    'description', 'Strategic vision, leadership, and external relations',
                    'personality', jsonb_build_object(
                        'traits', ARRAY['visionary', 'decisive', 'charismatic'],
                        'communication_style', 'inspirational'
                    ),
                    'capabilities', ARRAY[
                        'strategic planning',
                        'investor relations',
                        'team building',
                        'decision making'
                    ]
                );
            WHEN 'cto' THEN
                agent_config := jsonb_build_object(
                    'name', 'Chief Technology Officer',
                    'description', 'Technology strategy, architecture, and innovation',
                    'personality', jsonb_build_object(
                        'traits', ARRAY['innovative', 'analytical', 'pragmatic'],
                        'communication_style', 'technical'
                    ),
                    'capabilities', ARRAY[
                        'technology selection',
                        'architecture design',
                        'team leadership',
                        'innovation management'
                    ]
                );
            WHEN 'cfo' THEN
                agent_config := jsonb_build_object(
                    'name', 'Chief Financial Officer',
                    'description', 'Financial planning, analysis, and risk management',
                    'personality', jsonb_build_object(
                        'traits', ARRAY['analytical', 'detail-oriented', 'strategic'],
                        'communication_style', 'data-driven'
                    ),
                    'capabilities', ARRAY[
                        'financial modeling',
                        'budgeting',
                        'fundraising',
                        'risk assessment'
                    ]
                );
            WHEN 'coo' THEN
                agent_config := jsonb_build_object(
                    'name', 'Chief Operating Officer',
                    'description', 'Operations, processes, and execution excellence',
                    'personality', jsonb_build_object(
                        'traits', ARRAY['organized', 'efficient', 'results-driven'],
                        'communication_style', 'process-oriented'
                    ),
                    'capabilities', ARRAY[
                        'process optimization',
                        'project management',
                        'resource allocation',
                        'operational efficiency'
                    ]
                );
            WHEN 'product' THEN
                agent_config := jsonb_build_object(
                    'name', 'Chief Product Officer',
                    'description', 'Product strategy, user experience, and market fit',
                    'personality', jsonb_build_object(
                        'traits', ARRAY['user-focused', 'creative', 'data-informed'],
                        'communication_style', 'collaborative'
                    ),
                    'capabilities', ARRAY[
                        'product strategy',
                        'user research',
                        'feature prioritization',
                        'market analysis'
                    ]
                );
        END CASE;
        
        INSERT INTO ai_agents (
            startup_id,
            agent_type,
            name,
            description,
            personality,
            capabilities,
            status
        ) VALUES (
            NEW.id,
            agent_type,
            agent_config->>'name',
            agent_config->>'description',
            agent_config->'personality',
            agent_config->'capabilities',
            'active'
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default agents
CREATE TRIGGER create_startup_agents
    AFTER INSERT ON startups
    FOR EACH ROW
    EXECUTE FUNCTION create_default_agents();

-- Function to log events automatically
CREATE OR REPLACE FUNCTION log_event(
    p_organization_id UUID,
    p_startup_id UUID,
    p_user_id UUID,
    p_agent_id UUID,
    p_event_type event_type,
    p_title VARCHAR(500),
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO events (
        organization_id,
        startup_id,
        user_id,
        agent_id,
        event_type,
        title,
        description,
        metadata
    ) VALUES (
        p_organization_id,
        p_startup_id,
        p_user_id,
        p_agent_id,
        p_event_type,
        p_title,
        p_description,
        p_metadata
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update agent status based on task assignment
CREATE OR REPLACE FUNCTION update_agent_status_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
    -- When a task is assigned to an agent
    IF NEW.assigned_agent_id IS NOT NULL AND OLD.assigned_agent_id IS DISTINCT FROM NEW.assigned_agent_id THEN
        UPDATE ai_agents
        SET status = 'active',
            last_active_at = NOW()
        WHERE id = NEW.assigned_agent_id;
    END IF;
    
    -- When a task is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.assigned_agent_id IS NOT NULL THEN
        -- Check if agent has other active tasks
        IF NOT EXISTS (
            SELECT 1 FROM lifecycle_tasks
            WHERE assigned_agent_id = NEW.assigned_agent_id
            AND id != NEW.id
            AND status IN ('pending', 'in_progress')
        ) THEN
            -- No other active tasks, set agent to idle
            UPDATE ai_agents
            SET status = 'idle'
            WHERE id = NEW.assigned_agent_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for agent status updates
CREATE TRIGGER update_agent_status_trigger
    AFTER UPDATE ON lifecycle_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_status_on_task_change();

-- Function to create lifecycle tasks based on stage
CREATE OR REPLACE FUNCTION generate_lifecycle_tasks(
    p_startup_id UUID,
    p_stage lifecycle_stage
)
RETURNS VOID AS $$
DECLARE
    task_template RECORD;
BEGIN
    -- Define task templates for each stage
    IF p_stage = 'idea' THEN
        INSERT INTO lifecycle_tasks (startup_id, lifecycle_stage, title, description, category, priority) VALUES
        (p_startup_id, 'idea', 'Define Problem Statement', 'Clearly articulate the problem you are solving', 'validation', 'high'),
        (p_startup_id, 'idea', 'Identify Target Market', 'Define your ideal customer profile and market size', 'market', 'high'),
        (p_startup_id, 'idea', 'Competitive Analysis', 'Research existing solutions and competitors', 'market', 'medium'),
        (p_startup_id, 'idea', 'Value Proposition Canvas', 'Create a clear value proposition', 'product', 'high'),
        (p_startup_id, 'idea', 'Initial Business Model', 'Draft initial business model canvas', 'business', 'medium');
        
    ELSIF p_stage = 'validation' THEN
        INSERT INTO lifecycle_tasks (startup_id, lifecycle_stage, title, description, category, priority) VALUES
        (p_startup_id, 'validation', 'Customer Interviews', 'Conduct 20+ customer discovery interviews', 'validation', 'critical'),
        (p_startup_id, 'validation', 'Build Landing Page', 'Create landing page to test value proposition', 'marketing', 'high'),
        (p_startup_id, 'validation', 'Run Smoke Tests', 'Test demand with ads or waitlist', 'validation', 'high'),
        (p_startup_id, 'validation', 'Define MVP Features', 'Prioritize features for minimum viable product', 'product', 'high'),
        (p_startup_id, 'validation', 'Financial Projections', 'Create initial financial model', 'finance', 'medium');
        
    ELSIF p_stage = 'mvp' THEN
        INSERT INTO lifecycle_tasks (startup_id, lifecycle_stage, title, description, category, priority) VALUES
        (p_startup_id, 'mvp', 'Build Core Features', 'Develop the essential MVP functionality', 'development', 'critical'),
        (p_startup_id, 'mvp', 'Setup Analytics', 'Implement user analytics and tracking', 'development', 'high'),
        (p_startup_id, 'mvp', 'Beta User Acquisition', 'Recruit and onboard beta users', 'marketing', 'high'),
        (p_startup_id, 'mvp', 'Collect User Feedback', 'Systematic feedback collection process', 'product', 'high'),
        (p_startup_id, 'mvp', 'Iterate Based on Feedback', 'Rapid iteration cycles', 'product', 'high');
        
    ELSIF p_stage = 'growth' THEN
        INSERT INTO lifecycle_tasks (startup_id, lifecycle_stage, title, description, category, priority) VALUES
        (p_startup_id, 'growth', 'Growth Experiments', 'Run systematic growth experiments', 'marketing', 'critical'),
        (p_startup_id, 'growth', 'Optimize Conversion Funnel', 'Improve conversion rates at each stage', 'marketing', 'high'),
        (p_startup_id, 'growth', 'Content Marketing Strategy', 'Develop and execute content strategy', 'marketing', 'medium'),
        (p_startup_id, 'growth', 'Customer Success Program', 'Build customer success processes', 'operations', 'high'),
        (p_startup_id, 'growth', 'Fundraising Preparation', 'Prepare for Series A fundraising', 'finance', 'high');
        
    ELSIF p_stage = 'scale' THEN
        INSERT INTO lifecycle_tasks (startup_id, lifecycle_stage, title, description, category, priority) VALUES
        (p_startup_id, 'scale', 'Hire Key Positions', 'Build out leadership team', 'hr', 'critical'),
        (p_startup_id, 'scale', 'Scalable Infrastructure', 'Build infrastructure for scale', 'development', 'high'),
        (p_startup_id, 'scale', 'International Expansion', 'Plan and execute market expansion', 'business', 'medium'),
        (p_startup_id, 'scale', 'Enterprise Sales Process', 'Develop enterprise sales capability', 'sales', 'high'),
        (p_startup_id, 'scale', 'Series B Fundraising', 'Raise growth capital', 'finance', 'high');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate startup health score
CREATE OR REPLACE FUNCTION calculate_startup_health(p_startup_id UUID)
RETURNS JSONB AS $$
DECLARE
    task_completion_rate NUMERIC;
    active_agents_count INTEGER;
    overdue_tasks_count INTEGER;
    health_score INTEGER;
    health_status TEXT;
BEGIN
    -- Calculate task completion rate
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100
            ELSE (COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*))::NUMERIC(5,2)
        END INTO task_completion_rate
    FROM lifecycle_tasks
    WHERE startup_id = p_startup_id;
    
    -- Count active agents
    SELECT COUNT(*) INTO active_agents_count
    FROM ai_agents
    WHERE startup_id = p_startup_id AND status = 'active';
    
    -- Count overdue tasks
    SELECT COUNT(*) INTO overdue_tasks_count
    FROM lifecycle_tasks
    WHERE startup_id = p_startup_id 
    AND status IN ('pending', 'in_progress')
    AND due_date < NOW();
    
    -- Calculate health score (0-100)
    health_score := GREATEST(0, LEAST(100, 
        (task_completion_rate * 0.4 + 
         (active_agents_count * 10) * 0.3 + 
         GREATEST(0, (100 - overdue_tasks_count * 10)) * 0.3)::INTEGER
    ));
    
    -- Determine health status
    health_status := CASE
        WHEN health_score >= 80 THEN 'excellent'
        WHEN health_score >= 60 THEN 'good'
        WHEN health_score >= 40 THEN 'fair'
        ELSE 'needs_attention'
    END;
    
    RETURN jsonb_build_object(
        'score', health_score,
        'status', health_status,
        'metrics', jsonb_build_object(
            'task_completion_rate', task_completion_rate,
            'active_agents_count', active_agents_count,
            'overdue_tasks_count', overdue_tasks_count
        ),
        'calculated_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to assign tasks to agents based on capabilities
CREATE OR REPLACE FUNCTION auto_assign_task_to_agent(p_task_id UUID)
RETURNS UUID AS $$
DECLARE
    task_record RECORD;
    best_agent_id UUID;
BEGIN
    -- Get task details
    SELECT * INTO task_record FROM lifecycle_tasks WHERE id = p_task_id;
    
    -- Find the best agent based on task category
    SELECT id INTO best_agent_id
    FROM ai_agents
    WHERE startup_id = task_record.startup_id
    AND status != 'error'
    AND (
        (task_record.category = 'validation' AND agent_type = 'product') OR
        (task_record.category = 'development' AND agent_type = 'cto') OR
        (task_record.category = 'finance' AND agent_type = 'cfo') OR
        (task_record.category = 'operations' AND agent_type = 'coo') OR
        (task_record.category IN ('business', 'market') AND agent_type = 'ceo') OR
        (task_record.category = 'marketing' AND agent_type = 'marketing') OR
        (task_record.category = 'sales' AND agent_type = 'sales') OR
        (task_record.category = 'hr' AND agent_type = 'hr')
    )
    ORDER BY 
        CASE status 
            WHEN 'idle' THEN 1 
            WHEN 'active' THEN 2 
            ELSE 3 
        END
    LIMIT 1;
    
    -- If no specific agent found, assign to CEO
    IF best_agent_id IS NULL THEN
        SELECT id INTO best_agent_id
        FROM ai_agents
        WHERE startup_id = task_record.startup_id
        AND agent_type = 'ceo'
        LIMIT 1;
    END IF;
    
    -- Update task with assigned agent
    IF best_agent_id IS NOT NULL THEN
        UPDATE lifecycle_tasks
        SET assigned_agent_id = best_agent_id
        WHERE id = p_task_id;
    END IF;
    
    RETURN best_agent_id;
END;
$$ LANGUAGE plpgsql;

-- Create a materialized view for startup dashboard metrics
CREATE MATERIALIZED VIEW startup_metrics_summary AS
SELECT 
    s.id as startup_id,
    s.name as startup_name,
    s.lifecycle_stage,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'in_progress') as in_progress_tasks,
    COUNT(DISTINCT t.id) FILTER (WHERE t.due_date < NOW() AND t.status != 'completed') as overdue_tasks,
    COUNT(DISTINCT a.id) as total_agents,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'active') as active_agents,
    MAX(e.created_at) as last_activity,
    s.created_at as startup_created_at
FROM startups s
LEFT JOIN lifecycle_tasks t ON s.id = t.startup_id
LEFT JOIN ai_agents a ON s.id = a.startup_id
LEFT JOIN events e ON s.id = e.startup_id
GROUP BY s.id, s.name, s.lifecycle_stage, s.created_at;

-- Create index on materialized view
CREATE INDEX idx_startup_metrics_summary_startup_id ON startup_metrics_summary(startup_id);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_startup_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY startup_metrics_summary;
END;
$$ LANGUAGE plpgsql;