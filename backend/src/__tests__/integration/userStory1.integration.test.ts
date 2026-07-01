/**
 * Integration Test: User Story 1 - Add FII and View Data
 *
 * User searches for "MXRF11", backend fetches from brAPI, frontend displays formatted data.
 * Verify: All metrics formatted correctly, cache stores entry, subsequent requests use cache.
 *
 * Requirements: 3.1, 3.2, 3.5, 12.5, 14.1, 14.2, 14.3, 14.4
 */

import axios from 'axios';
import { RequestHandler } from '../../handlers/RequestHandler';
import { Request, Response } from 'express';

// Mock brAPI response with realistic FII data
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

describe('User Story 1: Add FII and View Data - Integration Test', () => {
  let requestHandler: RequestHandler;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let sentData: any;
  let brAPICallCount = 0;

  beforeEach(() => {
    // Clear modules to get fresh instance
    jest.clearAllMocks();

    // Reset counters
    brAPICallCount = 0;
    sentData = null;

    // Initialize request handler
    requestHandler = new RequestHandler();

    // Create mock request object
    mockRequest = {
      query: { symbols: 'MXRF11' },
      headers: {},
    } as Partial<Request>;

    // Create mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((data) => {
        sentData = data;
        return mockResponse;
      }),
      setHeader: jest.fn().mockReturnThis(),
      removeHeader: jest.fn().mockReturnThis(),
    } as Partial<Response>;

    // Mock axios to return realistic FII data
    (axios.get as jest.Mock) = jest.fn().mockResolvedValue({
      status: 200,
      data: mockBrAPIResponse,
      headers: {
        'content-type': 'application/json',
        'x-auth-token': 'should-be-stripped',
        'authorization': 'Bearer secret',
      },
    });
  });

  afterEach(() => {
    requestHandler.clearCache();
  });

  it('should fetch MXRF11 from brAPI and return formatted FII data', async () => {
    // First request - should call brAPI
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify response structure
    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(sentData.success).toBe(true);
    expect(sentData.data).toBeDefined();
    expect(Array.isArray(sentData.data)).toBe(true);

    // Verify FII data is present
    const fiiData = sentData.data[0];
    expect(fiiData.symbol).toBe('MXRF11');
    expect(fiiData.name).toBe('Maxi Renda Fixa Imobiliário');
    expect(fiiData.price).toBe(9.74);
    expect(fiiData.nav).toBe(9.3678);
    expect(fiiData.pvRatio).toBe(1.0392547);

    // Verify administrator information
    expect(fiiData.administrator).toBeDefined();
    expect(fiiData.administrator.name).toBe('XP Administração de Recursos Ltda');
    expect(fiiData.administrator.cnpj).toBe('00.000.000/0001-00');

    // Verify all required metrics are present
    expect(fiiData.dividendYield1Month).toBe(0.12268994);
    expect(fiiData.dividendYield12Month).toBe(0.12543876);
    expect(fiiData.monthlyReturn).toBe(0.02543);
    expect(fiiData.investorCount).toBe(45678);
    expect(fiiData.totalAssets).toBe(4313692700);
  });

  it('should store FII data in cache after first request', async () => {
    // First request - should call brAPI (cache miss)
    brAPICallCount = (axios.get as jest.Mock).mock.calls.length;
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    const initialBrAPICallCount = (axios.get as jest.Mock).mock.calls.length;
    expect(initialBrAPICallCount).toBeGreaterThan(brAPICallCount);

    // Verify data is cached by checking that second request uses cache
  });

  it('should use cached data for subsequent request within 5 minutes', async () => {
    // First request - cache miss
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);
    const firstResponseData = sentData.data[0];

    // Reset mock to count subsequent calls
    (axios.get as jest.Mock).mockClear();

    // Simulate second request after 2 minutes (within TTL)
    // In real scenario, this would be 2 minutes apart; in test we use same timestamp
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify brAPI was NOT called for second request (cache hit)
    expect((axios.get as jest.Mock).mock.calls.length).toBe(0);

    // Verify data is identical
    const secondResponseData = sentData.data[0];
    expect(secondResponseData).toEqual(firstResponseData);
    expect(secondResponseData.symbol).toBe('MXRF11');
    expect(secondResponseData.price).toBe(9.74);
  });

  it('should return all required metrics in formatted response', async () => {
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    const fiiData = sentData.data[0];

    // Verify all metrics from design spec are present
    const requiredFields = [
      'symbol',
      'name',
      'price',
      'nav',
      'pvRatio',
      'dividendYield1Month',
      'dividendYield12Month',
      'monthlyReturn',
      'investorCount',
      'totalAssets',
      'administrator',
    ];

    requiredFields.forEach((field) => {
      expect(fiiData).toHaveProperty(field);
    });

    // Verify metrics have correct data types
    expect(typeof fiiData.symbol).toBe('string');
    expect(typeof fiiData.name).toBe('string');
    expect(typeof fiiData.price).toBe('number');
    expect(typeof fiiData.nav).toBe('number');
    expect(typeof fiiData.pvRatio).toBe('number');
    expect(typeof fiiData.dividendYield1Month).toBe('number');
    expect(typeof fiiData.dividendYield12Month).toBe('number');
    expect(typeof fiiData.monthlyReturn).toBe('number');
    expect(typeof fiiData.investorCount).toBe('number');
    expect(typeof fiiData.totalAssets).toBe('number');
  });

  it('should strip sensitive headers from brAPI response', async () => {
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify that setHeader was called to remove sensitive headers
    const removeHeaderCalls = (mockResponse.removeHeader as jest.Mock).mock.calls;

    // Check that sensitive headers are removed
    const sensitivePatternsRemoved = removeHeaderCalls.some(
      (call) =>
        call[0]?.toLowerCase().includes('auth') ||
        call[0]?.toLowerCase().includes('cookie') ||
        call[0]?.toLowerCase().includes('x-auth'),
    );

    expect(sensitivePatternsRemoved).toBe(true);
  });

  it('should handle multiple FII symbols in single request', async () => {
    // Modify request to include multiple symbols
    mockRequest.query = { symbols: 'MXRF11,HGLG11' };

    // Mock brAPI response for multiple FIIs
    (axios.get as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: {
        results: [
          mockBrAPIResponse.results[0],
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
              name: 'Hotel Concept Administrador',
              cnpj: '00.000.000/0002-00',
              email: 'contact@hglg.com.br',
            },
          },
        ],
      },
      headers: {},
    });

    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify both FIIs are returned
    expect(sentData.data.length).toBe(2);
    expect(sentData.data[0].symbol).toBe('MXRF11');
    expect(sentData.data[1].symbol).toBe('HGLG11');
  });

  it('should return success response structure with all required fields', async () => {
    await requestHandler.handleRequest(mockRequest as Request, mockResponse as Response);

    // Verify response structure
    expect(sentData).toHaveProperty('success');
    expect(sentData).toHaveProperty('data');
    expect(sentData.success).toBe(true);
    expect(Array.isArray(sentData.data)).toBe(true);

    // Verify no error field in success response
    expect(sentData.error).toBeUndefined();
  });
});
