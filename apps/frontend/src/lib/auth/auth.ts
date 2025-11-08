/**
 * Authentication Module Entry Point
 * Central re-export for all auth-related functionality
 * Maintains backward compatibility with better-auth imports
 */

// Re-export types from auth-store
export type { User, AuthState } from './auth-store';

// Re-export Session type from auth-client
export type { Session } from './auth-client';

// Re-export store and utilities
export { useAuthStore, getTokenFromCookie } from './auth-store';

// Re-export auth client hooks and functions
export {
  useSession,
  useAuth,
  useCurrentUser,
  useRequireAuth,
  signIn,
  signUp,
  signOut,
  verifyEmail,
  sendVerificationEmail,
  forgetPassword,
  resetPassword,
  authClient,
} from './auth-client';

// Re-export API client functions
export {
  login,
  register,
  getProfile,
  getCurrentUser,
  validateToken,
} from './auth-api-client';

// Re-export middleware helpers
export {
  requireAuth,
  requireRole,
  getUser,
  hasPermission,
  verifyAdminInRoute,
} from './middleware-helpers';
