# Phase 06: API Migration & Authentication Refactor

**Status**: Planning
**Priority**: Critical (blocks production deployment)
**Estimated Duration**: 12-16 hours
**Dependencies**: Phase 04 (NestJS Backend), Phase 05 (Frontend Migration)

---

## Executive Summary

Phase 06 addresses the critical production build blocker (better-auth Edge Runtime incompatibility) and migrates Next.js API routes to the NestJS backend. This phase transforms the application from a Next.js monolith to a true full-stack architecture with separate frontend and backend concerns.

### Critical Problem Statement

**Current Issue**: Production builds fail due to better-auth library incompatibility with Next.js Edge Runtime:
```
Dynamic Code Evaluation (e.g. 'eval', 'new Function') not allowed in Edge Runtime
The error was caused by importing 'better-auth/dist/index.mjs' in './src/lib/auth/auth.ts'
```

**Impact**:
- ❌ Cannot deploy to production
- ❌ Cannot use Next.js Edge Middleware
- ❌ Cannot leverage Edge Runtime performance benefits
- ✅ Development server works (workaround only)

### Phase Objectives

1. **Resolve Production Build Issue** - Replace/remove better-auth
2. **Migrate API Routes** - Move 30 API endpoints to NestJS
3. **Implement Authentication** - Use NestJS Passport.js (from Phase 04)
4. **Create API Client** - Type-safe frontend API client
5. **Enable Production Deployment** - Verify production builds succeed

---

## Current State Analysis

### Existing API Routes (30 endpoints)

```
apps/frontend/src/app/api/
├── admin/                     # 7 endpoints
│   ├── analytics/route.ts
│   ├── audit-logs/route.ts
│   ├── errors/route.ts
│   ├── health/route.ts
│   ├── seed/route.ts
│   ├── users/route.ts
│   └── users/[id]/route.ts
├── assessments/               # 13 endpoints
│   ├── [id]/
│   │   ├── benchmark/route.ts
│   │   ├── evidence/route.ts
│   │   ├── evidence/[evidenceId]/route.ts
│   │   ├── evidence/[evidenceId]/download/route.ts
│   │   ├── evidence/confirm/route.ts
│   │   ├── evidence/upload-url/route.ts
│   │   ├── export/csv/route.ts
│   │   ├── export/pdf/route.ts
│   │   ├── finalize/route.ts
│   │   ├── responses/route.ts
│   │   ├── results/route.ts
│   │   ├── route.ts
│   │   └── send-results/route.ts
│   ├── compare/route.ts
│   └── start/route.ts
├── auth/                      # 1 endpoint (better-auth)
│   └── [...all]/route.ts     # ⚠️ PROBLEMATIC
├── benchmarks/                # 3 endpoints
│   ├── aggregate/route.ts
│   ├── route.ts
│   └── trends/route.ts
├── goals/                     # 2 endpoints
│   ├── [id]/route.ts
│   └── check-progress/route.ts
└── organizations/             # 4 endpoints
    └── [id]/
        ├── goals/route.ts
        └── progress/route.ts
```

### Authentication System Analysis

**Current (better-auth):**
- ❌ Not Edge Runtime compatible
- ❌ Blocks production builds
- ❌ Limited documentation
- ✅ Feature-rich

**Option A: NextAuth.js v5 (keep in frontend)**
- ✅ Edge Runtime compatible
- ✅ Excellent documentation
- ✅ Large community
- ✅ Built for Next.js
- ❌ Still couples auth to frontend
- ❌ Requires database access from frontend

**Option B: NestJS Passport.js (migrate to backend)** ⭐ **RECOMMENDED**
- ✅ Already implemented in Phase 04
- ✅ Backend-first architecture
- ✅ Proper separation of concerns
- ✅ JWT tokens work with Edge Runtime
- ✅ Supports all auth strategies
- ✅ Production-ready
- ✅ Type-safe
- ❌ Requires frontend API client
- ❌ More initial work

**Decision: Option B - NestJS Passport.js**

**Rationale:**
1. Already implemented in Phase 04 (JWT auth working)
2. Proper backend architecture (separation of concerns)
3. Frontend becomes stateless (just stores JWT)
4. No Edge Runtime issues (JWT is just a string)
5. Scalable (can add OAuth, SAML, etc.)
6. Future-proof (backend can serve multiple frontends)

---

## Migration Strategy

### Approach: **Incremental Strangler Pattern**

Instead of big-bang migration, we'll gradually replace Next.js API routes with NestJS endpoints:

**Phase 6A: Authentication Foundation** (4 hours)
1. Remove better-auth from frontend
2. Implement JWT-based auth using existing NestJS backend
3. Create frontend auth store (Zustand/Context)
4. Update middleware to validate JWT tokens
5. Test authentication flow

**Phase 6B: API Client Library** (2 hours)
1. Create `@aix-survey/api-client` library
2. Type-safe API client with fetch wrapper
3. Request/response interceptors
4. Error handling utilities
5. React hooks for API calls

