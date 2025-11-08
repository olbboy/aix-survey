# @aix-survey/api-client

Type-safe API client for AIX Survey Platform with automatic JWT token injection, React hooks, and comprehensive error handling.

## Features

✅ **Type-Safe**: Full TypeScript support with comprehensive types for all API endpoints
✅ **Automatic Auth**: JWT token injection with configurable token provider
✅ **React Hooks**: `useApi`, `useMutation`, `usePaginatedApi` for seamless data fetching
✅ **Error Handling**: Custom error classes with retry logic and exponential backoff
✅ **Timeout Support**: Configurable request timeouts with abort controller
✅ **Pagination**: Built-in pagination support for list endpoints
✅ **Organized Endpoints**: Clean API surface organized by domain (auth, assessments, etc.)

## Installation

```bash
npm install @aix-survey/api-client
```

## Quick Start

### 1. Initialize the Client

```typescript
import { createApiClient, ApiEndpoints } from '@aix-survey/api-client';

// Initialize API client
const client = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  tokenProvider: () => {
    // Get token from your auth store
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth-token');
    }
    return null;
  },
  defaultTimeout: 30000, // Optional: 30 seconds
  defaultRetry: 3, // Optional: retry failed requests
  onUnauthorized: () => {
    // Optional: handle 401 errors
    window.location.href = '/auth/login';
  },
});

// Create endpoint instances
const api = new ApiEndpoints(client);
```

### 2. Use in React Components

```typescript
import { useApi, useMutation } from '@aix-survey/api-client';

function AssessmentsPage() {
  // Fetch data with useApi hook
  const { data, isLoading, error, refetch } = useApi(
    (client) => api.assessments.getAll({ page: 1, limit: 10 })
  );

  // Create mutations
  const { mutate, isLoading: isCreating } = useMutation(
    (client, newAssessment) => api.assessments.create(newAssessment),
    {
      onSuccess: (data) => {
        console.log('Assessment created:', data);
        refetch(); // Refresh the list
      },
      onError: (error) => {
        console.error('Failed to create:', error.message);
      },
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={() => mutate({ title: 'New Assessment' })}>
        Create Assessment
      </button>
      <ul>
        {data?.data.map((assessment) => (
          <li key={assessment.id}>{assessment.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 3. Direct API Calls (Non-React)

```typescript
import { getApiClient, ApiEndpoints } from '@aix-survey/api-client';

async function login(email: string, password: string) {
  try {
    const client = getApiClient();
    const api = new ApiEndpoints(client);

    const response = await api.auth.login({ email, password });

    // Store token
    localStorage.setItem('auth-token', response.accessToken);

    return response;
  } catch (error) {
    if (error instanceof ApiClientError) {
      console.error(`Error ${error.statusCode}: ${error.message}`);
    }
    throw error;
  }
}
```

## API Endpoints

### Authentication

```typescript
api.auth.login({ email, password })
api.auth.register({ email, password, name })
api.auth.getProfile()
api.auth.logout()
api.auth.refresh()
```

### Assessments

```typescript
api.assessments.getAll({ page: 1, limit: 10 })
api.assessments.getById(id)
api.assessments.create(data)
api.assessments.update(id, data)
api.assessments.delete(id)
api.assessments.submit({ assessmentId, answers })
api.assessments.getResponses()
api.assessments.getResponse(id)
```

### Benchmarks

```typescript
api.benchmarks.getAll({ page: 1, limit: 10 })
api.benchmarks.getById(id)
api.benchmarks.compare(benchmarkId, assessmentResponseId)
api.benchmarks.getAggregate(industry)
```

### Goals

```typescript
api.goals.getAll()
api.goals.getById(id)
api.goals.create(data)
api.goals.update(id, data)
api.goals.delete(id)
api.goals.updateProgress(id, progress)
```

### Organizations

```typescript
api.organizations.getAll()
api.organizations.getById(id)
api.organizations.create(data)
api.organizations.update(id, data)
api.organizations.delete(id)
```

### Admin

```typescript
api.admin.getStats()
api.admin.getAuditLogs({ page: 1, limit: 50 })
api.admin.getUsers()
api.admin.getUserById(id)
api.admin.updateUser(id, data)
api.admin.deleteUser(id)
api.admin.getHealth()
```

## React Hooks

### `useApi` - Fetch Data

```typescript
const { data, error, isLoading, isError, isSuccess, refetch } = useApi(
  (client) => api.assessments.getAll(),
  {
    enabled: true, // Default: true
    retry: 3, // Default: 0
    retryDelay: 1000, // Default: 1000ms
    onSuccess: (data) => console.log('Success!', data),
    onError: (error) => console.error('Error:', error),
  }
);
```

### `useMutation` - Create/Update/Delete

```typescript
const { data, error, isLoading, isSuccess, mutate, reset } = useMutation(
  (client, variables) => api.assessments.create(variables),
  {
    onSuccess: (data, variables) => console.log('Created!', data),
    onError: (error, variables) => console.error('Error:', error),
    onSettled: (data, error, variables) => console.log('Settled'),
  }
);

