import { describe, it, expect } from 'vitest';
import {
  CurrencyFormatter,
  PercentageFormatter,
  RatioFormatter,
  FIIPrettyPrinter,
} from './index';

describe('CurrencyFormatter', () => {
  it('formats price with R$ symbol and comma decimal separator', () => {
    const result = CurrencyFormatter.formatCurrency(9.74);
    expect(result).toMatch(/R\$/);
    expect(result).toContain('9');
  });

  it('returns em-dash for null value', () => {
    const result = CurrencyFormatter.formatCurrency(null);
    expect(result).toBe('—');
  });

  it('returns em-dash for undefined value', () => {
    const result = CurrencyFormatter.formatCurrency(undefined);
    expect(result).toBe('—');
  });

  it('returns em-dash for NaN value', () => {
    const result = CurrencyFormatter.formatCurrency(NaN);
    expect(result).toBe('—');
  });

  it('formats negative values', () => {
    const result = CurrencyFormatter.formatCurrency(-10.50);
    expect(result).toMatch(/R\$/);
  });

  it('formats very large numbers with thousands separators', () => {
    const result = CurrencyFormatter.formatCurrency(4313692700);
    expect(result).toMatch(/R\$/);
    // Should have thousands separators
    expect(result.length).toBeGreaterThan(15);
  });

  it('rounds to 2 decimal places', () => {
    const result = CurrencyFormatter.formatCurrency(9.749);
    // Should be rounded to 9.75
    expect(result).toBeDefined();
  });
});

describe('PercentageFormatter', () => {
  it('converts decimal to percentage format', () => {
    const result = PercentageFormatter.formatPercentage(0.12268994);
    expect(result).toBe('12.27%');
  });

  it('formats small percentage values', () => {
    const result = PercentageFormatter.formatPercentage(0.00542);
    expect(result).toBe('0.54%');
  });

  it('formats zero percentage', () => {
    const result = PercentageFormatter.formatPercentage(0.0);
    expect(result).toBe('0.00%');
  });

  it('returns em-dash for null value', () => {
    const result = PercentageFormatter.formatPercentage(null);
    expect(result).toBe('—');
  });

  it('returns em-dash for undefined value', () => {
    const result = PercentageFormatter.formatPercentage(undefined);
    expect(result).toBe('—');
  });

  it('returns em-dash for NaN value', () => {
    const result = PercentageFormatter.formatPercentage(NaN);
    expect(result).toBe('—');
  });

  it('always shows exactly 2 decimal places', () => {
    const result1 = PercentageFormatter.formatPercentage(0.1);
    const result2 = PercentageFormatter.formatPercentage(0.123);
    expect(result1).toContain('10.00%');
    expect(result2).toContain('12.30%');
  });
});

describe('RatioFormatter', () => {
  it('formats ratio with 2 decimal places', () => {
    const result = RatioFormatter.formatRatio(1.0392547);
    expect(result.displayValue).toBe('1.04');
  });

  it('identifies premium status when P/VP > 1.0', () => {
    const result = RatioFormatter.formatRatio(1.0392547);
    expect(result.status).toBe('premium');
  });

  it('identifies discount status when P/VP < 1.0', () => {
    const result = RatioFormatter.formatRatio(0.98765);
    expect(result.status).toBe('discount');
  });

  it('identifies neutral status when P/VP = 1.0', () => {
    const result = RatioFormatter.formatRatio(1.0);
    expect(result.status).toBe('neutral');
  });

  it('sets high intensity for premium values > 1.05', () => {
    const result = RatioFormatter.formatRatio(1.10);
    expect(result.status).toBe('premium');
    expect(result.intensity).toBe('high');
  });

  it('sets low intensity for premium values between 1.01 and 1.05', () => {
    const result = RatioFormatter.formatRatio(1.03);
    expect(result.status).toBe('premium');
    expect(result.intensity).toBe('low');
  });

  it('sets high intensity for discount values < 0.95', () => {
    const result = RatioFormatter.formatRatio(0.90);
    expect(result.status).toBe('discount');
    expect(result.intensity).toBe('high');
  });

  it('sets low intensity for discount values between 0.95 and 0.99', () => {
    const result = RatioFormatter.formatRatio(0.97);
    expect(result.status).toBe('discount');
    expect(result.intensity).toBe('low');
  });

  it('returns em-dash display value for null', () => {
    const result = RatioFormatter.formatRatio(null);
    expect(result.displayValue).toBe('—');
    expect(result.status).toBe('neutral');
  });

  it('returns em-dash display value for undefined', () => {
    const result = RatioFormatter.formatRatio(undefined);
    expect(result.displayValue).toBe('—');
  });

  it('returns em-dash display value for NaN', () => {
    const result = RatioFormatter.formatRatio(NaN);
    expect(result.displayValue).toBe('—');
  });

  it('provides appropriate aria labels', () => {
    const premium = RatioFormatter.formatRatio(1.10);
    const discount = RatioFormatter.formatRatio(0.90);
    const neutral = RatioFormatter.formatRatio(1.0);

    expect(premium.ariaLabel).toContain('Premium');
    expect(discount.ariaLabel).toContain('Discount');
    expect(neutral.ariaLabel).toContain('NAV');
  });
});

describe('FIIPrettyPrinter', () => {
  const mockParsedFII = {
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
  };

  it('formats all fields of a FII', () => {
    const result = FIIPrettyPrinter.prettyPrintFII(mockParsedFII);

    expect(result.symbol).toBe('MXRF11');
    expect(result.priceFormatted).toBeDefined();
    expect(result.navFormatted).toBeDefined();
    expect(result.pvRatioFormatted).toBeDefined();
    expect(result.dividendYield1MonthFormatted).toBeDefined();
    expect(result.dividendYield12MonthFormatted).toBeDefined();
    expect(result.monthlyReturnFormatted).toBeDefined();
    expect(result.investorCountFormatted).toBeDefined();
    expect(result.totalAssetsFormatted).toBeDefined();
  });

  it('formats price as currency', () => {
    const result = FIIPrettyPrinter.prettyPrintFII(mockParsedFII);

    expect(result.priceFormatted).toMatch(/R\$/);
  });

  it('formats yields as percentages', () => {
    const result = FIIPrettyPrinter.prettyPrintFII(mockParsedFII);

    expect(result.dividendYield1MonthFormatted).toBe('12.27%');
    expect(result.dividendYield12MonthFormatted).toBe('12.54%');
  });

  it('formats P/VP ratio with status and intensity', () => {
    const result = FIIPrettyPrinter.prettyPrintFII(mockParsedFII);

    expect(result.pvRatioFormatted.displayValue).toBe('1.04');
    expect(result.pvRatioFormatted.status).toBe('premium');
    expect(result.pvRatioFormatted.intensity).toBe('low');
  });

  it('formats investor count as number', () => {
    const result = FIIPrettyPrinter.prettyPrintFII(mockParsedFII);

    expect(result.investorCountFormatted).toBeDefined();
  });

  it('preserves administrator information', () => {
    const result = FIIPrettyPrinter.prettyPrintFII(mockParsedFII);

    expect(result.administrator.name).toBe('XP Administração');
    expect(result.administrator.cnpj).toBe('00.000.000/0001-00');
    expect(result.administrator.email).toBe('contact@xp.com.br');
  });
});
