/**
 * useFIIData React Hook
 * Custom hook for fetching and managing FII data from the backend proxy
 *
 * The hook maintains state for:
 * - fiiData: Record of FII symbols to FIIData objects (immutable Record type)
 * - isLoading: Boolean indicating if data is being fetched
 * - error: ErrorState object with code, message, statusCode, timestamp
 * - isEmpty: Boolean indicating if no data is available
 *
 * Features:
 * - Fetches from /api/fii/indicators?symbols=... on mount and symbol change
 * - Handles network errors, HTTP errors, and parse errors
 * - Implements manual refresh with cache bypass
 * - Updates state immutably using React pattern: {...prev, fiiData: {...prev.fiiData, [symbol]: data}}
 * - Uses environment configuration from REACT_APP_BACKEND_URL and REACT_APP_REFRESH_INTERVAL
 *
 * @example
 * const { data, isLoading, error, isEmpty, refresh } = useFIIData(['MXRF11', 'HGLG11']);
 *
 * if (isLoading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error.message}</div>;
 * if (isEmpty) return <div>No data available</div>;
 *
 * return (
 *   <div>
 *     {Object.entries(data).map(([symbol, fii]) => (
 *       <div key={symbol}>{symbol}: {fii.price}</div>
 *     ))}
 *     <button onClick={refresh}>Refresh</button>
 *   </div>
 * );
 */

import { useState, useCallback, useEffect } from 'react';
import { getBackendUrl, getRefreshInterval } from '@/config/environment';

// FIIData interface (same as backend ParsedFII)
interface FIIData {
  symbol: string;
  price: number;
  nav: number;
  pvRatio: number;
  dividendYield1Month: number;
  dividendYield12Month: number;
  monthlyReturn: number;
  investorCount: number;
  totalAssets: number;
  administrator: {
    name: string;
    cnpj: string;
    email: string;
  };
}

// ErrorState interface
interface ErrorState {
  code: string;
  message: string;
  statusCode: number;
  timestamp: Date;
}

// API response interface
interface APIResponse {
  success: boolean;
  data?: FIIData[];
  error?: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
  };
}

// Hook options
interface useFIIDataOptions {
  // Note: refreshInterval is no longer needed in options - use REACT_APP_REFRESH_INTERVAL env var
  // Kept here for backwards compatibility if explicitly needed
  refreshInterval?: number; // milliseconds - optional override of REACT_APP_REFRESH_INTERVAL
}

// Hook return type
export interface useFIIDataReturn {
  data: Record<string, FIIData>;
  isLoading: boolean;
  error: ErrorState | null;
  isEmpty: boolean;
  refresh: () => Promise<void>;
}

/**
 * Custom React hook for fetching and managing FII data
 *
 * @param symbols - Array of FII symbols to fetch (e.g., ['MXRF11', 'HGLG11'])
 * @param options - Optional configuration (refreshInterval in milliseconds)
 * @returns Hook return object with data, isLoading, error, isEmpty, and refresh function
 */
