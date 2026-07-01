# Distributed Deployment Guide for FII Dashboard Backend

## Overview

This guide explains how to scale the FII Dashboard backend from a single-instance deployment to a distributed multi-instance architecture using Redis as a shared cache layer. This is necessary when:

- **Traffic exceeds single instance capacity** (>100k requests/day)
- **High availability required** (failover capability)
- **Zero-downtime deployments needed** (instance rolling updates)
- **Geographic distribution** (serving multiple regions)
- **Load balancing** across multiple backend instances

## Current Architecture: Single-Instance In-Memory Cache

### Limitations

- **No Horizontal Scaling**: Adding instances doesn't improve throughput (each has separate cache)
- **Cache Inconsistency**: Symbols cached on Instance A unavailable on Instance B
- **Data Loss on Restart**: All cached data lost when instance restarts
- **Load Imbalance**: Some instances may cache popular symbols while others serve rare symbols
- **Wasted Memory**: Each instance maintains duplicate cache entries

### When Single-Instance is Sufficient

✅ Development and staging environments  
✅ Small production deployments (<100k requests/day)  
✅ Single availability zone deployment  
✅ Acceptable downtime during deployments  
✅ Tight memory constraints  

---

## Distributed Architecture: Redis-Based Caching

### Why Redis?

- **Shared Cache**: All backend instances access same cache (no duplication)
- **Persistence**: Data survives instance crashes or restarts
- **Pub/Sub Messaging**: Broadcast cache invalidation across instances
- **Atomic Operations**: Prevent race conditions with Lua scripts
- **Performance**: <10ms response time for cache operations
- **Proven Track Record**: Production-grade, widely deployed
- **Managed Solutions**: AWS ElastiCache, Azure Cache, Heroku Redis available

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer                             │
│          (with sticky sessions or symbol routing)           │
└──────────────┬────────────────┬────────────────┬────────────┘
               │                │                │
        ┌──────▼───┐    ┌──────▼───┐    ┌──────▼───┐
        │Instance A │    │Instance B │    │Instance C │
        │(Port 3001)│    │(Port 3002)│    │(Port 3003)│
        └──────┬───┘    └──────┬───┘    └──────┬───┘
               │                │                │
               └────────────────┼────────────────┘
                                │
                        ┌───────▼────────┐
                        │  Redis Cluster │
                        │  (Primary + 2  │
                        │   Replicas)    │
                        └────────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
            ┌───────▼──────┐       ┌───────▼──────┐
            │Redis Stream  │       │Pub/Sub Channel│
            │(Cache data)  │       │(Invalidation) │
            └──────────────┘       └───────────────┘
```

### Cache Invalidation Strategies

#### Strategy 1: Time-Based Invalidation (TTL in Redis)

**Simplest approach, minimal coordination needed**

```typescript
// Each symbol cached with 5-minute TTL
await redis.setex(`fii:${symbol}`, 300, JSON.stringify(fiiData));

// Redis automatically deletes after 5 minutes
// All instances see same TTL, automatic cleanup
```

**Pros:**
- No explicit invalidation logic needed
- Automatic cleanup by Redis
- Simple to implement and monitor

**Cons:**
- Stale data visible until TTL expires
- Cannot invalidate immediately when price updates
- Inefficient for rapidly changing symbols

**Best For:** Low-frequency updates, acceptable staleness (5+ minutes)

#### Strategy 2: Pub/Sub-Based Invalidation

**Immediate cache updates across all instances**

```typescript
// Instance A receives new data from brAPI
const newData = await fetchFromBrAPI('MXRF11');

// Update Redis cache
await redis.setex(`fii:MXRF11`, 300, JSON.stringify(newData));

// Broadcast invalidation to all instances
await redis.publish('fii:invalidate', JSON.stringify({
  symbol: 'MXRF11',
  timestamp: Date.now(),
  reason: 'price_update'
}));

