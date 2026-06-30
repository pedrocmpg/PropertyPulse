/**
 * RequestHandler middleware for FII Dashboard API
 * 
 * Responsibilities:
 * 1. Extract and validate symbol parameter from query string
 * 2. Retrieve BRAPI_TOKEN from environment (throw error if missing)
 * 3. Construct brAPI URL with proper symbol formatting
 * 4. Check cache first for valid data (bypass brAPI call if cache hit)
 * 5. Call brAPI with 10-second timeout if cache miss
 * 6. Parse brAPI response and skip invalid FII records
 * 7. Cache valid response per symbol for 5 minutes (granular caching)
 * 8. Strip sensitive headers from brAPI response before returning
 * 9. Return structured success/error response
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 1.1, 1.2, 1.7
 */

import { Request, Response } from 'express';
import config from '../config/config';
import { CacheManager } from '../cache/CacheManager';
import { CircuitBreaker } from '../cache/CircuitBreaker';
import { FIIParser, FIIPrettyPrinter } from '../models/types';
import { APIResponse, FIIData, CacheConfig, CircuitBreakerConfig } from '../models/types';
import Logger from '../utils/Logger';

/**
 * Sensitive headers that should be stripped from brAPI responses
 * before returning to frontend
 */
const SENSITIVE_HEADERS = [
  'authorization',
  'x-auth-token',
  'x-api-key',
  'set-cookie',
  'www-authenticate',
];

/**
 * Regex patterns for sensitive headers to strip
 */
const SENSITIVE_HEADER_PATTERNS = [
  /^x-auth-/i,      // X-Auth-* headers
  /^x-admin-/i,     // X-Admin-* headers
  /^x-internal-/i,  // X-Internal-* headers
  /^x-debug-/i,     // X-Debug-* headers
];

/**
 * Check if a header should be stripped from response
 */
function shouldStripHeader(headerName: string): boolean {
  const lowerName = headerName.toLowerCase();
  
  // Check against exact matches
  if (SENSITIVE_HEADERS.includes(lowerName)) {
    return true;
  }
  
  // Check against regex patterns
  for (const pattern of SENSITIVE_HEADER_PATTERNS) {
    if (pattern.test(headerName)) {
      return true;
    }
  }
  
  return false;
}

/**
 * RequestHandler class for managing FII data requests
 * Handles caching, brAPI communication, and error translation
 */
export class RequestHandler {
  private cacheManager: CacheManager<FIIData[]>;
  private circuitBreaker: CircuitBreaker;
  private logger: typeof Logger;

