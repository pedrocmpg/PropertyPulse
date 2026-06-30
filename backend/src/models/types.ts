/**
 * Shared TypeScript interfaces for FII Dashboard
 * Defines the data models used across backend and frontend
 */

/**
 * Parsed FII data directly from brAPI response
 * All numeric fields are actual numbers, not strings
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

/**
 * Pretty-printed FII data with formatted strings for display
 * Used in API responses and frontend rendering
 */
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

/**
 * FII data returned from backend API
 * Can be parsed or formatted depending on endpoint
 */
export interface FIIData extends ParsedFII {}

/**
 * Cache entry for storing FII data with metadata
 */
export interface CacheEntry<T> {
  symbol: string;
  value: T;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
}

/**
 * Circuit breaker state for managing rate limiting
 */
export interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastFailureTime: Date | null;
  failureCount: number;
  successCount: number;
  openDurationMs: number;
  transitionTime: Date | null;
}

/**
 * Error response structure
 */
export interface ErrorState {
  code: string;
  message: string;
  statusCode: number;
  timestamp: Date;
}

/**
 * Parse error from FII parser
 */
export interface ParseError {
  field: string;
  record: any;
  reason: string;
}

/**
 * Backend API response structure
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T[];
  error?: ErrorState;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  ttlSeconds: number;
  maxEntriesPerSymbol: number;
  maxTotalEntries: number;
  evictionStrategy: 'LRU';
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  openDurationMs: number;
  halfOpenTestRequests: number;
}

/**
 * Backend environment configuration
 */
export interface BackendConfig {
  BRAPI_TOKEN: string;
  BRAPI_BASE_URL: string;
  BACKEND_PORT: number;
  NODE_ENV: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warning' | 'error';
  CACHE_TTL_SECONDS: number;
  REQUEST_TIMEOUT_MS: number;
  MAX_RETRIES: number;
}

/**
 * Frontend environment configuration
 */
export interface FrontendConfig {
  REACT_APP_BACKEND_URL: string;
  REACT_APP_REFRESH_INTERVAL: number;
}

/**
 * Frontend state for dashboard
 */
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
 * FII Pretty Printer for formatting parsed FII data for display
 * Converts ParsedFII to FormattedFII using appropriate formatters for each field
 */
export class FIIPrettyPrinter {
  /**
   * Format parsed FII data for display using formatters
   * Applies CurrencyFormatter for price, nav, totalAssets
   * Applies PercentageFormatter for yields and monthly return
   * Applies RatioFormatter for pvRatio
   * Applies Intl.NumberFormat for investorCount with pt-BR locale
   *
   * @param fii - Parsed FII data from brAPI
   * @returns FormattedFII with all fields formatted for display
   */
  static prettyPrintFII(fii: ParsedFII): FormattedFII {
    // Import formatters here to avoid circular dependencies
    const { formatCurrency, formatPercentage, formatRatio } = require('../utils/formatters');

    return {
      symbol: fii.symbol,
      priceFormatted: formatCurrency(fii.price),
      navFormatted: formatCurrency(fii.nav),
      pvRatioFormatted: formatRatio(fii.pvRatio),
      dividendYield1MonthFormatted: formatPercentage(fii.dividendYield1Month),
      dividendYield12MonthFormatted: formatPercentage(fii.dividendYield12Month),
      monthlyReturnFormatted: formatPercentage(fii.monthlyReturn),
      investorCountFormatted: new Intl.NumberFormat('pt-BR', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        useGrouping: true,
      }).format(fii.investorCount),
      totalAssetsFormatted: formatCurrency(fii.totalAssets),
      administrator: fii.administrator,
    };
  }
}

/**
 * FII Parser for parsing brAPI v2 FII indicator JSON responses
 * Validates data integrity and extracts valid FII records
 */
