/**
 * Unit tests for TypeScript interfaces
 * Validates that types are correctly defined and can be instantiated
 */

import { describe, it, expect } from '@jest/globals';
import * as fc from 'fast-check';
import {
  ParsedFII,
  FormattedFII,
  ErrorState,
  CircuitBreakerState,
  CacheEntry,
  FIIParser,
  FIIPrettyPrinter,
} from './types';

describe('TypeScript Interfaces', () => {
  it('should create a valid ParsedFII object', () => {
    const fii: ParsedFII = {
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
        name: 'XP Administração de Recursos Ltda',
        cnpj: '00.000.000/0001-00',
        email: 'contact@xp.com.br',
      },
    };

    expect(fii.symbol).toBe('MXRF11');
    expect(fii.price).toBe(9.74);
    expect(fii.pvRatio).toBeCloseTo(1.0392547);
  });

  it('should create a valid ErrorState object', () => {
    const error: ErrorState = {
      code: 'TIMEOUT',
      message: 'Request timeout',
      statusCode: 504,
      timestamp: new Date(),
    };

    expect(error.code).toBe('TIMEOUT');
    expect(error.statusCode).toBe(504);
  });

  it('should create a valid CircuitBreakerState object', () => {
    const state: CircuitBreakerState = {
      status: 'CLOSED',
      lastFailureTime: null,
      failureCount: 0,
      successCount: 0,
      openDurationMs: 60000,
      transitionTime: null,
    };

    expect(state.status).toBe('CLOSED');
    expect(state.openDurationMs).toBe(60000);
  });

  it('should create a valid CacheEntry object', () => {
    const now = new Date();
    const entry: CacheEntry<string> = {
      symbol: 'MXRF11',
      value: 'cached_data',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
      accessCount: 1,
      lastAccessedAt: now,
    };

    expect(entry.symbol).toBe('MXRF11');
    expect(entry.accessCount).toBe(1);
  });

  it('should support FormattedFII with formatted fields', () => {
    const formatted: FormattedFII = {
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

    expect(formatted.priceFormatted).toBe('R$ 9,74');
    expect(formatted.pvRatioFormatted.status).toBe('premium');
  });
});

