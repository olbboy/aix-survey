/**
 * @aix-survey/api-client
 * Type-safe API client for AIX Survey Platform
 *
 * Features:
 * - Automatic JWT token injection
 * - Comprehensive TypeScript types
 * - React hooks for data fetching
 * - Error handling with retry logic
 * - Request timeout support
 * - Pagination support
 *
 * @example
 * ```typescript
 * import { createApiClient, ApiEndpoints, useApi, useMutation } from '@aix-survey/api-client';
 *
 * // Initialize client
 * const client = createApiClient({
 *   baseUrl: 'http://localhost:3001/api',
 *   tokenProvider: () => localStorage.getItem('auth-token'),
 * });
 *
 * const api = new ApiEndpoints(client);
 *
 * // Use in component
 * const { data, isLoading } = useApi(
 *   (client) => api.assessments.getAll()
 * );
 *
 * const { mutate } = useMutation(
 *   (client, data) => api.assessments.create(data)
 * );
 * ```
 */

// Core client
export { ApiClient, createApiClient, getApiClient } from './lib/client';
export type { ApiClientConfig } from './lib/client';

// Types
export type {
  // Common
  PaginationParams,
  PaginatedResponse,
  ApiError,
  RequestConfig,
  // Auth
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  // Assessment
  Assessment,
  AssessmentQuestion,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentResponse,
  SubmitAssessmentRequest,
  // Benchmark
  Benchmark,
  BenchmarkMetric,
  ComparisonResult,
  // Goals
  Goal,
  CreateGoalRequest,
  UpdateGoalRequest,
  // Organization
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  // Admin
  AdminStats,
  AuditLog,
  UserManagement,
  UpdateUserRequest,
} from './lib/types';

// Error handling
export { ApiClientError, formatErrorMessage } from './lib/error';

// React hooks
export {
  useApi,
  useMutation,
  usePaginatedApi,
} from './lib/hooks';
export type {
  UseApiState,
  UseApiOptions,
  UseMutationState,
  UseMutationOptions,
} from './lib/hooks';

// API endpoints
export {
  ApiEndpoints,
  AuthEndpoints,
  AssessmentEndpoints,
  BenchmarkEndpoints,
  GoalEndpoints,
  OrganizationEndpoints,
  AdminEndpoints,
} from './lib/endpoints';
