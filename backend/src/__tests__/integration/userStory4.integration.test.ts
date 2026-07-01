/**
 * Integration Test: User Story 4 - Cache Expiration
 *
 * User requests "MXRF11" at time T, backend caches for 5 minutes.
 * User requests at T+6 minutes.
 * Verify: Cache expired, fresh data fetched from brAPI.
 *
 * Requirements: 15.1, 15.3, 15.5
 */

import axios from 'axios';
import { RequestHandler } from '../../handlers/RequestHandler';
import { Request, Response } from 'express';

const mockBrAPIResponseV1 = {
  results: [
    {
      symbol: 'MXRF11',
      name: 'Maxi Renda Fixa Imobiliário',
      price: 9.74,
      nav: 9.3678,
      pvRatio: 1.0392547,
      dividendYield1Month: 0.12268994,
      dividendYield12Month: 0.12543876,
      monthlyReturn: 0.02543,
      investorCount: 45678,
      totalAssets: 4313692700,
      administrator: {
        name: 'XP Administração de Recursos Ltda',
        cnpj: '00.000.000/0001-00',
        email: 'contact@xp.com.br',
      },
    },
  ],
};

// Simulated updated price after 6 minutes
const mockBrAPIResponseV2 = {
  results: [
    {
      symbol: 'MXRF11',
      name: 'Maxi Renda Fixa Imobiliário',
      price: 9.85, // Updated price
      nav: 9.4,
      pvRatio: 1.0479,
      dividendYield1Month: 0.12350994,
      dividendYield12Month: 0.12625876,
      monthlyReturn: 0.02850, // Updated return
      investorCount: 45700, // Updated count
      totalAssets: 4320000000, // Updated assets
      administrator: {
        name: 'XP Administração de Recursos Ltda',
        cnpj: '00.000.000/0001-00',
        email: 'contact@xp.com.br',
      },
    },
  ],
};

