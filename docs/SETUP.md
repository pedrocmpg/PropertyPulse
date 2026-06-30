# FII Dashboard - Project Setup

This document describes the project structure and setup for the FII Dashboard application.

## Project Structure

```
PropertyPulse/
├── backend/                           # Node.js/Express backend proxy
│   ├── src/
│   │   ├── models/                    # TypeScript interfaces and types
│   │   │   ├── types.ts              # Core data models
│   │   │   └── types.test.ts         # Type validation tests
│   │   ├── config/                    # Configuration management
│   │   │   └── config.ts             # Environment configuration loader
│   │   ├── handlers/                  # Express request handlers (TODO)
│   │   ├── cache/                     # Cache management (TODO)
│   │   ├── errors/                    # Error handling (TODO)
│   │   └── index.ts                  # Server entry point
│   ├── dist/                          # Compiled JavaScript output
│   ├── package.json                   # Backend dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── jest.config.js                 # Jest test configuration
│   ├── .gitignore                     # Backend-specific git ignore
│   └── README.md                      # Backend documentation (TODO)
│
├── frontend/                          # React/Next.js frontend
│   ├── src/
│   │   ├── pages/                     # Next.js pages
│   │   │   ├── index.tsx             # Home page
│   │   │   ├── _app.tsx              # App wrapper
│   │   │   └── _document.tsx         # Document wrapper
│   │   ├── components/                # React components (TODO)
│   │   │   ├── DashboardLayout/
│   │   │   ├── FIICard/
│   │   │   ├── SearchInput/
│   │   │   ├── LoadingState/
│   │   │   ├── ErrorState/
│   │   │   ├── EmptyState/
│   │   │   ├── FIIDetailView/
│   │   │   └── ...
│   │   ├── hooks/                     # React hooks (TODO)
│   │   │   ├── useFIIData.ts
│   │   │   └── useUserPreferences.ts
│   │   ├── utils/                     # Utility functions (TODO)
│   │   │   ├── formatters.ts
│   │   │   ├── parser.ts
│   │   │   └── api.ts
│   │   ├── styles/                    # Global styles
│   │   │   └── globals.css
│   │   └── test/                      # Test configuration
│   │       └── setup.ts
│   ├── .next/                         # Next.js build output
│   ├── package.json                   # Frontend dependencies
│   ├── tsconfig.json                  # TypeScript configuration
│   ├── next.config.js                 # Next.js configuration
│   ├── vitest.config.ts               # Vitest configuration
│   ├── tailwind.config.ts             # Tailwind CSS configuration
│   ├── postcss.config.js              # PostCSS configuration
│   ├── .gitignore                     # Frontend-specific git ignore
│   └── README.md                      # Frontend documentation (TODO)
│
├── .kiro/                             # Kiro spec directory
│   └── specs/
│       └── fii-dashboard/
│           ├── tasks.md               # Implementation tasks
│           ├── design.md              # Technical design
│           ├── requirements.md        # User requirements
│           └── .config                # Spec configuration
│
├── .env.example                       # Environment variables template
├── .gitignore                         # Root-level git ignore
├── SETUP.md                           # This file
└── README.md                          # Project overview
```

## Shared Type Definitions

All TypeScript interfaces are defined in `backend/src/models/types.ts` and include:

- **ParsedFII**: FII data from brAPI response
- **FormattedFII**: Pretty-printed FII data for display
- **FIIData**: Base FII data interface
- **CacheEntry<T>**: Generic cache entry with metadata
- **CircuitBreakerState**: State machine for rate limiting
- **ErrorState**: Error information
- **APIResponse<T>**: Backend API response structure
- **CacheConfig**: Cache manager configuration
- **CircuitBreakerConfig**: Circuit breaker configuration
- **BackendConfig**: Backend environment configuration
- **FrontendConfig**: Frontend environment configuration
- **DashboardState**: Frontend dashboard state

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm 9+
- Windows PowerShell or bash shell

### Backend Setup

```bash
cd backend
npm install
npm run build      # Compile TypeScript to JavaScript
npm test          # Run Jest tests
npm run dev       # Start development server with ts-node
```

### Frontend Setup

```bash
cd frontend
npm install
npm run build     # Build Next.js production bundle
npm test          # Run Vitest tests
npm run dev       # Start development server
```

