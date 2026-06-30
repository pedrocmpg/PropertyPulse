/**
 * Property-based tests for sensitive header stripping
 * Validates: Requirements 1.3, 1.7
 */

import * as fc from 'fast-check';
import { stripSensitiveHeaders } from './headers';

describe('stripSensitiveHeaders - Property 5: Sensitive Header Stripping', () => {
  /**
   * Property 5: Sensitive Header Stripping
   * **Validates: Requirements 1.3, 1.7**
   *
   * For any HTTP response containing headers matching sensitive patterns
   * (Set-Cookie, Authorization, X-Auth-Token, X-API-Key, WWW-Authenticate,
   * X-Auth-*, X-Admin-*, X-Internal-*, X-Debug-*), the backend SHALL remove
   * all matching headers before returning the response to the frontend.
   *
   * Simultaneously, safe headers (Content-Type, X-Request-ID, etc.) SHALL
   * be preserved in the output.
   */
  test('should remove all sensitive headers while preserving safe headers', () => {
    const run = fc.property(
      fc.record({
        // Safe headers that should be preserved
        'content-type': fc.constant('application/json'),
        'content-length': fc.stringMatching(/^\d+$/),
        'x-request-id': fc.uuid(),
        'x-frame-options': fc.constant('DENY'),
        'x-content-type-options': fc.constant('nosniff'),

        // Sensitive headers that should be removed
        'authorization': fc.string({ minLength: 1 }),
        'set-cookie': fc.string({ minLength: 1 }),
        'x-auth-token': fc.string({ minLength: 1 }),
        'x-api-key': fc.string({ minLength: 1 }),
        'www-authenticate': fc.string({ minLength: 1 }),
      }),
      (baseHeaders) => {
        const result = stripSensitiveHeaders(baseHeaders);

        // Verify safe headers are preserved
        expect(result['content-type']).toBe(baseHeaders['content-type']);
        expect(result['content-length']).toBe(baseHeaders['content-length']);
        expect(result['x-request-id']).toBe(baseHeaders['x-request-id']);
        expect(result['x-frame-options']).toBe(baseHeaders['x-frame-options']);
        expect(result['x-content-type-options']).toBe(
          baseHeaders['x-content-type-options']
        );

        // Verify sensitive headers are removed
        expect(result['authorization']).toBeUndefined();
        expect(result['set-cookie']).toBeUndefined();
        expect(result['x-auth-token']).toBeUndefined();
        expect(result['x-api-key']).toBeUndefined();
        expect(result['www-authenticate']).toBeUndefined();

        // Verify result size is correct (5 safe headers, 0 sensitive)
        expect(Object.keys(result)).toHaveLength(5);
      }
    );

    // Run with minimum 100 iterations
    fc.assert(run, { numRuns: 100 });
  });

  /**
   * Test: Remove headers matching X-Auth-* pattern
   * Verifies that headers like X-Auth-Session, X-Auth-Nonce, X-Auth-Custom
   * are all removed regardless of suffix
   */
  test('should remove all X-Auth-* headers', () => {
    const run = fc.property(
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9\-]+$/), // Header suffix after X-Auth-
        fc.string({ minLength: 1 }) // Header value
      ),
      ([suffix, value]) => {
        const headers = {
          'content-type': 'application/json',
          [`x-auth-${suffix}`]: value,
        };

        const result = stripSensitiveHeaders(headers);

        // Safe header preserved
        expect(result['content-type']).toBe('application/json');

        // X-Auth-* header removed
        expect(result[`x-auth-${suffix}`]).toBeUndefined();

        // Only 1 header should remain (content-type)
        expect(Object.keys(result)).toHaveLength(1);
      }
    );

    fc.assert(run, { numRuns: 100 });
  });

  /**
   * Test: Remove headers matching X-Admin-* pattern
   * Verifies that headers like X-Admin-Panel, X-Admin-Mode, X-Admin-Custom
   * are all removed regardless of suffix
   */
  test('should remove all X-Admin-* headers', () => {
    const run = fc.property(
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9\-]+$/), // Header suffix after X-Admin-
        fc.string({ minLength: 1 }) // Header value
      ),
      ([suffix, value]) => {
        const headers = {
          'content-type': 'application/json',
          [`x-admin-${suffix}`]: value,
        };

        const result = stripSensitiveHeaders(headers);

        // Safe header preserved
        expect(result['content-type']).toBe('application/json');

        // X-Admin-* header removed
        expect(result[`x-admin-${suffix}`]).toBeUndefined();

        // Only 1 header should remain (content-type)
        expect(Object.keys(result)).toHaveLength(1);
      }
    );

    fc.assert(run, { numRuns: 100 });
  });

  /**
   * Test: Remove headers matching X-Internal-* pattern
   * Verifies that headers like X-Internal-Request-ID, X-Internal-Service, etc.
   * are all removed regardless of suffix
   */
  test('should remove all X-Internal-* headers', () => {
    const run = fc.property(
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9\-]+$/), // Header suffix after X-Internal-
        fc.string({ minLength: 1 }) // Header value
      ),
      ([suffix, value]) => {
        const headers = {
          'content-type': 'application/json',
          [`x-internal-${suffix}`]: value,
        };

        const result = stripSensitiveHeaders(headers);

        // Safe header preserved
        expect(result['content-type']).toBe('application/json');

        // X-Internal-* header removed
        expect(result[`x-internal-${suffix}`]).toBeUndefined();

        // Only 1 header should remain (content-type)
        expect(Object.keys(result)).toHaveLength(1);
      }
    );

    fc.assert(run, { numRuns: 100 });
  });

  /**
   * Test: Remove headers matching X-Debug-* pattern
   * Verifies that headers like X-Debug-Info, X-Debug-SQL, X-Debug-Custom
   * are all removed regardless of suffix
   */
  test('should remove all X-Debug-* headers', () => {
    const run = fc.property(
      fc.tuple(
        fc.stringMatching(/^[a-zA-Z0-9\-]+$/), // Header suffix after X-Debug-
        fc.string({ minLength: 1 }) // Header value
      ),
      ([suffix, value]) => {
        const headers = {
          'content-type': 'application/json',
          [`x-debug-${suffix}`]: value,
        };

        const result = stripSensitiveHeaders(headers);

        // Safe header preserved
        expect(result['content-type']).toBe('application/json');

        // X-Debug-* header removed
        expect(result[`x-debug-${suffix}`]).toBeUndefined();

        // Only 1 header should remain (content-type)
        expect(Object.keys(result)).toHaveLength(1);
      }
    );

    fc.assert(run, { numRuns: 100 });
  });

  /**
   * Test: Case-insensitive header matching
   * Verifies that headers are matched case-insensitively
   * (e.g., "Authorization", "AUTHORIZATION", "authorization" all removed)
   */
  test('should match headers case-insensitively', () => {
    const run = fc.property(
      fc.oneof(
        fc.constant('Authorization'),
        fc.constant('authorization'),
        fc.constant('AUTHORIZATION'),
        fc.constant('Set-Cookie'),
        fc.constant('set-cookie'),
        fc.constant('SET-COOKIE'),
        fc.constant('X-Auth-Token'),
        fc.constant('x-auth-token'),
        fc.constant('X-AUTH-TOKEN')
      ),
      (headerName) => {
        const headers = {
          'content-type': 'application/json',
          [headerName]: 'sensitive-value',
        };

        const result = stripSensitiveHeaders(headers);

        // Safe header preserved
        expect(result['content-type']).toBe('application/json');

        // Only content-type should remain (sensitive header removed)
        expect(Object.keys(result)).toHaveLength(1);
      }
    );

    fc.assert(run, { numRuns: 100 });
  });

  /**
   * Test: Preserve safe custom headers
   * Verifies that custom headers starting with X- but not sensitive patterns
   * are preserved (e.g., X-Request-ID, X-Frame-Options, X-Correlation-ID)
   */
  test('should preserve safe custom X-* headers', () => {
    const run = fc.property(
      fc.tuple(
        // Generate safe custom header names (X-* that are not sensitive patterns)
        fc.stringMatching(/^X-[A-Z][a-zA-Z0-9\-]*$/),
        fc.string({ minLength: 1 })
      ),
      ([headerName, value]): boolean | void => {
        // Filter out known sensitive patterns
        const sensitivePatterns = [
          'X-Auth-',
          'X-Admin-',
          'X-Internal-',
          'X-Debug-',
          'X-Api-Key',
          'X-Auth-Token',
        ];

        const isSensitive = sensitivePatterns.some((pattern) =>
          headerName.toLowerCase().startsWith(pattern.toLowerCase())
        );

        // Skip if this happens to generate a sensitive pattern
        if (isSensitive) {
          return true; // Skip this case
        }

        const headers = {
          'content-type': 'application/json',
          [headerName]: value,
        };

        const result = stripSensitiveHeaders(headers);

        // Both headers should be preserved
        expect(result['content-type']).toBe('application/json');
        expect(result[headerName]).toBe(value);

        // Result should have 2 headers
        expect(Object.keys(result)).toHaveLength(2);
      }
    );

    fc.assert(run, { numRuns: 100 });
  });

  /**
   * Test: Handle empty headers object
   * Verifies that stripping headers from an empty object returns empty
   */
  test('should handle empty headers object', () => {
    const headers = {};
    const result = stripSensitiveHeaders(headers);

    expect(result).toEqual({});
  });

  /**
   * Test: Handle only sensitive headers
   * Verifies that if all headers are sensitive, result is empty
   */
  test('should return empty object when all headers are sensitive', () => {
    const headers = {
      'authorization': 'Bearer token123',
      'set-cookie': 'session=abc123',
      'x-auth-token': 'token456',
      'x-admin-panel': 'true',
      'x-internal-request-id': 'req789',
      'x-debug-info': 'debug data',
    };

    const result = stripSensitiveHeaders(headers);

    expect(result).toEqual({});
  });

  /**
   * Test: Handle header values as arrays (multi-valued headers)
   * Some HTTP headers can have multiple values (e.g., Set-Cookie, Accept)
   * Verifies that the function preserves multi-valued headers correctly
   */
  test('should handle multi-valued headers correctly', () => {
    const headers = {
      'content-type': 'application/json',
      'accept': ['application/json', 'text/plain'],
      'set-cookie': ['session=abc', 'token=xyz'],
      'x-custom': ['value1', 'value2'],
    };

    const result = stripSensitiveHeaders(headers);

    // Safe headers preserved (including multi-valued accept and x-custom)
    expect(result['content-type']).toBe('application/json');
    expect(result['accept']).toEqual(['application/json', 'text/plain']);
    expect(result['x-custom']).toEqual(['value1', 'value2']);

    // Sensitive set-cookie removed
    expect(result['set-cookie']).toBeUndefined();

    // Result should have 3 entries
    expect(Object.keys(result)).toHaveLength(3);
  });

  /**
   * Test: Header stripping does not modify input
   * Verifies that the function doesn't mutate the original headers object
   */
  test('should not modify input headers object', () => {
    const originalHeaders = {
      'content-type': 'application/json',
      'authorization': 'Bearer token123',
    };

    const headersCopy = { ...originalHeaders };

    stripSensitiveHeaders(originalHeaders);

    // Original should be unchanged
    expect(originalHeaders).toEqual(headersCopy);
  });

  /**
   * Test: Sensitive headers list completeness
   * Verifies all documented sensitive headers are removed:
   * Authorization, X-Auth-Token, X-API-Key, Set-Cookie, WWW-Authenticate
   */
  test('should remove all documented sensitive headers', () => {
    const sensitiveHeaders = {
      'authorization': 'Bearer token',
      'x-auth-token': 'token123',
      'x-api-key': 'key456',
      'set-cookie': 'session=abc',
      'www-authenticate': 'Bearer realm="API"',
    };

    const result = stripSensitiveHeaders(sensitiveHeaders);

    expect(result).toEqual({});
  });

  /**
   * Test: Mix of sensitive and safe headers with random properties
   * Generates random combinations of sensitive and safe headers
   * and verifies correct filtering
   */
  test('should correctly filter mixed header sets', () => {
    const run = fc.property(
      fc.record({
        // Safe headers
        'content-type': fc.option(fc.constant('application/json')),
        'x-request-id': fc.option(fc.uuid()),
        'cache-control': fc.option(fc.constant('no-cache')),

        // Sensitive headers
        'authorization': fc.option(fc.string({ minLength: 1 })),
        'set-cookie': fc.option(fc.string({ minLength: 1 })),
      }),
      (headers) => {
        // Filter out undefined values to match actual header structure
        const cleanHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(headers)) {
          if (value !== null) {
            cleanHeaders[key] = value as string;
          }
        }

        const result = stripSensitiveHeaders(cleanHeaders);

        // Count expected safe headers
        const expectedSafeCount = (cleanHeaders['content-type'] ? 1 : 0) +
          (cleanHeaders['x-request-id'] ? 1 : 0) +
          (cleanHeaders['cache-control'] ? 1 : 0);

        // Verify no sensitive headers in result
        expect(result['authorization']).toBeUndefined();
        expect(result['set-cookie']).toBeUndefined();

        // Verify result has only safe headers
        expect(Object.keys(result)).toHaveLength(expectedSafeCount);
      }
    );

    fc.assert(run, { numRuns: 100 });
  });
});
