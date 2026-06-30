/**
 * Backend Environment Configuration Loader
 * Validates and loads environment variables on startup
 */

import { BackendConfig } from '../models/types';

function loadConfig(): BackendConfig {
  const requiredVars = ['BRAPI_TOKEN'];
  const missingVars = requiredVars.filter(
    (varName) => !process.env[varName] || process.env[varName]?.trim() === ''
  );

  if (missingVars.length > 0) {
    console.error(
      `Missing required environment variables: ${missingVars.join(', ')}`
    );
    console.error('Failed to start backend server.');
    process.exit(1);
  }

  return {
    BRAPI_TOKEN: process.env.BRAPI_TOKEN || '',
    BRAPI_BASE_URL: process.env.BRAPI_BASE_URL || 'https://brapi.dev/api/v2',
    BACKEND_PORT: parseInt(process.env.BACKEND_PORT || '3001', 10),
    NODE_ENV: (process.env.NODE_ENV ||
      'development') as 'development' | 'staging' | 'production',
    LOG_LEVEL: (process.env.LOG_LEVEL ||
      'info') as 'debug' | 'info' | 'warning' | 'error',
    CACHE_TTL_SECONDS: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10),
    REQUEST_TIMEOUT_MS: parseInt(
      process.env.REQUEST_TIMEOUT_MS || '10000',
      10
    ),
    MAX_RETRIES: parseInt(process.env.MAX_RETRIES || '3', 10),
  };
}

const config = loadConfig();

export default config;
