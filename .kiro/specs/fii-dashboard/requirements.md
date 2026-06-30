# Requirements Document

# FII Dashboard Requirements Document

## Introduction

The FII Dashboard is a web application that aggregates Real Estate Fund (FII - Fundos de Investimento Imobiliário) market data from the brAPI platform and presents it through a modern, responsive interface. The system enables investors to monitor multiple FII indicators in real-time, compare financial metrics, and make informed investment decisions. The dashboard prioritizes security by proxying all API requests through a Node.js backend, ensuring that sensitive authentication tokens are never exposed to the frontend. The application follows Brazilian market conventions for currency formatting and financial metric presentation.

## Glossary

- **FII (Fundo de Investimento Imobiliário)**: A Real Estate Investment Fund traded on the Brazilian stock exchange.
- **Symbol**: The trading ticker symbol for an FII (e.g., MXRF11, HGLG11).
- **brAPI**: Brazilian API platform providing real-time market data for Brazilian securities.
- **API Token**: Secret authentication credential (sPUuvgpkj52S75JpzcRN7x) used to authenticate requests to brAPI.
- **Backend Proxy**: Node.js/Express server that handles communication with brAPI on behalf of the frontend.
- **Frontend**: React/Next.js web application running in the user's browser.
- **NAV (Net Asset Value)**: The value per share of an FII's underlying assets.
- **P/VP Ratio (Price-to-NAV)**: The relationship between the market price and the NAV of an FII share.
- **Dividend Yield**: The percentage return from dividends; calculated over different periods (1 month, 12 months).
- **Monthly Return**: The percentage gain or loss in an FII's price over one month.
- **Investor Count**: The number of individual shareholders holding an FII.
- **Total Assets**: The total market capitalization of an FII.
- **Administrator**: The financial institution responsible for managing and administering the FII.
- **Dashboard**: The main user-facing interface displaying FII data in cards, tables, or other visual components.
- **Loading State**: The visual and functional state when the Dashboard is fetching data from the Backend Proxy.
- **Error State**: The visual and functional state when the Dashboard or Backend Proxy encounters a failure (timeout, token expiry, service unavailable).
- **Empty State**: The visual state when the Dashboard has no FII data to display due to no search results or initial load.
- **Responsive Design**: The capability of the Dashboard to adapt its layout and functionality across mobile, tablet, and desktop screen sizes.
- **Real Brazilian Real Currency Format**: Currency values formatted as R$ X.XXX.XXX,XX where decimal separator is comma and thousands separator is period.
- **Percentage Format**: Numeric values formatted as XX.XX% with two decimal places.

## Requirements

### Requirement 1: Secure API Token Management

**User Story:** As a DevOps/Security engineer, I want API tokens to be kept secret and never transmitted to the frontend, so that the application remains secure and the authentication credentials cannot be leaked through browser developer tools or network inspection.

#### Acceptance Criteria

1. WHEN the Frontend requests FII data, THE Backend_Proxy SHALL receive the request without any API token present in the request body or headers sent from the Frontend (no Authorization header, no token in query parameters, no token in request body).
2. WHEN the Backend_Proxy receives a request for FII data, THE Backend_Proxy SHALL retrieve the API_Token from environment variable `BRAPI_TOKEN` at runtime and append it to the Authorization header in Bearer format (Authorization: Bearer {BRAPI_TOKEN}) in its own request to brAPI.
3. WHEN the Backend_Proxy receives a response from brAPI, THE Backend_Proxy SHALL strip and remove the following headers before returning the response to the Frontend: Authorization, X-Auth-Token, X-API-Key, Set-Cookie, WWW-Authenticate, and any header matching the pattern X-Auth-*.
4. AT Backend_Proxy startup, IF the environment variable `BRAPI_TOKEN` is not set or is empty, THEN the Backend_Proxy SHALL log an error with message "Missing required environment variable: BRAPI_TOKEN" and refuse to start.
5. IF an inspection of Frontend network traffic (using browser DevTools Network tab) reveals ANY occurrence of the API token string, THEN the application violates this security requirement and SHALL be flagged as a critical security failure.
6. WHERE code files are committed to version control, THE code SHALL NOT contain the API_Token value (hardcoded, in comments, in default values, or in configuration files).
7. WHEN the brAPI response contains sensitive metadata headers or cookies that could reveal system information, THE Backend_Proxy SHALL strip these before returning to Frontend (specifically any Set-Cookie headers and any response headers starting with X-Admin-, X-Internal-, X-Debug-).