### Environment Configuration

1. Copy `.env.example` to `.env` in the root directory
2. Set the following required variables:
   - `BRAPI_TOKEN`: Your brAPI authentication token (REQUIRED)
   - `BACKEND_PORT`: Backend server port (default: 3001)
   - `REACT_APP_BACKEND_URL`: Frontend backend proxy URL (default: http://localhost:3001)

```bash
# .env template
BRAPI_TOKEN=your_brapi_token_here
BRAPI_BASE_URL=https://brapi.dev/api/v2
BACKEND_PORT=3001
NODE_ENV=development
LOG_LEVEL=info
CACHE_TTL_SECONDS=300
REQUEST_TIMEOUT_MS=10000
MAX_RETRIES=3
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_REFRESH_INTERVAL=300000
```

## Testing

### Backend Tests
```bash
cd backend
npm test              # Run all Jest tests
npm run test:watch   # Watch mode for development
npm run test:coverage # Generate coverage report
```

### Frontend Tests
```bash
cd frontend
npm test              # Run all Vitest tests
npm run test:watch   # Watch mode
npm run test:coverage # Generate coverage report
npm run test:ui      # Open Vitest UI
```

## Build and Start

### Backend
```bash
cd backend
npm run build        # Compile TypeScript
npm start           # Start production server
npm run dev         # Start development server
```

### Frontend
```bash
cd frontend
npm run build        # Build production bundle
npm start           # Start production server
npm run dev         # Start development server
```

## Code Quality

### TypeScript Configuration

Both backend and frontend use strict TypeScript settings:
- `strict: true` - Enables all type checking options
- `noUnusedLocals: true` - Errors on unused variables
- `noUnusedParameters: true` - Errors on unused parameters
- `noImplicitReturns: true` - Errors on missing returns
- `noFallthroughCasesInSwitch: true` - Errors on missing break in switch

### Code Coverage Targets

- **Backend**: Minimum 80% coverage, 95% for formatters
- **Frontend**: Minimum 85% coverage

## Key Features Implemented in Task 1

✅ Backend structure with Express and TypeScript
✅ Frontend structure with Next.js and React
✅ TypeScript interfaces for all data models
✅ Jest testing framework for backend
✅ Vitest testing framework for frontend with React Testing Library
✅ Tailwind CSS with dark mode theme tokens
✅ Environment configuration with .env.example
✅ Configuration loader with validation
✅ Initial tests validating interface definitions
✅ Build verification for both backend and frontend

## Next Steps

The following tasks are queued for implementation:

1. **Task 2**: Data formatters (currency, percentage, ratio) with property-based tests
2. **Task 3**: FII parser with round-trip validation
3. **Task 4**: Pretty-printer for formatted output
4. **Task 6**: Cache manager with per-symbol granularity
5. **Task 7**: Circuit breaker for rate limiting
6. **Task 8**: Request handler with brAPI integration
7. **Task 9**: Error handling and translation
8. **Task 11**: React hooks for data fetching (useFIIData)
9. **Task 12**: Frontend components (DashboardLayout, FIICard, etc.)
10. **Task 13+**: Additional features and integration

## Troubleshooting

### TypeScript Compilation Errors

If you see unused variable errors, ensure all imports are used or prefix with underscore:
```typescript
app.get('/health', (_req, res) => { ... })  // Prefix unused params
```

### Missing Dependencies

If `npm install` fails, try:
```bash
npm install --legacy-peer-deps
npm audit fix
```

### Port Already in Use

If port 3001 is in use, update BACKEND_PORT in `.env`:
```bash
BACKEND_PORT=3002
```

### Next.js Build Issues

If Next.js build fails with TypeScript errors, check for:
- Unused imports or variables
- Type mismatches
- Missing dependencies

Run `npm run build` with verbose output for more details.

## References

- **Backend**: Express.js, TypeScript, Jest
- **Frontend**: Next.js, React, Tailwind CSS, Vitest
- **Data Types**: TypeScript interfaces for type safety
- **Testing**: Jest for backend unit tests, Vitest for frontend
- **Styling**: Tailwind CSS with CSS custom properties for dark mode theme

---

Last updated: 2024
Project: FII Dashboard - Real Estate Fund Market Data Aggregator
