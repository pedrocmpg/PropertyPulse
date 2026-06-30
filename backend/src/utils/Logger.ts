/**
 * Logger utility for structured logging
 * Supports configurable log levels, timestamps, and structured data
 * 
 * Features:
 * - Log API requests: method, path, query, response status, duration
 * - Log cache operations: hit/miss, symbol, TTL
 * - Log errors: code, message, stack trace (debug mode only), context
 * - Prevent duplicate error logs within 60s window
 * - Configurable log levels (debug, info, warning, error)
 */

type LogLevel = 'debug' | 'info' | 'warning' | 'error';

interface LoggerConfig {
  level: LogLevel;
}

/**
 * API Request log entry
 */
interface APIRequestLog {
  requestId?: string;
  method: string;
  path: string;
  query?: Record<string, any>;
  statusCode: number;
  duration: number; // milliseconds
  timestamp?: Date;
}

/**
 * Cache operation log entry
 */
interface CacheOperationLog {
  operation: 'hit' | 'miss' | 'set' | 'delete' | 'clear';
  symbol?: string;
  ttl?: number;
  timestamp?: Date;
}

/**
 * Error log entry with context
 */
interface ErrorLog {
  code: string;
  message: string;
  statusCode?: number;
  requestId?: string;
  symbols?: string[];
  stack?: string; // Only included in debug mode
  context?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Logger singleton for backend logging
 * Respects NODE_ENV and LOG_LEVEL environment variables
 */
class LoggerService {
  private level: LogLevel;
  private lastErrorLog: Map<string, number> = new Map();
  private readonly ERROR_DEDUP_WINDOW = 60000; // 60 seconds

  constructor(config?: LoggerConfig) {
    this.level = (process.env.LOG_LEVEL as LogLevel) || config?.level || 'info';
  }

  /**
   * Check if a message should be logged based on current log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warning', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log message with timestamp
   */
  private formatMessage(level: LogLevel, message: string): string {
    const timestamp = new Date().toISOString();
    const levelUpper = level.toUpperCase().padEnd(7);
    return `[${timestamp}] [${levelUpper}] ${message}`;
  }

  /**
   * Format structured data as JSON string
   */
  private formatData(data: Record<string, any>): string {
    try {
      return JSON.stringify(data);
    } catch {
      return '[Unable to serialize data]';
    }
  }

