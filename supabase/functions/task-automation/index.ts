import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AutomationRequest {
  action: 'check_dependencies' | 'auto_assign' | 'generate_subtasks' | 'check_completion'
  startupId?: string
  taskId?: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, startupId, taskId } = await req.json() as AutomationRequest

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let result: any = {}

    switch (action) {
      case 'check_dependencies':
        result = await checkTaskDependencies(supabase, startupId!)
        break
        
      case 'auto_assign':
        result = await autoAssignTasks(supabase, startupId!)
        break
        
      case 'generate_subtasks':
        result = await generateSubtasks(supabase, taskId!)
        break
        
      case 'check_completion':
        result = await checkTaskCompletion(supabase, taskId!)
        break
        
      default:
        throw new Error(`Unknown action: ${action}`)
    }

    return new Response(JSON.stringify({ 
      success: true,
      result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Task Automation Error:', error)
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Internal server error'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function checkTaskDependencies(supabase: any, startupId: string) {
  // Get all pending tasks with dependencies
  const { data: tasks } = await supabase
    .from('lifecycle_tasks')
    .select('*')
    .eq('startup_id', startupId)
    .eq('status', 'pending')
    .not('dependencies', 'is', null)

  const tasksToUpdate = []
  
  for (const task of tasks || []) {
    const dependencies = task.dependencies || []
    let allDependenciesMet = true
    
    // Check if all dependencies are completed
    for (const depId of dependencies) {
      const { data: depTask } = await supabase
        .from('lifecycle_tasks')
        .select('status')
        .eq('id', depId)
        .single()
        
      if (!depTask || depTask.status !== 'completed') {
        allDependenciesMet = false
        break
      }
    }
    
    if (allDependenciesMet) {
      tasksToUpdate.push(task.id)
    }
  }
  
  // Update tasks that have all dependencies met
  if (tasksToUpdate.length > 0) {
    await supabase
      .from('lifecycle_tasks')
      .update({ 
        status: 'ready',
        metadata: {
          dependencies_checked_at: new Date().toISOString()
        }
      })
      .in('id', tasksToUpdate)
  }
  
  return {
    tasks_checked: tasks?.length || 0,
    tasks_ready: tasksToUpdate.length
  }
}

async function autoAssignTasks(supabase: any, startupId: string) {
  // Get unassigned tasks
  const { data: tasks } = await supabase
    .from('lifecycle_tasks')
    .select('*')
    .eq('startup_id', startupId)
    .is('assigned_agent_id', null)
    .in('status', ['pending', 'ready'])

  const assignments = []
  
  for (const task of tasks || []) {
    // Call the auto_assign_task_to_agent function
    const { data: result } = await supabase
      .rpc('auto_assign_task_to_agent', { p_task_id: task.id })
    
    if (result) {
      assignments.push({
        task_id: task.id,
        agent_id: result,
        task_title: task.title
      })
    }
  }
  
  return {
    tasks_processed: tasks?.length || 0,
    tasks_assigned: assignments.length,
    assignments
  }
}

async function generateSubtasks(supabase: any, taskId: string) {
  // Get the main task
  const { data: task } = await supabase
    .from('lifecycle_tasks')
    .select('*')
    .eq('id', taskId)
    .single()
    
  if (!task) {
    throw new Error('Task not found')
  }
  
  // Define subtask templates based on task category
  const subtaskTemplates: Record<string, any[]> = {
    'development': [
      { title: 'Technical design and architecture', priority: 'high' },
      { title: 'Implementation and coding', priority: 'high' },
      { title: 'Code review and testing', priority: 'medium' },
      { title: 'Documentation', priority: 'low' }
    ],
    'marketing': [
      { title: 'Market research and analysis', priority: 'high' },
      { title: 'Content creation', priority: 'medium' },
      { title: 'Campaign setup', priority: 'high' },
      { title: 'Performance tracking', priority: 'medium' }
    ],
    'sales': [
      { title: 'Lead qualification', priority: 'high' },
      { title: 'Outreach and engagement', priority: 'high' },
      { title: 'Demo preparation', priority: 'medium' },
      { title: 'Follow-up and closing', priority: 'high' }
    ],
    'product': [
      { title: 'User research', priority: 'high' },
      { title: 'Feature specification', priority: 'high' },
      { title: 'Design mockups', priority: 'medium' },
      { title: 'User testing', priority: 'medium' }
    ]
  }
  
  const templates = subtaskTemplates[task.category] || [
    { title: 'Research and planning', priority: 'high' },
    { title: 'Execution', priority: 'high' },
    { title: 'Review and refinement', priority: 'medium' }
  ]
  
  const subtasks = []
  
  // Create subtasks
  for (const template of templates) {
    const subtask = {
      startup_id: task.startup_id,
      lifecycle_stage: task.lifecycle_stage,
      title: `${task.title} - ${template.title}`,
      description: `Subtask of: ${task.title}`,
      category: task.category,
      priority: template.priority,
      status: 'pending',
      dependencies: [task.id],
      metadata: {
        parent_task_id: task.id,
        generated_at: new Date().toISOString()
      }
    }
    
    const { data: created } = await supabase
      .from('lifecycle_tasks')
      .insert(subtask)
      .select()
      .single()
      
    if (created) {
      subtasks.push(created)
    }
  }
  
  // Update main task metadata
  await supabase
    .from('lifecycle_tasks')
    .update({
      metadata: {
        ...task.metadata,
        has_subtasks: true,
        subtask_count: subtasks.length
      }
    })
    .eq('id', taskId)
  
  return {
    main_task: task.title,
    subtasks_created: subtasks.length,
    subtasks
  }
}

async function checkTaskCompletion(supabase: any, taskId: string) {
  // Get the task and its checklist
  const { data: task } = await supabase
    .from('lifecycle_tasks')
    .select('*')
    .eq('id', taskId)
    .single()
    
  if (!task) {
    throw new Error('Task not found')
  }
  
  // Check if all checklist items are completed
  const checklist = task.checklist || []
  const completedItems = checklist.filter((item: any) => item.completed).length
  const totalItems = checklist.length
  
  const completionPercentage = totalItems > 0 
    ? Math.round((completedItems / totalItems) * 100)
    : 0
  
  // Check if all subtasks are completed
  const { data: subtasks } = await supabase
    .from('lifecycle_tasks')
    .select('status')
    .eq('metadata->parent_task_id', taskId)
  
  const subtasksCompleted = subtasks?.every(st => st.status === 'completed') ?? true
  
  // Determine if task should be marked as completed
  const shouldComplete = completionPercentage === 100 && subtasksCompleted
  
  if (shouldComplete && task.status !== 'completed') {
    await supabase
      .from('lifecycle_tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId)
      
    // Log completion event
    await supabase
      .from('events')
      .insert({
        startup_id: task.startup_id,
        event_type: 'task_completed',
        title: `Task completed: ${task.title}`,
        metadata: {
          task_id: taskId,
          completion_percentage: completionPercentage,
          checklist_items: totalItems
        }
      })
  }
  
  return {
    task_id: taskId,
    task_title: task.title,
    status: task.status,
    completion_percentage: completionPercentage,
    checklist_completed: `${completedItems}/${totalItems}`,
    subtasks_completed: subtasksCompleted,
    should_complete: shouldComplete,
    marked_complete: shouldComplete && task.status !== 'completed'
  }
}