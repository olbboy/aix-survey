/**
 * Next.js Middleware (JWT-based, Edge Runtime compatible)
 * Validates JWT tokens from NestJS backend
 * Replaces better-auth middleware
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
  '/',
  '/_next',
  '/api',
  '/favicon.ico',
];

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Check if path is public
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

/**
 * Validate JWT token with backend
 */
async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // Don't cache auth checks
      cache: 'no-store',
    });

    return response.ok;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
}

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value;

  // No token - redirect to login
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validate token with backend
  const isValid = await validateToken(token);

  if (!isValid) {
    // Invalid token - clear cookie and redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth-token');
    return response;
  }

  // Token is valid - allow request
  return NextResponse.next();
}

/**
 * Middleware configuration
 * Applies to all routes except static files and API routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
