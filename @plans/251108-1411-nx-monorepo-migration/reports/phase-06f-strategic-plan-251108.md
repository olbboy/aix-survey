# Phase 06F Strategic Plan: Frontend Integration with API Client
**Date**: 2025-11-08
**Phase**: 06F - Frontend Integration
**Status**: 📋 **STRATEGIC PLANNING**
**Priority**: Critical (blocks full-stack functionality)
**Estimated Duration**: 9-11 hours

---

## Executive Summary

Phase 06F completes the full-stack migration by integrating the `@aix-survey/api-client` library into the Next.js frontend, removing better-auth dependencies, and establishing JWT-based authentication. This phase is essential to make the application fully functional end-to-end.

### Critical Problem Statement

**Current Blocker**: Frontend cannot communicate with the NestJS backend
- ❌ Frontend pages reference deleted `/api/...` routes
- ❌ better-auth library still imported (blocking builds)
- ❌ @aix-survey/api-client created but not integrated
- ❌ Frontend build fails with 43 TypeScript errors
- ❌ No end-to-end functionality

**Impact**:
- Backend is complete (192 tests passing) but unusable
- Frontend pages non-functional
- Cannot validate full-stack features
- Cannot demonstrate working application

### Phase Objectives

1. **Remove better-auth** - Clean removal of Edge Runtime blocker
2. **Implement JWT Auth** - Client-side authentication with token management
3. **Integrate API Client** - Connect all pages to NestJS backend
4. **Fix TypeScript Errors** - Resolve all 43 frontend errors
5. **Update Middleware** - JWT validation instead of better-auth
6. **Enable Full-Stack Testing** - End-to-end validation

---

## Current State Analysis

### Backend: ✅ **PRODUCTION READY**
- NestJS server functional on port 3001
- 29 API endpoints implemented
- 192/192 tests passing
- JWT authentication working
- Swagger docs available

### Frontend: ❌ **NON-FUNCTIONAL**
- better-auth references (5 files)
- No connection to backend
- Build fails (43 TypeScript errors)
- Pages exist but broken

### API Client Library: ✅ **READY**
- Well-structured endpoint classes
- Type-safe methods
- React hooks (useApi, useMutation)
- Error handling
- Awaiting integration

---

## Implementation Strategy

### Approach: **Incremental Integration Pattern**

Instead of big-bang replacement, we'll systematically integrate api-client module by module:

**Phase 06F-1**: Authentication Foundation (3 hours)
1. Remove better-auth completely
2. Create JWT authentication context
3. Implement token storage (localStorage/cookie)
4. Create auth provider component
5. Update auth pages (login, register)

**Phase 06F-2**: Admin Pages Integration (2 hours)
1. Integrate admin dashboard
2. Update user management pages
3. Connect health monitoring
4. Update analytics pages

**Phase 06F-3**: Assessment Pages Integration (3 hours)
1. Integrate assessment flow
2. Update results pages
3. Connect evidence upload
4. Fix assessment-related errors

**Phase 06F-4**: Middleware & Guards (1 hour)
1. Update Next.js middleware
2. Implement route protection
3. Add auth redirects
4. Test protected routes

**Phase 06F-5**: Testing & Validation (2 hours)
1. Fix frontend TypeScript errors
2. Update component tests
3. End-to-end smoke tests
4. Build verification

---

## Detailed Implementation Plan

### Step 1: Remove better-auth (1 hour)

#### 1.1 Identify Dependencies
**Files to modify**:
- `apps/frontend/src/lib/auth/auth.ts` (delete)
- `apps/frontend/src/lib/auth/auth-client.ts` (rewrite)
- `apps/frontend/src/lib/auth/auth-store.ts` (keep, modify)
- `apps/frontend/src/lib/auth/middleware-helpers.ts` (rewrite)
- `apps/frontend/src/middleware.ts` (rewrite)

#### 1.2 Remove Package
```bash
npm uninstall better-auth
```

#### 1.3 Verify Removal
```bash
grep -r "better-auth" apps/frontend/src
# Should return 0 results
```

