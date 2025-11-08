# Phase 00: Pre-Migration Security Fixes

## Context Links

- **Parent Plan**: [Plan Overview](./plan.md)
- **Security Analysis**: `/Users/leo/Documents/aix-survey/NX-MONOREPO-MIGRATION-ANALYSIS.md#7-hidden-bugs--technical-debt`
- **Development Rules**: `/Users/leo/Documents/aix-survey/.claude/workflows/development-rules.md`

## Overview

**Phase**: 00 - Pre-Migration Security Fixes  
**Date**: 2025-11-08  
**Description**: Fix critical security vulnerabilities before starting migration  
**Priority**: CRITICAL  
**Implementation Status**: ❌ Not Started  
**Review Status**: ❌ Pending  
**Duration**: 1 week  
**Dependencies**: None (prerequisite for all other phases)

## Key Insights

Critical security vulnerabilities found in current codebase must be fixed before migration:

1. **Missing Authentication in Admin Routes** (CRITICAL) - 8 affected endpoints
2. **Incomplete Session Verification** (HIGH) - middleware not validating tokens  
3. **Excessive Debug Logging** (MEDIUM) - 64+ console.log instances exposing data
4. **Missing Input Validation** (HIGH) - SQL injection risks in 15+ routes
5. **No Rate Limiting** (MEDIUM) - API abuse vulnerability

These issues pose immediate security risks and must be resolved before proceeding with complex migration.

## Requirements

### Functional Requirements

1. **Authentication Fix**
   - Add admin role check to all admin routes
   - Implement proper session validation
   - Add role-based authorization

2. **Session Security**  
   - Token verification in middleware
   - Role-based route protection
   - Secure session handling

3. **Input Validation**
   - Add Zod schemas for all API routes
   - Sanitize user inputs
   - Prevent SQL injection

4. **Logging Security**
   - Remove debug logging from production
   - Create proper logger service
   - Sanitize logged data

5. **Rate Limiting**
   - Add basic rate limiting
   - Protect against API abuse
   - Configure appropriate limits

### Non-Functional Requirements

1. **Security**: All critical vulnerabilities patched
2. **Performance**: No degradation from security fixes
3. **Compatibility**: Maintain current API contracts
4. **Testing**: Security fixes must have test coverage

## Architecture

### Current Security Architecture
```
Next.js API Routes
├── NO AUTH CHECK → Admin Routes (CRITICAL)
├── UNVERIFIED SESSION → Protected Routes (HIGH)  
├── NO VALIDATION → User Input (HIGH)
├── DEBUG LOGS → Sensitive Data Exposure (MEDIUM)
└── NO RATE LIMIT → API Abuse (MEDIUM)
```

### Target Security Architecture  
```
Next.js API Routes  
├── SESSION VERIFICATION → Middleware
├── ROLE-BASED AUTH → Admin Routes
├── INPUT VALIDATION → Zod Schemas
├── STRUCTURED LOGGING → Winston Logger
└── RATE LIMITING → IP-based limits
```

## Related Code Files

**Critical Files to Modify**:
```
src/middleware.ts                              # Session verification
src/app/api/admin/users/route.ts              # Add admin auth
src/app/api/admin/users/[id]/route.ts         # Add admin auth  
src/app/api/admin/analytics/route.ts          # Add admin auth
src/app/api/admin/audit-logs/route.ts         # Add admin auth
src/app/api/admin/health/route.ts             # Add admin auth
src/app/api/admin/errors/route.ts             # Add admin auth
src/app/api/benchmarks/aggregate/route.ts    # Add admin auth
src/app/api/assessments/[id]/responses/route.ts # Input validation
src/lib/auth/session-helpers.ts              # Add token verification
src/lib/utils/logger.ts                      # Create logger service
src/lib/utils/rate-limiter.ts                # Create rate limiter
```

**New Files to Create**:
```
src/lib/validation/schemas.ts                 # Zod validation schemas
src/lib/auth/middleware-helpers.ts           # Auth middleware utilities
src/lib/utils/security.ts                   # Security utilities
```

## Implementation Steps