describe('User Story 4: Cache Expiration - Integration Test', () => {
  let requestHandler: RequestHandler;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let sentData: any;
  let brAPICallCount = 0;
  let currentTime = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    brAPICallCount = 0;
    sentData = null;
    currentTime = 0;

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

    // Mock axios to return V1 initially
    let callCount = 0;
    (axios.get as jest.Mock) = jest.fn().mockImplementation(() => {
      brAPICallCount++;
      callCount++;
      
      // Return V2 after 6+ minutes have passed
      if (currentTime >= 360000) { // 6 minutes = 360000 ms
        return Promise.resolve({
          status: 200,
          data: mockBrAPIResponseV2,
          headers: {},
        });
      }
      
      return Promise.resolve({
        status: 200,
        data: mockBrAPIResponseV1,
        headers: {},
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    requestHandler.clearCache();
  });

  it('should cache FII data for 5 minutes (300000 ms)', async () => {
    // Request at T=0
    currentTime = 0;
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    expect(brAPICallCount).toBe(1);
    const initialData = sentData.data[0];

    // Reset mock
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Request at T=2 minutes (within 5-minute TTL) - should use cache
    jest.advanceTimersByTime(120000); // 2 minutes
    currentTime = 120000;

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify brAPI was NOT called (cache hit)
    expect(brAPICallCount).toBe(0);
    expect(sentData.data[0]).toEqual(initialData);
  });

  it('should expire cache after 5 minutes and fetch fresh data', async () => {
    // Request at T=0
    currentTime = 0;
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    expect(brAPICallCount).toBe(1);
    const cachedData = sentData.data[0];

    // Reset mock
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Advance time by 6 minutes (exceeds 5-minute TTL)
    jest.advanceTimersByTime(360000); // 6 minutes
    currentTime = 360000;

    // Request should fetch fresh data from brAPI
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify brAPI was called (cache expired)
    expect(brAPICallCount).toBe(1);
    expect(sentData.data[0]).not.toEqual(cachedData);
  });

  it('should return updated data after cache expiration', async () => {
    // First request at T=0
    currentTime = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    const firstPrice = sentData.data[0].price;

    // Reset mock
    (axios.get as jest.Mock).mockClear();

    // Advance time by 6 minutes
    jest.advanceTimersByTime(360000);
    currentTime = 360000;

    // Second request - should get fresh data with updated price
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    const secondPrice = sentData.data[0].price;

    // Verify price was updated
    expect(secondPrice).toBe(9.85); // V2 price
    expect(secondPrice).not.toBe(firstPrice); // Should be different from cached V1
  });

  it('should keep cache valid at exactly 5 minutes', async () => {
    // Request at T=0
    currentTime = 0;
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    expect(brAPICallCount).toBe(1);

    // Reset mock
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Advance time by exactly 5 minutes (should still be valid)
    jest.advanceTimersByTime(300000); // 5 minutes
    currentTime = 300000;

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Cache should still be valid at 5 minutes (verifying through brAPI call count)
    expect(brAPICallCount).toBeLessThanOrEqual(0);
  });

  it('should expire cache immediately after 5 minutes', async () => {
    // Request at T=0
    currentTime = 0;
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    expect(brAPICallCount).toBe(1);

    // Reset mock
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Advance time by 5 minutes + 1 millisecond (should be expired)
    jest.advanceTimersByTime(300001); // 5 minutes + 1ms
    currentTime = 300001;

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Cache should be expired, brAPI should be called
    expect(brAPICallCount).toBe(1);
  });

  it('should handle multiple symbols with individual TTLs', async () => {
    // Request MXRF11
    mockRequest.query = { symbols: 'MXRF11' };
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    expect(brAPICallCount).toBe(1);

    // Reset and request HGLG11 (different symbol)
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    mockRequest.query = { symbols: 'HGLG11' };
    (axios.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: {
        results: [
          {
            symbol: 'HGLG11',
            name: 'Hotel Concept',
            price: 10.25,
            nav: 10.1,
            pvRatio: 1.0149,
            dividendYield1Month: 0.09,
            dividendYield12Month: 0.11,
            monthlyReturn: 0.015,
            investorCount: 32000,
            totalAssets: 2500000000,
            administrator: {
              name: 'Hotel Concept',
              cnpj: '00.000.000/0002-00',
              email: 'contact@hglg.com.br',
            },
          },
        ],
      },
      headers: {},
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    expect(brAPICallCount).toBe(1);

    // Advance time by 3 minutes
    jest.advanceTimersByTime(180000);
    currentTime = 180000;

    // Request MXRF11 again - should still be cached
    mockRequest.query = { symbols: 'MXRF11' };
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // MXRF11 cache still valid (only 3 minutes passed)
    expect(brAPICallCount).toBe(0);
  });

  it('should allow manual refresh to bypass expiration', async () => {
    // Request at T=0
    currentTime = 0;
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    expect(brAPICallCount).toBe(1);

    // Reset mock
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Advance time by 3 minutes (well within TTL)
    jest.advanceTimersByTime(180000);
    currentTime = 180000;

    // Add refresh flag to force fresh data fetch
    mockRequest.query = { symbols: 'MXRF11', refresh: 'true' };

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Even though cache is valid, refresh should call brAPI
    expect(brAPICallCount).toBeGreaterThan(0);
  });

  it('should maintain separate cache expiration times for different symbols', async () => {
    // Request MXRF11 at T=0
    mockRequest.query = { symbols: 'MXRF11' };
    currentTime = 0;
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Advance 2 minutes
    jest.advanceTimersByTime(120000);
    currentTime = 120000;

    // Request HGLG11 at T=2min (creates separate cache entry)
    mockRequest.query = { symbols: 'HGLG11' };
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    (axios.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: {
        results: [
          {
            symbol: 'HGLG11',
            name: 'Hotel Concept',
            price: 10.25,
            nav: 10.1,
            pvRatio: 1.0149,
            dividendYield1Month: 0.09,
            dividendYield12Month: 0.11,
            monthlyReturn: 0.015,
            investorCount: 32000,
            totalAssets: 2500000000,
            administrator: {
              name: 'Hotel Concept',
              cnpj: '00.000.000/0002-00',
              email: 'contact@hglg.com.br',
            },
          },
        ],
      },
      headers: {},
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Advance another 4 minutes (T=6min total, 4min since HGLG11 cached)
    jest.advanceTimersByTime(240000);
    currentTime = 360000;

    // MXRF11 cache should be expired (6 minutes total)
    mockRequest.query = { symbols: 'MXRF11' };
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // MXRF11 should be expired and need fresh fetch
    expect(brAPICallCount).toBeGreaterThan(0);

    // HGLG11 cache should still be valid (only 4 minutes total, <5 minute TTL)
    mockRequest.query = { symbols: 'HGLG11' };
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // HGLG11 should still be cached (0 brAPI calls)
    expect(brAPICallCount).toBe(0);
  });

  it('should handle rapid requests after cache expiration', async () => {
    // Initial request
    currentTime = 0;
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    expect(brAPICallCount).toBe(1);

    // Expire cache
    jest.advanceTimersByTime(360000);
    currentTime = 360000;

    // Reset mock and make rapid requests
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Make 3 rapid requests in quick succession
    for (let i = 0; i < 3; i++) {
      await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    }

    // All 3 should fetch fresh (first call to brAPI, then cached for subsequent requests)
    // In this test, we're testing that rapid requests after expiration work correctly
    expect(brAPICallCount).toBeGreaterThan(0);
  });

  it('should verify data changes after cache expiration', async () => {
    // First request - get V1 data
    currentTime = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    const v1Data = {
      price: sentData.data[0].price,
      pvRatio: sentData.data[0].pvRatio,
      monthlyReturn: sentData.data[0].monthlyReturn,
      investorCount: sentData.data[0].investorCount,
      totalAssets: sentData.data[0].totalAssets,
    };

    // Expire cache
    jest.advanceTimersByTime(360000);
    currentTime = 360000;

    // Reset mock
    (axios.get as jest.Mock).mockClear();

    // Second request - should get V2 data
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    const v2Data = {
      price: sentData.data[0].price,
      pvRatio: sentData.data[0].pvRatio,
      monthlyReturn: sentData.data[0].monthlyReturn,
      investorCount: sentData.data[0].investorCount,
      totalAssets: sentData.data[0].totalAssets,
    };

    // Verify all metrics changed
    expect(v2Data.price).toBe(9.85);
    expect(v2Data.pvRatio).toBe(1.0479);
    expect(v2Data.monthlyReturn).toBe(0.0285);
    expect(v2Data.investorCount).toBe(45700);
    expect(v2Data.totalAssets).toBe(4320000000);

    // Verify changes are different from V1
    expect(v2Data.price).not.toBe(v1Data.price);
    expect(v2Data.pvRatio).not.toBe(v1Data.pvRatio);
    expect(v2Data.monthlyReturn).not.toBe(v1Data.monthlyReturn);
    expect(v2Data.investorCount).not.toBe(v1Data.investorCount);
    expect(v2Data.totalAssets).not.toBe(v1Data.totalAssets);
  });
});
