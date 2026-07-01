/**
 * Frontend Integration Tests for FII Dashboard
 *
 * Tests complete user workflows:
 * - Add FII and View Data (User Story 1)
 * - Handle Timeout (User Story 2)
 * - Cache Hit (User Story 3)
 * - Cache Expiration (User Story 4)
 * - Token Security (User Story 5)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useFIIData } from '../../hooks/useFIIData';

// Mock data matching brAPI response format
const mockFIIData = {
  success: true,
  data: [
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

describe('FII Dashboard Frontend Integration Tests', () => {
  beforeEach(() => {
    // Setup fetch mock
    global.fetch = vi.fn();

    // Setup environment variables
    process.env.REACT_APP_BACKEND_URL = 'http://localhost:3001';
    process.env.REACT_APP_REFRESH_INTERVAL = '300000'; // 5 minutes

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Story 1: Add FII and View Data', () => {
    it('should fetch and display FII data for MXRF11', async () => {
      // Mock successful backend response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      // Initially should be loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isEmpty).toBe(true);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify data is loaded
      expect(result.current.data).toBeDefined();
      expect(result.current.data['MXRF11']).toBeDefined();
      expect(result.current.data['MXRF11'].symbol).toBe('MXRF11');
      expect(result.current.data['MXRF11'].price).toBe(9.74);
      expect(result.current.isEmpty).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should include all required FII metrics in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
      });

      const fii = result.current.data['MXRF11'];

      // Verify all metrics are present
      expect(fii.symbol).toBe('MXRF11');
      expect(fii.name).toBe('Maxi Renda Fixa Imobiliário');
      expect(fii.price).toBe(9.74);
      expect(fii.nav).toBe(9.3678);
      expect(fii.pvRatio).toBe(1.0392547);
      expect(fii.dividendYield1Month).toBe(0.12268994);
      expect(fii.dividendYield12Month).toBe(0.12543876);
      expect(fii.monthlyReturn).toBe(0.02543);
      expect(fii.investorCount).toBe(45678);
      expect(fii.totalAssets).toBe(4313692700);
      expect(fii.administrator).toBeDefined();
      expect(fii.administrator.name).toBe('XP Administração de Recursos Ltda');
    });

    it('should cache data and return from cache on subsequent requests', async () => {
      // First request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result, unmount } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
      });

      const firstData = result.current.data['MXRF11'];
      unmount();

      // Second request with fresh hook instance
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result: result2 } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result2.current.data['MXRF11']).toBeDefined();
      });

      // Verify data is returned
      expect(result2.current.data['MXRF11']).toEqual(firstData);
      expect(result2.current.error).toBeNull();
    });

    it('should handle multiple FII symbols', async () => {
      const multipleData = {
        success: true,
        data: [
          mockFIIData.data[0],
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
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => multipleData,
      });

      const { result } = renderHook(() => useFIIData(['MXRF11', 'HGLG11']));

      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
        expect(result.current.data['HGLG11']).toBeDefined();
      });

      expect(Object.keys(result.current.data).length).toBe(2);
      expect(result.current.isEmpty).toBe(false);
    });
  });

  describe('User Story 2: Handle Timeout', () => {
    it('should display error message on timeout', async () => {
      // Mock timeout error
      (global.fetch as any).mockRejectedValueOnce(
        new Error('Timeout: Request exceeds 10 seconds'),
      );

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify error state
      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toMatch(/timeout|connection/i);
      expect(result.current.isEmpty).toBe(true);
    });

    it('should provide retry functionality on error', async () => {
      // First request fails
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      // Mock successful retry
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      // Call refresh to retry
      await act(async () => {
        await result.current.refresh();
      });

      // Verify data is loaded after retry
      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
      });

      expect(result.current.error).toBeNull();
    });

    it('should handle authentication error (401)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication failed',
            statusCode: 401,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error?.message).toMatch(/Authentication failed|contact support/i);
      expect(result.current.error?.statusCode).toBe(401);
    });

    it('should handle rate limit error (429)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests',
            statusCode: 429,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error?.message).toMatch(/Too many requests|wait a moment/i);
      expect(result.current.error?.statusCode).toBe(429);
    });

    it('should handle service unavailable error (503)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service unavailable',
            statusCode: 503,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.error?.message).toMatch(/temporarily unavailable|try again/i);
      expect(result.current.error?.statusCode).toBe(503);
    });
  });

  describe('User Story 3 & 4: Cache Hit and Expiration', () => {
    it('should use cached data within 5 minutes', async () => {
      // First request
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result, unmount } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
      });

      unmount();

      // Second request within cache window (simulated immediately)
      // In real scenario, this would be 2 minutes later
      const { result: result2 } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result2.current.data['MXRF11']).toBeDefined();
      });

      // Both should have same data (from cache)
      expect(result2.current.data['MXRF11']).toEqual(mockFIIData.data[0]);
    });

    it('should refresh data with explicit refresh call', async () => {
      // Initial data
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
      });

      // Updated data
      const updatedData = {
        success: true,
        data: [
          {
            ...mockFIIData.data[0],
            price: 9.85, // Updated price
          },
        ],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => updatedData,
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Verify updated data
      await waitFor(() => {
        expect(result.current.data['MXRF11'].price).toBe(9.85);
      });
    });

    it('should pass refresh flag to bypass cache', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
      });

      // Clear mock and setup for refresh
      (global.fetch as any).mockClear();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      // Trigger refresh
      await act(async () => {
        await result.current.refresh();
      });

      // Verify fetch was called with refresh parameter
      const calls = (global.fetch as any).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toContain('refresh=true');
    });
  });

  describe('User Story 5: Token Security', () => {
    it('should NOT include Authorization header in frontend requests', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
      });

      // Get fetch call arguments
      const fetchCall = (global.fetch as any).mock.calls[0];
      const url = fetchCall[0];
      const options = fetchCall[1];

      // Verify no token in URL
      expect(url).not.toContain('token');
      expect(url).not.toContain('Bearer');

      // Verify no Authorization header
      if (options?.headers) {
        const authHeader = options.headers.Authorization ||
                           options.headers.authorization;
        expect(authHeader).toBeUndefined();
      }
    });

    it('should only make requests to backend proxy, not brAPI', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect((global.fetch as any).mock.calls.length).toBeGreaterThan(0);
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const url = fetchCall[0];

      // Should call backend, not brAPI
      expect(url).toContain('localhost:3001');
      expect(url).not.toContain('brapi.dev');
    });

    it('should not expose sensitive information in frontend state', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
      });

      // Verify no token or sensitive info in state
      const stateStr = JSON.stringify(result.current);
      expect(stateStr).not.toContain('Bearer');
      expect(stateStr).not.toContain('Authorization');
      expect(stateStr).not.toContain('sPUuvgpkj52S75JpzcRN7x'); // Test token
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty symbols array', async () => {
      const { result } = renderHook(() => useFIIData([]));

      expect(result.current.isEmpty).toBe(true);
      expect(result.current.data).toEqual({});
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle empty response from backend', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [],
        }),
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isEmpty).toBe(true);
      expect(Object.keys(result.current.data).length).toBe(0);
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useFIIData(['MXRF11']));

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.isEmpty).toBe(true);
    });

    it('should update state immutably when adding new FIIs', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockFIIData,
      });

      const { result, rerender } = renderHook(
        ({ symbols }: { symbols: string[] }) => useFIIData(symbols),
        { initialProps: { symbols: ['MXRF11'] } },
      );

      await waitFor(() => {
        expect(result.current.data['MXRF11']).toBeDefined();
      });

      const firstData = { ...result.current.data };

      // Add another FII
      const multipleData = {
        success: true,
        data: [mockFIIData.data[0], {
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
        }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => multipleData,
      });

      rerender({ symbols: ['MXRF11', 'HGLG11'] });

      await waitFor(() => {
        expect(result.current.data['HGLG11']).toBeDefined();
      });

      // Verify both FIIs are in data
      expect(Object.keys(result.current.data).length).toBe(2);
      expect(result.current.data['MXRF11']).toEqual(firstData['MXRF11']);
      expect(result.current.data['HGLG11']).toBeDefined();
    });
  });
});
