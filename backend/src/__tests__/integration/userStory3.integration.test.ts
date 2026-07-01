/**
 * Integration Test: User Story 3 - Cache Hit
 *
 * User requests "MXRF11" at time T, user requests again at T+2 minutes.
 * Verify: Backend returns cached result without calling brAPI, data identical.
 *
 * Requirements: 15.1, 15.2, 15.3
 */

import axios from 'axios';
import { RequestHandler } from '../../handlers/RequestHandler';
import { Request, Response } from 'express';

const mockBrAPIResponse = {
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

describe('User Story 3: Cache Hit - Integration Test', () => {
  let requestHandler: RequestHandler;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let sentData: any;
  let brAPICallCount = 0;

  beforeEach(() => {
    jest.clearAllMocks();

    brAPICallCount = 0;
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

    // Mock axios and track call count
    (axios.get as jest.Mock) = jest.fn().mockImplementation(() => {
      brAPICallCount++;
      return Promise.resolve({
        status: 200,
        data: mockBrAPIResponse,
        headers: {},
      });
    });
  });

  afterEach(() => {
    requestHandler.clearCache();
  });

  it('should cache FII data after first request', async () => {
    // First request - should call brAPI (cache miss)
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify brAPI was called
    expect(brAPICallCount).toBe(1);

    // Verify response is successful
    expect(sentData.success).toBe(true);
    expect(sentData.data.length).toBe(1);
    expect(sentData.data[0].symbol).toBe('MXRF11');
  });

  it('should return cached data on second request without calling brAPI', async () => {
    // First request
    brAPICallCount = 0;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    expect(brAPICallCount).toBe(1);

    const firstResponseData = sentData.data[0];

    // Reset mock to track subsequent calls
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Second request (within cache TTL of 5 minutes)
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify brAPI was NOT called
    expect(brAPICallCount).toBe(0);

    // Verify cached data is returned
    expect(sentData.success).toBe(true);
    expect(sentData.data[0]).toEqual(firstResponseData);
  });

  it('should return identical data from cache as from brAPI', async () => {
    // First request - get data from brAPI
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    const firstResponseData = JSON.stringify(sentData.data);

    // Reset for second request
    (axios.get as jest.Mock).mockClear();

    // Second request - should use cache
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    const secondResponseData = JSON.stringify(sentData.data);

    // Verify data is identical
    expect(secondResponseData).toBe(firstResponseData);
  });

  it('should verify cache stores correct symbol', async () => {
    // Request for MXRF11
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Reset mock
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Second request for same symbol
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify brAPI not called (cache hit for MXRF11)
    expect(brAPICallCount).toBe(0);
  });

  it('should prevent redundant brAPI calls for same symbols within cache window', async () => {
    // Simulate rapid requests for same symbol
    brAPICallCount = 0;

    // First request
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    expect(brAPICallCount).toBe(1);

    // Reset mock to track subsequent calls
    (axios.get as jest.Mock).mockClear();
    brAPICallCount = 0;

    // Simulate 3 more requests in quick succession
    for (let i = 0; i < 3; i++) {
      await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    }

    // Verify brAPI was never called again (all cache hits)
    expect(brAPICallCount).toBe(0);
  });
});
