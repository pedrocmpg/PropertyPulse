# Configuration Module

This directory contains configuration modules for the FII Dashboard frontend application.

## Files

- **environment.ts** - Frontend environment configuration loader and validator
- **environment.test.ts** - Unit tests for environment configuration
- **ENVIRONMENT.md** - Detailed documentation for the environment configuration module

## Quick Start

### Setting up environment variables

Create a `.env.local` file in the root of the frontend directory:

```bash
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_REFRESH_INTERVAL=300000
```

### Using the configuration in your application

```typescript
// Option 1: Use helper functions (recommended)
import { getBackendUrl, getRefreshInterval } from '@/config/environment';

const backendUrl = getBackendUrl();
const refreshInterval = getRefreshInterval();

// Option 2: Use the getConfig function
import { getConfig } from '@/config/environment';

const config = getConfig();
console.log(config.backendUrl);
console.log(config.refreshInterval);
console.log(config.isDevelopment);
```

### Using with useFIIData hook

The `useFIIData` hook automatically uses the environment configuration:

```typescript
import { useFIIData } from '@/hooks/useFIIData';

// Uses REACT_APP_BACKEND_URL and REACT_APP_REFRESH_INTERVAL from environment
const { data, isLoading, error, refresh } = useFIIData(['MXRF11', 'HGLG11']);
```

## Environment Variables

### Required

- **REACT_APP_BACKEND_URL**: URL of the backend proxy (e.g., `http://localhost:3001`)

### Optional

- **REACT_APP_REFRESH_INTERVAL**: Auto-refresh interval in milliseconds (default: 300000 = 5 minutes)

## Error Handling

If required environment variables are missing, the application will fail at initialization with a clear error message indicating which variable is missing and how to set it.

See **ENVIRONMENT.md** for detailed error messages and troubleshooting.

## Testing

Run tests for the configuration module:

```bash
npm test src/config/environment.test.ts
```

## Configuration Flow

1. **Module Import**: When useFIIData or other components import the environment module, configuration is loaded and validated
2. **Validation**: REACT_APP_BACKEND_URL must be a valid URL; REACT_APP_REFRESH_INTERVAL must be a positive integer
3. **Caching**: Configuration is cached after first load for consistency across the application
4. **Default Values**: REACT_APP_REFRESH_INTERVAL defaults to 300000ms if not provided
5. **Error Handling**: Missing or invalid configuration throws clear error messages

## Deployment

For different deployment environments, set the appropriate environment variables:

### Development
```bash
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_REFRESH_INTERVAL=60000  # 1 minute for faster testing
```

### Staging
```bash
REACT_APP_BACKEND_URL=https://api-staging.example.com
REACT_APP_REFRESH_INTERVAL=300000  # 5 minutes
```

### Production
```bash
REACT_APP_BACKEND_URL=https://api.example.com
REACT_APP_REFRESH_INTERVAL=300000  # 5 minutes
```

## Architecture

The configuration module follows these principles:

1. **Single Responsibility**: Configuration management is isolated in one module
2. **Validation**: All configuration is validated at load time
3. **Immutability**: Configuration cannot be changed after initial load
4. **Centralization**: All parts of the application use the same configuration
5. **Clear Errors**: Missing or invalid configuration provides helpful error messages
6. **No External Dependencies**: Uses only native JavaScript APIs

## For Next.js Projects

Next.js has built-in support for environment variables with the `NEXT_PUBLIC_` prefix. The configuration module checks both:

1. `REACT_APP_BACKEND_URL` (Create React App style)
2. `NEXT_PUBLIC_BACKEND_URL` (Next.js style)

Both work, but using `NEXT_PUBLIC_BACKEND_URL` is recommended for Next.js projects.
