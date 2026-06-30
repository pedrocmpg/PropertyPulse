/**
 * Unit tests for RequestHandler middleware
 * Tests symbol validation, caching, brAPI integration, error handling
 */

import { Request, Response } from 'express';
import { RequestHandler } from './RequestHandler';

// Mock fetch for brAPI calls
global.fetch = jest.fn();

// Mock config
jest.mock('../config/config', () => ({
  BRAPI_TOKEN: 'test-token-12345',
  BRAPI_BASE_URL: 'https://brapi.dev/api/v2',
  BACKEND_PORT: 3001,
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  CACHE_TTL_SECONDS: 300,
  REQUEST_TIMEOUT_MS: 10000,
  MAX_RETRIES: 3,
}));

// Mock Logger to suppress test output
jest.mock('../utils/Logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('RequestHandler', () => {
  let handler: RequestHandler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let removeHeaderMock: jest.Mock;
  let getHeadersMock: jest.Mock;

  const setupMocks = () => {
    jsonMock = jest.fn().mockReturnValue(undefined);
    statusMock = jest.fn().mockReturnThis();
    removeHeaderMock = jest.fn();
    getHeadersMock = jest.fn().mockReturnValue({});
    
    mockResponse = {
      json: jsonMock,
      status: statusMock,
      removeHeader: removeHeaderMock,
      getHeaders: getHeadersMock,
    };
    
    mockRequest = {
      query: {},
    };
  };

  beforeEach(() => {
    handler = new RequestHandler();
    jest.clearAllMocks();
    setupMocks();
  });

  describe('Symbol Validation', () => {
    it('should reject missing symbols parameter', async () => {
      mockRequest.query = {};
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.error.code).toBe('MISSING_SYMBOLS');
    });

    it('should reject empty symbols string', async () => {
      mockRequest.query = { symbols: '   ' };  // Only whitespace
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('EMPTY_SYMBOLS');
    });

    it('should reject invalid symbol format', async () => {
      mockRequest.query = { symbols: 'MXRF11,INVALID@SYMBOL' };
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('INVALID_SYMBOL_FORMAT');
    });

    it('should accept valid single symbol', async () => {
      mockRequest.query = { symbols: 'MXRF11' };
      
      const mockBrAPIResponse = {
        data: [{
          symbol: 'MXRF11',
          price: 9.74,
          nav: 9.3678,
          dividendYield1Month: 0.12268994,
          dividendYield12Month: 0.12543876,
          monthlyReturn: 0.02543,
          investorCount: 45678,
          totalAssets: 4313692700,
          administrator: {
            name: 'XP Administração',
            cnpj: '00.000.000/0001-00',
            email: 'contact@xp.com.br',
          },
        }],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
    });

    it('should accept multiple valid symbols', async () => {
      mockRequest.query = { symbols: 'MXRF11,HGLG11,KNSC11' };
      
      const mockBrAPIResponse = {
        data: [
          {
            symbol: 'MXRF11',
            price: 9.74,
            nav: 9.3678,
            dividendYield1Month: 0.12268994,
            dividendYield12Month: 0.12543876,
            monthlyReturn: 0.02543,
            investorCount: 45678,
            totalAssets: 4313692700,
            administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
          },
          {
            symbol: 'HGLG11',
            price: 150.5,
            nav: 140.0,
            dividendYield1Month: 0.08,
            dividendYield12Month: 0.10,
            monthlyReturn: 0.01,
            investorCount: 100000,
            totalAssets: 5000000000,
            administrator: { name: 'BTG', cnpj: '00', email: 'b@b.br' },
          },
          {
            symbol: 'KNSC11',
            price: 50.0,
            nav: 48.0,
            dividendYield1Month: 0.05,
            dividendYield12Month: 0.06,
            monthlyReturn: 0.02,
            investorCount: 50000,
            totalAssets: 1000000000,
            administrator: { name: 'Kinea', cnpj: '00', email: 'k@k.br' },
          },
        ],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.data).toHaveLength(3);
    });

    it('should trim whitespace from symbols', async () => {
      mockRequest.query = { symbols: '  MXRF11  ,  HGLG11  ' };
      
      const mockBrAPIResponse = {
        data: [
          {
            symbol: 'MXRF11',
            price: 9.74,
            nav: 9.3678,
            dividendYield1Month: 0.1,
            dividendYield12Month: 0.1,
            monthlyReturn: 0.01,
            investorCount: 45678,
            totalAssets: 4313692700,
            administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
          },
          {
            symbol: 'HGLG11',
            price: 150.5,
            nav: 140.0,
            dividendYield1Month: 0.08,
            dividendYield12Month: 0.10,
            monthlyReturn: 0.01,
            investorCount: 100000,
            totalAssets: 5000000000,
            administrator: { name: 'BTG', cnpj: '00', email: 'b@b.br' },
          },
        ],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Caching', () => {
    const mockBrAPIResponse = {
      data: [{
        symbol: 'MXRF11',
        price: 9.74,
        nav: 9.3678,
        dividendYield1Month: 0.12268994,
        dividendYield12Month: 0.12543876,
        monthlyReturn: 0.02543,
        investorCount: 45678,
        totalAssets: 4313692700,
        administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
      }],
    };

    it('should store response in cache after successful brAPI call', async () => {
      mockRequest.query = { symbols: 'MXRF11' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // First call should hit brAPI
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Reset mocks and make second request
      jest.clearAllMocks();
      jsonMock = jest.fn().mockReturnValue(undefined);
      statusMock = jest.fn().mockReturnThis();
      mockResponse = {
        json: jsonMock,
        status: statusMock,
        removeHeader: removeHeaderMock,
        getHeaders: getHeadersMock,
      };
      
      // Second request should use cache
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // Second request should NOT call brAPI (cache hit)
      expect(global.fetch).not.toHaveBeenCalled();
      
      // But should still return the data
      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
    });

    it('should bypass cache when refresh flag is set', async () => {
      mockRequest.query = { symbols: 'MXRF11' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      // First request
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Reset and make second request with refresh flag
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      mockRequest.query = { symbols: 'MXRF11', refresh: 'true' };
      jsonMock = jest.fn().mockReturnValue(undefined);
      statusMock = jest.fn().mockReturnThis();
      mockResponse = {
        json: jsonMock,
        status: statusMock,
        removeHeader: removeHeaderMock,
        getHeaders: getHeadersMock,
      };
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // Should call brAPI again despite cache
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use separate cache entries for different symbol combinations', async () => {
      // First request: MXRF11
      mockRequest.query = { symbols: 'MXRF11' };
      
      const response1 = {
        data: [{
          symbol: 'MXRF11',
          price: 9.74,
          nav: 9.3678,
          dividendYield1Month: 0.12,
          dividendYield12Month: 0.125,
          monthlyReturn: 0.025,
          investorCount: 45678,
          totalAssets: 4313692700,
          administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
        }],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(response1),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      expect(global.fetch).toHaveBeenCalledTimes(1);
      
      // Second request: HGLG11 (different symbol)
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({
          data: [{
            symbol: 'HGLG11',
            price: 150.5,
            nav: 140.0,
            dividendYield1Month: 0.08,
            dividendYield12Month: 0.10,
            monthlyReturn: 0.01,
            investorCount: 100000,
            totalAssets: 5000000000,
            administrator: { name: 'BTG', cnpj: '00', email: 'b@b.br' },
          }],
        }),
      });
      
      mockRequest.query = { symbols: 'HGLG11' };
      jsonMock = jest.fn().mockReturnValue(undefined);
      statusMock = jest.fn().mockReturnThis();
      mockResponse = {
        json: jsonMock,
        status: statusMock,
        removeHeader: removeHeaderMock,
        getHeaders: getHeadersMock,
      };
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // Should call brAPI for different symbol
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle brAPI timeout', async () => {
      mockRequest.query = { symbols: 'MXRF11' };
      
      const error: any = new Error('Timeout');
      error.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(504);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('TIMEOUT');
    });

    it('should handle brAPI 401 authentication error', async () => {
      jest.clearAllMocks();
      jsonMock = jest.fn().mockReturnValue(undefined);
      statusMock = jest.fn().mockReturnThis();
      removeHeaderMock = jest.fn();
      getHeadersMock = jest.fn().mockReturnValue({});
      
      mockResponse = {
        json: jsonMock,
        status: statusMock,
        removeHeader: removeHeaderMock,
        getHeaders: getHeadersMock,
      };
      
      mockRequest.query = { symbols: 'MXRF11' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(401);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('AUTH_FAILED');
    });

    it('should handle brAPI 429 rate limit error', async () => {
      jest.clearAllMocks();
      setupMocks();
      
      mockRequest.query = { symbols: 'MXRF11' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(429);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('RATE_LIMITED');
      
      // Circuit breaker should be OPEN after 429
      expect(handler.getCircuitBreakerState()).toBe('OPEN');
    });

    it('should handle brAPI 5xx errors', async () => {
      jest.clearAllMocks();
      setupMocks();
      
      mockRequest.query = { symbols: 'MXRF11' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 503,
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(503);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle connection refused error', async () => {
      jest.clearAllMocks();
      setupMocks();
      
      mockRequest.query = { symbols: 'MXRF11' };
      
      const error: any = new Error('Connection refused');
      error.code = 'ECONNREFUSED';
      (global.fetch as jest.Mock).mockRejectedValueOnce(error);
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(503);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should handle invalid JSON response', async () => {
      jest.clearAllMocks();
      setupMocks();
      
      mockRequest.query = { symbols: 'MXRF11' };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockRejectedValueOnce(new SyntaxError('Invalid JSON')),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('INVALID_JSON');
    });

    it('should skip invalid FII records (missing NAV)', async () => {
      jest.clearAllMocks();
      setupMocks();
      
      mockRequest.query = { symbols: 'MXRF11,INVALID' };
      
      const brAPIResponse = {
        data: [
          {
            symbol: 'MXRF11',
            price: 9.74,
            nav: 9.3678,  // Valid NAV
            dividendYield1Month: 0.12,
            dividendYield12Month: 0.125,
            monthlyReturn: 0.025,
            investorCount: 45678,
            totalAssets: 4313692700,
            administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
          },
          {
            symbol: 'INVALID',
            price: 50.0,
            nav: null,  // Invalid: null NAV
            dividendYield1Month: 0.08,
            dividendYield12Month: 0.10,
            monthlyReturn: 0.01,
            investorCount: 100000,
            totalAssets: 5000000000,
            administrator: { name: 'Other', cnpj: '00', email: 'o@o.br' },
          },
        ],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(brAPIResponse),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // Should succeed with only valid record
      expect(statusMock).toHaveBeenCalledWith(200);
      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].symbol).toBe('MXRF11');
    });

    it('should reject FII records with string numeric fields', async () => {
      jest.clearAllMocks();
      setupMocks();
      
      mockRequest.query = { symbols: 'MXRF11' };
      
      const mockBrAPIResponse: any = {
        data: [{
          symbol: 'MXRF11',
          price: '9.74',  // String instead of number - should be rejected
          nav: 9.3678,
          dividendYield1Month: 0.12,
          dividendYield12Month: 0.125,
          monthlyReturn: 0.025,
          investorCount: 45678,
          totalAssets: 4313692700,
          administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
        }],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // Should fail because all FII records are invalid
      expect(statusMock).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.code).toBe('INVALID_RESPONSE');
    });
  });

  describe('Response Formatting', () => {
    it('should include success flag in response', async () => {
      mockRequest.query = { symbols: 'MXRF11' };
      
      const mockBrAPIResponse = {
        data: [{
          symbol: 'MXRF11',
          price: 9.74,
          nav: 9.3678,
          dividendYield1Month: 0.12,
          dividendYield12Month: 0.125,
          monthlyReturn: 0.025,
          investorCount: 45678,
          totalAssets: 4313692700,
          administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
        }],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      const response = jsonMock.mock.calls[0][0];
      expect(response).toHaveProperty('success', true);
      expect(response).toHaveProperty('data');
    });

    it('should include error object on failure', async () => {
      mockRequest.query = { symbols: 'INVALID@SYMBOL' };
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      const response = jsonMock.mock.calls[0][0];
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response.error).toHaveProperty('code');
      expect(response.error).toHaveProperty('message');
      expect(response.error).toHaveProperty('statusCode');
      expect(response.error).toHaveProperty('timestamp');
    });

    it('should include Authorization header in brAPI request', async () => {
      mockRequest.query = { symbols: 'MXRF11' };
      
      const mockBrAPIResponse = {
        data: [{
          symbol: 'MXRF11',
          price: 9.74,
          nav: 9.3678,
          dividendYield1Month: 0.12,
          dividendYield12Month: 0.125,
          monthlyReturn: 0.025,
          investorCount: 45678,
          totalAssets: 4313692700,
          administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
        }],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // Check that fetch was called with Authorization header
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[1].headers['Authorization']).toBe('Bearer test-token-12345');
    });
  });

  describe('Sensitive Header Stripping', () => {
    it('should remove Authorization header from response', async () => {
      mockRequest.query = { symbols: 'MXRF11' };
      
      const mockBrAPIResponse = {
        data: [{
          symbol: 'MXRF11',
          price: 9.74,
          nav: 9.3678,
          dividendYield1Month: 0.12,
          dividendYield12Month: 0.125,
          monthlyReturn: 0.025,
          investorCount: 45678,
          totalAssets: 4313692700,
          administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
        }],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      getHeadersMock.mockReturnValueOnce({ authorization: 'Bearer token' });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // Should remove Authorization header
      expect(removeHeaderMock).toHaveBeenCalledWith('authorization');
    });

    it('should remove X-Auth-* headers from response', async () => {
      mockRequest.query = { symbols: 'MXRF11' };
      
      const mockBrAPIResponse = {
        data: [{
          symbol: 'MXRF11',
          price: 9.74,
          nav: 9.3678,
          dividendYield1Month: 0.12,
          dividendYield12Month: 0.125,
          monthlyReturn: 0.025,
          investorCount: 45678,
          totalAssets: 4313692700,
          administrator: { name: 'XP', cnpj: '00', email: 'x@x.br' },
        }],
      };
      
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockBrAPIResponse),
      });
      
      getHeadersMock.mockReturnValueOnce({
        'x-auth-token': 'token123',
        'x-admin-user': 'admin',
      });
      
      await handler.handleRequest(mockRequest as Request, mockResponse as Response);
      
      // Should remove both X-Auth-* and X-Admin-* headers
      expect(removeHeaderMock).toHaveBeenCalledWith('x-auth-token');
      expect(removeHeaderMock).toHaveBeenCalledWith('x-admin-user');
    });
  });
});

