'use client';

/**
 * Session Provider
 * Provides auth session context to client components
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession as useBetterAuthSession } from '@/lib/auth/auth-client';
import type { Session } from '@/lib/auth/auth';

interface SessionContextValue {
  session: Session | null;
  isLoading: boolean;
  error: Error | null;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  isLoading: true,
  error: null,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, error } = useBetterAuthSession();

  return (
    <SessionContext.Provider
      value={{
        session: session || null,
        isLoading: isPending,
        error: error || null,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session from client components
 */
export function useAuth() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useAuth must be used within SessionProvider');
  }
  return context;
}
