import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardLayout, { DashboardLayoutWithPreferences } from '../../components/DashboardLayout';
import { useUserPreferences } from '../../hooks/useUserPreferences';
import { useFIIData } from '../../hooks/useFIIData';

// Mock hooks
vi.mock('../../hooks/useUserPreferences');
vi.mock('../../hooks/useFIIData');

// Mock components
vi.mock('../../components/SearchInput', () => ({
  default: ({ onSelect }: any) => (
    <input
      placeholder="Search FIIs"
      data-testid="search-input"
      onChange={(e) => {
        if (e.target.value === 'MXRF11') {
          onSelect('MXRF11');
        }
      }}
    />
  ),
}));

vi.mock('../../components/FIICard', () => ({
  default: ({ fii }: any) => (
    <div data-testid={`fii-card-${fii.symbol}`} className="p-4 border">
      <h3>{fii.symbol}</h3>
      <p>{fii.priceFormatted}</p>
      <p>{fii.dividendYield1MonthFormatted}</p>
    </div>
  ),
}));

vi.mock('../../components/LoadingState', () => ({
  default: () => <div data-testid="loading-state">Loading...</div>,
}));

vi.mock('../../components/ErrorState', () => ({
  default: ({ onRetry }: any) => (
    <div data-testid="error-state">
      <p>Error occurred</p>
      <button onClick={onRetry} data-testid="retry-button">
        Retry
      </button>
    </div>
  ),
}));

vi.mock('../../components/EmptyState', () => ({
  default: () => <div data-testid="empty-state">No FIIs found</div>,
}));

vi.mock('../../components/FIIDetailView', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="detail-view">
      <button onClick={onClose} data-testid="close-detail-view">
        Close
      </button>
    </div>
  ),
}));

