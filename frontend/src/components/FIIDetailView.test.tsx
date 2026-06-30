import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FIIDetailView from './FIIDetailView';
import { FormattedFII, PVRatioFormatted } from '@/types';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Test suite for FIIDetailView component
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */

// Mock FormattedFII data
const mockFormattedFII: FormattedFII = {
  symbol: 'MXRF11',
  priceFormatted: 'R$ 9,74',
  navFormatted: 'R$ 9,37',
  pvRatioFormatted: {
    displayValue: '1.04',
    status: 'premium',
    intensity: 'low',
    ariaLabel: 'Premium (trading above NAV)',
  } as PVRatioFormatted,
  dividendYield1MonthFormatted: '1.23%',
  dividendYield12MonthFormatted: '12.68%',
  monthlyReturnFormatted: '2.54%',
  investorCountFormatted: '45.678',
  totalAssetsFormatted: 'R$ 4.313.692.700,00',
  administrator: {
    name: 'XP Administração de Recursos Ltda',
    cnpj: '00.000.000/0001-00',
    email: 'contact@xp.com.br',
  },
};

const mockFormattedFIIDiscount: FormattedFII = {
  ...mockFormattedFII,
  symbol: 'HGLG11',
  pvRatioFormatted: {
    displayValue: '0.98',
    status: 'discount',
    intensity: 'high',
    ariaLabel: 'Discount (trading below NAV)',
  } as PVRatioFormatted,
};

const mockFormattedFIINeutral: FormattedFII = {
  ...mockFormattedFII,
  symbol: 'KNSC11',
  pvRatioFormatted: {
    displayValue: '1.00',
    status: 'neutral',
    intensity: 'high',
    ariaLabel: 'At NAV',
  } as PVRatioFormatted,
};