export function useFIIData(
  symbols: string[],
  options?: useFIIDataOptions,
): useFIIDataReturn {
  // Get backend URL from environment configuration
  // If configuration is not available, use a placeholder that will result in network error
  let backendUrl: string;
  let refreshInterval: number = 300000; // default 5 minutes

  try {
    backendUrl = getBackendUrl();
    // Get refresh interval from environment configuration or options override
    refreshInterval = options?.refreshInterval ?? getRefreshInterval();
  } catch (error) {
    // If configuration fails, we'll use placeholders and let the error be caught
    // when the hook tries to fetch, providing better error handling
    backendUrl = '';
    refreshInterval = options?.refreshInterval ?? 300000;
  }

  // State management
  const [fiiData, setFiiData] = useState<Record<string, FIIData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  /**
   * Translate backend error response to user-friendly ErrorState
   * Maps HTTP status codes and error codes to appropriate messages
   */
  const translateError = useCallback((
    statusCode: number,
    errorCode: string,
    errorMessage: string,
  ): ErrorState => {
    let translatedMessage = errorMessage;

    // Map specific error codes to user-friendly messages
    if (errorCode === 'RATE_LIMITED' || statusCode === 429) {
      translatedMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (errorCode === 'UNAUTHORIZED' || statusCode === 401) {
      translatedMessage =
        'Authentication failed. The server token may have expired. Please contact support.';
    } else if (errorCode === 'SERVICE_UNAVAILABLE' || statusCode === 503) {
      translatedMessage = 'The FII data service is temporarily unavailable. Please try again later.';
    } else if (errorCode === 'TIMEOUT' || statusCode === 504) {
      translatedMessage = 'Unable to fetch FII data. Please check your connection and try again later.';
    } else if (errorCode === 'BACKEND_UNAVAILABLE' || statusCode === 502) {
      translatedMessage = 'Backend service is unavailable. Please try again later.';
    } else if (errorCode === 'NETWORK_ERROR') {
      translatedMessage = 'Unable to fetch FII data. Please check your connection and try again later.';
    }

    return {
      code: errorCode,
      message: translatedMessage,
      statusCode,
      timestamp: new Date(),
    };
  }, []);

  /**
   * Fetch FII data from backend proxy
   * Validates symbols, constructs API URL, handles response and errors
   * Updates state immutably using React pattern
   */
  const fetchFIIData = useCallback(
    async (bypassCache = false) => {
      // Validate symbols
      if (!symbols || symbols.length === 0) {
        setIsEmpty(true);
        setFiiData({});
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Construct API URL
        const symbolsParam = symbols.join(',');
        const url = new URL('/api/fii/indicators', backendUrl);
        url.searchParams.append('symbols', symbolsParam);
        if (bypassCache) {
          url.searchParams.append('refresh', 'true');
        }

        // Fetch from backend proxy (no API token needed)
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // Parse response
        const responseData: APIResponse = await response.json();

        // Handle error responses
        if (!response.ok || !responseData.success) {
          const errorData = responseData.error || {
            code: `HTTP_${response.status}`,
            message: 'Failed to fetch FII data',
            statusCode: response.status,
            timestamp: new Date().toISOString(),
          };

          const translatedError = translateError(
            errorData.statusCode,
            errorData.code,
            errorData.message,
          );

          setError(translatedError);
          setIsEmpty(true);
          setIsLoading(false);
          return;
        }

        // Process successful response
        if (responseData.data && Array.isArray(responseData.data)) {
          // Filter out invalid records (should not happen, but defensive)
          const validRecords = responseData.data.filter(
            (record): record is FIIData =>
              record &&
              typeof record === 'object' &&
              'symbol' in record &&
              'price' in record &&
              'nav' in record,
          );

          if (validRecords.length > 0) {
            // Update state immutably: merge new data with existing data
            setFiiData((prev) => {
              const updated = { ...prev };
              validRecords.forEach((record) => {
                updated[record.symbol] = record;
              });
              return updated;
            });
            setIsEmpty(false);
          } else {
            setIsEmpty(true);
            setFiiData({});
          }
        } else {
          setIsEmpty(true);
          setFiiData({});
        }

        setError(null);
      } catch (err) {
        // Handle network errors and other exceptions
        let errorCode = 'NETWORK_ERROR';
        let statusCode = 0;

        if (err instanceof TypeError) {
          // Network error (e.g., fetch failed)
          errorCode = 'NETWORK_ERROR';
        } else if (err instanceof SyntaxError) {
          // JSON parse error
          errorCode = 'PARSE_ERROR';
        }

        const translatedError = translateError(
          statusCode,
          errorCode,
          err instanceof Error ? err.message : 'Unknown error occurred',
        );

        setError(translatedError);
        setIsEmpty(true);
        setFiiData({});
      } finally {
        setIsLoading(false);
      }
    },
    [symbols, backendUrl, translateError],
  );

  /**
   * Effect: Fetch data on mount and when symbols change
   */
  useEffect(() => {
    fetchFIIData(false);
  }, [symbols, fetchFIIData]);

  /**
   * Effect: Set up periodic refresh if refreshInterval is specified
   * Uses REACT_APP_REFRESH_INTERVAL from environment configuration by default
   */
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      fetchFIIData(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchFIIData]);

  /**
   * Manual refresh function with cache bypass
   * User can call this to fetch fresh data from brAPI
   */
  const refresh = useCallback(async () => {
    await fetchFIIData(true);
  }, [fetchFIIData]);

  return {
    data: fiiData,
    isLoading,
    error,
    isEmpty,
    refresh,
  };
}
