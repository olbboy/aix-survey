/**
 * API Client Types
 * Comprehensive type definitions for all API endpoints
 */

// =============================================================================
// Common Types
// =============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  timestamp?: string;
}

// =============================================================================
// Auth Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

// =============================================================================
// Assessment Types
// =============================================================================

export interface Assessment {
  id: string;
  title: string;
  description: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  questions: AssessmentQuestion[];
  createdAt: string;
  updatedAt: string;
  userId: string;
  organizationId: string | null;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  category: string;
  weight: number;
  order: number;
  assessmentId: string;
}

export interface CreateAssessmentRequest {
  title: string;
  description?: string;
  questions: Omit<AssessmentQuestion, 'id' | 'assessmentId'>[];
}

export interface UpdateAssessmentRequest {
  title?: string;
  description?: string;
  status?: Assessment['status'];
}

export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  answers: Record<string, number>;
  score: number;
  completedAt: string;
  userId: string;
}

export interface SubmitAssessmentRequest {
  assessmentId: string;
  answers: Record<string, number>;
}

// =============================================================================
// Benchmark Types
// =============================================================================

export interface Benchmark {
  id: string;
  name: string;
  description: string | null;
  industry: string;
  metrics: BenchmarkMetric[];
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkMetric {
  id: string;
  category: string;
  metric: string;
  value: number;
  percentile: number;
  benchmarkId: string;
}

export interface ComparisonResult {
  category: string;
  userScore: number;
  benchmarkScore: number;
  percentile: number;
  gap: number;
}

// =============================================================================
// Goals Types
// =============================================================================

export interface Goal {
  id: string;
  title: string;
  description: string | null;
  targetDate: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  progress: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  targetDate: string;
}

export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  targetDate?: string;
  status?: Goal['status'];
  progress?: number;
}

// =============================================================================
// Organization Types
// =============================================================================

export interface Organization {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  industry?: string;
  size?: string;
}

export interface UpdateOrganizationRequest {
  name?: string;
  industry?: string;
  size?: string;
}

// =============================================================================
// Admin Types
// =============================================================================

export interface AdminStats {
  totalUsers: number;
  totalAssessments: number;
  totalResponses: number;
  activeUsers: number;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface UserManagement {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  lastLogin: string | null;
  createdAt: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: string;
  status?: UserManagement['status'];
}

// =============================================================================
// Request Configuration
// =============================================================================

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retry?: number;
  cache?: RequestCache;
}