---

### Requirement 2: Backend Proxy for brAPI Integration

**User Story:** As an API integrator, I want a centralized Node.js backend to handle all communication with brAPI, so that the frontend remains decoupled from external API changes and all requests pass through a controlled proxy layer.

#### Acceptance Criteria

1. THE Backend_Proxy SHALL expose a REST endpoint that accepts GET requests for FII indicator data.
2. WHEN the Backend_Proxy receives a GET request with a list of FII symbols, THE Backend_Proxy SHALL construct a valid brAPI v2 request URL with the format: GET https://brapi.dev/api/v2/fii/indicators?symbols=SYMBOL1,SYMBOL2,...
3. WHEN the Backend_Proxy sends a request to brAPI, THE Backend_Proxy SHALL include the Authorization header with Bearer token authentication.
4. WHEN brAPI returns a successful response (HTTP 200), THE Backend_Proxy SHALL extract and return the FII data to the Frontend in JSON format.
5. IF brAPI returns an error response (HTTP 4xx or 5xx), THEN THE Backend_Proxy SHALL return an appropriate HTTP status code and a descriptive error message to the Frontend.
6. WHEN multiple Frontend requests arrive simultaneously, THE Backend_Proxy SHALL queue or handle them without blocking other requests.

---

### Requirement 3: Frontend Data Fetching from Backend Proxy

**User Story:** As a frontend developer, I want the React/Next.js application to fetch FII data exclusively from the Node.js Backend_Proxy, so that the frontend never connects directly to brAPI.

#### Acceptance Criteria

1. WHEN the Dashboard component mounts, THE Frontend SHALL make a request to the Backend_Proxy endpoint to fetch FII data.
2. WHEN the user initiates a search or filter action, THE Frontend SHALL make a new request to the Backend_Proxy with updated symbols.
3. IF the Backend_Proxy is unreachable, THEN THE Frontend SHALL display an error message to the user.
4. WHEN the Backend_Proxy returns data, THE Frontend SHALL store the data in React state (or Context/Redux store) for rendering.
5. WHERE a user refreshes the data manually, THE Frontend SHALL make a fresh request to the Backend_Proxy.

---

### Requirement 4: Display FII Price in Brazilian Real Currency Format

**User Story:** As an investor viewing the dashboard, I want to see FII prices formatted in Brazilian Real currency notation, so that I can quickly understand the financial metrics in my local market convention.

#### Acceptance Criteria

1. WHEN the Dashboard displays FII price data, THE Price_Formatter SHALL convert the numeric price value to the format R$ X,XX (for values less than 1,000) or R$ X.XXX,XX (for values 1,000 or greater), using period (.) as thousands separator and comma (,) as decimal separator.
2. WHEN a price value is 9.74, THE Price_Formatter SHALL output "R$ 9,74".
3. WHEN a price value is 150.5, THE Price_Formatter SHALL output "R$ 150,50".
4. WHEN a price value is 4313692700, THE Price_Formatter SHALL output "R$ 4.313.692.700,00" (applying period as thousands separator and comma as decimal separator).
5. WHEN a price value has more than 2 decimal places (e.g., 9.749), THE Price_Formatter SHALL apply round-half-up rounding to 2 decimal places before formatting (9.749 → 9.75 → "R$ 9,75").
6. IF the price value is negative (e.g., -10.50), THE Price_Formatter SHALL output "-R$ 10,50" (negative sign before the currency symbol).
7. IF the price value is null or undefined, THEN THE Price_Formatter SHALL display the placeholder "—" (em dash).
8. WHEN a price value exceeds 999,999,999,999.99, THE Price_Formatter SHALL format the value and display a visual indicator (e.g., warning icon) suggesting the value may represent millions or billions.
9. WHEN the input is not a valid number (NaN or non-numeric string), THE Price_Formatter SHALL return the placeholder "—" and log a warning.
10. WHERE the Dashboard displays equity or total assets values, THE Price_Formatter SHALL apply the same currency formatting rules as defined in this requirement.
11. WHERE the application supports multiple locales, THE Price_Formatter SHALL respect the locale-specific currency format, with PT-BR (Brazilian Portuguese) as the default locale.

