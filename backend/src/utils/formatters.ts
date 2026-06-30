/**
 * Data formatters for FII Dashboard
 * Formats numeric values according to Brazilian market conventions
 */

/**
 * Formats a numeric value as Brazilian Real currency
 * Uses native Intl.NumberFormat for pt-BR locale to ensure consistency
 * with browser locale settings and follow ECMA-402 international standard
 *
 * Format examples:
 * - formatCurrency(9.74) → "R$ 9,74"
 * - formatCurrency(150.5) → "R$ 150,50"
 * - formatCurrency(4313692700) → "R$ 4.313.692.700,00"
 * - formatCurrency(-10.50) → "-R$ 10,50" (negative sign after currency)
 * - formatCurrency(null) → "—"
 * - formatCurrency(undefined) → "—"
 * - formatCurrency(NaN) → "—"
 *
 * @param value - The numeric value to format, or null/undefined
 * @returns Formatted currency string with R$ symbol, comma as decimal separator,
 *          period as thousands separator, or "—" placeholder for invalid inputs
 */
export function formatCurrency(value: number | null | undefined): string {
  // Handle null, undefined cases
  if (value === null || value === undefined) {
    return '—';
  }

  // Handle NaN
  if (isNaN(value)) {
    console.warn(`Invalid number passed to formatCurrency: ${value}`);
    return '—';
  }

  try {
    // Use native Intl.NumberFormat for pt-BR locale
    // This ensures:
    // 1. Compliance with ECMA-402 international standard
    // 2. V8 engine optimization and performance
    // 3. Automatic handling of negative values per international convention
    // 4. Browser locale consistency
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(value);
    // Output format: "R$ 9,74" for 9.74
    // Negative format: "-R$ 10,50" for -10.50 (per Intl standard)
  } catch (error) {
    console.error(`Error formatting currency: ${error}`);
    return '—';
  }
}

/**
 * Formats a decimal value as a percentage with 2 decimal places
 *
 * Format examples:
 * - formatPercentage(0.12268994) → "12.27%"
 * - formatPercentage(0.00542) → "0.54%"
 * - formatPercentage(0.0) → "0.00%"
 * - formatPercentage(null) → "—"
 * - formatPercentage(undefined) → "—"
 * - formatPercentage(NaN) → "—"
 *
 * @param value - The decimal value to format (e.g., 0.1227 for 12.27%), or null/undefined
 * @returns Formatted percentage string with exactly 2 decimal places and % symbol,
 *          or "—" placeholder for invalid inputs
 */
export function formatPercentage(value: number | null | undefined): string {
  // Handle null, undefined cases
  if (value === null || value === undefined) {
    return '—';
  }

  // Handle NaN
  if (isNaN(value)) {
    console.warn(`Invalid number passed to formatPercentage: ${value}`);
    return '—';
  }

  try {
    // Use native Intl.NumberFormat with percent style for pt-BR
    // This ensures proper rounding and formatting per Brazilian conventions
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return formatter.format(value);
    // Output format: "12,27%" for 0.12268994
  } catch (error) {
    console.error(`Error formatting percentage: ${error}`);
    return '—';
  }
}

/**
 * Formats a P/VP ratio value with visual indicator information
 *
 * Format examples:
 * - formatRatio(1.0392547) → { displayValue: "1.04", status: "premium", intensity: "low", ... }
 * - formatRatio(0.98765) → { displayValue: "0.99", status: "discount", intensity: "low", ... }
 * - formatRatio(1.0) → { displayValue: "1.00", status: "neutral", intensity: "high", ... }
 * - formatRatio(null) → { displayValue: "—", status: "neutral", ... }
 *
 * @param value - The P/VP ratio value (typically 0.8-1.2), or null/undefined
 * @returns Object with formatted displayValue (2 decimal places), status (premium/discount/neutral),
 *          intensity (high/low based on magnitude), and ariaLabel for accessibility
 */
export function formatRatio(value: number | null | undefined): {
  displayValue: string;
  status: 'premium' | 'discount' | 'neutral';
  intensity: 'high' | 'low';
  ariaLabel: string;
} {
  // Handle null, undefined cases
  if (value === null || value === undefined) {
    return {
      displayValue: '—',
      status: 'neutral',
      intensity: 'high',
      ariaLabel: 'Value not available',
    };
  }

  // Handle NaN
  if (isNaN(value)) {
    console.warn(`Invalid number passed to formatRatio: ${value}`);
    return {
      displayValue: '—',
      status: 'neutral',
      intensity: 'high',
      ariaLabel: 'Invalid value',
    };
  }

  try {
    // Format to 2 decimal places using native Intl.NumberFormat
    // with decimal format (not percentage or currency)
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const displayValue = formatter.format(value);

    // Determine status based on P/VP value
    let status: 'premium' | 'discount' | 'neutral';
    if (value > 1.0) {
      status = 'premium';
    } else if (value < 1.0) {
      status = 'discount';
    } else {
      status = 'neutral';
    }

    // Determine intensity based on magnitude
    // High intensity outside [0.95, 1.05], low intensity inside
    const intensity =
      (value > 1.05 || value < 0.95) ? 'high' : 'low';

    // Create appropriate aria label
    let ariaLabel = `Ratio: ${displayValue}`;
    if (status === 'premium') {
      ariaLabel = `Premium (trading above NAV): ${displayValue}`;
    } else if (status === 'discount') {
      ariaLabel = `Discount (trading below NAV): ${displayValue}`;
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
      ariaLabel: 'Error formatting ratio',
    };
  }
}
