/**
 * AuthProvider Component
 * Initializes authentication state from localStorage and provides auth context
 */

'use client';

import { useEffect, ReactNode } from 'react';
import { useAuthStore } from './auth-store';
import { validateToken } from './auth-api-client';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setAuth, clearAuth, setLoading } = useAuthStore();

  useEffect(() => {
    // Initialize auth state from localStorage
    const initializeAuth = async () => {
      setLoading(true);

      try {
        const token = localStorage.getItem('auth-token');
        const userStr = localStorage.getItem('auth-user');

        if (token && userStr) {
          // Validate token with backend
          const isValid = await validateToken(token);

          if (isValid) {
            const user = JSON.parse(userStr);
            setAuth(token, user);
          } else {
            // Token invalid - clear storage
            localStorage.removeItem('auth-token');
            localStorage.removeItem('auth-user');
            clearAuth();
          }
        } else {
          clearAuth();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [setAuth, clearAuth, setLoading]);

  return <>{children}</>;
}
