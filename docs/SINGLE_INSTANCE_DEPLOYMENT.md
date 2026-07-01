# Single-Instance Deployment Guide: In-Memory Caching

## Overview

This guide documents the in-memory caching strategy suitable for single backend instance deployments. The FII Dashboard uses an in-memory cache to store brAPI data locally on the backend server, eliminating unnecessary API calls and improving response times without requiring external cache infrastructure.

## When In-Memory Cache Is Appropriate

### Suitable Scenarios

In-memory caching is the ideal choice for:

- **Development environments**: Rapid iteration without infrastructure complexity
- **Staging environments**: Testing new features and changes before production
- **Small production deployments**: Applications serving fewer than 100,000 requests per day
- **Single backend instance**: Only one server running the Node.js backend proxy
- **Internal-facing applications**: Systems not requiring multi-region redundancy
- **Prototype and MVP deployments**: Proof-of-concept systems with limited user bases

### When NOT to Use In-Memory Cache

Do not use in-memory caching if:

- **Multiple backend instances**: You have 2 or more Node.js backend servers (use Redis instead)
- **Load balancing across instances**: Traffic is distributed across multiple servers
- **Cache consistency required**: All servers must serve identical data simultaneously
- **Data persistence needed**: Cache must survive server restarts
- **High-availability required**: System requires zero downtime during deployments
- **Large-scale production**: Serving more than 100,000 requests per day
- **Distributed system**: Microservices architecture with separate services

## Why In-Memory Cache Works for Single Instances

### Architecture Overview

```
┌─────────────────────────────────────┐
│       Browser (Frontend)            │
│   (React/Next.js Application)       │
└─────────────────┬───────────────────┘
                  │
                  │ HTTP Requests
                  │ (FII Symbols)
                  ↓
┌─────────────────────────────────────────────────────────────┐
│    Single Node.js Backend Instance                          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ In-Memory Cache (Map data structure)               │   │
│  │ - Stores FII data per symbol                       │   │
│  │ - 5-minute TTL per entry                           │   │
│  │ - LRU eviction at 500 entry limit                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ brAPI Client                                        │   │
│  │ - Fetches uncached FII data from brAPI             │   │
│  │ - Caches results locally                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                  │
                  │ HTTP Requests to brAPI
                  │ (Only for cache misses)
                  ↓
┌─────────────────────────────────────┐
│      brAPI v2 Service               │
│   (Brazilian Market Data API)        │
└─────────────────────────────────────┘
```

### Key Principles

**No Cache Synchronization Needed**: Since there's only one backend instance, data consistency is automatically guaranteed. The single cache is the single source of truth for all client requests.

**Direct Memory Storage**: Data is stored directly in Node.js process memory using JavaScript Map data structure, with no network round-trips to external cache services.

**Request Flow**:
1. Frontend requests FII data for symbols (e.g., "MXRF11,HGLG11")
2. Backend checks in-memory cache for each symbol
3. For cache hits: Return immediately from memory
4. For cache misses: Fetch from brAPI, store in memory, return to frontend

**Cache Bypass Available**: Manual refresh operations bypass the cache and fetch fresh data directly from brAPI, ensuring users can always get the latest data on demand.

## Use Cases and Deployment Scenarios

### Development Environment

**Characteristics**:
- Single developer machine or shared development server
- Frequent code changes and deployments
- Typical traffic: <1 request/second
- No uptime SLA requirements

**Benefits**:
- No Redis/Memcached setup required
- Faster local iteration (in-memory is fastest possible)
- Trivial configuration (just TTL seconds)
- Cache automatically clears on server restart
- Ideal for testing cache behavior without external dependencies

**Example Setup**:
```bash
# Development .env
BRAPI_TOKEN=your_dev_token
BACKEND_PORT=3001
CACHE_TTL_SECONDS=300
NODE_ENV=development
```

### Staging Environment

**Characteristics**:
- Dedicated staging server (single instance)
- Testing environment for new features
- Typical traffic: 1-10 requests/second
- High availability not required (can restart for deployments)

**Benefits**:
- Mirrors production caching behavior
- Validates cache hit/miss scenarios
- Tests data formatting and parsing
- Verifies API integration before production rollout
- Easy to clear cache by restarting server if needed

**Example Setup**:
```bash
# Staging .env
BRAPI_TOKEN=your_staging_token
BACKEND_PORT=3001
CACHE_TTL_SECONDS=300
NODE_ENV=staging
LOG_LEVEL=info
```

### Small Production Deployment

