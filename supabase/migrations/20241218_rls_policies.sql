-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lifecycle_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id 
    FROM organization_members 
    WHERE organization_members.user_id = get_user_organizations.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is organization member
CREATE OR REPLACE FUNCTION is_organization_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM organization_members 
        WHERE organization_members.user_id = is_organization_member.user_id 
        AND organization_members.organization_id = is_organization_member.org_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user's role in organization
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID, org_id UUID)
RETURNS user_role AS $$
DECLARE
    role user_role;
BEGIN
    SELECT organization_members.role INTO role
    FROM organization_members
    WHERE organization_members.user_id = get_user_role.user_id
    AND organization_members.organization_id = get_user_role.org_id;
    
    RETURN role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Organizations policies
CREATE POLICY "Users can view organizations they belong to"
    ON organizations FOR SELECT
    USING (id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Organization owners and admins can update"
    ON organizations FOR UPDATE
    USING (get_user_role(auth.uid(), id) IN ('owner', 'admin'));

CREATE POLICY "Only organization owners can delete"
    ON organizations FOR DELETE
    USING (get_user_role(auth.uid(), id) = 'owner');

-- Users policies
CREATE POLICY "Users can view their own profile"
    ON users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles of organization members"
    ON users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM organization_members om1
            WHERE om1.user_id = users.id
            AND om1.organization_id IN (
                SELECT organization_id FROM organization_members om2
                WHERE om2.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own profile"
    ON users FOR UPDATE
    USING (id = auth.uid());

-- Organization members policies
CREATE POLICY "Members can view their organization's members"
    ON organization_members FOR SELECT
    USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can manage members"
    ON organization_members FOR INSERT
    WITH CHECK (get_user_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE POLICY "Owners and admins can update members"
    ON organization_members FOR UPDATE
    USING (get_user_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE POLICY "Owners and admins can remove members"
    ON organization_members FOR DELETE
    USING (get_user_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Startups policies
CREATE POLICY "Members can view their organization's startups"
    ON startups FOR SELECT
    USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can create startups"
    ON startups FOR INSERT
    WITH CHECK (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can update startups"
    ON startups FOR UPDATE
    USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can delete startups"
    ON startups FOR DELETE
    USING (get_user_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- AI Agents policies
CREATE POLICY "Members can view agents"
    ON ai_agents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM startups
            WHERE startups.id = ai_agents.startup_id
            AND is_organization_member(auth.uid(), startups.organization_id)
        )
    );

CREATE POLICY "Members can manage agents"
    ON ai_agents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM startups
            WHERE startups.id = ai_agents.startup_id
            AND is_organization_member(auth.uid(), startups.organization_id)
        )
    );

-- Lifecycle tasks policies
CREATE POLICY "Members can view tasks"
    ON lifecycle_tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM startups
            WHERE startups.id = lifecycle_tasks.startup_id
            AND is_organization_member(auth.uid(), startups.organization_id)
        )
    );

CREATE POLICY "Members can manage tasks"
    ON lifecycle_tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM startups
            WHERE startups.id = lifecycle_tasks.startup_id
            AND is_organization_member(auth.uid(), startups.organization_id)
        )
    );

-- Events policies
CREATE POLICY "Members can view their organization's events"
    ON events FOR SELECT
    USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "System can create events"
    ON events FOR INSERT
    WITH CHECK (true);

-- Documents policies
CREATE POLICY "Members can view documents"
    ON documents FOR SELECT
    USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can upload documents"
    ON documents FOR INSERT
    WITH CHECK (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Members can update documents"
    ON documents FOR UPDATE
    USING (is_organization_member(auth.uid(), organization_id));

CREATE POLICY "Owners and admins can delete documents"
    ON documents FOR DELETE
    USING (get_user_role(auth.uid(), organization_id) IN ('owner', 'admin'));

-- Agent conversations policies
CREATE POLICY "Members can view conversations"
    ON agent_conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM startups
            WHERE startups.id = agent_conversations.startup_id
            AND is_organization_member(auth.uid(), startups.organization_id)
        )
    );

CREATE POLICY "Members can create conversations"
    ON agent_conversations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM startups
            WHERE startups.id = agent_conversations.startup_id
            AND is_organization_member(auth.uid(), startups.organization_id)
        )
    );

-- Metrics snapshots policies
CREATE POLICY "Members can view metrics"
    ON metrics_snapshots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM startups
            WHERE startups.id = metrics_snapshots.startup_id
            AND is_organization_member(auth.uid(), startups.organization_id)
        )
    );

CREATE POLICY "System can create metrics"
    ON metrics_snapshots FOR INSERT
    WITH CHECK (true);

-- Grant necessary permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;