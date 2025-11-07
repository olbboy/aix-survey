/**
 * Next.js Middleware
 * Handles authentication and authorization for protected routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Check for session token in cookies
  const sessionToken = request.cookies.get('better-auth.session_token');

  if (!sessionToken) {
    // No session - redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // TODO: Verify session token and check user roles
  // For now, just allow if token exists
  // In production, you should verify the token with the auth server

  // Check admin routes
  const isAdminRoute = adminRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isAdminRoute) {
    // TODO: Check if user has admin role
    // For now, allow all authenticated users
    // You should verify user role from the session
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
