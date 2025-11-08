/**
 * API Client Configuration
 * Centralized API client instance with JWT token injection
 */

import { createApiClient, ApiEndpoints } from '@aix-survey/api-client';

// Get API URL from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Token provider function
const tokenProvider = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth-token');
};

// Create API client instance
const client = createApiClient({
  baseUrl: API_URL,
  tokenProvider,
  defaultTimeout: 30000, // 30 seconds
});

// Create API endpoints instance
export const api = new ApiEndpoints(client);

// Export client for direct access if needed
export { client };