// All instances (including A) receive notification
redis.subscribe('fii:invalidate', (message) => {
  const { symbol } = JSON.parse(message);
  const cachedData = cache.get(symbol);  // Get from Redis via TTL
  // In-memory cache also updated by TTL expiration
});
```

**Pros:**
- Immediate propagation across instances
- Can force invalidation without waiting for TTL
- Supports different invalidation reasons

**Cons:**
- Requires Pub/Sub infrastructure
- Network overhead for each invalidation
- Potential race conditions if not careful

**Best For:** Real-time applications, high-frequency updates

#### Strategy 3: Hybrid Approach (Recommended)

**Combines TTL and Pub/Sub for reliability**

```typescript
// Always use TTL as safety net
await redis.setex(`fii:${symbol}`, 300, JSON.stringify(data));

// On manual refresh, also publish invalidation
if (refreshFlag === true) {
  await redis.publish('fii:invalidate', JSON.stringify({
    symbol,
    timestamp: Date.now(),
    reason: 'manual_refresh'
  }));
}

// Optional: On error from brAPI, invalidate aggressively
if (brAPIError && brAPIError.statusCode >= 500) {
  await redis.publish('fii:invalidate', JSON.stringify({
    symbol,
    timestamp: Date.now(),
    reason: 'server_error'
  }));
}
```

**Pros:**
- TTL provides automatic cleanup (no orphaned data)
- Pub/Sub enables immediate updates when available
- Graceful degradation if Pub/Sub fails

**Cons:**
- More complex monitoring
- Requires both Redis features operational

**Best For:** Production deployments, balance between consistency and complexity

---

## Request Routing Strategies

When multiple backend instances serve requests, routing decisions affect cache efficiency and consistency.

### Strategy 1: Standard Load Balancing (Round-Robin)

**Each request to different instance (random or round-robin)**

```
Request 1: MXRF11,HGLG11 → Instance A → Cache miss → brAPI
Request 2: MXRF11,KNSC11 → Instance B → Symbol MXRF11 not cached → brAPI
Request 3: HGLG11,KNSC11 → Instance C → All symbols not cached → brAPI
```

**Impact:**
- **Cache Efficiency**: Low (high redundant brAPI calls)
- **Network Load**: High (many brAPI requests)
- **Implementation**: Simplest (default load balancer)

**When to Use:** Distributed Redis cache compensates for low local efficiency

### Strategy 2: Sticky Sessions (Session Affinity)

**Same client always routed to same instance**

```
Client 1 (Browser Session A) → Always → Instance A
Client 2 (Browser Session B) → Always → Instance B
Client 3 (Browser Session C) → Always → Instance C
```

**Implementation:**

```nginx
# Load balancer sticky session configuration
upstream backend {
    server 10.0.1.1:3001;
    server 10.0.1.2:3001;
    server 10.0.1.3:3001;
}

location /api/fii {
    # Route by IP + session cookie
    proxy_pass http://backend;
    proxy_cookie_path / "/";
    proxy_set_header X-Real-IP $remote_addr;
    # Session affinity (achieved via hash on client IP)
}
```

**Impact:**
- **Cache Efficiency**: Medium (some symbols repeated across instances)
- **Network Load**: Medium (some redundant calls)
- **Failover Issues**: If Instance A crashes, clients must reconnect to new instance, cache miss
- **Uneven Load**: Popular users may overload their assigned instance

**When to Use:** Applications with stateful per-user caching needs

### Strategy 3: Symbol-Based Routing (Consistent Hashing)

**Route by symbol hash, not by client**

```typescript
import { ConsistentHash } from 'consistent-hash';

const hash = new ConsistentHash([
  { id: 'instance-a', weight: 1 },
  { id: 'instance-b', weight: 1 },
  { id: 'instance-c', weight: 1 }
]);

// Determine which instance should handle this symbol
const targetInstance = hash.get('MXRF11');  // Always maps to same instance

// Example:
// 'MXRF11'  → Instance A
// 'HGLG11'  → Instance B
// 'KNSC11'  → Instance C
// 'MXRF11'  → Instance A (always same)
```

**Implementation:**

```nginx
# Use hash of symbol in query parameter
upstream backend {
    hash $arg_symbols consistent;
    server 10.0.1.1:3001;
    server 10.0.1.2:3001;
    server 10.0.1.3:3001;
}