**Phase 6C: Core API Migration** (6 hours)
1. Migrate admin endpoints → NestJS AdminModule
2. Migrate assessment endpoints → NestJS AssessmentModule
3. Migrate benchmark endpoints → NestJS BenchmarkModule
4. Migrate goals endpoints → NestJS GoalModule
5. Migrate organization endpoints → NestJS OrganizationModule

**Phase 6D: Testing & Validation** (2 hours)
1. Unit tests for NestJS controllers
2. Integration tests for API endpoints
3. E2E tests for critical flows
4. Production build verification

**Phase 6E: Cleanup** (2 hours)
1. Remove Next.js API routes
2. Update environment variables
3. Update documentation
4. Generate completion report

---

## Implementation Plan

### Step 1: Remove better-auth & Setup JWT Auth (4 hours)

#### 1.1 Remove better-auth Dependencies

**Remove from `package.json`:**
```json
{
  "dependencies": {
    "better-auth": "^x.x.x",  // REMOVE
    // Keep everything else
  }
}
```

**Delete Files:**
- `apps/frontend/src/lib/auth/auth.ts` (better-auth config)
- `apps/frontend/src/lib/auth/auth-client.ts` (better-auth client)
- `apps/frontend/src/app/api/auth/[...all]/route.ts` (better-auth API route)

#### 1.2 Create Frontend Auth Store

**Create `apps/frontend/src/lib/auth/auth-store.ts`:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      setAuth: (token, user) => set({ token, user, isAuthenticated: true }),
      clearAuth: () => set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

#### 1.3 Create API Client for Auth

**Create `apps/frontend/src/lib/api/auth-client.ts`:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  return response.json(); // { accessToken, user }
}

export async function register(email: string, password: string, name?: string) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    throw new Error('Registration failed');
  }

  return response.json();
}

export async function getProfile(token: string) {
  const response = await fetch(`${API_URL}/auth/profile`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return response.json();
}
```

#### 1.4 Update Middleware

**Update `apps/frontend/src/middleware.ts`:**
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/auth/login', '/auth/register', '/'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get token from cookie or header
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Validate token with backend
  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` },
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

**Validation:**
- [ ] better-auth removed successfully
- [ ] Auth store created and working
- [ ] Middleware validates JWT tokens
- [ ] Login/register flows work
- [ ] Production build succeeds (no Edge Runtime error)

---

### Step 2: Create API Client Library (2 hours)

#### 2.1 Create Library Structure

```bash
nx generate @nx/js:library api-client \
  --directory=libs/api-client \
  --importPath=@aix-survey/api-client \
  --publishable
```

#### 2.2 Implement Base API Client

**Create `libs/api-client/src/lib/client.ts`:**
```typescript
export class ApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(baseUrl: string, getToken: () => string | null) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
```

#### 2.3 Create React Hooks

**Create `libs/api-client/src/lib/hooks.ts`:**
```typescript
import { useState, useEffect } from 'react';
import { ApiClient } from './client';

export function useApi<T>(
  fetcher: (client: ApiClient) => Promise<T>,
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const client = new ApiClient(
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
      () => {
        // Get token from cookie or localStorage
        return localStorage.getItem('auth-token');
      }
    );

    fetcher(client)
      .then(result => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, deps);

  return { data, error, loading };
}
```

**Validation:**
- [ ] API client library created
- [ ] Type-safe requests/responses
- [ ] Automatic token injection
- [ ] Error handling working
- [ ] React hooks functional

---

### Step 3: Migrate Admin Module (2 hours)

#### 3.1 Create NestJS AdminModule

**Create `apps/backend/src/admin/admin.module.ts`:**
```typescript
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@aix-survey/database';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
```

#### 3.2 Create Admin Controller

**Create `apps/backend/src/admin/admin.controller.ts`:**
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get system health status' })
  async getHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('users')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'List all users' })
  async listUsers(@Query() query: any) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Put('users/:id')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Update user' })
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateUser(id, data);
  }

  @Delete('users/:id')
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('audit-logs')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLogs(@Query() query: any) {
    return this.adminService.getAuditLogs(query);
  }

  @Get('analytics')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Get platform analytics' })
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Post('seed')
  @Roles('OWNER')
  @ApiOperation({ summary: 'Seed database with initial data' })
  async seedDatabase() {
    return this.adminService.seedDatabase();
  }
}
```

#### 3.3 Migrate Business Logic

**Create `apps/backend/src/admin/admin.service.ts`:**
```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@aix-survey/database';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemHealth() {
    // Migrate from apps/frontend/src/lib/admin/system-monitoring.ts
    const dbStatus = await this.checkDatabaseConnection();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      uptime: process.uptime(),
    };
  }

  async listUsers(query: any) {
    // Migrate from apps/frontend/src/lib/admin/user-management.ts
    const { page = 1, pageSize = 20, role, search } = query;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          lastLoginAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getUser(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });
  }

  async updateUser(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        role: data.role,
      },
    });
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
  }

  async getAuditLogs(query: any) {
    // Migrate audit log logic
    // Implementation here
    return { logs: [], total: 0 };
  }

  async getAnalytics() {
    // Migrate analytics logic
    // Implementation here
    return {};
  }

  async seedDatabase() {
    // Migrate seed logic from apps/frontend/src/app/api/admin/seed/route.ts
    // Implementation here
    return { success: true };
  }

  private async checkDatabaseConnection(): Promise<string> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }
}
```

**Validation:**
- [ ] Admin module created
- [ ] All 7 admin endpoints migrated
- [ ] Business logic preserved
- [ ] Tests passing
- [ ] Swagger docs generated

---

### Step 4: Update Frontend to Use Backend API (1 hour)

#### 4.1 Update Environment Variables

**Create `apps/frontend/.env.local`:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Create `apps/backend/.env.local`:**
```bash
PORT=3001
JWT_SECRET=your-secret-key-here
DATABASE_URL=postgresql://...
FRONTEND_URL=http://localhost:3000
```

#### 4.2 Update Frontend API Calls

**Example: Update admin users page**
```typescript
// apps/frontend/src/app/(dashboard)/admin/users/page.tsx
'use client';

