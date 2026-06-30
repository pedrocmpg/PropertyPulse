/**
 * Frontend FII data types
 * Mirrors backend types.ts but for frontend use
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

export interface FormattedFII extends Omit<ParsedFII, 'price' | 'nav' | 'pvRatio' | 'dividendYield1Month' | 'dividendYield12Month' | 'monthlyReturn' | 'investorCount' | 'totalAssets'> {
  priceFormatted: string;
  navFormatted: string;
  pvRatioFormatted: {
    displayValue: string;
    status: 'premium' | 'discount' | 'neutral';
    intensity: 'high' | 'low';
    ariaLabel: string;
  };
  dividendYield1MonthFormatted: string;
  dividendYield12MonthFormatted: string;
  monthlyReturnFormatted: string;
  investorCountFormatted: string;
  totalAssetsFormatted: string;
}

export interface FIIData extends ParsedFII {}

export interface ErrorState {
  code: string;
  message: string;
  statusCode: number;
  timestamp: Date;
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
