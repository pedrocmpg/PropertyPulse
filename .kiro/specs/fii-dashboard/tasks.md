# Implementation Plan: FII Dashboard

## Overview

This implementation follows a structured, testable approach to building a secure FII Dashboard with proper data formatting, granular caching, and Circuit Breaker rate limiting. The design separates backend proxy logic, frontend React components, and shared data transformers. Property-based testing validates universal formatting and caching behaviors; unit tests validate specific examples. Tasks are ordered to enable early validation and integration at each step.

## Tasks

- [x] 1. Set up project structure and core interfaces
  - Set up Node.js/Express backend directory structure with src/models, src/handlers, src/cache, src/errors
  - Set up React/Next.js frontend directory structure with components, hooks, utils
  - Define TypeScript interfaces in shared models: FIIData, CacheEntry, CircuitBreakerState, ErrorState
  - Configure testing frameworks: Jest for backend, Vitest with React Testing Library for frontend
  - Set up environment configuration (.env.example, config loader)
  - _Requirements: 1.1, 2.1, 3.1, 22.1_

- [x] 2. Implement data formatters with property-based tests
  - [x] 2.1 Implement CurrencyFormatter using native Intl.NumberFormat
    - Write formatCurrency(value: number | null | undefined): string using 'pt-BR' locale
    - Handle edge cases: null, undefined, NaN, negative values, very large numbers
    - Return "—" placeholder for null/undefined/NaN
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10_

  - [x] 2.2 Write property test for CurrencyFormatter
    - **Property 1: Currency Formatting (Using Native Intl.NumberFormat)**
    - **Property 2: Currency Rounding**
    - **Validates: Requirements 4.1, 4.3, 4.5**
    - Use fast-check with fc.float() to generate random numeric values
    - Verify: Output contains R$ symbol, comma separator, period thousands separator, correct rounding
    - Minimum 100 iterations

  - [x] 2.3 Implement PercentageFormatter
    - Write formatPercentage(value: number | null | undefined): string
    - Convert decimal (0.12268994) to percentage format with 2 decimal places (12.27%)
    - Return "—" placeholder for null/undefined/NaN
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 2.4 Write property test for PercentageFormatter
    - **Property 3: Percentage Formatting**
    - **Validates: Requirement 5.1**
    - Use fast-check with fc.float({min: 0, max: 1}) for percentage values
    - Verify: Output matches XX.XX% pattern, exactly 2 decimal places
    - Minimum 100 iterations

  - [x] 2.5 Implement RatioFormatter
    - Write formatRatio(value: number | null | undefined): {displayValue: string; status: 'premium' | 'discount' | 'neutral'; intensity: 'high' | 'low'; ariaLabel: string}
    - Format to 2 decimal places with round-half-up rounding
    - Determine status: > 1.0 = premium, < 1.0 = discount, === 1.0 = neutral
    - Determine intensity: high if outside [0.95, 1.05], low if inside
    - Return "—" displayValue for null/undefined/NaN with neutral status
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12_

  - [x] 2.6 Write property test for RatioFormatter
    - **Property 4: P/VP Ratio Formatting**
    - **Validates: Requirement 6.1**
    - Use fast-check with fc.float({min: 0.8, max: 1.2}) for P/VP values
    - Verify: Output has exactly 2 decimal places, status correctly determined
    - Minimum 100 iterations

- [x] 3. Implement FII Parser with round-trip property test
  - [x] 3.1 Implement FIIParser class
    - Write parsebrAPIResponse(jsonResponse: any): {fiis: ParsedFII[]; errors?: ParseError[]}
    - Extract: symbol, price, nav, pvRatio, dividendYield1Month, dividendYield12Month, monthlyReturn, investorCount, totalAssets, administrator
    - Validate NAV is not null/undefined/0 (prevents division by zero in P/VP calc)
    - Skip FII record if NAV invalid; log warning with symbol
    - Validate all numeric fields are actual numbers, not strings; reject records with type mismatches
    - Return descriptive errors for malformed JSON or missing required fields
    - _Requirements: 17.1, 17.2, 17.3_

  - [x] 3.2 Write property test for FIIParser round-trip
    - **Property 10: FII Parser Round-Trip**
    - **Validates: Requirement 17.3**
    - Use fast-check to generate random valid FII objects
    - Verify: Parse → Pretty-Print → Parse produces equivalent data objects
    - Minimum 100 iterations

