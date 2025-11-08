/**
 * Auth Middleware Helpers
 * Utilities for authentication and authorization in API routes and middleware
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from './auth';
import { log } from '@/lib/utils/logger';

/**
 * Verify session token from cookies
 */
export async function verifySession(sessionToken: string) {
  try {
    const session = await auth.api.getSession({
      headers: {
        cookie: `better-auth.session_token=${sessionToken}`,
      },
    });

    if (!session || !session.user) {
      return null;
    }

    return {
      user: session.user,
      session: session.session,
    };
  } catch (error) {
    log.error('Session verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get session from NextRequest
 */
export async function getSessionFromRequest(
  request: NextRequest
): Promise<{ user: any; session: any } | null> {
  const sessionToken = request.cookies.get('better-auth.session_token');

  if (!sessionToken) {
    return null;
  }

  return verifySession(sessionToken.value);
}

/**
 * Require admin role
 */
export function requireAdmin(user: any): void {
  if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER')) {
    throw new Error('Admin access required');
  }
}

/**
 * Require specific role
 */
export function requireRole(user: any, allowedRoles: string[]): void {
  if (!user || !allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(user: any): boolean {
  return user && (user.role === 'ADMIN' || user.role === 'OWNER');
}

/**
 * Check if user has role
 */
export function hasRole(user: any, role: string): boolean {
  return user && user.role === role;
}

/**
 * Middleware helper to verify authentication in API routes
 */
export async function verifyAuthInRoute(request: NextRequest): Promise<{
  authorized: boolean;
  user: any | null;
  response?: NextResponse;
}> {
  const sessionToken = request.cookies.get('better-auth.session_token');

  if (!sessionToken) {
    return {
      authorized: false,
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized - No session token' },
        { status: 401 }
      ),
    };
  }

  const session = await verifySession(sessionToken.value);

  if (!session) {
    return {
      authorized: false,
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized - Invalid session' },
        { status: 401 }
      ),
    };
  }

  return {
    authorized: true,
    user: session.user,
  };
}

/**
 * Middleware helper to verify admin access in API routes
 */
export async function verifyAdminInRoute(request: NextRequest): Promise<{
  authorized: boolean;
  user: any | null;
  response?: NextResponse;
}> {
  const authResult = await verifyAuthInRoute(request);

  if (!authResult.authorized) {
    return authResult;
  }

  if (!isAdmin(authResult.user)) {
    return {
      authorized: false,
      user: authResult.user,
      response: NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      ),
    };
  }

  return {
    authorized: true,
    user: authResult.user,
  };
}

/**
 * Get current user from server-side cookies
 */
export async function getCurrentUserFromCookies() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('better-auth.session_token');

    if (!sessionToken) {
      return null;
    }

    const session = await verifySession(sessionToken.value);
    return session?.user || null;
  } catch (error) {
    log.error('Failed to get current user from cookies', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}
