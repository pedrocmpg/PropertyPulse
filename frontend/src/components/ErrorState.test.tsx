/**
 * Unit tests for ErrorState component
 * Tests rendering, user interactions, and retry logic
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorState } from './ErrorState';

describe('ErrorState Component', () => {
  // Mock error object for testing
  const mockError = {
    code: 'TIMEOUT',
    message: 'Unable to fetch FII data. Please check your connection and try again later.',
    statusCode: 504,
    timestamp: new Date('2024-01-15T10:30:45Z'),
  };

  describe('Rendering', () => {
    it('should render error state component with alert role', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveAttribute('aria-live', 'polite');
    });

    it('should display error message', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Unable to fetch FII data. Please check your connection and try again later.'
        )
      ).toBeInTheDocument();
    });

    it('should display error icon', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const container = screen.getByTestId('error-state');
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render Retry button', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry');
    });

    it('should render Show Details button', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      expect(detailsButton).toBeInTheDocument();
      expect(detailsButton).toHaveTextContent('Show Details');
    });

    it('should not show details section initially', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsSection = screen.queryByTestId('error-details');
      expect(detailsSection).not.toBeInTheDocument();
    });
  });

  describe('Details Section', () => {
    it('should show details when Show Details button is clicked', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      const detailsSection = screen.getByTestId('error-details');
      expect(detailsSection).toBeInTheDocument();
    });

    it('should hide details when Show Details button is clicked again', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);
      await user.click(detailsButton);

      const detailsSection = screen.queryByTestId('error-details');
      expect(detailsSection).not.toBeInTheDocument();
    });

    it('should display HTTP status code in details', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      expect(screen.getByText('HTTP Status Code:')).toBeInTheDocument();
      expect(screen.getByText('504')).toBeInTheDocument();
    });

    it('should display error code in details', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      expect(screen.getByText('Error Code:')).toBeInTheDocument();
      expect(screen.getByText('TIMEOUT')).toBeInTheDocument();
    });

    it('should display timestamp in details', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      expect(screen.getByText('Timestamp:')).toBeInTheDocument();
      // Timestamp formatting depends on locale, so we just check it exists
      const timestampValue = screen.getByText(/15\/01\/2024/);
      expect(timestampValue).toBeInTheDocument();
    });

    it('should display request ID in details', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(
        <ErrorState
          error={mockError}
          onRetry={mockOnRetry}
          requestId="req_abc123xyz"
        />
      );

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      expect(screen.getByText('Request ID:')).toBeInTheDocument();
      expect(screen.getByText('req_abc123xyz')).toBeInTheDocument();
    });

    it('should display N/A for request ID if not provided', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      expect(screen.getByText('Request ID:')).toBeInTheDocument();
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should have aria-expanded attribute on details button', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      expect(detailsButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(detailsButton);
      expect(detailsButton).toHaveAttribute('aria-expanded', 'true');

      await user.click(detailsButton);
      expect(detailsButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('should have aria-controls attribute linking to details section', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      expect(detailsButton).toHaveAttribute('aria-controls', 'error-details');

      await user.click(detailsButton);
      const detailsSection = screen.getByTestId('error-details');
      expect(detailsSection).toHaveAttribute('id', 'error-details');
    });
  });

  describe('Retry Functionality', () => {
    it('should call onRetry when Retry button is clicked', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      await user.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledOnce();
    });

    it('should increment retry count internally on each click', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      
      // First retry - no message shown yet
      await user.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(1);
      
      // Retry count message should show on second retry
      await user.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Retry attempt: 2 / 3')).toBeInTheDocument();
      
      // Third retry
      await user.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalledTimes(3);
      expect(screen.getByText('Retry attempt: 3 / 3')).toBeInTheDocument();
    });

    it('should have aria-label on retry button with retry attempt info', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toHaveAttribute(
        'aria-label',
        'Retry operation (attempt 1 of 3)'
      );

      // After one click, label should update
      await user.click(retryButton);
      expect(retryButton).toHaveAttribute(
        'aria-label',
        'Retry operation (attempt 2 of 3)'
      );
    });
  });

  describe('Max Retries Exceeded', () => {
    it('should not show Retry button when max retries (3) exceeded', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      
      // Click 3 times to exceed max retries
      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);
      
      // Now the button should not exist
      const button = screen.queryByTestId('retry-button');
      expect(button).not.toBeInTheDocument();
    });

    it('should show support contact message when max retries exceeded', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      
      // Click 3 times
      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);

      expect(
        screen.getByText('Maximum retry attempts exceeded.')
      ).toBeInTheDocument();
      expect(screen.getByText(/contact support/)).toBeInTheDocument();
    });

    it('should show max retries message with role status', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      
      // Click 3 times
      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);

      const maxRetriesDiv = screen.getByText('Maximum retry attempts exceeded.')
        .parentElement;
      expect(maxRetriesDiv).toHaveAttribute('role', 'status');
    });

    it('should display support link when max retries exceeded', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      
      // Click 3 times
      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);

      const supportLink = screen.getByRole('link', { name: /contact support/ });
      expect(supportLink).toBeInTheDocument();
      expect(supportLink).toHaveAttribute('href', 'mailto:support@propertypulse.com');
    });

    it('should not call onRetry on 4th attempt when max retries exceeded', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      
      // Click 3 times
      await user.click(retryButton);
      await user.click(retryButton);
      await user.click(retryButton);
      
      expect(mockOnRetry).toHaveBeenCalledTimes(3);
      
      // Button should no longer exist, so can't click further
      const button = screen.queryByTestId('retry-button');
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('Different Error Codes', () => {
    it('should display correct message for TIMEOUT error', () => {
      const mockOnRetry = vi.fn();
      const timeoutError = {
        code: 'TIMEOUT',
        message: 'Request timeout occurred',
        statusCode: 504,
        timestamp: new Date(),
      };

      render(<ErrorState error={timeoutError} onRetry={mockOnRetry} />);

      expect(screen.getByText('Request timeout occurred')).toBeInTheDocument();
    });

    it('should display correct message for RATE_LIMITED error', () => {
      const mockOnRetry = vi.fn();
      const rateLimitError = {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait a moment and try again.',
        statusCode: 429,
        timestamp: new Date(),
      };

      render(<ErrorState error={rateLimitError} onRetry={mockOnRetry} />);

      expect(
        screen.getByText('Too many requests. Please wait a moment and try again.')
      ).toBeInTheDocument();
    });

    it('should display correct message for AUTH_FAILED error', () => {
      const mockOnRetry = vi.fn();
      const authError = {
        code: 'AUTH_FAILED',
        message: 'Authentication failed. The server token may have expired. Please contact support.',
        statusCode: 401,
        timestamp: new Date(),
      };

      render(<ErrorState error={authError} onRetry={mockOnRetry} />);

      expect(
        screen.getByText(
          'Authentication failed. The server token may have expired. Please contact support.'
        )
      ).toBeInTheDocument();
    });

    it('should display correct message for SERVICE_UNAVAILABLE error', () => {
      const mockOnRetry = vi.fn();
      const unavailableError = {
        code: 'SERVICE_UNAVAILABLE',
        message: 'The FII data service is temporarily unavailable. Please try again later.',
        statusCode: 503,
        timestamp: new Date(),
      };

      render(<ErrorState error={unavailableError} onRetry={mockOnRetry} />);

      expect(
        screen.getByText(
          'The FII data service is temporarily unavailable. Please try again later.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('Error');
    });

    it('should have proper button labels', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      const detailsButton = screen.getByRole('button', { name: /show details/i });
      expect(detailsButton).toBeInTheDocument();
    });

    it('should support keyboard navigation for buttons', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByTestId('retry-button');
      retryButton.focus();
      expect(retryButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockOnRetry).toHaveBeenCalledOnce();
    });

    it('should have error icon marked as decorative with aria-hidden', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const errorIcon = screen.getByTestId('error-state').querySelector('[aria-hidden="true"]');
      expect(errorIcon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamp in pt-BR locale', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      const customError = {
        code: 'TEST',
        message: 'Test error',
        statusCode: 400,
        timestamp: new Date('2024-01-15T10:30:45Z'),
      };

      render(<ErrorState error={customError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      // pt-BR locale format should contain date components
      const timestampElements = screen.getAllByText(/15\/01\/2024/);
      expect(timestampElements.length).toBeGreaterThan(0);
    });

    it('should handle Date string as timestamp', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      const errorWithStringDate = {
        code: 'TEST',
        message: 'Test error',
        statusCode: 400,
        timestamp: '2024-01-15T10:30:45Z' as any,
      };

      render(<ErrorState error={errorWithStringDate} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      // Should successfully format the string date
      const timestampLabel = screen.getByText('Timestamp:');
      expect(timestampLabel).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should render with data-testid for testing', () => {
      const mockOnRetry = vi.fn();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      expect(screen.getByTestId('details-toggle')).toBeInTheDocument();
    });

    it('should render error details section with testid', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      render(<ErrorState error={mockError} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      expect(screen.getByTestId('error-details')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long error messages', () => {
      const mockOnRetry = vi.fn();
      const longErrorMessage = 'A'.repeat(500);
      const errorWithLongMessage = {
        code: 'LONG_ERROR',
        message: longErrorMessage,
        statusCode: 500,
        timestamp: new Date(),
      };

      render(<ErrorState error={errorWithLongMessage} onRetry={mockOnRetry} />);

      expect(screen.getByText(longErrorMessage)).toBeInTheDocument();
    });

    it('should handle special characters in error code', async () => {
      const mockOnRetry = vi.fn();
      const user = userEvent.setup();
      const errorWithSpecialChars = {
        code: 'ERROR_CODE_WITH-SPECIAL.CHARS_123',
        message: 'Test error',
        statusCode: 400,
        timestamp: new Date(),
      };

      render(<ErrorState error={errorWithSpecialChars} onRetry={mockOnRetry} />);

      const detailsButton = screen.getByTestId('details-toggle');
      await user.click(detailsButton);

      expect(screen.getByText('ERROR_CODE_WITH-SPECIAL.CHARS_123')).toBeInTheDocument();
    });

    it('should handle zero as statusCode', () => {
      const mockOnRetry = vi.fn();
      const errorWithZeroStatus = {
        code: 'ZERO_STATUS',
        message: 'Test error',
        statusCode: 0,
        timestamp: new Date(),
      };

      render(<ErrorState error={errorWithZeroStatus} onRetry={mockOnRetry} />);

      // Component should render without errors
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    it('should handle negative statusCode', () => {
      const mockOnRetry = vi.fn();
      const errorWithNegativeStatus = {
        code: 'NEGATIVE_STATUS',
        message: 'Test error',
        statusCode: -1,
        timestamp: new Date(),
      };

      render(<ErrorState error={errorWithNegativeStatus} onRetry={mockOnRetry} />);

      // Component should render without errors
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });
  });
});