- [x] 4. Implement FIIPrettyPrinter
  - [x] 4.1 Implement FIIPrettyPrinter class
    - Write prettyPrintFII(fii: ParsedFII): FormattedFII
    - Use CurrencyFormatter for price, nav, totalAssets
    - Use PercentageFormatter for yields and monthly return
    - Use RatioFormatter for pvRatio
    - Use native Intl.NumberFormat for investorCount with 'pt-BR' locale
    - Return FormattedFII with all fields formatted
    - _Requirements: 4.1, 5.1, 6.1, 7.2, 17.4, 17.5, 17.6_

- [x] 5. Checkpoint - Data formatting validation
  - Run unit tests for formatters and parser
  - Verify property-based tests pass (all 4 properties)
  - Verify code coverage ≥ 95% for formatter modules
  - Ensure all tests pass, ask the user if questions arise

- [x] 6. Implement backend Cache Manager with granular per-symbol caching
  - [x] 6.1 Create CacheManager class with per-symbol granularity
    - Constructor accepts config: {ttlSeconds: 300, maxEntriesPerSymbol: 1, maxTotalEntries: 500}
    - Store cache entries by symbol (separate entry per symbol, not per combination)
    - Implement set(symbol: string, value: T, ttlSeconds?: number): void
    - Implement get(symbol: string): T | null (returns null if expired or not found)
    - Track createdAt, expiresAt, accessCount, lastAccessedAt for each entry
    - _Requirements: 15.1, 15.2, 15.3, 15.5_

  - [x] 6.2 Write property test for Cache expiration logic
    - **Property 8: Cache Expiration**
    - **Validates: Requirement 15.3**
    - Generate random symbols and cache entries with various TTLs
    - Verify: Expired entries return null, valid entries return value
    - Minimum 100 iterations

- [x] 7. Implement Circuit Breaker for rate limiting (429 handling)
  - [x] 7.1 Create CircuitBreaker class
    - States: CLOSED (normal), OPEN (reject requests, 60s duration), HALF_OPEN (test requests)
    - Constructor accepts config: {openDurationMs: 60000, halfOpenTestRequests: 3}
    - Implement recordSuccess(): void (increment success count, transition to CLOSED if 3 successes in HALF_OPEN)
    - Implement recordFailure(): void (increment failure count, transition to OPEN if any failure in HALF_OPEN)
    - Implement canAttempt(): boolean (return false if OPEN, true otherwise)
    - Implement on429Error(): void (transition to OPEN immediately, set timer for HALF_OPEN after 60s)
    - _Requirements: 9.0, 16.1, 16.2_

  - [x] 7.2 Write property test for Circuit Breaker state transitions
    - **Property 12: Circuit Breaker on Rate Limit**
    - **Validates: Requirement 9.0**
    - Simulate sequences of 429 errors and successes
    - Verify: Correct state transitions (CLOSED → OPEN, OPEN → HALF_OPEN, HALF_OPEN → CLOSED or OPEN)
    - Verify: Timing constraints (60s open duration, 3 test requests)
    - Minimum 100 iterations