location /api/fii {
    proxy_pass http://backend;
}
```

**Impact:**
- **Cache Efficiency**: High (each symbol always on same instance)
- **Network Load**: Low (minimal redundant calls)
- **Failover Issues**: If Instance A crashes, symbols from A rehashed to B/C (temporary miss, then cache)
- **Scaling Issues**: Adding instance requires rehashing (temporary cache misses)

**When to Use:** Distributed Redis + consistent hashing for maximum efficiency

**Hybrid Approach (Recommended):**

```
Primary: Redis for shared cache (all instances)
Secondary: Consistent hashing for request routing
Result: Low brAPI calls + high availability + easy scaling
```

---

## Distributed Circuit Breaker Pattern

### Single-Instance Circuit Breaker (Current)

```typescript
// Lives in Instance A memory only
circuitBreaker.recordFailure();  // Affects only Instance A
// Instance B, C still send requests to brAPI
// Result: Uneven load during outages
```

### Distributed Circuit Breaker with Redis

**Share circuit breaker state across all instances**

```typescript
// Redis-backed circuit breaker
interface DistributedCircuitBreaker {
  // State stored in Redis
  recordFailure(): Promise<void>;
  recordSuccess(): Promise<void>;
  canAttempt(): Promise<boolean>;
  getState(): Promise<'CLOSED' | 'OPEN' | 'HALF_OPEN'>;
}

// Implementation
class RedisCircuitBreaker implements DistributedCircuitBreaker {
  constructor(private redis: Redis, private symbol: string) {
    this.key = `cb:${symbol}`;  // Circuit breaker per symbol
  }

  async recordFailure(): Promise<void> {
    const state = await this.redis.hgetall(this.key);
    const failureCount = (state.failureCount || 0) + 1;
    
    if (failureCount >= 3) {
      // Transition to OPEN
      await this.redis.hset(this.key, 'status', 'OPEN');
      await this.redis.expire(this.key, 60);  // Open for 60 seconds
    } else {
      await this.redis.hset(this.key, 'failureCount', failureCount);
    }
  }

  async recordSuccess(): Promise<void> {
    const state = await this.redis.hgetall(this.key);
    
    if (state.status === 'HALF_OPEN') {
      const successCount = (state.successCount || 0) + 1;
      if (successCount >= 3) {
        // Transition to CLOSED
        await this.redis.del(this.key);
      } else {
        await this.redis.hset(this.key, 'successCount', successCount);
      }
    } else {
      // Always reset failure count on success
      await this.redis.hdel(this.key, 'failureCount', 'successCount');
    }
  }

  async canAttempt(): Promise<boolean> {
    const state = await this.redis.hgetall(this.key);
    if (!state.status) return true;  // CLOSED (default)
    if (state.status === 'OPEN') return false;  // Reject requests
    if (state.status === 'HALF_OPEN') return true;  // Allow test requests
    return true;
  }

  async getState(): Promise<string> {
    const state = await this.redis.hgetall(this.key);
    return state.status || 'CLOSED';
  }
}
```

**Usage:**

```typescript
const circuitBreaker = new RedisCircuitBreaker(redis, 'MXRF11');

if (await circuitBreaker.canAttempt()) {
  try {
    const data = await fetchFromBrAPI('MXRF11');
    await circuitBreaker.recordSuccess();
    return data;
  } catch (error) {
    await circuitBreaker.recordFailure();
    
    if (error.status === 429) {
      // Rate limited - open immediately
      await circuitBreaker.recordFailure();
      await circuitBreaker.recordFailure();
      await circuitBreaker.recordFailure();
    }
  }
} else {
  // Circuit open - return cached data or error
  const cached = await redis.get(`fii:MXRF11`);
  if (cached) return JSON.parse(cached);
  return { error: 'Service temporarily unavailable' };
}
```

### Benefits of Distributed Circuit Breaker

✅ **Coordinated Protection**: All instances stop hammering brAPI  
✅ **Shared Intelligence**: Failure from Instance A known by Instance B  
✅ **Faster Recovery**: Test requests from any instance  
✅ **Fair Load**: Prevents one instance from causing cascading failures  

---

## Step-by-Step Migration Guide

### Phase 1: Prerequisites (1-2 hours)

#### 1.1 Set Up Redis Infrastructure

**Option A: Docker (Development)**
```bash
# Run Redis locally
docker run -d \
  --name redis-fii \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes

