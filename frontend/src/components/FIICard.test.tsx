import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FIICard from './FIICard';
import { FormattedFII, PVRatioFormatted } from '@/types';

const mockFormattedFII: FormattedFII = {
  symbol: 'MXRF11',
  priceFormatted: 'R$ 9,74',
  navFormatted: 'R$ 9,37',
  pvRatioFormatted: {
    displayValue: '1.04',
    status: 'premium',
    intensity: 'low',
    ariaLabel: 'Premium (trading above NAV)',
  },
  dividendYield1MonthFormatted: '12.27%',
  dividendYield12MonthFormatted: '12.54%',
  monthlyReturnFormatted: '2.54%',
  investorCountFormatted: '45.678',
  totalAssetsFormatted: 'R$ 4.313.692.700,00',
  administrator: {
    name: 'XP Administração de Recursos Ltda',
    cnpj: '00.000.000/0001-00',
    email: 'contact@xp.com.br',
  },
};

const mockDiscountFII: FormattedFII = {
  ...mockFormattedFII,
  symbol: 'HGLG11',
  pvRatioFormatted: {
    displayValue: '0.99',
    status: 'discount',
    intensity: 'low',
    ariaLabel: 'Discount (trading below NAV)',
  },
};

const mockNeutralFII: FormattedFII = {
  ...mockFormattedFII,
  symbol: 'KNSC11',
  pvRatioFormatted: {
    displayValue: '1.00',
    status: 'neutral',
    intensity: 'high',
    ariaLabel: 'At NAV',
  },
};

