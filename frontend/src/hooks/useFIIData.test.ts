/**
 * Unit tests for useFIIData React hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFIIData } from './useFIIData';

describe('useFIIData Hook', () => {
  const mockFIIData = {
    success: true,
    data: [
      {
        symbol: 'MXRF11',
        price: 9.74,
        nav: 9.3678,
        pvRatio: 1.0392547,
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
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with empty state', () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ success: true, data: [] }),
    });

    const { result } = renderHook(() => useFIIData([]));

    expect(result.current.data).toEqual({});
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.isEmpty).toBe(true);
  });

  it('should fetch and store FII data', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockFIIData),
    });

    const { result } = renderHook(() => useFIIData(['MXRF11']));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.MXRF11).toBeDefined();
    expect(result.current.data.MXRF11.price).toBe(9.74);
    expect(result.current.isEmpty).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should have a refresh function', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockFIIData),
    });

    const { result } = renderHook(() => useFIIData(['MXRF11']));

    await waitFor(() => {
      expect(result.current.data.MXRF11).toBeDefined();
    });

    expect(typeof result.current.refresh).toBe('function');

    // Call refresh
    await result.current.refresh();

    expect(global.fetch).toHaveBeenCalled();
  });

  it('should handle network errors', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed'));

    const { result } = renderHook(() => useFIIData(['MXRF11']));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).not.toBe(null);
    expect(result.current.error?.code).toBe('NETWORK_ERROR');
    expect(result.current.isEmpty).toBe(true);
  });

  it('should handle HTTP 401 errors', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValueOnce({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid token',
          statusCode: 401,
          timestamp: new Date().toISOString(),
        },
      }),
    });

    const { result } = renderHook(() => useFIIData(['MXRF11']));

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.error?.statusCode).toBe(401);
    expect(result.current.error?.message).toContain('Authentication failed');
  });

  it('should maintain immutable state updates', async () => {
    const { result, rerender } = renderHook(
      ({ symbols }) => useFIIData(symbols),
      { initialProps: { symbols: ['MXRF11'] } },
    );

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({
        success: true,
        data: [mockFIIData.data[0]],
      }),
    });

    await waitFor(() => {
      expect(result.current.data.MXRF11).toBeDefined();
    });

    const firstData = result.current.data;

    // Rerender with new symbol
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({
        success: true,
        data: [
          {
            ...mockFIIData.data[0],
            symbol: 'HGLG11',
          },
        ],
      }),
    });

    rerender({ symbols: ['MXRF11', 'HGLG11'] });

    await waitFor(() => {
      expect(result.current.data.HGLG11).toBeDefined();
    });

    // Verify immutability: new object but old data preserved
    expect(result.current.data).not.toBe(firstData);
    expect(result.current.data.MXRF11).toBe(firstData.MXRF11);
  });

  it('should not send API token in request', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ success: true, data: [] }),
    });

    renderHook(() => useFIIData(['MXRF11']));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const url = callArgs[0];
    const options = callArgs[1];

    expect(typeof url).toBe('string');
    expect(url).not.toContain('token');
    expect(url).not.toContain('BRAPI_TOKEN');
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('should use correct API URL format', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({ success: true, data: [] }),
    });

    renderHook(() => useFIIData(['MXRF11', 'HGLG11']));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    const url = vi.mocked(global.fetch).mock.calls[0][0];
    expect(url).toContain('/api/fii/indicators');
    expect(url).toContain('symbols=');
    expect(url).toContain('MXRF11');
    expect(url).toContain('HGLG11');
  });

  it('should include refresh parameter when bypassing cache', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockFIIData),
    });

    const { result } = renderHook(() => useFIIData(['MXRF11']));

    await waitFor(() => {
      expect(result.current.data.MXRF11).toBeDefined();
    });

    // Clear mock and call refresh
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockFIIData),
    });

    await result.current.refresh();

    const url = vi.mocked(global.fetch).mock.calls[0][0];
    expect(url).toContain('refresh=true');
  });

  it('should handle empty symbols array', () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() => useFIIData([]));

    expect(result.current.isEmpty).toBe(true);
    expect(result.current.data).toEqual({});
  });

  it('should filter out invalid records', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce({
        success: true,
        data: [
          mockFIIData.data[0],
          { price: 100 }, // Missing required fields
        ],
      }),
    });

    const { result } = renderHook(() => useFIIData(['MXRF11']));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Only 1 valid record should be stored
    expect(Object.keys(result.current.data)).toHaveLength(1);
    expect(result.current.data.MXRF11).toBeDefined();
  });

  it('should clear error on successful fetch after error', async () => {
    // First fetch fails
    global.fetch = vi.fn().mockRejectedValueOnce(new TypeError('Network error'));

    const { result, rerender } = renderHook(
      ({ symbols }) => useFIIData(symbols),
      { initialProps: { symbols: ['MXRF11'] } },
    );

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    // Second fetch succeeds
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValueOnce(mockFIIData),
    });

    rerender({ symbols: ['HGLG11'] });

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });

    expect(result.current.data.HGLG11 || result.current.data.MXRF11).toBeDefined();
  });
});
