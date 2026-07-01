# FII Dashboard - Deployment Guide

## Quick Reference

### Single-Instance Deployment (Current Default)

```bash
# Development/Small Production
npm install
npm run build
BRAPI_TOKEN=<your-token> npm start

# Capacity: <100k requests/day
# Best for: Dev, staging, single-region prod
```

### Multi-Instance Deployment (Recommended for Scale)

```bash
# Production/High Traffic
npm install
npm run build

# Start 3 instances with Redis cache
BRAPI_TOKEN=<token> REDIS_URL=redis://redis.internal:6379 npm start
# Run on separate servers or containers

# Load balancer routes requests to instances
# All instances share Redis cache
# Capacity: 1M+ requests/day
```

---

## Deployment Scenarios

### Scenario 1: Development Environment

**Setup**: Single machine, single Node.js instance, in-memory cache

```bash
# .env
BRAPI_TOKEN=sPUuvgpkj52S75JpzcRN7x
BACKEND_PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
CACHE_BACKEND=memory

# Start
npm install
npm run dev  # With hot reload

# Test
curl http://localhost:3001/api/fii/indicators?symbols=MXRF11,HGLG11
```

### Scenario 2: Staging Environment

**Setup**: Single server, but Redis for cache (test Redis config before prod)

```bash
# .env
BRAPI_TOKEN=<staging-token>
BACKEND_PORT=3001
NODE_ENV=staging
LOG_LEVEL=info
CACHE_BACKEND=redis
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL_SECONDS=300

# Start
npm install
npm run build
npm start

# Monitor
npm run monitor  # Shows cache stats
```

### Scenario 3: Production (Single AZ, 3 Instances)

**Setup**: Load balancer + 3 backend instances + Redis (managed or self-hosted)

```bash
# Infrastructure (Terraform/CloudFormation)
resource "aws_elasticache_cluster" "redis_cache" {
  cluster_id           = "fii-cache"
  engine               = "redis"
  node_type            = "cache.t3.micro"
  num_cache_nodes      = 1
  port                 = 6379
  parameter_group_name = "default.redis7"
}

resource "aws_lb" "backend" {
  name               = "fii-backend-lb"
  internal           = true
  load_balancer_type = "network"
}

resource "aws_lb_target_group" "backend" {
  name        = "fii-backend"
  port        = 3001
  protocol    = "TCP"
  vpc_id      = aws_vpc.main.id
}

resource "aws_instance" "backend" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  
  user_data = base64encode(file("deploy/startup.sh"))
}
```

```bash
# Deploy script (deploy/startup.sh)
#!/bin/bash
cd /opt/fii-backend
git clone <repo> .
npm install --production
npm run build

# Set environment
cat > .env << EOF
BRAPI_TOKEN=${BRAPI_TOKEN}
REDIS_URL=redis://fii-cache.abc123.ng.0001.use1.cache.amazonaws.com:6379
BACKEND_PORT=3001
NODE_ENV=production
LOG_LEVEL=info
CACHE_BACKEND=redis
EOF

# Start service
systemctl start fii-backend
systemctl status fii-backend
```

### Scenario 4: Production (Multi-AZ, 6 Instances)

**Setup**: 2 AZs, 3 instances per AZ, Redis Cluster (3 nodes with replication)

```bash
# .env (same across all instances)
BRAPI_TOKEN=<production-token>
REDIS_URL=redis://redis-cluster.prod.internal:6379
BACKEND_PORT=3001
NODE_ENV=production
LOG_LEVEL=info
CACHE_BACKEND=redis

# Redis Cluster setup
# Primary Redis in AZ-A (10.0.1.x)
# Replica in AZ-B (10.0.2.x)
# Sentinel monitors failover

# Load balancer: Layer 4 TCP with sticky sessions
# Consistent hashing on symbol parameter
```

---

## Configuration Changes Required

### Environment Variables

```bash
# Original (In-Memory Cache)
BRAPI_TOKEN=<token>
BACKEND_PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# With Redis
BRAPI_TOKEN=<token>
BACKEND_PORT=3001
NODE_ENV=production
LOG_LEVEL=info
CACHE_BACKEND=redis                           # NEW
REDIS_URL=redis://redis.internal:6379        # NEW
REDIS_CACHE_TTL_SECONDS=300                  # NEW
REDIS_PASSWORD=<password>                    # NEW (if auth enabled)
REDIS_TLS=true                               # NEW (if using ElastiCache/Azure)
CIRCUIT_BREAKER_OPEN_DURATION_MS=60000       # NEW
CIRCUIT_BREAKER_HALF_OPEN_TEST_REQUESTS=3    # NEW
```

### Code Changes

**Minimal - Only config changes needed**

```typescript
// backend/src/config/config.ts
export const getCacheBackend = () => {
  if (process.env.CACHE_BACKEND === 'redis') {
    return new RedisCache(process.env.REDIS_URL);
  }
  return new InMemoryCache();  // Default
};
```

### Docker Setup

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY src ./src
COPY tsconfig.json ./

RUN npm run build

EXPOSE 3001

# Read env from environment variables
CMD ["npm", "start"]
```

```bash
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      BRAPI_TOKEN: ${BRAPI_TOKEN}
      CACHE_BACKEND: redis
      REDIS_URL: redis://redis:6379
      NODE_ENV: production
    depends_on:
      - redis

volumes:
  redis_data:
