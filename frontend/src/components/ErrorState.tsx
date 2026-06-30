import React, { useState } from 'react';
import { ErrorState as ErrorStateType } from '@/types';

interface ErrorStateProps {
  error: ErrorStateType;
  onRetry: () => void;
  requestId?: string;
}

/**
 * ErrorState Component
 * Displays error messages from the backend with retry capability
 * Shows detailed error information in a collapsible section
 * Tracks retry attempts and suggests contacting support after 3 failures
 *
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */
export function ErrorState({ error, onRetry, requestId = 'N/A' }: ErrorStateProps) {
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [localRetryCount, setLocalRetryCount] = useState(0);

  const maxRetries = 3;
  const hasExceededMaxRetries = localRetryCount >= maxRetries;

  const handleRetry = () => {
    setLocalRetryCount((prev) => prev + 1);
    onRetry();
  };

  const formatTimestamp = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto"
      role="alert"
      aria-live="polite"
      data-testid="error-state"
    >
      {/* Error container with neon red accent */}
      <div className="bg-red-900 bg-opacity-30 border border-red-600 rounded-lg p-6 mb-4">
        {/* Error icon and message */}
        <div className="flex items-start gap-4 mb-6">
          {/* Error icon (neon red) */}
          <div className="flex-shrink-0" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-500"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>

          {/* Error message */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-300 mb-2">Error</h3>
            <p className="text-red-100 mb-2">{error.message}</p>
          </div>
        </div>

        {/* Show retry count */}
        {localRetryCount > 0 && (
          <div className="mb-4 text-sm text-red-200">
            Retry attempt: {localRetryCount} / {maxRetries}
          </div>
        )}

        {/* Support suggestion after max retries */}
        {hasExceededMaxRetries && (
          <div
            className="mb-4 p-3 bg-red-800 bg-opacity-50 rounded border border-red-500"
            role="status"
          >
            <p className="text-sm text-red-100 mb-2">
              Maximum retry attempts exceeded.
            </p>
            <p className="text-sm text-red-100">
              Please <a href="mailto:support@propertypulse.com" className="text-green-400 hover:underline font-medium">
                contact support
              </a> for assistance.
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-4">
          {/* Retry button (disabled after 3 failures) */}
          {!hasExceededMaxRetries && (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              data-testid="retry-button"
              aria-label={`Retry operation (attempt ${localRetryCount + 1} of ${maxRetries})`}
            >
              Retry
            </button>
          )}

          {/* Show Details button */}
          <button
            onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-green-400 rounded-lg transition-colors font-medium"
            data-testid="details-toggle"
            aria-expanded={isDetailsExpanded}
            aria-controls="error-details"
          >
            {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* Collapsible details section */}
        {isDetailsExpanded && (
          <div
            className="mt-6 pt-6 border-t border-red-700"
            id="error-details"
            data-testid="error-details"
          >
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">HTTP Status Code:</span>
                <span className="text-gray-100 font-mono">{error.statusCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">Error Code:</span>
                <span className="text-gray-100 font-mono">{error.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">Timestamp:</span>
                <span className="text-gray-100 font-mono">{formatTimestamp(error.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-semibold">Request ID:</span>
                <span className="text-gray-100 font-mono">{requestId}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