---

### Step 2: Create JWT Authentication Context (2 hours)

#### 2.1 Create Auth Context

**Create `apps/frontend/src/lib/auth/auth-context.tsx`**:
```typescript
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthEndpoints } from '@aix-survey/api-client';
import { createApiClient } from '@aix-survey/api-client';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize API client
  const client = createApiClient({
    baseUrl: API_URL,
    tokenProvider: () => token,
  });
  const authApi = new AuthEndpoints(client);

  // Load token and user from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('auth-token');
    const storedUser = localStorage.getItem('auth-user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

      setToken(response.accessToken);
      setUser(response.user);

      localStorage.setItem('auth-token', response.accessToken);
      localStorage.setItem('auth-user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    try {
      const response = await authApi.register({ email, password, name });

      setToken(response.accessToken);
      setUser(response.user);

      localStorage.setItem('auth-token', response.accessToken);
      localStorage.setItem('auth-user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
  };

  const refreshToken = async () => {
    try {
      const response = await authApi.refresh();
      setToken(response.accessToken);
      localStorage.setItem('auth-token', response.accessToken);
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
    }
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

#### 2.2 Wrap App with AuthProvider

**Update `apps/frontend/src/app/layout.tsx`**:
```typescript
import { AuthProvider } from '@/lib/auth/auth-context';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

---

### Step 3: Update Auth Pages (1 hour)

#### 3.1 Update Login Page

**Update `apps/frontend/src/app/auth/login/page.tsx`**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard'); // Redirect after successful login
    } catch (err) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
```

#### 3.2 Update Register Page
Similar pattern for `apps/frontend/src/app/auth/register/page.tsx`

---

### Step 4: Update Middleware (1 hour)

#### 4.1 Rewrite Middleware for JWT

**Update `apps/frontend/src/middleware.ts`**:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/',
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow static files
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  // Get token from cookie or header
  const token = request.cookies.get('auth-token')?.value ||
                request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Validate token with backend (optional for every request)
  // For better performance, can skip this and rely on API 401 responses
  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

---

### Step 5: Integrate Admin Pages (2 hours)

#### 5.1 Update Admin Dashboard

**Update `apps/frontend/src/app/(dashboard)/admin/page.tsx`**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { AdminEndpoints } from '@aix-survey/api-client';
import { createApiClient } from '@aix-survey/api-client';
import { useAuth } from '@/lib/auth/auth-context';

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    if (!token) return;

    try {
      const client = createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
        tokenProvider: () => token,
      });

      const adminApi = new AdminEndpoints(client);

      const [analyticsData, healthData] = await Promise.all([
        adminApi.getAnalytics({ type: 'statistics' }),
        adminApi.getHealth(),
      ]);

      setMetrics({
        statistics: analyticsData.statistics,
        health: healthData.health,
        alerts: healthData.alerts || [],
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading platform metrics...</div>;
  }

  if (!metrics) {
    return <div>Failed to load dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      {/* Render metrics */}
    </div>
  );
}
```

#### 5.2 Update Users Page
**Pattern**: Replace `fetch('/api/admin/users')` with `adminApi.getUsers()`

---

### Step 6: Integrate Assessment Pages (3 hours)

#### 6.1 Assessment Flow
- Start assessment
- Save responses
- Finalize assessment
- View results

**Pattern for all pages**:
```typescript
'use client';

import { AssessmentEndpoints } from '@aix-survey/api-client';
import { createApiClient } from '@aix-survey/api-client';
import { useAuth } from '@/lib/auth/auth-context';

export default function AssessmentPage({ params }: { params: { id: string } }) {
  const { token } = useAuth();
  const [assessment, setAssessment] = useState(null);

  useEffect(() => {
    if (!token) return;

    const client = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      tokenProvider: () => token,
    });

    const assessmentApi = new AssessmentEndpoints(client);

    assessmentApi.getById(params.id)
      .then(setAssessment)
      .catch(console.error);
  }, [params.id, token]);

  // Render assessment
}
```

---

### Step 7: Fix TypeScript Errors (2 hours)

