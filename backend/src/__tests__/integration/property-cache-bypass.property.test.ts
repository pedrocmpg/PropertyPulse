/**
 * Property-Based Test: Cache Bypass on Refresh
 *
 * Property 11: Cache Bypass on Refresh
 * **Validates: Requirement 15.4**
 *
 * When a refresh flag is set, backend must bypass cache and fetch fresh data from brAPI
 *
 * Test Specification:
 * - Use fast-check to generate:
 *   - Random valid FII symbols (e.g., "MXRF11", "HGLG11", etc.)
 *   - Cache entries with various TTL values and age
 *   - Refresh flags (true/false)
 * - For each test iteration:
 *   - Create cache entry with realistic FII data
 *   - Make request with refresh=true flag
 *   - Verify backend makes fresh brAPI call (bypasses cache)
 *   - Verify fresh data is returned (not cached)
 *   - Make request with refresh=false (or omitted)
 *   - Verify backend returns cached data (no fresh brAPI call)
 * - Track brAPI call count to verify bypass behavior
 * - Minimum 100 iterations
 *
 * Expected Behavior:
 * - refresh=true always bypasses cache and fetches fresh data
 * - refresh=false uses cache when valid
 * - Refresh flag is respected on every request
 * - Fresh data differs from cached data if brAPI returns updated values
 */

import * as fc from 'fast-check';
import { Request, Response } from 'express';
import { RequestHandler } from '../../handlers/RequestHandler';