```

---

## Cache Invalidation Strategies

### Strategy 1: Time-Based (Simple, Default)

```
Every cache entry expires after 5 minutes
All instances see same TTL
No explicit invalidation needed
Result: Simple, automatic cleanup
```

**Tradeoff**: 5 minutes of stale data possible

### Strategy 2: Pub/Sub-Based (Immediate)

```
When Instance A gets fresh data from brAPI:
1. Update Redis
2. Publish "fii:updated" message
3. All instances receive notification
4. All instances fetch fresh data or invalidate

Result: Immediate cache updates across instances
```

**Tradeoff**: More complex, requires Pub/Sub infrastructure

### Strategy 3: Hybrid (Recommended)

```
Combine both strategies:
- Always use TTL (safety net)
- Optionally publish invalidation (immediate when available)
- Graceful degradation if Pub/Sub fails
```

**Tradeoff**: Balance between simplicity and consistency

---

## Request Routing Patterns

### Pattern 1: Round-Robin Load Balancing

```
Request sequence:
1. User request → LB → Instance A → Redis hit → Return data
2. User request → LB → Instance B → Redis hit → Return data (same data)
3. User request → LB → Instance C → Redis hit → Return data (same data)

Result: Simple, all instances return consistent data from Redis
```

**Best for**: Distributed Redis backend (cache consistency guaranteed)

### Pattern 2: Consistent Hashing (Recommended)

```
Route by symbol hash:
- MXRF11 (hash) → Instance A
- HGLG11 (hash) → Instance B
- KNSC11 (hash) → Instance C

Result: Same symbol always goes to same instance
+ Better local cache efficiency (future in-memory)
+ Predictable behavior
- If instance crashes, symbol rehashed to different instance
```

**Best for**: Balancing efficiency with reliability

### Pattern 3: Sticky Sessions

```
Route by client IP/session:
- Client A → Always Instance A
- Client B → Always Instance B
- Client C → Always Instance C

Result: Predictable routing, session affinity
- Good for stateful per-client caching
- Bad for uneven load distribution
```

**Best for**: Applications with per-user state

---

## Monitoring and Health Checks

### Health Check Endpoint

```typescript
// backend/src/handlers/RequestHandler.ts
app.get('/health', async (req, res) => {
  try {
    // Check brAPI connectivity
    const brAPIHealthy = await checkBrAPIHealth();
    
    // Check Redis connectivity (if using)
    const redisHealthy = process.env.CACHE_BACKEND === 'redis' 
      ? await redis.ping()
      : true;

    const status = brAPIHealthy && redisHealthy ? 200 : 503;
    
    res.status(status).json({
      status: status === 200 ? 'healthy' : 'degraded',
      timestamp: new Date(),
      brAPI: brAPIHealthy,
      redis: redisHealthy
    });
  } catch (error) {
    res.status(503).json({ status: 'error' });
  }
});
```

### Load Balancer Health Check

```nginx
location /health {
    proxy_pass http://fii_backend;
    proxy_connect_timeout 5s;
    proxy_read_timeout 10s;
    
    # Mark as unhealthy if 503 returned
    # Remove from rotation after 3 failed checks
}
```

### Metrics to Monitor

```bash
# Redis metrics
redis-cli INFO stats    # Connections, commands, hits/misses
redis-cli INFO memory   # Memory usage, eviction events
redis-cli INFO clients  # Connected clients

# Application metrics
# Via logs:
# - Request count per symbol
# - Cache hit rate
# - brAPI call count
# - Error rate
# - Response latency

# Via HTTP endpoint:
curl http://localhost:3001/metrics
```

---

## Rollback Procedures

### From Redis Back to In-Memory

If Redis deployment fails:

```bash
# 1. Set feature flag back to in-memory
CACHE_BACKEND=memory npm start

# 2. Restart all instances
systemctl restart fii-backend

# 3. Monitor for errors
tail -f logs/production.log

# 4. If stable, commit rollback
git revert <redis-deployment-commit>
```

### From Multi-Instance to Single Instance

If multi-instance deployment causes issues:

```bash
# 1. Scale down to 1 instance
kubectl scale deployment fii-backend --replicas=1

# 2. Restore in-memory cache
CACHE_BACKEND=memory npm start

# 3. Monitor performance
npm run monitor

# 4. Investigate issues before retry
```

---

## Checklist: From In-Memory to Redis

- [ ] Redis infrastructure provisioned and tested
- [ ] REDIS_URL environment variable set
- [ ] Redis credentials/password configured
- [ ] TLS/SSL enabled (for remote Redis)
- [ ] Network connectivity verified (backend → Redis)
- [ ] Backup of original in-memory cache code created
- [ ] Feature flag (CACHE_BACKEND) working correctly
- [ ] Canary deployment to 1 instance complete
- [ ] Monitoring alerts configured (Redis memory, connection errors)
- [ ] Cache hit rate metrics baseline established (target: >80%)
- [ ] brAPI call reduction confirmed (target: >70% reduction)
- [ ] Error rate unchanged or improved
- [ ] Load test completed (concurrent users, symbols)
- [ ] 24-hour stability verification passed
- [ ] Documentation updated with Redis URLs
- [ ] Team trained on Redis operations
- [ ] Runbook for common issues reviewed
- [ ] Disaster recovery plan tested
- [ ] Production deployment approved

---

## Support and Troubleshooting

For common issues and solutions, see [Distributed Deployment Guide - Troubleshooting](./src/cache/DISTRIBUTED_DEPLOYMENT.md#troubleshooting-guide).

For performance analysis, see [Performance Benchmarks](./src/cache/DISTRIBUTED_DEPLOYMENT.md#performance-benchmarks).

For maintenance schedule, see [Maintenance Schedule](./src/cache/DISTRIBUTED_DEPLOYMENT.md#maintenance-schedule).