#### 7.1 Common Error Categories

**Error 1: Missing better-auth types**
- Remove all better-auth imports
- Replace with local types

**Error 2: API response types**
- Use types from @aix-survey/api-client
- Update component props

**Error 3: Test file errors**
- Update mocks to use api-client
- Remove API route references

#### 7.2 Systematic Fix Process
```bash
# Check all errors
npx tsc --noEmit

# Fix files one by one
# Priority: auth files > pages > tests
```

---

### Step 8: Testing & Validation (2 hours)

#### 8.1 Build Verification
```bash
# Backend build
npx nx build backend

# Frontend build
npx nx build frontend

# Expected: Both succeed
```

#### 8.2 Runtime Testing
```bash
# Start backend
npx nx serve backend &

# Start frontend
npx nx serve frontend &

# Manual testing:
# 1. Login flow
# 2. Dashboard access
# 3. Assessment flow
# 4. Admin pages
```

#### 8.3 End-to-End Validation
- ✅ Login with test credentials
- ✅ Access protected pages
- ✅ Admin functions work
- ✅ Assessment flow complete
- ✅ Logout and re-login

---

## Success Criteria

### Must-Have (P0)
- ✅ better-auth completely removed
- ✅ JWT authentication working
- ✅ All pages use @aix-survey/api-client
- ✅ Frontend build succeeds
- ✅ TypeScript: 0 errors (frontend)
- ✅ Login/logout flow functional
- ✅ Protected routes work

### Should-Have (P1)
- ✅ Admin pages fully functional
- ✅ Assessment flow complete
- ✅ Error handling on all pages
- ✅ Loading states implemented
- ✅ Middleware validates tokens

### Nice-to-Have (P2)
- ✅ Optimistic UI updates
- ✅ Request caching
- ✅ Offline support consideration
- ✅ Performance optimization

---

## Risk Assessment

### High Risk
🔴 **Authentication State Management**
- **Risk**: Token expiration handling
- **Mitigation**: Implement refresh token logic, clear error messages
- **Fallback**: Force re-login on 401 errors

### Medium Risk
🟡 **Type Mismatches**
- **Risk**: Backend/frontend type inconsistency
- **Mitigation**: Use shared types from api-client
- **Fallback**: Add type assertions where needed

### Low Risk
🟢 **Component Updates**
- **Risk**: Breaking existing UI
- **Mitigation**: Incremental page updates
- **Fallback**: Quick rollback with git

---

## Timeline

| Phase | Task | Duration | Cumulative |
|-------|------|----------|------------|
| 06F-1 | Remove better-auth & create auth context | 3h | 3h |
| 06F-2 | Update admin pages | 2h | 5h |
| 06F-3 | Update assessment pages | 3h | 8h |
| 06F-4 | Update middleware & guards | 1h | 9h |
| 06F-5 | Fix TypeScript errors & testing | 2h | 11h |

**Total Duration**: 9-11 hours

---

## Deliverables

Upon completion, Phase 06F will deliver:
- ✅ Fully functional full-stack application
- ✅ JWT-based authentication
- ✅ All frontend pages connected to backend
- ✅ 0 TypeScript errors (frontend + backend)
- ✅ Successful builds (both apps)
- ✅ End-to-end functionality validated

---

## Next Phase Preview

**Phase 07: Production Optimization & Deployment**
After Phase 06F, the application will be fully functional end-to-end, ready for:
1. External service implementation (9 dependencies)
2. Performance optimization
3. Monitoring and logging
4. Production deployment
5. Load testing

---

## Conclusion

Phase 06F is **essential** to complete the full-stack migration and deliver a working application. Without this phase, the backend (while complete) cannot be validated or used.

**Status**: Strategic Plan Complete - Ready for Execution
**Risk Level**: Medium (authentication complexity)
**Estimated Duration**: 9-11 hours
**Priority**: Critical (blocks full-stack functionality)

---

**Grade: Strategic Plan Complete**
**Approval**: Recommended before execution
**Next**: Execute Phase 06F implementation
