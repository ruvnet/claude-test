import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Agent, Task, Workflow, User } from '@/types'

interface AppState {
  // User
  user: User | null
  setUser: (user: User | null) => void
  
  // Agents
  agents: Agent[]
  addAgent: (agent: Agent) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  removeAgent: (id: string) => void
  
  // Tasks
  tasks: Task[]
  addTask: (task: Task) => void
  updateTask: (id: string, updates: Partial<Task>) => void
  removeTask: (id: string) => void
  
  // Workflows
  workflows: Workflow[]
  addWorkflow: (workflow: Workflow) => void
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void
  removeWorkflow: (id: string) => void
  
  // UI State
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // User
        user: null,
        setUser: (user) => set({ user }),
        
        // Agents
        agents: [],
        addAgent: (agent) => set((state) => ({ agents: [...state.agents, agent] })),
        updateAgent: (id, updates) =>
          set((state) => ({
            agents: state.agents.map((agent) =>
              agent.id === id ? { ...agent, ...updates } : agent
            ),
          })),
        removeAgent: (id) =>
          set((state) => ({
            agents: state.agents.filter((agent) => agent.id !== id),
          })),
        
        // Tasks
        tasks: [],
        addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((task) =>
              task.id === id ? { ...task, ...updates } : task
            ),
          })),
        removeTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((task) => task.id !== id),
          })),
        
        // Workflows
        workflows: [],
        addWorkflow: (workflow) =>
          set((state) => ({ workflows: [...state.workflows, workflow] })),
        updateWorkflow: (id, updates) =>
          set((state) => ({
            workflows: state.workflows.map((workflow) =>
              workflow.id === id ? { ...workflow, ...updates } : workflow
            ),
          })),
        removeWorkflow: (id) =>
          set((state) => ({
            workflows: state.workflows.filter((workflow) => workflow.id !== id),
          })),
        
        // UI State
        sidebarOpen: false,
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
      }),
      {
        name: 'zero-startup-storage',
        partialize: (state) => ({
          user: state.user,
          agents: state.agents,
          tasks: state.tasks,
          workflows: state.workflows,
        }),
      }
    )
  )
)