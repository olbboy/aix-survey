/**
 * Server-side Session Helpers
 * Utilities for checking auth on the server
 */

import { cookies } from 'next/headers';
import { auth } from './auth';

/**
 * Get current session on server
 */
export async function getSession() {
  try {
    const cookieStore = await cookies();
    const headers = new Headers();
    cookieStore.getAll().forEach((cookie) => {
      headers.append('cookie', `${cookie.name}=${cookie.value}`);
    });

    const session = await auth.api.getSession({
      headers,
    });
    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Get current user on server
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

/**
 * Require authentication (throws if not authenticated)
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    throw new Error('Authentication required');
  }
  return session;
}

/**
 * Require specific role
 */
export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  const userRole = (session.user as any).role;

  if (!allowedRoles.includes(userRole)) {
    throw new Error('Insufficient permissions');
  }

  return session;
}

/**
 * Check if user has role
 */
export async function hasRole(role: string) {
  const session = await getSession();
  if (!session) return false;

  const userRole = (session.user as any).role;
  return userRole === role;
}

/**
 * Check if user is admin
 */
export async function isAdmin() {
  return hasRole('ADMIN') || hasRole('OWNER');
}
