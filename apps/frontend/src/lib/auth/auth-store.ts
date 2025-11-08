/**
 * Authentication Store
 * Zustand-based state management for JWT authentication
 * Replaces better-auth with backend JWT tokens from NestJS
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface AuthState {
  // State
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Set authentication (after successful login/register)
      setAuth: (token: string, user: User) => {
        set({
          token,
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        // Store token in cookie for SSR
        if (typeof document !== 'undefined') {
          document.cookie = `auth-token=${token}; path=/; max-age=3600; SameSite=Strict`;
        }
      },

      // Clear authentication (logout)
      clearAuth: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });

        // Clear cookie
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
        }
      },

      // Set loading state
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Get token from cookie (for SSR)
 */
export function getTokenFromCookie(cookieString?: string): string | null {
  if (typeof window === 'undefined') {
    // Server-side: parse from provided cookie string
    if (!cookieString) return null;
    const match = cookieString.match(/auth-token=([^;]+)/);
    return match ? match[1] : null;
  } else {
    // Client-side: parse from document.cookie
    const match = document.cookie.match(/auth-token=([^;]+)/);
    return match ? match[1] : null;
  }
}
