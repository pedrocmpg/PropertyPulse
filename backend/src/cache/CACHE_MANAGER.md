# CacheManager - In-Memory Cache with Per-Symbol Granularity

## Overview

The `CacheManager` is a generic, type-safe in-memory cache implementation designed specifically for storing FII (Real Estate Fund) data. It implements **granular per-symbol caching**, meaning each symbol has its own separate cache entry, not combinations of symbols.

## Key Features

- **Per-Symbol Granularity**: Each symbol is cached independently with its own TTL and metadata
- **LRU Eviction**: When the cache reaches maximum capacity, the least recently used entry is automatically evicted
- **TTL Management**: Each entry expires after a configurable TTL (time-to-live)
- **Metadata Tracking**: Captures creation time, expiration time, access count, and last access time
- **Type-Safe**: Full TypeScript support with generic type parameter `<T>`
- **Memory Efficient**: Automatic cleanup of expired entries

## Configuration

```typescript
interface CacheConfig {
  ttlSeconds: number;           // Time-to-live per entry in seconds (default: 300)
  maxEntriesPerSymbol: number;  // Max versions per symbol (default: 1)
  maxTotalEntries: number;      // Max total entries before LRU eviction (default: 500)
  evictionStrategy: 'LRU';      // Only LRU supported
}
```

### Default Configuration Example

```typescript
const config: CacheConfig = {
  ttlSeconds: 300,              // 5 minutes
  maxEntriesPerSymbol: 1,       // One version per symbol
  maxTotalEntries: 500,         // Max 500 symbols
  evictionStrategy: 'LRU'
};
```

## Usage Examples

### Basic Usage

```typescript
import { CacheManager } from './cache';
import { FIIData } from '../models/types';

// Create cache instance
const cache = new CacheManager<FIIData>({
  ttlSeconds: 300,
  maxEntriesPerSymbol: 1,
  maxTotalEntries: 500,
  evictionStrategy: 'LRU'
});

// Store FII data for a symbol
const fiiData: FIIData = {
  symbol: 'MXRF11',
  price: 9.74,
  nav: 9.3678,
  // ... other fields
};

cache.set('MXRF11', fiiData);

// Retrieve cached data
const cachedData = cache.get('MXRF11');
if (cachedData) {
  console.log('Cache hit:', cachedData.symbol);
} else {
  console.log('Cache miss - fetch from brAPI');
}
```

### Custom TTL

```typescript
// Store with custom TTL (10 minutes instead of default 5)
cache.set('MXRF11', fiiData, 600);  // 600 seconds = 10 minutes
```

### Cache Hit Monitoring

```typescript
// Get cache statistics
const stats = cache.getStats();
console.log(`Cache size: ${stats.totalEntries}/${stats.maxTotalEntries}`);

// Check individual entry metadata
const entry = stats.entries.find(e => e.symbol === 'MXRF11');
if (entry) {
  console.log(`Accesses: ${entry.accessCount}`);
  console.log(`Last accessed: ${entry.lastAccessedAt}`);
  console.log(`Expires at: ${entry.expiresAt}`);
}
```

### Cache Management

```typescript
// Delete specific entry
cache.delete('MXRF11');

// Clear all entries
cache.clear();

// Get total entries
const size = cache.size();

// Cleanup expired entries
const removedCount = cache.cleanup();
```

## How It Works

### Set Operation

1. Validate symbol (non-empty)
2. Calculate expiration time: `now + ttlSeconds`
3. If entry exists for symbol, overwrite it
4. If cache is at max capacity, evict LRU entry first
5. Add new entry with metadata (createdAt, expiresAt, accessCount=0, lastAccessedAt=now)

### Get Operation

1. Check if entry exists for symbol
2. Check if entry is expired (now > expiresAt)
3. If expired, delete and return null
4. If valid, increment accessCount and update lastAccessedAt
5. Return the cached value

### LRU Eviction

When `maxTotalEntries` is reached and a new entry needs to be added:

1. Find entry with oldest `lastAccessedAt` timestamp
2. Delete that entry
3. Add new entry

This ensures frequently accessed entries (recently used) are kept, while stale entries are removed first.

## Per-Symbol Design Details

### Why Per-Symbol?

- **Simplicity**: Each symbol is independent; no complex key combinations
- **Flexibility**: Different symbols can have different TTLs if needed
- **Efficiency**: Eviction decisions are straightforward (oldest access time)
- **API Design**: Backend requests symbols as comma-separated list, but cache stores individually

### Granularity Example

