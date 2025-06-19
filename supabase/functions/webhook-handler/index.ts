import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookPayload {
  event: string
  timestamp: string
  data: any
  source: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify webhook signature
    const signature = req.headers.get('x-webhook-signature')
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')
    
    if (webhookSecret && signature) {
      const body = await req.text()
      const expectedSignature = createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')
      
      if (signature !== expectedSignature) {
        throw new Error('Invalid webhook signature')
      }
      
      // Parse the body after verification
      const payload: WebhookPayload = JSON.parse(body)
      
      // Initialize Supabase client
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseServiceKey)

      // Process different webhook events
      switch (payload.event) {
        case 'payment.success':
          await handlePaymentSuccess(supabase, payload.data)
          break
          
        case 'user.signup':
          await handleUserSignup(supabase, payload.data)
          break
          
        case 'integration.connected':
          await handleIntegrationConnected(supabase, payload.data)
          break
          
        case 'task.external.update':
          await handleExternalTaskUpdate(supabase, payload.data)
          break
          
        case 'metrics.update':
          await handleMetricsUpdate(supabase, payload.data)
          break
          
        default:
          console.log(`Unhandled webhook event: ${payload.event}`)
      }

      // Log the webhook event
      await supabase
        .from('events')
        .insert({
          organization_id: payload.data.organization_id,
          startup_id: payload.data.startup_id,
          event_type: 'webhook_received',
          title: `Webhook: ${payload.event}`,
          metadata: {
            source: payload.source,
            event: payload.event,
            timestamp: payload.timestamp,
          }
        })

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } else {
      throw new Error('Missing webhook signature')
    }

  } catch (error) {
    console.error('Webhook Handler Error:', error)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function handlePaymentSuccess(supabase: any, data: any) {
  // Update organization with payment information
  await supabase
    .from('organizations')
    .update({
      settings: {
        subscription: {
          status: 'active',
          plan: data.plan,
          expires_at: data.expires_at,
        }
      }
    })
    .eq('id', data.organization_id)

  // Create a success event
  await supabase
    .from('events')
    .insert({
      organization_id: data.organization_id,
      event_type: 'milestone_reached',
      title: 'Subscription Activated',
      description: `${data.plan} plan activated successfully`,
      metadata: data
    })
}

async function handleUserSignup(supabase: any, data: any) {
  // Create user record if not exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', data.email)
    .single()

  if (!existingUser) {
    await supabase
      .from('users')
      .insert({
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        metadata: data.metadata || {}
      })
  }

  // If organization_id provided, add as member
  if (data.organization_id) {
    await supabase
      .from('organization_members')
      .insert({
        organization_id: data.organization_id,
        user_id: data.user_id,
        role: data.role || 'member'
      })
  }
}

async function handleIntegrationConnected(supabase: any, data: any) {
  // Update startup settings with integration details
  await supabase
    .from('startups')
    .update({
      settings: {
        integrations: {
          [data.integration_type]: {
            connected: true,
            connected_at: new Date().toISOString(),
            config: data.config || {}
          }
        }
      }
    })
    .eq('id', data.startup_id)

  // Notify relevant AI agents
  const agents = await supabase
    .from('ai_agents')
    .select('id')
    .eq('startup_id', data.startup_id)
    .in('agent_type', getRelevantAgentsForIntegration(data.integration_type))

  // Create tasks for agents to configure the integration
  for (const agent of agents.data || []) {
    await supabase
      .from('lifecycle_tasks')
      .insert({
        startup_id: data.startup_id,
        lifecycle_stage: 'growth',
        title: `Configure ${data.integration_type} integration`,
        description: `Set up and optimize the newly connected ${data.integration_type} integration`,
        category: 'operations',
        priority: 'high',
        assigned_agent_id: agent.id
      })
  }
}

async function handleExternalTaskUpdate(supabase: any, data: any) {
  // Update task status from external system
  await supabase
    .from('lifecycle_tasks')
    .update({
      status: data.status,
      metadata: {
        external_update: {
          source: data.source,
          updated_at: new Date().toISOString(),
          details: data.details
        }
      }
    })
    .eq('id', data.task_id)
}

async function handleMetricsUpdate(supabase: any, data: any) {
  // Update startup metrics
  await supabase
    .from('startups')
    .update({
      metrics: data.metrics,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.startup_id)

  // Store metrics snapshot
  await supabase
    .from('metrics_snapshots')
    .insert({
      startup_id: data.startup_id,
      metrics: data.metrics,
      snapshot_date: new Date().toISOString().split('T')[0]
    })
    .onConflict('startup_id,snapshot_date')
    .merge()
}

function getRelevantAgentsForIntegration(integrationType: string): string[] {
  const integrationAgentMap: Record<string, string[]> = {
    'stripe': ['cfo', 'ceo'],
    'github': ['cto', 'product'],
    'slack': ['coo', 'hr'],
    'hubspot': ['sales', 'marketing'],
    'analytics': ['product', 'ceo', 'marketing'],
    'aws': ['cto', 'coo'],
    'datadog': ['cto', 'coo'],
  }
  
  return integrationAgentMap[integrationType] || ['ceo']
}