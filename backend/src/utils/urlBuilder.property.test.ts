/**
 * Property-based tests for brAPI URL construction
 * Tests Property 6: brAPI URL Construction
 */

import * as fc from 'fast-check';
import {
  buildBrapiUrl,
  extractSymbolsFromUrl,
  isValidBrapiUrl,
} from './urlBuilder';

describe('brAPI URL Builder - Property Tests', () => {
  const baseUrl = 'https://brapi.dev/api/v2';

  /**
   * **Property 6: brAPI URL Construction**
   * **Validates: Requirement 2.2**
   *
   * For any list of valid FII symbols (single or multiple), the backend SHALL
   * construct a valid brAPI v2 URL in the format:
   * GET https://brapi.dev/api/v2/fii/indicators?symbols=SYMBOL1,SYMBOL2,...
   * with properly formatted symbol parameters:
   * - URL format is correct (contains /fii/indicators endpoint)
   * - Symbols are comma-separated
   * - No duplicate symbols in URL
   * - No spaces in symbol list
   *
   * Minimum 100 iterations using fast-check
   */
  describe('Property 6: brAPI URL Construction', () => {
    it('Property 6.1: For single valid FII symbol, URL contains /fii/indicators and symbols parameter', () => {
      /**
       * Generate a single valid FII symbol and verify URL format
       */
      const property = fc.property(
        fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/), // FII symbol pattern: 4 letters + 2 digits
        (symbol: string) => {
          const url = buildBrapiUrl(baseUrl, [symbol]);

          // URL should not be null for valid symbol
          expect(url).not.toBeNull();

          if (url) {
            // URL should contain correct endpoint
            expect(url).toContain('/fii/indicators');

            // URL should contain symbols parameter with the symbol
            expect(url).toContain('symbols=');
            expect(url).toContain(symbol);

            // URL should be valid
            expect(isValidBrapiUrl(url)).toBe(true);
          }

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.2: For multiple valid FII symbols, URL contains all symbols comma-separated without spaces', () => {
      /**
       * Generate multiple valid FII symbols and verify comma-separation
       */
      const property = fc.property(
        fc.array(fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/), { minLength: 2, maxLength: 10 }),
        (symbols: string[]) => {
          // Remove duplicates from the generated array
          const uniqueSymbols = Array.from(new Set(symbols));

          if (uniqueSymbols.length < 2) {
            // Skip if we don't have at least 2 unique symbols
            return true;
          }

          const url = buildBrapiUrl(baseUrl, uniqueSymbols);

          expect(url).not.toBeNull();

          if (url) {
            // URL should contain all symbols
            uniqueSymbols.forEach((symbol) => {
              expect(url).toContain(symbol);
            });

            // Extract symbols from URL
            const extractedSymbols = extractSymbolsFromUrl(url);

            // Extracted symbols should match unique symbols
            expect(extractedSymbols).toEqual(expect.arrayContaining(uniqueSymbols));

            // Should not contain spaces in symbols parameter
            const symbolsParam = new URL(url).searchParams.get('symbols');
            expect(symbolsParam).not.toContain(' ');

            // URL should be valid
            expect(isValidBrapiUrl(url)).toBe(true);
          }

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.3: Duplicate symbols in input are removed in URL output', () => {
      /**
       * Generate symbols with duplicates and verify they are deduplicated
       */
      const property = fc.property(
        fc.tuple(
          fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/),
          fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/)
        ),
        ([symbol1, symbol2]: [string, string]) => {
          // Create array with intentional duplicates
          const inputSymbols = [symbol1, symbol1, symbol2, symbol2, symbol1];

          const url = buildBrapiUrl(baseUrl, inputSymbols);

          expect(url).not.toBeNull();

          if (url) {
            // Extract symbols from URL
            const extractedSymbols = extractSymbolsFromUrl(url);

            // Extracted symbols should only contain unique values
            const uniqueExtracted = Array.from(new Set(extractedSymbols));
            expect(extractedSymbols).toEqual(uniqueExtracted);

            // Number of extracted symbols should be <= unique input symbols
            const uniqueInput = Array.from(new Set(inputSymbols));
            expect(extractedSymbols.length).toBeLessThanOrEqual(uniqueInput.length);
          }

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.4: URL contains exactly one ? for query string and correct /fii/indicators path', () => {
      /**
       * Verify URL structure: endpoint path and query string formatting
       */
      const property = fc.property(
        fc.array(fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/), { minLength: 1, maxLength: 5 }),
        (symbols: string[]) => {
          const uniqueSymbols = Array.from(new Set(symbols));

          if (uniqueSymbols.length === 0) {
            return true;
          }

          const url = buildBrapiUrl(baseUrl, uniqueSymbols);

          expect(url).not.toBeNull();

          if (url) {
            // URL should have exactly one ?
            const questionMarkCount = (url.match(/\?/g) || []).length;
            expect(questionMarkCount).toBe(1);

            // URL should contain the correct path
            expect(url).toContain('/fii/indicators');

            // URL should start with base URL
            expect(url).toContain(baseUrl);
          }

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.5: Empty symbol array or invalid input returns null', () => {
      /**
       * Verify null is returned for invalid inputs
       */
      // Empty array
      let url = buildBrapiUrl(baseUrl, []);
      expect(url).toBeNull();

      // All empty strings
      url = buildBrapiUrl(baseUrl, ['', '', '']);
      expect(url).toBeNull();

      // Invalid base URL
      url = buildBrapiUrl('', ['MXRF11']);
      expect(url).toBeNull();

      // Null base URL
      url = buildBrapiUrl(null as any, ['MXRF11']);
      expect(url).toBeNull();
    });

    it('Property 6.6: URL with symbols parameter always passes isValidBrapiUrl check', () => {
      /**
       * Verify that URLs created by buildBrapiUrl are always valid according to isValidBrapiUrl
       */
      const property = fc.property(
        fc.array(fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/), { minLength: 1, maxLength: 5 }),
        (symbols: string[]) => {
          const uniqueSymbols = Array.from(new Set(symbols));

          if (uniqueSymbols.length === 0) {
            return true;
          }

          const url = buildBrapiUrl(baseUrl, uniqueSymbols);

          if (url) {
            // URL should be valid according to isValidBrapiUrl
            expect(isValidBrapiUrl(url)).toBe(true);
          }

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.7: Extracted symbols from URL match normalized input symbols', () => {
      /**
       * Verify round-trip: URL -> extracted symbols should match normalized input
       */
      const property = fc.property(
        fc.array(fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/), { minLength: 1, maxLength: 5 }),
        (symbols: string[]) => {
          const uniqueSymbols = Array.from(new Set(symbols.map(s => s.toUpperCase())));

          if (uniqueSymbols.length === 0) {
            return true;
          }

          const url = buildBrapiUrl(baseUrl, uniqueSymbols);

          expect(url).not.toBeNull();

          if (url) {
            // Extract symbols from URL
            const extracted = extractSymbolsFromUrl(url);

            // Extracted should match input (normalized)
            expect(extracted.sort()).toEqual(uniqueSymbols.sort());
          }

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.8: Symbols in URL are uppercase and comma-separated without spaces', () => {
      /**
       * Verify format: uppercase symbols, comma-separated, no spaces
       */
      const property = fc.property(
        fc.array(fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/), { minLength: 1, maxLength: 5 }),
        (symbols: string[]) => {
          const uniqueSymbols = Array.from(new Set(symbols));

          if (uniqueSymbols.length === 0) {
            return true;
          }

          const url = buildBrapiUrl(baseUrl, uniqueSymbols);

          expect(url).not.toBeNull();

          if (url) {
            // Extract symbols parameter
            const symbolsParam = new URL(url).searchParams.get('symbols');

            expect(symbolsParam).not.toBeNull();

            if (symbolsParam) {
              // Should not contain spaces
              expect(symbolsParam).not.toContain(' ');

              // Should contain commas if multiple symbols
              if (uniqueSymbols.length > 1) {
                expect(symbolsParam).toContain(',');
              }

              // Each symbol should be uppercase and match FII pattern
              const extractedSymbols = symbolsParam.split(',');
              extractedSymbols.forEach((symbol) => {
                expect(symbol).toMatch(/^[A-Z]{4}[0-9]{2}$/);
              });
            }
          }

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.9: URL construction is idempotent - same symbols always produce same URL', () => {
      /**
       * Verify that building URL twice with same symbols produces identical URLs
       */
      const property = fc.property(
        fc.array(fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/), { minLength: 1, maxLength: 5 }),
        (symbols: string[]) => {
          const uniqueSymbols = Array.from(new Set(symbols));

          if (uniqueSymbols.length === 0) {
            return true;
          }

          const url1 = buildBrapiUrl(baseUrl, uniqueSymbols);
          const url2 = buildBrapiUrl(baseUrl, uniqueSymbols);

          // Building twice should produce identical result
          expect(url1).toBe(url2);

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.10: Case-insensitive input symbols are normalized to uppercase in URL', () => {
      /**
       * Verify that lowercase or mixed-case symbols are converted to uppercase
       */
      const property = fc.property(
        fc.array(
          fc.tuple(
            fc.stringMatching(/^[A-Z]{4}[0-9]{2}$/),
            fc.oneof(fc.constant('lower'), fc.constant('mixed'), fc.constant('upper'))
          ),
          { minLength: 1, maxLength: 3 }
        ),
        (symbolsWithCase: Array<[string, string]>) => {
          // Transform symbols based on case preference
          const symbols = symbolsWithCase.map(([symbol, caseType]) => {
            if (caseType === 'lower') return symbol.toLowerCase();
            if (caseType === 'mixed') return symbol[0].toUpperCase() + symbol.slice(1).toLowerCase();
            return symbol; // upper
          });

          const uniqueSymbols = Array.from(new Set(symbols));

          if (uniqueSymbols.length === 0) {
            return true;
          }

          const url = buildBrapiUrl(baseUrl, uniqueSymbols);

          expect(url).not.toBeNull();

          if (url) {
            // All symbols in URL should be uppercase
            const extractedSymbols = extractSymbolsFromUrl(url);
            extractedSymbols.forEach((symbol) => {
              expect(symbol).toBe(symbol.toUpperCase());
            });
          }

          return true;
        }
      );

      fc.assert(property, { numRuns: 100 });
    });

    it('Property 6.11: Base URL with or without trailing slash produces identical URL', () => {
      /**
       * Verify that base URL formatting (trailing slash) doesn't affect result
       */
      const testSymbols = ['MXRF11', 'HGLG11'];
      
      const urlWithoutSlash = buildBrapiUrl('https://brapi.dev/api/v2', testSymbols);
      const urlWithSlash = buildBrapiUrl('https://brapi.dev/api/v2/', testSymbols);

      // Both should produce the same result
      expect(urlWithoutSlash).toBe(urlWithSlash);
    });
  });

  /**
   * Unit tests for specific examples
   */
  describe('Unit Tests - brAPI URL Construction Examples', () => {
    it('should construct single symbol URL correctly', () => {
      const url = buildBrapiUrl(baseUrl, ['MXRF11']);
      expect(url).toBe(`${baseUrl}/fii/indicators?symbols=MXRF11`);
    });

    it('should construct multiple symbol URL with comma-separated values', () => {
      const url = buildBrapiUrl(baseUrl, ['MXRF11', 'HGLG11']);
      expect(url).toContain('symbols=MXRF11,HGLG11');
    });

    it('should remove duplicate symbols', () => {
      const url = buildBrapiUrl(baseUrl, ['MXRF11', 'MXRF11', 'HGLG11', 'MXRF11']);
      const extracted = extractSymbolsFromUrl(url!);
      expect(extracted).toHaveLength(2);
      expect(extracted).toContain('MXRF11');
      expect(extracted).toContain('HGLG11');
    });

    it('should return null for empty symbol array', () => {
      const url = buildBrapiUrl(baseUrl, []);
      expect(url).toBeNull();
    });

    it('should normalize symbols to uppercase', () => {
      const url = buildBrapiUrl(baseUrl, ['mxrf11', 'HgLg11']);
      const extracted = extractSymbolsFromUrl(url!);
      expect(extracted).toContain('MXRF11');
      expect(extracted).toContain('HGLG11');
    });

    it('should handle trailing slash in base URL', () => {
      const url1 = buildBrapiUrl('https://brapi.dev/api/v2', ['MXRF11']);
      const url2 = buildBrapiUrl('https://brapi.dev/api/v2/', ['MXRF11']);
      expect(url1).toBe(url2);
    });

    it('should filter out empty strings from symbols array', () => {
      const url = buildBrapiUrl(baseUrl, ['', 'MXRF11', '', 'HGLG11', '']);
      const extracted = extractSymbolsFromUrl(url!);
      expect(extracted).toHaveLength(2);
      expect(extracted).toContain('MXRF11');
      expect(extracted).toContain('HGLG11');
    });

    it('should not contain spaces in symbols parameter', () => {
      const url = buildBrapiUrl(baseUrl, ['MXRF11', 'HGLG11', 'KNSC11']);
      const symbolsParam = new URL(url!).searchParams.get('symbols');
      expect(symbolsParam).not.toContain(' ');
    });

    it('should validate correct URL structure', () => {
      const url = buildBrapiUrl(baseUrl, ['MXRF11']);
      expect(isValidBrapiUrl(url!)).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidBrapiUrl('invalid-url')).toBe(false);
      expect(isValidBrapiUrl('https://example.com/fii')).toBe(false);
      expect(isValidBrapiUrl('https://brapi.dev/api/v2/fii/indicators')).toBe(false); // No symbols param
    });

    it('should extract symbols correctly from valid URL', () => {
      const url = `${baseUrl}/fii/indicators?symbols=MXRF11,HGLG11,KNSC11`;
      const extracted = extractSymbolsFromUrl(url);
      expect(extracted).toEqual(['MXRF11', 'HGLG11', 'KNSC11']);
    });

    it('should handle symbols with various lengths', () => {
      const symbols = ['MXRF11', 'HGLG11', 'KNSC11', 'BRDT12', 'BBPO11'];
      const url = buildBrapiUrl(baseUrl, symbols);
      expect(url).not.toBeNull();
      
      const extracted = extractSymbolsFromUrl(url!);
      expect(extracted.length).toBeLessThanOrEqual(symbols.length);
      symbols.forEach((symbol) => {
        expect(extracted).toContain(symbol);
      });
    });

    it('should handle symbols with leading/trailing whitespace', () => {
      const url = buildBrapiUrl(baseUrl, [' MXRF11 ', '  HGLG11  ']);
      const extracted = extractSymbolsFromUrl(url!);
      expect(extracted).toContain('MXRF11');
      expect(extracted).toContain('HGLG11');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long symbol list (50+ symbols)', () => {
      const symbols = Array.from({ length: 50 }, (_, i) => `SYM${String(i).padStart(5, '0')}`);
      const url = buildBrapiUrl(baseUrl, symbols);
      expect(url).not.toBeNull();
      expect(isValidBrapiUrl(url!)).toBe(true);
    });

    it('should handle symbols that are exactly 6 characters', () => {
      const url = buildBrapiUrl(baseUrl, ['MXRF11', 'ABCD12']);
      expect(url).not.toBeNull();
      expect(extractSymbolsFromUrl(url!)).toContain('MXRF11');
      expect(extractSymbolsFromUrl(url!)).toContain('ABCD12');
    });

    it('should handle special FII symbols', () => {
      const url = buildBrapiUrl(baseUrl, ['MXRF11', 'NWSA11', 'BBPO11', 'BRDT12']);
      const extracted = extractSymbolsFromUrl(url!);
      expect(extracted.length).toBeLessThanOrEqual(4);
    });
  });
});