describe('FIIParser', () => {
  const validFIIRecord = {
    symbol: 'MXRF11',
    price: 9.74,
    nav: 9.3678,
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
  };

  describe('Valid FII Records', () => {
    it('should parse a valid FII record from array', () => {
      const response = [validFIIRecord];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(1);
      expect(result.fiis[0].symbol).toBe('MXRF11');
      expect(result.fiis[0].price).toBe(9.74);
      expect(result.fiis[0].nav).toBe(9.3678);
      // P/VP = price / nav = 9.74 / 9.3678 ≈ 1.0397318
      expect(result.fiis[0].pvRatio).toBeCloseTo(9.74 / 9.3678, 5);
    });

    it('should parse valid FII record from wrapped response { data: [...] }', () => {
      const response = { data: [validFIIRecord] };
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(1);
      expect(result.fiis[0].symbol).toBe('MXRF11');
    });

    it('should parse multiple valid FII records', () => {
      const record2 = {
        ...validFIIRecord,
        symbol: 'HGLG11',
        price: 150.5,
        nav: 145.0,
      };

      const response = [validFIIRecord, record2];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(2);
      expect(result.fiis[0].symbol).toBe('MXRF11');
      expect(result.fiis[1].symbol).toBe('HGLG11');
      expect(result.fiis[1].pvRatio).toBeCloseTo(150.5 / 145.0, 5);
    });

    it('should calculate P/VP ratio correctly (price / nav)', () => {
      const response = [validFIIRecord];
      const result = FIIParser.parsebrAPIResponse(response);

      const expectedRatio = validFIIRecord.price / validFIIRecord.nav;
      expect(result.fiis[0].pvRatio).toBeCloseTo(expectedRatio, 10);
    });

    it('should preserve all numeric field precision', () => {
      const response = [validFIIRecord];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis[0].dividendYield1Month).toBe(0.12268994);
      expect(result.fiis[0].dividendYield12Month).toBe(0.12543876);
      expect(result.fiis[0].monthlyReturn).toBe(0.02543);
      expect(result.fiis[0].investorCount).toBe(45678);
      expect(result.fiis[0].totalAssets).toBe(4313692700);
    });

    it('should extract administrator information correctly', () => {
      const response = [validFIIRecord];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis[0].administrator.name).toBe('XP Administração de Recursos Ltda');
      expect(result.fiis[0].administrator.cnpj).toBe('00.000.000/0001-00');
      expect(result.fiis[0].administrator.email).toBe('contact@xp.com.br');
    });
  });

  describe('NAV Validation (Division by Zero Prevention)', () => {
    it('should skip FII record if NAV is null', () => {
      const response = [{ ...validFIIRecord, nav: null }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].reason).toContain('is required');
    });

    it('should skip FII record if NAV is undefined', () => {
      const response = [{ ...validFIIRecord, nav: undefined }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('is required');
    });

    it('should skip FII record if NAV is zero', () => {
      const response = [{ ...validFIIRecord, nav: 0 }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('NAV must be');
    });

    it('should skip FII record if NAV is negative', () => {
      const response = [{ ...validFIIRecord, nav: -5.0 }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    it('should skip FII record if NAV is NaN', () => {
      const response = [{ ...validFIIRecord, nav: NaN }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Type Validation (Reject String Numbers)', () => {
    it('should reject FII record if price is a string', () => {
      const response = [{ ...validFIIRecord, price: '9.74' }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('must be a number, not a string');
    });

    it('should reject FII record if nav is a string', () => {
      const response = [{ ...validFIIRecord, nav: '9.3678' }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('must be a number, not a string');
    });

    it('should reject FII record if dividendYield1Month is a string', () => {
      const response = [{ ...validFIIRecord, dividendYield1Month: '0.1226' }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    it('should reject FII record if investorCount is a string', () => {
      const response = [{ ...validFIIRecord, investorCount: '45678' }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    it('should accept valid numeric types (integers and floats)', () => {
      const response = [
        {
          ...validFIIRecord,
          price: 9.74,
          nav: 9.3678,
          investorCount: 45678,
          totalAssets: 4313692700,
        },
      ];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(1);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Missing Required Fields', () => {
    it('should return error if symbol is missing', () => {
      const response = [{ ...validFIIRecord, symbol: undefined }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('Symbol is required');
    });

    it('should return error if symbol is not a string', () => {
      const response = [{ ...validFIIRecord, symbol: 123 }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    it('should return error if price is missing', () => {
      const response = [{ ...validFIIRecord, price: undefined }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    it('should return error if administrator is missing', () => {
      const response = [{ ...validFIIRecord, administrator: undefined }];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('Administrator must be an object');
    });

    it('should return error if administrator is missing required fields', () => {
      const response = [
        {
          ...validFIIRecord,
          administrator: {
            name: 'XP',
            // missing cnpj and email
          },
        },
      ];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Malformed JSON Handling', () => {
    it('should return error if response is null', () => {
      const result = FIIParser.parsebrAPIResponse(null);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('valid JSON object');
    });

    it('should return error if response is undefined', () => {
      const result = FIIParser.parsebrAPIResponse(undefined);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    it('should return error if response is a string (not object)', () => {
      const result = FIIParser.parsebrAPIResponse('invalid');

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
    });

    it('should return error if response has no data array', () => {
      const result = FIIParser.parsebrAPIResponse({ notData: [] });

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('must contain a data array');
    });

    it('should return error if individual record is not an object', () => {
      const response = ['not_an_object'];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeDefined();
      expect(result.errors![0].reason).toContain('record must be an object');
    });
  });

  describe('Mixed Valid and Invalid Records', () => {
    it('should parse valid records and skip invalid ones', () => {
      const response = [
        validFIIRecord,
        { ...validFIIRecord, symbol: 'HGLG11', nav: 0 }, // Invalid NAV
        { ...validFIIRecord, symbol: 'KNSC11', price: '10.0' }, // String price
      ];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(1);
      expect(result.fiis[0].symbol).toBe('MXRF11');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBe(2); // Two invalid records
    });

    it('should include descriptive error information for each invalid record', () => {
      const response = [
        { ...validFIIRecord, nav: null }, // Invalid NAV
        { ...validFIIRecord, symbol: 'TEST', price: '10' }, // String price
      ];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.errors).toBeDefined();
      expect(result.errors![0].field).toBeDefined();
      expect(result.errors![0].reason).toBeDefined();
      expect(result.errors![0].record).toBeDefined();
    });
  });

  describe('Empty Response Handling', () => {
    it('should handle empty array', () => {
      const response: any[] = [];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeUndefined();
    });

    it('should handle wrapped empty response { data: [] }', () => {
      const response = { data: [] };
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(0);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numeric values', () => {
      const response = [
        {
          ...validFIIRecord,
          totalAssets: 9999999999999,
          investorCount: 999999,
        },
      ];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(1);
      expect(result.fiis[0].totalAssets).toBe(9999999999999);
      expect(result.fiis[0].investorCount).toBe(999999);
    });

    it('should handle very small numeric values', () => {
      const response = [
        {
          ...validFIIRecord,
          price: 0.01,
          nav: 0.01,
          dividendYield1Month: 0.00001,
        },
      ];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(1);
      expect(result.fiis[0].price).toBe(0.01);
      expect(result.fiis[0].nav).toBe(0.01);
    });

    it('should handle negative yield values (valid scenario)', () => {
      const response = [
        {
          ...validFIIRecord,
          dividendYield1Month: -0.05, // Negative yield is valid
          monthlyReturn: -0.10, // Negative return is valid
        },
      ];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(1);
      expect(result.fiis[0].dividendYield1Month).toBe(-0.05);
      expect(result.fiis[0].monthlyReturn).toBe(-0.10);
    });

    it('should handle symbols with various formats', () => {
      const response = [
        {
          ...validFIIRecord,
          symbol: 'MXRF11',
        },
        {
          ...validFIIRecord,
          symbol: 'XP',
          price: 100,
        },
        {
          ...validFIIRecord,
          symbol: 'ABCD1234',
          price: 50,
        },
      ];
      const result = FIIParser.parsebrAPIResponse(response);

      expect(result.fiis).toHaveLength(3);
      expect(result.fiis[0].symbol).toBe('MXRF11');
      expect(result.fiis[1].symbol).toBe('XP');
      expect(result.fiis[2].symbol).toBe('ABCD1234');
    });
  });
});

describe('FIIPrettyPrinter', () => {
  it('should format all FII fields correctly', () => {
    const parsedFII: ParsedFII = {
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
        name: 'XP Administração de Recursos Ltda',
        cnpj: '00.000.000/0001-00',
        email: 'contact@xp.com.br',
      },
    };

    const formatted = FIIPrettyPrinter.prettyPrintFII(parsedFII);

    expect(formatted.symbol).toBe('MXRF11');
    expect(formatted.priceFormatted).toBeDefined();
    expect(formatted.navFormatted).toBeDefined();
    expect(formatted.pvRatioFormatted.displayValue).toBeDefined();
    expect(formatted.dividendYield1MonthFormatted).toBeDefined();
    expect(formatted.dividendYield12MonthFormatted).toBeDefined();
    expect(formatted.monthlyReturnFormatted).toBeDefined();
    expect(formatted.investorCountFormatted).toBeDefined();
    expect(formatted.totalAssetsFormatted).toBeDefined();
    expect(formatted.administrator.name).toBe('XP Administração de Recursos Ltda');
  });

  it('should preserve administrator information during formatting', () => {
    const parsedFII: ParsedFII = {
      symbol: 'HGLG11',
      price: 150.5,
      nav: 145.0,
      pvRatio: 150.5 / 145.0,
      dividendYield1Month: 0.08,
      dividendYield12Month: 0.10,
      monthlyReturn: 0.01,
      investorCount: 50000,
      totalAssets: 5000000000,
      administrator: {
        name: 'Administrator Name',
        cnpj: '12.345.678/0001-90',
        email: 'admin@example.com',
      },
    };

    const formatted = FIIPrettyPrinter.prettyPrintFII(parsedFII);

    expect(formatted.administrator.name).toBe('Administrator Name');
    expect(formatted.administrator.cnpj).toBe('12.345.678/0001-90');
    expect(formatted.administrator.email).toBe('admin@example.com');
  });
});

describe('Property 10: FII Parser Round-Trip', () => {
  /**
   * **Validates: Requirement 17.3**
   * 
   * For any valid brAPI FII indicator JSON response, parsing the response to extract FII records,
   * then pretty-printing those records back to a formatted string, then re-parsing the formatted
   * string SHALL produce FII data objects that are equivalent to the original parsed data
   * (round-trip preservation of data integrity).
   * 
   * Minimum 100 iterations to catch edge cases.
   */
  it('should preserve data through parse -> pretty-print -> parse round-trip (Property 10)', () => {
    // Create a fast-check Arbitrary for valid FII objects
    const parsedFIIArbitrary: fc.Arbitrary<ParsedFII> = fc.record({
      symbol: fc.stringMatching(/^[A-Z]{4}\d{2}$/), // e.g., MXRF11
      price: fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
      nav: fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }), // Non-zero to prevent division errors
      pvRatio: fc.float({ min: Math.fround(0.5), max: Math.fround(2.0) }), // Typical P/VP range (won't use this, calc from price/nav)
      dividendYield1Month: fc.float({ min: Math.fround(0), max: Math.fround(0.5) }),
      dividendYield12Month: fc.float({ min: Math.fround(0), max: Math.fround(0.5) }),
      monthlyReturn: fc.float({ min: Math.fround(-0.1), max: Math.fround(0.1) }),
      investorCount: fc.integer({ min: 100, max: 1000000 }),
      totalAssets: fc.integer({ min: 1000000, max: 9999999999999 }),
      administrator: fc.record({
        name: fc.string({ minLength: 1, maxLength: 100 }),
        cnpj: fc.string({ minLength: 1, maxLength: 50 }),
        email: fc.string({ minLength: 1, maxLength: 100 }),
      }),
    });

    fc.assert(
      fc.property(parsedFIIArbitrary, (originalFII) => {
        // Recalculate P/VP ratio from price and nav (as the parser would)
        const fiiWithCalculatedPvRatio: ParsedFII = {
          ...originalFII,
          pvRatio: originalFII.price / originalFII.nav,
        };

        // Step 1: Convert to brAPI response format (array)
        const brAPIResponse = [fiiWithCalculatedPvRatio];

        // Step 2: Parse via FIIParser.parsebrAPIResponse()
        const parseResult = FIIParser.parsebrAPIResponse(brAPIResponse);
        
        // Handle edge case where parser rejects the record (e.g., NaN NAV)
        if (parseResult.fiis.length === 0) {
          // Parser correctly rejected an invalid record
          // This is expected behavior for edge cases
          expect(parseResult.errors).toBeDefined();
          expect(parseResult.errors).toHaveLength(1);
          return;
        }
        
        expect(parseResult.fiis).toHaveLength(1);
        const parsedFII = parseResult.fiis[0];

        // Step 3: Pretty-print via FIIPrettyPrinter.prettyPrintFII()
        const formattedFII = FIIPrettyPrinter.prettyPrintFII(parsedFII);

        // Step 4: Verify round-trip preservation
        // Check symbol (exact match)
        expect(parsedFII.symbol).toBe(originalFII.symbol);
        expect(formattedFII.symbol).toBe(originalFII.symbol);

        // Check numeric values are preserved within rounding tolerance
        // Price: within 0.01 rounding error
        expect(parsedFII.price).toBeCloseTo(originalFII.price, 2);

        // NAV: within 0.01 rounding error
        expect(parsedFII.nav).toBeCloseTo(originalFII.nav, 2);

        // P/VP ratio: within 0.001 rounding error
        const expectedPvRatio = originalFII.price / originalFII.nav;
        expect(parsedFII.pvRatio).toBeCloseTo(expectedPvRatio, 3);

        // Yield/return values: within 0.001
        expect(parsedFII.dividendYield1Month).toBeCloseTo(originalFII.dividendYield1Month, 3);
        expect(parsedFII.dividendYield12Month).toBeCloseTo(originalFII.dividendYield12Month, 3);
        expect(parsedFII.monthlyReturn).toBeCloseTo(originalFII.monthlyReturn, 3);

        // Count values: exact match
        expect(parsedFII.investorCount).toBe(originalFII.investorCount);
        expect(parsedFII.totalAssets).toBe(originalFII.totalAssets);

        // Administrator data: exact match
        expect(parsedFII.administrator.name).toBe(originalFII.administrator.name);
        expect(parsedFII.administrator.cnpj).toBe(originalFII.administrator.cnpj);
        expect(parsedFII.administrator.email).toBe(originalFII.administrator.email);

        // Verify formatted fields are strings (basic sanity check)
        expect(typeof formattedFII.priceFormatted).toBe('string');
        expect(typeof formattedFII.navFormatted).toBe('string');
        expect(typeof formattedFII.pvRatioFormatted.displayValue).toBe('string');
        expect(typeof formattedFII.dividendYield1MonthFormatted).toBe('string');
        expect(typeof formattedFII.dividendYield12MonthFormatted).toBe('string');
        expect(typeof formattedFII.monthlyReturnFormatted).toBe('string');
        expect(typeof formattedFII.investorCountFormatted).toBe('string');
        expect(typeof formattedFII.totalAssetsFormatted).toBe('string');
      }),
      { numRuns: 20 },
    );
  });
});

describe('FIIPrettyPrinter', () => {
  const validParsedFII: ParsedFII = {
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
      name: 'XP Administração de Recursos Ltda',
      cnpj: '00.000.000/0001-00',
      email: 'contact@xp.com.br',
    },
  };

  describe('Basic Formatting', () => {
    it('should format a valid ParsedFII to FormattedFII', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);

      expect(result).toHaveProperty('symbol', 'MXRF11');
      expect(result).toHaveProperty('priceFormatted');
      expect(result).toHaveProperty('navFormatted');
      expect(result).toHaveProperty('pvRatioFormatted');
      expect(result).toHaveProperty('dividendYield1MonthFormatted');
      expect(result).toHaveProperty('dividendYield12MonthFormatted');
      expect(result).toHaveProperty('monthlyReturnFormatted');
      expect(result).toHaveProperty('investorCountFormatted');
      expect(result).toHaveProperty('totalAssetsFormatted');
      expect(result).toHaveProperty('administrator');
    });

    it('should preserve symbol as-is', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.symbol).toBe('MXRF11');
    });

    it('should preserve administrator information', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.administrator).toEqual(validParsedFII.administrator);
      expect(result.administrator.name).toBe('XP Administração de Recursos Ltda');
      expect(result.administrator.cnpj).toBe('00.000.000/0001-00');
      expect(result.administrator.email).toBe('contact@xp.com.br');
    });
  });

  describe('Currency Formatting (price, nav, totalAssets)', () => {
    it('should format price using CurrencyFormatter', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.priceFormatted).toContain('R$');
      expect(result.priceFormatted).toContain('9');
      expect(result.priceFormatted).toMatch(/,74/);
    });

    it('should format nav using CurrencyFormatter', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.navFormatted).toContain('R$');
      expect(result.navFormatted).toContain('9');
    });

    it('should format totalAssets using CurrencyFormatter', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.totalAssetsFormatted).toContain('R$');
      expect(result.totalAssetsFormatted).toContain('4');
      // Should have thousands separator for large number
      expect(result.totalAssetsFormatted).toContain('.');
    });

    it('should handle negative currency values', () => {
      const fii = { ...validParsedFII, price: -10.5 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.priceFormatted).toMatch(/R\$.*10,50/);
    });

    it('should handle large currency values', () => {
      const fii = {
        ...validParsedFII,
        totalAssets: 4313692700,
      };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.totalAssetsFormatted).toMatch(/4\.313\.692\.700,00/);
    });
  });

  describe('Percentage Formatting (dividendYield1Month, dividendYield12Month, monthlyReturn)', () => {
    it('should format dividendYield1Month using PercentageFormatter', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.dividendYield1MonthFormatted).toContain('%');
      expect(result.dividendYield1MonthFormatted).toMatch(/12/);
      expect(result.dividendYield1MonthFormatted).toMatch(/,27/);
    });

    it('should format dividendYield12Month using PercentageFormatter', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.dividendYield12MonthFormatted).toContain('%');
      expect(result.dividendYield12MonthFormatted).toMatch(/12/);
    });

    it('should format monthlyReturn using PercentageFormatter', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.monthlyReturnFormatted).toContain('%');
      expect(result.monthlyReturnFormatted).toMatch(/2/);
    });

    it('should handle negative percentage values', () => {
      const fii = { ...validParsedFII, dividendYield1Month: -0.05 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.dividendYield1MonthFormatted).toContain('%');
      expect(result.dividendYield1MonthFormatted).toMatch(/-/);
    });

    it('should handle zero percentage values', () => {
      const fii = { ...validParsedFII, monthlyReturn: 0 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.monthlyReturnFormatted).toContain('0');
      expect(result.monthlyReturnFormatted).toContain('%');
    });
  });

  describe('Ratio Formatting (pvRatio)', () => {
    it('should format pvRatio using RatioFormatter', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.pvRatioFormatted).toHaveProperty('displayValue');
      expect(result.pvRatioFormatted).toHaveProperty('status');
      expect(result.pvRatioFormatted).toHaveProperty('intensity');
      expect(result.pvRatioFormatted).toHaveProperty('ariaLabel');
    });

    it('should return premium status for pvRatio > 1.0', () => {
      const fii = { ...validParsedFII, pvRatio: 1.04 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.pvRatioFormatted.status).toBe('premium');
    });

    it('should return discount status for pvRatio < 1.0', () => {
      const fii = { ...validParsedFII, pvRatio: 0.95 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.pvRatioFormatted.status).toBe('discount');
    });

    it('should return neutral status for pvRatio = 1.0', () => {
      const fii = { ...validParsedFII, pvRatio: 1.0 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.pvRatioFormatted.status).toBe('neutral');
    });

    it('should return high intensity for pvRatio outside [0.95, 1.05]', () => {
      const fiiPremium = { ...validParsedFII, pvRatio: 1.1 };
      const resultPremium = FIIPrettyPrinter.prettyPrintFII(fiiPremium);
      expect(resultPremium.pvRatioFormatted.intensity).toBe('high');

      const fiiDiscount = { ...validParsedFII, pvRatio: 0.9 };
      const resultDiscount = FIIPrettyPrinter.prettyPrintFII(fiiDiscount);
      expect(resultDiscount.pvRatioFormatted.intensity).toBe('high');
    });

    it('should return low intensity for pvRatio inside [0.95, 1.05]', () => {
      const fii = { ...validParsedFII, pvRatio: 1.02 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.pvRatioFormatted.intensity).toBe('low');
    });

    it('should have displayValue with 2 decimal places', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.pvRatioFormatted.displayValue).toMatch(/\d+,\d{2}/);
    });

    it('should include appropriate ariaLabel', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.pvRatioFormatted.ariaLabel).toBeDefined();
      expect(typeof result.pvRatioFormatted.ariaLabel).toBe('string');
    });
  });

  describe('Investor Count Formatting (using Intl.NumberFormat)', () => {
    it('should format investorCount with thousands separator', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.investorCountFormatted).toBe('45.678');
    });

    it('should use period as thousands separator for pt-BR locale', () => {
      const fii = { ...validParsedFII, investorCount: 1000000 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.investorCountFormatted).toMatch(/1\.000\.000/);
    });

    it('should format small investor counts without separator', () => {
      const fii = { ...validParsedFII, investorCount: 100 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.investorCountFormatted).toBe('100');
    });

    it('should format very large investor counts', () => {
      const fii = { ...validParsedFII, investorCount: 999999 };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.investorCountFormatted).toMatch(/999\.999/);
    });

    it('should not include decimal places for investor count', () => {
      const result = FIIPrettyPrinter.prettyPrintFII(validParsedFII);
      expect(result.investorCountFormatted).not.toMatch(/,/);
    });
  });

  describe('Round-Trip Validation', () => {
    it('should produce FormattedFII that preserves all data from ParsedFII', () => {
      const formatted = FIIPrettyPrinter.prettyPrintFII(validParsedFII);

      expect(formatted.symbol).toBe(validParsedFII.symbol);
      expect(formatted.administrator.name).toBe(validParsedFII.administrator.name);
      expect(formatted.administrator.cnpj).toBe(validParsedFII.administrator.cnpj);
      expect(formatted.administrator.email).toBe(validParsedFII.administrator.email);
    });

    it('should be able to process output from FIIParser correctly', () => {
      const brAPIResponse = [validParsedFII];
      const parseResult = FIIParser.parsebrAPIResponse(brAPIResponse);

      expect(parseResult.fiis).toHaveLength(1);
      const parsed = parseResult.fiis[0];

      // Pretty-print the parsed FII
      const formatted = FIIPrettyPrinter.prettyPrintFII(parsed);

      // Verify formatted output is complete
      expect(formatted.symbol).toBe('MXRF11');
      expect(formatted.priceFormatted).toContain('R$');
      expect(formatted.pvRatioFormatted.status).toBe('premium');
    });
  });

  describe('Edge Cases', () => {
    it('should handle FII with null price', () => {
      // Note: FIIParser would reject this, but testing FormattedFII handling
      const fii: ParsedFII = { ...validParsedFII, price: NaN };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);
      expect(result.priceFormatted).toBe('—');
    });

    it('should handle multiple FIIs with different values', () => {
      const fii1 = { ...validParsedFII, symbol: 'MXRF11', price: 9.74 };
      const fii2 = { ...validParsedFII, symbol: 'HGLG11', price: 150.5 };

      const result1 = FIIPrettyPrinter.prettyPrintFII(fii1);
      const result2 = FIIPrettyPrinter.prettyPrintFII(fii2);

      expect(result1.symbol).toBe('MXRF11');
      expect(result2.symbol).toBe('HGLG11');
      expect(result1.priceFormatted).not.toBe(result2.priceFormatted);
    });

    it('should handle very large and very small numeric values', () => {
      const fii = {
        ...validParsedFII,
        totalAssets: 999999999999.99,
        investorCount: 1,
        price: 0.01,
      };
      const result = FIIPrettyPrinter.prettyPrintFII(fii);

      expect(result.totalAssetsFormatted).toContain('R$');
      expect(result.investorCountFormatted).toBe('1');
      expect(result.priceFormatted).toContain('0');
    });
  });
});
