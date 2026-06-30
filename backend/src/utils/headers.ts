/**
 * HTTP header utilities for security
 * Strips sensitive headers before returning API responses to frontend
 */

/**
 * Patterns for sensitive headers that should be stripped
 * from brAPI responses before returning to frontend
 */
const SENSITIVE_HEADER_PATTERNS = [
  'authorization', // Exact match: Authorization header
  'set-cookie', // Exact match: Set-Cookie for session tokens
  'www-authenticate', // Exact match: WWW-Authenticate challenges
  'x-api-key', // Exact match: X-API-Key tokens
  'x-auth-token', // Exact match: X-Auth-Token
  /^x-auth-.*/i, // Pattern: X-Auth-* (e.g., X-Auth-Session, X-Auth-Nonce)
  /^x-admin-.*/i, // Pattern: X-Admin-* (e.g., X-Admin-Panel, X-Admin-Mode)
  /^x-internal-.*/i, // Pattern: X-Internal-* (e.g., X-Internal-Request-ID)
  /^x-debug-.*/i, // Pattern: X-Debug-* (e.g., X-Debug-Info, X-Debug-SQL)
];

/**
 * Strips sensitive headers from HTTP response headers
 * Removes all headers matching sensitive patterns while preserving safe headers
 *
 * Headers removed:
 * - Authorization, X-Auth-Token, X-API-Key, Set-Cookie, WWW-Authenticate
 * - Any header matching X-Auth-*, X-Admin-*, X-Internal-*, X-Debug-*
 *
 * Headers preserved:
 * - Standard headers: Content-Type, Content-Length, Date, Server, etc.
 * - Custom headers: X-Request-ID, X-Frame-Options, X-Content-Type-Options, etc.
 * - CORS headers: Access-Control-Allow-Origin, etc.
 * - Security headers that are safe to expose: Strict-Transport-Security, etc.
 *
 * @param headers - Object containing HTTP headers (case-insensitive keys)
 * @returns New object with sensitive headers removed, safe headers preserved
 *
 * @example
 * stripSensitiveHeaders({
 *   'content-type': 'application/json',
 *   'authorization': 'Bearer token123',
 *   'x-auth-session': 'session456',
 *   'x-request-id': 'req789'
 * })
 * // Returns: { 'content-type': 'application/json', 'x-request-id': 'req789' }
 */
export function stripSensitiveHeaders(
  headers: Record<string, string | string[]>
): Record<string, string | string[]> {
  const strippedHeaders: Record<string, string | string[]> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();

    // Check if header matches any sensitive pattern
    const isSensitive = SENSITIVE_HEADER_PATTERNS.some((pattern) => {
      if (typeof pattern === 'string') {
        // Exact match (case-insensitive)
        return lowerKey === pattern;
      } else {
        // RegExp pattern match
        return pattern.test(lowerKey);
      }
    });

    // Keep header if not sensitive
    if (!isSensitive) {
      strippedHeaders[key] = value;
    }
  }

  return strippedHeaders;
}
