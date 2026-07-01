# Distributed Deployment: Consistency, Performance, and Complexity Trade-offs

## Executive Summary

Scaling from single-instance (in-memory cache) to multi-instance deployment (Redis cache) involves fundamental trade-offs:

| Aspect | In-Memory | Redis | Trade-off |
|--------|-----------|-------|-----------|
| **Complexity** | Low | Medium | +Ops effort, +Infrastructure |
| **Performance** | Fastest (<1ms cache) | Fast (5-15ms cache) | -15ms per request |
| **Scalability** | ~100k req/day | 1M+ req/day | +10x capacity |
| **Consistency** | Per-instance | Shared | +Data consistency |
| **Cost** | Compute only | Compute + Redis | +$200-500/month |
| **Uptime** | Instance-dependent | Redis-dependent | Needs Redis HA |

**When to Upgrade**: When traffic exceeds 100k requests/day or you need high availability.

---

## Consistency Guarantees

### Single-Instance Consistency (In-Memory Cache)

```
Time    Instance A              Cache
────────────────────────────────────────────
T0      User requests MXRF11    ✗ Miss
T0      Calls brAPI             ⏳ Fetching...
T1      brAPI returns 9.74      [MXRF11 → 9.74]
T2      User 2 requests MXRF11  ✓ Hit (9.74)
T3      Cache expires (5 min)   ✗ Evicted
T4      User 3 requests MXRF11  ✗ Miss (calls brAPI again)
```

**Guarantee**: If you're on Instance A, you get consistent data. If you restart, cache is lost.

**Limitation**: If multiple instances exist, each has different cache.

### Multi-Instance Consistency (Redis Cache)

```
Time    Instance A              Instance B          Redis
────────────────────────────────────────────────────────────
T0      User A: MXRF11 miss     User B: HGLG11 miss
T0      A calls brAPI           B calls brAPI       ⏳
T1      A: brAPI=9.74           B: brAPI=8.50       [MXRF11→9.74]
T1                                                  [HGLG11→8.50]
T2      User C requests MXRF11  User D requests HGLG11
T2      A → Redis hit (9.74)    B → Redis hit (8.50) ✓
T3      All users see same data from Redis        [All consistent]
T4      Cache expires (5 min)   Both instances see expiration
```

**Guarantee**: All instances serve same data from Redis. No duplication.

**Additional Guarantee**: If Instance A crashes, Instance B continues using cached data from Redis.

---

## Performance Implications

### Scenario 1: Symbol with High Request Volume

```
Symbol: MXRF11
Requests per second: 100
Cache TTL: 5 minutes

───────────────────────────────────────────────────────────────
Time            In-Memory              Redis
───────────────────────────────────────────────────────────────
T0:00           Request #1 → brAPI     Request #1 → brAPI
T0:01           Requests #2-100 → Cache hit (0.5ms each)
T0:02           All requests hit (0.5ms)
...
T4:59           All requests hit (0.5ms)
T5:00           Request #301 → brAPI   Request #301 → Redis
                Cache expired, miss    Hit from Redis (15ms), TTL reset

Total API calls:
- In-Memory: 1 (per 5 min)
- Redis: 1 (per 5 min)  ✓ Same efficiency

Latency:
- In-Memory: 0.5ms cache hits
- Redis: 15ms cache hits (-14.5ms per request)
- Total impact: 100 req/s × -14.5ms = -1450ms/s = cost of 1-2 CPU cores
───────────────────────────────────────────────────────────────
```

**Impact Analysis**:
- Redis slower for cache hits BUT negligible vs 2000ms brAPI call
- Trade-off: Accept 15ms overhead for consistency and scalability

### Scenario 2: Cold Start (All Caches Empty)

