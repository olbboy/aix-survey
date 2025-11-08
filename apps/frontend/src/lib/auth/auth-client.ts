/**
 * better-auth Client
 * Client-side authentication helpers
 */

import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});

/**
 * Client-side hooks and helpers
 */
export const {
  useSession,
  signIn,
  signUp,
  signOut,
  verifyEmail,
  sendVerificationEmail,
  forgetPassword,
  resetPassword,
} = authClient;

/**
 * Type-safe session hook
 */
export type { Session } from '@/lib/auth/auth';
