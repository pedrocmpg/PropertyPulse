# Frontend Environment Configuration

This module provides centralized management of frontend environment variables for the FII Dashboard application.

## Overview

The `environment.ts` module loads and validates environment variables at application startup, ensuring that the application has all required configuration before initialization. This prevents runtime errors from missing or invalid configuration.

## Environment Variables

### REACT_APP_BACKEND_URL (Required)

The URL of the backend proxy server that the frontend communicates with.

- **Type**: string (valid URL)
- **Required**: Yes
- **Default**: None
- **Example**: `http://localhost:3001` or `https://api.example.com`
- **Validation**: Must be a valid URL (validated using native `URL` constructor)

**Usage in .env file:**
```bash
REACT_APP_BACKEND_URL=http://localhost:3001
```

### REACT_APP_REFRESH_INTERVAL (Optional)

The interval (in milliseconds) at which the dashboard automatically refreshes FII data.

- **Type**: integer (milliseconds)
- **Required**: No
- **Default**: `300000` (5 minutes)
- **Validation**: Must be a positive integer
- **Example**: `60000` (1 minute), `300000` (5 minutes), `3600000` (1 hour)

**Usage in .env file:**
```bash
REACT_APP_REFRESH_INTERVAL=300000
```

## API Reference

### `getConfig(): EnvironmentConfig`

Returns the validated configuration object. Configuration is loaded and validated once on first call, then cached for subsequent calls.

```typescript
import { getConfig } from '@/config/environment';

const config = getConfig();
console.log(config.backendUrl); // "http://localhost:3001"
console.log(config.refreshInterval); // 300000
console.log(config.isDevelopment); // true or false
```

### `getBackendUrl(): string`

Returns the backend URL. Convenience wrapper around `getConfig()`.

```typescript
import { getBackendUrl } from '@/config/environment';

const backendUrl = getBackendUrl();
// Use in API calls
fetch(`${backendUrl}/api/fii/indicators?symbols=MXRF11`);
```

### `getRefreshInterval(): number`

Returns the refresh interval in milliseconds. Convenience wrapper around `getConfig()`.

```typescript
import { getRefreshInterval } from '@/config/environment';

const interval = getRefreshInterval();
setInterval(() => {
  // Refresh FII data
}, interval);
```

### `isDevelopment(): boolean`

Returns whether the application is running in development mode. Convenience wrapper around `getConfig()`.

```typescript
import { isDevelopment } from '@/config/environment';

if (isDevelopment()) {
  console.log('Development mode enabled');
}
```

### `config: EnvironmentConfig`

Default exported configuration object (eagerly loaded on import).

```typescript
import { config } from '@/config/environment';

console.log(config.backendUrl);
console.log(config.refreshInterval);
console.log(config.isDevelopment);
```

## EnvironmentConfig Interface

```typescript
export interface EnvironmentConfig {
  backendUrl: string;      // Backend proxy URL
  refreshInterval: number; // Auto-refresh interval in milliseconds
  isDevelopment: boolean;  // Is running in development mode
}
```

## Usage in useFIIData Hook

The `useFIIData` hook uses the environment configuration to determine:

1. **Backend URL**: Where to send API requests
2. **Refresh Interval**: How often to automatically refresh FII data (can be overridden per hook instance)

```typescript
import { useFIIData } from '@/hooks/useFIIData';

// Uses environment configuration for backend URL and refresh interval
const { data, isLoading, error, refresh } = useFIIData(['MXRF11', 'HGLG11']);

// Or override refresh interval for specific hook instance
const { data, isLoading, error, refresh } = useFIIData(['MXRF11'], {
  refreshInterval: 60000, // 1 minute instead of default 5 minutes
});
```

## Error Handling

### Missing REACT_APP_BACKEND_URL

If `REACT_APP_BACKEND_URL` is not set, the module throws an error:

```
Error: Missing required environment variable: REACT_APP_BACKEND_URL.
Please set REACT_APP_BACKEND_URL in your .env file or deployment configuration.
Example: REACT_APP_BACKEND_URL=http://localhost:3001
```

**Resolution**: Add `REACT_APP_BACKEND_URL` to your `.env` file or environment configuration.

### Invalid REACT_APP_BACKEND_URL Format

If `REACT_APP_BACKEND_URL` is not a valid URL, the module throws an error:

```
Error: Invalid REACT_APP_BACKEND_URL format: "not-a-url".
Must be a valid URL (e.g., http://localhost:3001 or https://api.example.com)
```

**Resolution**: Ensure `REACT_APP_BACKEND_URL` is a valid URL starting with `http://` or `https://`.

### Invalid REACT_APP_REFRESH_INTERVAL Format

If `REACT_APP_REFRESH_INTERVAL` is not a positive integer, the module throws an error:

```
Error: Invalid REACT_APP_REFRESH_INTERVAL: "not-a-number".
Must be a positive integer representing milliseconds (e.g., 300000 for 5 minutes)
```

**Resolution**: Ensure `REACT_APP_REFRESH_INTERVAL` is a positive integer.

## Configuration in Different Environments

### Development

**.env.local** (or **.env**)
```bash
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_REFRESH_INTERVAL=60000
NODE_ENV=development
```

### Staging

**.env.staging**
```bash
REACT_APP_BACKEND_URL=https://api-staging.example.com
REACT_APP_REFRESH_INTERVAL=300000
NODE_ENV=production
```

### Production

**.env.production**
```bash
REACT_APP_BACKEND_URL=https://api.example.com
REACT_APP_REFRESH_INTERVAL=300000
NODE_ENV=production
```

## For Next.js Applications

Next.js supports both `REACT_APP_*` and `NEXT_PUBLIC_*` prefixes. The configuration module checks both:

1. First: `REACT_APP_BACKEND_URL`
2. Fallback: `NEXT_PUBLIC_BACKEND_URL`

This ensures compatibility with both Create React App and Next.js projects.

```bash
# In Next.js .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## Testing

The environment configuration module includes unit tests that validate:

- URL validation (HTTP, HTTPS, with ports, with paths)
- Refresh interval parsing and validation
- Development mode detection
- Error messages clarity
- Default values

Run tests with:
```bash
npm test src/config/environment.test.ts
```

## Logging

In development mode, the configuration module logs the loaded configuration to the browser console:

```
[FII Dashboard] Frontend environment configuration loaded: {
  backendUrl: 'http://localhost:3001',
  refreshInterval: 60000,
  isDevelopment: true
}
```

This is useful for debugging configuration issues during development.

## Thread Safety and Caching

The configuration is lazy-loaded on first access and cached to ensure:

1. **Single initialization**: Configuration is validated only once
2. **Consistency**: All parts of the application use the same configuration
3. **Performance**: No repeated validation or parsing

## Dependencies

The module uses only native JavaScript APIs:

- `URL` constructor for URL validation
- `parseInt` for parsing refresh interval
- `process.env` for environment variable access

No external dependencies are required.
