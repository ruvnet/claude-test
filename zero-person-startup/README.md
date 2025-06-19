# Zero Person Startup System

An autonomous business system that operates with minimal human intervention, powered by AI and automation.

## Overview

The Zero Person Startup system consists of four main business modules integrated through an event-driven architecture:

- **Customer Service**: Automated chatbot, ticket management, and FAQ system
- **Operations**: Inventory management, order processing, and fulfillment automation
- **Analytics**: KPI tracking, automated reporting, and business insights
- **Marketing**: Campaign management, content generation, and social media automation

## Architecture

```
zero-person-startup/
├── modules/              # Business modules
│   ├── customer-service/ # Chatbot, tickets, FAQ
│   ├── operations/       # Orders, inventory, fulfillment
│   ├── analytics/        # KPIs, reports, dashboards
│   └── marketing/        # Campaigns, content, social
├── integration/          # Integration layer
│   ├── event-bus/        # Event-driven communication
│   ├── api-gateway/      # External API management
│   └── message-queue/    # Async task processing
└── scripts/              # Startup and utility scripts
    └── startup.ts        # Main system initializer
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- TypeScript 5+

### Installation

```bash
cd zero-person-startup
npm install
```

### Running the System

```bash
# Start in development mode
npm start

# Start with watch mode (auto-restart on changes)
npm run dev
```

### Environment Variables

```bash
NODE_ENV=development      # Environment: development, staging, production
PORT=3000                 # API Gateway port
HOST=localhost            # API Gateway host
```

## API Endpoints

Once started, the system exposes the following API endpoints:

### System
- `GET /api/status` - System status and health check
- `GET /api/metrics` - System metrics
- `GET /api/docs` - API documentation

### Customer Service
- `POST /api/chat/start` - Start chat session
- `POST /api/tickets` - Create support ticket
- `GET /api/faq/search?q={query}` - Search FAQ

### Operations
- `POST /api/orders` - Create order
- `GET /api/orders/:orderId` - Get order status
- `GET /api/inventory/:productId` - Check inventory

### Analytics
- `GET /api/analytics/dashboard/:id` - Get dashboard data
- `GET /api/analytics/kpis` - List all KPIs
- `POST /api/analytics/reports/generate` - Generate report

### Marketing
- `POST /api/campaigns` - Create campaign
- `POST /api/content/generate` - Generate content
- `POST /api/social/schedule` - Schedule social post

## Module Features

### Customer Service Module
- **Chatbot**: AI-powered conversational interface
- **Ticket Management**: Automatic routing and prioritization
- **FAQ System**: Self-learning knowledge base

### Operations Module
- **Order Processing**: Automated order lifecycle management
- **Inventory Management**: Real-time stock tracking and reordering
- **Fulfillment**: Automated picking, packing, and shipping

### Analytics Module
- **KPI Tracking**: Real-time business metrics
- **Automated Reports**: Scheduled and on-demand reporting
- **Insights Engine**: Anomaly detection and trend analysis

### Marketing Module
- **Campaign Management**: Multi-channel campaign orchestration
- **Content Generation**: AI-powered content creation
- **Social Media**: Automated posting and engagement

## Integration Features

### Event Bus
- Pub/sub messaging between modules
- Event sourcing and replay
- Dead letter queue handling

### API Gateway
- Rate limiting and authentication
- Request routing and load balancing
- External service integration

### Message Queue
- Async task processing
- Job scheduling and cron tasks
- Priority queue management

## Configuration

Each module can be configured through the startup script:

```typescript
const system = new ZeroPersonStartup({
  modules: {
    customerService: true,
    operations: true,
    analytics: true,
    marketing: true
  },
  integration: {
    eventBus: true,
    apiGateway: true,
    messageQueue: true
  }
});
```

## Development

### Adding New Features

1. Create service in appropriate module
2. Register with module index
3. Add API routes if needed
4. Setup event handlers
5. Configure message queue consumers

### Testing

```bash
npm test
```

### Building

```bash
npm run build
```

## Monitoring

The system provides comprehensive monitoring through:

- Real-time metrics dashboard
- Event stream monitoring
- Queue depth tracking
- Error alerting
- Performance analytics

## License

MIT