import { useApi } from '@aix-survey/api-client';

export default function AdminUsersPage() {
  const { data, loading, error } = useApi(
    (client) => client.get('/admin/users?page=1&pageSize=20'),
    []
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.users.map(user => (
        <div key={user.id}>{user.email}</div>
      ))}
    </div>
  );
}
```

**Validation:**
- [ ] Frontend calls backend API
- [ ] JWT tokens sent correctly
- [ ] Responses properly typed
- [ ] Error handling works

---

### Step 5: Production Build Verification (1 hour)

#### 5.1 Test Production Build

```bash
# Clean previous builds
rm -rf dist
rm -rf apps/frontend/.next

# Build backend
npm run backend:build

# Build frontend (should succeed now)
npm run frontend:build
```

**Expected Result:**
```
✅ Successfully built frontend
✅ No Edge Runtime errors
✅ All pages compiled
✅ Static generation successful
```

#### 5.2 Test Production Server

```bash
# Start backend
npm run backend:dev &

# Start frontend in production mode
npm run frontend:start
```

**Validation:**
- [ ] Production build succeeds
- [ ] No Edge Runtime errors
- [ ] Frontend connects to backend
- [ ] Authentication works
- [ ] API calls successful

---

## Success Criteria

### Must-Have (P0)
- [ ] better-auth removed completely
- [ ] Production build succeeds (no Edge Runtime error)
- [ ] JWT authentication working (login/register/profile)
- [ ] Admin module migrated to NestJS (7 endpoints)
- [ ] API client library created
- [ ] TypeScript: 0 errors
- [ ] All existing features work

### Should-Have (P1)
- [ ] Assessment module migrated (13 endpoints)
- [ ] Benchmark module migrated (3 endpoints)
- [ ] Goals module migrated (2 endpoints)
- [ ] Organization module migrated (4 endpoints)
- [ ] Unit tests for controllers
- [ ] Integration tests for API

### Nice-to-Have (P2)
- [ ] E2E tests for critical flows
- [ ] API documentation (Swagger)
- [ ] Performance benchmarks
- [ ] Security audit

---

## Risk Mitigation

### Risk 1: Breaking Authentication
**Mitigation**:
- Keep better-auth as fallback initially
- Test thoroughly before removing
- Create rollback plan

### Risk 2: API Migration Errors
**Mitigation**:
- Migrate one module at a time
- Test each module before proceeding
- Keep Next.js API routes until verified

### Risk 3: Frontend/Backend Communication
**Mitigation**:
- Use TypeScript for type safety
- Create comprehensive error handling
- Test CORS configuration

### Risk 4: Production Deployment
**Mitigation**:
- Test production build locally
- Verify all environment variables
- Document deployment process

---

## Timeline

| Phase | Task | Duration | Cumulative |
|-------|------|----------|------------|
| 6A | Authentication Foundation | 4h | 4h |
| 6B | API Client Library | 2h | 6h |
| 6C | Admin Module Migration | 2h | 8h |
| 6C | Assessment Module Migration | 3h | 11h |
| 6C | Other Modules Migration | 1h | 12h |
| 6D | Testing & Validation | 2h | 14h |
| 6E | Cleanup & Documentation | 2h | 16h |

**Total Estimated Duration**: 12-16 hours

---

## Next Phase Preview

**Phase 07: Performance Optimization & Production Readiness**
- Database query optimization
- API response caching
- Frontend bundle optimization
- CDN setup for static assets
- Load testing
- Security hardening
- Monitoring and logging
- Production deployment

---

## Notes

- This phase is CRITICAL for production deployment
- No production builds possible until Edge Runtime issue resolved
- NestJS backend from Phase 04 is already production-ready
- Incremental migration allows testing at each step
- Frontend becomes truly stateless (JAMstack pattern)
- Backend can serve multiple frontends (web, mobile, etc.)
