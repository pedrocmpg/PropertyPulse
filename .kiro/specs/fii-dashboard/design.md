# FII Dashboard - Technical Design Document

## Overview

The FII Dashboard is a full-stack web application that aggregates Brazilian Real Estate Fund (FII) market data from brAPI through a secure Node.js backend proxy. The system architecture prioritizes security (API token protection), performance (in-memory caching), and user experience (responsive UI with dark mode and neon accents).

### Key Design Principles

1. **Security First**: API tokens never exposed to frontend; all brAPI communication proxied through Node.js backend
2. **Performance**: In-memory caching with 5-minute TTL reduces API calls to brAPI
3. **User-Centric**: Dark mode theme with neon accents, responsive design for all devices
4. **Maintainability**: Clear separation of concerns (backend proxy, frontend, data formatters)
5. **Reliability**: Graceful error handling, timeouts, retry logic, comprehensive logging

---

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Frontend)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React/Next.js Dashboard Application                │   │
│  │  - FII Cards (dark mode, neon accents)              │   │
│  │  - Search/Filter interface                          │   │
│  │  - Loading/Error/Empty states                       │   │
│  │  - Data formatters (currency, %, ratio)            │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP Requests
                           │ (No API tokens)
                           ↓
┌──────────────────────────────────────────────────────────────┐
│            Node.js/Express Backend Proxy                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Request Handler                                     │   │
│  │  - Receive GET /fii/indicators?symbols=X,Y,Z       │   │
│  │  - Retrieve BRAPI_TOKEN from environment           │   │
│  │  - Append Bearer token to Authorization header     │   │
│  │  - Strip sensitive headers from response           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Cache Layer (In-Memory)                            │   │
│  │  - Key: symbol combination                          │   │
│  │  - Value: brAPI response                            │   │
│  │  - TTL: 5 minutes                                   │   │
│  │  - Eviction: LRU when limit exceeded (100 entries)  │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Error Handling & Logging                           │   │
│  │  - Timeout handling (10 seconds)                    │   │
│  │  - Retry logic (3 attempts)                         │   │
│  │  - Error message translation                        │   │
│  │  - Request/response logging                         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP Requests
                           │ (Authorization: Bearer BRAPI_TOKEN)
                           ↓
┌──────────────────────────────────────────────────────────────┐
│                    brAPI v2 Service                           │
│  - Endpoint: https://brapi.dev/api/v2/fii/indicators       │
│  - Request: GET /fii/indicators?symbols=MXRF11,HGLG11,...  │
│  - Response: JSON with FII metrics                          │
└──────────────────────────────────────────────────────────────┘
```

### Component Architecture

**Frontend Components:**
- `DashboardLayout`: Main container with search, refresh button, layout management
- `FIICard`: Visual card displaying FII data (symbol, price, yield, P/VP)
- `FIIDetailView`: Modal/drawer with full FII details and administrator info
- `SearchInput`: Search/filter input with real-time filtering
- `LoadingState`: Skeleton screens or spinners during data fetch
- `ErrorState`: Error message with retry button
- `EmptyState`: Guidance message when no data available

**Backend Components:**
- `RequestHandler`: Express middleware handling incoming requests
- `CacheManager`: In-memory cache with TTL and LRU eviction
- `brAPIClient`: HTTP client for brAPI communication
- `ErrorTranslator`: Maps brAPI errors to user-friendly messages
- `Logger`: Structured logging with configurable verbosity

**Shared Utilities:**
- `CurrencyFormatter`: Format numbers as R$ X.XXX.XXX,XX
- `PercentageFormatter`: Format decimals as XX.XX%
- `RatioFormatter`: Format P/VP values with 2 decimal places
- `FIIParser`: Parse brAPI JSON and extract FII records
- `FIIPrettyPrinter`: Format FII data using formatters

---

## Components and Interfaces

### Backend API Contract

**Endpoint: GET /fii/indicators**

**Query Parameters:**
- `symbols` (required): Comma-separated FII symbols (e.g., "MXRF11,HGLG11,KNSC11")

**Request Headers:**
- No Authorization header required (handled by backend)

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "MXRF11",
      "name": "Maxi Renda Fixa Imobiliário",
      "price": 9.74,
      "nav": 9.3678,
      "pvRatio": 1.0392547,
      "dividendYield1Month": 0.12268994,
      "dividendYield12Month": 0.12543876,
      "monthlyReturn": 0.02543,
      "investorCount": 45678,
      "totalAssets": 4313692700,
      "administrator": {
        "name": "XP Administração de Recursos Ltda",
        "cnpj": "00.000.000/0001-00",
        "email": "contact@xp.com.br"
      }
    }
  ]
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "Unable to fetch FII data. Please check your connection and try again later.",
    "statusCode": 504,
    "timestamp": "2024-01-15T10:30:45Z"
  }
}
```

### Frontend API Call Interface

```typescript
// Frontend makes request to backend proxy (no token needed)
const response = await fetch('/api/fii/indicators?symbols=MXRF11,HGLG11', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response structure
interface FIIResponse {
  success: boolean;
  data?: FIIData[];
  error?: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
  };
}

interface FIIData {
  symbol: string;
  name: string;
  price: number;
  nav: number;
  pvRatio: number;
  dividendYield1Month: number;
  dividendYield12Month: number;
  monthlyReturn: number;
  investorCount: number;
  totalAssets: number;
  administrator: {
    name: string;
    cnpj: string;
    email: string;
  };
}
```

### Data Formatter Interfaces (Updated)

**CurrencyFormatter:**
```typescript
// Input: numeric value
// Output: formatted string using native Brazilian Portuguese locale
formatCurrency(value: number | null | undefined): string
// Uses native Intl.NumberFormat for consistency with browser locale settings
// Examples:
// formatCurrency(9.74) → "R$ 9,74"
// formatCurrency(150.5) → "R$ 150,50"
// formatCurrency(4313692700) → "R$ 4.313.692.700,00"
// formatCurrency(-10.50) → "R$ -10,50" (negative sign after R$, per Intl.NumberFormat standard)
// formatCurrency(null) → "—"
```

**Implementation:**
```typescript
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (isNaN(value)) {
    console.warn(`Invalid number passed to formatCurrency: ${value}`);
    return '—';
  }
  
  try {
    // Use native Intl.NumberFormat for pt-BR locale (follows Brazilian standard)
    // This respects the browser's locale and JavaScript engine optimization
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    
    // Output format: "R$ 9,74" for 9.74, "R$ -10,50" for -10.50
    // Negative sign placement follows international standard (after currency symbol)
    
  } catch (error) {
    console.error(`Error formatting currency: ${error}`);
    return '—';
  }
}

// Property Test will verify: For any numeric value N, formatCurrency(N)
// produces output matching pattern R$ followed by digits and comma separator,
// regardless of N's sign or magnitude (except null/NaN which produce "—")
```

