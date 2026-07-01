# FII Dashboard Deployment Guide

A comprehensive guide for deploying the FII Dashboard application to development, staging, and production environments. This document covers environment configuration, deployment procedures, security setup, health monitoring, and troubleshooting.

## Table of Contents

1. [Prerequisites and System Requirements](#prerequisites-and-system-requirements)
2. [Environment Configuration](#environment-configuration)
3. [Backend Deployment](#backend-deployment)
4. [Frontend Deployment](#frontend-deployment)
5. [BRAPI_TOKEN Security Setup](#brapi_token-security-setup)
6. [REACT_APP_BACKEND_URL Configuration](#react_app_backend_url-configuration)
7. [Health Check Endpoint Setup](#health-check-endpoint-setup)
8. [Troubleshooting Common Issues](#troubleshooting-common-issues)
9. [Configuration by Environment](#configuration-by-environment)
10. [Scaling Considerations](#scaling-considerations)

---

## Prerequisites and System Requirements

### System Requirements

**Minimum Requirements:**
- Node.js: v18.0.0 or higher
- npm: v9.0.0 or higher (or yarn v3.0.0+, pnpm v7.0.0+)
- Operating System: Linux, macOS, or Windows (WSL2 recommended for Windows)
- RAM: 2GB minimum (4GB+ for production)
- CPU: 2+ cores minimum
- Disk Space: 2GB minimum for node_modules and build artifacts

**Recommended Requirements:**
- Node.js: v20.0.0 (LTS)
- npm: v10.0.0+
- RAM: 8GB+ (production)
- CPU: 4+ cores (production)
- Disk Space: 10GB+

### Required Tools

- **Git**: For version control and deployment automation
- **curl** or **wget**: For testing health check endpoints
- **Docker** (optional): For containerized deployments
- **kubectl** (optional): For Kubernetes deployments
- **PM2** or **systemd**: For process management (production)

### Network Requirements

- **Outbound HTTPS**: Port 443 to `brapi.dev` (API server)
- **Inbound HTTP/HTTPS**: Port 3001 (backend) and port 3000 (frontend)
- **Firewall**: Allow traffic on deployment ports
- **DNS**: Resolve domain names for backend and frontend services

### Pre-Deployment Checks

```bash
# Verify Node.js version
node --version  # Should be v18.0.0 or higher

# Verify npm version
npm --version   # Should be v9.0.0 or higher

# Verify internet connectivity to brAPI
curl -I https://brapi.dev/api/v2/fii/indicators

# Verify port availability
# For macOS/Linux:
lsof -i :3000
lsof -i :3001

# For Windows (PowerShell):
netstat -ano | findstr :3000
netstat -ano | findstr :3001
```

---

## Environment Configuration

### .env File Template

Create a `.env` file in the project root with the following variables. This template includes all required and optional environment variables:

```bash
# ==========================================
# BACKEND CONFIGURATION
# ==========================================

# brAPI Token - CRITICAL SECURITY
# DO NOT commit to version control, DO NOT share
# Obtain from: https://brapi.dev/dashboard
BRAPI_TOKEN=<your_brapi_token_here>

# brAPI Base URL
# Development/Staging: https://brapi.dev/api/v2
# Production: https://brapi.dev/api/v2 (same, but can be overridden for custom proxies)
BRAPI_BASE_URL=https://brapi.dev/api/v2

# Backend Server Configuration
BACKEND_PORT=3001
BACKEND_HOST=0.0.0.0

# Node Environment
# Options: development, staging, production
NODE_ENV=development

# Logging Configuration
# Options: debug, info, warning, error
LOG_LEVEL=info

# Cache Configuration (seconds)
# TTL for in-memory FII data cache
# Development: 300 (5 minutes)
# Production: 300-600 (5-10 minutes)
CACHE_TTL_SECONDS=300

# Request Timeout (milliseconds)
# Maximum time to wait for brAPI response
REQUEST_TIMEOUT_MS=10000

# Maximum Retry Attempts
# Number of times to retry failed brAPI requests
MAX_RETRIES=3

# CORS Configuration (comma-separated)
# Domains allowed to access backend API
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Rate Limiting (optional)
# For advanced deployments
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================

# Backend API URL - where frontend connects to backend
# Must be accessible from user's browser
# Development: http://localhost:3001
# Staging: https://api-staging.example.com
# Production: https://api.example.com
REACT_APP_BACKEND_URL=http://localhost:3001

# Data Refresh Interval (milliseconds)
# How often frontend automatically polls for updated FII data
# Development: 300000 (5 minutes)
# Production: 600000 (10 minutes)
REACT_APP_REFRESH_INTERVAL=300000

# Frontend Port (Next.js)
# Development: 3000
NEXT_PUBLIC_PORT=3000

# ==========================================
# OPTIONAL: DATABASE/PERSISTENCE
# ==========================================

# For future user preferences persistence
# DATABASE_URL=postgresql://user:pass@localhost:5432/fii_dashboard
# REDIS_URL=redis://localhost:6379

# ==========================================
# OPTIONAL: MONITORING AND ANALYTICS
# ==========================================

# For production monitoring
# SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
# DATADOG_API_KEY=<your_datadog_key>

# ==========================================
# OPTIONAL: DEPLOYMENT CONTEXT
# ==========================================

# Git commit hash for version tracking
DEPLOYMENT_COMMIT_SHA=<git_commit_sha>

# Deployment timestamp
DEPLOYMENT_TIMESTAMP=<deployment_timestamp>

# Application version
APP_VERSION=1.0.0
```

### .env.example File

Create `.env.example` with the template above (without actual secrets) and commit to version control:

```bash
# Copy template to .env and fill in actual values
cp .env.example .env

# Edit .env with actual configuration
nano .env
# or
vim .env
```

### Security Best Practices for .env Files

```bash
# Ensure .env is in .gitignore (CRITICAL)
echo ".env" >> .gitignore

# Set restrictive file permissions (Unix/Linux/macOS)
chmod 600 .env

# Verify .env is not tracked by git
git status
# Output should NOT show .env file

# For Windows, use NTFS permissions or Azure Key Vault for production
```


---

## Backend Deployment

### Installation and Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Verify installation
npm list

# Check for security vulnerabilities
npm audit
# Fix vulnerabilities if found
npm audit fix

# Return to project root
cd ..
```

### Building the Backend

```bash
# Navigate to backend directory
cd backend

# Build TypeScript to JavaScript
npm run build

# Verify build output
ls -la dist/
# Should contain: index.js and other compiled files

# Check for build errors
npm run build 2>&1 | grep -i error

# Return to project root
cd ..
```

### Starting the Backend

**Development Mode:**
```bash
cd backend
npm run dev
# Output should show: "Backend running on port 3001"
# Press Ctrl+C to stop
```

**Production Mode:**
```bash
cd backend

# Ensure .env file is configured
cat .env | grep BRAPI_TOKEN
# Should NOT print the token to terminal (for security)

# Build the application
npm run build

# Start the application
npm start
# Output should show: "Backend running on port 3001"
```

### Backend Deployment Checklist

- [ ] Node.js v18+ installed and verified
- [ ] npm dependencies installed (`npm install` completed)
- [ ] `.env` file created with BRAPI_TOKEN set
- [ ] Build completed without errors (`npm run build`)
- [ ] Backend starts successfully (`npm start`)
- [ ] Port 3001 is accessible and listening
- [ ] Health check endpoint responds (see [Health Check](#health-check-endpoint-setup))
- [ ] Sample API call returns FII data
- [ ] Logs show no errors or warnings

### Verifying Backend Deployment

```bash
# Check if backend is running
curl -I http://localhost:3001/health

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: application/json

# Get health status details
curl http://localhost:3001/health | jq .

# Test FII data endpoint
curl "http://localhost:3001/api/fii/indicators?symbols=MXRF11,HGLG11" | jq .

# Monitor logs
tail -f backend/logs/application.log

# Check memory usage
ps aux | grep "node dist/index.js"
```

---

## Frontend Deployment

### Installation and Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Verify installation
npm list

# Check for security vulnerabilities
npm audit
npm audit fix

# Return to project root
cd ..
```

### Building the Frontend

```bash
# Navigate to frontend directory
cd frontend

# Build Next.js application
npm run build

# Verify build output
ls -la .next/
# Should contain: static, standalone, and cache folders

# Check build size
du -sh .next/

# Return to project root
cd ..
```

### Starting the Frontend

**Development Mode:**
```bash
cd frontend
npm run dev
# Output should show: "started server on 0.0.0.0:3000"
# Open browser: http://localhost:3000
# Press Ctrl+C to stop
```

**Production Mode:**
```bash
cd frontend

# Ensure .env is configured with REACT_APP_BACKEND_URL
echo $REACT_APP_BACKEND_URL

# Build the application
npm run build

# Start the application
npm start
# Output should show: "ready - started server on 0.0.0.0:3000"
```

### Frontend Deployment Checklist

- [ ] Node.js v18+ installed and verified
- [ ] npm dependencies installed (`npm install` completed)
- [ ] `.env` file created with REACT_APP_BACKEND_URL pointing to backend
- [ ] Build completed without errors (`npm run build`)
- [ ] Build size is reasonable (<5MB for production bundle)
- [ ] Frontend starts successfully (`npm start`)
- [ ] Port 3000 is accessible and listening
- [ ] Application loads in browser and displays dashboard
- [ ] Backend connection is successful (no "Backend unavailable" message)
- [ ] FII data loads and displays with proper formatting

### Verifying Frontend Deployment

```bash
# Check if frontend is running
curl -I http://localhost:3000

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: text/html

# Open in browser
# macOS:
open http://localhost:3000

# Linux:
xdg-open http://localhost:3000

# Windows:
start http://localhost:3000

# Monitor Next.js logs
tail -f frontend/.next/log
```

---

## BRAPI_TOKEN Security Setup

### What is BRAPI_TOKEN?

The BRAPI_TOKEN is a secret API authentication credential used to authorize requests to the brAPI platform. **This token must be kept confidential and never exposed to the frontend.**

### Obtaining BRAPI_TOKEN

1. Visit [brAPI Dashboard](https://brapi.dev/dashboard)
2. Create or retrieve your API token
3. Copy the token (do not share)
4. Add to `.env` file: `BRAPI_TOKEN=<your_token>`

### BRAPI_TOKEN Security Validation

**Verify token is NOT exposed to frontend:**

```bash
# Open browser DevTools (F12 → Network tab)
# Observe network requests to http://localhost:3001/api/fii/indicators
# In request headers and body, verify NO occurrence of BRAPI_TOKEN
# Expected: No Authorization header sent from frontend

# Verify backend DOES include token:
curl -v http://localhost:3001/api/fii/indicators?symbols=MXRF11 2>&1 | grep -i "authorization"
# Expected: No Authorization header in the response (backend strips it)

# Test that token IS used by backend:
# Check backend logs for successful brAPI authentication
tail -f backend/logs/application.log | grep "brAPI"
# Should see entries like: "brAPI request successful"
```

### BRAPI_TOKEN Rotation (Periodic Update)

To rotate tokens in production without downtime:

```bash
# 1. Generate new token on brAPI dashboard
# 2. Update .env with new token
BRAPI_TOKEN=<new_token>

# 3. Signal backend to reload configuration (no downtime restart)
# Using PM2:
pm2 restart fii-dashboard-backend --update-env

# 4. Verify new token is working
curl "http://localhost:3001/api/fii/indicators?symbols=MXRF11" | jq .

# 5. Revoke old token on brAPI dashboard
```

### BRAPI_TOKEN Expiration Handling

If the token expires, the backend will return:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication failed. The server token may have expired. Please contact support.",
    "statusCode": 401,
    "timestamp": "2024-01-15T10:30:45Z"
  }
}
```

**Recovery steps:**
1. Obtain a new token from brAPI dashboard
2. Update `.env` file with new token
3. Restart backend: `npm start` or `pm2 restart fii-dashboard-backend`
4. Verify: `curl http://localhost:3001/api/fii/indicators?symbols=MXRF11`

### BRAPI_TOKEN Environment Variable Validation

On backend startup, the application validates that BRAPI_TOKEN is set:

```bash
# If BRAPI_TOKEN is missing:
# Backend logs:
# ERROR: Missing required environment variable: BRAPI_TOKEN
# Backend refuses to start

# Fix:
export BRAPI_TOKEN=<your_token>
npm start

# For permanent setup (production):
# Add to systemd service file or Docker environment
```

---

## REACT_APP_BACKEND_URL Configuration

### What is REACT_APP_BACKEND_URL?

REACT_APP_BACKEND_URL is the URL where the frontend should connect to the backend proxy. It must be:
- Accessible from the user's browser
- Correct for the deployment environment (local, staging, production)
- Include protocol (http:// or https://)

### Configuration by Environment

**Development (Local Machine):**
```bash
# .env
REACT_APP_BACKEND_URL=http://localhost:3001
```

**Staging (Shared Server):**
```bash
# .env
REACT_APP_BACKEND_URL=https://api-staging.example.com
```

**Production (Public API):**
```bash
# .env
REACT_APP_BACKEND_URL=https://api.example.com
```

### Verifying REACT_APP_BACKEND_URL Configuration

```bash
# Build frontend with new configuration
npm run build

# Check that backend URL is baked into build
grep -r "REACT_APP_BACKEND_URL" frontend/.next/

# Should show the configured URL in compiled output

# Start frontend
npm start

# Open browser developer tools (F12 → Console)
# Create a test fetch call:
# fetch('http://localhost:3001/api/fii/indicators?symbols=MXRF11').then(r => r.json()).then(console.log)

# Should show FII data (no CORS error)
```

### CORS Configuration for REACT_APP_BACKEND_URL

The backend must allow requests from the frontend URL. Configure CORS:

```bash
# .env
CORS_ORIGIN=http://localhost:3000,https://api-staging.example.com,https://api.example.com

# Restart backend
npm start
```

### Proxy Setup (Advanced)

For production deployments using Nginx/Apache proxy:

**Nginx Example:**
```nginx
# /etc/nginx/sites-available/fii-dashboard
server {
    listen 443 ssl http2;
    server_name api.example.com;

    # SSL certificates
    ssl_certificate /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;

    # Proxy requests to backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Apache Example:**
```apache
# /etc/apache2/sites-available/fii-dashboard.conf
<VirtualHost *:443>
    ServerName api.example.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/api.example.com.crt
    SSLCertificateKeyFile /etc/ssl/private/api.example.com.key

    ProxyPreserveHost On
    ProxyPass / http://localhost:3001/
    ProxyPassReverse / http://localhost:3001/
</VirtualHost>
```


---

## Health Check Endpoint Setup

### Backend Health Check Endpoint

The backend exposes a `/health` endpoint for monitoring backend status and dependencies.

**Endpoint Details:**
- **URL**: `GET /health`
- **Port**: 3001 (default)
- **Response Format**: JSON
- **Purpose**: Monitor backend and brAPI connectivity

### Health Check Response Format

**Healthy Response (HTTP 200):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:45Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "brapi": {
      "status": "healthy",
      "responseTime": 245
    }
  },
  "cache": {
    "entries": 12,
    "memoryUsage": "2.3 MB"
  }
}
```

**Degraded Response (HTTP 200 with warning):**
```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T10:30:45Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "brapi": {
      "status": "slow",
      "responseTime": 8500,
      "warning": "brAPI response time exceeds 5 seconds"
    }
  }
}
```

**Unhealthy Response (HTTP 503):**
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:45Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "production",
  "dependencies": {
    "brapi": {
      "status": "unreachable",
      "error": "Connection timeout after 10s",
      "lastSuccessfulCheck": "2024-01-15T10:15:45Z"
    }
  }
}
```

### Checking Health Status

**Using curl:**
```bash
# Basic health check
curl http://localhost:3001/health

# With pretty-print
curl http://localhost:3001/health | jq .

# Check only HTTP status code
curl -w "%{http_code}" http://localhost:3001/health

# Expected output: 200 (healthy), 503 (unhealthy)

# Follow all redirects
curl -L http://localhost:3001/health
```

**Using curl with verbose output:**
```bash
# See full request/response headers
curl -v http://localhost:3001/health

# Expected output:
# HTTP/1.1 200 OK
# Content-Type: application/json
# Content-Length: 245
```

**Using node/JavaScript:**
```javascript
fetch('http://localhost:3001/health')
  .then(res => res.json())
  .then(data => {
    console.log('Health Status:', data.status);
    console.log('brAPI Status:', data.dependencies.brapi.status);
  });
```

### Setting Up Monitoring with Health Checks

**Automated Monitoring Script:**
```bash
#!/bin/bash
# health-check-monitor.sh

BACKEND_URL="http://localhost:3001"
HEALTH_CHECK_INTERVAL=30  # seconds
MAX_FAILURES=3
FAILURES=0

while true; do
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null "$BACKEND_URL/health")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✓ Backend healthy (HTTP $HTTP_CODE)"
    FAILURES=0
  else
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ✗ Backend unhealthy (HTTP $HTTP_CODE)"
    ((FAILURES++))
    
    if [ $FAILURES -ge $MAX_FAILURES ]; then
      echo "ALERT: Backend has failed $FAILURES times. Attempting recovery..."
      # Add recovery logic here (e.g., restart service)
      # systemctl restart fii-dashboard-backend
    fi
  fi
  
  sleep $HEALTH_CHECK_INTERVAL
done
```

**Using PM2 with Health Checks:**
```bash
# Install PM2
npm install -g pm2

# Configure ecosystem file (ecosystem.config.js)
module.exports = {
  apps: [
    {
      name: 'fii-dashboard-backend',
      script: './dist/index.js',
      cwd: './backend',
      env: {
        NODE_ENV: 'production',
        BRAPI_TOKEN: process.env.BRAPI_TOKEN
      },
      // Health check endpoint for PM2 Plus
      listen_timeout: 10000,
      max_memory_restart: '1G'
    }
  ]
};

# Start with PM2
pm2 start ecosystem.config.js

# Monitor with PM2
pm2 monit

# View logs
pm2 logs fii-dashboard-backend

# Set up health check with PM2 Plus (optional)
pm2 install pm2-auto-pull
```

**Docker Health Check:**
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY backend ./

RUN npm install && npm run build

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1))"

CMD ["npm", "start"]
```

### Kubernetes Readiness/Liveness Probes

```yaml
# kubernetes-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fii-dashboard-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: fii-dashboard-backend
  template:
    metadata:
      labels:
        app: fii-dashboard-backend
    spec:
      containers:
      - name: backend
        image: fii-dashboard-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: BRAPI_TOKEN
          valueFrom:
            secretKeyRef:
              name: brapi-secret
              key: token
        
        # Readiness probe: Check if pod is ready to receive traffic
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 10
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        
        # Liveness probe: Check if pod is alive
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
        
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Alert Thresholds

Configure alerts for health check failures:

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|--------------------|
| Response Time | 5 seconds | 10 seconds |
| Consecutive Failures | 2 | 5 |
| Memory Usage | 80% | 95% |
| Cache Hit Rate | < 50% | < 20% |
| brAPI Errors | 10% | 50% |

---

## Troubleshooting Common Issues

### Backend Issues

**Issue: "EADDRINUSE" or "Port 3001 already in use"**
```bash
# Find process using port 3001
lsof -i :3001        # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Kill the process
kill -9 <PID>         # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change backend port in .env
BACKEND_PORT=3002

# Restart backend
npm start
```

**Issue: "BRAPI_TOKEN is missing or invalid"**
```bash
# Verify token is set
echo $BRAPI_TOKEN

# If empty, set it
export BRAPI_TOKEN="sPUuvgpkj52S75JpzcRN7x"

# Or add to .env
echo "BRAPI_TOKEN=sPUuvgpkj52S75JpzcRN7x" >> .env

# Restart backend
npm start

# Check logs for BRAPI_TOKEN validation error
tail -f backend/logs/application.log | grep "BRAPI_TOKEN"
```

**Issue: "Cannot connect to brAPI" or "Request timeout"**
```bash
# Test connectivity to brAPI
curl -I https://brapi.dev/api/v2/fii/indicators

# If fails, check:
# 1. Internet connection
ping brapi.dev

# 2. Firewall/proxy blocking HTTPS
# Contact network admin to allow HTTPS to brapi.dev

# 3. Increase timeout in .env
REQUEST_TIMEOUT_MS=15000

# 4. Test with increased retries
MAX_RETRIES=5

# Restart backend
npm start
```

**Issue: "Backend health check fails"**
```bash
# Check health endpoint
curl -v http://localhost:3001/health

# If fails:
# 1. Verify backend is running
ps aux | grep "npm start"

# 2. Check backend logs
tail -f backend/logs/application.log

# 3. Verify port is listening
lsof -i :3001

# 4. Restart backend
cd backend
npm run build
npm start
```

**Issue: "Too many requests" error (HTTP 429)**
```bash
# brAPI is rate limiting
# Wait 60 seconds (Circuit Breaker opens)

# Check Circuit Breaker status in logs
tail -f backend/logs/application.log | grep "Circuit"

# After 60 seconds, backend enters HALF_OPEN
# Allow up to 3 test requests

# Long-term fix: Reduce request frequency in frontend
# .env
REACT_APP_REFRESH_INTERVAL=600000  # 10 minutes instead of 5

# Or use caching more effectively
CACHE_TTL_SECONDS=600  # 10 minutes
```

### Frontend Issues

**Issue: "Backend unreachable" error**
```bash
# 1. Verify REACT_APP_BACKEND_URL is correct
echo $REACT_APP_BACKEND_URL

# Should output: http://localhost:3001 (development)

# 2. Verify backend is running
curl http://localhost:3001/health

# 3. Check frontend browser console (F12)
# Look for CORS errors or connection errors

# 4. Clear frontend cache and rebuild
cd frontend
npm run build
npm start

# 5. For production, verify CORS configuration
# In backend .env:
CORS_ORIGIN=https://example.com
```

**Issue: "Port 3000 already in use"**
```bash
# Find process using port 3000
lsof -i :3000        # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>         # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change frontend port
cd frontend
PORT=3001 npm start

# Or modify .env
NEXT_PUBLIC_PORT=3002
```

**Issue: "FII data not loading or shows 'No FIIs found'"**
```bash
# 1. Check backend is returning data
curl "http://localhost:3001/api/fii/indicators?symbols=MXRF11" | jq .

# Should return: {"success": true, "data": [...]}

# 2. Verify frontend is calling correct endpoint
# Open browser DevTools (F12 → Network tab)
# Filter by XHR
# Look for request to /api/fii/indicators

# 3. Check response status (should be 200)
# If not 200, see backend troubleshooting

# 4. Clear frontend cache
# Browser: Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
# Or use fetch cache bypass:
fetch('http://localhost:3001/api/fii/indicators?symbols=MXRF11', {cache: 'no-store'})

# 5. Restart frontend
npm start
```

**Issue: "CORS error" when connecting to backend**
```bash
# Error in browser console:
# "Access to XMLHttpRequest blocked by CORS policy"

# Fix in backend .env:
CORS_ORIGIN=http://localhost:3000

# For multiple domains:
CORS_ORIGIN=http://localhost:3000,https://example.com,https://staging.example.com

# Restart backend
npm start

# Test CORS
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     http://localhost:3001/api/fii/indicators

# Should include CORS headers in response:
# Access-Control-Allow-Origin: http://localhost:3000
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ECONNREFUSED: Connection refused` | Backend not running | Start backend with `npm start` |
| `ENOTFOUND brapi.dev` | DNS resolution failed | Check internet connection |
| `401 Unauthorized` | Invalid BRAPI_TOKEN | Update token in .env |
| `429 Too Many Requests` | Rate limited by brAPI | Wait 60s, reduce request frequency |
| `CORS error` | Frontend origin not allowed | Add origin to CORS_ORIGIN in .env |
| `Cannot find module 'dotenv'` | Dependencies not installed | Run `npm install` |
| `SyntaxError: Unexpected token` | Build artifacts outdated | Run `npm run build` |


---

## Configuration by Environment

### Development Environment

**Purpose**: Local development with hot-reload and debugging

**.env Configuration:**
```bash
NODE_ENV=development
BRAPI_TOKEN=<your_brapi_token>
BRAPI_BASE_URL=https://brapi.dev/api/v2
BACKEND_PORT=3001
BACKEND_HOST=localhost
LOG_LEVEL=debug
CACHE_TTL_SECONDS=300
REQUEST_TIMEOUT_MS=10000
MAX_RETRIES=3
CORS_ORIGIN=http://localhost:3000
REACT_APP_BACKEND_URL=http://localhost:3001
REACT_APP_REFRESH_INTERVAL=300000
```

**Startup Commands:**
```bash
# Terminal 1: Start backend with auto-reload
cd backend
npm run dev

# Terminal 2: Start frontend with auto-reload
cd frontend
npm run dev

# Application accessible at: http://localhost:3000
```

**Characteristics:**
- Hot module reload (changes apply immediately)
- Detailed logging in console
- No minification or optimization
- Longer startup time
- Easier debugging with source maps
- Suitable for developers

---

### Staging Environment

**Purpose**: Pre-production testing with production-like configuration

**.env Configuration:**
```bash
NODE_ENV=staging
BRAPI_TOKEN=<your_brapi_token>
BRAPI_BASE_URL=https://brapi.dev/api/v2
BACKEND_PORT=3001
BACKEND_HOST=0.0.0.0
LOG_LEVEL=info
CACHE_TTL_SECONDS=600
REQUEST_TIMEOUT_MS=15000
MAX_RETRIES=3
CORS_ORIGIN=https://staging.example.com,https://api-staging.example.com
REACT_APP_BACKEND_URL=https://api-staging.example.com
REACT_APP_REFRESH_INTERVAL=600000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

**Startup Commands:**
```bash
# Build and start backend
cd backend
npm install
npm run build
npm start

# Build and start frontend (in separate terminal)
cd frontend
npm install
npm run build
npm start
```

**Characteristics:**
- Production-like build and optimization
- Info-level logging (no debug logs)
- Longer cache TTL to reduce API calls
- Increased timeout for slower networks
- Suitable for QA and testing teams
- Used to validate deployment procedures

**Deployment to Staging Server:**
```bash
# 1. SSH into staging server
ssh deploy@staging-server.example.com

# 2. Clone or update repository
cd /var/www/fii-dashboard
git pull origin main

# 3. Set up environment variables
cp .env.example .env
nano .env  # Edit with staging values

# 4. Build and start application
cd backend && npm install && npm run build && npm start &
cd ../frontend && npm install && npm run build && npm start &

# 5. Verify deployment
curl https://api-staging.example.com/health | jq .
```

---

### Production Environment

**Purpose**: Live application serving real users

**.env Configuration:**
```bash
NODE_ENV=production
BRAPI_TOKEN=<your_brapi_token>  # From secure vault (AWS Secrets Manager, HashiCorp Vault, etc.)
BRAPI_BASE_URL=https://brapi.dev/api/v2
BACKEND_PORT=3001
BACKEND_HOST=0.0.0.0
LOG_LEVEL=warning
CACHE_TTL_SECONDS=600
REQUEST_TIMEOUT_MS=15000
MAX_RETRIES=3
CORS_ORIGIN=https://example.com
REACT_APP_BACKEND_URL=https://api.example.com
REACT_APP_REFRESH_INTERVAL=600000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx  # Error tracking
DATADOG_API_KEY=<your_datadog_key>  # Monitoring
APP_VERSION=1.0.0
```

**Startup Commands (with Process Manager):**
```bash
# Using PM2 (recommended)
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

# Using systemd (alternative)
# Create /etc/systemd/system/fii-dashboard.service
[Unit]
Description=FII Dashboard
After=network.target

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/fii-dashboard
EnvironmentFile=/var/www/fii-dashboard/.env
ExecStart=/usr/bin/npm start --prefix backend
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable and start service
sudo systemctl enable fii-dashboard
sudo systemctl start fii-dashboard
```

**Characteristics:**
- Fully optimized and minified builds
- Warning-level logging (minimal logs)
- Longer cache TTL to minimize API calls
- Increased timeout for reliability
- Higher rate limits
- Error tracking and monitoring enabled
- HTTPS/SSL only
- Behind load balancer/reverse proxy
- Suitable for end users

**Deployment to Production (with Zero Downtime):**
```bash
# 1. Build on staging environment
git checkout main
npm run build

# 2. Run smoke tests
npm test

# 3. Create release tag
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1

# 4. Deploy to production using blue-green deployment
# - Blue (current): Production server running v1.0.0
# - Green (new): New server running v1.0.1

# 5. Switch traffic to green server
# - Nginx/HAProxy: Update upstream
# - AWS: Update load balancer target group
# - Kubernetes: Update replica set

# 6. Monitor green server
tail -f /var/log/fii-dashboard/app.log

# 7. If issues, rollback to blue server
# - Nginx/HAProxy: Revert upstream
# - AWS: Revert target group
# - Kubernetes: Rollback deployment

# 8. Once stable (30+ minutes), decommission blue server
```

---

## Scaling Considerations

### Single-Instance Deployment (Current)

**Architecture:**
- One backend instance (Node.js + Express)
- One frontend instance (Next.js)
- In-memory cache (per-instance)
- Load: Up to 50-100 concurrent users

**Advantages:**
- Simple to deploy
- Low operational overhead
- No inter-instance communication needed
- Fast in-memory cache performance

**Limitations:**
- Single point of failure
- Cache not shared between instances
- Limited to single-core workload

**When to Scale:**
- Concurrent users exceed 100
- API response time exceeds 1 second
- CPU usage consistently > 80%
- Memory usage consistently > 500MB

### Multi-Instance Deployment (Horizontal Scaling)

**Architecture:**
- Multiple backend instances behind load balancer
- Shared cache (Redis)
- Multiple frontend instances (optional)
- Load: 100-1000+ concurrent users

**Required Changes:**

**1. Migrate from In-Memory Cache to Redis:**

```bash
# .env configuration
CACHE_TYPE=redis
REDIS_URL=redis://redis.example.com:6379
REDIS_PASSWORD=<secure_password>

# Install Redis client
npm install redis
```

**2. Update Cache Manager:**

```typescript
// src/cache/CacheManager.ts
import redis from 'redis';

export class CacheManager {
  private client = redis.createClient({url: process.env.REDIS_URL});
  
  async get(key: string) {
    return JSON.parse(await this.client.get(key));
  }
  
  async set(key: string, value: any, ttl: number) {
    await this.client.setEx(key, ttl, JSON.stringify(value));
  }
}
```

**3. Load Balancer Configuration (Nginx):**

```nginx
upstream fii_dashboard_backend {
  server backend1.example.com:3001 weight=1;
  server backend2.example.com:3001 weight=1;
  server backend3.example.com:3001 weight=1;
  
  # Health checks
  check interval=3000 rise=2 fall=5 timeout=1000 type=http;
  check_http_send "GET /health HTTP/1.0\r\n\r\n";
  check_http_expect_alive http_2xx http_3xx;
}

server {
  listen 443 ssl http2;
  server_name api.example.com;

  location / {
    proxy_pass http://fii_dashboard_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

**4. Kubernetes Deployment:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fii-dashboard-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fii-dashboard-backend
  template:
    metadata:
      labels:
        app: fii-dashboard-backend
    spec:
      containers:
      - name: backend
        image: fii-dashboard-backend:latest
        ports:
        - containerPort: 3001
        env:
        - name: REDIS_URL
          value: "redis://redis-service:6379"
        - name: BRAPI_TOKEN
          valueFrom:
            secretKeyRef:
              name: brapi-secret
              key: token
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"

---
apiVersion: v1
kind: Service
metadata:
  name: fii-dashboard-backend
spec:
  type: LoadBalancer
  selector:
    app: fii-dashboard-backend
  ports:
  - protocol: TCP
    port: 3001
    targetPort: 3001
```

### Performance Optimization for Scale

**1. Database Query Caching (if user preferences implemented):**
```bash
# Cache user preferences in Redis
REDIS_CACHE_TTL=3600  # 1 hour
```

**2. Circuit Breaker Across Instances:**
```bash
# Share circuit breaker state via Redis
CIRCUIT_BREAKER_SHARED=true
CIRCUIT_BREAKER_REDIS_KEY=fii:circuit-breaker
```

**3. Request Rate Limiting (per-IP):**
```bash
# Rate limit by client IP
RATE_LIMIT_PER_IP=100  # requests per minute
RATE_LIMIT_STORE=redis  # Shared across instances
```

**4. Background Job Queue (for refresh operations):**
```bash
# Use Bull or RabbitMQ for async operations
QUEUE_PROVIDER=bull
REDIS_QUEUE_URL=redis://redis.example.com:6379
```

### Monitoring at Scale

**Metrics to Track:**
- Request latency (p50, p95, p99)
- Cache hit rate (>80% desired)
- Error rate (<1% desired)
- Concurrent active connections
- Backend CPU and memory usage
- Database connection pool usage
- Circuit breaker state transitions

**Monitoring Tools:**
- Prometheus + Grafana
- DataDog
- New Relic
- AWS CloudWatch
- ELK Stack (Elasticsearch, Logstash, Kibana)

**Alerting Thresholds:**
```yaml
- Alert if request latency p95 > 5 seconds
- Alert if cache hit rate < 50%
- Alert if error rate > 5%
- Alert if backend CPU > 80% for 5 minutes
- Alert if memory usage > 90%
- Alert if circuit breaker open > 2 times in 1 hour
```

---

## Quick Start Commands

### Development (Local)

```bash
# Setup
npm install
npm run setup  # Install both backend and frontend dependencies

# Start development servers (2 terminals)
npm run dev:backend
npm run dev:frontend

# Access application
# http://localhost:3000

# Run tests
npm run test
npm run test:coverage

# Stop servers
# Ctrl+C in each terminal
```

### Production Deployment

```bash
# 1. Prepare environment
export NODE_ENV=production
export BRAPI_TOKEN=<your_token>
export REACT_APP_BACKEND_URL=https://api.example.com

# 2. Build both applications
npm run build

# 3. Start with process manager
pm2 start ecosystem.config.js

# 4. Verify deployment
curl https://api.example.com/health | jq .

# 5. Monitor
pm2 monit
pm2 logs
```

### Health Checks

```bash
# Backend health
curl http://localhost:3001/health | jq .

# Frontend accessibility
curl http://localhost:3000 | head -20

# FII data endpoint
curl "http://localhost:3001/api/fii/indicators?symbols=MXRF11" | jq .
```

### Emergency Procedures

```bash
# Restart backend
pm2 restart fii-dashboard-backend

# Restart frontend
pm2 restart fii-dashboard-frontend

# Restart all
pm2 restart all

# Check for errors
pm2 logs --err

# Restart and clear cache (emergency)
pm2 stop all
redis-cli FLUSHALL  # If using Redis
pm2 start all
```

---

## Appendix: Environment Variable Reference

| Variable | Type | Development | Production | Description |
|----------|------|-------------|-----------|-------------|
| `BRAPI_TOKEN` | Secret | Required | Required | brAPI authentication token |
| `BRAPI_BASE_URL` | URL | https://brapi.dev/api/v2 | https://brapi.dev/api/v2 | brAPI endpoint |
| `BACKEND_PORT` | Integer | 3001 | 3001 | Backend listen port |
| `BACKEND_HOST` | String | localhost | 0.0.0.0 | Backend bind address |
| `NODE_ENV` | Enum | development | production | Node.js environment |
| `LOG_LEVEL` | Enum | debug | warning | Logging verbosity |
| `CACHE_TTL_SECONDS` | Integer | 300 | 600 | Cache time-to-live |
| `REQUEST_TIMEOUT_MS` | Integer | 10000 | 15000 | brAPI request timeout |
| `MAX_RETRIES` | Integer | 3 | 3 | Max request retry attempts |
| `CORS_ORIGIN` | String | localhost:3000 | example.com | Allowed CORS origins |
| `REACT_APP_BACKEND_URL` | URL | http://localhost:3001 | https://api.example.com | Backend API endpoint |
| `REACT_APP_REFRESH_INTERVAL` | Integer | 300000 | 600000 | Frontend refresh interval |