**Characteristics**:
- Single production server (one Node.js instance)
- Typical traffic: <100,000 requests/day (~1 request/second average)
- Investors checking FII data throughout trading hours
- Limited team (1-2 backend engineers)

**Benefits**:
- Zero infrastructure complexity (no Redis servers to manage)
- Lowest operational cost (no additional services)
- Fastest response times (in-memory is fastest storage)
- Easy to understand and debug
- Minimal memory footprint for typical usage

**Traffic Calculation**:
- 100,000 requests/day ÷ 24 hours = ~4,166 requests/hour
- ~1.2 requests/second average
- Peak hours might reach 2-5 requests/second
- Easily handled by single Node.js instance

**Example Setup**:
```bash
# Production .env (single instance)
BRAPI_TOKEN=your_production_token
BACKEND_PORT=3001
CACHE_TTL_SECONDS=300
NODE_ENV=production
LOG_LEVEL=warning
MAX_TOTAL_ENTRIES=500
```

## Performance Characteristics

### Cache Hit Scenario (Most Common)

**When a user requests previously viewed FII data:**

```
Request: GET /api/fii/indicators?symbols=MXRF11

1. Symbol lookup in in-memory Map:  ~0.1ms
2. Check expiration (if in cache):  ~0.01ms
3. Update metadata (access count):  ~0.01ms
4. Serialize JSON response:          ~1ms
5. Send response to client:          Network dependent (20-100ms)

Total backend processing: ~1.1ms (excluding network)
Total round-trip: ~50-150ms typical
```

**Memory cost**: ~500 bytes per FII entry (typical)

### Cache Miss Scenario

**When a user requests FII data not yet cached:**

```
Request: GET /api/fii/indicators?symbols=MXRF11

1. Symbol lookup in cache:           ~0.1ms (returns null)
2. HTTP request to brAPI:            ~200-500ms (network + processing)
3. Parse brAPI response:             ~5-10ms
4. Store in cache:                   ~0.1ms
5. Serialize JSON response:          ~1ms
6. Send response to client:          Network dependent

Total backend processing: ~230-520ms (excluding first network hop)
Total round-trip: ~250-620ms typical
```

**Improvement after caching**: Subsequent requests to same symbol are 200-500x faster

### Typical Cache Statistics

**For a dashboard with 5 monitored FIIs:**

- Cache entries: 5 symbols
- Memory used: ~2.5 KB
- Hit rate during trading hours: 70-90%
- API calls saved per day: 100-200 (out of 300 requests)
- Cost reduction: Proportional to hit rate

**Example**:
- 300 requests/day = ~0.3 requests/second average
- 80% hit rate = 240 cache hits, 60 brAPI calls
- API call savings: 240 requests

### Response Time Improvements

| Scenario | Response Time | Improvement |
|----------|---------------|-------------|
| Cache miss (cold start) | 400-600ms | Baseline |
| Cache hit (warm) | 20-50ms | 10-20x faster |
| 5 symbols, 80% hit rate | ~100ms average | 4-6x improvement overall |

**User Experience**: Most users see <50ms response times after first load, with only occasional 400-600ms waits when brAPI isn't cached yet.

## Limitations and When to Migrate

### Limitations of In-Memory Caching

**Limited to Single Instance**
- ❌ Cannot share cache between multiple servers
- ❌ Load balancer cannot distribute traffic across multiple in-memory caches
- ❌ Each server maintains separate cache (inconsistent data between servers)
- ✅ Solution: Use Redis for shared cache with multiple instances

**Cache Lost on Restart**
- ❌ Data is lost when backend server restarts or crashes
- ❌ No persistence across deployments
- ✅ Solution: For persistence, use Redis or database cache

**Memory Constraints**
- ❌ Total cache size limited by available server RAM
- ❌ 500-entry limit protects memory but caps cache size
- ✅ Solution: Increase server RAM or migrate to Redis/Memcached

**No Cache Monitoring**
- ❌ Limited visibility into cache hit/miss rates
- ❌ Difficult to optimize cache behavior in production
- ✅ Solution: Implement metrics export (Prometheus) or upgrade to managed cache service

**Scaling Barriers**
- ❌ Cannot scale cache independent of application
- ❌ Adding server = adding new in-memory cache (separate cache per server)
- ✅ Solution: Migrate to Redis (scales cache independently)

### When to Migrate from In-Memory to Redis

**Migration triggers** (consider Redis when):

1. **Multiple Backend Instances**
   - You need to add a second backend server for redundancy
   - Load balancer routes traffic across multiple instances
   - Current in-memory cache becomes insufficient
   - **Trigger**: "We're adding a second backend server"