- [x] 8. Implement backend request handler with brAPI integration
  - [x] 8.1 Create RequestHandler middleware
    - Extract symbol parameter from query string; validate non-empty
    - Retrieve BRAPI_TOKEN from environment; throw error if missing (Requirement 1.4)
    - Construct brAPI URL: GET https://brapi.dev/api/v2/fii/indicators?symbols=SYMBOL1,SYMBOL2,...
    - Check cache first; if valid cached data exists, return immediately (bypass brAPI call)
    - If cache miss or refresh flag set, call brAPI with 10-second timeout
    - Parse response; skip invalid FII records (invalid NAV, type mismatches)
    - Cache valid response per symbol for 5 minutes (granular caching)
    - Strip sensitive headers from brAPI response before returning to frontend
    - Return {success: true, data: FIIData[]} on success
    - Return {success: false, error: {code, message, statusCode, timestamp}} on error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 1.1, 1.2, 1.7_

  - [x] 8.2 Write property test for sensitive header stripping
    - **Property 5: Sensitive Header Stripping**
    - **Validates: Requirements 1.3, 1.7**
    - Generate random response headers including sensitive patterns
    - Verify: All matching headers removed (Authorization, Set-Cookie, X-Auth-*, X-Admin-*, X-Debug-*, X-Internal-*)
    - Verify: Safe headers preserved
    - Minimum 100 iterations

  - [x] 8.3 Write property test for brAPI URL construction
    - **Property 6: brAPI URL Construction**
    - **Validates: Requirement 2.2**
    - Generate symbol lists (single and multiple)
    - Verify: URL format correct, symbols comma-separated, no duplicate symbols
    - Minimum 100 iterations

- [x] 9. Implement error handling and response translation
  - [x] 9.1 Create ErrorTranslator class
    - Map HTTP error codes to user-friendly messages:
      - 429 (Rate Limited) → "Too many requests. Please wait a moment and try again."
      - 401 (Unauthorized) → "Authentication failed. The server token may have expired. Please contact support."
      - 503/504 (Service Unavailable/Timeout) → "The FII data service is temporarily unavailable. Please try again later."
      - Network timeout → "Unable to fetch FII data. Please check your connection and try again later."
    - Return structured error object: {code: string; message: string; statusCode: number; timestamp: Date}
    - Log all errors with context (request ID, symbols, error details)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 16.1, 16.2_

- [ ] 10. Checkpoint - Backend core functionality
  - Run backend unit tests (request handler, cache, circuit breaker, error translator)
  - Verify property-based tests pass (Properties 5, 6, 8, 12)
  - Verify code coverage ≥ 90% for backend modules
  - Test cache hit/miss scenarios with actual brAPI calls (mock)
  - Test error handling for 401, 429, 503, timeout scenarios
  - Ensure all tests pass, ask the user if questions arise

