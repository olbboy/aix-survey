/**
 * Middleware Helpers for JWT Authentication
 * Replaces better-auth middleware helpers with JWT-based authentication
 */

import { NextRequest } from 'next/server';
import { getTokenFromCookie } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Verify JWT token with backend
 */
async function verifyToken(token: string): Promise<{ valid: boolean; user?: any }> {
  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { valid: false };
    }

    const user = await response.json();
    return { valid: true, user };
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false };
  }
}

/**
 * Require authentication for API routes
 * @throws {Error} If user is not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<string> {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    throw new Error('Unauthorized: No authentication token provided');
  }

  const { valid } = await verifyToken(token);

  if (!valid) {
    throw new Error('Unauthorized: Invalid or expired token');
  }

  return token;
}

/**
 * Require specific role for API routes
 * @throws {Error} If user doesn't have required role
 */
export async function requireRole(request: NextRequest, role: string): Promise<{ token: string; user: any }> {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    throw new Error('Unauthorized: No authentication token provided');
  }

  const { valid, user } = await verifyToken(token);

  if (!valid || !user) {
    throw new Error('Unauthorized: Invalid or expired token');
  }

  if (user.role !== role) {
    throw new Error(`Forbidden: Requires ${role} role`);
  }

  return { token, user };
}

/**
 * Get user from request (for API routes)
 */
export async function getUser(request: NextRequest): Promise<any | null> {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return null;
  }

  const { valid, user } = await verifyToken(token);

  return valid ? user : null;
}

/**
 * Check if user has permission (can be extended based on backend)
 */
export async function hasPermission(request: NextRequest, permission: string): Promise<boolean> {
  const user = await getUser(request);

  if (!user) {
    return false;
  }

  // Basic role-based permissions
  // Extend this based on your backend permission system
  if (user.role === 'admin') {
    return true; // Admin has all permissions
  }

  // Add more granular permission checks here
  return false;
}

/**
 * Verify admin role for API routes (backward compatibility)
 * Returns authorization result with user or error response
 */
export async function verifyAdminInRoute(
  request: NextRequest
): Promise<{ authorized: true; user: any } | { authorized: false; response: Response }> {
  try {
    const { user } = await requireRole(request, 'ADMIN');
    return { authorized: true, user };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unauthorized';
    const response = new Response(
      JSON.stringify({ error: message }),
      {
        status: message.includes('Insufficient') ? 403 : 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return { authorized: false, response };
  }
}