2. **High Traffic Volume**
   - Requests exceed 100,000/day (~1.2 requests/second)
   - Cache hit rate optimization becomes critical
   - Response time SLAs require <100ms (in-memory insufficient for volume)
   - **Trigger**: "We need 5-10x more throughput"

3. **Cache Persistence Requirements**
   - Users expect data to persist across deployments
   - Frequent deployments cause cold cache start (poor UX)
   - Business logic requires long-term metrics (cache hit rates)
   - **Trigger**: "Cold starts hurt user experience"

4. **High Availability Requirements**
   - Zero-downtime deployments required
   - Production SLA requires 99.9% uptime
   - Cache loss during restarts is business critical
   - **Trigger**: "We cannot accept service interruption"

5. **Multi-Region Deployments**
   - Same FII data needed across multiple geographic regions
   - Regional servers should share cache for consistency
   - Reduces redundant brAPI calls globally
   - **Trigger**: "We're expanding to multiple regions"

### Migration Path

**Step 1: Identify Readiness**
- [ ] Traffic exceeds 100k requests/day consistently
- [ ] Multiple backend instances needed
- [ ] Team has Redis operational experience

**Step 2: Minimal Configuration Changes**
```typescript
// Current: CacheManager with Map
const cache = new CacheManager<FIIData>({...});

// After: Redis-backed CacheManager
const cache = new RedisCacheManager<FIIData>({
  redisUrl: process.env.REDIS_URL,
  ttlSeconds: 300
});

// API remains identical - just drop-in replacement
```

**Step 3: Deployment**
1. Provision Redis instance (AWS ElastiCache, Redis Cloud, self-hosted)
2. Update `REDIS_URL` environment variable
3. Restart backend services
4. Cache now shared across all instances

**Step 4: Monitoring**
- Track cache hit rates with Redis commands
- Set up alerts for Redis memory usage
- Monitor latency (Redis adds ~1-2ms per operation)

## Configuration for Single Instance

### Environment Variables

```env
# Required for secure API communication
BRAPI_TOKEN=your_secret_token_here

# Backend configuration
BACKEND_PORT=3001
NODE_ENV=production

# Cache configuration (single instance defaults)
CACHE_TTL_SECONDS=300                  # 5 minutes
MAX_TOTAL_ENTRIES=500                  # Max symbols to cache

# Request handling
REQUEST_TIMEOUT_MS=10000               # 10 seconds
MAX_RETRIES=3                          # Retry attempts on failure

# Logging
LOG_LEVEL=info                         # debug, info, warning, error
```

### CacheManager Initialization

```typescript
import { CacheManager } from './cache';
import { FIIData } from '../models/types';

// Standard configuration for single-instance deployment
const cacheConfig = {
  ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '300'),
  maxEntriesPerSymbol: 1,              // Only one version per symbol
  maxTotalEntries: 500,                // Up to 500 symbols
  evictionStrategy: 'LRU' as const     // Least-recently-used
};

const fiiCache = new CacheManager<FIIData>(cacheConfig);

// Optional: Periodic cleanup
setInterval(() => {
  const removed = fiiCache.cleanup();
  if (removed > 0) {
    logger.info(`Cache cleanup: removed ${removed} expired entries`);
  }
}, 60000);  // Every minute
```

### Expected Memory Usage

**Per FII Entry**:
- Symbol: 10 bytes
- Price, NAV, ratios: 40 bytes
- Yields and returns: 30 bytes
- Investor count, assets: 20 bytes
- Administrator info: 100 bytes
- **Total per entry: ~500 bytes**

**With 500-entry limit**:
- Maximum cache size: 500 × 500 bytes = 250 KB
- Typical cache (100 entries): ~50 KB
- Node.js process overhead: ~100 MB
- **Conclusion**: Negligible memory footprint

## Operational Considerations

### Cache Warming

On server startup, consider pre-loading popular FIIs:

```typescript
// Optional: Warm cache with popular symbols
const popularSymbols = ['MXRF11', 'HGLG11', 'KNSC11', 'RBRR11'];
for (const symbol of popularSymbols) {
  const data = await fetchFromBrAPI([symbol]);
  fiiCache.set(symbol, data[0]);
  logger.info(`Warmed cache: ${symbol}`);
}
```

**Benefits**:
- First users see cached data immediately
- Reduced cold-start API calls
- Better first-load performance

**Trade-offs**:
- Adds startup time (~1-2 seconds)
- Only relevant if same symbols popular across all users

### Monitoring Cache Health

**Key metrics to track**:

```typescript
const stats = fiiCache.getStats();

logger.info(`Cache Stats:
  Total entries: ${stats.totalEntries}
  Max capacity: ${stats.maxTotalEntries}
  Used %: ${(stats.totalEntries / stats.maxTotalEntries * 100).toFixed(1)}%
`);

// Track in production
if (stats.totalEntries > stats.maxTotalEntries * 0.8) {
  logger.warning('Cache approaching capacity - evictions may increase');
}
```

### Cache Clearing

**Scenarios requiring cache clear**:

1. **After deployments** (if data format changes):
   ```bash
   # Restart backend service - cache cleared automatically
   systemctl restart fii-dashboard-backend
   ```

2. **If bad data cached** (brAPI returned corrupt data):
   ```typescript
   fiiCache.delete('MXRF11');  // Delete specific entry
   // OR
   fiiCache.clear();           // Clear entire cache (rare)
   ```

3. **During debugging**:
   ```typescript
   const removed = fiiCache.cleanup();  // Remove only expired entries
   ```

### Log Monitoring

**What to watch in logs**:

```
✅ Good indicators:
- "Cache hit: MXRF11" (cache working)
- "Cleanup removed 5 expired entries" (healthy turnover)
- "Fetching HGLG11 from brAPI" (new data)

⚠️  Warning indicators:
- Repeated "Fetching SYMBOL from brAPI" (cache expiring too fast)
- "Cache evicted SYMBOL (LRU)" repeatedly (capacity pressure)
- "Cache approaching capacity" (may need to increase limit)

❌ Error indicators:
- "Failed to parse brAPI response" (data integrity issue)
- "Request timeout to brAPI" (service degradation)
```

## Troubleshooting

### Symptom: Slow Response Times

**Diagnosis**:
1. Check cache hit rate: `logger.info(fiiCache.getStats())`
2. If hit rate <50%, cache may be too small or TTL too short
3. Check brAPI response time (add latency logging)

**Solutions**:
- Increase `CACHE_TTL_SECONDS` (e.g., 600 for 10 minutes)
- Increase `MAX_TOTAL_ENTRIES` (e.g., 1000)
- Monitor brAPI latency and consider timeout adjustments

### Symptom: High Memory Usage

**Diagnosis**:
1. Run `ps aux | grep node` to check memory
2. Check cache stats: total entries / max entries
3. If cache at capacity, entries are being evicted

**Solutions**:
- Reduce `CACHE_TTL_SECONDS` (entries expire faster)
- Reduce `MAX_TOTAL_ENTRIES` (lower capacity)
- Consider Redis migration if still insufficient

### Symptom: Stale Data Displayed

**Diagnosis**:
1. Check if user clicked Refresh (should bypass cache)
2. Check cache TTL settings
3. Verify brAPI is returning updated data

**Solutions**:
- User can click Refresh button to force fresh data
- Reduce `CACHE_TTL_SECONDS` (cache expires sooner)
- Check if brAPI is caching on their end (unlikely but possible)

### Symptom: Cache Entries Not Evicting

**Diagnosis**:
1. Check if cleanup process is running
2. Verify max entries not set too high
3. Check if entries are legitimately being accessed

**Solutions**:
- Ensure cleanup process runs: `cache.cleanup()` every 60s
- Lower `MAX_TOTAL_ENTRIES` to trigger eviction sooner
- Run manual cleanup if needed: `fiiCache.clear()`

## Summary

In-memory caching is the optimal choice for **single backend instance deployments** serving up to 100,000 requests per day. It provides:

✅ **Simplicity**: No external services to deploy or manage  
✅ **Performance**: Fastest possible response times (in-memory)  
✅ **Cost**: No Redis/Memcached licensing or operational overhead  
✅ **Scalability (limited)**: Handles typical small-to-medium deployments  

**Key Tradeoffs**:
- ❌ Single instance only (no multi-instance support)
- ❌ Cache lost on restart (no persistence)
- ❌ Memory limited (typical max ~500 entries)
- ❌ No cross-server consistency (not applicable here)

**Migration path**: When traffic exceeds 100k requests/day or multiple instances needed, switch to Redis with minimal code changes (interface identical).

## Next Steps

1. **For Development**: Use defaults, focus on feature development
2. **For Production (Single Instance)**: Adjust `CACHE_TTL_SECONDS` and `MAX_TOTAL_ENTRIES` based on traffic patterns
3. **For Scaling**: Plan Redis migration when adding second instance or exceeding 100k requests/day
4. **For Monitoring**: Implement cache metrics tracking (hit rate, eviction count, memory usage)