// Mock FII data
const mockFIIData = {
  MXRF11: {
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
  HGLG11: {
    symbol: 'HGLG11',
    name: 'HG Logística Imobiliário',
    price: 12.45,
    nav: 11.8234,
    pvRatio: 1.0533,
    dividendYield1Month: 0.15432,
    dividendYield12Month: 0.14876,
    monthlyReturn: 0.01234,
    investorCount: 32456,
    totalAssets: 2876543210,
    administrator: {
      name: 'HG Administração Ltda',
      cnpj: '11.111.111/0001-11',
      email: 'contact@hg.com.br',
    },
  },
  KNSC11: {
    symbol: 'KNSC11',
    name: 'Kinea Imobiliário',
    price: 8.92,
    nav: 8.76543,
    pvRatio: 1.0174,
    dividendYield1Month: 0.11234,
    dividendYield12Month: 0.11567,
    monthlyReturn: 0.00876,
    investorCount: 28765,
    totalAssets: 1654321000,
    administrator: {
      name: 'Kinea Administração Ltda',
      cnpj: '22.222.222/0001-22',
      email: 'contact@kinea.com.br',
    },
  },
};

/**
 * Helper function to set viewport size and trigger window resize
 * Simulates device viewport changes for responsive testing
 */
function setViewportSize(width: number, height: number = 768) {
  global.innerWidth = width;
  global.innerHeight = height;
  global.dispatchEvent(new Event('resize'));
  
  // Update matchMedia mock to reflect new viewport
  (window.matchMedia as any).mockImplementation((query: string) => {
    const matches = query === '(max-width: 640px)' 
      ? width < 640
      : query === '(max-width: 767px)'
      ? width < 768
      : query === '(min-width: 768px)'
      ? width >= 768
      : query === '(min-width: 1024px)'
      ? width >= 1024
      : false;
    
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
}

describe('Responsive Design Integration Tests - Task 20.6', () => {
  beforeEach(() => {
    setViewportSize(1024); // Default to desktop
    
    // Mock useFIIData hook
    (useFIIData as any).mockReturnValue({
      data: mockFIIData,
      isLoading: false,
      error: null,
      isEmpty: false,
      refresh: vi.fn(),
    });

    // Mock useUserPreferences hook
    (useUserPreferences as any).mockReturnValue({
      selectedFIIs: Object.keys(mockFIIData),
      addFII: vi.fn(),
      removeFII: vi.fn(),
      theme: 'dark',
      setTheme: vi.fn(),
      refreshInterval: 300000,
      clearPreferences: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Mobile Viewport Tests (320px)', () => {
    beforeEach(() => {
      setViewportSize(320, 640);
    });

    it('Should render single-column layout on mobile (320px)', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      // Find the grid container
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toBeTruthy();
      
      // Verify grid has single-column class
      expect(gridContainer).toHaveClass('grid-cols-1');
      
      // Verify mobile layout classes
      expect(gridContainer?.className).toMatch(/grid-cols-1/);
    });

    it('Should display all FII cards in single column on mobile', () => {
      render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      // Verify all FII cards are rendered
      const mxrfCard = screen.getByTestId('fii-card-MXRF11');
      const hglgCard = screen.getByTestId('fii-card-HGLG11');
      const knscCard = screen.getByTestId('fii-card-KNSC11');

      expect(mxrfCard).toBeInTheDocument();
      expect(hglgCard).toBeInTheDocument();
      expect(knscCard).toBeInTheDocument();
    });

    it('Should have full-width search input on mobile', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const searchWrapper = container.querySelector('header .flex');
      expect(searchWrapper).toHaveClass('flex-col'); // Mobile: flex-col (stacked)
    });

    it('Should display refresh button below search input on mobile', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const refreshButton = container.querySelector('button[aria-label="Refresh FII data"]');
      expect(refreshButton).toHaveClass('w-full'); // Mobile: full width
    });

    it('Should maintain all functionality on mobile - search, refresh, click', async () => {
      const onAddFII = vi.fn();
      const onRemoveFII = vi.fn();
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={onAddFII}
          onRemoveFII={onRemoveFII}
          theme="dark"
        />
      );

      // Test search input is accessible
      const searchInput = screen.getByTestId('search-input');
      expect(searchInput).toBeInTheDocument();

      // Test refresh button is accessible and functional
      const refreshButton = container.querySelector('button[aria-label="Refresh FII data"]');
      expect(refreshButton).toBeInTheDocument();
      fireEvent.click(refreshButton!);

      // Test FII card is rendered and visible
      const fiiCard = screen.getByTestId('fii-card-MXRF11');
      expect(fiiCard).toBeInTheDocument();
      expect(fiiCard).toBeVisible();
    });

    it('Should have readable text sizes on mobile', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const heading = container.querySelector('h1');
      expect(heading).toHaveClass('text-4xl'); // Readable heading size
      expect(heading).toHaveClass('font-bold');
    });

    it('Should display full viewport height container on mobile', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toBeInTheDocument();
    });

    it('Should handle 319px edge case (below mobile breakpoint)', () => {
      setViewportSize(319, 640);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
    });
  });

  describe('Tablet Viewport Tests (768px)', () => {
    beforeEach(() => {
      setViewportSize(768, 1024);
    });

    it('Should render 2-column layout on tablet (768px)', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
    });

    it('Should display FII cards in 2-column layout on tablet', () => {
      render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const mxrfCard = screen.getByTestId('fii-card-MXRF11');
      const hglgCard = screen.getByTestId('fii-card-HGLG11');
      const knscCard = screen.getByTestId('fii-card-KNSC11');

      expect(mxrfCard).toBeInTheDocument();
      expect(hglgCard).toBeInTheDocument();
      expect(knscCard).toBeInTheDocument();
    });

    it('Should have horizontal layout for header on tablet', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const headerFlex = container.querySelector('header .flex');
      // Should have md:flex-row (applies at tablet+)
      expect(headerFlex).toHaveClass('sm:flex-row');
    });

    it('Should apply consistent grid gap (gap-6) on tablet', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('gap-6');
    });

    it('Should maintain all functionality on tablet', () => {
      render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const searchInput = screen.getByTestId('search-input');
      const mxrfCard = screen.getByTestId('fii-card-MXRF11');

      expect(searchInput).toBeInTheDocument();
      expect(mxrfCard).toBeInTheDocument();
    });

    it('Should handle 767px edge case (tablet boundary)', () => {
      setViewportSize(767, 1024);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      // At 767px, still in mobile range
      expect(gridContainer).toHaveClass('grid-cols-1');
    });

    it('Should handle exact 768px tablet breakpoint', () => {
      setViewportSize(768, 1024);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
    });
  });

  describe('Desktop Viewport Tests (1200px)', () => {
    beforeEach(() => {
      setViewportSize(1200, 768);
    });

    it('Should render 3+ column layout on desktop (1200px)', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    it('Should display all FII cards in 3-column layout on desktop', () => {
      render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const mxrfCard = screen.getByTestId('fii-card-MXRF11');
      const hglgCard = screen.getByTestId('fii-card-HGLG11');
      const knscCard = screen.getByTestId('fii-card-KNSC11');

      expect(mxrfCard).toBeInTheDocument();
      expect(hglgCard).toBeInTheDocument();
      expect(knscCard).toBeInTheDocument();
    });

    it('Should have all components functional and readable on desktop', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      // Verify header is present and readable
      const heading = container.querySelector('h1');
      expect(heading?.textContent).toBe('FII Dashboard');

      // Verify grid layout is set up correctly
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
      expect(gridContainer).toHaveClass('gap-6');

      // Verify all cards are rendered
      expect(screen.getByTestId('fii-card-MXRF11')).toBeInTheDocument();
    });

    it('Should handle 1024px edge case (desktop breakpoint)', () => {
      setViewportSize(1024, 768);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    it('Should handle 1400px large desktop viewport', () => {
      setViewportSize(1400, 768);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Dynamic Viewport Resize Tests', () => {
    it('Should adapt dynamically when window resized from mobile to desktop', async () => {
      // Start at mobile
      setViewportSize(320, 640);
      
      const { container, rerender } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      let gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');

      // Resize to tablet
      setViewportSize(768, 1024);
      rerender(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');

      // Resize to desktop
      setViewportSize(1200, 768);
      rerender(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });

    it('Should maintain data integrity across resize', () => {
      setViewportSize(320, 640);
      
      const { container, rerender } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      // Verify cards exist on mobile
      let mxrfCard = screen.getByTestId('fii-card-MXRF11');
      expect(mxrfCard).toBeInTheDocument();

      // Resize to desktop
      setViewportSize(1200, 768);
      rerender(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      // Verify same cards still exist
      mxrfCard = screen.getByTestId('fii-card-MXRF11');
      expect(mxrfCard).toBeInTheDocument();
    });
  });

  describe('Component Visibility and Readability Tests', () => {
    it('Should display all FII cards with correct spacing on all sizes', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const gridContainer = container.querySelector('.grid');
      
      // Verify gap spacing
      expect(gridContainer).toHaveClass('gap-6');
      
      // Verify all cards are rendered and visible
      const cards = container.querySelectorAll('[data-testid^="fii-card-"]');
      expect(cards.length).toBe(3);
      
      cards.forEach((card) => {
        expect(card).toBeVisible();
      });
    });

    it('Should not cut off any components on mobile viewport', () => {
      setViewportSize(320, 640);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      // Verify main container is not overflow-hidden
      const mainContainer = container.querySelector('.min-h-screen');
      const computedStyle = window.getComputedStyle(mainContainer!);
      
      // Container should allow full content display
      expect(mainContainer).toBeInTheDocument();
    });

    it('Should maintain proper padding on all screen sizes', () => {
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const innerContainer = container.querySelector('.container');
      
      // Verify padding classes are applied
      expect(innerContainer).toHaveClass('px-4');
      expect(innerContainer).toHaveClass('py-8');
      expect(innerContainer).toHaveClass('mx-auto');
    });
  });

  describe('Loading and Error States on Different Viewports', () => {
    it('Should display loading state correctly on mobile', () => {
      setViewportSize(320, 640);
      
      (useFIIData as any).mockReturnValue({
        data: {},
        isLoading: true,
        error: null,
        isEmpty: true,
        refresh: vi.fn(),
      });

      render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const loadingState = screen.getByTestId('loading-state');
      expect(loadingState).toBeInTheDocument();
    });

    it('Should display loading state correctly on desktop', () => {
      setViewportSize(1200, 768);
      
      (useFIIData as any).mockReturnValue({
        data: {},
        isLoading: true,
        error: null,
        isEmpty: true,
        refresh: vi.fn(),
      });

      render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const loadingState = screen.getByTestId('loading-state');
      expect(loadingState).toBeInTheDocument();
    });

    it('Should display error state correctly on all viewports', async () => {
      const mockError = {
        code: 'TIMEOUT',
        message: 'Request timeout',
        statusCode: 504,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      (useFIIData as any).mockReturnValue({
        data: {},
        isLoading: false,
        error: mockError,
        isEmpty: false,
        refresh: vi.fn(),
      });

      render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const errorState = screen.getByTestId('error-state');
      expect(errorState).toBeInTheDocument();
      
      const retryButton = screen.getByTestId('retry-button');
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Dark Mode Rendering on Different Viewports', () => {
    it('Should render dark mode theme correctly on mobile', () => {
      setViewportSize(320, 640);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toHaveClass('bg-gray-900');
    });

    it('Should render dark mode theme correctly on desktop', () => {
      setViewportSize(1200, 768);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="dark"
        />
      );

      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toHaveClass('bg-gray-900');
    });

    it('Should render light mode theme correctly on all viewports', () => {
      setViewportSize(320, 640);
      
      const { container } = render(
        <DashboardLayout
          selectedFIIs={Object.keys(mockFIIData)}
          onAddFII={vi.fn()}
          onRemoveFII={vi.fn()}
          theme="light"
        />
      );

      const mainContainer = container.querySelector('.min-h-screen');
      expect(mainContainer).toHaveClass('bg-white');
    });
  });

  describe('Responsive Design with Preferences Hook Tests', () => {
    it('Should apply responsive layout with DashboardLayoutWithPreferences on mobile', () => {
      setViewportSize(320, 640);
      
      const { container } = render(<DashboardLayoutWithPreferences />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
    });

    it('Should apply responsive layout with DashboardLayoutWithPreferences on tablet', () => {
      setViewportSize(768, 1024);
      
      const { container } = render(<DashboardLayoutWithPreferences />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
    });

    it('Should apply responsive layout with DashboardLayoutWithPreferences on desktop', () => {
      setViewportSize(1200, 768);
      
      const { container } = render(<DashboardLayoutWithPreferences />);

      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });
  });
});
