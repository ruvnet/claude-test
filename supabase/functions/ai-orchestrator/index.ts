import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@4.20.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AgentRequest {
  agentId: string
  taskId: string
  action: 'analyze' | 'execute' | 'plan' | 'collaborate'
  context: any
  parameters?: any
}

interface AgentResponse {
  success: boolean
  result?: any
  error?: string
  metadata?: any
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { agentId, taskId, action, context, parameters } = await req.json() as AgentRequest

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('id', agentId)
      .single()

    if (agentError || !agent) {
      throw new Error('Agent not found')
    }

    // Get task details if taskId provided
    let task = null
    if (taskId) {
      const { data: taskData, error: taskError } = await supabase
        .from('lifecycle_tasks')
        .select('*')
        .eq('id', taskId)
        .single()

      if (!taskError && taskData) {
        task = taskData
      }
    }

    // Initialize OpenAI
    const openai = new OpenAIApi(new Configuration({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    }))

    // Build system prompt based on agent type and personality
    const systemPrompt = buildSystemPrompt(agent, task)

    // Build user prompt based on action
    const userPrompt = buildUserPrompt(action, context, parameters, task)

    // Call AI model
    const completion = await openai.createChatCompletion({
      model: Deno.env.get('DEFAULT_AI_MODEL') || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: parseFloat(Deno.env.get('DEFAULT_TEMPERATURE') || '0.7'),
      max_tokens: 2000,
    })

    const aiResponse = completion.data.choices[0].message?.content

    // Parse and structure the response
    const structuredResponse = parseAIResponse(aiResponse, action)

    // Update agent's last activity
    await supabase
      .from('ai_agents')
      .update({ 
        last_active_at: new Date().toISOString(),
        performance_metrics: {
          ...agent.performance_metrics,
          total_actions: (agent.performance_metrics?.total_actions || 0) + 1,
          last_action_type: action,
        }
      })
      .eq('id', agentId)

    // Log the event
    await supabase
      .from('events')
      .insert({
        organization_id: agent.organization_id,
        startup_id: agent.startup_id,
        agent_id: agentId,
        event_type: 'agent_action',
        title: `${agent.name} performed ${action}`,
        metadata: {
          action,
          task_id: taskId,
          response_preview: structuredResponse.result?.substring(0, 200),
        }
      })

    // If this was a task execution, update task status
    if (taskId && action === 'execute') {
      await supabase
        .from('lifecycle_tasks')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          metadata: {
            ...task?.metadata,
            last_agent_action: {
              timestamp: new Date().toISOString(),
              action: action,
              agent_id: agentId,
            }
          }
        })
        .eq('id', taskId)
    }

    const response: AgentResponse = {
      success: true,
      result: structuredResponse,
      metadata: {
        agent_type: agent.agent_type,
        agent_name: agent.name,
        action_performed: action,
        timestamp: new Date().toISOString(),
      }
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('AI Orchestrator Error:', error)
    
    const errorResponse: AgentResponse = {
      success: false,
      error: error.message || 'Internal server error',
    }

    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

function buildSystemPrompt(agent: any, task: any): string {
  const personalityTraits = agent.personality?.traits?.join(', ') || ''
  const capabilities = agent.capabilities?.join(', ') || ''
  
  return `You are ${agent.name}, a ${agent.agent_type} AI agent for a startup.

Your personality traits: ${personalityTraits}
Your communication style: ${agent.personality?.communication_style || 'professional'}
Your core capabilities: ${capabilities}

${agent.description}

You are part of a team of AI agents working together to build and grow a startup. 
Always provide actionable, specific, and practical advice based on your role and expertise.
${task ? `\nCurrent task context: ${task.title} - ${task.description}` : ''}

Respond in a structured format that can be easily parsed and acted upon.`
}

function buildUserPrompt(action: string, context: any, parameters: any, task: any): string {
  switch (action) {
    case 'analyze':
      return `Analyze the following situation and provide insights and recommendations:
      
Context: ${JSON.stringify(context)}
Parameters: ${JSON.stringify(parameters)}
${task ? `Task Details: ${task.title} - ${task.description}` : ''}

Provide a structured analysis with:
1. Key observations
2. Potential risks or concerns
3. Recommended actions
4. Success metrics`

    case 'execute':
      return `Execute the following task with the given parameters:
      
Task: ${task?.title || 'No specific task'}
Description: ${task?.description || 'No description'}
Context: ${JSON.stringify(context)}
Parameters: ${JSON.stringify(parameters)}

Provide a detailed execution plan with:
1. Step-by-step actions
2. Required resources
3. Timeline estimates
4. Expected outcomes
5. How to measure success`

    case 'plan':
      return `Create a strategic plan for the following objective:
      
Objective: ${context.objective || 'No specific objective'}
Current State: ${JSON.stringify(context.current_state)}
Constraints: ${JSON.stringify(parameters.constraints || {})}
Timeline: ${parameters.timeline || 'No specific timeline'}

Provide a comprehensive plan with:
1. Goals and milestones
2. Action items with priorities
3. Resource requirements
4. Risk mitigation strategies
5. Success criteria`

    case 'collaborate':
      return `Collaborate with other agents on the following initiative:
      
Initiative: ${context.initiative || 'No specific initiative'}
Other Agents Involved: ${context.other_agents || 'Unknown'}
Your Role: ${context.your_role || 'Contributor'}
Current Progress: ${JSON.stringify(context.progress || {})}

Provide your contribution including:
1. Your specific recommendations based on your expertise
2. How your input complements other agents' work
3. Dependencies or requirements from other agents
4. Next steps for the team`

    default:
      return `Perform the action: ${action} with context: ${JSON.stringify(context)}`
  }
}

function parseAIResponse(response: string | undefined, action: string): any {
  if (!response) {
    return { error: 'No response from AI model' }
  }

  try {
    // Attempt to extract structured data from the response
    // This is a simplified parser - in production, you'd want more robust parsing
    const lines = response.split('\n')
    const structured: any = {
      action: action,
      timestamp: new Date().toISOString(),
      raw_response: response,
    }

    // Extract numbered lists and sections
    let currentSection = 'general'
    const sections: any = {}
    
    lines.forEach(line => {
      if (line.match(/^\d+\./)) {
        if (!sections[currentSection]) {
          sections[currentSection] = []
        }
        sections[currentSection].push(line.replace(/^\d+\.\s*/, ''))
      } else if (line.match(/^[A-Z][^:]+:/)) {
        currentSection = line.replace(/:.*$/, '').toLowerCase().replace(/\s+/g, '_')
      }
    })

    structured.sections = sections
    structured.summary = response.substring(0, 500)

    return structured
  } catch (error) {
    return {
      error: 'Failed to parse AI response',
      raw_response: response
    }
  }
}