**PercentageFormatter:**
```typescript
// Input: decimal value (e.g., 0.12268994)
// Output: formatted string "XX.XX%"
formatPercentage(value: number | null | undefined): string
// Examples:
// formatPercentage(0.12268994) → "12.27%"
// formatPercentage(0.00542) → "0.54%"
// formatPercentage(null) → "—"
```

**RatioFormatter:**
```typescript
// Input: numeric P/VP ratio
// Output: formatted string with visual indicators
formatRatio(value: number | null | undefined): {
  displayValue: string;     // "1.04", "0.99", etc.
  status: 'premium' | 'discount' | 'neutral';
  intensity: 'high' | 'low';  // based on >1.05 or <0.95
  ariaLabel: string;
}
// Examples:
// formatRatio(1.0392547) → { displayValue: "1.04", status: "premium", intensity: "low", ... }
// formatRatio(0.98765) → { displayValue: "0.99", status: "discount", intensity: "low", ... }
// formatRatio(1.0) → { displayValue: "1.00", status: "neutral", intensity: "high", ... }
// formatRatio(null) → { displayValue: "—", status: "neutral", ... }
```

**FIIParser:**
```typescript
// Parse brAPI JSON response and extract FII records
parsebrAPIResponse(jsonResponse: any): {
  fiis: ParsedFII[];
  errors?: ParseError[];
}

interface ParsedFII {
  symbol: string;
  price: number;
  nav: number;
  pvRatio: number;
  // ... other fields
}

interface ParseError {
  field: string;
  record: any;
  reason: string;
}
```

**FIIPrettyPrinter:**
```typescript
// Format parsed FII data for display
prettyPrintFII(fii: ParsedFII): FormattedFII

interface FormattedFII {
  symbol: string;
  priceFormatted: string;        // "R$ 9,74"
  navFormatted: string;
  pvRatioFormatted: {
    displayValue: string;
    status: 'premium' | 'discount' | 'neutral';
    // ... color tokens and intensity
  };
  dividendYield1MonthFormatted: string; // "12.27%"
  dividendYield12MonthFormatted: string;
  monthlyReturnFormatted: string;
  investorCountFormatted: string;       // "45.678"
  totalAssetsFormatted: string;         // "R$ 4.313.692.700,00"
  administrator: {
    name: string;
    cnpj: string;
    email: string;
  };
}
```

---

## Data Models

### Frontend State Management (Updated for React Immutability)

```typescript
// Main Dashboard State using immutable Record type
interface DashboardState {
  selectedFIIs: string[];  // e.g., ["MXRF11", "HGLG11"]
  fiiData: Record<string, FIIData>;  // Immutable object, NOT Map
  isLoading: boolean;
  error: ErrorState | null;
  isEmpty: boolean;
  searchQuery: string;
  filterResults: string[];
  userPreferences: {
    theme: 'dark' | 'light';
    refreshInterval: number;  // milliseconds
    selectedMetrics: string[];
  };
}

interface ErrorState {
  code: string;
  message: string;
  timestamp: Date;
  retryCount: number;
  maxRetries: number;
}

// Usage Pattern with React Hooks (immutable updates):
// const [state, setState] = useState<DashboardState>({
//   fiiData: {} // Empty record
// });
//
// // To update FII data immutably:
// setState(prev => ({
//   ...prev,
//   fiiData: { ...prev.fiiData, [symbol]: newFIIData }
// }));
//
// This pattern ensures React detects state changes via reference comparison
```

**CHANGE RATIONALE**: Map objects don't trigger React re-renders because .set() doesn't change reference. Using Record<string, T> ensures immutability, proper React reactivity, JSON serializability, and no performance overhead from Map cloning.

### Backend Cache Model

```typescript
// Individual Asset Cache Entry (Granular per-symbol caching)
interface AssetCacheEntry<T> {
  symbol: string;
  value: T;
  createdAt: Date;
  expiresAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
}

// Cache Manager Configuration with per-symbol TTL
interface CacheConfig {
  ttlSeconds: 300;           // 5 minutes per individual symbol
  maxEntriesPerSymbol: 1;    // Only 1 version of each symbol cached
  maxTotalEntries: 500;      // Max 500 unique symbols across all users
  evictionStrategy: 'LRU';   // Least Recently Used for total capacity
}

// Circuit Breaker State for Rate Limiting
interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastFailureTime: Date | null;
  failureCount: number;
  successCount: number;
  openDurationMs: number;   // Duration to keep circuit open (default: 60000ms)
}
```

### Environment Configuration

