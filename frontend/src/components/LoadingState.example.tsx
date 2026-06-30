/**
 * Usage examples for LoadingState component
 * Shows how LoadingState integrates with other dashboard components
 */

import React, { useState } from 'react';
import { LoadingState } from './LoadingState';

/**
 * Example 1: Basic usage with default props
 */
export const BasicLoadingExample = () => {
  return <LoadingState />;
};

/**
 * Example 2: Custom message and timeout callback
 */
export const CustomLoadingExample = () => {
  const handleTimeout = () => {
    console.log('Loading exceeded 30 seconds');
    // Could trigger notification, analytics event, etc.
  };

  return (
    <LoadingState
      message="Fetching latest FII data..."
      onTimeoutExceeded={handleTimeout}
    />
  );
};

/**
 * Example 3: Integration with DashboardLayout
 * Demonstrates how LoadingState is used in the dashboard
 */
export const DashboardIntegrationExample = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [fiiData, setFiiData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchFIIData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/fii/indicators?symbols=MXRF11,HGLG11');
      const data = await response.json();

      if (data.success) {
        setFiiData(data.data);
      } else {
        setError(data.error?.message || 'Failed to fetch data');
      }
    } catch (err) {
      setError('Network error: unable to fetch FII data');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">FII Dashboard</h1>
          <button
            onClick={fetchFIIData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Fetch Data'}
          </button>
        </header>

        {/* Show LoadingState while fetching */}
        {isLoading && (
          <LoadingState
            message="Fetching FII data..."
            onTimeoutExceeded={() => console.warn('Request is taking longer than expected')}
          />
        )}

        {/* Show error message if request failed */}
        {error && !isLoading && (
          <div className="bg-red-900 border border-red-700 rounded p-4 mb-4 text-red-100">
            <p>Error: {error}</p>
          </div>
        )}

        {/* Show FII cards when data is loaded */}
        {!isLoading && !error && fiiData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fiiData.map((fii) => (
              <div
                key={fii.symbol}
                className="p-4 bg-gray-800 border border-gray-700 rounded-lg"
              >
                <h3 className="text-lg font-semibold text-white">{fii.symbol}</h3>
                <p className="text-sm text-gray-300">
                  Price: {fii.priceFormatted || 'N/A'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Show empty state when no data */}
        {!isLoading && !error && fiiData.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No FII data loaded. Click "Fetch Data" to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Example 4: Component with custom styling
 */
export const CustomStyledLoadingExample = () => {
  return (
    <div className="custom-container">
      <LoadingState
        message="Please wait while we load your personalized dashboard..."
        className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg"
      />
    </div>
  );
};
