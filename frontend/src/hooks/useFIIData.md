# useFIIData React Hook

## Overview

`useFIIData` is a custom React hook for fetching and managing FII (Fundo de Investimento Imobiliário) data from the backend proxy. The hook handles all data fetching, state management, error handling, and cache bypass functionality.

## Signature

```typescript
function useFIIData(
  symbols: string[],
  options?: { refreshInterval?: number }
): {
  data: Record<string, FIIData>;
  isLoading: boolean;
  error: ErrorState | null;
  isEmpty: boolean;
  refresh: () => Promise<void>;
}
```

## Parameters

### `symbols: string[]`
- Array of FII symbols to fetch (e.g., `['MXRF11', 'HGLG11']`)
- On change, automatically triggers a new fetch
- Empty array sets `isEmpty` to true

### `options?: object` (optional)
- `refreshInterval?: number` - Automatic refresh interval in milliseconds (e.g., 300000 for 5 minutes)
- If not provided or ≤ 0, no automatic refresh is set up

## Return Value

### `data: Record<string, FIIData>`
- Immutable record mapping symbol to FIIData object
- Updated immutably on fetch success: `{...prev, fiiData: {...prev.fiiData, [symbol]: data}}`
- Persists across requests (adding new symbols doesn't clear old data)

### `isLoading: boolean`
- `true` while fetching data
- `false` when not fetching or when fetch completes

### `error: ErrorState | null`
- `null` when no error
- Contains `{ code, message, statusCode, timestamp }` on error
- Automatically translated to user-friendly messages based on HTTP status codes

### `isEmpty: boolean`
- `true` when no FII data is available (empty symbols, no results, or filter removed all records)
- `false` when at least one FII record is present

### `refresh: () => Promise<void>`
- Async function to manually refresh data
- Bypasses cache on backend (sends `refresh=true` parameter)
- Sets `isLoading` to true during refresh
- Handles errors same as initial fetch

## State Management

The hook uses React's `useState` with immutable updates:

```typescript
setFiiData((prev) => ({
  ...prev,
  fiiData: { ...prev.fiiData, [symbol]: data }
}));
```

This ensures:
- React detects state changes via reference comparison
- Multiple FIIs can be added incrementally
- Previous FII data is preserved

## Error Handling

Error codes and translations:

| Code | Status | Message |
|------|--------|---------|
| `RATE_LIMITED` | 429 | "Too many requests. Please wait a moment and try again." |
| `UNAUTHORIZED` | 401 | "Authentication failed. The server token may have expired. Please contact support." |
| `SERVICE_UNAVAILABLE` | 503 | "The FII data service is temporarily unavailable. Please try again later." |
| `TIMEOUT` | 504 | "Unable to fetch FII data. Please check your connection and try again later." |
| `BACKEND_UNAVAILABLE` | 502 | "Backend service is unavailable. Please try again later." |
| `NETWORK_ERROR` | 0 | "Unable to fetch FII data. Please check your connection and try again later." |
| `PARSE_ERROR` | 0 | Same as NETWORK_ERROR |

## API Contract

### Request
```
GET /api/fii/indicators?symbols=MXRF11,HGLG11&refresh=true
```

- No Authorization header required (handled by backend)
- No API token sent from frontend
- `symbols` parameter: comma-separated FII symbols
- `refresh` parameter: optional, set to `true` to bypass cache

### Response
```json
{
  "success": true,
  "data": [
    {
      "symbol": "MXRF11",
      "price": 9.74,
      "nav": 9.3678,
      "pvRatio": 1.0392547,
      "dividendYield1Month": 0.12268994,
      "dividendYield12Month": 0.12543876,
      "monthlyReturn": 0.02543,
      "investorCount": 45678,
      "totalAssets": 4313692700,
      "administrator": {
        "name": "XP Administração",
        "cnpj": "00.000.000/0001-00",
        "email": "contact@xp.com.br"
      }
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests",
    "statusCode": 429,
    "timestamp": "2024-01-15T10:30:45Z"
  }
}
```

## Examples

### Basic Usage
```typescript
function Dashboard() {
  const { data, isLoading, error, isEmpty } = useFIIData(['MXRF11', 'HGLG11']);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error} />;
  if (isEmpty) return <EmptyState />;

  return (
    <div>
      {Object.entries(data).map(([symbol, fii]) => (
        <FIICard key={symbol} fii={fii} />
      ))}
    </div>
  );
}
```

### With Manual Refresh
```typescript
function DashboardWithRefresh() {
  const { data, refresh } = useFIIData(['MXRF11']);

  return (
    <>
      <button onClick={refresh}>Refresh Data</button>
      {data.MXRF11 && <FIICard fii={data.MXRF11} />}
    </>
  );
}
```

### With Automatic Refresh
```typescript
function DashboardAutoRefresh() {
  // Refresh every 5 minutes
  const { data, isLoading } = useFIIData(['MXRF11', 'HGLG11'], {
    refreshInterval: 300000,
  });

  return (
    <>
      {isLoading && <span>Updating...</span>}
      {Object.values(data).map((fii) => (
        <FIICard key={fii.symbol} fii={fii} />
      ))}
    </>
  );
}
```

### Symbol Addition
```typescript
function SearchAndAdd() {
  const [selectedSymbols, setSelectedSymbols] = useState(['MXRF11']);
  const { data } = useFIIData(selectedSymbols);

  const handleAdd = (symbol: string) => {
    setSelectedSymbols([...selectedSymbols, symbol]);
  };

  return (
    <>
      <SearchInput onSelect={handleAdd} />
      {Object.entries(data).map(([symbol, fii]) => (
        <FIICard key={symbol} fii={fii} />
      ))}
    </>
  );
}
```

## Environment Variables

The hook uses environment variable to determine backend URL:

```bash
REACT_APP_BACKEND_URL=http://localhost:3001
# or
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

Defaults to `http://localhost:3001` if not set.

## Security Notes

1. **No API Token Sent**: The hook never sends the brAPI token from the frontend. All communication uses the backend proxy.
2. **No Token in URL**: Symbols and refresh flags are URL parameters, never tokens.
3. **Content-Type Only**: Only Content-Type header is set; no Authorization header.

## Testing

The hook includes comprehensive unit tests covering:
- Initial state and data fetching
- Error handling (network, HTTP 401/429/503/504)
- Cache bypass on refresh
- Immutable state updates
- Symbol changes
- Empty state handling
- API contract verification
- Automatic refresh intervals

Run tests with:
```bash
npm test -- useFIIData.test.ts
```

## Performance Considerations

1. **Immutable Updates**: Record updates use spread operator for immutability
2. **Selective Refresh**: Use `refresh()` to bypass cache when needed
3. **Batch Requests**: Multiple symbols in one request reduces API calls
4. **Automatic Refresh**: `refreshInterval` option for periodic updates without manual calls

## Requirements Coverage

- **Requirements 3.1, 3.2, 3.3, 3.4, 3.5**: Frontend data fetching from backend proxy
- **Requirements 14.1, 14.2, 14.3, 14.4, 14.5**: Manual refresh with cache bypass
- Supports error handling per Requirement 9 (user-friendly error messages)
- Supports loading state per Requirement 8 (isLoading flag)
- Supports empty state per Requirement 10 (isEmpty flag)