  /**
   * Log debug message
   */
  public debug(message: string): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message));
    }
  }

  /**
   * Log debug message with structured data
   */
  public debugData(message: string, data: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      const formattedData = this.formatData(data);
      console.debug(this.formatMessage('debug', `${message} ${formattedData}`));
    }
  }

  /**
   * Log info message
   */
  public info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message));
    }
  }

  /**
   * Log info message with structured data
   */
  public infoData(message: string, data: Record<string, any>): void {
    if (this.shouldLog('info')) {
      const formattedData = this.formatData(data);
      console.log(this.formatMessage('info', `${message} ${formattedData}`));
    }
  }

  /**
   * Log warning message
   */
  public warn(message: string): void {
    if (this.shouldLog('warning')) {
      console.warn(this.formatMessage('warning', message));
    }
  }

  /**
   * Log warning message with structured data
   */
  public warnData(message: string, data: Record<string, any>): void {
    if (this.shouldLog('warning')) {
      const formattedData = this.formatData(data);
      console.warn(this.formatMessage('warning', `${message} ${formattedData}`));
    }
  }

  /**
   * Log error message
   * Prevents duplicate errors from being logged more than once per 60s window
   */
  public error(message: string): void {
    if (this.shouldLog('error')) {
      // Check if this error was recently logged
      const lastLogTime = this.lastErrorLog.get(message);
      const now = Date.now();
      
      if (!lastLogTime || (now - lastLogTime) > this.ERROR_DEDUP_WINDOW) {
        console.error(this.formatMessage('error', message));
        this.lastErrorLog.set(message, now);
      }
    }
  }

  /**
   * Log error message with structured data
   * Prevents duplicate errors from being logged more than once per 60s window
   */
  public errorData(message: string, data: Record<string, any>): void {
    if (this.shouldLog('error')) {
      const deduplicationKey = `${message}:${JSON.stringify(data)}`;
      const lastLogTime = this.lastErrorLog.get(deduplicationKey);
      const now = Date.now();
      
      if (!lastLogTime || (now - lastLogTime) > this.ERROR_DEDUP_WINDOW) {
        const formattedData = this.formatData(data);
        console.error(this.formatMessage('error', `${message} ${formattedData}`));
        this.lastErrorLog.set(deduplicationKey, now);
      }
    }
  }

  /**
   * Log API request with method, path, query, status, and duration
   * 
   * @param log - API request log entry with method, path, query, statusCode, duration
   */
  public logAPIRequest(log: APIRequestLog): void {
    if (this.shouldLog('info')) {
      const { requestId, method, path, query, statusCode, duration } = log;
      const queryStr = query ? this.formatData(query) : 'none';
      const message = requestId
        ? `[${requestId}] API ${method} ${path} query=${queryStr} status=${statusCode} duration=${duration}ms`
        : `API ${method} ${path} query=${queryStr} status=${statusCode} duration=${duration}ms`;
      console.log(this.formatMessage('info', message));
    }
  }

  /**
   * Log cache operation (hit, miss, set, delete, clear)
   * 
   * @param log - Cache operation log entry with operation, symbol, ttl
   */
  public logCacheOperation(log: CacheOperationLog): void {
    if (this.shouldLog('debug')) {
      const { operation, symbol, ttl } = log;
      const symbolStr = symbol ? ` symbol=${symbol}` : '';
      const ttlStr = ttl ? ` ttl=${ttl}s` : '';
      const message = `Cache ${operation}${symbolStr}${ttlStr}`;
      console.debug(this.formatMessage('debug', message));
    }
  }

  /**
   * Log error with code, message, context, and stack trace (debug mode only)
   * Includes request ID, symbols, and other relevant context
   * 
   * @param log - Error log entry with code, message, statusCode, requestId, symbols, stack, context
   */
  public logError(log: ErrorLog): void {
    if (this.shouldLog('error')) {
      const { code, message, statusCode, requestId, symbols, stack, context } = log;
      
      // Build error message
      let errorMsg = `Error ${code}: ${message}`;
      if (statusCode) {
        errorMsg += ` (${statusCode})`;
      }
      if (requestId) {
        errorMsg = `[${requestId}] ${errorMsg}`;
      }
      if (symbols && symbols.length > 0) {
        errorMsg += ` symbols=[${symbols.join(', ')}]`;
      }

      // Check for duplicate error (prevent spam within 60s window)
      const deduplicationKey = `${code}:${message}`;
      const lastLogTime = this.lastErrorLog.get(deduplicationKey);
      const now = Date.now();

      if (!lastLogTime || (now - lastLogTime) > this.ERROR_DEDUP_WINDOW) {
        // Log main error message
        console.error(this.formatMessage('error', errorMsg));

        // Log stack trace in debug mode only
        if (this.level === 'debug' && stack) {
          console.error(this.formatMessage('debug', `Stack trace: ${stack}`));
        }

        // Log additional context in debug mode
        if (this.level === 'debug' && context) {
          console.debug(this.formatMessage('debug', `Context: ${this.formatData(context)}`));
        }

        this.lastErrorLog.set(deduplicationKey, now);
      }
    }
  }

  /**
   * Set log level
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get current log level
   */
  public getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Clear deduplication map (useful for testing)
   */
  public clearDeduplicationMap(): void {
    this.lastErrorLog.clear();
  }
}

// Export singleton instance
const Logger = new LoggerService();
export default Logger;