### Step 1: Create Security Infrastructure (Day 1)

1. **Logger Service**
```typescript
// src/lib/utils/logger.ts  
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'aix-survey-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export { logger };
```

2. **Input Validation Schemas**
```typescript
// src/lib/validation/schemas.ts
import { z } from 'zod';

export const ResponsesSchema = z.record(
  z.object({
    score: z.union([z.number().int().min(1).max(5), z.null()]),
    currentState: z.string().max(5000).optional(),
  })
);

export const AssessmentCreateSchema = z.object({
  templateId: z.string().cuid(),
  organizationId: z.string().cuid(),
  title: z.string().min(1).max(200),
});
```

3. **Rate Limiter**
```typescript
// src/lib/utils/rate-limiter.ts
import { NextRequest } from 'next/server';

const rateLimitMap = new Map();

export function rateLimit(identifier: string, limit: number, window: number): boolean {
  const now = Date.now();
  const windowMs = window * 1000;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  const record = rateLimitMap.get(identifier);
  
  if (now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (record.count >= limit) {
    return true; // Rate limited
  }
  
  record.count++;
  return false;
}
```

### Step 2: Fix Session Verification (Day 2)

1. **Enhanced Session Helpers**
```typescript
// src/lib/auth/session-helpers.ts
import { auth } from './auth';
import { logger } from '@/lib/utils/logger';

export async function verifySession(sessionToken: string) {
  try {
    const session = await auth.api.getSession({ 
      headers: { cookie: `better-auth.session_token=${sessionToken}` } 
    });
    
    if (!session || !session.user) {
      return null;
    }
    
    return {
      user: session.user,
      session: session.session
    };
  } catch (error) {
    logger.error('Session verification failed:', { error: error.message });
    return null;
  }
}

export function requireAdmin(user: any) {
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Admin access required');
  }
}
```

2. **Update Middleware**
```typescript
// src/middleware.ts  
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth/session-helpers';

const adminRoutes = ['/api/admin', '/api/benchmarks/aggregate'];
const protectedRoutes = ['/dashboard', '/assessment'];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Check if route needs authentication
  const needsAuth = protectedRoutes.some(route => pathname.startsWith(route)) ||
                   adminRoutes.some(route => pathname.startsWith(route));
  
  if (!needsAuth) return NextResponse.next();
  
  const sessionToken = request.cookies.get('better-auth.session_token');
  
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // FIXED: Verify token instead of just checking existence
  const session = await verifySession(sessionToken.value);
  if (!session) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }
  
  // Check admin routes
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));
  if (isAdminRoute && session.user.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
  
  return NextResponse.next();
}
```

### Step 3: Fix Admin Route Authentication (Day 3)

**Template for All Admin Routes**:
```typescript
// Example: src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifySession, requireAdmin } from '@/lib/auth/session-helpers';
import { logger } from '@/lib/utils/logger';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('better-auth.session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const session = await verifySession(sessionToken.value);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    // FIXED: Add admin authentication check
    requireAdmin(session.user);
    
    const users = await prisma.user.findMany({
      select: {
        id: true, email: true, name: true, role: true,
        createdAt: true, lastLoginAt: true
      }
    });
    
    logger.info('Admin accessed users list', { adminId: session.user.id });
    return NextResponse.json(users);
    
  } catch (error) {
    logger.error('Admin users route error:', { error: error.message });
    
    if (error.message === 'Admin access required') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 4: Add Input Validation (Day 4)

**Update API Routes with Validation**:
```typescript
// src/app/api/assessments/[id]/responses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ResponsesSchema } from '@/lib/validation/schemas';
import { verifySession } from '@/lib/auth/session-helpers';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessionToken = request.cookies.get('better-auth.session_token');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const session = await verifySession(sessionToken.value);
    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // FIXED: Add input validation
    const validatedResponses = ResponsesSchema.parse(body.responses);
    
    // Continue with validated data...
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Invalid input data:', { errors: error.errors });
      return NextResponse.json({ 
        error: 'Invalid input data',
        details: error.errors
      }, { status: 400 });
    }
    
    logger.error('Response save error:', { error: error.message });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### Step 5: Replace Debug Logging (Day 5)

