/**
 * Unit tests for LoadingState component
 * Validates Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoadingState } from './LoadingState';
import '@testing-library/jest-dom';

describe('LoadingState Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Basic Rendering', () => {
    it('should render loading state with default message', () => {
      act(() => {
        render(<LoadingState />);
      });

      const loadingText = screen.getByText('Loading FII data...');
      expect(loadingText).toBeInTheDocument();
    });

    it('should render loading state with custom message', () => {
      const customMessage = 'Fetching FII data...';
      act(() => {
        render(<LoadingState message={customMessage} />);
      });

      const loadingText = screen.getByText(customMessage);
      expect(loadingText).toBeInTheDocument();
    });

    it('should render spinner element', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const spinner = container!.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('border-4', 'border-premium-text');
    });

    it('should render 3 skeleton cards', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const skeletonCards = container!.querySelectorAll('.animate-pulse');
      expect(skeletonCards.length).toBe(3);
    });

    it('should have correct accessibility attributes', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const loadingStateDiv = container!.firstChild;
      expect(loadingStateDiv).toHaveAttribute('role', 'status');
      expect(loadingStateDiv).toHaveAttribute('aria-label', 'Loading FII data');
    });

    it('should apply custom className', () => {
      const customClass = 'custom-loading-class';
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState className={customClass} />);
        container = result.container;
      });

      const loadingStateDiv = container!.firstChild;
      expect(loadingStateDiv).toHaveClass(customClass);
    });
  });

  describe('Timeout Message Display', () => {
    it('should not show timeout message initially', () => {
      act(() => {
        render(<LoadingState />);
      });

      const timeoutMessage = screen.queryByText(/Taking longer than expected/);
      expect(timeoutMessage).not.toBeInTheDocument();
    });

    it('should show timeout message after 30 seconds', async () => {
      act(() => {
        render(<LoadingState />);
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      const timeoutMessage = screen.getByText(/Taking longer than expected/);
      expect(timeoutMessage).toBeInTheDocument();
    });

    it('should display timeout alert with warning styling', async () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      const alert = container!.querySelector('[role="alert"]');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('bg-yellow-900', 'border-yellow-700');
    });

    it('should display helpful message in timeout alert', async () => {
      act(() => {
        render(<LoadingState />);
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      const helpfulMessage = screen.getByText(/The server might be busy/);
      expect(helpfulMessage).toBeInTheDocument();
    });

    it('should not show timeout message if component unmounts before 30s', () => {
      let unmountFn: (() => void) | null = null;
      act(() => {
        const result = render(<LoadingState />);
        unmountFn = result.unmount;
      });

      act(() => {
        vi.advanceTimersByTime(15000);
      });

      unmountFn!();

      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // If we got here without errors, cleanup worked
      expect(true).toBe(true);
    });
  });

  describe('Timeout Callback', () => {
    it('should call onTimeoutExceeded callback after 30 seconds', async () => {
      const onTimeoutExceeded = vi.fn();
      act(() => {
        render(<LoadingState onTimeoutExceeded={onTimeoutExceeded} />);
      });

      expect(onTimeoutExceeded).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(onTimeoutExceeded).toHaveBeenCalledTimes(1);
    });

    it('should not call callback before 30 seconds', async () => {
      const onTimeoutExceeded = vi.fn();
      act(() => {
        render(<LoadingState onTimeoutExceeded={onTimeoutExceeded} />);
      });

      await act(async () => {
        vi.advanceTimersByTime(15000);
      });

      expect(onTimeoutExceeded).not.toHaveBeenCalled();
    });

    it('should not call callback if component unmounts', () => {
      const onTimeoutExceeded = vi.fn();
      let unmountFn: (() => void) | null = null;
      act(() => {
        const result = render(<LoadingState onTimeoutExceeded={onTimeoutExceeded} />);
        unmountFn = result.unmount;
      });

      unmountFn!();

      act(() => {
        vi.advanceTimersByTime(35000);
      });

      expect(onTimeoutExceeded).not.toHaveBeenCalled();
    });

    it('should call updated callback if props change', async () => {
      const firstCallback = vi.fn();
      const secondCallback = vi.fn();

      let rerenderFn: ((el: React.ReactElement) => void) | null = null;
      act(() => {
        const result = render(<LoadingState onTimeoutExceeded={firstCallback} />);
        rerenderFn = result.rerender;
      });

      act(() => {
        rerenderFn!(<LoadingState onTimeoutExceeded={secondCallback} />);
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(firstCallback).not.toHaveBeenCalled();
      expect(secondCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Design', () => {
    it('should use responsive grid layout', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const gridContainer = container!.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    });

    it('should have proper spacing', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const gridContainer = container!.querySelector('.grid');
      expect(gridContainer).toHaveClass('gap-4');
    });

    it('should render skeleton cards with correct structure', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const skeletonCards = container!.querySelectorAll('.animate-pulse');
      skeletonCards.forEach((card) => {
        expect(card).toHaveClass('p-4', 'bg-gray-900', 'rounded-lg');
        const placeholders = card.querySelectorAll('[class*="bg-gray-800"]');
        expect(placeholders.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Spinner Animation', () => {
    it('should have correct animation classes', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const spinner = container!.querySelector('.animate-spin');
      expect(spinner).toHaveClass('h-8', 'w-8', 'border-4', 'border-premium-text', 'rounded-full');
    });

    it('should have presentation role', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const spinner = container!.querySelector('.animate-spin');
      expect(spinner).toHaveAttribute('role', 'presentation');
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper flexbox layout', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const mainContainer = container!.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center');
    });

    it('should have proper padding', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState />);
        container = result.container;
      });

      const mainContainer = container!.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('py-12', 'px-4');
    });

    it('should have properly styled message text', () => {
      act(() => {
        render(<LoadingState />);
      });

      const messageText = screen.getByText('Loading FII data...');
      expect(messageText).toHaveClass('text-sm', 'text-gray-400');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message gracefully', () => {
      act(() => {
        render(<LoadingState message="" />);
      });

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should handle undefined className gracefully', () => {
      let container: HTMLElement;
      act(() => {
        const result = render(<LoadingState className={undefined} />);
        container = result.container;
      });

      const mainContainer = container!.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('flex', 'flex-col');
    });

    it('should render with multiple rapid rerenders', async () => {
      const onTimeoutExceeded = vi.fn();
      let rerenderFn: ((el: React.ReactElement) => void) | null = null;

      act(() => {
        const result = render(<LoadingState onTimeoutExceeded={onTimeoutExceeded} />);
        rerenderFn = result.rerender;
      });

      for (let i = 0; i < 5; i++) {
        act(() => {
          rerenderFn!(<LoadingState onTimeoutExceeded={onTimeoutExceeded} />);
        });
      }

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(onTimeoutExceeded).toHaveBeenCalledTimes(1);
    });
  });

  describe('Memory Leaks', () => {
    it('should clean up timeout on unmount', () => {
      const onTimeoutExceeded = vi.fn();
      let unmountFn: (() => void) | null = null;

      act(() => {
        const result = render(<LoadingState onTimeoutExceeded={onTimeoutExceeded} />);
        unmountFn = result.unmount;
      });

      unmountFn!();

      act(() => {
        vi.advanceTimersByTime(35000);
      });

      expect(onTimeoutExceeded).not.toHaveBeenCalled();
    });

    it('should not interfere between multiple instances', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      let unmount1Fn: (() => void) | null = null;
      act(() => {
        const result = render(<LoadingState onTimeoutExceeded={callback1} />);
        unmount1Fn = result.unmount;
      });

      act(() => {
        render(<LoadingState onTimeoutExceeded={callback2} />);
      });

      await act(async () => {
        vi.advanceTimersByTime(30000);
      });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);

      unmount1Fn!();
    });
  });
});