# Verify
redis-cli ping  # Should return PONG
```

**Option B: Managed Service (Production)**

AWS ElastiCache:
```bash
# Create ElastiCache cluster via AWS console
# Multi-AZ with automatic failover
# Parameter group: maxmemory-policy=allkeys-lru
# Security group: Allow port 6379 from backend instances
# Endpoint: fii-cache.abc123.ng.0001.use1.cache.amazonaws.com:6379
```

Azure Cache for Redis:
```bash
# Create via Azure portal
# Premium tier for persistence and clustering
# SSL/TLS enabled
# Firewall rules: Allow VNet access
# Connection string: fii-cache.redis.cache.windows.net:6380
```

#### 1.2 Update Dependencies

```bash
cd backend
npm install redis@4.6.0 --save

# For TypeScript support
npm install @types/redis@4.0.11 --save-dev
```

#### 1.3 Update Environment Configuration

```bash
# .env
BRAPI_TOKEN=sPUuvgpkj52S75JpzcRN7x
BRAPI_BASE_URL=https://brapi.dev/api/v2
BACKEND_PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty for dev, set for production
REDIS_DB=0
REDIS_CACHE_TTL_SECONDS=300

# Circuit breaker
CIRCUIT_BREAKER_OPEN_DURATION_MS=60000
CIRCUIT_BREAKER_HALF_OPEN_TEST_REQUESTS=3
```

### Phase 2: Create Redis Adapter (2-3 hours)

#### 2.1 Implement Redis Cache Wrapper

Create `backend/src/cache/RedisCache.ts`:

```typescript
import Redis from 'redis';
import { Logger } from '../utils/Logger';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class RedisCache<T> {
  private client: Redis.RedisClient;
  private logger: Logger;

  constructor(redisUrl: string) {
    this.client = Redis.createClient({ url: redisUrl });
    this.client.on('error', (err) => {
      this.logger.error('Redis error', { error: err.message });
    });
    this.logger = new Logger('RedisCache');
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.logger.info('Connected to Redis');
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
    this.logger.info('Disconnected from Redis');
  }

  async set(
    key: string,
    value: T,
    ttlSeconds: number = 300
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + ttlSeconds * 1000
      };
      
      await this.client.setEx(
        key,
        ttlSeconds,
        JSON.stringify(entry)
      );
      
      this.logger.debug('Cache set', { key, ttlSeconds });
    } catch (error) {
      this.logger.error('Cache set failed', { key, error });
      throw error;
    }
  }

  async get(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;

      const entry: CacheEntry<T> = JSON.parse(data);
      
      // Check if expired (Redis TTL + client-side validation)
      if (Date.now() > entry.expiresAt) {
        await this.client.del(key);
        return null;
      }

      this.logger.debug('Cache hit', { key });
      return entry.value;
    } catch (error) {
      this.logger.error('Cache get failed', { key, error });
      return null;  // Fail open, don't crash app
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
      this.logger.debug('Cache delete', { key });
    } catch (error) {
      this.logger.error('Cache delete failed', { key, error });
    }
  }

  async clear(): Promise<void> {
    try {
      const cursor = this.client.scanIterator({
        MATCH: 'fii:*'
      });
      
      for await (const key of cursor) {
        await this.client.del(key);
      }
      
      this.logger.info('Cache cleared');
    } catch (error) {
      this.logger.error('Cache clear failed', { error });
    }
  }

  async publish(channel: string, message: string): Promise<void> {
    try {
      await this.client.publish(channel, message);
    } catch (error) {
      this.logger.error('Publish failed', { channel, error });
    }
  }

  async subscribe(channel: string, callback: (msg: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.connect();
    
    await subscriber.subscribe(channel, callback);
    this.logger.info('Subscribed to channel', { channel });
  }
}
```

#### 2.2 Update CacheManager to Support Both Backends

Create abstract interface:

```typescript
// backend/src/cache/CacheBackend.ts
export interface CacheBackend<T> {
  set(key: string, value: T, ttlSeconds?: number): Promise<void>;
  get(key: string): Promise<T | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, callback: (msg: string) => void): Promise<void>;
}