- [x] 11. Implement frontend API client hook
  - [x] 11.1 Create useFIIData React hook
    - Export hook with signature: useFIIData(symbols: string[], options?: {refreshInterval?: number}): {data: Record<string, FIIData>; isLoading: boolean; error: ErrorState | null; isEmpty: boolean; refresh: () => Promise<void>}
    - Maintain state: fiiData (Record type for immutability), isLoading, error, isEmpty
    - On mount and symbol change: fetch from /api/fii/indicators?symbols=...
    - Parse response; filter out invalid records
    - Update state immutably using React pattern: {...prev, fiiData: {...prev.fiiData, [symbol]: data}}
    - Handle errors; catch network errors, HTTP errors, parse errors
    - Implement manual refresh with cache bypass
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 12. Implement frontend components
  - [x] 12.1 Create DashboardLayout component
    - Render: Header (search input, refresh button), FII cards grid, error/loading/empty states
    - Accept props: fiiData (Record<string, FIIData>), isLoading, error, isEmpty
    - Render LoadingState, ErrorState, or EmptyState based on state
    - Responsive grid: 1 column (mobile <768px), 2 columns (tablet 768-1024px), 3+ columns (desktop >1024px)
    - _Requirements: 11.1, 11.2, 11.4, 11.5, 11.6, 11.7, 11.8, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

  - [x] 12.2 Create FIICard component
    - Accept props: fii (FormattedFII), onDetailClick: () => void
    - Render: Symbol, Name, Price (formatted), Yield (formatted), P/VP (formatted with visual indicators)
    - Apply visual styling: dark mode background, neon accents based on P/VP status
    - Apply P/VP color tokens and intensity: --color-premium-text (#FF006B), --color-premium-bg, --color-discount-text (#00FF9F), --color-discount-bg, neutral
    - Apply fade-in transition over 300ms using CSS transition
    - _Requirements: 6.4, 6.5, 6.8, 6.9, 6.10, 6.11, 6.12, 7.1, 7.4, 7.5, 11.1, 11.2, 11.3_

  - [x] 12.3 Create LoadingState component
    - Render: Spinner or skeleton screens for FII cards
    - If loading time >30s, render additional message: "Taking longer than expected..."
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 12.4 Create ErrorState component
    - Accept props: error (ErrorState), onRetry: () => void
    - Render: Error message based on error code, Retry button, collapsible details section
    - Details section: HTTP status code, timestamp, request ID
    - Track retry count; after 3 failures, suggest contacting support
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 12.5 Create EmptyState component
    - Render: Guidance message ("Select FIIs to display" or "No FIIs found"), suggestions
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 12.6 Create SearchInput component
    - Accept props: value: string; onChange: (value: string) => void; onSelect: (symbol: string) => void
    - Render: Input field, dropdown suggestions (max 10 results)
    - Filter by symbol prefix and name prefix (case-insensitive)
    - On select: add FII to dashboard
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_


- [x] 13. Implement FIIDetailView component
  - [x] 13.1 Create FIIDetailView modal/drawer
    - Accept props: fii (FormattedFII), isOpen: boolean, onClose: () => void
    - Display: All FII metrics (price, NAV, P/VP, yields, monthly return, investor count, total assets)
    - Display: Administrator details (name, CNPJ, email)
    - Include: Refresh button to fetch latest data
    - Render in modal or drawer depending on device (modal for desktop, drawer for mobile)
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 14. Implement browser local storage persistence
  - [x] 14.1 Create useUserPreferences React hook
    - Maintain state: selectedFIIs (string[]), theme ('dark' | 'light'), refreshInterval (number), selectedMetrics (string[])
    - On state change: save to localStorage with key 'fiiDashboard_preferences'
    - On component mount: restore from localStorage
    - Export functions: savePreferences(), loadPreferences(), clearPreferences()
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [x] 14.2 Integrate preferences into DashboardLayout
    - Load selectedFIIs from localStorage on mount
    - Fetch data for previously selected FIIs
    - Persist new selections to localStorage
    - Restore theme preference and apply CSS class to document root
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 15. Add responsive design and dark mode theming
  - [x] 15.1 Create CSS theme tokens
    - Define color tokens for dark mode: --color-premium-text, --color-premium-bg, --color-discount-text, --color-discount-bg, --color-neutral-text, --color-neutral-bg
    - Define spacing tokens for responsive layout
    - Define transitions for smooth animations (300ms fade-in for P/VP indicators)
    - _Requirements: 11.1, 11.2, 11.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12_

  - [x] 15.2 Implement responsive grid layout
    - Use CSS Grid or Tailwind with responsive breakpoints
    - Mobile (<768px): 1 column, single-column layout for search and FII cards
    - Tablet (768-1024px): 2 columns for FII cards
    - Desktop (>1024px): 3+ columns for FII cards
    - Test layout on actual mobile/tablet/desktop resolutions
    - _Requirements: 11.5, 11.6, 11.7, 11.8, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

- [ ] 16. Checkpoint - Frontend core components
  - Render DashboardLayout with mock FII data
  - Verify responsive layout on mobile (320px), tablet (768px), desktop (1200px)
  - Verify dark mode rendering and P/VP visual indicators
  - Verify LoadingState, ErrorState, EmptyState rendering
  - Verify SearchInput filters and suggestions
  - Run unit tests for all components
  - Verify code coverage ≥ 85% for frontend components
  - Ensure all tests pass, ask the user if questions arise

- [x] 17. Wire frontend and backend together
  - [x] 17.1 Integrate useFIIData hook into DashboardLayout
    - Call useFIIData(selectedFIIs) to fetch data on mount and when selectedFIIs changes
    - Bind LoadingState, ErrorState, EmptyState to hook state (isLoading, error, isEmpty)
    - Bind FII cards to hook data with pretty-printed formatting
    - Wire refresh button to hook.refresh()
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 17.2 Wire SearchInput to add FIIs to dashboard
    - On SearchInput select: add symbol to selectedFIIs
    - Persist selected FIIs to localStorage
    - Trigger re-fetch of FII data
    - _Requirements: 12.5, 18.1, 18.2_

  - [x] 17.3 Wire FIIDetailView to FIICard
    - On FIICard click: open FIIDetailView with FII data
    - Include refresh button in detail view
    - _Requirements: 13.1, 14.2, 14.4_

- [ ] 18. Implement environment configuration
  - [-] 18.1 Create backend environment configuration
    - Load from .env: BRAPI_TOKEN, BRAPI_BASE_URL, BACKEND_PORT, NODE_ENV, LOG_LEVEL, CACHE_TTL_SECONDS, REQUEST_TIMEOUT_MS, MAX_RETRIES
    - Validate required vars on startup; fail if missing
    - Export as singleton config object
    - _Requirements: 1.4, 22.1, 22.2_

  - [-] 18.2 Create frontend environment configuration
    - Load from .env: REACT_APP_BACKEND_URL, REACT_APP_REFRESH_INTERVAL
    - Use in useFIIData hook for API calls and polling
    - _Requirements: 22.1, 22.2_

- [ ] 19. Add comprehensive logging and monitoring
  - [ ] 19.1 Create Logger utility for backend
    - Log all API requests: method, path, query, response status, duration
    - Log all cache operations: hit/miss, symbol, TTL
    - Log all errors: code, message, stack trace (debug mode only), context
    - Prevent duplicate error logs within 60s window
    - Use configurable log levels (debug, info, warning, error)
    - _Requirements: 1.4, 9.0, 16.1, 16.2_

- [ ] 20. Write integration tests for end-to-end workflows
  - [ ] 20.1 Test User Story 1: Add FII and View Data
    - User searches for "MXRF11", backend fetches from brAPI, frontend displays formatted data
    - Verify: All metrics formatted correctly, cache stores entry, subsequent requests use cache
    - _Requirements: 3.1, 3.2, 3.5, 12.5, 14.1, 14.2, 14.3, 14.4_

  - [ ] 20.2 Test User Story 2: Handle Timeout
    - Backend times out (>10s) waiting for brAPI, frontend displays error, user clicks Retry
    - Verify: Error message displays, retry button functions, after 3 failures shows support message
    - _Requirements: 9.1, 9.5, 16.1, 16.2_

  - [ ] 20.3 Test User Story 3: Cache Hit
    - User requests "MXRF11" at time T, backend caches result
    - User requests again at T+2 minutes
    - Verify: Backend returns cached result without calling brAPI, data identical
    - _Requirements: 15.1, 15.2, 15.3_

  - [ ] 20.4 Test User Story 4: Cache Expiration
    - User requests "MXRF11" at time T, backend caches for 5 minutes
    - User requests at T+6 minutes
    - Verify: Cache expired, fresh data fetched from brAPI
    - _Requirements: 15.1, 15.3, 15.5_

  - [ ] 20.5 Test User Story 5: Token Security
    - Inspect network traffic using browser DevTools
    - Verify: No API token in frontend requests, no sensitive headers in responses
    - _Requirements: 1.1, 1.2, 1.3, 1.7_

  - [ ] 20.6 Test User Story 6: Responsive Design
    - Open dashboard on mobile (320px), tablet (768px), desktop (1200px)
    - Verify: Single-column, 2-column, 3+ column layouts respectively
    - Verify: All components functional and readable on each device
    - _Requirements: 11.5, 11.6, 11.7, 11.8, 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7, 19.8_

  - [ ] 20.7 Write property test for Cache eviction (LRU)
    - **Property 9: Cache Eviction**
    - **Validates: Requirement 15.5**
    - Add 500+ cache entries and verify LRU eviction maintains max capacity
    - Minimum 100 iterations

  - [ ] 20.8 Write property test for Cache bypass on refresh
    - **Property 11: Cache Bypass on Refresh**
    - **Validates: Requirement 15.4**
    - Set cache entries, refresh with bypass flag, verify fresh brAPI call made
    - Minimum 100 iterations


- [ ] 21. Final checkpoint - System integration
  - Run full test suite: unit tests, property-based tests (all 12 properties), integration tests
  - Verify code coverage ≥ 90% overall, ≥ 95% for formatters, ≥ 90% for backend, ≥ 85% for frontend
  - Test performance: initial load <3s on 5 Mbps, search <500ms, scroll 60 FPS
  - Test concurrent 50 users: no dropped requests
  - Ensure all tests pass, ask the user if questions arise

- [ ] 22. Document system deployment considerations
  - [ ] 22.1 Document single-instance deployment
    - In-memory cache suitable for single backend instance
    - No cache synchronization needed between instances
    - Suitable for: development, staging, small production deployments (<100k requests/day)
    - _Requirements: 15.1, 15.2_

  - [ ] 22.2 Document distributed deployment scenario
    - For multi-instance: migrate to Redis cache for cache sharing between instances
    - Implement cache invalidation across instances using Redis Pub/Sub or cache-control headers
    - Consider sticky sessions or request routing by symbol to reduce cache inconsistency
    - Implement distributed Circuit Breaker using Redis or shared state
    - Documentation: how to switch from in-memory to Redis; configuration changes required
    - _Requirements: 15.1, 15.2, 16.1_

  - [ ] 22.3 Create deployment guide
    - Backend deployment: npm install, npm run build, npm start with BRAPI_TOKEN env var
    - Frontend deployment: npm install, npm run build, REACT_APP_BACKEND_URL pointing to backend proxy
    - Environment setup: .env file template with all required variables
    - Health checks: /health endpoint for backend monitoring
    - _Requirements: 1.4, 22.1, 22.2_

## Notes

- Tasks marked with `*` are optional property-based tests and integration tests. Core implementation (unmarked tasks) must be completed first, then optional tests provide additional coverage.
- Each task references specific requirements for traceability and audit purposes.
- Property-based tests use fast-check with minimum 100 iterations to catch edge cases.
- Checkpoints validate core functionality before proceeding to next major phase.
- Responsive design uses CSS Grid/Tailwind breakpoints: mobile <768px, tablet 768-1024px, desktop >1024px.
- Dark mode and neon accents implemented via CSS theme tokens, not inline styles.
- React state uses Record<string, T> type (not Map) for immutability and React reactivity.
- Circuit Breaker prevents thundering herd during rate limits; no exponential backoff.
- Granular per-symbol caching reduces memory footprint and enables symbol-specific TTL management.
- Sensitive header stripping prevents information leakage (tokens, auth details, debug info).
- NAV validation prevents division-by-zero errors in P/VP ratio calculation.
- All formatters use native Intl.NumberFormat for Brazilian Portuguese locale consistency.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "3.1", "6.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.6", "3.2", "6.2", "7.2", "4.1"] },
    { "id": 3, "tasks": ["8.1", "8.2", "8.3", "9.1"] },
    { "id": 4, "tasks": ["11.1", "12.1", "12.2", "12.3", "12.4", "12.5", "12.6"] },
    { "id": 5, "tasks": ["13.1", "14.1", "14.2", "15.1", "15.2"] },
    { "id": 6, "tasks": ["17.1", "17.2", "17.3", "18.1", "18.2", "19.1"] },
    { "id": 7, "tasks": ["20.1", "20.2", "20.3", "20.4", "20.5", "20.6", "20.7", "20.8"] },
    { "id": 8, "tasks": ["22.1", "22.2", "22.3"] }
  ]
}
```
