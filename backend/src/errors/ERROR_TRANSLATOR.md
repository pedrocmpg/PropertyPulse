# ErrorTranslator Module

## Overview

The `ErrorTranslator` class is responsible for translating backend and HTTP errors into user-friendly messages that can be displayed to frontend users. It provides a consistent, structured approach to error handling with logging capabilities.

**Implements Requirements:** 9.1, 9.2, 9.3, 9.4, 9.5, 16.1, 16.2

## Error Code Mapping

The ErrorTranslator maps the following HTTP status codes and error types to user-friendly messages:

### HTTP Status Codes

| Status Code | Error Code | User Message |
|-------------|-----------|--------------|
| 429 | RATE_LIMITED | "Too many requests. Please wait a moment and try again." |
| 401 | UNAUTHORIZED | "Authentication failed. The server token may have expired. Please contact support." |
| 503 | SERVICE_UNAVAILABLE | "The FII data service is temporarily unavailable. Please try again later." |
| 504 | SERVICE_UNAVAILABLE | "The FII data service is temporarily unavailable. Please try again later." |
| 400 | BAD_REQUEST | "Invalid request. Please check your input and try again." |
| 403 | FORBIDDEN | "Access denied. Please contact support." |
| 404 | NOT_FOUND | "The requested resource was not found." |
| 500 | INTERNAL_SERVER_ERROR | "An internal server error occurred. Please try again later." |
| 502 | INTERNAL_SERVER_ERROR | "An internal server error occurred. Please try again later." |
| Other | UNKNOWN_ERROR | "An unexpected error occurred. Please try again later." |

### Error Patterns

The ErrorTranslator also detects specific error patterns in Error objects and strings:

- **Timeout Patterns:** "timeout", "ECONNABORTED"
  - Maps to: 504, TIMEOUT, "Unable to fetch FII data. Please check your connection and try again later."

- **Connection Refused Patterns:** "ECONNREFUSED", "EHOSTUNREACH"
  - Maps to: 503, SERVICE_UNAVAILABLE, "The FII data service is temporarily unavailable. Please try again later."

## Usage

### Basic Usage with HTTP Status Codes

```typescript
import { ErrorTranslator } from './errors';

// Translate a 429 rate limit error
const rateLimitError = ErrorTranslator.translateError(429);
// {
//   code: 'RATE_LIMITED',
//   message: 'Too many requests. Please wait a moment and try again.',
//   statusCode: 429,
//   timestamp: Date
// }
```

### Usage with Error Objects

```typescript
const timeoutError = new Error('Request timeout after 10000ms');
const error = ErrorTranslator.translateError(timeoutError);
// Detects "timeout" in the error message and maps appropriately
// {
//   code: 'TIMEOUT',
//   message: 'Unable to fetch FII data. Please check your connection and try again later.',
//   statusCode: 504,
//   timestamp: Date
// }
```

### Usage with Error Context

```typescript
const context = {
  requestId: 'req-abc123',
  symbols: ['MXRF11', 'HGLG11'],
  details: {
    retryCount: 2,
    lastAttempt: new Date().toISOString()
  }
};

const error = ErrorTranslator.translateError(503, context);
// Logs error with full context for debugging
```

### Convenience Factory Methods

The ErrorTranslator provides convenience methods for common error scenarios:

```typescript
// Rate limit error
const rateLimitErr = ErrorTranslator.rateLimitError();

// Authentication error
const authErr = ErrorTranslator.authenticationError();

// Timeout error
const timeoutErr = ErrorTranslator.timeoutError();

// Service unavailable
const serviceErr = ErrorTranslator.serviceUnavailableError();
```

## Error State Structure

All error translations return a structured `ErrorState` object:

```typescript
interface ErrorState {
  code: string;              // Machine-readable error code (e.g., "RATE_LIMITED")
  message: string;           // User-friendly error message
  statusCode: number;        // HTTP status code
  timestamp: Date;           // When the error occurred
}
```

## Error Context

Error context can be provided for better logging and debugging:

```typescript
interface ErrorContext {
  requestId?: string;                    // Unique request identifier
  symbols?: string[];                    // FII symbols involved in the request
  originalError?: Error | string;        // Original error for debugging
  details?: Record<string, any>;         // Additional error details
}
```

## Logging

The ErrorTranslator automatically logs all errors with the following information:

- **Timestamp:** ISO 8601 format timestamp
- **Error Code:** Machine-readable error identifier
- **Status Code:** HTTP status code
- **Message:** User-friendly error message
- **Request ID:** For tracing request flow
- **Symbols:** FII symbols involved in the request
- **Details:** Additional context-specific information
- **Original Error:** The original error for debugging (if available)

### Log Levels

- **console.error:** For server errors (5xx status codes)
- **console.warn:** For client errors (4xx status codes)
- **console.info:** For other errors

### Log Examples

**Rate Limit Error (429):**
```
[ErrorTranslator] Client Error: {
  timestamp: "2024-01-15T10:30:45.123Z",
  errorCode: "RATE_LIMITED",
  statusCode: 429,
  message: "Too many requests. Please wait a moment and try again.",
  requestId: "req-abc123",
  symbols: ["MXRF11", "HGLG11"],
  details: { retryCount: 2 },
  originalError: null
}
```

**Service Unavailable Error (503):**
```
[ErrorTranslator] Server Error: {
  timestamp: "2024-01-15T10:31:00.456Z",
  errorCode: "SERVICE_UNAVAILABLE",
  statusCode: 503,
  message: "The FII data service is temporarily unavailable. Please try again later.",
  requestId: "req-xyz789",
  symbols: ["KNSC11"],
  details: {},
  originalError: "Error: ECONNREFUSED: Connection refused"
}
```

## Integration with RequestHandler

The ErrorTranslator is used by the `RequestHandler` to standardize error responses:

```typescript
import { ErrorTranslator } from './errors';

try {
  // Make brAPI request
  const response = await fetch(brAPIUrl);
} catch (error) {
  // Translate error to user-friendly format
  const errorState = ErrorTranslator.translateError(error, {
    requestId: req.id,
    symbols: symbols,
    details: { endpoint: '/fii/indicators' }
  });
  
  return res.status(errorState.statusCode).json({
    success: false,
    error: errorState
  });
}
```

## Testing

The ErrorTranslator includes comprehensive unit tests covering:

- All HTTP status code mappings
- Error object pattern detection
- String pattern detection
- Error context logging
- Convenience factory methods
- Error state structure validation
- Requirements compliance

Run tests with:
```bash
npm test src/errors/ErrorTranslator.test.ts
```

## Requirements Coverage

| Requirement | Description | Status |
|-------------|-------------|--------|
| 9.1 | Network timeout error handling | ✅ |
| 9.2 | 401 Unauthorized error handling | ✅ |
| 9.3 | 429 Rate limit error handling | ✅ |
| 9.4 | 503/504 Service unavailable error handling | ✅ |
| 9.5 | Structured error object with code, message, statusCode, timestamp | ✅ |
| 16.1 | Error logging with request ID and symbols | ✅ |
| 16.2 | Error logging with error details and context | ✅ |

## Future Enhancements

- Rate limit error retry suggestions
- Circuit breaker integration for automatic error handling
- Error tracking and monitoring integration
- Multi-language error messages
