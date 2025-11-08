/**
 * Server-side Session Helpers
 * Utilities for checking auth on the server using JWT
 */

import { cookies } from 'next/headers';
import { log } from '@/lib/utils/logger';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Session {
  user: User;
  token: string;
}

/**
 * Verify JWT token with backend and get user
 */
async function verifyTokenAndGetUser(token: string): Promise<User | null> {
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
      return null;
    }

    return response.json();
  } catch (error) {
    log.error('Token verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get current session on server
 */
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return null;
    }

    const user = await verifyTokenAndGetUser(token);

    if (!user) {
      return null;
    }

    return { user, token };
  } catch (error) {
    log.error('Failed to get session', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Get current user on server
 */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth(): Promise<Session> {
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

/**
 * Require specific role
 */
export async function requireRole(allowedRoles: string[]): Promise<Session> {
  const session = await requireAuth();
  const userRole = session.user.role;

  if (!allowedRoles.includes(userRole)) {
    throw new Error('Insufficient permissions');
  }

  return session;
}

/**
 * Check if user has role
 */
export async function hasRole(role: string): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;

  return session.user.role === role;
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  return (await hasRole('ADMIN')) || (await hasRole('OWNER'));
}
