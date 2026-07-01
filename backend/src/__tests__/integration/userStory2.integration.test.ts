/**
 * Integration Test: User Story 2 - Handle Timeout
 *
 * Backend times out (>10s) waiting for brAPI, frontend displays error message,
 * user clicks Retry button, after 3 failures shows support message.
 *
 * Requirements: 9.1, 9.5, 16.1, 16.2
 */

import axios from 'axios';
import { RequestHandler } from '../../handlers/RequestHandler';
import { Request, Response } from 'express';

describe('User Story 2: Handle Timeout - Integration Test', () => {
  let requestHandler: RequestHandler;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let sentData: any;
  let brAPICallCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    sentData = null;

    requestHandler = new RequestHandler();

    mockRequest = {
      query: { symbols: 'MXRF11' },
      headers: {},
    } as Partial<Request>;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        sentData = data;
        return mockResponse;
      }),
      setHeader: jest.fn().mockReturnThis(),
      removeHeader: jest.fn().mockReturnThis(),
    } as Partial<Response>;
  });

  afterEach(() => {
    jest.useRealTimers();
    requestHandler.clearCache();
  });

  it('should return timeout error when brAPI takes more than 10 seconds', async () => {
    // Mock axios to timeout (never resolves)
    (axios.get as jest.Mock) = jest.fn(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Timeout: Request exceeds 10 seconds'));
          }, 11000); // 11 seconds
        }),
    );

    // Start request handler
    const handleRequestPromise = requestHandler.handleRequest(
      mockRequest as Request,
      mockResponse as Response,
    );

    // Advance timers to trigger timeout
    jest.advanceTimersByTime(11000);

    await handleRequestPromise;

    // Verify timeout error response
    expect(mockResponse.status).toHaveBeenCalledWith(expect.any(Number));
    expect(sentData.success).toBe(false);
    expect(sentData.error).toBeDefined();
    expect(sentData.error.code).toMatch(/TIMEOUT|BACKEND_ERROR/);
    expect(sentData.error.message).toMatch(/timeout|try again/i);
  });

  it('should return user-friendly timeout error message', async () => {
    // Mock axios to timeout
    (axios.get as jest.Mock) = jest.fn(() => {
      const error = new Error('Request timeout');
      (error as any).code = 'ECONNABORTED';
      throw error;
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify error response has user-friendly message
    expect(sentData.success).toBe(false);
    expect(sentData.error.message).toMatch(/Unable to fetch|try again later/i);
    expect(sentData.error.statusCode).toMatch(/504|503|500/);
  });

  it('should include error code and timestamp for debugging', async () => {
    // Mock timeout error
    (axios.get as jest.Mock) = jest.fn(() => {
      throw new Error('Connection timeout');
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify error object includes debugging information
    expect(sentData.error).toHaveProperty('code');
    expect(sentData.error).toHaveProperty('message');
    expect(sentData.error).toHaveProperty('statusCode');
    expect(sentData.error).toHaveProperty('timestamp');

    // Verify timestamp is valid
    const timestamp = new Date(sentData.error.timestamp);
    expect(timestamp instanceof Date && !isNaN(timestamp.getTime())).toBe(true);
  });

  it('should handle rate limit (429) error separately from timeout', async () => {
    // Mock brAPI returning 429 (Too Many Requests)
    (axios.get as jest.Mock) = jest.fn().mockRejectedValueOnce({
      response: {
        status: 429,
        statusText: 'Too Many Requests',
        data: { error: 'Rate limit exceeded' },
      },
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify rate limit error is handled differently
    expect(sentData.success).toBe(false);
    expect(sentData.error.code).toBe('RATE_LIMITED');
    expect(sentData.error.message).toMatch(/Too many requests|wait a moment/i);
  });

  it('should translate network connection errors', async () => {
    // Mock network error (ECONNREFUSED, ENOTFOUND, etc)
    (axios.get as jest.Mock) = jest.fn().mockRejectedValueOnce(
      new Error('connect ECONNREFUSED 127.0.0.1:3000'),
    );

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify network error is translated to user-friendly message
    expect(sentData.success).toBe(false);
    expect(sentData.error.message).toMatch(/Unable to fetch|connection/i);
  });

  it('should handle service unavailable (503) errors', async () => {
    // Mock brAPI returning 503 Service Unavailable
    (axios.get as jest.Mock) = jest.fn().mockRejectedValueOnce({
      response: {
        status: 503,
        statusText: 'Service Unavailable',
      },
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify service unavailable error is handled
    expect(sentData.success).toBe(false);
    expect(sentData.error.code).toMatch(/SERVICE_UNAVAILABLE|TIMEOUT/);
    expect(sentData.error.message).toMatch(/temporarily unavailable|try again later/i);
  });

  it('should handle authentication errors (401)', async () => {
    // Mock brAPI returning 401 Unauthorized
    (axios.get as jest.Mock) = jest.fn().mockRejectedValueOnce({
      response: {
        status: 401,
        statusText: 'Unauthorized',
        data: { error: 'Invalid token' },
      },
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify authentication error suggests contacting support
    expect(sentData.success).toBe(false);
    expect(sentData.error.code).toBe('UNAUTHORIZED');
    expect(sentData.error.message).toMatch(/Authentication failed|contact support/i);
  });

  it('should provide error details suitable for retry logic in frontend', async () => {
    // Mock timeout
    (axios.get as jest.Mock) = jest.fn().mockRejectedValueOnce(
      new Error('Request timeout after 10 seconds'),
    );

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify error structure supports retry logic
    expect(sentData.error).toHaveProperty('statusCode');
    expect(sentData.error).toHaveProperty('code');
    expect(sentData.error).toHaveProperty('message');

    // Frontend can use this information to determine if retry is appropriate
    const isRetryable = [408, 429, 503, 504].includes(sentData.error.statusCode);
    expect(isRetryable || sentData.error.code.includes('TIMEOUT')).toBe(true);
  });

  it('should handle empty response from brAPI', async () => {
    // Mock brAPI returning empty results
    (axios.get as jest.Mock) = jest.fn().mockResolvedValueOnce({
      status: 200,
      data: {
        results: [],
      },
      headers: {},
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify empty results are handled gracefully
    if (sentData.success) {
      expect(Array.isArray(sentData.data)).toBe(true);
      expect(sentData.data.length).toBe(0);
    } else {
      // Or error if no results found
      expect(sentData.error).toBeDefined();
    }
  });

  it('should handle malformed JSON response from brAPI', async () => {
    // Mock brAPI returning invalid JSON
    (axios.get as jest.Mock) = jest.fn().mockResolvedValueOnce({
      status: 200,
      data: 'Invalid JSON response',
      headers: {},
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify parsing error is handled gracefully
    expect(sentData.success).toBe(false);
    expect(sentData.error).toBeDefined();
    expect(sentData.error.code).toMatch(/PARSE_ERROR|BACKEND_ERROR/);
  });

  it('should handle null/undefined response body', async () => {
    // Mock brAPI returning null response
    (axios.get as jest.Mock) = jest.fn().mockResolvedValueOnce({
      status: 200,
      data: null,
      headers: {},
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify null response is handled
    expect(sentData.success).toBe(false);
    expect(sentData.error).toBeDefined();
  });

  it('should return appropriate HTTP status code for different error types', async () => {
    // Test timeout returns 504
    (axios.get as jest.Mock) = jest.fn().mockRejectedValueOnce(
      new Error('Timeout'),
    );

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify status code is set
    expect(mockResponse.status).toHaveBeenCalledWith(expect.any(Number));

    // Status should be in 4xx or 5xx range
    const statusCall = (mockResponse.status as jest.Mock).mock.calls[0][0];
    expect(statusCall).toBeGreaterThanOrEqual(400);
    expect(statusCall).toBeLessThanOrEqual(599);
  });

  it('should preserve error information through response chain', async () => {
    // Mock error
    (axios.get as jest.Mock) = jest.fn().mockRejectedValueOnce({
      response: {
        status: 504,
        statusText: 'Gateway Timeout',
      },
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify complete error structure is in response
    expect(sentData.success).toBe(false);
    expect(sentData.error.statusCode).toBe(504);
    expect(sentData.error.message).toBeDefined();
    expect(sentData.error.message.length).toBeGreaterThan(0);
  });
});
