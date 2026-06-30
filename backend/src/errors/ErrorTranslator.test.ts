/**
 * Unit Tests for ErrorTranslator
 * Tests the translation of HTTP errors to user-friendly messages
 * Tests structured error object creation and logging
 */

import { ErrorTranslator, ErrorContext } from './ErrorTranslator';
import Logger from '../utils/Logger';

describe('ErrorTranslator', () => {
  // Mock Logger.logError to verify logging
  beforeEach(() => {
    jest.spyOn(Logger, 'logError').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('translateError with HTTP status codes', () => {
    it('should translate 429 (Rate Limited) to user-friendly message', () => {
      const error = ErrorTranslator.translateError(429);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.message).toBe('Too many requests. Please wait a moment and try again.');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should translate 401 (Unauthorized) to authentication error message', () => {
      const error = ErrorTranslator.translateError(401);

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe(
        'Authentication failed. The server token may have expired. Please contact support.',
      );
    });

    it('should translate 503 (Service Unavailable) to service error message', () => {
      const error = ErrorTranslator.translateError(503);

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe(
        'The FII data service is temporarily unavailable. Please try again later.',
      );
    });

    it('should translate 504 (Gateway Timeout) to service error message', () => {
      const error = ErrorTranslator.translateError(504);

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe(
        'The FII data service is temporarily unavailable. Please try again later.',
      );
    });

    it('should translate 400 (Bad Request) to validation error message', () => {
      const error = ErrorTranslator.translateError(400);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid request. Please check your input and try again.');
    });

    it('should translate 403 (Forbidden) to access denied message', () => {
      const error = ErrorTranslator.translateError(403);

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied. Please contact support.');
    });

    it('should translate 404 (Not Found) to not found message', () => {
      const error = ErrorTranslator.translateError(404);

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('The requested resource was not found.');
    });

    it('should translate 500 (Internal Server Error) to generic error message', () => {
      const error = ErrorTranslator.translateError(500);

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBe('An internal server error occurred. Please try again later.');
    });

    it('should translate 502 (Bad Gateway) to generic error message', () => {
      const error = ErrorTranslator.translateError(502);

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBe('An internal server error occurred. Please try again later.');
    });

    it('should translate unknown status codes to generic error', () => {
      const error = ErrorTranslator.translateError(418); // I'm a teapot

      expect(error.statusCode).toBe(418);
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('An unexpected error occurred. Please try again later.');
    });
  });

  describe('translateError with Error objects', () => {
    it('should detect timeout errors from Error object', () => {
      const timeoutError = new Error('Request timeout after 10000ms');
      const error = ErrorTranslator.translateError(timeoutError);

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe(
        'Unable to fetch FII data. Please check your connection and try again later.',
      );
    });

    it('should detect ECONNABORTED (timeout) errors', () => {
      const error = ErrorTranslator.translateError(new Error('ECONNABORTED'));

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
    });

    it('should detect ECONNREFUSED (connection refused) errors', () => {
      const error = ErrorTranslator.translateError(new Error('ECONNREFUSED'));

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe(
        'The FII data service is temporarily unavailable. Please try again later.',
      );
    });

    it('should detect EHOSTUNREACH (host unreachable) errors', () => {
      const error = ErrorTranslator.translateError(new Error('EHOSTUNREACH'));

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should return timestamp for all Error object translations', () => {
      const error = ErrorTranslator.translateError(new Error('Some error'));

      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('translateError with string messages', () => {
    it('should detect timeout string pattern', () => {
      const error = ErrorTranslator.translateError('Request timeout');

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe(
        'Unable to fetch FII data. Please check your connection and try again later.',
      );
    });

    it('should detect connection error string pattern', () => {
      const error = ErrorTranslator.translateError('ECONNREFUSED: Connection refused');

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should detect 401 in string', () => {
      const error = ErrorTranslator.translateError('HTTP 401 Unauthorized');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should detect 429 in string', () => {
      const error = ErrorTranslator.translateError('HTTP 429 Too Many Requests');

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
    });

    it('should default to generic error for unknown strings', () => {
      const error = ErrorTranslator.translateError('Some unknown error');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Error context logging', () => {
    it('should include requestId in logged error', () => {
      const context: ErrorContext = {
        requestId: 'req-12345',
        symbols: ['MXRF11'],
      };

      ErrorTranslator.translateError(429, context);

      expect(Logger.logError).toHaveBeenCalled();
      const loggedError = (Logger.logError as jest.Mock).mock.calls[0][0];
      expect(loggedError.requestId).toBe('req-12345');
      expect(loggedError.symbols).toEqual(['MXRF11']);
    });

    it('should include multiple symbols in context', () => {
      const context: ErrorContext = {
        requestId: 'req-67890',
        symbols: ['MXRF11', 'HGLG11', 'KNSC11'],
      };

      ErrorTranslator.translateError(503, context);

      const loggedError = (Logger.logError as jest.Mock).mock.calls[0][0];
      expect(loggedError.symbols).toEqual(['MXRF11', 'HGLG11', 'KNSC11']);
    });

    it('should include additional details in context', () => {
      const context: ErrorContext = {
        requestId: 'req-abc',
        symbols: ['MXRF11'],
        details: {
          retryCount: 3,
          lastAttempt: '2024-01-15T10:30:45Z',
        },
      };

      ErrorTranslator.translateError(504, context);

      const loggedError = (Logger.logError as jest.Mock).mock.calls[0][0];
      expect(loggedError.context?.details).toEqual({
        retryCount: 3,
        lastAttempt: '2024-01-15T10:30:45Z',
      });
    });

    it('should log server errors (5xx) via Logger', () => {
      ErrorTranslator.translateError(500);

      expect(Logger.logError).toHaveBeenCalled();
      const loggedError = (Logger.logError as jest.Mock).mock.calls[0][0];
      expect(loggedError.statusCode).toBe(500);
    });

    it('should log client errors (4xx) via Logger', () => {
      ErrorTranslator.translateError(429);

      expect(Logger.logError).toHaveBeenCalled();
      const loggedError = (Logger.logError as jest.Mock).mock.calls[0][0];
      expect(loggedError.statusCode).toBe(429);
    });
  });

  describe('Convenience error factory methods', () => {
    it('timeoutError should create timeout error state', () => {
      const error = ErrorTranslator.timeoutError();

      expect(error.code).toBe('TIMEOUT');
      expect(error.statusCode).toBe(504);
      expect(error.message).toBe(
        'Unable to fetch FII data. Please check your connection and try again later.',
      );
    });

    it('timeoutError should include context in logging', () => {
      const context: ErrorContext = {
        requestId: 'req-timeout',
        symbols: ['MXRF11'],
      };

      ErrorTranslator.timeoutError(context);

      expect(Logger.logError).toHaveBeenCalled();
      const loggedError = (Logger.logError as jest.Mock).mock.calls[0][0];
      expect(loggedError.requestId).toBe('req-timeout');
    });

    it('rateLimitError should create rate limit error state', () => {
      const error = ErrorTranslator.rateLimitError();

      expect(error.code).toBe('RATE_LIMITED');
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('authenticationError should create authentication error state', () => {
      const error = ErrorTranslator.authenticationError();

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(
        'Authentication failed. The server token may have expired. Please contact support.',
      );
    });

    it('serviceUnavailableError should create service error state', () => {
      const error = ErrorTranslator.serviceUnavailableError();

      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe(
        'The FII data service is temporarily unavailable. Please try again later.',
      );
    });
  });

  describe('ErrorState structure', () => {
    it('should return structured error object with all required fields', () => {
      const error = ErrorTranslator.translateError(429);

      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('timestamp');

      // Verify types
      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.statusCode).toBe('number');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create timestamp close to current time', () => {
      const beforeTime = Date.now();
      const error = ErrorTranslator.translateError(500);
      const afterTime = Date.now();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(afterTime + 100); // Allow 100ms buffer
    });

    it('should have consistent error code format', () => {
      const errors = [
        ErrorTranslator.translateError(429),
        ErrorTranslator.translateError(401),
        ErrorTranslator.translateError(503),
        ErrorTranslator.translateError(500),
      ];

      errors.forEach((error) => {
        // Error codes should be uppercase with underscores
        expect(error.code).toMatch(/^[A-Z_]+$/);
        expect(error.code.length).toBeGreaterThan(0);
      });
    });

    it('should have user-friendly message format', () => {
      const errors = [
        ErrorTranslator.translateError(429),
        ErrorTranslator.translateError(401),
        ErrorTranslator.translateError(503),
      ];

      errors.forEach((error) => {
        // Messages should be non-empty and suitable for users
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
        // Messages should contain helpful guidance or explanation
        expect(error.message).toMatch(
          /(Please|try|again|contact|wait|check|connection|support)/i,
        );
      });
    });
  });

  describe('Error code consistency', () => {
    it('should use consistent error codes across factory methods', () => {
      const rateLimitError1 = ErrorTranslator.translateError(429);
      const rateLimitError2 = ErrorTranslator.rateLimitError();

      expect(rateLimitError1.code).toBe(rateLimitError2.code);
      expect(rateLimitError1.message).toBe(rateLimitError2.message);
      expect(rateLimitError1.statusCode).toBe(rateLimitError2.statusCode);
    });

    it('should use consistent error codes for auth errors', () => {
      const authError1 = ErrorTranslator.translateError(401);
      const authError2 = ErrorTranslator.authenticationError();

      expect(authError1.code).toBe(authError2.code);
      expect(authError1.message).toBe(authError2.message);
    });

    it('should use consistent error codes for timeout errors', () => {
      const timeoutError1 = ErrorTranslator.timeoutError();
      const timeoutError2 = ErrorTranslator.translateError(new Error('timeout'));

      expect(timeoutError1.code).toBe('TIMEOUT');
      expect(timeoutError2.code).toBe('TIMEOUT');
    });
  });

  describe('Requirements compliance', () => {
    it('should map 429 (Rate Limited) correctly per Requirement 9.3', () => {
      const error = ErrorTranslator.translateError(429);

      expect(error.message).toBe('Too many requests. Please wait a moment and try again.');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
    });

    it('should map 401 (Unauthorized) correctly per Requirement 9.2', () => {
      const error = ErrorTranslator.translateError(401);

      expect(error.message).toBe(
        'Authentication failed. The server token may have expired. Please contact support.',
      );
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should map 503/504 (Service Unavailable/Timeout) correctly per Requirement 9.4', () => {
      const error503 = ErrorTranslator.translateError(503);
      const error504 = ErrorTranslator.translateError(504);

      const expectedMessage =
        'The FII data service is temporarily unavailable. Please try again later.';

      expect(error503.message).toBe(expectedMessage);
      expect(error504.message).toBe(expectedMessage);
    });

    it('should map network timeout correctly per Requirement 9.1', () => {
      const error = ErrorTranslator.translateError(new Error('timeout'));

      expect(error.message).toBe(
        'Unable to fetch FII data. Please check your connection and try again later.',
      );
      expect(error.code).toBe('TIMEOUT');
    });

    it('should return structured error object per Requirement 9.5', () => {
      const error = ErrorTranslator.translateError(429);

      // Check required fields from Requirement 9.5
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('timestamp');

      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.statusCode).toBe('number');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should log all errors with context per Requirement 16.1 and 16.2', () => {
      const context: ErrorContext = {
        requestId: 'req-test',
        symbols: ['MXRF11', 'HGLG11'],
        details: {
          attempt: 1,
        },
      };

      ErrorTranslator.translateError(503, context);

      expect(Logger.logError).toHaveBeenCalled();
      const loggedError = (Logger.logError as jest.Mock).mock.calls[0][0];

      expect(loggedError).toHaveProperty('code');
      expect(loggedError).toHaveProperty('message');
      expect(loggedError).toHaveProperty('statusCode');
      expect(loggedError).toHaveProperty('requestId');
      expect(loggedError).toHaveProperty('symbols');
      expect(loggedError).toHaveProperty('context');
    });
  });
});


  describe('translateError with HTTP status codes', () => {
    it('should translate 429 (Rate Limited) to user-friendly message', () => {
      const error = ErrorTranslator.translateError(429);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.message).toBe('Too many requests. Please wait a moment and try again.');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should translate 401 (Unauthorized) to authentication error message', () => {
      const error = ErrorTranslator.translateError(401);

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.message).toBe(
        'Authentication failed. The server token may have expired. Please contact support.',
      );
    });

    it('should translate 503 (Service Unavailable) to service error message', () => {
      const error = ErrorTranslator.translateError(503);

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe(
        'The FII data service is temporarily unavailable. Please try again later.',
      );
    });

    it('should translate 504 (Gateway Timeout) to service error message', () => {
      const error = ErrorTranslator.translateError(504);

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe(
        'The FII data service is temporarily unavailable. Please try again later.',
      );
    });

    it('should translate 400 (Bad Request) to validation error message', () => {
      const error = ErrorTranslator.translateError(400);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('BAD_REQUEST');
      expect(error.message).toBe('Invalid request. Please check your input and try again.');
    });

    it('should translate 403 (Forbidden) to access denied message', () => {
      const error = ErrorTranslator.translateError(403);

      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
      expect(error.message).toBe('Access denied. Please contact support.');
    });

    it('should translate 404 (Not Found) to not found message', () => {
      const error = ErrorTranslator.translateError(404);

      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
      expect(error.message).toBe('The requested resource was not found.');
    });

    it('should translate 500 (Internal Server Error) to generic error message', () => {
      const error = ErrorTranslator.translateError(500);

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBe('An internal server error occurred. Please try again later.');
    });

    it('should translate 502 (Bad Gateway) to generic error message', () => {
      const error = ErrorTranslator.translateError(502);

      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(error.message).toBe('An internal server error occurred. Please try again later.');
    });

    it('should translate unknown status codes to generic error', () => {
      const error = ErrorTranslator.translateError(418); // I'm a teapot

      expect(error.statusCode).toBe(418);
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.message).toBe('An unexpected error occurred. Please try again later.');
    });
  });

  describe('translateError with Error objects', () => {
    it('should detect timeout errors from Error object', () => {
      const timeoutError = new Error('Request timeout after 10000ms');
      const error = ErrorTranslator.translateError(timeoutError);

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe(
        'Unable to fetch FII data. Please check your connection and try again later.',
      );
    });

    it('should detect ECONNABORTED (timeout) errors', () => {
      const error = ErrorTranslator.translateError(new Error('ECONNABORTED'));

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
    });

    it('should detect ECONNREFUSED (connection refused) errors', () => {
      const error = ErrorTranslator.translateError(new Error('ECONNREFUSED'));

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.message).toBe(
        'The FII data service is temporarily unavailable. Please try again later.',
      );
    });

    it('should detect EHOSTUNREACH (host unreachable) errors', () => {
      const error = ErrorTranslator.translateError(new Error('EHOSTUNREACH'));

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should return timestamp for all Error object translations', () => {
      const error = ErrorTranslator.translateError(new Error('Some error'));

      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('translateError with string messages', () => {
    it('should detect timeout string pattern', () => {
      const error = ErrorTranslator.translateError('Request timeout');

      expect(error.statusCode).toBe(504);
      expect(error.code).toBe('TIMEOUT');
      expect(error.message).toBe(
        'Unable to fetch FII data. Please check your connection and try again later.',
      );
    });

    it('should detect connection error string pattern', () => {
      const error = ErrorTranslator.translateError('ECONNREFUSED: Connection refused');

      expect(error.statusCode).toBe(503);
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should detect 401 in string', () => {
      const error = ErrorTranslator.translateError('HTTP 401 Unauthorized');

      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should detect 429 in string', () => {
      const error = ErrorTranslator.translateError('HTTP 429 Too Many Requests');

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
    });

    it('should default to generic error for unknown strings', () => {
      const error = ErrorTranslator.translateError('Some unknown error');

      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Error context logging', () => {
    it('should include requestId in logged error', () => {
      const context: ErrorContext = {
        requestId: 'req-12345',
        symbols: ['MXRF11'],
      };

      ErrorTranslator.translateError(429, context);

      expect(console.warn).toHaveBeenCalled();
      const loggedMessage = (console.warn as jest.Mock).mock.calls[0][1];
      expect(loggedMessage.requestId).toBe('req-12345');
      expect(loggedMessage.symbols).toEqual(['MXRF11']);
    });

    it('should include multiple symbols in context', () => {
      const context: ErrorContext = {
        requestId: 'req-67890',
        symbols: ['MXRF11', 'HGLG11', 'KNSC11'],
      };

      ErrorTranslator.translateError(503, context);

      const loggedMessage = (console.error as jest.Mock).mock.calls[0][1];
      expect(loggedMessage.symbols).toEqual(['MXRF11', 'HGLG11', 'KNSC11']);
    });

    it('should include additional details in context', () => {
      const context: ErrorContext = {
        requestId: 'req-abc',
        symbols: ['MXRF11'],
        details: {
          retryCount: 3,
          lastAttempt: '2024-01-15T10:30:45Z',
        },
      };

      ErrorTranslator.translateError(504, context);

      const loggedMessage = (console.error as jest.Mock).mock.calls[0][1];
      expect(loggedMessage.details).toEqual({
        retryCount: 3,
        lastAttempt: '2024-01-15T10:30:45Z',
      });
    });

    it('should log server errors (5xx) with console.error', () => {
      ErrorTranslator.translateError(500);

      expect(console.error).toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('should log client errors (4xx) with console.warn', () => {
      ErrorTranslator.translateError(429);

      expect(console.warn).toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();
    });

    it('should use N/A for missing context fields', () => {
      ErrorTranslator.translateError(429);

      const loggedMessage = (console.warn as jest.Mock).mock.calls[0][1];
      expect(loggedMessage.requestId).toBe('N/A');
      expect(loggedMessage.symbols).toBe('N/A');
      expect(loggedMessage.originalError).toBeNull();
    });
  });

  describe('Convenience error factory methods', () => {
    it('timeoutError should create timeout error state', () => {
      const error = ErrorTranslator.timeoutError();

      expect(error.code).toBe('TIMEOUT');
      expect(error.statusCode).toBe(504);
      expect(error.message).toBe(
        'Unable to fetch FII data. Please check your connection and try again later.',
      );
    });

    it('timeoutError should include context in logging', () => {
      const context: ErrorContext = {
        requestId: 'req-timeout',
        symbols: ['MXRF11'],
      };

      ErrorTranslator.timeoutError(context);

      const loggedMessage = (console.error as jest.Mock).mock.calls[0][1];
      expect(loggedMessage.requestId).toBe('req-timeout');
    });

    it('rateLimitError should create rate limit error state', () => {
      const error = ErrorTranslator.rateLimitError();

      expect(error.code).toBe('RATE_LIMITED');
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('Too many requests. Please wait a moment and try again.');
    });

    it('authenticationError should create authentication error state', () => {
      const error = ErrorTranslator.authenticationError();

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe(
        'Authentication failed. The server token may have expired. Please contact support.',
      );
    });

    it('serviceUnavailableError should create service error state', () => {
      const error = ErrorTranslator.serviceUnavailableError();

      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe(
        'The FII data service is temporarily unavailable. Please try again later.',
      );
    });
  });

  describe('ErrorState structure', () => {
    it('should return structured error object with all required fields', () => {
      const error = ErrorTranslator.translateError(429);

      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('timestamp');

      // Verify types
      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.statusCode).toBe('number');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create timestamp close to current time', () => {
      const beforeTime = Date.now();
      const error = ErrorTranslator.translateError(500);
      const afterTime = Date.now();

      expect(error.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(error.timestamp.getTime()).toBeLessThanOrEqual(afterTime + 100); // Allow 100ms buffer
    });

    it('should have consistent error code format', () => {
      const errors = [
        ErrorTranslator.translateError(429),
        ErrorTranslator.translateError(401),
        ErrorTranslator.translateError(503),
        ErrorTranslator.translateError(500),
      ];

      errors.forEach((error) => {
        // Error codes should be uppercase with underscores
        expect(error.code).toMatch(/^[A-Z_]+$/);
        expect(error.code.length).toBeGreaterThan(0);
      });
    });

    it('should have user-friendly message format', () => {
      const errors = [
        ErrorTranslator.translateError(429),
        ErrorTranslator.translateError(401),
        ErrorTranslator.translateError(503),
      ];

      errors.forEach((error) => {
        // Messages should be non-empty and suitable for users
        expect(error.message).toBeTruthy();
        expect(error.message.length).toBeGreaterThan(0);
        // Messages should contain helpful guidance or explanation
        expect(error.message).toMatch(
          /(Please|try|again|contact|wait|check|connection|support)/i,
        );
      });
    });
  });

  describe('Error code consistency', () => {
    it('should use consistent error codes across factory methods', () => {
      const rateLimitError1 = ErrorTranslator.translateError(429);
      const rateLimitError2 = ErrorTranslator.rateLimitError();

      expect(rateLimitError1.code).toBe(rateLimitError2.code);
      expect(rateLimitError1.message).toBe(rateLimitError2.message);
      expect(rateLimitError1.statusCode).toBe(rateLimitError2.statusCode);
    });

    it('should use consistent error codes for auth errors', () => {
      const authError1 = ErrorTranslator.translateError(401);
      const authError2 = ErrorTranslator.authenticationError();

      expect(authError1.code).toBe(authError2.code);
      expect(authError1.message).toBe(authError2.message);
    });

    it('should use consistent error codes for timeout errors', () => {
      const timeoutError1 = ErrorTranslator.timeoutError();
      const timeoutError2 = ErrorTranslator.translateError(new Error('timeout'));

      expect(timeoutError1.code).toBe('TIMEOUT');
      expect(timeoutError2.code).toBe('TIMEOUT');
    });
  });

  describe('Requirements compliance', () => {
    it('should map 429 (Rate Limited) correctly per Requirement 9.3', () => {
      const error = ErrorTranslator.translateError(429);

      expect(error.message).toBe('Too many requests. Please wait a moment and try again.');
      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMITED');
    });

    it('should map 401 (Unauthorized) correctly per Requirement 9.2', () => {
      const error = ErrorTranslator.translateError(401);

      expect(error.message).toBe(
        'Authentication failed. The server token may have expired. Please contact support.',
      );
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('should map 503/504 (Service Unavailable/Timeout) correctly per Requirement 9.4', () => {
      const error503 = ErrorTranslator.translateError(503);
      const error504 = ErrorTranslator.translateError(504);

      const expectedMessage =
        'The FII data service is temporarily unavailable. Please try again later.';

      expect(error503.message).toBe(expectedMessage);
      expect(error504.message).toBe(expectedMessage);
    });

    it('should map network timeout correctly per Requirement 9.1', () => {
      const error = ErrorTranslator.translateError(new Error('timeout'));

      expect(error.message).toBe(
        'Unable to fetch FII data. Please check your connection and try again later.',
      );
      expect(error.code).toBe('TIMEOUT');
    });

    it('should return structured error object per Requirement 9.5', () => {
      const error = ErrorTranslator.translateError(429);

      // Check required fields from Requirement 9.5
      expect(error).toHaveProperty('code');
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('statusCode');
      expect(error).toHaveProperty('timestamp');

      expect(typeof error.code).toBe('string');
      expect(typeof error.message).toBe('string');
      expect(typeof error.statusCode).toBe('number');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should log all errors with context per Requirement 16.1 and 16.2', () => {
      const context: ErrorContext = {
        requestId: 'req-test',
        symbols: ['MXRF11', 'HGLG11'],
        details: {
          attempt: 1,
        },
      };

      ErrorTranslator.translateError(503, context);

      expect(console.error).toHaveBeenCalled();
      const loggedMessage = (console.error as jest.Mock).mock.calls[0][1];

      expect(loggedMessage).toHaveProperty('timestamp');
      expect(loggedMessage).toHaveProperty('errorCode');
      expect(loggedMessage).toHaveProperty('statusCode');
      expect(loggedMessage).toHaveProperty('message');
      expect(loggedMessage).toHaveProperty('requestId');
      expect(loggedMessage).toHaveProperty('symbols');
      expect(loggedMessage).toHaveProperty('details');
    });
  });
});