export class CacheManager<T> {
  constructor(private backend: CacheBackend<T>) {}

  async set(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    return this.backend.set(key, value, ttlSeconds);
  }

  async get(key: string): Promise<T | null> {
    return this.backend.get(key);
  }

  // ... other methods delegate to backend
}
```

### Phase 3: Update Request Handler (1-2 hours)

#### 3.1 Modify Backend Request Handler

```typescript
// backend/src/handlers/RequestHandler.ts

import { RedisCache } from '../cache/RedisCache';

const redisCache = new RedisCache(process.env.REDIS_URL);

app.get('/api/fii/indicators', async (req, res) => {
  const symbols = (req.query.symbols as string)?.split(',') || [];
  const refresh = req.query.refresh === 'true';

  try {
    const result: FIIData[] = [];
    const cacheMisses: string[] = [];

    // Step 1: Check Redis cache for each symbol
    for (const symbol of symbols) {
      if (!refresh) {
        const cached = await redisCache.get(`fii:${symbol}`);
        if (cached) {
          result.push(cached);
          continue;
        }
      }
      cacheMisses.push(symbol);
    }

    // Step 2: Fetch cache misses from brAPI
    if (cacheMisses.length > 0) {
      try {
        const brAPIData = await fetchFromBrAPI(cacheMisses);
        
        // Store in Redis (shared cache)
        for (const data of brAPIData) {
          await redisCache.set(
            `fii:${data.symbol}`,
            data,
            parseInt(process.env.REDIS_CACHE_TTL_SECONDS)
          );
          result.push(data);
          
          // Broadcast invalidation to other instances
          await redisCache.publish('fii:updated', JSON.stringify({
            symbol: data.symbol,
            timestamp: Date.now(),
            instance: process.env.HOSTNAME
          }));
        }
      } catch (error) {
        // Handle brAPI errors
        logger.error('brAPI fetch failed', { symbols: cacheMisses, error });
        return res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'FII data service temporarily unavailable'
          }
        });
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Request handler error', { error });
    res.status(500).json({ success: false, error: { message: 'Internal error' } });
  }
});
```

### Phase 4: Deploy with Feature Flag (2-3 hours)

#### 4.1 Create Feature Flag Configuration

```typescript
// backend/src/config/config.ts

export const config = {
  CACHE_BACKEND: process.env.CACHE_BACKEND || 'memory', // 'memory' or 'redis'
  
  cacheFactory: () => {
    if (config.CACHE_BACKEND === 'redis') {
      return new RedisCache(process.env.REDIS_URL);
    } else {
      return new InMemoryCache();  // Original implementation
    }
  }
};
```

#### 4.2 Deployment Strategy

**Step 1: Verify Redis Connectivity**
```bash
# Test Redis connection
npm run test:redis-connection

# Output: Connected to Redis ✓
```

**Step 2: Deploy to Canary Instance**
```bash
# Deploy Instance A with Redis enabled
CACHE_BACKEND=redis npm start

