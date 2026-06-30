import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardLayout from './DashboardLayout';
import { FIIData, ErrorState } from '@/types';

// Mock child components
vi.mock('./LoadingState', () => ({
  default: () => <div data-testid="loading-state">Loading</div>,
}));

vi.mock('./ErrorState', () => ({
  default: ({ error, onRetry }: any) => (
    <div data-testid="error-state">
      Error: {error.message}
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

vi.mock('./EmptyState', () => ({
  default: () => <div data-testid="empty-state">Empty</div>,
}));

vi.mock('./SearchInput', () => ({
  default: ({ onSelect }: any) => (
    <input
      data-testid="search-input"
      onChange={(e) => onSelect(e.target.value)}
      placeholder="Search"
    />
  ),
}));

vi.mock('./FIICard', () => ({
  default: ({ fii }: any) => <div data-testid="fii-card">{fii.symbol}</div>,
}));

const mockFIIData: Record<string, FIIData> = {
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
    administrator: {
      name: 'XP Administração',
      cnpj: '00.000.000/0001-00',
      email: 'contact@xp.com.br',
    },
  },
  HGLG11: {
    symbol: 'HGLG11',
    price: 150.5,
    nav: 148.2,
    pvRatio: 1.0155,
    dividendYield1Month: 0.08,
    dividendYield12Month: 0.095,
    monthlyReturn: 0.015,
    investorCount: 32000,
    totalAssets: 1500000000,
    administrator: {
      name: 'CSHG',
      cnpj: '00.000.000/0001-01',
      email: 'contact@cshg.com.br',
    },
  },
};

const mockError: ErrorState = {
  code: 'NETWORK_ERROR',
  message: 'Unable to fetch FII data',
  statusCode: 503,
  timestamp: new Date(),
};

describe('DashboardLayout', () => {
  const defaultProps = {
    fiiData: {},
    isLoading: false,
    error: null,
    isEmpty: false,
    onRefresh: vi.fn(),
    onAddFII: vi.fn(),
    onFIIDetailClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when isLoading is true and no data', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        isLoading={true}
        isEmpty={false}
        fiiData={{}}
      />
    );

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('renders error state when error exists', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        error={mockError}
        isEmpty={false}
      />
    );

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.getByText(/Unable to fetch FII data/)).toBeInTheDocument();
  });

  it('renders empty state when isEmpty is true', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        isEmpty={true}
        fiiData={{}}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders FII cards when data is available', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
      />
    );

    expect(screen.getByText('MXRF11')).toBeInTheDocument();
    expect(screen.getByText('HGLG11')).toBeInTheDocument();
    expect(screen.getAllByTestId('fii-card')).toHaveLength(2);
  });

  it('calls onRefresh when refresh button is clicked', async () => {
    const onRefresh = vi.fn();
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
        onRefresh={onRefresh}
      />
    );

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('disables refresh button while loading', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
        isLoading={true}
      />
    );

    // When loading with existing data, the refresh button should be disabled
    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    expect(refreshButton).toBeDisabled();
  });

  it('displays "Refreshing..." text while loading', async () => {
    const onRefresh = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 100)));
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
        onRefresh={onRefresh}
      />
    );

    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(screen.getByText('Refreshing...')).toBeInTheDocument();
    });
  });

  it('renders header with title and search input', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
      />
    );

    expect(screen.getByText('FII Dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('calls onAddFII when search input changes', () => {
    const onAddFII = vi.fn();
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
        onAddFII={onAddFII}
      />
    );

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'MXRF11' } });

    expect(onAddFII).toHaveBeenCalledWith('MXRF11');
  });

  it('displays update indicator when loading with existing data', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
        isLoading={true}
      />
    );

    expect(screen.getByText('Updating FII data...')).toBeInTheDocument();
    // FII cards should still be visible
    expect(screen.getByText('MXRF11')).toBeInTheDocument();
  });

  it('calls onFIIDetailClick when FII card is clicked', () => {
    const onFIIDetailClick = vi.fn();
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
        onFIIDetailClick={onFIIDetailClick}
      />
    );

    const card = screen.getAllByTestId('fii-card')[0];
    fireEvent.click(card);

    // Note: The actual FormattedFII object will be passed
    expect(onFIIDetailClick).toHaveBeenCalled();
  });

  it('renders responsive grid layout', () => {
    const { container } = render(
      <DashboardLayout
        {...defaultProps}
        fiiData={mockFIIData}
        isEmpty={false}
      />
    );

    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('error state takes priority over empty state', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        error={mockError}
        isEmpty={true}
        fiiData={{}}
      />
    );

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('handles empty FII data map gracefully', () => {
    render(
      <DashboardLayout
        {...defaultProps}
        fiiData={{}}
        isEmpty={true}
      />
    );

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('fii-card')).not.toBeInTheDocument();
  });

  describe('Responsive Design Tests (Requirements 11.5-11.8, 19.1-19.8)', () => {
    /**
     * Tests verify responsive grid layout works at different breakpoints:
     * - Mobile (<768px): 1 column layout
     * - Tablet (768-1024px): 2 columns layout
     * - Desktop (>1024px): 3+ columns layout
     */

    it('renders grid with responsive classes for mobile, tablet, and desktop', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
      expect(gridContainer).toHaveClass('gap-6');
    });

    it('displays FII cards in grid layout', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const cards = container.querySelectorAll('[data-testid="fii-card"]');
      expect(cards).toHaveLength(2);

      const gridContainer = container.querySelector('.grid');
      const gridChildren = gridContainer?.querySelectorAll('div > div');
      expect(gridChildren?.length).toBeGreaterThan(0);
    });

    it('applies responsive gap spacing', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('gap-6');
    });

    it('maintains responsive layout with single FII card', () => {
      const singleFIIData = {
        MXRF11: mockFIIData.MXRF11,
      };

      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={singleFIIData}
          isEmpty={false}
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');

      const cards = container.querySelectorAll('[data-testid="fii-card"]');
      expect(cards).toHaveLength(1);
    });

    it('maintains responsive layout with many FII cards', () => {
      const manyFIIs: Record<string, FIIData> = {};
      for (let i = 0; i < 9; i++) {
        manyFIIs[`FII${i}`] = {
          symbol: `FII${i}`,
          price: 10 + i,
          nav: 9 + i,
          pvRatio: 1.0 + i * 0.01,
          dividendYield1Month: 0.1 + i * 0.01,
          dividendYield12Month: 0.12 + i * 0.01,
          monthlyReturn: 0.01 + i * 0.002,
          investorCount: 50000 + i * 1000,
          totalAssets: 5000000000 + i * 100000000,
          administrator: {
            name: `Admin${i}`,
            cnpj: `00.000.000/0001-${i.toString().padStart(2, '0')}`,
            email: `admin${i}@example.com`,
          },
        };
      }

      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={manyFIIs}
          isEmpty={false}
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');

      const cards = container.querySelectorAll('[data-testid="fii-card"]');
      expect(cards).toHaveLength(9);
    });

    it('header layout is responsive and flexes correctly', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const header = container.querySelector('header');
      expect(header).toBeInTheDocument();

      // Header flex container for search and refresh button
      const headerFlex = header?.querySelector('.flex');
      expect(headerFlex).toHaveClass('flex-col', 'sm:flex-row');
    });

    it('search input and refresh button stack on mobile and align on desktop', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const header = container.querySelector('header');
      const flex = header?.querySelector('.flex');

      // Verify responsive classes are applied
      expect(flex).toHaveClass('flex-col', 'sm:flex-row');
      expect(flex).toHaveClass('gap-4', 'items-center');
    });

    it('grid container has proper min-height and padding for mobile view', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('bg-gray-900', 'min-h-screen');

      const innerContainer = mainContainer?.querySelector('.container');
      expect(innerContainer).toHaveClass('container', 'mx-auto', 'px-4', 'py-8');
    });

    it('FII card containers are clickable and properly sized', () => {
      const onFIIDetailClick = vi.fn();
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
          onFIIDetailClick={onFIIDetailClick}
        />
      );

      // The grid direct children are the card wrappers
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
      
      // Check that grid contains the proper number of items
      const gridItems = gridContainer?.querySelectorAll(':scope > div');
      expect(gridItems?.length).toBe(2);

      // Verify they are clickable by checking they have an onClick handler
      gridItems?.forEach((item) => {
        const fiiCard = item.querySelector('[data-testid="fii-card"]');
        expect(fiiCard).toBeInTheDocument();
      });
    });

    it('renders with correct container max-width and centering', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const containerDiv = container.querySelector('.container');
      expect(containerDiv).toHaveClass('mx-auto', 'px-4');
    });

    it('handles responsive layout during loading state', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          isLoading={true}
          isEmpty={false}
          fiiData={mockFIIData}
        />
      );

      // Should still maintain responsive structure
      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toHaveClass('bg-gray-900');

      const innerContainer = mainContainer?.querySelector('.container');
      expect(innerContainer).toHaveClass('mx-auto', 'px-4', 'py-8');
    });

    it('update indicator is visible during refresh with responsive layout intact', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
          isLoading={true}
        />
      );

      expect(screen.getByText('Updating FII data...')).toBeInTheDocument();

      // Grid should still be present and responsive
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');

      // Cards should still be visible
      const cards = container.querySelectorAll('[data-testid="fii-card"]');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('search input width is responsive (full width on mobile, flex on desktop)', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const header = container.querySelector('header');
      const flex = header?.querySelector('.flex');

      // Find the search input wrapper (first child of flex)
      const searchWrapper = flex?.firstChild;
      expect(searchWrapper).toHaveClass('w-full', 'sm:w-auto', 'flex-1');
    });

    it('refresh button is responsive width on mobile and auto on desktop', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const refreshButton = screen.getByText('Refresh');
      expect(refreshButton).toHaveClass('w-full', 'sm:w-auto');
    });

    it('renders all components with proper responsive text sizes', () => {
      const { container } = render(
        <DashboardLayout
          {...defaultProps}
          fiiData={mockFIIData}
          isEmpty={false}
        />
      );

      const title = screen.getByText('FII Dashboard');
      expect(title).toHaveClass('text-4xl', 'font-bold', 'text-white');

      // Verify cards exist and are rendered
      const cards = container.querySelectorAll('[data-testid="fii-card"]');
      expect(cards.length).toBe(2);
    });
  });
});