describe('FIIDetailView Component', () => {
  let mockOnClose: ReturnType<typeof vi.fn>;
  let mockOnRefresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnRefresh = vi.fn().mockResolvedValue(undefined);
    // Set initial viewport to desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Visibility and Display', () => {
    it('should render nothing when isOpen is false', () => {
      const { container } = render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={false}
          onClose={mockOnClose}
        />
      );
      expect(container.innerHTML).toBe('');
    });

    it('should render nothing when fii is null', () => {
      const { container } = render(
        <FIIDetailView fii={null} isOpen={true} onClose={mockOnClose} />
      );
      expect(container.innerHTML).toBe('');
    });

    it('should display FII details when isOpen is true and fii is provided', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('MXRF11')).toBeInTheDocument();
      expect(screen.getAllByText(mockFormattedFII.administrator.name).length).toBeGreaterThan(0);
    });
  });

  describe('Metric Display - Requirements 13.2, 13.3', () => {
    it('should display all FII metrics', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('R$ 9,74')).toBeInTheDocument(); // Price
      expect(screen.getByText('R$ 9,37')).toBeInTheDocument(); // NAV
      expect(screen.getByText('1.04')).toBeInTheDocument(); // P/VP
      expect(screen.getByText('1.23%')).toBeInTheDocument(); // 1M Yield
      expect(screen.getByText('12.68%')).toBeInTheDocument(); // 12M Yield
      expect(screen.getByText('2.54%')).toBeInTheDocument(); // Monthly Return
      expect(screen.getByText('45.678')).toBeInTheDocument(); // Investor Count
      expect(screen.getByText('R$ 4.313.692.700,00')).toBeInTheDocument(); // Total Assets
    });

    it('should display administrator details', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getAllByText('XP Administração de Recursos Ltda').length).toBeGreaterThan(0);
      expect(screen.getByText('00.000.000/0001-00')).toBeInTheDocument();
      expect(screen.getByText('contact@xp.com.br')).toBeInTheDocument();
    });

    it('should display administrator email as clickable link', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const emailLink = screen.getByText('contact@xp.com.br') as HTMLAnchorElement;
      expect(emailLink.href).toBe('mailto:contact@xp.com.br');
    });

    it('should display N/A for missing administrator email', () => {
      const fiiWithoutEmail: FormattedFII = {
        ...mockFormattedFII,
        administrator: {
          ...mockFormattedFII.administrator,
          email: '',
        },
      };

      render(
        <FIIDetailView
          fii={fiiWithoutEmail}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });

  describe('P/VP Visual Indicators - Requirements 13.2, 13.3', () => {
    it('should display premium badge with correct styling', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const premiumStatus = screen.getByText('Premium');
      expect(premiumStatus).toBeInTheDocument();
      // Since intensity is 'low', it should have the low-intensity color
      expect(premiumStatus).toHaveClass('text-[#FF6B99]');
    });

    it('should display discount badge with correct styling', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFIIDiscount}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const discountStatus = screen.getByText('Discount');
      expect(discountStatus).toBeInTheDocument();
      expect(discountStatus).toHaveClass('text-[#00FF9F]');
    });

    it('should display neutral status without icon for neutral P/VP', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFIINeutral}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const neutralStatus = screen.getByText('At NAV');
      expect(neutralStatus).toBeInTheDocument();
    });

    it('should display premium icon for premium status', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const ariaLabel = 'Premium (trading above NAV)';
      expect(screen.getByLabelText(ariaLabel)).toBeInTheDocument();
    });

    it('should display discount icon for discount status', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFIIDiscount}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const ariaLabel = 'Discount (trading below NAV)';
      expect(screen.getByLabelText(ariaLabel)).toBeInTheDocument();
    });
  });

  describe('Refresh Button - Requirement 13.4', () => {
    it('should render refresh button when onRefresh is provided', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshBtn = screen.getByTestId('detail-view-refresh-btn');
      expect(refreshBtn).toBeInTheDocument();
    });

    it('should not render refresh button when onRefresh is not provided', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const refreshBtn = screen.queryByTestId('detail-view-refresh-btn');
      expect(refreshBtn).not.toBeInTheDocument();
    });

    it('should call onRefresh when refresh button is clicked', async () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
          onRefresh={mockOnRefresh}
        />
      );

      const refreshBtn = screen.getByTestId('detail-view-refresh-btn');
      await userEvent.click(refreshBtn);

      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
    });

    it('should disable refresh button when isRefreshing is true', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
          onRefresh={mockOnRefresh}
          isRefreshing={true}
        />
      );

      const refreshBtn = screen.getByTestId('detail-view-refresh-btn');
      expect(refreshBtn).toBeDisabled();
    });

    it('should add spinner class when isRefreshing is true', () => {
      const { container } = render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
          onRefresh={mockOnRefresh}
          isRefreshing={true}
        />
      );

      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Close Button and Backdrop - Requirement 13.1', () => {
    it('should render close button', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeBtn = screen.getByTestId('detail-view-close-btn');
      expect(closeBtn).toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const closeBtn = screen.getByTestId('detail-view-close-btn');
      await userEvent.click(closeBtn);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onClose when backdrop is clicked', async () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const backdrop = screen.getByTestId('detail-view-backdrop');
      await userEvent.click(backdrop);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('should render backdrop with initial opacity', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const backdrop = screen.getByTestId('detail-view-backdrop');
      expect(backdrop).toHaveClass('opacity-50');
    });
  });

  describe('Responsive Design - Requirement 13.5', () => {
    it('should render as modal on desktop (width > 1024px)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });
      const { container } = render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const detailContent = screen.getByTestId('detail-view-content');
      expect(detailContent).toHaveClass('rounded-lg');
      expect(detailContent).toHaveClass('max-w-2xl');
    });

    it('should render as drawer on mobile (width <= 1024px)', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
      const { container } = render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const detailContent = screen.getByTestId('detail-view-content');
      expect(detailContent).toHaveClass('rounded-t-xl');
      expect(detailContent).toHaveClass('bottom-0');
    });

    it('should switch from modal to drawer on window resize', async () => {
      Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true });

      const { rerender } = render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      let detailContent = screen.getByTestId('detail-view-content');
      expect(detailContent).toHaveClass('rounded-lg');

      // Simulate resize to mobile
      Object.defineProperty(window, 'innerWidth', { value: 768, configurable: true });
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        detailContent = screen.getByTestId('detail-view-content');
        expect(detailContent).toHaveClass('rounded-t-xl');
      });
    });

    it('should display content with appropriate max-height', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const detailContent = screen.getByTestId('detail-view-content');
      expect(detailContent).toHaveClass('max-h-[90vh]');
    });
  });

  describe('Section Organization', () => {
    it('should organize content into clear sections', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Price & Valuation')).toBeInTheDocument();
      expect(screen.getByText('Premium/Discount')).toBeInTheDocument();
      expect(screen.getByText('Dividend Yields')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Fund Information')).toBeInTheDocument();
      expect(screen.getByText('Administrator Details')).toBeInTheDocument();
    });
  });

  describe('Color and Styling', () => {
    it('should apply correct color for positive monthly return', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const monthlyReturn = screen.getByText('2.54%');
      expect(monthlyReturn).toHaveClass('text-green-400');
    });

    it('should apply correct color for negative monthly return', () => {
      const fiiWithNegativeReturn: FormattedFII = {
        ...mockFormattedFII,
        monthlyReturnFormatted: '-1.50%',
      };

      render(
        <FIIDetailView
          fii={fiiWithNegativeReturn}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const monthlyReturn = screen.getByText('-1.50%');
      expect(monthlyReturn).toHaveClass('text-red-400');
    });

    it('should apply cyan color for dividend yields', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const yield1M = screen.getByText('1.23%');
      const yield12M = screen.getByText('12.68%');

      expect(yield1M).toHaveClass('text-cyan-400');
      expect(yield12M).toHaveClass('text-cyan-400');
    });
  });

  describe('Animation and Transitions', () => {
    it('should apply fade and scale animations when opening', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const backdrop = screen.getByTestId('detail-view-backdrop');
      expect(backdrop).toHaveClass('opacity-50');
    });

    it('should have transition classes for smooth animations', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const detailContent = screen.getByTestId('detail-view-content');
      expect(detailContent).toHaveClass('transition-all');
    });
  });

  describe('Grid Layout for Metrics', () => {
    it('should display metrics in responsive grid', () => {
      const { container } = render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const grids = container.querySelectorAll('[class*="grid-cols"]');
      expect(grids.length).toBeGreaterThan(0);
    });

    it('should use 2-column layout on medium screens and above', () => {
      const { container } = render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const grids = container.querySelectorAll('[class*="md:grid-cols-2"]');
      expect(grids.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for interactive elements', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
          onRefresh={mockOnRefresh}
        />
      );

      expect(screen.getByLabelText('Refresh data')).toBeInTheDocument();
      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const heading = screen.getByText('MXRF11');
      expect(heading.tagName).toBe('H2');
    });

    it('should have semantic section elements', () => {
      const { container } = render(
        <FIIDetailView
          fii={mockFormattedFII}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const sections = container.querySelectorAll('section');
      expect(sections.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long FII names gracefully', () => {
      const fiiWithLongName: FormattedFII = {
        ...mockFormattedFII,
        administrator: {
          ...mockFormattedFII.administrator,
          name: 'A Very Long Name That Could Potentially Break The Layout And Cause Issues',
        },
      };

      render(
        <FIIDetailView
          fii={fiiWithLongName}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getAllByText(/A Very Long Name/).length).toBeGreaterThan(0);
    });

    it('should handle undefined administrator details gracefully', () => {
      const fiiWithoutAdmin: FormattedFII = {
        ...mockFormattedFII,
        administrator: {
          name: '',
          cnpj: '',
          email: '',
        },
      };

      render(
        <FIIDetailView
          fii={fiiWithoutAdmin}
          isOpen={true}
          onClose={mockOnClose}
        />
      );

      const naElements = screen.getAllByText('N/A');
      expect(naElements.length).toBeGreaterThan(0);
    });
  });
});