export class FIIParser {
  /**
   * Parse brAPI JSON response and extract FII records
   * Validates NAV to prevent division by zero in P/VP calculation
   * Validates all numeric fields are actual numbers, not strings
   * Skips invalid records and logs warnings
   *
   * @param jsonResponse - Raw brAPI v2 FII indicator response
   * @returns Object with parsed FII records and any parse errors
   */
  static parsebrAPIResponse(jsonResponse: any): {
    fiis: ParsedFII[];
    errors?: ParseError[];
  } {
    const fiis: ParsedFII[] = [];
    const errors: ParseError[] = [];

    // Validate input is an object
    if (!jsonResponse || typeof jsonResponse !== 'object') {
      errors.push({
        field: 'root',
        record: jsonResponse,
        reason: 'Response must be a valid JSON object',
      });
      return { fiis, errors };
    }

    // Try to extract the data array from the response
    let dataArray = jsonResponse;

    // Handle both wrapped responses { data: [...] } and direct arrays [...]
    if (Array.isArray(jsonResponse)) {
      dataArray = jsonResponse;
    } else if (jsonResponse.data && Array.isArray(jsonResponse.data)) {
      dataArray = jsonResponse.data;
    } else if (jsonResponse.result && Array.isArray(jsonResponse.result)) {
      dataArray = jsonResponse.result;
    } else if (jsonResponse.indicators && Array.isArray(jsonResponse.indicators)) {
      dataArray = jsonResponse.indicators;
    } else if (!Array.isArray(dataArray)) {
      errors.push({
        field: 'data',
        record: jsonResponse,
        reason: 'Response must contain a data array or be an array',
      });
      return { fiis, errors };
    }

    // Process each FII record
    for (let i = 0; i < dataArray.length; i++) {
      const record = dataArray[i];

      // Validate record is an object
      if (!record || typeof record !== 'object') {
        errors.push({
          field: `data[${i}]`,
          record,
          reason: 'FII record must be an object',
        });
        continue;
      }

      // Extract and validate symbol (required, string)
      if (!record.symbol || typeof record.symbol !== 'string') {
        errors.push({
          field: `data[${i}].symbol`,
          record,
          reason: 'Symbol is required and must be a string',
        });
        continue;
      }
      const symbol = record.symbol;

      // Extract and validate numeric fields
      const price = this.validateNumericField(record, 'price', i);
      if (price === null) {
        errors.push({
          field: `data[${i}].price`,
          record: record.price,
          reason: 'Price is required and must be a number, not a string',
        });
        continue;
      }

      const nav = this.validateNumericField(record, 'nav', i);
      if (nav === null) {
        errors.push({
          field: `data[${i}].nav`,
          record: record.nav,
          reason: 'NAV is required and must be a number, not a string',
        });
        continue;
      }

      // Critical validation: NAV must not be null, undefined, or 0 to prevent division by zero
      if (!this.isValidNav(nav)) {
        console.warn(
          `[FIIParser] Skipping FII ${symbol}: NAV is ${nav}, must be a non-zero positive number`,
        );
        errors.push({
          field: `data[${i}].nav`,
          record: record.nav,
          reason: `NAV must be a non-zero positive number for P/VP calculation, got ${nav}`,
        });
        continue;
      }

      // Calculate P/VP ratio (price / NAV) - now safe from division by zero
      const pvRatio = price / nav;

      const dividendYield1Month = this.validateNumericField(record, 'dividendYield1Month', i);
      if (dividendYield1Month === null) {
        errors.push({
          field: `data[${i}].dividendYield1Month`,
          record: record.dividendYield1Month,
          reason: 'dividendYield1Month is required and must be a number, not a string',
        });
        continue;
      }

      const dividendYield12Month = this.validateNumericField(
        record,
        'dividendYield12Month',
        i,
      );
      if (dividendYield12Month === null) {
        errors.push({
          field: `data[${i}].dividendYield12Month`,
          record: record.dividendYield12Month,
          reason: 'dividendYield12Month is required and must be a number, not a string',
        });
        continue;
      }

      const monthlyReturn = this.validateNumericField(record, 'monthlyReturn', i);
      if (monthlyReturn === null) {
        errors.push({
          field: `data[${i}].monthlyReturn`,
          record: record.monthlyReturn,
          reason: 'monthlyReturn is required and must be a number, not a string',
        });
        continue;
      }

      const investorCount = this.validateNumericField(record, 'investorCount', i);
      if (investorCount === null) {
        errors.push({
          field: `data[${i}].investorCount`,
          record: record.investorCount,
          reason: 'investorCount is required and must be a number, not a string',
        });
        continue;
      }

      const totalAssets = this.validateNumericField(record, 'totalAssets', i);
      if (totalAssets === null) {
        errors.push({
          field: `data[${i}].totalAssets`,
          record: record.totalAssets,
          reason: 'totalAssets is required and must be a number, not a string',
        });
        continue;
      }

      // Extract and validate administrator (required, object with name/cnpj/email)
      if (!record.administrator || typeof record.administrator !== 'object') {
        errors.push({
          field: `data[${i}].administrator`,
          record: record.administrator,
          reason: 'Administrator must be an object with name, cnpj, and email',
        });
        continue;
      }

      const administrator = record.administrator;
      if (
        !administrator.name ||
        typeof administrator.name !== 'string' ||
        !administrator.cnpj ||
        typeof administrator.cnpj !== 'string' ||
        !administrator.email ||
        typeof administrator.email !== 'string'
      ) {
        errors.push({
          field: `data[${i}].administrator`,
          record: administrator,
          reason: 'Administrator must have name, cnpj, and email as strings',
        });
        continue;
      }

      // All validations passed, add to results
      const parsedFII: ParsedFII = {
        symbol,
        price,
        nav,
        pvRatio,
        dividendYield1Month,
        dividendYield12Month,
        monthlyReturn,
        investorCount,
        totalAssets,
        administrator: {
          name: administrator.name,
          cnpj: administrator.cnpj,
          email: administrator.email,
        },
      };

      fiis.push(parsedFII);
    }

    // Return both parsed FIIs and any errors encountered
    return errors.length > 0 ? { fiis, errors } : { fiis };
  }

  /**
   * Validate that a field is a numeric value (not a string)
   * Returns the numeric value if valid, null if invalid
   *
   * @private
   * @param record - The FII record object
   * @param fieldName - Name of the field to validate
   * @param _recordIndex - Index of the record in the data array (for error reporting)
   * @returns The numeric value if valid, null if invalid
   */
  private static validateNumericField(
    record: any,
    fieldName: string,
    _recordIndex: number,
  ): number | null {
    const value = record[fieldName];

    // Check if field is missing
    if (value === null || value === undefined) {
      return null;
    }

    // Check if field is a string (type mismatch - reject)
    if (typeof value === 'string') {
      return null;
    }

    // Check if field is not a number
    if (typeof value !== 'number' || isNaN(value)) {
      return null;
    }

    return value;
  }

  /**
   * Validate that NAV is suitable for P/VP calculation
   * NAV must be a positive non-zero number to prevent division by zero
   *
   * @private
   * @param nav - Net Asset Value to validate
   * @returns true if NAV is valid (positive non-zero number), false otherwise
   */
  private static isValidNav(nav: number | null | undefined): nav is number {
    return typeof nav === 'number' && !isNaN(nav) && nav !== 0 && nav > 0;
  }
}