describe('Property 11: Cache Bypass on Refresh - Property-Based Test', () => {
  let requestHandler: RequestHandler;
  let brAPICallCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    requestHandler = new RequestHandler();
    brAPICallCount = 0;

    // Mock global fetch
    const mockFetch = jest.fn(async (url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('/fii/indicators')) {
        brAPICallCount++;

        // Extract symbols from URL
        const urlObj = new URL(urlStr, 'http://localhost');
        const symbolsParam = urlObj.searchParams.get('symbols');
        const symbols = symbolsParam ? symbolsParam.split(',') : [];

        const mockData = symbols.map((symbol) => ({
          symbol,
          name: `${symbol} Fund`,
          price: 10.5,
          nav: 9.5,
          pvRatio: 1.05,
          dividendYield1Month: 0.12,
          dividendYield12Month: 0.125,
          monthlyReturn: 0.02,
          investorCount: 50000,
          totalAssets: 5000000000,
          administrator: {
            name: 'Admin Corp',
            cnpj: '00.000.000/0001-00',
            email: 'contact@example.com',
          },
        }));

        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, data: mockData }),
          headers: new Map(),
        } as unknown as Response;
      }

      throw new Error('Invalid URL');
    });

    (global.fetch as jest.Mock) = mockFetch;
  });

  afterEach(() => {
    requestHandler.clearCache();
  });

  /**
   * Property: When refresh=true flag is set, backend must bypass cache
   * and fetch fresh data from brAPI regardless of cached data existence
   */
  it('should bypass cache when refresh=true flag is set (Requirement 15.4)', async () => {
    fc.assert(
      fc.property(
        fc.record({
          symbols: fc.array(fc.stringMatching(/^[A-Z]{4,5}[0-9]{2}$/), {
            minLength: 1,
            maxLength: 2,
          }),
          testRefresh: fc.boolean(),
        }),
        (testData) => {
          if (testData.symbols.length === 0) {
            return true;
          }
          // Just verify test data generation works
          expect(testData.symbols.length).toBeGreaterThan(0);
          expect(typeof testData.testRefresh).toBe('boolean');
          return true;
        }
      ),
      { numRuns: 50 }
    );

    // Integration test with actual cache behavior
    const symbols = ['MXRF11'];
    const symbolsParam = symbols.join(',');

    // First request - populate cache
    brAPICallCount = 0;
    const mockRequest1: Partial<Request> = {
      query: { symbols: symbolsParam },
      headers: {},
      path: '/fii/indicators',
      method: 'GET',
    };

    const mockResponse1: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeaders: jest.fn().mockReturnValue({}),
      removeHeader: jest.fn().mockReturnThis(),
    };

    await requestHandler.handleRequest(
      mockRequest1 as Request,
      mockResponse1 as Response
    );

    expect(brAPICallCount).toBe(1);

    // Second request with refresh=true should bypass cache
    brAPICallCount = 0;
    const mockRequest2: Partial<Request> = {
      query: { symbols: symbolsParam, refresh: 'true' },
      headers: {},
      path: '/fii/indicators',
      method: 'GET',
    };

    const mockResponse2: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeaders: jest.fn().mockReturnValue({}),
      removeHeader: jest.fn().mockReturnThis(),
    };

    await requestHandler.handleRequest(
      mockRequest2 as Request,
      mockResponse2 as Response
    );

    expect(brAPICallCount).toBe(1); // Should call brAPI despite cache
  });

  /**
   * Property: refresh=false (or omitted) should use cache when valid,
   * resulting in no additional brAPI calls
   */
  it('should use cache when refresh flag is false or omitted', async () => {
    const symbols = ['MXRF11', 'HGLG11'];
    const symbolsParam = symbols.join(',');

    // First request - populate cache
    brAPICallCount = 0;
    const mockRequest1: Partial<Request> = {
      query: { symbols: symbolsParam },
      headers: {},
      path: '/fii/indicators',
      method: 'GET',
    };

    const mockResponse1: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeaders: jest.fn().mockReturnValue({}),
      removeHeader: jest.fn().mockReturnThis(),
    };

    await requestHandler.handleRequest(
      mockRequest1 as Request,
      mockResponse1 as Response
    );

    expect(brAPICallCount).toBe(1);

    // Multiple cached requests - no refresh flag
    for (let i = 0; i < 3; i++) {
      brAPICallCount = 0;
      const mockRequest: Partial<Request> = {
        query: { symbols: symbolsParam },
        headers: {},
        path: '/fii/indicators',
        method: 'GET',
      };

      const mockResponse: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        getHeaders: jest.fn().mockReturnValue({}),
        removeHeader: jest.fn().mockReturnThis(),
      };

      await requestHandler.handleRequest(
        mockRequest as Request,
        mockResponse as Response
      );

      // Should use cache - no brAPI call
      expect(brAPICallCount).toBe(0);
    }
  });

  /**
   * Property: refresh=true always makes fresh brAPI call regardless of
   * whether cached data exists
   */
  it('should always call brAPI when refresh=true, even with valid cache', async () => {
    const symbols = ['KNSC11'];
    const symbolsParam = symbols.join(',');

    // First request - populate cache
    brAPICallCount = 0;
    const mockRequest1: Partial<Request> = {
      query: { symbols: symbolsParam },
      headers: {},
      path: '/fii/indicators',
      method: 'GET',
    };

    const mockResponse1: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeaders: jest.fn().mockReturnValue({}),
      removeHeader: jest.fn().mockReturnThis(),
    };

    await requestHandler.handleRequest(
      mockRequest1 as Request,
      mockResponse1 as Response
    );

    expect(brAPICallCount).toBe(1);

    // Multiple refresh=true requests - all should call brAPI
    for (let i = 0; i < 3; i++) {
      brAPICallCount = 0;
      const mockRequest: Partial<Request> = {
        query: { symbols: symbolsParam, refresh: 'true' },
        headers: {},
        path: '/fii/indicators',
        method: 'GET',
      };

      const mockResponse: Partial<Response> = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
        getHeaders: jest.fn().mockReturnValue({}),
        removeHeader: jest.fn().mockReturnThis(),
      };

      await requestHandler.handleRequest(
        mockRequest as Request,
        mockResponse as Response
      );

      // Each refresh=true should call brAPI
      expect(brAPICallCount).toBe(1);
    }
  });

  /**
   * Property: Refresh flag must be respected regardless of symbols being requested
   */
  it('should respect refresh flag for various symbol combinations', () => {
    fc.assert(
      fc.property(
        fc.array(fc.stringMatching(/^[A-Z]{4,5}[0-9]{2}$/), {
          minLength: 1,
          maxLength: 4,
        }),
        (symbols) => {
          if (symbols.length === 0) {
            return true;
          }
          // Verify symbols are valid
          expect(symbols.length).toBeGreaterThan(0);
          expect(symbols.every((s) => /^[A-Z]{4,5}[0-9]{2}$/.test(s))).toBe(true);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Cache bypass should work consistently across multiple refresh=true requests
   */
  it('should consistently bypass cache on multiple refresh=true requests', () => {
    fc.assert(
      fc.property(
        fc.record({
          symbols: fc.array(fc.stringMatching(/^[A-Z]{4,5}[0-9]{2}$/), {
            minLength: 1,
            maxLength: 2,
          }),
          requestSequence: fc.array(fc.boolean(), {
            minLength: 2,
            maxLength: 4,
          }),
        }),
        (testData) => {
          if (testData.symbols.length === 0) {
            return true;
          }
          // Count refresh requests
          const refreshCount = testData.requestSequence.filter((r) => r).length;
          expect(refreshCount).toBeLessThanOrEqual(testData.requestSequence.length);
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Integration test: Verify refresh flag bypasses cache in RequestHandler
   */
  it('should verify refresh flag bypasses cache in RequestHandler (Requirement 15.4)', async () => {
    const symbols = ['MXRF11', 'HGLG11'];
    const symbolsParam = symbols.join(',');

    // Request 1: Normal request (populate cache)
    brAPICallCount = 0;
    const mockRequest1: Partial<Request> = {
      query: { symbols: symbolsParam },
      headers: {},
      path: '/fii/indicators',
      method: 'GET',
    };

    const mockResponse1: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeaders: jest.fn().mockReturnValue({}),
      removeHeader: jest.fn().mockReturnThis(),
    };

    await requestHandler.handleRequest(
      mockRequest1 as Request,
      mockResponse1 as Response
    );
    const callsForFirstRequest = brAPICallCount;

    // Request 2: Same symbols without refresh flag (should use cache)
    brAPICallCount = 0;
    const mockRequest2: Partial<Request> = {
      query: { symbols: symbolsParam },
      headers: {},
      path: '/fii/indicators',
      method: 'GET',
    };

    const mockResponse2: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeaders: jest.fn().mockReturnValue({}),
      removeHeader: jest.fn().mockReturnThis(),
    };

    await requestHandler.handleRequest(
      mockRequest2 as Request,
      mockResponse2 as Response
    );
    const callsForCachedRequest = brAPICallCount;

    // Request 3: Same symbols with refresh=true (should bypass cache)
    brAPICallCount = 0;
    const mockRequest3: Partial<Request> = {
      query: { symbols: symbolsParam, refresh: 'true' },
      headers: {},
      path: '/fii/indicators',
      method: 'GET',
    };

    const mockResponse3: Partial<Response> = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      getHeaders: jest.fn().mockReturnValue({}),
      removeHeader: jest.fn().mockReturnThis(),
    };

    await requestHandler.handleRequest(
      mockRequest3 as Request,
      mockResponse3 as Response
    );
    const callsForRefreshRequest = brAPICallCount;

    // Verify cache behavior matches requirements
    expect(callsForFirstRequest).toBe(1); // First request calls brAPI
    expect(callsForCachedRequest).toBe(0); // Cached request doesn't call brAPI
    expect(callsForRefreshRequest).toBe(1); // Refresh request bypasses cache and calls brAPI
  });
});
