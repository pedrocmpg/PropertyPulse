/**
 * LoadingState Component
 * Displays a loading indicator while FII data is being fetched.
 * If loading time exceeds 30 seconds, displays an additional message.
 *
 * Validates Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React, { useState, useEffect } from 'react';

interface LoadingStateProps {
  /**
   * Optional message to display above the spinner
   * @default "Loading FII data..."
   */
  message?: string;

  /**
   * Optional CSS class for custom styling
   */
  className?: string;

  /**
   * Callback when loading timeout is exceeded
   * Allows parent component to respond to long loading times
   */
  onTimeoutExceeded?: () => void;
}

/**
 * LoadingState Component
 * Renders spinner and skeleton screens while fetching data.
 * Shows timeout message if loading exceeds 30 seconds.
 *
 * @component
 * @example
 * <LoadingState message="Fetching FII data..." onTimeoutExceeded={() => console.log('Timeout!')} />
 */
export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading FII data...',
  className = '',
  onTimeoutExceeded,
}) => {
  const [isTimeout, setIsTimeout] = useState(false);

  useEffect(() => {
    // Set timeout for 30 seconds (30000 milliseconds)
    const timeoutId = setTimeout(() => {
      setIsTimeout(true);
      onTimeoutExceeded?.();
    }, 30000);

    // Cleanup timeout on component unmount
    return () => clearTimeout(timeoutId);
  }, [onTimeoutExceeded]);

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
      role="status"
      aria-label="Loading FII data"
    >
      {/* Skeleton Cards Grid */}
      <div className="w-full mb-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Render 3 skeleton cards on desktop, 2 on tablet, 1 on mobile */}
          {[1, 2, 3].map((index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>

      {/* Loading Message */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-400 mb-2">{message}</p>

        {/* Spinner Animation */}
        <div className="flex justify-center">
          <div
            className="h-8 w-8 border-4 border-premium-text border-t-discount-text rounded-full animate-spin"
            role="presentation"
          />
        </div>
      </div>

      {/* Timeout Message */}
      {isTimeout && (
        <div
          className="mt-6 p-4 bg-yellow-900 border border-yellow-700 rounded-lg text-center animate-fade-in"
          role="alert"
        >
          <p className="text-yellow-200 text-sm">
            ⚠️ Taking longer than expected...
          </p>
          <p className="text-yellow-300 text-xs mt-1">
            The server might be busy. Please wait or try refreshing the page.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonCard Component
 * Renders a placeholder card with skeleton loading animation
 * Used to show users where FII cards will appear
 *
 * @component
 */
const SkeletonCard: React.FC = () => {
  return (
    <div
      className="p-4 bg-gray-900 border border-gray-800 rounded-lg animate-pulse"
      role="presentation"
    >
      {/* Symbol placeholder */}
      <div className="h-6 bg-gray-800 rounded mb-3 w-1/3" />

      {/* Price placeholder */}
      <div className="h-4 bg-gray-800 rounded mb-2 w-full" />

      {/* Yield placeholder */}
      <div className="h-4 bg-gray-800 rounded mb-2 w-2/3" />

      {/* P/VP placeholder */}
      <div className="h-4 bg-gray-800 rounded mb-4 w-1/2" />

      {/* Additional metrics placeholders */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-800 rounded w-full" />
        <div className="h-3 bg-gray-800 rounded w-4/5" />
      </div>
    </div>
  );
};

export default LoadingState;
