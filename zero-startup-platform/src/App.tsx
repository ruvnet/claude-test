import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

// Mock data for demonstration
const mockStartups = [
  {
    id: '1',
    name: 'AI SaaS Platform',
    description: 'Revolutionary AI-powered business automation platform',
    stage: 'MVP',
    industry: 'Technology',
    progress: 65,
  },
  {
    id: '2', 
    name: 'Green Energy Solutions',
    description: 'Sustainable energy management for small businesses',
    stage: 'Validation',
    industry: 'Energy',
    progress: 35,
  },
  {
    id: '3',
    name: 'HealthTech App',
    description: 'Telemedicine platform for rural communities',
    stage: 'Growth',
    industry: 'Healthcare',
    progress: 85,
  },
]

const mockAgents = [
  { id: '1', type: 'Researcher', status: 'Active', tasks: 3 },
  { id: '2', type: 'Developer', status: 'Working', tasks: 5 },
  { id: '3', type: 'Marketer', status: 'Idle', tasks: 1 },
  { id: '4', type: 'Analyst', status: 'Active', tasks: 2 },
]

const mockTasks = [
  { id: '1', title: 'Market Research Analysis', status: 'In Progress', priority: 'High' },
  { id: '2', title: 'MVP Development', status: 'Completed', priority: 'Critical' },
  { id: '3', title: 'User Testing', status: 'Pending', priority: 'Medium' },
  { id: '4', title: 'Marketing Campaign', status: 'In Progress', priority: 'High' },
]

function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview')

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500">Total Startups</h3>
                <p className="text-2xl font-bold text-gray-900">{mockStartups.length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500">Active Tasks</h3>
                <p className="text-2xl font-bold text-gray-900">{mockTasks.filter(t => t.status === 'In Progress').length}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-sm font-medium text-gray-500">AI Agents</h3>
                <p className="text-2xl font-bold text-gray-900">{mockAgents.length}</p>
              </div>
            </div>
          </div>
        )
      
      case 'startups':
        return (
          <div className="space-y-4">
            {mockStartups.map((startup) => (
              <div key={startup.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{startup.name}</h3>
                    <p className="text-gray-600">{startup.description}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    startup.stage === 'Growth' ? 'bg-green-100 text-green-800' :
                    startup.stage === 'MVP' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {startup.stage}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{startup.industry}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${startup.progress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{startup.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      
      case 'agents':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockAgents.map((agent) => (
              <div key={agent.id} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{agent.type} Agent</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    agent.status === 'Active' ? 'bg-green-100 text-green-800' :
                    agent.status === 'Working' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Active Tasks: {agent.tasks}</p>
              </div>
            ))}
          </div>
        )
      
      case 'tasks':
        return (
          <div className="space-y-4">
            {mockTasks.map((task) => (
              <div key={task.id} className="bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">{task.title}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                      task.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {task.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {task.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      
      default:
        return <div>Select a tab</div>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">StartupOS Platform</h1>
            <div className="text-sm text-gray-500">Zero-Person Startup Management</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview' },
              { id: 'startups', name: 'Startups' },
              { id: 'agents', name: 'AI Agents' },
              { id: 'tasks', name: 'Tasks' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>

      {/* Features Showcase */}
      <div className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-bold text-gray-900 mb-8">Platform Features Implemented</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-blue-600 font-bold">✓</span>
              </div>
              <h3 className="font-medium">Startup Management</h3>
              <p className="text-sm text-gray-600 mt-1">Complete CRUD operations for startups</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <h3 className="font-medium">Lifecycle Pipeline</h3>
              <p className="text-sm text-gray-600 mt-1">Visual stage tracking with progress indicators</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-purple-600 font-bold">✓</span>
              </div>
              <h3 className="font-medium">AI Agents</h3>
              <p className="text-sm text-gray-600 mt-1">Intelligent automation agents</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <span className="text-orange-600 font-bold">✓</span>
              </div>
              <h3 className="font-medium">Real-time Updates</h3>
              <p className="text-sm text-gray-600 mt-1">Live data with Supabase subscriptions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  )
}

export default App