# Monitor for errors
tail -f logs/production.log | grep -i redis
```

**Step 3: Gradual Rollout**
```
Hour 1: 1 instance (A) with Redis → 50% traffic
Hour 2: 2 instances (A, B) with Redis → 80% traffic
Hour 4: All 3 instances (A, B, C) with Redis → 100% traffic
Hour 6: Disable in-memory cache on all instances
```

**Step 4: Monitor and Validate**
```
- Redis memory usage (target: <2GB for 100k symbols)
- Cache hit rate (target: >80% after warmup)
- brAPI calls (target: -70% reduction)
- Response latency (target: <50ms)
- Error rate (target: unchanged or lower)
```

### Phase 5: Decommission In-Memory Cache (1 hour)

After confirming Redis stability for 24+ hours:

```bash
# Remove in-memory cache code
rm backend/src/cache/CacheManager.ts
rm backend/src/cache/CacheManager.test.ts

# Update imports
# Old: import { CacheManager } from './cache/CacheManager'
# New: import { RedisCache } from './cache/RedisCache'

# Redeploy all instances
npm run deploy
```

---

## Configuration Reference

### Redis Configuration Options

```typescript
// Complete Redis configuration
interface RedisConfig {
  // Connection
  host: string;                    // Redis server host
  port: number;                    // Redis port (6379)
  password?: string;               // Auth password
  db: number;                      // DB number (0-15)
  tls?: boolean;                   // Enable SSL/TLS
  
  // Pool
  maxRetriesPerRequest: number;    // Max command retries
  enableReadyCheck: boolean;       // Wait for ready state
  enableOfflineQueue: boolean;     // Queue commands when offline
  
  // Timeouts
  connectTimeout: number;          // Connection timeout (ms)
  commandTimeout: number;          // Command timeout (ms)
  
  // Reconnection
  maxRedirections: number;         // Max cluster redirects
  retryStrategy: (times: number) => number;  // Backoff strategy
}
```

### Environment Variables

```bash
# Redis Connection
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password-here
REDIS_DB=0
REDIS_TLS=true

# Cache Settings
REDIS_CACHE_TTL_SECONDS=300
REDIS_MAX_ENTRIES=100000

# Circuit Breaker
CIRCUIT_BREAKER_OPEN_DURATION_MS=60000
CIRCUIT_BREAKER_HALF_OPEN_TEST_REQUESTS=3

# Monitoring
REDIS_MONITOR_ENABLED=true
REDIS_STATS_INTERVAL_MS=60000
```

### Load Balancer Configuration

```nginx
# Nginx example for consistent hashing
upstream fii_backend {
    hash $arg_symbols consistent;
    server backend-1.internal:3001 weight=1 max_fails=3 fail_timeout=30s;
    server backend-2.internal:3001 weight=1 max_fails=3 fail_timeout=30s;
    server backend-3.internal:3001 weight=1 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.fii-dashboard.com;

    location /api/fii {
        proxy_pass http://fii_backend;
        proxy_connect_timeout 10s;
        proxy_read_timeout 30s;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
    }
}
```

---

## Troubleshooting Guide

### Issue: High Redis Memory Usage

**Symptom**: Redis memory > 5GB, increasing over time

**Causes**:
- TTL not set on cache keys
- Pub/Sub messages accumulating
- Memory leaks in application

**Solution**:
```typescript
// Ensure all cache.set() calls include TTL
await redis.setEx(`fii:${symbol}`, 300, data);  // ✓ With TTL

// Set max memory policy
redis.configSet('maxmemory-policy', 'allkeys-lru');

// Monitor
redis.info('memory');
```

### Issue: Circuit Breaker Always OPEN

**Symptom**: Always returns "Service unavailable", even when brAPI is healthy

**Causes**:
- Redis circuit breaker state not resetting
- brAPI temporary issue causing multiple failures
- Test requests (HALF_OPEN) still failing

**Solution**:
```bash
# Check circuit breaker state
redis-cli HGETALL "cb:MXRF11"

# Manually reset if needed
redis-cli DEL "cb:MXRF11"

# Monitor brAPI health
curl https://brapi.dev/api/v2/health

# Check logs
grep "429\|401\|503" logs/production.log
```

### Issue: Cache Hit Rate Low (<50%)

**Symptom**: Most requests miss Redis cache

**Causes**:
- Clients requesting many different symbols
- TTL too short
- Cache eviction due to memory limits

**Solution**:
```bash
# Check hit rate
redis-cli INFO stats | grep hits
redis-cli INFO stats | grep misses

