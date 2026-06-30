/**
 * Frontend Type Definitions
 * Mirrors backend types for API communication and component props
 */

export interface ParsedFII {
  symbol: string;
  price: number;
  nav: number;
  pvRatio: number;
  dividendYield1Month: number;
  dividendYield12Month: number;
  monthlyReturn: number;
  investorCount: number;
  totalAssets: number;
  administrator: {
    name: string;
    cnpj: string;
    email: string;
  };
}

export interface PVRatioFormatted {
  displayValue: string;
  status: 'premium' | 'discount' | 'neutral';
  intensity: 'high' | 'low';
  ariaLabel: string;
}

export interface FormattedFII {
  symbol: string;
  priceFormatted: string;
  navFormatted: string;
  pvRatioFormatted: PVRatioFormatted;
  dividendYield1MonthFormatted: string;
  dividendYield12MonthFormatted: string;
  monthlyReturnFormatted: string;
  investorCountFormatted: string;
  totalAssetsFormatted: string;
  administrator: {
    name: string;
    cnpj: string;
    email: string;
  };
}

export interface FIIData {
  symbol: string;
  price: number;
  nav: number;
  pvRatio: number;
  dividendYield1Month: number;
  dividendYield12Month: number;
  monthlyReturn: number;
  investorCount: number;
  totalAssets: number;
  administrator: {
    name: string;
    cnpj: string;
    email: string;
  };
}

export interface ErrorState {
  code: string;
  message: string;
  statusCode: number;
  timestamp: Date;
  retryCount?: number;
  maxRetries?: number;
}

export interface APIResponse {
  success: boolean;
  data?: FIIData[];
  error?: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
  };
}

export interface DashboardState {
  selectedFIIs: string[];
  fiiData: Record<string, FIIData>;
  isLoading: boolean;
  error: ErrorState | null;
  isEmpty: boolean;
  searchQuery: string;
  filterResults: string[];
  userPreferences: {
    theme: 'dark' | 'light';
    refreshInterval: number;
    selectedMetrics: string[];
  };
}

/**
 * Data Formatters (Frontend implementation)
 */

export class CurrencyFormatter {
  static formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    if (isNaN(value)) {
      console.warn(`Invalid number passed to formatCurrency: ${value}`);
      return '—';
    }

    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    } catch (error) {
      console.error(`Error formatting currency: ${error}`);
      return '—';
    }
  }
}

export class PercentageFormatter {
  static formatPercentage(value: number | null | undefined): string {
    if (value === null || value === undefined) return '—';
    if (isNaN(value)) {
      console.warn(`Invalid number passed to formatPercentage: ${value}`);
      return '—';
    }

    try {
      const percentage = value * 100;
      return `${percentage.toFixed(2)}%`;
    } catch (error) {
      console.error(`Error formatting percentage: ${error}`);
      return '—';
    }
  }
}

export class RatioFormatter {
  static formatRatio(value: number | null | undefined): PVRatioFormatted {
    if (value === null || value === undefined) {
      return {
        displayValue: '—',
        status: 'neutral',
        intensity: 'high',
        ariaLabel: 'No data',
      };
    }

    if (isNaN(value)) {
      console.warn(`Invalid number passed to formatRatio: ${value}`);
      return {
        displayValue: '—',
        status: 'neutral',
        intensity: 'high',
        ariaLabel: 'Invalid data',
      };
    }

    try {
      const displayValue = value.toFixed(2);
      let status: 'premium' | 'discount' | 'neutral' = 'neutral';
      let intensity: 'high' | 'low' = 'high';
      let ariaLabel = 'At NAV';

      if (value > 1.0) {
        status = 'premium';
        intensity = value > 1.05 ? 'high' : 'low';
        ariaLabel = 'Premium (trading above NAV)';
      } else if (value < 1.0) {
        status = 'discount';
        intensity = value < 0.95 ? 'high' : 'low';
        ariaLabel = 'Discount (trading below NAV)';
      }

      return {
        displayValue,
        status,
        intensity,
        ariaLabel,
      };
    } catch (error) {
      console.error(`Error formatting ratio: ${error}`);
      return {
        displayValue: '—',
        status: 'neutral',
        intensity: 'high',
        ariaLabel: 'Error formatting',
      };
    }
  }
}

export class FIIPrettyPrinter {
  static prettyPrintFII(fii: ParsedFII): FormattedFII {
    return {
      symbol: fii.symbol,
      priceFormatted: CurrencyFormatter.formatCurrency(fii.price),
      navFormatted: CurrencyFormatter.formatCurrency(fii.nav),
      pvRatioFormatted: RatioFormatter.formatRatio(fii.pvRatio),
      dividendYield1MonthFormatted: PercentageFormatter.formatPercentage(fii.dividendYield1Month),
      dividendYield12MonthFormatted: PercentageFormatter.formatPercentage(fii.dividendYield12Month),
      monthlyReturnFormatted: PercentageFormatter.formatPercentage(fii.monthlyReturn),
      investorCountFormatted: new Intl.NumberFormat('pt-BR').format(
        Math.round(fii.investorCount)
      ),
      totalAssetsFormatted: CurrencyFormatter.formatCurrency(fii.totalAssets),
      administrator: fii.administrator,
    };
  }
}