  constructor() {
    // Initialize cache manager with config from environment
    const cacheConfig: CacheConfig = {
      ttlSeconds: config.CACHE_TTL_SECONDS,
      maxEntriesPerSymbol: 1,  // One entry per symbol
      maxTotalEntries: 500,    // Max 500 unique symbols across all users
      evictionStrategy: 'LRU',
    };
    
    this.cacheManager = new CacheManager(cacheConfig);
    
    // Initialize circuit breaker for rate limiting
    const circuitBreakerConfig: CircuitBreakerConfig = {
      openDurationMs: 60000,      // 60 seconds open duration
      halfOpenTestRequests: 3,    // 3 test requests in HALF_OPEN
    };
    
    this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig);
    this.logger = Logger;
  }

  /**
   * Main middleware handler for GET /fii/indicators
   * Validates input, checks cache, calls brAPI if needed, and returns formatted response
   * 
   * @param req - Express request object
   * @param res - Express response object
   */
  public async handleRequest(req: Request, res: Response): Promise<void> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();
    
    try {
      // Step 1: Extract and validate symbol parameter
      const symbols = this.extractAndValidateSymbols(req);
      this.logger.debugData(`[${requestId}] Received request for symbols`, { symbols });
      
      // Step 2: Check circuit breaker status
      if (!this.circuitBreaker.canAttempt()) {
        this.logger.warn(`[${requestId}] Circuit breaker is OPEN - rate limited`);
        const duration = Date.now() - startTime;
        this.logger.logAPIRequest({
          requestId,
          method: 'GET',
          path: '/fii/indicators',
          query: { symbols: symbols.join(',') },
          statusCode: 429,
          duration,
        });
        return this.sendErrorResponse(
          res,
          429,
          'RATE_LIMITED',
          'Too many requests. Please wait a moment and try again.',
          requestId
        );
      }
      
      // Step 3: Build cache key (symbols joined and sorted for consistency)
      const cacheKey = symbols.slice().sort().join(',');
      
      // Step 4: Check cache first (unless refresh flag is set)
      const refreshFlag = req.query.refresh === 'true';
      let cachedData = null;
      
      if (!refreshFlag) {
        cachedData = this.cacheManager.get(cacheKey);
        if (cachedData) {
          // Log cache hit
          this.logger.logCacheOperation({
            operation: 'hit',
            symbol: cacheKey,
          });
          const duration = Date.now() - startTime;
          this.logger.logAPIRequest({
            requestId,
            method: 'GET',
            path: '/fii/indicators',
            query: { symbols: symbols.join(',') },
            statusCode: 200,
            duration,
          });
          return this.sendSuccessResponse(res, cachedData);
        }
      }
      
      // Log cache miss
      this.logger.logCacheOperation({
        operation: 'miss',
        symbol: cacheKey,
      });
      
      // Step 5: Fetch from brAPI with timeout
      const brAPIResponse = await this.fetchFromBrAPI(symbols, requestId);
      
      // Step 6: Parse response and extract valid FII records
      const { fiis, errors } = FIIParser.parsebrAPIResponse(brAPIResponse);
      
      if (errors && errors.length > 0) {
        this.logger.warnData(`[${requestId}] Parse errors encountered`, {
          count: errors.length,
          errors: errors.map(e => ({ field: e.field, reason: e.reason })),
        });
      }
      
      if (fiis.length === 0) {
        this.logger.warn(`[${requestId}] No valid FII records after parsing`);
        const duration = Date.now() - startTime;
        this.logger.logAPIRequest({
          requestId,
          method: 'GET',
          path: '/fii/indicators',
          query: { symbols: symbols.join(',') },
          statusCode: 400,
          duration,
        });
        return this.sendErrorResponse(
          res,
          400,
          'INVALID_RESPONSE',
          'No valid FII data found in brAPI response',
          requestId
        );
      }
      
      // Step 7: Pretty-print FII data for response
      const formattedFIIs = fiis.map(fii => FIIPrettyPrinter.prettyPrintFII(fii));
      
      // Step 8: Cache the valid response per symbol (granular caching)
      // Cache the raw FII data, not the formatted version
      this.cacheManager.set(cacheKey, fiis, config.CACHE_TTL_SECONDS);
      // Log cache set operation
      this.logger.logCacheOperation({
        operation: 'set',
        symbol: cacheKey,
        ttl: config.CACHE_TTL_SECONDS,
      });
      
      // Step 9: Record success with circuit breaker
      this.circuitBreaker.recordSuccess();
      
      // Step 10: Send success response with API request logging
      const duration = Date.now() - startTime;
      this.logger.logAPIRequest({
        requestId,
        method: 'GET',
        path: '/fii/indicators',
        query: { symbols: symbols.join(',') },
        statusCode: 200,
        duration,
      });
      this.sendSuccessResponse(res, formattedFIIs);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      this.handleError(error, req, res, requestId, duration);
    }
  }

  /**
   * Extract and validate symbol parameter from query string
   * Validates that symbols are non-empty and properly formatted
   * 
   * @param req - Express request object
   * @returns Array of valid symbol strings
   * @throws Error if symbols are invalid or missing
   */
  private extractAndValidateSymbols(req: Request): string[] {
    const symbolsParam = req.query.symbols;
    
    // Check if symbols parameter exists
    if (!symbolsParam || typeof symbolsParam !== 'string') {
      throw {
        statusCode: 400,
        code: 'MISSING_SYMBOLS',
        message: 'Missing required query parameter: symbols',
      };
    }
    
    // Split and trim symbols
    const symbols = symbolsParam
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // Validate that at least one symbol is provided
    if (symbols.length === 0) {
      throw {
        statusCode: 400,
        code: 'EMPTY_SYMBOLS',
        message: 'At least one FII symbol must be provided',
      };
    }
    
    // Validate symbol format (alphanumeric, max 10 chars)
    for (const symbol of symbols) {
      if (!/^[A-Z0-9]{2,10}$/.test(symbol)) {
        throw {
          statusCode: 400,
          code: 'INVALID_SYMBOL_FORMAT',
          message: `Invalid symbol format: ${symbol}. Symbols must be 2-10 alphanumeric characters.`,
        };
      }
    }
    
    return symbols;
  }

  /**
   * Fetch FII data from brAPI with timeout
   * Constructs the brAPI URL and makes HTTP request
   * 
   * @param symbols - Array of FII symbols to fetch
   * @param requestId - Request ID for logging
   * @returns Parsed brAPI response
   * @throws Error if request fails or times out
   */
  private async fetchFromBrAPI(symbols: string[], requestId: string): Promise<any> {
    // Step 1: Validate BRAPI_TOKEN is set
    if (!config.BRAPI_TOKEN || config.BRAPI_TOKEN.trim() === '') {
      this.logger.error(`[${requestId}] Missing BRAPI_TOKEN in environment`);
      throw {
        statusCode: 500,
        code: 'MISSING_TOKEN',
        message: 'Server configuration error: missing API token',
      };
    }
    
    // Step 2: Construct brAPI URL
    const symbolsQuery = symbols.join(',');
    const brAPIUrl = `${config.BRAPI_BASE_URL}/fii/indicators?symbols=${encodeURIComponent(symbolsQuery)}`;
    
    this.logger.debugData(`[${requestId}] Calling brAPI`, {
      method: 'GET',
      url: brAPIUrl.replace(config.BRAPI_TOKEN, 'REDACTED'),
      symbols,
    });
    
    try {
      // Step 3: Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        config.REQUEST_TIMEOUT_MS
      );
      
      // Step 4: Make HTTP request with Bearer token
      const response = await fetch(brAPIUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.BRAPI_TOKEN}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      // Clear timeout
      clearTimeout(timeoutId);
      
      // Step 5: Handle HTTP error responses
      if (!response.ok) {
        const statusCode = response.status;
        
        this.logger.warnData(`[${requestId}] brAPI returned error status`, {
          statusCode,
          symbols,
        });
        
        // Handle rate limiting
        if (statusCode === 429) {
          this.logger.error(`[${requestId}] brAPI rate limit hit (429)`);
          this.circuitBreaker.on429Error();
          throw {
            statusCode: 429,
            code: 'RATE_LIMITED',
            message: 'brAPI rate limit exceeded',
          };
        }
        
        // Handle authentication errors
        if (statusCode === 401) {
          this.logger.error(`[${requestId}] brAPI authentication failed (401)`);
          throw {
            statusCode: 401,
            code: 'AUTH_FAILED',
            message: 'Authentication failed. The server token may have expired. Please contact support.',
          };
        }
        
        // Handle other error responses
        throw {
          statusCode: statusCode >= 500 ? 503 : statusCode,
          code: statusCode >= 500 ? 'SERVICE_UNAVAILABLE' : 'BRAPI_ERROR',
          message: `brAPI returned error: ${statusCode}`,
        };
      }
      
      // Step 6: Parse JSON response
      let data: any;
      try {
        data = await response.json();
      } catch (error) {
        if (error instanceof SyntaxError) {
          this.logger.error(`[${requestId}] Invalid JSON from brAPI`);
          throw {
            statusCode: 400,
            code: 'INVALID_JSON',
            message: 'Invalid JSON response from brAPI',
          };
        }
        throw error;
      }
      
      this.logger.debugData(`[${requestId}] Successfully received brAPI response`, {
        statusCode: response.status,
        records: data?.data?.length || 0,
      });
      
      return data;
      
    } catch (error: any) {
      // Handle timeout
      if (error.name === 'AbortError') {
        this.logger.error(`[${requestId}] Request to brAPI timed out after ${config.REQUEST_TIMEOUT_MS}ms`);
        throw {
          statusCode: 504,
          code: 'TIMEOUT',
          message: 'Unable to fetch FII data. Please check your connection and try again later.',
        };
      }
      
      // Handle network errors
      if (error.code === 'ECONNREFUSED' || error.message?.includes('connect')) {
        this.logger.error(`[${requestId}] Failed to connect to brAPI: ${error.message}`);
        throw {
          statusCode: 503,
          code: 'SERVICE_UNAVAILABLE',
          message: 'The FII data service is temporarily unavailable. Please try again later.',
        };
      }
      
      // Re-throw known errors
      if (error.statusCode) {
        throw error;
      }
      
      // Unexpected error
      this.logger.errorData(`[${requestId}] Unexpected error calling brAPI`, {
        message: error.message,
        symbols,
      });
      throw {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      };
    }
  }

  /**
   * Send success response with FII data
   * Strips sensitive headers from response
   * 
   * @param res - Express response object
   * @param data - FII data to return
   */
  private sendSuccessResponse(res: Response, data: any[]): void {
    const response: APIResponse<any> = {
      success: true,
      data,
    };
    
    // Strip sensitive headers from response before sending
    this.stripSensitiveHeaders(res);
    
    res.status(200).json(response);
  }

  /**
   * Send error response with structured error object
   * 
   * @param res - Express response object
   * @param statusCode - HTTP status code
   * @param code - Error code identifier
   * @param message - User-friendly error message
   * @param requestId - Request ID for tracking
   */
  private sendErrorResponse(
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    requestId: string
  ): void {
    const errorResponse: APIResponse<never> = {
      success: false,
      error: {
        code,
        message,
        statusCode,
        timestamp: new Date(),
      },
    };
    
    // Strip sensitive headers from response before sending
    this.stripSensitiveHeaders(res);
    
    res.status(statusCode).json(errorResponse);
    this.logger.info(`[${requestId}] Sent error response: ${code} (${statusCode})`);
  }

  /**
   * Strip sensitive headers from Express response
   * Prevents information leakage before response is sent to client
   * 
   * @param res - Express response object
   */
  private stripSensitiveHeaders(res: Response): void {
    // Get all header names
    const headerNames = Object.keys(res.getHeaders());
    
    // Remove sensitive headers
    for (const headerName of headerNames) {
      if (shouldStripHeader(headerName)) {
        res.removeHeader(headerName);
      }
    }
  }

  /**
   * Handle errors that occur during request processing
   * Logs error and sends appropriate error response
   * 
   * @param error - Error object
   * @param req - Express request object
   * @param res - Express response object
   * @param requestId - Request ID for logging
   * @param duration - Request duration in milliseconds
   */
  private handleError(
    error: any,
    req: Request,
    res: Response,
    requestId: string,
    duration: number
  ): void {
    const statusCode = error.statusCode || 500;
    const code = error.code || 'INTERNAL_ERROR';
    let message = error.message || 'An unexpected error occurred';
    
    // Extract symbols from request for logging
    const symbolsParam = req.query.symbols;
    const symbols = typeof symbolsParam === 'string' ? symbolsParam.split(',') : [];
    
    // Log error with context
    this.logger.logError({
      code,
      message,
      statusCode,
      requestId,
      symbols,
      stack: Logger.getLevel() === 'debug' ? error.stack : undefined,
      context: {
        duration,
        path: req.path,
        method: req.method,
      },
    });
    
    // Log API request with error status
    this.logger.logAPIRequest({
      requestId,
      method: 'GET',
      path: '/fii/indicators',
      query: { symbols: symbols.join(',') },
      statusCode,
      duration,
    });
    
    // Record failure with circuit breaker if applicable
    if (statusCode === 429) {
      this.circuitBreaker.recordFailure();
    }
    
    // Handle SyntaxError for invalid JSON
    if (error instanceof SyntaxError) {
      return this.sendErrorResponse(
        res,
        400,
        'INVALID_JSON',
        'Invalid request format',
        requestId
      );
    }
    
    // Map error to user-friendly message if not already set
    if (!error.statusCode) {
      return this.sendErrorResponse(
        res,
        500,
        'INTERNAL_ERROR',
        'An unexpected error occurred. Please try again later.',
        requestId
      );
    }
    
    // Send error response with mapped status and message
    this.sendErrorResponse(res, statusCode, code, message, requestId);
  }

  /**
   * Generate a unique request ID for tracking and logging
   * Format: timestamp-random (e.g., 1705321845-abc123)
   * 
   * @returns Unique request ID string
   */
  private generateRequestId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * Get cache statistics (for monitoring and debugging)
   * 
   * @returns Cache statistics object
   */
  public getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * Get circuit breaker state (for monitoring and debugging)
   * 
   * @returns Circuit breaker state
   */
  public getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }

  /**
   * Clear all cache entries (useful for testing and manual reset)
   */
  public clearCache(): void {
    this.cacheManager.clear();
    this.logger.info('Cache cleared manually');
  }
}

export default RequestHandler;