describe('FIICard', () => {
  it('renders FII symbol', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('MXRF11')).toBeInTheDocument();
  });

  it('renders administrator name', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('XP Administração de Recursos Ltda')).toBeInTheDocument();
  });

  it('renders formatted price', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('R$ 9,74')).toBeInTheDocument();
  });

  it('renders formatted NAV', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('R$ 9,37')).toBeInTheDocument();
  });

  it('renders P/VP ratio', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('1.04')).toBeInTheDocument();
  });

  it('renders dividend yields', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('12.27%')).toBeInTheDocument();
    expect(screen.getByText('12.54%')).toBeInTheDocument();
  });

  it('renders monthly return', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('2.54%')).toBeInTheDocument();
  });

  it('renders investor count', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('45.678')).toBeInTheDocument();
  });

  it('renders total assets', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('R$ 4.313.692.700,00')).toBeInTheDocument();
  });

  it('applies premium styling for P/VP > 1.0', () => {
    render(<FIICard fii={mockFormattedFII} />);

    // Check that the P/VP ratio is rendered with premium value
    const pvRatioText = screen.getByText('1.04');
    expect(pvRatioText).toBeInTheDocument();
    
    // Verify the badge icon is present (premium badge)
    const premiumBadge = screen.getByLabelText('Premium (trading above NAV)');
    expect(premiumBadge).toBeInTheDocument();
  });

  it('applies discount styling for P/VP < 1.0', () => {
    render(<FIICard fii={mockDiscountFII} />);

    // Check that the P/VP ratio is rendered with discount value
    const pvRatioText = screen.getByText('0.99');
    expect(pvRatioText).toBeInTheDocument();
    
    // Verify the badge icon is present (discount badge)
    const discountBadge = screen.getByLabelText('Discount (trading below NAV)');
    expect(discountBadge).toBeInTheDocument();
  });

  it('applies neutral styling for P/VP = 1.0', () => {
    render(<FIICard fii={mockNeutralFII} />);

    // For neutral status, no badge icon should be present
    const neutralValue = screen.getByText('1.00');
    expect(neutralValue).toBeInTheDocument();
    
    // No badge should be rendered for neutral status
    expect(screen.queryByLabelText(/At NAV/)).not.toBeInTheDocument();
  });

  it('displays premium badge icon for premium status', () => {
    const { container } = render(<FIICard fii={mockFormattedFII} />);

    const badgeIcon = container.querySelector('svg[aria-label="Premium (trading above NAV)"]');
    expect(badgeIcon).toBeInTheDocument();
  });

  it('displays discount badge icon for discount status', () => {
    const { container } = render(<FIICard fii={mockDiscountFII} />);

    const badgeIcon = container.querySelector('svg[aria-label="Discount (trading below NAV)"]');
    expect(badgeIcon).toBeInTheDocument();
  });

  it('does not display badge icon for neutral status', () => {
    const { container } = render(<FIICard fii={mockNeutralFII} />);

    const badgeIcon = container.querySelector('[aria-label*="NAV"]');
    expect(badgeIcon).not.toBeInTheDocument();
  });

  it('calls onDetailClick when card is clicked', () => {
    const onDetailClick = vi.fn();
    render(<FIICard fii={mockFormattedFII} onDetailClick={onDetailClick} />);

    const card = screen.getByText('Click to view full details').closest('div');
    fireEvent.click(card!);

    expect(onDetailClick).toHaveBeenCalled();
  });

  it('renders click hint text', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('Click to view full details')).toBeInTheDocument();
  });

  it('has fade-in animation class', () => {
    const { container } = render(<FIICard fii={mockFormattedFII} />);

    const cardElement = container.querySelector('.fii-card');
    expect(cardElement).toHaveClass('fii-card');
  });

  it('has hover transition effects', () => {
    const { container } = render(<FIICard fii={mockFormattedFII} />);

    const cardElement = container.querySelector('.fii-card');
    expect(cardElement).toHaveClass('hover:bg-gray-750', 'hover:shadow-lg', 'hover:-translate-y-1');
  });

  it('displays all metric labels', () => {
    render(<FIICard fii={mockFormattedFII} />);

    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('NAV')).toBeInTheDocument();
    expect(screen.getByText('P/VP Ratio')).toBeInTheDocument();
    expect(screen.getByText('1M Yield')).toBeInTheDocument();
    expect(screen.getByText('12M Yield')).toBeInTheDocument();
    expect(screen.getByText('Monthly Return')).toBeInTheDocument();
    expect(screen.getByText('Investors')).toBeInTheDocument();
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
  });

  it('applies positive return color to positive monthly return', () => {
    const { container } = render(<FIICard fii={mockFormattedFII} />);

    const returnElement = container.querySelector('.text-green-400');
    expect(returnElement).toBeInTheDocument();
  });

  it('applies negative return color to negative monthly return', () => {
    const negativeFII = {
      ...mockFormattedFII,
      monthlyReturnFormatted: '-1.50%',
    };

    const { container } = render(<FIICard fii={negativeFII} />);

    const returnElement = container.querySelector('.text-red-400');
    expect(returnElement).toBeInTheDocument();
  });

  it('renders with dark mode background', () => {
    const { container } = render(<FIICard fii={mockFormattedFII} />);

    const cardElement = container.querySelector('.fii-card');
    expect(cardElement).toHaveClass('bg-gray-800');
  });

  it('renders border separator between header and content', () => {
    const { container } = render(<FIICard fii={mockFormattedFII} />);

    const borders = container.querySelectorAll('.border-b');
    expect(borders.length).toBeGreaterThan(0);
  });

  it('handles high intensity premium styling', () => {
    const highIntensityFII: FormattedFII = {
      ...mockFormattedFII,
      pvRatioFormatted: {
        displayValue: '1.10',
        status: 'premium',
        intensity: 'high',
        ariaLabel: 'Premium (trading above NAV)',
      },
    };

    const { container } = render(<FIICard fii={highIntensityFII} />);

    const pvContainer = container.querySelector('.text-\\[\\#FF006B\\]');
    expect(pvContainer).toBeInTheDocument();
  });

  it('handles high intensity discount styling', () => {
    const highIntensityFII: FormattedFII = {
      ...mockDiscountFII,
      pvRatioFormatted: {
        displayValue: '0.90',
        status: 'discount',
        intensity: 'high',
        ariaLabel: 'Discount (trading below NAV)',
      },
    };

    const { container } = render(<FIICard fii={highIntensityFII} />);

    const pvContainer = container.querySelector('.text-\\[\\#00FF9F\\]');
    expect(pvContainer).toBeInTheDocument();
  });
});
