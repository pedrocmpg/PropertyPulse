/**
 * CacheManager - In-memory cache with per-symbol granularity
 * Implements LRU eviction when max capacity is exceeded
 * 
 * Design:
 * - Stores cache entries by symbol (separate entry per symbol, not per combination)
 * - Each entry has TTL (time-to-live) in seconds
 * - Tracks metadata: createdAt, expiresAt, accessCount, lastAccessedAt
 * - Implements LRU (Least Recently Used) eviction when maxTotalEntries exceeded
 */

import { CacheEntry, CacheConfig } from '../models/types';
import Logger from '../utils/Logger';

/**
 * Generic cache manager with granular per-symbol storage
 */
export class CacheManager<T> {
  private entries: Map<string, CacheEntry<T>> = new Map();
  private config: CacheConfig;

  /**
   * Create a new CacheManager instance
   * @param config Cache configuration
   */
  constructor(config: CacheConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validate cache configuration
   */
  private validateConfig(): void {
    if (!this.config.ttlSeconds || this.config.ttlSeconds <= 0) {
      throw new Error('Cache config: ttlSeconds must be greater than 0');
    }
    if (!this.config.maxEntriesPerSymbol || this.config.maxEntriesPerSymbol <= 0) {
      throw new Error('Cache config: maxEntriesPerSymbol must be greater than 0');
    }
    if (!this.config.maxTotalEntries || this.config.maxTotalEntries <= 0) {
      throw new Error('Cache config: maxTotalEntries must be greater than 0');
    }
    if (this.config.evictionStrategy !== 'LRU') {
      throw new Error('Cache config: evictionStrategy must be LRU');
    }
  }

  /**
   * Store a value in the cache for a given symbol
   * Overwrites existing entry if present
   * 
   * @param symbol - Unique symbol identifier
   * @param value - Value to cache
   * @param ttlSeconds - Optional TTL override (uses config default if not provided)
   */
  public set(symbol: string, value: T, ttlSeconds?: number): void {
    if (!symbol || symbol.trim() === '') {
      throw new Error('Symbol must not be empty');
    }

    const ttl = ttlSeconds ?? this.config.ttlSeconds;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttl * 1000);

    // If entry exists, update it
    const existing = this.entries.get(symbol);
    if (existing) {
      existing.value = value;
      existing.createdAt = now;
      existing.expiresAt = expiresAt;
      existing.accessCount = 0;
      existing.lastAccessedAt = now;
      Logger.logCacheOperation({
        operation: 'set',
        symbol,
        ttl,
      });
      return;
    }

    // New entry - check capacity before adding
    if (this.entries.size >= this.config.maxTotalEntries) {
      // Evict least recently used entry
      this.evictLRU();
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      symbol,
      value,
      createdAt: now,
      expiresAt,
      accessCount: 0,
      lastAccessedAt: now,
    };

    this.entries.set(symbol, entry);
    Logger.logCacheOperation({
      operation: 'set',
      symbol,
      ttl,
    });
  }

  /**
   * Retrieve a value from the cache for a given symbol
   * Returns null if:
   * - Symbol not found
   * - Entry has expired
   * 
   * Updates accessCount and lastAccessedAt on successful retrieval
   * 
   * @param symbol - Unique symbol identifier
   * @returns Cached value or null if not found or expired
   */
  public get(symbol: string): T | null {
    if (!symbol || symbol.trim() === '') {
      return null;
    }

    const entry = this.entries.get(symbol);
    if (!entry) {
      Logger.logCacheOperation({
        operation: 'miss',
        symbol,
      });
      return null;
    }

    // Check if entry has expired
    const now = new Date();
    if (now > entry.expiresAt) {
      // Entry expired - remove it
      this.entries.delete(symbol);
      Logger.logCacheOperation({
        operation: 'miss',
        symbol,
      });
      return null;
    }

    // Entry is valid - update metadata
    entry.accessCount++;
    entry.lastAccessedAt = now;

    // Log cache hit
    Logger.logCacheOperation({
      operation: 'hit',
      symbol,
    });

    return entry.value;
  }

  /**
   * Remove a specific entry from the cache
   * @param symbol - Unique symbol identifier
   * @returns true if entry was removed, false if not found
   */
  public delete(symbol: string): boolean {
    const deleted = this.entries.delete(symbol);
    if (deleted) {
      Logger.logCacheOperation({
        operation: 'delete',
        symbol,
      });
    }
    return deleted;
  }

  /**
   * Clear all entries from the cache
   */
  public clear(): void {
    this.entries.clear();
    Logger.logCacheOperation({
      operation: 'clear',
    });
  }

  /**
   * Get the total number of entries in cache
   * Does NOT include expired entries
   */
  public size(): number {
    return this.entries.size;
  }

  /**
   * Get cache statistics for monitoring and debugging
   */
  public getStats(): {
    totalEntries: number;
    maxTotalEntries: number;
    entries: Array<{
      symbol: string;
      createdAt: Date;
      expiresAt: Date;
      accessCount: number;
      lastAccessedAt: Date;
      isExpired: boolean;
    }>;
  } {
    const now = new Date();
    const entries = Array.from(this.entries.values()).map((entry) => ({
      symbol: entry.symbol,
      createdAt: entry.createdAt,
      expiresAt: entry.expiresAt,
      accessCount: entry.accessCount,
      lastAccessedAt: entry.lastAccessedAt,
      isExpired: now > entry.expiresAt,
    }));

    return {
      totalEntries: this.entries.size,
      maxTotalEntries: this.config.maxTotalEntries,
      entries,
    };
  }

  /**
   * Evict the least recently used entry from the cache
   * Uses lastAccessedAt timestamp to determine LRU entry
   */
  private evictLRU(): void {
    let lruSymbol: string | null = null;
    let oldestAccessTime: Date | null = null;

    // Find entry with oldest lastAccessedAt time
    for (const [symbol, entry] of this.entries) {
      if (oldestAccessTime === null || entry.lastAccessedAt < oldestAccessTime) {
        oldestAccessTime = entry.lastAccessedAt;
        lruSymbol = symbol;
      }
    }

    // Remove the LRU entry
    if (lruSymbol !== null) {
      this.entries.delete(lruSymbol);
      Logger.logCacheOperation({
        operation: 'delete',
        symbol: lruSymbol,
      });
    }
  }

  /**
   * Cleanup expired entries from the cache
   * Useful for maintaining cache health over time
   * @returns Number of entries removed
   */
  public cleanup(): number {
    const now = new Date();
    const expiredSymbols: string[] = [];

    for (const [symbol, entry] of this.entries) {
      if (now > entry.expiresAt) {
        expiredSymbols.push(symbol);
      }
    }

    expiredSymbols.forEach((symbol) => {
      this.entries.delete(symbol);
      Logger.logCacheOperation({
        operation: 'delete',
        symbol,
      });
    });

    return expiredSymbols.length;
  }
}
