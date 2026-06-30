/**
 * ErrorTranslator - Maps backend/HTTP errors to user-friendly frontend messages
 * Provides structured error objects with logging context
 *
 * Implements Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 16.1, 16.2
 */

import { ErrorState } from '../models/types';
import Logger from '../utils/Logger';

/**
 * Error context for logging
 */
export interface ErrorContext {
  requestId?: string;
  symbols?: string[];
  originalError?: Error | string;
  details?: Record<string, any>;
}

/**
 * ErrorTranslator class for translating backend errors to user-friendly messages
 * Maps HTTP status codes and error types to appropriate user-facing messages
 */
export class ErrorTranslator {
  /**
   * Translate an HTTP error code or error object to a user-friendly error response
   *
   * Maps:
   * - 429 (Rate Limited) → "Too many requests. Please wait a moment and try again."
   * - 401 (Unauthorized) → "Authentication failed. The server token may have expired. Please contact support."
   * - 503/504 (Service Unavailable/Timeout) → "The FII data service is temporarily unavailable. Please try again later."
   * - Network timeout → "Unable to fetch FII data. Please check your connection and try again later."
   *
   * @param error - Error object, HTTP status code, or error string
   * @param context - Optional error context for logging (requestId, symbols, etc.)
   * @returns Structured ErrorState object
   */
  static translateError(
    error: Error | number | string,
    context?: ErrorContext,
  ): ErrorState {
    const timestamp = new Date();

    // Handle numeric HTTP status codes
    if (typeof error === 'number') {
      const statusCode = error;
      const { message, code } = this.mapStatusCodeToMessage(statusCode);
      const errorState: ErrorState = {
        code,
        message,
        statusCode,
        timestamp,
      };

      // Log the error with context
      this.logError(errorState, context);

      return errorState;
    }

    // Handle error objects or strings
    let statusCode = 500; // Default to internal server error
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred. Please try again later.';

    if (typeof error === 'string') {
      // Check for specific error message patterns
      if (error.includes('timeout') || error.includes('ECONNABORTED')) {
        statusCode = 504;
        code = 'TIMEOUT';
        message = 'Unable to fetch FII data. Please check your connection and try again later.';
      } else if (error.includes('ECONNREFUSED') || error.includes('EHOSTUNREACH')) {
        statusCode = 503;
        code = 'SERVICE_UNAVAILABLE';
        message = 'The FII data service is temporarily unavailable. Please try again later.';
      } else if (error.includes('401')) {
        statusCode = 401;
        code = 'UNAUTHORIZED';
        message =
          'Authentication failed. The server token may have expired. Please contact support.';
      } else if (error.includes('429')) {
        statusCode = 429;
        code = 'RATE_LIMITED';
        message = 'Too many requests. Please wait a moment and try again.';
      }
    } else if (error instanceof Error) {
      // Handle Error objects with message inspection
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes('timeout') || errorMessage.includes('econnaborted')) {
        statusCode = 504;
        code = 'TIMEOUT';
        message = 'Unable to fetch FII data. Please check your connection and try again later.';
      } else if (
        errorMessage.includes('econnrefused') ||
        errorMessage.includes('ehostunreach')
      ) {
        statusCode = 503;
        code = 'SERVICE_UNAVAILABLE';
        message = 'The FII data service is temporarily unavailable. Please try again later.';
      }

      // Store original error for debugging
      if (!context) {
        context = {};
      }
      context.originalError = error;
    }

    const errorState: ErrorState = {
      code,
      message,
      statusCode,
      timestamp,
    };

    // Log the error with context
    this.logError(errorState, context);

    return errorState;
  }

  /**
   * Map HTTP status code to user-friendly message and error code
   *
   * @private
   * @param statusCode - HTTP status code
   * @returns Object with message and code
   */
  private static mapStatusCodeToMessage(
    statusCode: number,
  ): { message: string; code: string } {
    switch (statusCode) {
      case 429:
        return {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.',
        };

      case 401:
        return {
          code: 'UNAUTHORIZED',
          message:
            'Authentication failed. The server token may have expired. Please contact support.',
        };

      case 503:
      case 504:
        return {
          code: 'SERVICE_UNAVAILABLE',
          message: 'The FII data service is temporarily unavailable. Please try again later.',
        };

      case 400:
        return {
          code: 'BAD_REQUEST',
          message: 'Invalid request. Please check your input and try again.',
        };

      case 403:
        return {
          code: 'FORBIDDEN',
          message: 'Access denied. Please contact support.',
        };

      case 404:
        return {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found.',
        };

      case 500:
      case 502:
        return {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An internal server error occurred. Please try again later.',
        };

      default:
        return {
          code: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred. Please try again later.',
        };
    }
  }

  /**
   * Log error with context for debugging and monitoring
   * Includes request ID, symbols, and error details in structured format
   *
   * @private
   * @param errorState - The structured error state
   * @param context - Optional error context (requestId, symbols, etc.)
   */
  private static logError(errorState: ErrorState, context?: ErrorContext): void {
    Logger.logError({
      code: errorState.code,
      message: errorState.message,
      statusCode: errorState.statusCode,
      requestId: context?.requestId,
      symbols: context?.symbols,
      stack: context?.originalError instanceof Error ? context.originalError.stack : undefined,
      context: {
        details: context?.details || {},
        originalError: context?.originalError ? String(context.originalError) : null,
      },
    });
  }

  /**
   * Create an error state for a network timeout
   *
   * @param context - Optional error context
   * @returns ErrorState for timeout
   */
  static timeoutError(context?: ErrorContext): ErrorState {
    const errorState: ErrorState = {
      code: 'TIMEOUT',
      message: 'Unable to fetch FII data. Please check your connection and try again later.',
      statusCode: 504,
      timestamp: new Date(),
    };

    this.logError(errorState, context);
    return errorState;
  }

  /**
   * Create an error state for rate limiting (429)
   *
   * @param context - Optional error context
   * @returns ErrorState for rate limit
   */
  static rateLimitError(context?: ErrorContext): ErrorState {
    const errorState: ErrorState = {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment and try again.',
      statusCode: 429,
      timestamp: new Date(),
    };

    this.logError(errorState, context);
    return errorState;
  }

  /**
   * Create an error state for authentication failure (401)
   *
   * @param context - Optional error context
   * @returns ErrorState for authentication error
   */
  static authenticationError(context?: ErrorContext): ErrorState {
    const errorState: ErrorState = {
      code: 'UNAUTHORIZED',
      message:
        'Authentication failed. The server token may have expired. Please contact support.',
      statusCode: 401,
      timestamp: new Date(),
    };

    this.logError(errorState, context);
    return errorState;
  }

  /**
   * Create an error state for service unavailability (503/504)
   *
   * @param context - Optional error context
   * @returns ErrorState for service unavailable
   */
  static serviceUnavailableError(context?: ErrorContext): ErrorState {
    const errorState: ErrorState = {
      code: 'SERVICE_UNAVAILABLE',
      message: 'The FII data service is temporarily unavailable. Please try again later.',
      statusCode: 503,
      timestamp: new Date(),
    };

    this.logError(errorState, context);
    return errorState;
  }
}