```
Scenario: Restart all 3 backend instances

───────────────────────────────────────────────────────────────
Time    In-Memory (3 inst)      Redis (3 inst)
───────────────────────────────────────────────────────────────
T0      All 3 instances start   All 3 instances start
T0+5s   Instance A: 100 miss → brAPI  Instance A: 100 miss → brAPI
        Instance B: 100 miss → brAPI  Instance B: 100 miss → brAPI
        Instance C: 100 miss → brAPI  Instance C: 100 miss → brAPI
                                      (All caches now synchronized)
T0+10s  User 1 → Inst A: hit    User 1 → any Inst: Redis hit ✓
        User 2 → Inst B: hit    User 2 → any Inst: Redis hit ✓
        User 3 → Inst C: hit    User 3 → any Inst: Redis hit ✓

Result: Duplicate brAPI calls (3×) vs synchronized (1×)
Recovery: After 5-10 seconds, both reach steady state
───────────────────────────────────────────────────────────────
```

**Impact**: Cold start penalty (few seconds) vs in-memory, but faster recovery to consistent state.

---

## Scalability Analysis

### In-Memory Scaling

```
Instances  Capacity         brAPI Calls/day   Memory/Inst   Total Memory
1          100k req/day     20k calls         200MB         200MB
2          100k req/day     40k calls         200MB         400MB (!)
3          100k req/day     60k calls         200MB         600MB (!)
10         100k req/day     200k calls        200MB         2GB (!)

Problem: Cache not shared → duplicate brAPI calls
Result: Cannot scale beyond single instance for large request volumes
```

### Redis Scaling

```
Instances  Capacity         brAPI Calls/day   Memory/Inst   Total Redis
1          100k req/day     20k calls         10MB local    50MB
2          1M req/day       200k calls        10MB local    50MB (shared!)
3          2M req/day       200k calls        10MB local    50MB (shared!)
10         5M req/day       200k calls        10MB local    50MB (shared!)
20         10M req/day      200k calls        10MB local    50MB (shared!)

Benefit: Same brAPI calls regardless of instance count
Result: Scale to 10M+ requests/day by adding instances
```

**Key Insight**: Redis enables horizontal scaling. In-memory doesn't.

---

## Complexity Layers

### In-Memory Cache Complexity

```
Layers: 1
┌──────────────────────┐
│  Backend Instance    │
│  ┌────────────────┐  │
│  │ In-Memory Cache│  │  ← Managed by Node.js
│  └────────────────┘  │
│  (Lost on restart)   │
└──────────────────────┘
```

**Operational Overhead**: Low
- No external dependencies
- No network issues
- No authentication to manage
- Simple disaster recovery (restart)

### Redis Complexity

```
Layers: 2
┌──────────────────────────────────────────────┐
│                Load Balancer                 │  ← Route requests
├──────────────┬───────────────┬───────────────┤
│  Backend A   │  Backend B    │  Backend C    │  ← Multiple instances
└──────┬───────┴────────┬──────┴───────┬───────┘
       │                │              │
       └────────────────┼──────────────┘
                        │
                   ┌────▼─────────────────┐
                   │  Redis (Shared)      │  ← Shared cache layer
                   │  ┌────────────────┐  │
                   │  │  Primary node  │  │  ← Master
                   │  │  Replica 1     │  │  ← Backup
                   │  │  Replica 2     │  │  ← Backup
                   │  └────────────────┘  │
                   └──────────────────────┘
```

**Operational Overhead**: Medium
- Monitor Redis connectivity
- Handle Redis failover
- Manage Redis password/auth
- Plan Redis capacity
- Backup Redis data
- Learn Pub/Sub patterns

### Distributed Deployment Complexity

```
Layers: 3
┌──────────────────────────────────────────────────────────────┐
│                  Monitoring & Alerting                       │  ← Prometheus, DataDog
├──────────────────────────────────────────────────────────────┤
│  Load Balancer (Route by symbol hash or sticky sessions)    │  ← Nginx, HAProxy
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Instance A  │  Instance B  │  Instance C  │  Instance D    │  ← Horizontal scaling
│  + Circuit   │  + Circuit   │  + Circuit   │  + Circuit     │
│    Breaker   │    Breaker   │    Breaker   │    Breaker     │
└──────┬───────┴───────┬──────┴───────┬──────┴────────┬────────┘
       │               │              │               │
       └───────────────┼──────────────┴───────────────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
    ┌────▼──────────┐      ┌────────▼────┐
    │ Redis Primary │      │  Pub/Sub    │  ← Cache invalidation
    │   (Cache)     │      │  Channel    │
    └────┬──────────┘      └─────────────┘
         │
    ┌────▼───────┐
    │  Backups   │
    └────────────┘
```

