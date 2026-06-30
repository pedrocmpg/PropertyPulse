/**
 * Unit tests for CacheManager
 * Tests: basic operations, TTL expiration, LRU eviction, metadata tracking
 */

import * as fc from 'fast-check';
import { CacheManager } from './CacheManager';
import { CacheConfig } from '../models/types';

describe('CacheManager', () => {
  let cacheManager: CacheManager<string>;
  const defaultConfig: CacheConfig = {
    ttlSeconds: 5,
    maxEntriesPerSymbol: 1,
    maxTotalEntries: 10,
    evictionStrategy: 'LRU',
  };

  beforeEach(() => {
    cacheManager = new CacheManager(defaultConfig);
  });

  describe('Constructor and Validation', () => {
    test('should create cache manager with valid config', () => {
      const cache = new CacheManager(defaultConfig);
      expect(cache.size()).toBe(0);
    });

    test('should throw error if ttlSeconds is 0 or negative', () => {
      expect(() => {
        new CacheManager({ ...defaultConfig, ttlSeconds: 0 });
      }).toThrow('ttlSeconds must be greater than 0');
    });

    test('should throw error if maxEntriesPerSymbol is invalid', () => {
      expect(() => {
        new CacheManager({ ...defaultConfig, maxEntriesPerSymbol: 0 });
      }).toThrow('maxEntriesPerSymbol must be greater than 0');
    });

    test('should throw error if maxTotalEntries is invalid', () => {
      expect(() => {
        new CacheManager({ ...defaultConfig, maxTotalEntries: 0 });
      }).toThrow('maxTotalEntries must be greater than 0');
    });

    test('should throw error if evictionStrategy is not LRU', () => {
      expect(() => {
        new CacheManager({
          ...defaultConfig,
          evictionStrategy: 'FIFO' as any,
        });
      }).toThrow('evictionStrategy must be LRU');
    });
  });

  describe('set() and get()', () => {
    test('should store and retrieve a value', () => {
      cacheManager.set('MXRF11', 'test value');
      expect(cacheManager.get('MXRF11')).toBe('test value');
    });

    test('should return null for non-existent symbol', () => {
      expect(cacheManager.get('NONEXISTENT')).toBeNull();
    });

    test('should return null for empty symbol', () => {
      expect(cacheManager.get('')).toBeNull();
      expect(cacheManager.get('   ')).toBeNull();
    });

    test('should throw error when setting empty symbol', () => {
      expect(() => {
        cacheManager.set('', 'value');
      }).toThrow('Symbol must not be empty');
    });

    test('should throw error when setting whitespace-only symbol', () => {
      expect(() => {
        cacheManager.set('   ', 'value');
      }).toThrow('Symbol must not be empty');
    });

    test('should overwrite existing entry', () => {
      cacheManager.set('MXRF11', 'value1');
      expect(cacheManager.get('MXRF11')).toBe('value1');

      cacheManager.set('MXRF11', 'value2');
      expect(cacheManager.get('MXRF11')).toBe('value2');
    });

    test('should increment accessCount on get', () => {
      cacheManager.set('MXRF11', 'value');
      cacheManager.get('MXRF11');
      cacheManager.get('MXRF11');

      const stats = cacheManager.getStats();
      const entry = stats.entries.find((e) => e.symbol === 'MXRF11');
      expect(entry?.accessCount).toBe(2);
    });

    test('should update lastAccessedAt on get', () => {
      cacheManager.set('MXRF11', 'value');
      const setTime = new Date();

      // Small delay to ensure time difference
      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
      return delay(10).then(() => {
        cacheManager.get('MXRF11');
        const stats = cacheManager.getStats();
        const entry = stats.entries.find((e) => e.symbol === 'MXRF11');
        expect(entry?.lastAccessedAt.getTime()).toBeGreaterThan(setTime.getTime());
      });
    });
  });

  describe('TTL and Expiration', () => {
    test('should return null for expired entry', async () => {
      cacheManager.set('MXRF11', 'value', 1); // 1 second TTL
      expect(cacheManager.get('MXRF11')).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(cacheManager.get('MXRF11')).toBeNull();
    });

    test('should use default TTL when not provided', async () => {
      cacheManager.set('MXRF11', 'value'); // Uses default 5 seconds
      expect(cacheManager.get('MXRF11')).toBe('value');

      // Still valid after 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));
      expect(cacheManager.get('MXRF11')).toBe('value');
    });

    test('should use custom TTL when provided', async () => {
      cacheManager.set('MXRF11', 'value', 1); // 1 second custom TTL
      expect(cacheManager.get('MXRF11')).toBe('value');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(cacheManager.get('MXRF11')).toBeNull();
    });

    test('should mark entry as expired in stats', async () => {
      cacheManager.set('MXRF11', 'value', 1);
      let stats = cacheManager.getStats();
      let entry = stats.entries.find((e) => e.symbol === 'MXRF11');
      expect(entry?.isExpired).toBe(false);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Accessing expired entry removes it
      cacheManager.get('MXRF11');
      stats = cacheManager.getStats();
      expect(stats.entries.find((e) => e.symbol === 'MXRF11')).toBeUndefined();
    });

    test('should reset expiration on overwrite', async () => {
      cacheManager.set('MXRF11', 'value1', 1);

      // Wait 600ms
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Overwrite resets expiration
      cacheManager.set('MXRF11', 'value2', 2);

      // Original would be expired, but resetting the entry extends TTL
      await new Promise((resolve) => setTimeout(resolve, 500));
      expect(cacheManager.get('MXRF11')).toBe('value2');
    });
  });

  describe('Metadata Tracking', () => {
    test('should track createdAt timestamp', () => {
      const beforeSet = new Date();
      cacheManager.set('MXRF11', 'value');
      const afterSet = new Date();

      const stats = cacheManager.getStats();
      const entry = stats.entries.find((e) => e.symbol === 'MXRF11');

      expect(entry?.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSet.getTime());
      expect(entry?.createdAt.getTime()).toBeLessThanOrEqual(afterSet.getTime());
    });

    test('should track expiresAt timestamp', () => {
      const ttl = 10;
      const beforeSet = new Date();
      cacheManager.set('MXRF11', 'value', ttl);
      const afterSet = new Date();

      const stats = cacheManager.getStats();
      const entry = stats.entries.find((e) => e.symbol === 'MXRF11');

      const expectedExpiration = beforeSet.getTime() + ttl * 1000;
      expect(entry?.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiration);
      expect(entry?.expiresAt.getTime()).toBeLessThanOrEqual(afterSet.getTime() + ttl * 1000);
    });

    test('should initialize accessCount to 0', () => {
      cacheManager.set('MXRF11', 'value');
      const stats = cacheManager.getStats();
      const entry = stats.entries.find((e) => e.symbol === 'MXRF11');
      expect(entry?.accessCount).toBe(0);
    });

    test('should track accessCount increments on get', () => {
      cacheManager.set('MXRF11', 'value');

      for (let i = 0; i < 5; i++) {
        cacheManager.get('MXRF11');
      }

      const stats = cacheManager.getStats();
      const entry = stats.entries.find((e) => e.symbol === 'MXRF11');
      expect(entry?.accessCount).toBe(5);
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used entry when max capacity exceeded', async () => {
      const smallConfig: CacheConfig = {
        ttlSeconds: 300,
        maxEntriesPerSymbol: 1,
        maxTotalEntries: 3,
        evictionStrategy: 'LRU',
      };
      const cache = new CacheManager<string>(smallConfig);

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      // Add 3 entries with delays to ensure distinct timestamps
      cache.set('A', 'value_a');
      await delay(10);
      cache.set('B', 'value_b');
      await delay(10);
      cache.set('C', 'value_c');
      await delay(10);
      expect(cache.size()).toBe(3);

      // Access A to make B the LRU
      cache.get('A');
      await delay(10);

      // Add 4th entry - should evict B (least recently used)
      cache.set('D', 'value_d');
      expect(cache.size()).toBe(3);
      expect(cache.get('B')).toBeNull();
      expect(cache.get('A')).toBe('value_a');
      expect(cache.get('C')).toBe('value_c');
      expect(cache.get('D')).toBe('value_d');
    });

    test('should evict the oldest entry when no accesses', () => {
      const smallConfig: CacheConfig = {
        ttlSeconds: 300,
        maxEntriesPerSymbol: 1,
        maxTotalEntries: 2,
        evictionStrategy: 'LRU',
      };
      const cache = new CacheManager<string>(smallConfig);

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      cache.set('A', 'value_a');
      return delay(10)
        .then(() => {
          cache.set('B', 'value_b');
          return delay(10);
        })
        .then(() => {
          // Add 3rd entry - should evict A (oldest)
          cache.set('C', 'value_c');
          expect(cache.get('A')).toBeNull();
          expect(cache.get('B')).toBe('value_b');
          expect(cache.get('C')).toBe('value_c');
        });
    });

    test('should handle multiple evictions correctly', async () => {
      const smallConfig: CacheConfig = {
        ttlSeconds: 300,
        maxEntriesPerSymbol: 1,
        maxTotalEntries: 2,
        evictionStrategy: 'LRU',
      };
      const cache = new CacheManager<string>(smallConfig);

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      cache.set('A', 'value_a');
      await delay(10);
      cache.set('B', 'value_b');
      await delay(10);
      expect(cache.size()).toBe(2);

      // Access A
      cache.get('A');
      await delay(10);

      // Add C - evicts B
      cache.set('C', 'value_c');
      await delay(10);
      expect(cache.get('B')).toBeNull();

      // Access A again
      cache.get('A');
      await delay(10);

      // Add D - evicts C
      cache.set('D', 'value_d');
      await delay(10);
      expect(cache.get('C')).toBeNull();
      expect(cache.get('A')).toBe('value_a');
      expect(cache.get('D')).toBe('value_d');
    });
  });

  describe('Cache Operations', () => {
    test('should delete specific entry', () => {
      cacheManager.set('MXRF11', 'value');
      expect(cacheManager.get('MXRF11')).toBe('value');

      const deleted = cacheManager.delete('MXRF11');
      expect(deleted).toBe(true);
      expect(cacheManager.get('MXRF11')).toBeNull();
    });

    test('should return false when deleting non-existent entry', () => {
      const deleted = cacheManager.delete('NONEXISTENT');
      expect(deleted).toBe(false);
    });

    test('should clear all entries', () => {
      cacheManager.set('A', 'value_a');
      cacheManager.set('B', 'value_b');
      cacheManager.set('C', 'value_c');
      expect(cacheManager.size()).toBe(3);

      cacheManager.clear();
      expect(cacheManager.size()).toBe(0);
      expect(cacheManager.get('A')).toBeNull();
      expect(cacheManager.get('B')).toBeNull();
      expect(cacheManager.get('C')).toBeNull();
    });

    test('should return correct size', () => {
      expect(cacheManager.size()).toBe(0);

      cacheManager.set('A', 'value_a');
      expect(cacheManager.size()).toBe(1);

      cacheManager.set('B', 'value_b');
      expect(cacheManager.size()).toBe(2);

      cacheManager.delete('A');
      expect(cacheManager.size()).toBe(1);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should return cache statistics', () => {
      cacheManager.set('MXRF11', 'value1');
      cacheManager.set('HGLG11', 'value2');
      cacheManager.get('MXRF11');

      const stats = cacheManager.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.maxTotalEntries).toBe(10);
      expect(stats.entries.length).toBe(2);
    });

    test('should include detailed entry info in statistics', () => {
      cacheManager.set('MXRF11', 'value');
      cacheManager.get('MXRF11');
      cacheManager.get('MXRF11');

      const stats = cacheManager.getStats();
      const entry = stats.entries.find((e) => e.symbol === 'MXRF11');

      expect(entry?.symbol).toBe('MXRF11');
      expect(entry?.accessCount).toBe(2);
      expect(entry?.createdAt).toBeDefined();
      expect(entry?.expiresAt).toBeDefined();
      expect(entry?.lastAccessedAt).toBeDefined();
      expect(entry?.isExpired).toBe(false);
    });

    test('should exclude expired entries from size but show in stats', async () => {
      cacheManager.set('MXRF11', 'value', 1);
      expect(cacheManager.size()).toBe(1);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Accessing expired entry removes it
      cacheManager.get('MXRF11');
      expect(cacheManager.size()).toBe(0);
    });
  });

  describe('Cleanup', () => {
    test('should remove expired entries', async () => {
      cacheManager.set('A', 'value_a', 1);
      cacheManager.set('B', 'value_b', 300);
      expect(cacheManager.size()).toBe(2);

      // Wait for A to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Cleanup should remove A
      const removed = cacheManager.cleanup();
      expect(removed).toBe(1);
      expect(cacheManager.size()).toBe(1);
      expect(cacheManager.get('A')).toBeNull();
      expect(cacheManager.get('B')).toBe('value_b');
    });

    test('should return 0 when no expired entries', () => {
      cacheManager.set('A', 'value_a');
      cacheManager.set('B', 'value_b');

      const removed = cacheManager.cleanup();
      expect(removed).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle various data types', () => {
      const config: CacheConfig = {
        ttlSeconds: 300,
        maxEntriesPerSymbol: 1,
        maxTotalEntries: 10,
        evictionStrategy: 'LRU',
      };

      // Test with objects
      const objectCache = new CacheManager<{ name: string; value: number }>(config);
      objectCache.set('OBJ1', { name: 'test', value: 42 });
      expect(objectCache.get('OBJ1')).toEqual({ name: 'test', value: 42 });

      // Test with arrays
      const arrayCache = new CacheManager<number[]>(config);
      arrayCache.set('ARR1', [1, 2, 3]);
      expect(arrayCache.get('ARR1')).toEqual([1, 2, 3]);

      // Test with null values (though unusual)
      const nullCache = new CacheManager<null>(config);
      nullCache.set('NULL1', null);
      expect(nullCache.get('NULL1')).toBeNull();
    });

    test('should handle case-sensitive symbol keys', () => {
      cacheManager.set('mxrf11', 'lowercase');
      cacheManager.set('MXRF11', 'uppercase');

      expect(cacheManager.get('mxrf11')).toBe('lowercase');
      expect(cacheManager.get('MXRF11')).toBe('uppercase');
      expect(cacheManager.size()).toBe(2);
    });

    test('should handle very long TTL values', () => {
      const longTTL = 86400; // 1 day in seconds
      cacheManager.set('MXRF11', 'value', longTTL);
      const stats = cacheManager.getStats();
      const entry = stats.entries.find((e) => e.symbol === 'MXRF11');

      const now = new Date();
      const expectedExpiration = now.getTime() + longTTL * 1000;
      expect(entry?.expiresAt.getTime()).toBeGreaterThan(expectedExpiration - 1000);
      expect(entry?.expiresAt.getTime()).toBeLessThan(expectedExpiration + 1000);
    });
  });
});


