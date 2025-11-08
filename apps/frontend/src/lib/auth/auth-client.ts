/**
 * Authentication Client (Replacement for better-auth)
 * Provides React hooks and helpers for JWT authentication with NestJS backend
 */

'use client';

import { useCallback, useEffect } from 'react';
import { useAuthStore } from './auth-store';
import * as authApi from './auth-api-client';

/**
 * Hook to get current session
 * Replaces better-auth useSession hook
 */
export function useSession() {
  const { user, token, isAuthenticated, isLoading } = useAuthStore();

  return {
    data: isAuthenticated ? { user, token } : null,
    isPending: isLoading,
    error: null,
  };
}

/**
 * Sign in with email and password
 * Replaces better-auth signIn
 */
export async function signIn(email: string, password: string) {
  const { setAuth, setLoading } = useAuthStore.getState();

  try {
    setLoading(true);
    const response = await authApi.login({ email, password });
    setAuth(response.accessToken, response.user);
    return { data: response, error: null };
  } catch (error) {
    setLoading(false);
    return { data: null, error: error instanceof Error ? error : new Error('Login failed') };
  }
}

/**
 * Sign up new user
 * Replaces better-auth signUp
 */
export async function signUp(email: string, password: string, name?: string) {
  const { setAuth, setLoading } = useAuthStore.getState();

  try {
    setLoading(true);
    const response = await authApi.register({ email, password, name });
    setAuth(response.accessToken, response.user);
    return { data: response, error: null };
  } catch (error) {
    setLoading(false);
    return { data: null, error: error instanceof Error ? error : new Error('Registration failed') };
  }
}

/**
 * Sign out
 * Replaces better-auth signOut
 */
export async function signOut() {
  const { clearAuth } = useAuthStore.getState();
  clearAuth();
  return { data: null, error: null };
}

/**
 * Verify email
 * Placeholder - implement when email verification is added to backend
 */
export async function verifyEmail(token: string) {
  console.warn('Email verification not yet implemented in backend');
  return { data: null, error: new Error('Not implemented') };
}

/**
 * Send verification email
 * Placeholder - implement when email verification is added to backend
 */
export async function sendVerificationEmail(email: string) {
  console.warn('Email verification not yet implemented in backend');
  return { data: null, error: new Error('Not implemented') };
}

/**
 * Forgot password
 * Placeholder - implement when password reset is added to backend
 */
export async function forgetPassword(email: string) {
  console.warn('Password reset not yet implemented in backend');
  return { data: null, error: new Error('Not implemented') };
}

/**
 * Reset password
 * Placeholder - implement when password reset is added to backend
 */
export async function resetPassword(token: string, password: string) {
  console.warn('Password reset not yet implemented in backend');
  return { data: null, error: new Error('Not implemented') };
}

/**
 * Hook to check authentication status
 */
export function useAuth() {
  const { user, token, isAuthenticated, isLoading } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
  };
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  const { user, isAuthenticated } = useAuthStore();
  return isAuthenticated ? user : null;
}

/**
 * Hook to require authentication
 * Redirects to login if not authenticated
 */
export function useRequireAuth(redirectTo = '/auth/login') {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}

// Export for backward compatibility with better-auth imports
export const authClient = {
  useSession,
  signIn,
  signUp,
  signOut,
  verifyEmail,
  sendVerificationEmail,
  forgetPassword,
  resetPassword,
};

// Export types
export type Session = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  };
  token: string;
};