**Operational Overhead**: High
- Manage load balancer rules
- Monitor all components
- Handle cascading failures
- Coordinate circuit breaker state
- Debug multi-instance issues
- Scale instances up/down

**Trade-off**: Complexity accepted for scalability and reliability.

---

## Failure Mode Analysis

### In-Memory: Instance Crash

```
Normal State:
┌─────────────────────┐
│  Instance A         │
│  [Cache: MXRF11]    │
└─────────────────────┘
         ↓ receives requests ↓

After Crash:
┌─────────────────────┐
│  Instance A         │
│  [Cache: EMPTY]     │  ← Lost on crash
└─────────────────────┘
         ↓ cold start: all requests miss ↓

Users Experience: 
- 5-10 seconds of slow responses (all cache misses)
- Then normal after cache warms up
```

### Redis: Instance Crash

```
Normal State:
┌──────────────┐         ┌──────────────┐
│  Instance A  │  ──→    │  Redis Cache │
│  (local ✓)   │         │  [All data]  │
└──────────────┘         └──────────────┘

After Instance A Crash:
┌──────────────┐         ┌──────────────┐
│  Instance A  │  ✗      │  Redis Cache │
│  (down)      │  ────→  │  [All data]  │
└──────────────┘         └──────────────┘
                            ↑
┌──────────────┐            │
│  Instance B  │  ───────────┘
│  (takes over)│

Users Experience:
- Immediate failover to Instance B
- B retrieves cached data from Redis
- No cache miss, no slow responses
```

**Key Difference**: Redis enables failover without user impact.

---

## Cost Comparison

### In-Memory Deployment

```
Monthly Cost Analysis:

Infrastructure:
  - 1 t3.medium instance (prod): $35/month
  
Operations:
  - Downtime during maintenance: $500-5000/incident
  - Cold starts: customers experience latency
  
Bandwidth:
  - brAPI calls: Free (internal API)
  
Licenses:
  - All open source: $0

Total: ~$35/month + incident costs
```

### Redis Deployment

```
Monthly Cost Analysis:

Infrastructure:
  - 3 t3.medium instances: $105/month
  - Redis (self-hosted, t3.small): $30/month
  OR AWS ElastiCache (managed): $60-100/month
  
Operations:
  - Additional monitoring: $0-50/month
  - Team training time: ~40 hours
  - Operations overhead: ~5 hours/month
  
Bandwidth:
  - Redis traffic (local): $0-5/month
  - brAPI calls (70% fewer): $0 (same contract)
  
Licenses:
  - All open source: $0

Total: ~$200-250/month + 5 hours/month ops
```

### Cost Justification

```
Scenario: Traffic grows from 100k to 500k requests/day

With In-Memory:
- Need 5 instances (each 100k capacity)
- 5 × $35 = $175 (compute)
- BUT: 5 × duplicate cache = 5 brAPI calls per symbol
- Result: 500k → 2.5M brAPI calls (overload)
- Need API upgrade: +$500/month
- Total: $175 + $500 = $675/month

With Redis:
- Need 5 instances (each 1M capacity)
- 5 × $35 = $175 (compute)
- 1 Redis cluster = $100
- Shared cache: 500k → 200k brAPI calls
- No API upgrade needed
- Total: $175 + $100 = $275/month

Savings: $675 - $275 = $400/month
Plus: High availability, no downtime
```

---

## Decision Matrix