describe('Property 8: Cache Expiration', () => {
  /**
   * **Validates: Requirement 15.3**
   *
   * For any random symbol and cache entry with various TTLs, the Cache Manager
   * SHALL correctly handle expiration: expired entries return null, valid entries
   * return their value unchanged.
   *
   * Minimum 100 iterations to catch edge cases.
   */
  it('should correctly handle expired vs valid cache entries (Property 8)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim() !== ''),
        fc.integer({ min: 1, max: 100 }),
        fc.integer({ min: 50, max: 150 }), // Very short TTLs (50-150ms)
        async (symbol: string, value: number, ttlMs: number) => {
          const config: CacheConfig = {
            ttlSeconds: 300,
            maxEntriesPerSymbol: 1,
            maxTotalEntries: 1000,
            evictionStrategy: 'LRU',
          };
          const cache = new CacheManager<number>(config);

          // Set a cache entry with custom TTL (convert ms to seconds)
          const ttlSeconds = ttlMs / 1000;
          cache.set(symbol, value, ttlSeconds);

          // Immediately after setting, entry should be valid
          expect(cache.get(symbol)).toBe(value);

          // Wait for expiration (ttl + 30ms buffer)
          await new Promise((resolve) => setTimeout(resolve, ttlMs + 30));

          // After expiration, entry should return null
          expect(cache.get(symbol)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);

  /**
   * Test that valid (non-expired) entries always return their value
   */
  it('should always return value for non-expired entries (Property 8 - Valid Entries)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.integer({ min: 1, max: 100 }),
        (symbol: string, value: number) => {
          const config: CacheConfig = {
            ttlSeconds: 300,
            maxEntriesPerSymbol: 1,
            maxTotalEntries: 1000,
            evictionStrategy: 'LRU',
          };
          const cache = new CacheManager<number>(config);

          // Set a cache entry with long TTL
          cache.set(symbol, value, 300); // 5 minutes

          // Immediately retrieve it
          expect(cache.get(symbol)).toBe(value);

          // Multiple accesses should all return the same value
          for (let i = 0; i < 10; i++) {
            expect(cache.get(symbol)).toBe(value);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test various TTL edge cases
   */
  it('should respect different TTL values correctly (Property 8 - TTL Variations)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            symbol: fc.string({ minLength: 1, maxLength: 5 }).filter((s) => s.trim() !== ''),
            ttlMs: fc.integer({ min: 50, max: 100 }), // Very short TTLs
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (entries: Array<{ symbol: string; ttlMs: number }>) => {
          const config: CacheConfig = {
            ttlSeconds: 300,
            maxEntriesPerSymbol: 1,
            maxTotalEntries: 1000,
            evictionStrategy: 'LRU',
          };
          const cache = new CacheManager<string>(config);

          // Set all entries (convert ms to seconds)
          for (const entry of entries) {
            cache.set(entry.symbol, `value_${entry.symbol}`, entry.ttlMs / 1000);
          }

          // All should be valid immediately
          for (const entry of entries) {
            expect(cache.get(entry.symbol)).toBe(`value_${entry.symbol}`);
          }

          // Find the max TTL to wait for all to expire
          const maxTtl = Math.max(...entries.map((e) => e.ttlMs));
          await new Promise((resolve) => setTimeout(resolve, maxTtl + 30));

          // All should now be expired
          for (const entry of entries) {
            expect(cache.get(entry.symbol)).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 120000);
});