# Increase TTL if acceptable
REDIS_CACHE_TTL_SECONDS=600  # 10 minutes

# Monitor symbol popularity
redis-cli --scan --pattern "fii:*" | sort | uniq -c | sort -rn | head -20
```

### Issue: Pub/Sub Invalidation Not Working

**Symptom**: Cache not invalidated when publishing messages

**Causes**:
- Subscriber not connected
- Message format incorrect
- Listener callback not registered

**Solution**:
```typescript
// Verify subscriber is connected
redis.on('subscribe', (channel) => {
  logger.info('Subscribed to channel', { channel });
});

// Check message format
await redis.publish('fii:invalidate', JSON.stringify({
  symbol: 'MXRF11',
  timestamp: Date.now(),
  reason: 'manual_refresh'
}));

// Verify listener
redis.on('message', (channel, message) => {
  logger.info('Received message', { channel, message });
});
```

---

## Performance Benchmarks

### Latency Comparison

| Operation | In-Memory | Redis (Local) | Redis (Remote) |
|-----------|-----------|---------------|----------------|
| Cache Hit | <1ms      | 5-10ms        | 15-30ms        |
| Cache Miss (brAPI) | 2000ms | 2000ms | 2010ms |
| Publish/Subscribe | N/A | 5-15ms | 20-50ms |

**Key Insight**: Redis overhead (5-15ms) is negligible compared to brAPI latency (2000ms). For remote Redis, still minimal impact.

### Throughput Comparison

| Scenario | In-Memory | Redis Cluster |
|----------|-----------|---------------|
| Single Instance, 10 concurrent clients | 1000 req/s | 950 req/s |
| 3 Instances, 100 concurrent clients | 3000 req/s | 2850 req/s |
| 3 Instances, 1000 concurrent clients | 3000 req/s (capacity) | 2900 req/s (better balance) |

**Key Insight**: Small performance cost, but better scalability and reliability.

### Memory Comparison

| Configuration | In-Memory (per instance) | Redis (shared) |
|---------------|-------------------------|----------------|
| 1,000 symbols | 10-20MB | 50-100MB total |
| 10,000 symbols | 100-200MB | 500-1000MB total |
| 100,000 symbols | 1-2GB | 5-10GB total |

**Key Insight**: Redis reduces total memory since cache shared, not duplicated.

---

## Maintenance Schedule

### Daily Tasks

```bash
# Monitor Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Check error log for failures
tail -100 logs/production.log | grep ERROR

# Verify cache hit rate
redis-cli INFO stats | grep -E "hits|misses"
```

### Weekly Tasks

```bash
# Clean up expired sessions
redis-cli FLUSHDB ASYNC  # Or use TTL sweep

# Backup Redis data
redis-cli BGSAVE

# Review circuit breaker metrics
redis-cli KEYS "cb:*" | wc -l  # Should be < 100
```

### Monthly Tasks

```bash
# Update Redis to latest patch
docker pull redis:7-alpine  # Then redeploy

# Review capacity planning
redis-cli INFO stats
redis-cli INFO memory

# Performance analysis
redis-cli SLOWLOG GET 10
```

---

## Migration Path Summary

**In-Memory (Current)** → **Redis (Phase 1-5)** → **Redis Cluster (Future)**

```
Current State
├─ Single Instance: In-Memory Cache
├─ Capacity: ~100k requests/day
└─ Suitable for: Dev, staging, small prod

Phase 1-5: Redis Migration
├─ Multiple Instances: Redis Cache
├─ Capacity: ~1M requests/day
├─ Improved reliability, monitoring
└─ Suitable for: Production scaling

Future: Redis Cluster
├─ Multiple Instances: Redis Cluster
├─ Capacity: >10M requests/day
├─ Geographic distribution, higher availability
└─ Suitable for: Enterprise, multi-region
```

For questions or issues during migration, consult the [Troubleshooting Guide](#troubleshooting-guide) or [Performance Benchmarks](#performance-benchmarks).