| Factor | In-Memory | Redis | Recommended |
|--------|-----------|-------|-------------|
| **Traffic < 100k/day** | ✓ | ✗ | In-Memory |
| **Traffic 100k-1M/day** | ✗ | ✓ | Redis |
| **High availability required** | ✗ | ✓ | Redis |
| **Multi-region deployment** | ✗ | ✓ | Redis |
| **Minimal ops overhead** | ✓ | ✗ | In-Memory |
| **Cost-sensitive** | ✓ | ✗ | In-Memory (initially) |
| **Scaling planned** | ✗ | ✓ | Redis |
| **Real-time consistency** | △ | ✓ | Redis |
| **Simple deployment** | ✓ | ✗ | In-Memory |
| **Zero-downtime updates** | ✗ | ✓ | Redis |

### Decision Tree

```
Start: What's your deployment requirement?

├─ "Just testing locally"
│  └─ Use: In-Memory (default)
│
├─ "Small production, 1 region, OK with occasional downtime"
│  └─ Use: In-Memory (simpler, adequate)
│
├─ "Growing traffic, need to scale"
│  └─ Use: Redis (plan for future growth)
│
├─ "Enterprise: high availability, multi-region"
│  └─ Use: Redis + Redis Cluster (full HA)
│
└─ "Not sure, want to defer decision"
   └─ Use: In-Memory now, migrate to Redis later (path documented)
```

---

## Consistency vs Performance Trade-off Summary

```
Consistency Level:

In-Memory (Per-Instance):
  User A (Instance 1) → sees data X at T0
  User B (Instance 2) → sees data Y at T0
  (Two different answers to same question!)

Redis (Shared):
  User A (Instance 1) → sees data X at T0
  User B (Instance 2) → sees data X at T0
  (Same answer, consistent)

Performance Level:

In-Memory:
  Cache hit: <1ms

Redis:
  Cache hit: 10-20ms
  Difference: +15-20ms
  At 100 req/s: +1500-2000ms total (cost ~1 CPU core)
  But: Shared consistency worth it

Complexity Level:

In-Memory: ░░░░░ (low)
Redis:     ░░░░░░░░░░ (medium-high)

When to Choose:
- In-Memory: < 100k req/day, single region, acceptable downtime
- Redis: > 100k req/day, multi-instance, HA needed
```

---

## Hybrid Strategy: Best of Both Worlds

### Approach: In-Memory + Redis

```typescript
// Dual-layer caching
class HybridCache {
  private local = new InMemoryCache();      // L1: <1ms
  private redis = new RedisCache();         // L2: 15ms
  
  async get(key: string): Promise<T> {
    // Try local first (fastest)
    let value = this.local.get(key);
    if (value) return value;
    
    // Fall back to Redis
    value = await this.redis.get(key);
    if (value) {
      // Populate local cache for next access
      this.local.set(key, value);
      return value;
    }
    
    // Cache miss
    return null;
  }
}
```

**Benefits**:
- L1 (local): <1ms for frequently used symbols
- L2 (Redis): Fallback, shared across instances
- Cold start: L1 cold, L2 warm (uses Redis data)

**Complexity**: Higher, but manageable

**Performance**: Near-in-memory speeds + distributed consistency

**When to Use**: Enterprise deployments with high performance requirements

---

## Recommendation Summary

**For FII Dashboard**:

1. **Now (Development)**: In-Memory cache sufficient
2. **Growth Phase (100k-500k req/day)**: Migrate to Redis (documented path)
3. **Scale Phase (500k-5M req/day)**: Redis + consistent hashing + Pub/Sub
4. **Enterprise (5M+ req/day)**: Hybrid cache + Redis Cluster

**Action**:
- ✅ Keep documentation updated
- ✅ Monitor traffic growth
- ✅ When 80k req/day achieved, begin Redis migration
- ✅ Canary deployment (1 instance)
- ✅ Gradual rollout (monitor metrics)
- ✅ Full migration after 24-hour stability

See [Distributed Deployment Guide](./src/cache/DISTRIBUTED_DEPLOYMENT.md) for implementation details.

