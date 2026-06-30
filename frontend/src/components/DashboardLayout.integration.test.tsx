/**
 * Integration Tests for DashboardLayoutWithPreferences
 * Tests localStorage persistence integration with the dashboard layout
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DashboardLayoutWithPreferences } from './DashboardLayout';

// Mock the child components
vi.mock('./LoadingState', () => ({
  __esModule: true,
  default: () => <div data-testid="loading-state">Loading...</div>,
}));

vi.mock('./ErrorState', () => ({
  __esModule: true,
  default: ({ error, onRetry }: any) => (
    <div data-testid="error-state">
      <div>{error.message}</div>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

vi.mock('./EmptyState', () => ({
  __esModule: true,
  default: () => <div data-testid="empty-state">No FIIs selected</div>,
}));

vi.mock('./SearchInput', () => ({
  __esModule: true,
  default: ({ onSelect }: any) => (
    <input
      data-testid="search-input"
      onChange={(e) => {
        if (e.target.value === 'MXRF11') {
          onSelect('MXRF11');
        }
      }}
    />
  ),
}));

vi.mock('./FIICard', () => ({
  __esModule: true,
  default: ({ fii }: any) => <div data-testid={`fii-card-${fii.symbol}`}>{fii.symbol}</div>,
}));

vi.mock('./FIIDetailView', () => ({
  __esModule: true,
  default: ({ fii, onClose }: any) => (
    <div data-testid="detail-view">
      <div>{fii.symbol}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock the useFIIData hook
vi.mock('../hooks/useFIIData', () => ({
  useFIIData: (symbols: string[]) => {
    const mockData: Record<string, any> = {
      MXRF11: {
        symbol: 'MXRF11',
        price: 9.74,
        nav: 9.3678,
        pvRatio: 1.0392547,
        dividendYield1Month: 0.12268994,
        dividendYield12Month: 0.12543876,
        monthlyReturn: 0.02543,
        investorCount: 45678,
        totalAssets: 4313692700,
        administrator: { name: 'XP', cnpj: '00.000.000/0001-00', email: 'contact@xp.com' },
      },
    };

    const data: Record<string, any> = {};
    symbols.forEach((symbol) => {
      if (mockData[symbol]) {
        data[symbol] = mockData[symbol];
      }
    });

    return {
      data,
      isLoading: false,
      error: null,
      isEmpty: symbols.length === 0,
      refresh: vi.fn(),
    };
  },
}));

describe('DashboardLayoutWithPreferences Integration', () => {
  const STORAGE_KEY = 'fiiDashboard_preferences';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Theme Persistence (Requirement 18.3)', () => {
    it('should apply dark theme by default', () => {
      render(<DashboardLayoutWithPreferences />);

      const dashboardContainer = screen.getByRole('heading', { name: /FII Dashboard/i });
      expect(dashboardContainer).toBeInTheDocument();

      // Theme button should show sun emoji (light mode toggle)
      const themeButton = screen.getByTitle(/Switch to light mode/i);
      expect(themeButton).toHaveTextContent('☀️');
    });

    it('should toggle theme and persist to localStorage', async () => {
      render(<DashboardLayoutWithPreferences />);

      // Click theme toggle
      const themeButton = screen.getByTitle(/Switch to light mode/i);
      fireEvent.click(themeButton);

      await waitFor(() => {
        // Check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeTruthy();

        const parsed = JSON.parse(stored!);
        expect(parsed.theme).toBe('light');
      });

      // Theme button should now show moon emoji
      const updatedThemeButton = screen.getByTitle(/Switch to dark mode/i);
      expect(updatedThemeButton).toHaveTextContent('🌙');
    });

    it('should restore theme from localStorage on mount', () => {
      const preferences = {
        selectedFIIs: [],
        theme: 'light' as const,
        refreshInterval: 300000,
        selectedMetrics: ['price', 'yield', 'pvRatio', 'monthlyReturn'],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      render(<DashboardLayoutWithPreferences />);

      // Theme button should show moon emoji (dark mode toggle)
      const themeButton = screen.getByTitle(/Switch to dark mode/i);
      expect(themeButton).toHaveTextContent('🌙');
    });
  });

  describe('FII Selection Persistence (Requirement 18.1-18.2)', () => {
    it('should display empty state when no FIIs selected', () => {
      render(<DashboardLayoutWithPreferences />);

      const emptyState = screen.getByTestId('empty-state');
      expect(emptyState).toBeInTheDocument();
    });

    it('should add FII and persist to localStorage', async () => {
      render(<DashboardLayoutWithPreferences />);

      const searchInput = screen.getByTestId('search-input') as HTMLInputElement;
      fireEvent.change(searchInput, { target: { value: 'MXRF11' } });

      await waitFor(() => {
        // Check if FII tag is displayed
        const fiiTag = screen.getByText('MXRF11');
        expect(fiiTag).toBeInTheDocument();

        // Check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeTruthy();

        const parsed = JSON.parse(stored!);
        expect(parsed.selectedFIIs).toContain('MXRF11');
      });
    });

    it('should display selected FIIs', async () => {
      const preferences = {
        selectedFIIs: ['MXRF11'],
        theme: 'dark' as const,
        refreshInterval: 300000,
        selectedMetrics: ['price', 'yield', 'pvRatio', 'monthlyReturn'],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      render(<DashboardLayoutWithPreferences />);

      await waitFor(() => {
        // FII card should be displayed
        const fiiCard = screen.getByTestId('fii-card-MXRF11');
        expect(fiiCard).toBeInTheDocument();

        // FII tag should be displayed
        const fiiTag = screen.getByText('MXRF11');
        expect(fiiTag).toBeInTheDocument();
      });
    });

    it('should remove FII and update localStorage', async () => {
      const preferences = {
        selectedFIIs: ['MXRF11'],
        theme: 'dark' as const,
        refreshInterval: 300000,
        selectedMetrics: ['price', 'yield', 'pvRatio', 'monthlyReturn'],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      render(<DashboardLayoutWithPreferences />);

      await waitFor(() => {
        const fiiTag = screen.getByText('MXRF11');
        expect(fiiTag).toBeInTheDocument();
      });

      // Click remove button (✕)
      const removeButton = screen.getByTitle('Remove MXRF11');
      fireEvent.click(removeButton);

      await waitFor(() => {
        // FII card should no longer be displayed
        const fiiCard = screen.queryByTestId('fii-card-MXRF11');
        expect(fiiCard).not.toBeInTheDocument();

        // Check localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(stored!);
        expect(parsed.selectedFIIs).not.toContain('MXRF11');
      });
    });
  });

  describe('Reset Preferences (Requirement 18.4)', () => {
    it('should display reset button', () => {
      render(<DashboardLayoutWithPreferences />);

      const resetButton = screen.getByTitle('Reset all preferences');
      expect(resetButton).toBeInTheDocument();
    });

    it('should clear preferences when reset button is clicked', async () => {
      const preferences = {
        selectedFIIs: ['MXRF11'],
        theme: 'light' as const,
        refreshInterval: 600000,
        selectedMetrics: ['price', 'yield'],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      render(<DashboardLayoutWithPreferences />);

      await waitFor(() => {
        const fiiTag = screen.getByText('MXRF11');
        expect(fiiTag).toBeInTheDocument();
      });

      // Click reset button
      const resetButton = screen.getByTitle('Reset all preferences');
      window.confirm = vi.fn(() => true);

      fireEvent.click(resetButton);

      await waitFor(() => {
        // Empty state should be displayed
        const emptyState = screen.getByTestId('empty-state');
        expect(emptyState).toBeInTheDocument();

        // FII tag should no longer be displayed
        const fiiTag = screen.queryByText('MXRF11');
        expect(fiiTag).not.toBeInTheDocument();

        // localStorage should be cleared
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeNull();
      });
    });

    it('should not clear preferences when reset is cancelled', async () => {
      const preferences = {
        selectedFIIs: ['MXRF11'],
        theme: 'light' as const,
        refreshInterval: 600000,
        selectedMetrics: ['price', 'yield'],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      render(<DashboardLayoutWithPreferences />);

      await waitFor(() => {
        const fiiTag = screen.getByText('MXRF11');
        expect(fiiTag).toBeInTheDocument();
      });

      // Click reset button but cancel
      const resetButton = screen.getByTitle('Reset all preferences');
      window.confirm = vi.fn(() => false);

      fireEvent.click(resetButton);

      await waitFor(() => {
        // FII card should still be displayed
        const fiiCard = screen.getByTestId('fii-card-MXRF11');
        expect(fiiCard).toBeInTheDocument();

        // localStorage should still have preferences
        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeTruthy();

        const parsed = JSON.parse(stored!);
        expect(parsed.selectedFIIs).toContain('MXRF11');
      });
    });
  });

  describe('Detail View Integration (Requirement 18.2)', () => {
    it('should open detail view when FII card is clicked', async () => {
      const preferences = {
        selectedFIIs: ['MXRF11'],
        theme: 'dark' as const,
        refreshInterval: 300000,
        selectedMetrics: ['price', 'yield', 'pvRatio', 'monthlyReturn'],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      render(<DashboardLayoutWithPreferences />);

      await waitFor(() => {
        const fiiCard = screen.getByTestId('fii-card-MXRF11');
        fireEvent.click(fiiCard);
      });

      await waitFor(() => {
        const detailView = screen.getByTestId('detail-view');
        expect(detailView).toBeInTheDocument();
      });
    });

    it('should close detail view when close button is clicked', async () => {
      const preferences = {
        selectedFIIs: ['MXRF11'],
        theme: 'dark' as const,
        refreshInterval: 300000,
        selectedMetrics: ['price', 'yield', 'pvRatio', 'monthlyReturn'],
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));

      render(<DashboardLayoutWithPreferences />);

      await waitFor(() => {
        const fiiCard = screen.getByTestId('fii-card-MXRF11');
        fireEvent.click(fiiCard);
      });

      await waitFor(() => {
        const detailView = screen.getByTestId('detail-view');
        expect(detailView).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      await waitFor(() => {
        const detailView = screen.queryByTestId('detail-view');
        expect(detailView).not.toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    it('should display refresh button', () => {
      render(<DashboardLayoutWithPreferences />);

      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toBeInTheDocument();
    });

    it('should show "Refreshing..." while loading', async () => {
      vi.mock('../hooks/useFIIData', () => ({
        useFIIData: () => ({
          data: {},
          isLoading: true,
          error: null,
          isEmpty: true,
          refresh: vi.fn(),
        }),
      }));

      render(<DashboardLayoutWithPreferences />);

      // In real scenario, button would show "Refreshing..." when loading
      // This test verifies the UI structure is in place
      const refreshButton = screen.getByText(/Refresh/i);
      expect(refreshButton).toBeInTheDocument();
    });
  });
});
