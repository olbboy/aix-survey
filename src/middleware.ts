/**
 * Next.js Middleware
 * Handles authentication and authorization for protected routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/middleware-helpers';
import { log } from '@/lib/utils/logger';

// Define protected routes
const protectedRoutes = [
  '/dashboard',
  '/assessments',
  '/admin',
  '/profile',
  '/settings',
];

// Define public routes (no auth required)
const publicRoutes = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/assessment/start', // Guest assessment allowed
];

// Admin-only routes
const adminRoutes = [
  '/admin',
];

// Admin API routes
const adminApiRoutes = [
  '/api/admin',
  '/api/benchmarks/aggregate',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if route is public
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  const isAdminApiRoute = adminApiRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (!isProtectedRoute && !isAdminApiRoute) {
    return NextResponse.next();
  }

  // Check for session token in cookies
  const sessionToken = request.cookies.get('better-auth.session_token');

  if (!sessionToken) {
    // No session - redirect to login for pages, return 401 for API routes
    if (isAdminApiRoute || pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // FIXED: Verify session token instead of just checking existence
  const session = await verifySession(sessionToken.value);

  if (!session) {
    log.warn('Invalid session token detected', {
      pathname,
      hasToken: !!sessionToken,
    });

    // Invalid session - redirect to login for pages, return 401 for API routes
    if (isAdminApiRoute || pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      );
    }

    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin routes
  const isAdminRoute = adminRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isAdminRoute || isAdminApiRoute) {
    // FIXED: Check if user has admin role
    const userRole = (session.user as any).role;

    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      log.warn('Non-admin user attempted to access admin route', {
        pathname,
        userId: session.user.id,
        userRole,
      });

      // Forbidden - return 403 for API routes, redirect for pages
      if (isAdminApiRoute || pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Forbidden - Admin access required' },
          { status: 403 }
        );
      }

      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