```typescript
// Request from backend API:
// GET /api/fii/indicators?symbols=MXRF11,HGLG11,KNSC11

// Cache stores 3 separate entries:
cache.set('MXRF11', {...});  // Entry 1
cache.set('HGLG11', {...});  // Entry 2
cache.set('KNSC11', {...});  // Entry 3

// Subsequent request for same symbols:
// GET /api/fii/indicators?symbols=MXRF11,HGLG11

// Cache can serve both from memory (2 cache hits, 0 brAPI calls)
const mxrf11 = cache.get('MXRF11');  // Cache hit
const hglg11 = cache.get('HGLG11');  // Cache hit
```

## Expiration and TTL

### Default TTL (5 minutes)

```typescript
cache.set('MXRF11', data);  // Expires in 5 minutes

// After 5 minutes:
const data = cache.get('MXRF11');  // Returns null (expired)
```

### Custom TTL

```typescript
cache.set('MXRF11', data, 600);  // Custom 10-minute TTL
cache.set('HGLG11', data, 60);   // Custom 1-minute TTL
```

### Expired Entries

Expired entries are:
1. Removed when accessed via `get()`
2. Removed when `cleanup()` is called
3. NOT counted in `size()` after expiration, but remain in memory until accessed

## Memory Management

### LRU Eviction Strategy

```typescript
// Example: maxTotalEntries = 3
cache.set('A', data);  // size = 1
cache.set('B', data);  // size = 2
cache.set('C', data);  // size = 3 (at capacity)

cache.get('A');        // A is now most recently used
cache.set('D', data);  // LRU? B or C. Let's say B is older.
                       // B is evicted, D is added, size = 3
```

### Cleanup for Health

```typescript
// Periodic cleanup to remove expired entries
setInterval(() => {
  const removed = cache.cleanup();
  if (removed > 0) {
    console.log(`Cleaned up ${removed} expired entries`);
  }
}, 60000);  // Every minute
```

## Integration with Backend Request Handler

```typescript
import { CacheManager } from './cache';

const fiiCache = new CacheManager<FIIData>({
  ttlSeconds: 300,
  maxEntriesPerSymbol: 1,
  maxTotalEntries: 500,
  evictionStrategy: 'LRU'
});

// In request handler:
app.get('/api/fii/indicators', async (req, res) => {
  const symbols: string[] = req.query.symbols?.split(',') || [];
  
  const result: FIIData[] = [];
  const cacheMisses: string[] = [];

  // Check cache first
  for (const symbol of symbols) {
    const cached = fiiCache.get(symbol);
    if (cached) {
      result.push(cached);
    } else {
      cacheMisses.push(symbol);
    }
  }

  // Fetch uncached symbols from brAPI
  if (cacheMisses.length > 0) {
    const brAPIData = await fetchFromBrAPI(cacheMisses);
    
    // Store in cache and add to result
    for (const data of brAPIData) {
      fiiCache.set(data.symbol, data);
      result.push(data);
    }
  }

  res.json({ success: true, data: result });
});
```

## Testing

All functionality is tested with 37 comprehensive unit tests:

```bash
npm test -- CacheManager.test.ts
```

Tests cover:
- Basic set/get operations
- TTL expiration
- LRU eviction
- Metadata tracking (createdAt, expiresAt, accessCount, lastAccessedAt)
- Cache operations (delete, clear, size)
- Statistics and monitoring
- Edge cases (various data types, case sensitivity, long TTLs)

## Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| `set()`   | O(1) average    | O(1) per entry   |
| `get()`   | O(1) average    | O(1)             |
| `delete()`| O(1) average    | O(1)             |
| `evictLRU()` | O(n) where n = total entries | O(1) |
| `cleanup()` | O(n) where n = total entries | O(1) |

Where n is the total number of entries in the cache (bounded by maxTotalEntries).

## Compliance with Requirements

✅ **Requirement 15.1**: Cache FII data in memory for 5 minutes per unique symbol  
✅ **Requirement 15.2**: Store granular per-symbol caching (separate entry per symbol)  
✅ **Requirement 15.3**: When cache expires, discard cached data for next request  
✅ **Requirement 15.5**: When entries exceed max limit, evict oldest (LRU) entries  

## Future Enhancements

Possible future improvements:

1. **Redis Backend**: Replace in-memory Map with Redis for distributed caching
2. **Warm-up Strategy**: Pre-populate cache with popular symbols on startup
3. **Statistics Export**: Prometheus metrics for cache hit/miss rates
4. **Variable TTL**: Different TTLs per symbol based on volatility
5. **Compression**: Compress cached data if memory becomes constrained