// Trigger mutation
mutate({ title: 'New Assessment', description: 'Description' });

// Reset state
reset();
```

### `usePaginatedApi` - Paginated Data

```typescript
const {
  data,
  isLoading,
  page,
  setPage,
  nextPage,
  prevPage,
  refetch,
} = usePaginatedApi(
  (client, page) => api.assessments.getAll({ page, limit: 10 }),
  { initialPage: 1 }
);

// Navigate pages
<button onClick={prevPage}>Previous</button>
<button onClick={nextPage}>Next</button>
<button onClick={() => setPage(5)}>Go to Page 5</button>
```

## Error Handling

```typescript
import { ApiClientError } from '@aix-survey/api-client';

try {
  await api.assessments.create(data);
} catch (error) {
  if (error instanceof ApiClientError) {
    console.log('Status:', error.statusCode);
    console.log('Message:', error.message);
    console.log('Error Type:', error.error);

    // Check error type
    if (error.isAuthError()) {
      // Handle 401/403
    } else if (error.isClientError()) {
      // Handle 4xx errors
    } else if (error.isServerError()) {
      // Handle 5xx errors
    }

    // Convert to JSON for logging
    const errorJson = error.toJSON();
  }
}
```

## TypeScript Types

All API types are fully typed and exported:

```typescript
import type {
  User,
  Assessment,
  AssessmentResponse,
  Benchmark,
  Goal,
  Organization,
  PaginatedResponse,
  ApiError,
} from '@aix-survey/api-client';
```

## Advanced Configuration

### Custom Request Configuration

```typescript
// Per-request configuration
await api.assessments.getAll(
  { page: 1, limit: 10 },
  {
    timeout: 10000, // 10 seconds
    retry: 5, // Retry 5 times
    cache: 'force-cache',
    headers: {
      'X-Custom-Header': 'value',
    },
  }
);
```

### Custom Token Provider

```typescript
const client = createApiClient({
  baseUrl: 'http://localhost:3001/api',
  tokenProvider: async () => {
    // Async token fetching
    const token = await getTokenFromSecureStorage();
    return token;
  },
});
```

## Building

```bash
nx build api-client
```

## Testing

```bash
nx test api-client
```

## Type Checking

```bash
nx run api-client:build
```

## Architecture

```
libs/api-client/
├── src/
│   ├── index.ts              # Main exports
│   └── lib/
│       ├── client.ts          # Core ApiClient class
│       ├── types.ts           # TypeScript type definitions
│       ├── error.ts           # Error handling utilities
│       ├── hooks.ts           # React hooks (useApi, useMutation)
│       └── endpoints.ts       # Organized API endpoint methods
```

## License

MIT
