# Zero Startup Platform

A modern AI-powered platform for zero-person startups built with Vite, React, TypeScript, and Tailwind CSS.

## Tech Stack

- **Frontend Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Zustand with persistence
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v7
- **Backend**: Supabase (ready for integration)
- **UI Components**: Headless UI, Recharts, Lucide Icons

## Project Structure

```
src/
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx       # Main application layout with sidebar
│   ├── ui/                      # UI components (ready for expansion)
│   └── features/                # Feature-specific components
├── lib/
│   └── supabase.ts             # Supabase client configuration
├── hooks/                       # Custom React hooks
├── pages/
│   ├── Dashboard.tsx           # Dashboard page
│   ├── Agents.tsx              # AI Agents management
│   ├── Tasks.tsx               # Task management
│   ├── Workflows.tsx           # Workflow automation
│   ├── Analytics.tsx           # Analytics dashboard
│   └── Settings.tsx            # Application settings
├── services/                    # API services
├── store/
│   └── index.ts                # Zustand store configuration
├── types/
│   └── index.ts                # TypeScript type definitions
├── utils/                       # Utility functions
├── App.tsx                      # Main application component
├── main.tsx                     # Application entry point
└── index.css                    # Global styles with Tailwind

```

## Features

- ✅ Modern React 19 with TypeScript
- ✅ Vite for lightning-fast development
- ✅ Tailwind CSS with custom design system
- ✅ Dark mode support
- ✅ Responsive design
- ✅ Client-side routing
- ✅ State management with persistence
- ✅ Type-safe development with strict TypeScript
- ✅ Path aliases for cleaner imports
- ✅ Environment variables configuration
- ✅ Supabase integration ready

## Getting Started

1. Copy `.env.example` to `.env` and fill in your environment variables:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Environment Variables

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `VITE_CLAUDE_API_KEY`: Claude API key for AI features
- `VITE_APP_NAME`: Application name
- `VITE_APP_URL`: Application URL
- `VITE_ENABLE_ANALYTICS`: Enable/disable analytics
- `VITE_ENABLE_TELEMETRY`: Enable/disable telemetry

## Type Definitions

The project includes comprehensive TypeScript types for:
- **Agent**: AI agent configuration and metrics
- **Task**: Task management with priorities and dependencies
- **Workflow**: Workflow automation with scheduling
- **User**: User profile and subscription management

## Development

The project uses strict TypeScript configuration with:
- Strict mode enabled
- No implicit returns
- No unchecked indexed access
- Exact optional property types
- Path mapping for cleaner imports

## Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run lint`: Run ESLint

## Next Steps

1. Set up Supabase database schema
2. Implement authentication flow
3. Build out AI agent functionality
4. Create task automation features
5. Implement workflow builder
6. Add analytics dashboards