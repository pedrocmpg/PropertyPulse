/**
 * Frontend Environment Configuration Module
 *
 * Loads and validates environment variables for the FII Dashboard frontend.
 * Provides centralized access to configuration like backend URL and refresh interval.
 *
 * Environment Variables:
 * - REACT_APP_BACKEND_URL: The backend proxy endpoint (e.g., http://localhost:3001)
 *   - Required: Yes
 *   - Default: None (must be explicitly set)
 *   - Validation: Must be a valid URL
 *
 * - REACT_APP_REFRESH_INTERVAL: Auto-refresh interval in milliseconds
 *   - Required: No
 *   - Default: 300000 (5 minutes)
 *   - Validation: Must be a positive integer
 *
 * Usage:
 * ```typescript
 * import { config, getBackendUrl, getRefreshInterval } from '@/config/environment';
 *
 * // Access configuration
 * const backendUrl = config.backendUrl;
 * const refreshInterval = config.refreshInterval;
 *
 * // Or use helper functions
 * const url = getBackendUrl();
 * const interval = getRefreshInterval();
 * ```
 */

/**
 * EnvironmentConfig interface
 * Represents the validated frontend configuration
 */
export interface EnvironmentConfig {
  backendUrl: string;
  refreshInterval: number;
  isDevelopment: boolean;
}

/**
 * Load and validate the backend URL from environment variables
 * Supports both REACT_APP_BACKEND_URL (Create React App) and
 * NEXT_PUBLIC_BACKEND_URL (Next.js) for compatibility
 *
 * @returns The backend URL, or throws error if not configured
 * @throws Error if REACT_APP_BACKEND_URL is not provided
 */
function loadBackendUrl(): string {
  // Try to load from process.env
  // In browser environment, this comes from build-time environment variables
  const backendUrl =
    typeof window !== 'undefined'
      ? // Client-side: use window/runtime environment
        (process.env.REACT_APP_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL)
      : // Server-side (Next.js): use build-time or runtime
        (process.env.REACT_APP_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL);

  if (!backendUrl || backendUrl.trim() === '') {
    throw new Error(
      'Missing required environment variable: REACT_APP_BACKEND_URL. ' +
        'Please set REACT_APP_BACKEND_URL in your .env file or deployment configuration. ' +
        'Example: REACT_APP_BACKEND_URL=http://localhost:3001',
    );
  }

  // Validate URL format
  try {
    new URL(backendUrl);
  } catch {
    throw new Error(
      `Invalid REACT_APP_BACKEND_URL format: "${backendUrl}". ` +
        'Must be a valid URL (e.g., http://localhost:3001 or https://api.example.com)',
    );
  }

  return backendUrl;
}

/**
 * Load and validate the refresh interval from environment variables
 * Defaults to 300000ms (5 minutes) if not provided
 *
 * @returns The refresh interval in milliseconds
 * @throws Error if REACT_APP_REFRESH_INTERVAL is provided but invalid
 */
function loadRefreshInterval(): number {
  const refreshIntervalStr = process.env.REACT_APP_REFRESH_INTERVAL;

  // Use default if not provided
  if (!refreshIntervalStr || refreshIntervalStr.trim() === '') {
    return 300000; // 5 minutes default
  }

  // Parse and validate
  const refreshInterval = parseInt(refreshIntervalStr, 10);

  if (isNaN(refreshInterval)) {
    throw new Error(
      `Invalid REACT_APP_REFRESH_INTERVAL: "${refreshIntervalStr}". ` +
        'Must be a positive integer representing milliseconds (e.g., 300000 for 5 minutes)',
    );
  }

  if (refreshInterval <= 0) {
    throw new Error(
      `Invalid REACT_APP_REFRESH_INTERVAL: ${refreshInterval}. ` +
        'Must be a positive integer greater than 0',
    );
  }

  return refreshInterval;
}

/**
 * Determine if the application is running in development mode
 * Checks NODE_ENV environment variable
 *
 * @returns True if running in development, false otherwise
 */
function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Initialize and validate the frontend environment configuration
 * Called once at application startup
 *
 * @returns The validated EnvironmentConfig object
 * @throws Error if any required environment variable is missing or invalid
 */
function initializeConfig(): EnvironmentConfig {
  try {
    const backendUrl = loadBackendUrl();
    const refreshInterval = loadRefreshInterval();
    const isDevelopment = isDevelopmentMode();

    const config: EnvironmentConfig = {
      backendUrl,
      refreshInterval,
      isDevelopment,
    };

    // Log configuration in development mode (without sensitive values)
    if (isDevelopment) {
      console.log('[FII Dashboard] Frontend environment configuration loaded:', {
        backendUrl,
        refreshInterval,
        isDevelopment,
      });
    }

    return config;
  } catch (error) {
    // Log configuration error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[FII Dashboard] Configuration Error:', errorMessage);

    // Re-throw error to prevent application startup with invalid config
    throw error;
  }
}

/**
 * Cached configuration object
 * Lazy-initialized on first access
 */
let cachedConfig: EnvironmentConfig | null = null;

/**
 * Get the frontend environment configuration
 * Lazy-initializes configuration on first access
 * Subsequent calls return cached configuration
 *
 * @returns The validated EnvironmentConfig object
 * @throws Error if configuration initialization failed
 */
export function getConfig(): EnvironmentConfig {
  if (cachedConfig === null) {
    cachedConfig = initializeConfig();
  }
  return cachedConfig;
}

/**
 * Helper function to get backend URL
 * Convenience wrapper around getConfig()
 *
 * @returns The backend proxy URL
 */
export function getBackendUrl(): string {
  return getConfig().backendUrl;
}

/**
 * Helper function to get refresh interval
 * Convenience wrapper around getConfig()
 *
 * @returns The refresh interval in milliseconds
 */
export function getRefreshInterval(): number {
  return getConfig().refreshInterval;
}

/**
 * Helper function to check if running in development mode
 * Convenience wrapper around getConfig()
 *
 * @returns True if in development mode, false otherwise
 */
export function isDevelopment(): boolean {
  return getConfig().isDevelopment;
}

// Export the config getter function as default
// This allows lazy loading of configuration without requiring it at module import time
export default getConfig;