---

### Requirement 5: Display FII Dividend Yield as Percentage

**User Story:** As an investor, I want to see dividend yield information formatted as percentages with two decimal places, so that I can easily compare yield metrics across different funds.

#### Acceptance Criteria

1. WHEN the Dashboard displays dividend yield data (1-month yield, 12-month yield), THE Yield_Formatter SHALL convert decimal values to percentage format with two decimal places.
2. WHEN a yield value is 0.12268994, THE Yield_Formatter SHALL output 12.27%.
3. WHEN a yield value is 0.00542, THE Yield_Formatter SHALL output 0.54%.
4. WHEN a yield value is 0.0, THE Yield_Formatter SHALL output 0.00%.
5. IF the yield value is null or undefined, THEN THE Yield_Formatter SHALL display a placeholder such as "—" or "N/A".
6. WHERE multiple yield metrics are displayed (monthly return, dividend yield), THE Yield_Formatter SHALL apply consistent percentage formatting to all.

---

### Requirement 6: Display P/VP Ratio with Visual Indicators

**User Story:** As an investor, I want to see the P/VP ratio (Price-to-NAV) with clear visual indicators showing whether a fund is trading at a premium or discount, so that I can quickly identify opportunities.

#### Acceptance Criteria

1. WHEN the Dashboard displays the P/VP ratio, THE Ratio_Formatter SHALL convert decimal values to exactly two decimal places using round-half-up rounding.
2. WHEN a P/VP value is 1.0392547, THE Ratio_Formatter SHALL output "1.04".
3. WHEN a P/VP value is 0.98765, THE Ratio_Formatter SHALL output "0.99".
4. IF the P/VP ratio is greater than 1.0, THEN THE Dashboard SHALL display the ratio with visual indicators: text color token `--color-premium-text` (neon red #FF006B), background token `--color-premium-bg` (rgba(255, 0, 107, 0.1)), and a badge icon with aria-label="Premium (trading above NAV)".
5. IF the P/VP ratio is less than 1.0, THEN THE Dashboard SHALL display the ratio with visual indicators: text color token `--color-discount-text` (neon green #00FF9F), background token `--color-discount-bg` (rgba(0, 255, 159, 0.1)), and a badge icon with aria-label="Discount (trading below NAV)".
6. IF the P/VP ratio is exactly 1.0, THEN THE Dashboard SHALL display the ratio with neutral visual indicators: text color token `--color-neutral-text` (default text color), background token `--color-neutral-bg` (transparent), and a dash/neutral icon.
7. IF the P/VP value is null or undefined, THEN THE Ratio_Formatter SHALL display the placeholder "—" (em dash) without visual indicators.
8. WHERE the P/VP ratio is between 1.01 and 1.05 (slightly premium), THE Dashboard SHALL use a lower intensity neon red with reduced opacity (40% of full color).
9. WHERE the P/VP ratio is greater than 1.05 (significantly premium), THE Dashboard SHALL use full intensity neon red.
10. WHERE the P/VP ratio is between 0.95 and 0.99 (slightly discount), THE Dashboard SHALL use a lower intensity neon green with reduced opacity (40% of full color).
11. WHERE the P/VP ratio is less than 0.95 (significantly discount), THE Dashboard SHALL use full intensity neon green.
12. WHEN the visual indicator is displayed, THE indicator SHALL fade-in over 300ms when first rendered (CSS transition: all 300ms ease-out) to provide smooth visual feedback.

---

### Requirement 7: Display FII Key Metrics

**User Story:** As an investor, I want to see all relevant FII financial metrics in one view, so that I can make well-informed investment decisions without needing to consult multiple sources.

#### Acceptance Criteria

1. THE Dashboard SHALL display the following metrics for each FII: price, NAV, P/VP ratio, dividend yield (1-month), dividend yield (12-month), monthly return, investor count, and total assets.
2. WHEN the Dashboard renders FII data, THE Dashboard SHALL apply appropriate formatting to each metric (currency for price/NAV/assets, percentage for yields/returns, ratio for P/VP).
3. WHEN administrator information is available in the brAPI response, THE Dashboard SHALL display the administrator name and details.
4. WHERE space permits on the current device, THE Dashboard SHALL display all metrics in a single visual component (card or detailed view).
5. WHERE space is constrained (mobile devices), THE Dashboard MAY collapse some metrics into a "show more" expandable section while keeping key metrics (price, yield) visible.

---

### Requirement 8: Load FII Data with Loading State

**User Story:** As a user, I want to see a loading indicator while the Dashboard is fetching data from the Backend_Proxy, so that I understand the application is working and not frozen.

#### Acceptance Criteria

1. WHEN the Frontend initiates a data fetch request to the Backend_Proxy, THE Dashboard SHALL immediately display a Loading_State (spinner, skeleton screen, or similar indicator).
2. WHILE the Backend_Proxy processes the request, THE Loading_State SHALL remain visible and prevent user interaction with stale data.
3. WHEN the Backend_Proxy returns data successfully, THE Loading_State SHALL disappear and the Dashboard SHALL render the FII data.
4. IF the data fetch takes longer than 30 seconds, THEN THE Dashboard MAY display an additional message indicating the request is taking longer than expected.
5. WHERE the user can refresh data manually, THE Dashboard SHALL display the Loading_State again during the refresh operation.

---

### Requirement 9: Handle API Errors Gracefully

**User Story:** As a user, I want the Dashboard to handle API failures gracefully and display meaningful error messages, so that I understand what went wrong and can take action.

#### Acceptance Criteria

1. IF the Backend_Proxy cannot reach brAPI (network timeout), THEN THE Dashboard SHALL display an error message: "Unable to fetch FII data. Please check your connection and try again later."
2. IF brAPI returns an authentication error (HTTP 401), THEN THE Dashboard SHALL display an error message: "Authentication failed. The server token may have expired. Please contact support."
3. IF brAPI returns a rate limit error (HTTP 429), THEN THE Dashboard SHALL display an error message: "Too many requests. Please wait a moment and try again."
4. IF brAPI returns a 5xx error (service unavailable), THEN THE Dashboard SHALL display an error message: "The FII data service is temporarily unavailable. Please try again later."
5. IF the Frontend cannot connect to the Backend_Proxy, THEN THE Dashboard SHALL display an error message: "Backend service is unavailable. Please try again later."
6. WHEN an error is displayed, THE Dashboard SHALL include a "Retry" button allowing the user to attempt the request again.
7. WHERE detailed error information is available (HTTP status code, timestamp), THE Dashboard MAY display this information in a collapsible section for debugging purposes.

---

### Requirement 10: Handle Empty State When No Data Available

**User Story:** As a user, I want the Dashboard to display a helpful message when no FII data is available, so that I understand the application is working correctly but simply has no results to show.

#### Acceptance Criteria

1. WHEN the user performs a search with no matching results, THE Dashboard SHALL display an Empty_State message: "No FIIs found matching your search. Try different symbols or search terms."
2. WHEN the Dashboard first loads and no FIIs have been selected for display, THE Dashboard SHALL display an Empty_State message: "Select FIIs to display on your dashboard."
3. WHEN an Empty_State is displayed, THE Dashboard SHALL provide guidance on how to proceed (e.g., "Try searching for symbols like MXRF11 or HGLG11" or a link to add FIIs).
4. IF the user has previously viewed data and performs an action that clears results, THE Dashboard SHALL transition smoothly from showing data to showing the Empty_State.

---

### Requirement 11: Display FIIs as Visual Components

**User Story:** As a user, I want to see FIIs presented in a modern, visually organized format with dark mode and neon accents, so that the dashboard is both functional and aesthetically appealing.

#### Acceptance Criteria

1. THE Dashboard SHALL implement a dark mode theme as the default visual style.
2. WHEN FII metrics contain positive indicators (P/VP < 1.0, high yield), THE Dashboard SHALL use neon accent colors (e.g., neon green, neon cyan) to highlight these metrics.
3. WHEN FII metrics contain negative indicators (P/VP > 1.0, low yield), THE Dashboard SHALL use warning accent colors (e.g., neon red, neon orange) to highlight these metrics.
4. WHERE space permits, THE Dashboard SHALL display each FII as a visual card component showing the symbol, price, yield, P/VP ratio, and key metrics at a glance.
5. WHERE detailed view is needed, THE Dashboard SHALL support a table layout or expanded card view showing all available metrics for an FII.
6. WHEN the Dashboard is viewed on a mobile device (width < 768px), THE Dashboard SHALL adapt the visual layout to stack components vertically and reduce font sizes appropriately.
7. WHEN the Dashboard is viewed on a tablet device (width 768px - 1024px), THE Dashboard SHALL display components in a 2-column grid layout.
8. WHEN the Dashboard is viewed on a desktop device (width > 1024px), THE Dashboard SHALL display components in a 3+ column grid layout or table view.

---

### Requirement 12: Search and Filter FIIs by Symbol or Name

**User Story:** As an investor, I want to search for and filter FIIs by their trading symbol or name, so that I can quickly find specific funds to add to my dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a search input field where users can enter FII symbols or partial names.
2. WHEN the user enters a symbol (e.g., "MXRF11"), THE Dashboard SHALL filter the FII list to show only matching symbols.
3. WHEN the user enters partial text (e.g., "MXR"), THE Dashboard SHALL filter the FII list to show all symbols containing the text.
4. WHEN the user clears the search field, THE Dashboard SHALL reset the filter and display all previously selected or available FIIs.
5. WHEN the user clicks on an FII in the search results, THE Dashboard SHALL add that FII to the main dashboard display and fetch its latest data.
6. WHERE multiple matches exist for a partial search, THE Dashboard SHALL display up to 10 results in a dropdown or suggestion list.
7. IF no matches are found for a search query, THE Dashboard SHALL display "No FIIs found" in the search results area.

---

### Requirement 13: Display Detailed Information for Each FII

**User Story:** As an investor, I want to view detailed information for each FII including administrator details and all available metrics, so that I can conduct thorough due diligence before investing.

#### Acceptance Criteria

1. WHEN the user clicks on an FII card or selects "View Details", THE Dashboard SHALL display a detailed view (modal, drawer, or separate page) with all available FII information.
2. WHEN the detailed view is displayed, THE Dashboard SHALL show the administrator name, company details, and any contact information provided by brAPI.
3. THE detailed view SHALL display all FII metrics including: price, NAV, P/VP ratio, 1-month dividend yield, 12-month dividend yield, monthly return, investor count, and total assets.
4. WHERE additional data is available from the brAPI response (dividend history, asset composition, sector breakdown), THE Dashboard MAY display this information in the detailed view.
5. WHEN the user closes the detailed view, THE Dashboard SHALL return to the main dashboard display with all selected FIIs visible.

---

### Requirement 14: Refresh FII Data

**User Story:** As a user, I want the ability to manually refresh FII data and see updated metrics, so that I can check the latest market prices and performance indicators at any time.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a "Refresh" button visible on the main dashboard and detailed views.
2. WHEN the user clicks the Refresh button, THE Dashboard SHALL immediately fetch the latest FII data from the Backend_Proxy for all currently displayed FIIs.
3. WHEN a refresh is initiated, THE Dashboard SHALL display a Loading_State while fetching data.
4. WHEN the refresh completes successfully, THE Dashboard SHALL update all displayed metrics with the latest values.
5. IF a refresh fails, THE Dashboard SHALL display an error message and allow the user to retry.
6. WHERE automatic refresh is desired, THE Dashboard MAY implement periodic automatic refresh every 5-10 minutes (configurable).

---

### Requirement 15: Data Caching to Reduce API Load

**User Story:** As a DevOps engineer, I want the Backend_Proxy to cache FII data appropriately, so that we reduce unnecessary calls to brAPI and improve overall system performance.

#### Acceptance Criteria

1. THE Backend_Proxy SHALL cache FII data in memory or Redis for a maximum of 5 minutes per unique symbol or symbol combination.
2. WHEN the Frontend requests FII data for symbols that have been cached and the cache is still valid, THE Backend_Proxy SHALL return the cached data without querying brAPI.
3. WHEN the cache expires (after 5 minutes), THE Backend_Proxy SHALL discard the cached data and fetch fresh data from brAPI on the next request.
4. WHEN a user manually triggers a refresh, THE Backend_Proxy SHALL bypass the cache and fetch fresh data from brAPI immediately.
5. WHERE the number of cached entries exceeds a reasonable limit (e.g., 100 different symbol combinations), THE Backend_Proxy SHALL evict the oldest entries to prevent memory overflow.

---

### Requirement 16: Handle Timeout and Service Unavailability

**User Story:** As a system operator, I want the application to handle timeouts and service unavailability gracefully, so that temporary outages do not cause crashes or poor user experience.

#### Acceptance Criteria

1. WHEN a request to brAPI exceeds 10 seconds, THE Backend_Proxy SHALL cancel the request and return a timeout error to the Frontend.
2. WHEN a request to brAPI fails due to network connectivity, THE Backend_Proxy SHALL return an appropriate error status code and message.
3. WHEN the Backend_Proxy cannot establish a connection to brAPI after 3 retry attempts, THE Backend_Proxy SHALL return a service unavailability error to the Frontend.
4. IF the Backend_Proxy is restarted, THEN previously cached data SHALL be discarded and fresh data SHALL be fetched on the next request.

---

### Requirement 17: Parse and Pretty-Print FII Data

**User Story:** As an API developer, I want a parser to parse brAPI JSON responses and a pretty-printer to format FII data for display, so that the application correctly handles API responses and presents data consistently.

#### Acceptance Criteria

1. THE Parser SHALL accept brAPI v2 FII indicator JSON responses and extract all FII records from the response.
2. WHEN the Parser encounters a valid FII record, THE Parser SHALL extract the following fields: symbol, price, NAV, P/VP ratio, dividend yield (1-month), dividend yield (12-month), monthly return, investor count, total assets, and administrator information.
3. IF the Parser encounters an invalid or malformed JSON response, THE Parser SHALL return a descriptive error indicating which field or record is problematic.
4. THE Pretty_Printer SHALL format parsed FII data into human-readable strings using the currency, percentage, and ratio formatting rules defined in Requirements 4, 5, and 6.
5. FOR ALL parsed FII data, parsing the JSON then pretty-printing then re-parsing the pretty-printed output SHALL produce an equivalent FII data object (round-trip property).
6. WHEN the Pretty_Printer formats an FII record for display, THE Pretty_Printer SHALL produce output consistent with Brazilian market conventions and the formatting requirements.

---

### Requirement 18: Persistent User Preferences

**User Story:** As a user, I want the Dashboard to remember my selected FIIs and preferences (like dark mode), so that I can return to the application and see my customized view without reconfiguring it.

#### Acceptance Criteria

1. WHEN the user selects FIIs to display on the dashboard, THE Dashboard SHALL persist this selection to browser local storage or a backend database associated with the user.
2. WHEN the user returns to the Dashboard after closing and reopening the browser, THE Dashboard SHALL restore and display the previously selected FIIs.
3. WHEN the user changes theme preferences or other settings, THE Dashboard SHALL persist these preferences and apply them on subsequent visits.
4. WHEN the user clicks a "Reset Dashboard" button, THE Dashboard SHALL clear all saved preferences and return to the default state.
5. WHERE user authentication is implemented, user preferences SHALL be associated with the authenticated user account, not just the browser.

---

### Requirement 19: Responsive Design for Multiple Devices

**User Story:** As a mobile user, I want the Dashboard to adapt seamlessly to my device's screen size, so that I can view FII data comfortably on phones, tablets, and desktops.

#### Acceptance Criteria

1. THE Dashboard SHALL render correctly and remain fully functional on mobile devices (width 320px - 767px).
2. THE Dashboard SHALL render correctly and remain fully functional on tablet devices (width 768px - 1024px).
3. THE Dashboard SHALL render correctly and remain fully functional on desktop devices (width > 1024px).
4. WHEN viewed on a mobile device, THE Dashboard SHALL hide non-essential metrics or place them in expandable sections to reduce scrolling.
5. WHEN viewed on a mobile device, THE Dashboard SHALL use single-column layout for FII cards.
6. WHEN viewed on a tablet device, THE Dashboard SHALL use a 2-column layout for FII cards.
7. WHEN viewed on a desktop device, THE Dashboard SHALL use a 3+ column layout or table view for FII cards.
8. WHEN the user resizes the browser window, THE Dashboard SHALL dynamically adjust its layout to match the new screen size (responsive, not fixed).

---

### Requirement 20: Unit Tests for Data Formatters

**User Story:** As a developer, I want comprehensive unit tests for all data formatting functions, so that I can ensure financial metrics are always formatted correctly and catch regressions early.

#### Acceptance Criteria

1. FOR ALL currency formatting functions, the test suite SHALL include test cases for: values under 1,000, values with thousands separators, values with decimal places, zero values, and null/undefined values.
2. FOR ALL percentage formatting functions, the test suite SHALL include test cases for: various decimal values, rounding edge cases, zero values, and null/undefined values.
3. FOR ALL ratio formatting functions, the test suite SHALL include test cases for: values greater than 1.0, values less than 1.0, values equal to 1.0, and null/undefined values.
4. WHEN running the test suite, THE tests SHALL achieve a minimum code coverage of 90% for all formatter modules.
5. WHEN any formatter test fails, THE test output SHALL clearly indicate which formatting rule was violated and provide the expected vs. actual values.

---

### Requirement 21: Integration Tests for API Layer

**User Story:** As a QA engineer, I want integration tests that verify the Backend_Proxy correctly communicates with brAPI and the Frontend, so that end-to-end API workflows function correctly.

#### Acceptance Criteria

1. THE integration test suite SHALL include tests for: successful FII data retrieval, handling of network timeouts, handling of authentication errors, handling of rate limits, and handling of service unavailability.
2. WHEN the Backend_Proxy receives a request for valid FII symbols, THE integration tests SHALL verify that the Backend_Proxy correctly forwards the request to brAPI and returns the response to the Frontend.
3. WHEN the Backend_Proxy caches data, THE integration tests SHALL verify that cached data is returned for subsequent requests and expired cache entries are refreshed.
4. WHEN the Backend_Proxy encounters an error from brAPI, THE integration tests SHALL verify that the error is correctly translated and returned to the Frontend with an appropriate HTTP status code.
5. WHEN running the integration test suite, all tests SHALL complete within 60 seconds and use mock or test instances of brAPI where feasible.

---

### Requirement 22: Environment Configuration

**User Story:** As a DevOps engineer, I want the application to support environment-based configuration, so that I can easily deploy to different environments (development, staging, production) without code changes.

#### Acceptance Criteria

1. THE Backend_Proxy SHALL read its configuration (API token, cache TTL, brAPI base URL, port) from environment variables.
2. THE Backend_Proxy SHALL support a .env file for local development that defines these environment variables.
3. THE Backend_Proxy SHALL provide clear error messages if required environment variables are missing at startup.
4. THE Frontend SHALL be configurable for different Backend_Proxy endpoints via environment variables (e.g., REACT_APP_BACKEND_URL).
5. WHERE sensitive configuration is involved (API tokens, database credentials), these SHALL be loaded from environment variables only, never hardcoded.

---

### Requirement 23: Performance and Scalability

**User Story:** As a system architect, I want the application to perform well and scale to handle multiple concurrent users and FII symbols, so that the dashboard remains responsive as usage grows.

#### Acceptance Criteria

1. THE Dashboard SHALL load and display initial FII data within 3 seconds on a standard broadband connection (>5 Mbps).
2. WHEN the user searches for FIIs, THE search results SHALL be filtered and displayed within 500ms (client-side filtering).
3. WHEN the Backend_Proxy receives requests for up to 50 concurrent users requesting different FII symbols, THE Backend_Proxy SHALL handle all requests without queuing or dropping requests (assuming the brAPI service is available).
4. WHEN the Dashboard displays 20+ FII cards simultaneously, THE Dashboard SHALL maintain 60 FPS scrolling performance (no visible jank or stuttering).
5. WHERE the number of FIIs grows beyond initial expectations, THE Backend_Proxy SHALL support pagination or lazy loading to avoid fetching data for thousands of symbols simultaneously.

---

### Requirement 24: Logging and Monitoring

**User Story:** As an operations engineer, I want the Backend_Proxy to log important events and provide visibility into system performance, so that I can troubleshoot issues and monitor application health.

#### Acceptance Criteria

1. THE Backend_Proxy SHALL log all incoming requests with timestamp, request path, method, and status code.
2. WHEN the Backend_Proxy makes a request to brAPI, THE Backend_Proxy SHALL log the request details and response status code.
3. WHEN an error occurs (timeout, service unavailability, parsing error), THE Backend_Proxy SHALL log the error with full context (stack trace, request details, timestamp).
4. WHERE performance metrics are valuable, THE Backend_Proxy MAY log the response time for each brAPI request.
5. THE application SHALL provide a way to configure log verbosity (debug, info, warning, error) via environment variables.