**Remove Debug Logs**:
```bash
# Find all debug logs
grep -r "console\." src/app/api/ | wc -l

# Replace with proper logging
sed -i 's/console\.log(/logger.debug(/g' src/app/api/**/*.ts
sed -i 's/console\.error(/logger.error(/g' src/app/api/**/*.ts
sed -i 's/console\.warn(/logger.warn(/g' src/app/api/**/*.ts
```

## Todo List

### Security Fixes
- [ ] Create logger service with Winston
- [ ] Create input validation schemas (Zod)  
- [ ] Create rate limiter utility
- [ ] Update session verification in middleware
- [ ] Fix authentication in `/api/admin/users` route
- [ ] Fix authentication in `/api/admin/users/[id]` route
- [ ] Fix authentication in `/api/admin/analytics` route
- [ ] Fix authentication in `/api/admin/audit-logs` route
- [ ] Fix authentication in `/api/admin/health` route
- [ ] Fix authentication in `/api/admin/errors` route
- [ ] Fix authentication in `/api/benchmarks/aggregate` route
- [ ] Add input validation to responses route
- [ ] Add input validation to assessment routes
- [ ] Add input validation to organization routes
- [ ] Replace all console.log with logger calls
- [ ] Add rate limiting to critical routes
- [ ] Create security utility functions

### Testing
- [ ] Write tests for session verification
- [ ] Write tests for admin authentication
- [ ] Write tests for input validation
- [ ] Write tests for rate limiting
- [ ] Test all admin routes with different user roles
- [ ] Test input validation with malicious data
- [ ] Test rate limiting functionality

### Documentation  
- [ ] Document security improvements
- [ ] Update API documentation
- [ ] Create security runbook
- [ ] Document incident response procedures

## Success Criteria

1. **Authentication**
   - All admin routes require ADMIN role
   - Session tokens are properly verified
   - Unauthorized access returns 401/403

2. **Input Validation**
   - All user inputs validated with Zod
   - SQL injection attempts blocked
   - Proper error messages for invalid input

3. **Logging Security**
   - No sensitive data in logs
   - Structured logging with Winston
   - Appropriate log levels used

4. **Rate Limiting**
   - Basic rate limiting implemented
   - API abuse prevented
   - Graceful rate limit responses

5. **Testing**
   - All security fixes tested
   - Regression tests pass
   - Security scan clean

## Risk Assessment

**Security Risks (POST-FIX)**:
- **CRITICAL**: ✅ Fixed - Admin routes now require authentication
- **HIGH**: ✅ Fixed - Session tokens properly verified  
- **HIGH**: ✅ Fixed - Input validation prevents SQL injection
- **MEDIUM**: ✅ Fixed - Debug logging removed from production

**Implementation Risks**:
- **MEDIUM**: Breaking existing functionality during fixes
- **LOW**: Performance impact from additional validations
- **LOW**: Learning curve for team on new security patterns

**Mitigation**:
- Thorough testing before deployment
- Feature flags for gradual rollout
- Monitoring for performance impact
- Clear documentation for team

## Security Considerations

**Pre-Fix Vulnerabilities**:
1. Admin routes accessible to all users
2. Session tokens not verified  
3. Raw SQL injection possible
4. Sensitive data in logs
5. API abuse possible

**Post-Fix Security**:
1. ✅ Role-based access control
2. ✅ Token verification with expiry
3. ✅ Input sanitization and validation  
4. ✅ Structured, secure logging
5. ✅ Rate limiting protection

**Ongoing Security**:
- Regular security audits
- Dependency vulnerability scanning
- Code review for security patterns
- Security training for team

## Next Steps

1. **Immediate**: Begin implementation of security fixes
2. **Day 6**: Complete testing of all fixes  
3. **Day 7**: Deploy to staging and validate
4. **Week 2**: Begin Phase 01 after security approval
5. **Ongoing**: Monitor security metrics and incidents

**Critical Path**: All security fixes must be complete and tested before proceeding to Phase 01.