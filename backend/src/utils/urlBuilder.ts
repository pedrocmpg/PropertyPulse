/**
 * URL Builder utility for constructing brAPI v2 request URLs
 * Handles symbol list formatting and URL parameter encoding
 */

/**
 * Constructs a valid brAPI v2 FII indicators URL with symbol parameters
 *
 * Format: GET https://brapi.dev/api/v2/fii/indicators?symbols=SYMBOL1,SYMBOL2,...
 *
 * Rules:
 * - Symbols must be comma-separated without spaces
 * - Duplicate symbols must be removed before URL construction
 * - Each symbol must be a valid FII ticker (non-empty string)
 * - Base URL should not have trailing slash
 *
 * @param baseUrl - Base URL for brAPI (e.g., "https://brapi.dev/api/v2")
 * @param symbols - Array of FII symbols (e.g., ["MXRF11", "HGLG11"])
 * @returns Complete URL with query parameters, or null if invalid input
 *
 * Examples:
 * - buildBrapiUrl("https://brapi.dev/api/v2", ["MXRF11"]) 
 *   → "https://brapi.dev/api/v2/fii/indicators?symbols=MXRF11"
 * - buildBrapiUrl("https://brapi.dev/api/v2", ["MXRF11", "HGLG11"])
 *   → "https://brapi.dev/api/v2/fii/indicators?symbols=MXRF11,HGLG11"
 * - buildBrapiUrl("https://brapi.dev/api/v2", ["MXRF11", "MXRF11"]) // duplicates
 *   → "https://brapi.dev/api/v2/fii/indicators?symbols=MXRF11"
 * - buildBrapiUrl("https://brapi.dev/api/v2", []) // empty
 *   → null
 * - buildBrapiUrl("https://brapi.dev/api/v2", ["", "MXRF11"]) // invalid symbol
 *   → "https://brapi.dev/api/v2/fii/indicators?symbols=MXRF11" (skips empty)
 */
export function buildBrapiUrl(baseUrl: string, symbols: string[]): string | null {
  // Validate baseUrl
  if (!baseUrl || typeof baseUrl !== 'string') {
    return null;
  }

  // Validate symbols array
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return null;
  }

  // Filter out empty/invalid symbols and remove duplicates
  // Using Set to eliminate duplicates while preserving order behavior
  const validSymbols = Array.from(new Set(
    symbols
      .filter((symbol): symbol is string => {
        // Filter: must be a string, non-empty, and reasonable length (2-7 chars for FII tickers)
        return typeof symbol === 'string' && symbol.trim().length > 0 && symbol.trim().length <= 10;
      })
      .map(symbol => symbol.trim().toUpperCase()) // Normalize to uppercase
  ));

  // If no valid symbols after filtering, return null
  if (validSymbols.length === 0) {
    return null;
  }

  // Construct URL
  // Remove trailing slash from baseUrl if present
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Join symbols with comma (no spaces)
  const symbolsParam = validSymbols.join(',');

  // Construct final URL
  const url = `${cleanBaseUrl}/fii/indicators?symbols=${symbolsParam}`;

  return url;
}

/**
 * Extracts symbols from a brAPI URL query string
 * Used for URL validation and testing
 *
 * @param url - Full brAPI URL with symbols parameter
 * @returns Array of symbols extracted from URL, or empty array if invalid
 */
export function extractSymbolsFromUrl(url: string): string[] {
  if (!url || typeof url !== 'string') {
    return [];
  }

  try {
    const urlObj = new URL(url);
    const symbolsParam = urlObj.searchParams.get('symbols');
    
    if (!symbolsParam) {
      return [];
    }

    // Split by comma and filter out empty values
    return symbolsParam
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => s.length > 0);
  } catch (error) {
    return [];
  }
}

/**
 * Validates if a URL is a valid brAPI v2 FII indicators URL
 *
 * @param url - URL to validate
 * @returns true if URL matches brAPI v2 FII format, false otherwise
 */
export function isValidBrapiUrl(url: string): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const urlObj = new URL(url);
    
    // Check if URL contains /fii/indicators endpoint
    const hasCorrectPath = urlObj.pathname.includes('/fii/indicators');
    
    // Check if symbols parameter exists
    const hasSymbolsParam = urlObj.searchParams.has('symbols');
    
    // Check if symbols parameter is not empty
    const symbolsParam = urlObj.searchParams.get('symbols');
    const hasValidSymbols = symbolsParam !== null && symbolsParam.trim().length > 0;

    return hasCorrectPath && hasSymbolsParam && hasValidSymbols;
  } catch (error) {
    return false;
  }
}