```typescript
// Backend environment variables (loaded from .env or process.env)
interface BackendConfig {
  BRAPI_TOKEN: string;           // API token for brAPI
  BRAPI_BASE_URL: string;        // e.g., "https://brapi.dev/api/v2"
  BACKEND_PORT: number;          // e.g., 3001
  NODE_ENV: 'development' | 'staging' | 'production';
  LOG_LEVEL: 'debug' | 'info' | 'warning' | 'error';
  CACHE_TTL_SECONDS: number;     // TTL for cached data
  REQUEST_TIMEOUT_MS: number;    // 10000 (10 seconds)
  MAX_RETRIES: number;           // 3 attempts
}

// Frontend environment variables
interface FrontendConfig {
  REACT_APP_BACKEND_URL: string;  // e.g., "http://localhost:3001"
  REACT_APP_REFRESH_INTERVAL: number; // milliseconds
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature involves significant data transformation logic (parsing, formatting) that benefits greatly from property-based testing. The data formatters and parser must handle edge cases across a wide range of numeric inputs, and property-based testing is ideal for this. The following 12 properties are suitable for property-based testing and will catch edge cases through randomized input generation:

### Property 1: Currency Formatting (Using Native Intl.NumberFormat)

*For any* numeric value (positive, negative, zero, or with decimal places), formatting it as Brazilian Real currency using native `Intl.NumberFormat('pt-BR')` SHALL produce output with R$ symbol, comma (,) as decimal separator, period (.) as thousands separator, and negative values SHALL have the minus sign placed after the currency symbol per international standard (R$ -X,XX).

**Validates: Requirements 4.1, 4.3**
**CHANGE RATIONALE**: Updated to use native Brazilian Portuguese locale formatting. This eliminates string manipulation, leverages V8 engine optimization, reduces bugs in property-based testing, and follows ECMA-402 Intl standards.

### Property 2: Currency Rounding

*For any* numeric value with more than 2 decimal places, formatting SHALL apply round-half-up rounding to exactly 2 decimal places before formatting (e.g., 9.749 rounds to 9.75).

**Validates: Requirement 4.5**

### Property 3: Percentage Formatting

*For any* decimal value between 0.0 and 1.0 representing a percentage, formatting SHALL convert it to a string matching the pattern XX.XX% with exactly 2 decimal places and no rounding errors.

**Validates: Requirement 5.1**

### Property 4: P/VP Ratio Formatting

*For any* numeric P/VP ratio value, formatting SHALL produce output with exactly 2 decimal places using round-half-up rounding, regardless of input precision.

**Validates: Requirement 6.1**

### Property 5: Sensitive Header Stripping

*For any* HTTP response containing headers matching sensitive patterns (Set-Cookie, Authorization, X-Auth-Token, X-API-Key, WWW-Authenticate, X-Auth-*, X-Admin-*, X-Internal-*, X-Debug-*), the backend SHALL remove all matching headers before returning the response to the frontend.

**Validates: Requirements 1.3, 1.7**

### Property 6: brAPI URL Construction

*For any* list of valid FII symbols (single or multiple), the backend SHALL construct a valid brAPI v2 URL in the format GET https://brapi.dev/api/v2/fii/indicators?symbols=SYMBOL1,SYMBOL2,... with properly formatted symbol parameters.

**Validates: Requirement 2.2**

### Property 7: Cache Key Validity

*For any* unique symbol combination, the cache SHALL maintain a separate entry with a distinct cache key, and retrieving the cache with the same symbol combination SHALL return the cached value only if the entry has not expired.

**Validates: Requirement 15.1**

### Property 8: Cache Expiration

*For any* cache entry, when the current time exceeds the entry's expiration time (TTL + creation time), the cache SHALL treat the entry as invalid and fetch fresh data from brAPI on the next request rather than returning the stale cached value.

**Validates: Requirement 15.3**

### Property 9: Cache Eviction

*For any* set of cache entries where the total number exceeds the maximum capacity (100 entries), adding a new entry SHALL automatically evict the least recently used entry to maintain the capacity limit.

**Validates: Requirement 15.5**

### Property 10: FII Parser Round-Trip

*For any* valid brAPI FII indicator JSON response, parsing the response to extract FII records, then pretty-printing those records back to a formatted string, then re-parsing the formatted string SHALL produce FII data objects that are equivalent to the original parsed data (round-trip preservation of data integrity).

**Validates: Requirement 17.3**

### Property 11: Cache Bypass on Refresh

*For any* manual refresh request that includes a cache-bypass flag, the backend SHALL ignore any cached data for the requested symbols and make a fresh request to brAPI regardless of whether valid cached data exists.

**Validates: Requirement 15.4**

### Property 12: Circuit Breaker on Rate Limit (Updated)

*For any* HTTP error response code 429 (Too Many Requests) from brAPI, the backend SHALL transition its Circuit Breaker to OPEN state and immediately return 429 status to the frontend WITHOUT attempting automatic retries. The backend SHALL reject new cache misses and only return cached data (if available) for 60 seconds. After 60 seconds, the backend SHALL enter HALF_OPEN state and allow up to 3 test requests. If all 3 test requests succeed, the Circuit Breaker SHALL transition to CLOSED (normal operation). If any request fails during HALF_OPEN, return to OPEN immediately.

**Validates: Requirement 9 (Error Handling)**
**CHANGE RATIONALE**: Replaced "exponential backoff + 3 retries" pattern which causes thundering herd problem. New Circuit Breaker pattern protects brAPI from request storms while still providing service to frontend with cached data when possible.

#### Property Reflection Analysis

After analyzing all testable properties, I've identified the following:

- **Properties 1-4** are formatters that apply universal rules to all inputs. These are complementary (Property 1 tests format, Property 2 tests rounding, Property 3 tests percentage logic, Property 4 tests P/VP logic). They do not subsume each other because each tests distinct aspects of formatting.

- **Property 5** (header stripping) and **Property 6** (URL construction) are independent infrastructure operations with no redundancy.

- **Properties 7-9** are cache operations that form a cohesive set: Property 7 tests cache entry validity, Property 8 tests TTL expiration, Property 9 tests capacity eviction. These are distinct cache behaviors with no redundancy.

- **Property 10** (round-trip) and **Property 12** (error mapping) are independent operations.

- **Property 11** (cache bypass) and **Property 12** (error mapping) are independent.

**No redundancies eliminated.** All 12 properties provide unique validation value and together form comprehensive coverage of the feature's data transformation, API integration, and caching logic.

---

## Error Handling

### Backend Error Handling Strategy

The backend proxy implements a multi-layered error handling approach:

**Layer 1: Request Validation**
- Validate symbol parameter format (non-empty, valid characters)
- Reject requests without symbols
- Return 400 Bad Request with descriptive message

**Layer 2: brAPI Communication**
- Network timeout (10 seconds): Return 504 Gateway Timeout
- Connection refused: Return 503 Service Unavailable
- SSL/TLS errors: Return 502 Bad Gateway
- Retry up to 3 times before giving up

**Layer 3: Response Parsing and Validation**
- Invalid JSON from brAPI: Return 502 Bad Gateway
- Missing required fields: Log warning, REJECT entire FII record (don't inject defaults)
- Critical validation: Check NAV ≠ null/undefined/0 (prevents division by zero in P/VP calculation)
- If NAV invalid: Skip FII record entirely, log warning with symbol
- Malformed data types: Reject record if numeric field is non-numeric (don't coerce)
- Data type validation: All numeric fields must be actual numbers, not strings

**Layer 4: Rate Limiting and Circuit Breaker**
- brAPI returns 429 (Too Many Requests): DO NOT auto-retry
- Instead, OPEN circuit breaker immediately: stop sending requests to brAPI for 60 seconds
- During OPEN state: 
  - Return 429 status to frontend (allow app to display rate limit message)
  - Return cached data if available (stale but better than nothing)
  - Reject new cache misses with error message
- HALF_OPEN state: Allow up to 3 test requests
- If 3 requests succeed: Return to CLOSED (normal operation)
- If any request fails in HALF_OPEN: Return to OPEN
- This prevents "thundering herd": no exponential backoff storms when API is throttled

**Layer 5: Authentication**
- Missing BRAPI_TOKEN on startup: Refuse to start, log critical error
- brAPI returns 401: Return 401 Unauthorized (token may be expired)
- Token validation on each request: Verify token format before making brAPI call

**Layer 6: Logging**
- All errors logged with timestamp, request ID, error code, and context
- Errors include stack traces in debug mode only
- Rate limiting: Don't log duplicate errors more than once per minute

### Frontend Error Handling Strategy

**Error Display Priority:**
1. Backend proxy unreachable → "Backend service is unavailable. Please try again later."
2. Authentication error → "Authentication failed. The server token may have expired. Please contact support."
3. Rate limit error → "Too many requests. Please wait a moment and try again."
4. Service unavailable → "The FII data service is temporarily unavailable. Please try again later."
5. Network timeout → "Unable to fetch FII data. Please check your connection and try again later."
6. Generic error → Display error code and timestamp for debugging

**Error Recovery:**
- Display "Retry" button on all error states
- Track retry count (max 3 attempts)
- After 3 failures, suggest contacting support
- Don't auto-retry; require user action to avoid hammering API

**Error Context Display:**
- Collapsible "Show Details" section with HTTP status code, timestamp, request ID
- Useful for debugging but not visible by default
- Never expose brAPI token or internal backend paths

### Formatter Error Handling

**CurrencyFormatter:**
- Null/undefined input: Return "—"
- NaN or non-numeric: Return "—", log warning
- Invalid rounding: Fallback to Math.round()
- Extremely large values (>999,999,999,999.99): Return formatted value with warning indicator

**PercentageFormatter:**
- Null/undefined input: Return "—"
- Value outside 0.0-1.0 range: Still format as percentage but may show unusual values
- NaN or non-numeric: Return "—", log warning

**RatioFormatter:**
- Null/undefined input: Return {displayValue: "—", status: "neutral", ...}
- NaN or non-numeric: Return {displayValue: "—", status: "neutral", ...}
- Invalid comparison (P/VP): Return neutral styling

---

## Testing Strategy

### Property-Based Testing (12 Properties)

Property-based testing validates the data transformation and API integration logic using randomized inputs. Each property runs a minimum of 100 iterations.

**Formatter Properties (Properties 1-4):**
- Tool: fast-check (JavaScript/TypeScript)
- Coverage: Random numeric values, edge cases (zero, negative, very large, very small, decimals)
- Minimum iterations: 100 per property
- Example generators:
  - `fc.float()` for currency values
  - `fc.float({min: 0, max: 1})` for percentage values
  - `fc.float({min: 0.8, max: 1.2})` for P/VP ratios

**Infrastructure Properties (Properties 5-9, 11-12):**
- Tool: Node.js test runner (Jest or Vitest with custom generators)
- Coverage: Various response formats, error codes, cache scenarios
- Minimum iterations: 100 per property
- Example scenarios:
  - Vary header types in responses (case sensitivity, custom headers)
  - Generate symbol lists of various lengths
  - Simulate cache hit/miss/expiration scenarios

**Round-Trip Property (Property 10):**
- Tool: fast-check
- Coverage: Random valid FII objects with various values
- Verification: Parse → Pretty-Print → Parse should produce equivalent object
- Minimum iterations: 100

### Unit Tests (Example-Based)

Complement property-based tests with specific examples for:

**Formatting Examples:**
- `formatCurrency(9.74)` → "R$ 9,74"
- `formatCurrency(150.5)` → "R$ 150,50"
- `formatCurrency(-10.50)` → "-R$ 10,50"
- `formatPercentage(0.12268994)` → "12.27%"
- `formatRatio(1.0392547)` → "1.04" with premium styling

**Error Handling Examples:**
- Network timeout (10 seconds)
- brAPI returns 401 Unauthorized
- brAPI returns 429 Rate Limited
- brAPI returns 5xx error
- Invalid JSON response
- Missing required fields

**Cache Examples:**
- Cache hit: Same symbols within TTL
- Cache miss: Different symbols
- Cache expiration: Same symbols after TTL elapsed
- Cache capacity: 100+ entries added
- Manual refresh: Cache bypass with refresh flag

**Parser Examples:**
- Valid FII record with all fields
- FII record with missing optional field
- FII record with extra unknown field
- Empty response array
- Malformed JSON

**Backend API Examples:**
- POST endpoint rejects requests (GET only)
- Empty symbol parameter returns error
- Multiple concurrent requests handled
- Authorization header correctly formatted
- Sensitive headers stripped from response

**Frontend Integration Examples:**
- Dashboard loads and displays FII data
- Search filters FII list
- Clicking FII opens detail view
- Refresh button updates data
- Error message displayed on failure
- Loading state shown during fetch
- Empty state shown when no results
- Responsive layout on mobile/tablet/desktop

### Integration Tests

Full stack tests verifying end-to-end workflows:

**User Story 1: Add FII and View Data**
- User searches for "MXRF11"
- Frontend requests /api/fii/indicators?symbols=MXRF11
- Backend fetches from brAPI, caches result
- Frontend displays formatted FII data
- Verify all metrics formatted correctly

**User Story 2: Handle Timeout**
- User requests FII data
- Backend times out waiting for brAPI (simulated delay >10s)
- Frontend displays timeout error message
- User clicks Retry
- Backend retries up to 3 times
- Frontend shows final error after 3 failures

**User Story 3: Cache Hit**
- User requests "MXRF11" at time T
- Backend fetches from brAPI, caches result
- User requests "MXRF11" at time T+2 minutes
- Backend returns cached result without calling brAPI
- Verify both requests return identical data

**User Story 4: Cache Expiration**
- User requests "MXRF11" at time T
- Backend caches result for 5 minutes
- User requests "MXRF11" at time T+6 minutes
- Backend cache expired, fetches fresh data from brAPI
- Verify response may differ from original

**User Story 5: Token Security**
- Developer inspects network traffic in browser DevTools
- Verify no API token appears in any request to backend
- Verify backend requests to brAPI include Authorization header
- Verify response headers don't contain sensitive values

**User Story 6: Responsive Design**
- Open dashboard on mobile (320px width)
- Verify single-column FII card layout
- Resize to tablet (768px width)
- Verify 2-column layout
- Resize to desktop (1200px width)
- Verify 3+ column or table layout

### Performance Benchmarks

**Target Performance Metrics:**
- Initial load: <3 seconds on 5 Mbps connection
- Search filtering: <500ms client-side
- Scroll 20+ FII cards: 60 FPS (no jank)
- Concurrent 50 users: No dropped requests
- Cache hit response: <100ms

### Code Coverage Requirements

**Minimum Coverage Targets:**
- Data formatters (CurrencyFormatter, PercentageFormatter, RatioFormatter): 95%
- FII parser and pretty-printer: 95%
- Backend request handler and cache manager: 90%
- Frontend components: 85%
- Error handling paths: 90%
- Overall: 90%

**Coverage Excluded:**
- External library code (fast-check, express, react)
- Third-party API responses (brAPI)
- Network-level concerns (SSL handshake, DNS)

### Test Implementation Plan

1. **Phase 1: Data Formatters**
   - Implement CurrencyFormatter with property tests
   - Implement PercentageFormatter with property tests
   - Implement RatioFormatter with property tests
   - Coverage target: 95%

2. **Phase 2: Parser and Pretty-Printer**
   - Implement FIIParser with round-trip property test
   - Implement FIIPrettyPrinter using formatters
   - Property test for complete parse → print → parse cycle
   - Coverage target: 95%

3. **Phase 3: Backend Proxy**
   - Implement request handler with error handling
   - Implement cache manager with TTL/LRU logic
   - Property tests for header stripping, URL construction, cache operations
   - Integration tests for full brAPI communication
   - Coverage target: 90%

4. **Phase 4: Frontend Components**
   - Implement Dashboard, FIICard, ErrorState, LoadingState, EmptyState
   - Unit tests for component rendering and state changes
   - Integration tests for search, filter, refresh workflows
   - Visual regression tests for responsive design
   - Coverage target: 85%

5. **Phase 5: Security and Performance**
   - Network traffic inspection to verify no token leakage
   - Performance benchmarks with load testing
   - Accessibility testing for WCAG compliance

---

## Implementation Patterns

### Backend Proxy Implementation

**Express.js Route Handler (with Granular Caching & Circuit Breaker):**
```typescript
// GET /fii/indicators?symbols=MXRF11,HGLG11
app.get('/fii/indicators', async (req, res) => {
  try {
    let { symbols, refresh } = req.query;
    
    // Validate input
    if (!symbols || typeof symbols !== 'string' || symbols.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Symbols parameter required' }
      });
    }
    
    // Parse and normalize symbols
    const symbolList = symbols.split(',').map(s => s.trim()).filter(s => s);
    if (symbolList.length === 0 || symbolList.length > 20) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Symbols must be 1-20 items' }
      });
    }
    
    // Check cache for hits (even if refresh=true, we organize misses first)
    const { cached, misses } = cacheManager.getMultiple(symbolList);
    
    let freshData: any[] = [];
    
    // If refresh=true or cache misses, check circuit breaker before calling brAPI
    if ((refresh === 'true' || misses.length > 0) && cacheManager.canAttemptbrAPICall()) {
      try {
        // Only fetch symbols that missed cache (or are being refreshed)
        const symbolsToFetch = refresh === 'true' ? symbolList : misses;
        
        const brAPIUrl = `${process.env.BRAPI_BASE_URL}/fii/indicators?symbols=${symbolsToFetch.join(',')}`;
        const response = await brAPIClient.get(brAPIUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.BRAPI_TOKEN}`
          },
          timeout: 10000
        });
        
        // Parse and validate response
        if (!response.data || !response.data.data) {
          throw new Error('Invalid brAPI response format');
        }
        
        freshData = response.data.data;
        
        // Cache each symbol individually (and validate no missing denominators)
        for (const fii of freshData) {
          // CRITICAL VALIDATION: Check for missing nav (would cause division by zero in P/VP calc)
          if (fii.nav === null || fii.nav === undefined || fii.nav === 0) {
            logger.warn(`Invalid NAV for ${fii.symbol}: ${fii.nav}. Rejecting record.`);
            continue; // Skip this FII entirely, don't cache it
          }
          
          // Cache individual symbol
          cacheManager.setSingle(fii.symbol, fii, 300); // 5 minute TTL
        }
        
        cacheManager.recordbrAPISuccess();
        
      } catch (error: any) {
        const statusCode = error.response?.status || 500;
        cacheManager.recordbrAPIFailure(statusCode);
        
        // If circuit breaker is OPEN, don't propagate the error yet
        if (statusCode === 429 && !cacheManager.canAttemptbrAPICall()) {
          logger.warn('Circuit Breaker OPEN: Returning cached data or rate limit error');
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. The service is temporarily rate-limited. Please wait a moment and try again.',
              statusCode: 429,
              timestamp: new Date().toISOString()
            }
          });
        }
        
        throw error; // Propagate other errors normally
      }
    } else if (misses.length > 0 && !cacheManager.canAttemptbrAPICall()) {
      // Circuit breaker is open and we have cache misses - return error immediately
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Service is rate-limited. Returning cached data where available.',
          statusCode: 429,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Merge cached + fresh data
    const finalData = [...Object.values(cached), ...freshData];
    
    if (finalData.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_DATA',
          message: 'No valid FII data found for requested symbols',
          statusCode: 404,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Return unified response with timestamp
    return res.json({
      success: true,
      data: finalData,
      cacheHitCount: Object.keys(cached).length,
      cacheMissCount: misses.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    const { statusCode, message } = translateError(error);
    logger.error(`Error fetching FII data: ${error.message}`, { statusCode, symbols: req.query.symbols });
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message,
        statusCode,
        timestamp: new Date().toISOString()
      }
    });
  }
});
```

### Cache Manager Implementation (Granular Per-Symbol with Circuit Breaker)

```typescript
class CacheManager {
  private cache: Map<string, AssetCacheEntry> = new Map();
  private circuitBreaker: CircuitBreakerState = {
    status: 'CLOSED',
    lastFailureTime: null,
    failureCount: 0,
    successCount: 0,
    openDurationMs: 60000  // 1 minute lockout on rate limit
  };
  
  private maxTotalEntries = 500;
  private ttlSeconds = 300;  // 5 minutes per individual symbol
  
  /**
   * Sanitize and normalize symbol list for cache key generation.
   * Converts ?symbols=HGLG11,MXRF11 and ?symbols=MXRF11,HGLG11 to same key.
   */
  private normalizeSymbols(symbols: string[]): string[] {
    return symbols
      .map(s => s.trim().toUpperCase())
      .filter((s, idx, arr) => arr.indexOf(s) === idx) // Remove duplicates
      .sort(); // Alphabetical order ensures consistent hashing
  }
  
  /**
   * Get cached data for a list of symbols.
   * Returns object with cached symbols and list of symbols needing fresh fetch.
   */
  getMultiple(symbols: string[]): { cached: Record<string, any>; misses: string[] } {
    const normalized = this.normalizeSymbols(symbols);
    const cached: Record<string, any> = {};
    const misses: string[] = [];
    
    for (const symbol of normalized) {
      const entry = this.cache.get(symbol);
      
      if (!entry) {
        misses.push(symbol);
        continue;
      }
      
      // Check if cache expired
      if (Date.now() > entry.expiresAt.getTime()) {
        this.cache.delete(symbol);
        misses.push(symbol);
        continue;
      }
      
      // Update LRU tracking
      entry.lastAccessedAt = new Date();
      entry.accessCount++;
      cached[symbol] = entry.value;
    }
    
    return { cached, misses };
  }
  
  /**
   * Set individual symbol in cache with TTL.
   */
  setSingle(symbol: string, value: any, ttlSeconds?: number): void {
    // Enforce capacity limit with LRU eviction
    if (this.cache.size >= this.maxTotalEntries && !this.cache.has(symbol)) {
      let lruKey = '';
      let lruTime = Infinity;
      
      for (const [k, entry] of this.cache.entries()) {
        if (entry.lastAccessedAt.getTime() < lruTime) {
          lruTime = entry.lastAccessedAt.getTime();
          lruKey = k;
        }
      }
      
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }
    
    this.cache.set(symbol, {
      symbol,
      value,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + (ttlSeconds || this.ttlSeconds) * 1000),
      accessCount: 0,
      lastAccessedAt: new Date()
    });
  }
  
  /**
   * Circuit Breaker: Check if we should attempt brAPI calls.
   * Returns false if circuit is OPEN (API rate-limited).
   */
  canAttemptbrAPICall(): boolean {
    const cb = this.circuitBreaker;
    
    if (cb.status === 'CLOSED') {
      return true; // All good, proceed
    }
    
    if (cb.status === 'OPEN') {
      // Check if we've waited long enough to try again
      if (cb.lastFailureTime && Date.now() - cb.lastFailureTime.getTime() > cb.openDurationMs) {
        cb.status = 'HALF_OPEN';
        cb.successCount = 0;
        cb.failureCount = 0;
        return true; // Try one request
      }
      return false; // Still in cooldown period
    }
    
    // HALF_OPEN: Allow limited retry attempts
    return true;
  }
  
  /**
   * Record brAPI success (close circuit if HALF_OPEN).
   */
  recordbrAPISuccess(): void {
    const cb = this.circuitBreaker;
    
    if (cb.status === 'HALF_OPEN') {
      cb.successCount++;
      if (cb.successCount >= 3) { // 3 successful requests = circuit back to normal
        cb.status = 'CLOSED';
        cb.failureCount = 0;
        cb.successCount = 0;
        logger.info('Circuit Breaker: Transitioning to CLOSED (brAPI recovered)');
      }
    }
  }
  
  /**
   * Record brAPI failure (open circuit on repeated 429 errors).
   */
  recordbrAPIFailure(statusCode: number): void {
    const cb = this.circuitBreaker;
    cb.lastFailureTime = new Date();
    
    // Only trigger circuit breaker on rate limit (429) or server errors (5xx)
    if (statusCode === 429 || statusCode >= 500) {
      cb.failureCount++;
      
      if (cb.status === 'CLOSED' && cb.failureCount >= 2) {
        cb.status = 'OPEN';
        cb.failureCount = 0;
        logger.warn(`Circuit Breaker: OPEN (status: ${statusCode}). Cooldown: ${cb.openDurationMs}ms`);
      }
      
      if (cb.status === 'HALF_OPEN') {
        cb.status = 'OPEN';
        cb.failureCount = 0;
        cb.successCount = 0;
        logger.warn(`Circuit Breaker: Failed during HALF_OPEN. Returning to OPEN.`);
      }
    }
  }
  
  getCircuitStatus(): CircuitBreakerState {
    return this.circuitBreaker;
  }
}
```

**Error Translation:**
```typescript
function translateError(error: any): { statusCode: number; message: string } {
  if (error.response?.status === 401) {
    return {
      statusCode: 401,
      message: 'Authentication failed. The server token may have expired. Please contact support.'
    };
  }
  if (error.response?.status === 429) {
    return {
      statusCode: 429,
      message: 'Too many requests. Please wait a moment and try again.'
    };
  }
  if (error.response?.status >= 500) {
    return {
      statusCode: 503,
      message: 'The FII data service is temporarily unavailable. Please try again later.'
    };
  }
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return {
      statusCode: 504,
      message: 'Unable to fetch FII data. Please check your connection and try again later.'
    };
  }
  if (!error.response) {
    return {
      statusCode: 503,
      message: 'Backend service is unavailable. Please try again later.'
    };
  }
  return {
    statusCode: 500,
    message: 'An unexpected error occurred. Please try again later.'
  };
}
```

**Header Stripping:**
```typescript
function stripSensitiveHeaders(headers: Record<string, any>): Record<string, any> {
  const sensitivePatterns = [
    'authorization',
    'x-auth-token',
    'x-api-key',
    'set-cookie',
    'www-authenticate',
    'x-admin-',
    'x-internal-',
    'x-debug-'
  ];
  
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitivePatterns.some(pattern =>
      lowerKey === pattern || lowerKey.startsWith(pattern)
    );
    if (!isSensitive) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
```

### Frontend Data Fetching Pattern

```typescript
// Custom React hook for FII data fetching
function useFIIData(symbols: string[]) {
  const [data, setData] = useState<FIIData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  
  const fetchData = useCallback(async (refresh = false) => {
    if (symbols.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const symbolStr = symbols.join(',');
      const url = `/api/fii/indicators?symbols=${symbolStr}${refresh ? '&refresh=true' : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch FII data');
      }
      
      const result = await response.json();
      setData(result.data);
      setError(null);
    } catch (err: any) {
      setError({
        code: err.code || 'UNKNOWN',
        message: err.message,
        timestamp: new Date(),
        retryCount: 0,
        maxRetries: 3
      });
    } finally {
      setIsLoading(false);
    }
  }, [symbols]);
  
  useEffect(() => {
    fetchData();
  }, [symbols, fetchData]);
  
  return { data, isLoading, error, refresh: () => fetchData(true) };
}
```

### Currency Formatter Implementation

```typescript
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (isNaN(value)) {
    console.warn(`Invalid number passed to formatCurrency: ${value}`);
    return '—';
  }
  
  const isNegative = value < 0;
  const absoluteValue = Math.abs(value);
  
  // Round to 2 decimal places (half-up)
  const rounded = Math.round(absoluteValue * 100) / 100;
  
  // Format with period thousands separator and comma decimal separator
  const parts = rounded.toFixed(2).split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];
  
  // Add thousands separators (period)
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  const formatted = `R$ ${formattedInteger},${decimalPart}`;
  return isNegative ? `-${formatted}` : formatted;
}
```

### P/VP Ratio Formatter Implementation (Hardened Against Division by Zero)

```typescript
export function formatRatio(value: number | null | undefined): {
  displayValue: string;
  status: 'premium' | 'discount' | 'neutral';
  intensity: 'high' | 'low';
  colorToken: string;
  bgToken: string;
  ariaLabel: string;
} {
  // Null/undefined handling
  if (value === null || value === undefined) {
    return {
      displayValue: '—',
      status: 'neutral',
      intensity: 'high',
      colorToken: 'var(--color-neutral-text)',
      bgToken: 'var(--color-neutral-bg)',
      ariaLabel: 'P/VP ratio not available'
    };
  }
  
  // CRITICAL: Reject Infinity, NaN, or invalid numbers (prevents division by zero accidents)
  if (!Number.isFinite(value) || isNaN(value)) {
    console.error(`Invalid P/VP ratio value: ${value}. Rejecting as neutral.`);
    return {
      displayValue: '—',
      status: 'neutral',
      intensity: 'high',
      colorToken: 'var(--color-neutral-text)',
      bgToken: 'var(--color-neutral-bg)',
      ariaLabel: 'Invalid P/VP ratio'
    };
  }
  
  // Additional safety: clamp to reasonable financial values
  if (value < 0 || value > 10) {
    console.warn(`P/VP ratio outside expected range (0-10): ${value}. Clamping for display.`);
    // Still display but use neutral style
    return {
      displayValue: value.toFixed(2),
      status: 'neutral',
      intensity: 'high',
      colorToken: 'var(--color-neutral-text)',
      bgToken: 'var(--color-neutral-bg)',
      ariaLabel: `P/VP ratio: ${value.toFixed(2)} (unusual value)`
    };
  }
  
  const displayValue = value.toFixed(2);
  
  if (value > 1.0) {
    const intensity = value > 1.05 ? 'high' : 'low';
    return {
      displayValue,
      status: 'premium',
      intensity,
      colorToken: intensity === 'high' ? 'var(--color-premium-text)' : 'var(--color-premium-text, opacity: 0.4)',
      bgToken: intensity === 'high' ? 'var(--color-premium-bg)' : 'var(--color-premium-bg, opacity: 0.1)',
      ariaLabel: 'Premium (trading above NAV)'
    };
  } else if (value < 1.0) {
    const intensity = value < 0.95 ? 'high' : 'low';
    return {
      displayValue,
      status: 'discount',
      intensity,
      colorToken: intensity === 'high' ? 'var(--color-discount-text)' : 'var(--color-discount-text, opacity: 0.4)',
      bgToken: intensity === 'high' ? 'var(--color-discount-bg)' : 'var(--color-discount-bg, opacity: 0.1)',
      ariaLabel: 'Discount (trading below NAV)'
    };
  } else {
    // Exactly 1.0 or very close (within floating point epsilon)
    return {
      displayValue,
      status: 'neutral',
      intensity: 'high',
      colorToken: 'var(--color-neutral-text)',
      bgToken: 'var(--color-neutral-bg)',
      ariaLabel: 'At NAV'
    };
  }
}
```

### React Component Pattern (FII Card)

```typescript
export function FIICard({ fii, onViewDetails }: { fii: FormattedFII; onViewDetails: () => void }) {
  return (
    <div className="fii-card dark-theme">
      <div className="card-header">
        <h3 className="symbol">{fii.symbol}</h3>
        <button onClick={onViewDetails} className="details-btn" aria-label={`View ${fii.symbol} details`}>
          ℹ️
        </button>
      </div>
      
      <div className="card-content">
        <div className="metric price">
          <span className="label">Price</span>
          <span className="value">{fii.priceFormatted}</span>
        </div>
        
        <div className="metric yield">
          <span className="label">12M Yield</span>
          <span className="value">{fii.dividendYield12MonthFormatted}</span>
        </div>
        
        <div className="metric pvRatio" style={{
          color: fii.pvRatioFormatted.colorToken,
          backgroundColor: fii.pvRatioFormatted.bgToken,
          transition: 'all 300ms ease-out'
        }}>
          <span className="label">P/VP</span>
          <span className="value" aria-label={fii.pvRatioFormatted.ariaLabel}>
            {fii.pvRatioFormatted.displayValue}
            <BadgeIcon status={fii.pvRatioFormatted.status} />
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## Design Decisions and Rationales

### 1. Backend Proxy Pattern

**Decision:** All brAPI communication goes through Node.js backend proxy; frontend never directly calls brAPI.

**Rationale:**
- **Security**: API tokens never exposed to frontend; can't be leaked via browser DevTools or network inspection
- **Compliance**: Sensitive authentication credentials protected at backend layer
- **Flexibility**: Can change brAPI endpoint or authentication method without frontend changes
- **Performance**: Backend can implement caching, rate limiting, and request batching

### 2. In-Memory Caching with 5-Minute TTL

**Decision:** Cache FII data in Node.js memory (or Redis) for 5 minutes per symbol combination.

**Rationale:**
- **Performance**: Repeated requests for same symbols return instantly (cache hit <100ms vs brAPI ~1-2s)
- **API Quota**: Reduces unnecessary calls to brAPI; important for rate limit compliance
- **Freshness**: 5 minutes balances responsiveness with data freshness for stock market data
- **Manual Refresh**: Users can bypass cache via refresh button for latest data
- **Trade-off**: In-memory cache lost on server restart; acceptable for non-critical financial data

### 3. LRU Cache Eviction

**Decision:** When cache exceeds 100 entries, evict the least recently used entry.

**Rationale:**
- **Memory Management**: Prevents unbounded memory growth on long-running server
- **Common Pattern**: LRU is standard cache eviction strategy; well-understood
- **Locality**: Most users view same FIIs repeatedly; LRU keeps active symbols cached
- **100 Entry Limit**: ~100 unique symbol combinations reasonable for typical FII investor

### 4. Brazilian Real Currency Format

**Decision:** Format all currency values as R$ X.XXX.XXX,XX with period thousands separator and comma decimal separator.

**Rationale:**
- **Local Convention**: Brazilian market convention; familiar to target users
- **Consistency**: All monetary values (price, NAV, assets) use same format
- **Accessibility**: Text-based formatting (not locale-dependent)
- **Round-Half-Up**: Standard financial rounding ensures consistency

### 5. Neon Color Scheme for P/VP Ratios

**Decision:** Premium (>1.0) in neon red (#FF006B), Discount (<1.0) in neon green (#00FF9F), with intensity based on magnitude.

**Rationale:**
- **Visual Clarity**: High-contrast neon colors make premium/discount status immediately apparent
- **Dark Mode**: Neon accents pop against dark background; easier on eyes
- **Intensity Gradient**: Subtle gradient (low intensity 40% opacity for 1.01-1.05 range) provides nuance without overwhelming
- **Accessibility**: Color alone insufficient; includes text labels and badge icons
- **Smooth Fade-In**: 300ms CSS transition provides visual feedback on render

### 6. 10-Second Request Timeout

**Decision:** Backend cancels brAPI requests after 10 seconds; frontend shows timeout error after 30 seconds of total wait.

**Rationale:**
- **User Experience**: 10 seconds sufficient for brAPI under normal conditions
- **Error Recovery**: Don't wait indefinitely; show error state to allow user retry
- **Resource Management**: Prevents connection pooling exhaustion from hung requests
- **Retry Logic**: 3 automatic retries before giving up

### 7. Comprehensive Error Message Translation

**Decision:** Backend translates specific brAPI error codes to user-friendly messages.

**Rationale:**
- **User-Centric**: Non-technical users see actionable messages, not HTTP status codes
- **Debugging**: Error codes/timestamps in collapsible details for technical users
- **Support**: Users know whether to retry, wait, or contact support
- **No Token Leakage**: Error messages never include sensitive details

### 8. Responsive Design with Breakpoints

**Decision:** Mobile (320px), Tablet (768px), Desktop (1024px) breakpoints with distinct layouts.

**Rationale:**
- **Mobile-First**: Design starts for smallest screens; progressively enhance
- **Standard Breakpoints**: 320px/768px/1024px are industry-standard breakpoints
- **Readability**: Single column on mobile prevents text overflow and excessive scrolling
- **Flexibility**: 2-column tablet and 3+ column desktop layouts utilize available space

### 9. Automatic Refresh Every 5-10 Minutes (Configurable)

**Decision:** Frontend optionally refreshes FII data automatically; user can disable or adjust interval.

**Rationale:**
- **Currency**: Stock market data refreshed frequently; users expect updates
- **Bandwidth**: 5-10 minute interval balances freshness with bandwidth/API costs
- **User Control**: Configurable; users on mobile data can disable auto-refresh
- **Fallback**: Manual refresh button always available for immediate updates

### 10. Persistent User Preferences in Browser Local Storage

**Decision:** Store selected FIIs and preferences in browser local storage; restore on page reload.

**Rationale:**
- **Convenience**: Users don't have to re-select FIIs each visit
- **Simple Implementation**: Browser local storage available in all modern browsers
- **Privacy**: Data stored locally; no backend database required initially
- **Future Extensibility**: Can migrate to user accounts/backend storage if auth implemented

---

## Security Considerations

### API Token Protection
- **Storage**: Token stored ONLY in backend environment variable or secrets manager
- **Transmission**: Token sent ONLY in Authorization header to brAPI; never in request body/query params
- **Frontend Access**: Frontend never receives token; can't access it via JavaScript console
- **Code Review**: Code review must verify no hardcoded tokens or environment variable leakage

### Response Sanitization
- **Header Stripping**: All sensitive headers removed before returning to frontend (Authorization, X-Auth-*, Set-Cookie, etc.)
- **Data Filtering**: Response data reviewed to ensure no sensitive metadata included
- **Logging**: Logs never contain full API responses; only relevant fields logged

### Frontend Security
- **HTTPS Only**: All requests to brAPI and backend must use HTTPS (TLS/SSL)
- **CORS**: Backend implements appropriate CORS headers; only allow frontend domain
- **XSS Prevention**: React escapes HTML by default; no dangerous innerHTML usage
- **CSP**: Implement Content Security Policy header to prevent unauthorized script execution

### Backend Security
- **Input Validation**: All query parameters validated (symbol format, length limits)
- **Rate Limiting**: Implement rate limits on backend to prevent abuse
- **Logging**: Log all requests with timestamp, source IP, and outcome
- **Monitoring**: Alert on suspicious patterns (100+ requests from single IP, invalid tokens)

---

## Performance Optimization

### Caching Strategy
- **5-Minute TTL**: Balances freshness with performance
- **LRU Eviction**: Keeps frequently accessed FIIs in cache
- **Cache Key**: Concatenated symbol list (sorted) ensures consistent cache hits
- **Monitor**: Log cache hit ratio; target >80% hit rate

### Frontend Optimization
- **Code Splitting**: Split FIICard component into separate bundle for lazy loading
- **Memoization**: Memoize formatters to prevent re-computation
- **Virtual Scrolling**: For 100+ FII cards, use virtual scrolling to render only visible cards
- **Debouncing**: Debounce search input (300ms) to avoid excessive filtering

### Backend Optimization
- **Connection Pooling**: Reuse HTTP connections to brAPI
- **Compression**: Enable gzip compression on responses
- **Monitoring**: Track response times; alert if average >1 second

---

## Scalability and Distributed Deployment Considerations

**Current Design Scope: Single Instance (Vertical Scaling)**

The in-memory cache design is optimized for single Node.js instance deployment. The following assumptions apply:

1. **Single Process**: All FII data cached in process memory (not shared across processes)
2. **No Load Balancer Distribution**: If deployed behind a load balancer, each instance maintains separate cache
3. **Cache Invalidation**: Manual refresh requests cache-bypass on the instance handling the request, not globally
4. **Failure Scenario**: Instance restart clears all cache (acceptable for non-critical market data)

**For Distributed/Clustered Deployment (Future Enhancement):**

If the application grows to require horizontal scaling (multiple Node.js instances), the following changes are MANDATORY:

1. **Replace In-Memory Cache with Redis**
   - All instances share same cache layer
   - Cache consistency guaranteed across all servers
   - Automatic expiration via Redis TTL
   - Distributed LRU eviction

2. **Example Redis Implementation:**
```typescript
// Replace in-memory cache with Redis client
import redis from 'redis';

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

class CacheManager {
  async getMultiple(symbols: string[]): Promise<{ cached: Record<string, any>; misses: string[] }> {
    const pipeline = redisClient.multi();
    for (const symbol of symbols) {
      pipeline.get(`fii:${symbol}`);
    }
    const results = await pipeline.exec();
    // Process results...
  }
  
  async setSingle(symbol: string, value: any): Promise<void> {
    await redisClient.setex(`fii:${symbol}`, 300, JSON.stringify(value)); // 5-min TTL
  }
}
```

3. **Circuit Breaker State Persistence:**
   - Store circuit breaker status in Redis (key: `circuit:brapi:status`)
   - All instances read/write same state
   - Prevents cascade of independent circuit breaker openings

4. **Load Balancer Configuration:**
   - Use sticky sessions (if cache bypass depends on instance affinity)
   - Or migrate to Redis (recommended for true horizontal scaling)

**Current Deployment Target**: Single Instance on Standard Node.js Runtime
- Memory per instance: ~512MB for cache (handles ~5000+ FII records)
- Supports: 50+ concurrent users with <100ms response latency
- Upgrade path: Add Redis when deployment exceeds single-instance capacity

---

## Summary

The FII Dashboard design provides a complete technical blueprint for building a secure, performant web application for monitoring Brazilian Real Estate Funds. Key design highlights:

### Core Strengths

1. **Security Architecture**: Backend proxy pattern ensures API tokens never exposed; comprehensive response sanitization
2. **Data Integrity**: Property-based testing validates formatters and parsing logic across 100s of input scenarios
3. **Performance**: 5-minute cache with LRU eviction reduces API calls; 60 FPS responsiveness on 20+ cards
4. **User Experience**: Dark mode with neon accents, responsive design across devices, graceful error handling
5. **Maintainability**: Clear separation of concerns, comprehensive logging, extensive testing strategy

### Property-Based Testing Coverage

12 properties provide high-confidence testing of:
- Currency, percentage, and ratio formatting (Properties 1-4)
- Security headers and API integration (Properties 5-6)
- Cache management and eviction (Properties 7-9)
- Data round-trip integrity (Property 10)
- Cache bypass and error handling (Properties 11-12)

### Implementation Roadmap

1. **Phase 1**: Data formatters with property tests
2. **Phase 2**: Parser and pretty-printer with round-trip properties
3. **Phase 3**: Backend proxy with cache and error handling
4. **Phase 4**: Frontend components and responsive design
5. **Phase 5**: Security hardening and performance optimization

### Success Criteria

- Code coverage: 90%+ across all modules
- Performance: <3s initial load, <500ms search, 60 FPS scrolling
- Security: Zero API token leakage in network traffic
- User experience: Responsive on all device sizes, meaningful error messages
- Reliability: 99.9% uptime (assuming brAPI availability), graceful degradation

