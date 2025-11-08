/**
 * API Endpoints
 * Type-safe methods for all API endpoints organized by domain
 */

import { ApiClient } from './client';
import type {
  // Auth
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
  // Assessment
  Assessment,
  CreateAssessmentRequest,
  UpdateAssessmentRequest,
  AssessmentResponse,
  SubmitAssessmentRequest,
  PaginatedResponse,
  PaginationParams,
  // Benchmark
  Benchmark,
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
} from './types';

/**
 * Authentication Endpoints
 */
export class AuthEndpoints {
  constructor(private client: ApiClient) {}

  /**
   * Login with email and password
   */
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/login', credentials);
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/register', data);
  }

  /**
   * Get current user profile
   */
  async getProfile(): Promise<User> {
    return this.client.get<User>('/auth/profile');
  }

  /**
   * Logout (clears session on server if needed)
   */
  async logout(): Promise<void> {
    return this.client.post<void>('/auth/logout');
  }

  /**
   * Refresh access token
   */
  async refresh(): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/refresh');
  }
}

/**
 * Assessment Endpoints
 */
export class AssessmentEndpoints {
  constructor(private client: ApiClient) {}

  /**
   * Get all assessments with pagination
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Assessment>> {
    const query = this.client.buildQueryString(params || {});
    return this.client.get<PaginatedResponse<Assessment>>(`/assessments${query}`);
  }

  /**
   * Get assessment by ID
   */
  async getById(id: string): Promise<Assessment> {
    return this.client.get<Assessment>(`/assessments/${id}`);
  }

  /**
   * Create new assessment
   */
  async create(data: CreateAssessmentRequest): Promise<Assessment> {
    return this.client.post<Assessment>('/assessments', data);
  }

  /**
   * Update assessment
   */
  async update(id: string, data: UpdateAssessmentRequest): Promise<Assessment> {
    return this.client.put<Assessment>(`/assessments/${id}`, data);
  }

  /**
   * Delete assessment
   */
  async delete(id: string): Promise<void> {
    return this.client.delete<void>(`/assessments/${id}`);
  }

  /**
   * Submit assessment response
   */
  async submit(data: SubmitAssessmentRequest): Promise<AssessmentResponse> {
    return this.client.post<AssessmentResponse>('/assessments/submit', data);
  }

  /**
   * Get user's assessment responses
   */
  async getResponses(params?: PaginationParams): Promise<PaginatedResponse<AssessmentResponse>> {
    const query = this.client.buildQueryString(params || {});
    return this.client.get<PaginatedResponse<AssessmentResponse>>(`/assessments/responses${query}`);
  }

  /**
   * Get assessment response by ID
   */
  async getResponse(id: string): Promise<AssessmentResponse> {
    return this.client.get<AssessmentResponse>(`/assessments/responses/${id}`);
  }
}

/**
 * Benchmark Endpoints
 */
export class BenchmarkEndpoints {
  constructor(private client: ApiClient) {}

  /**
   * Get all benchmarks
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Benchmark>> {
    const query = this.client.buildQueryString(params || {});
    return this.client.get<PaginatedResponse<Benchmark>>(`/benchmarks${query}`);
  }

  /**
   * Get benchmark by ID
   */
  async getById(id: string): Promise<Benchmark> {
    return this.client.get<Benchmark>(`/benchmarks/${id}`);
  }

  /**
   * Compare user score with benchmark
   */
  async compare(benchmarkId: string, assessmentResponseId: string): Promise<ComparisonResult[]> {
    return this.client.post<ComparisonResult[]>('/benchmarks/compare', {
      benchmarkId,
      assessmentResponseId,
    });
  }

  /**
   * Get aggregate benchmark data
   */
  async getAggregate(industry?: string): Promise<Record<string, any>> {
    const query = industry ? this.client.buildQueryString({ industry }) : '';
    return this.client.get<Record<string, any>>(`/benchmarks/aggregate${query}`);
  }
}

/**
 * Goals Endpoints
 */
export class GoalEndpoints {
  constructor(private client: ApiClient) {}

  /**
   * Get all user goals
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Goal>> {
    const query = this.client.buildQueryString(params || {});
    return this.client.get<PaginatedResponse<Goal>>(`/goals${query}`);
  }

  /**
   * Get goal by ID
   */
  async getById(id: string): Promise<Goal> {
    return this.client.get<Goal>(`/goals/${id}`);
  }

  /**
   * Create new goal
   */
  async create(data: CreateGoalRequest): Promise<Goal> {
    return this.client.post<Goal>('/goals', data);
  }

  /**
   * Update goal
   */
  async update(id: string, data: UpdateGoalRequest): Promise<Goal> {
    return this.client.put<Goal>(`/goals/${id}`, data);
  }

  /**
   * Delete goal
   */
  async delete(id: string): Promise<void> {
    return this.client.delete<void>(`/goals/${id}`);
  }

  /**
   * Update goal progress
   */
  async updateProgress(id: string, progress: number): Promise<Goal> {
    return this.client.patch<Goal>(`/goals/${id}/progress`, { progress });
  }
}

/**
 * Organization Endpoints
 */
export class OrganizationEndpoints {
  constructor(private client: ApiClient) {}

  /**
   * Get user's organizations
   */
  async getAll(params?: PaginationParams): Promise<PaginatedResponse<Organization>> {
    const query = this.client.buildQueryString(params || {});
    return this.client.get<PaginatedResponse<Organization>>(`/organizations${query}`);
  }

  /**
   * Get organization by ID
   */
  async getById(id: string): Promise<Organization> {
    return this.client.get<Organization>(`/organizations/${id}`);
  }

  /**
   * Create organization
   */
  async create(data: CreateOrganizationRequest): Promise<Organization> {
    return this.client.post<Organization>('/organizations', data);
  }

  /**
   * Update organization
   */
  async update(id: string, data: UpdateOrganizationRequest): Promise<Organization> {
    return this.client.put<Organization>(`/organizations/${id}`, data);
  }

  /**
   * Delete organization
   */
  async delete(id: string): Promise<void> {
    return this.client.delete<void>(`/organizations/${id}`);
  }
}

/**
 * Admin Endpoints
 */
export class AdminEndpoints {
  constructor(private client: ApiClient) {}

  /**
   * Get platform statistics
   */
  async getStats(): Promise<AdminStats> {
    return this.client.get<AdminStats>('/admin/stats');
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(params?: PaginationParams): Promise<PaginatedResponse<AuditLog>> {
    const query = this.client.buildQueryString(params || {});
    return this.client.get<PaginatedResponse<AuditLog>>(`/admin/audit-logs${query}`);
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(params?: PaginationParams): Promise<PaginatedResponse<UserManagement>> {
    const query = this.client.buildQueryString(params || {});
    return this.client.get<PaginatedResponse<UserManagement>>(`/admin/users${query}`);
  }

  /**
   * Get user by ID (admin only)
   */
  async getUserById(id: string): Promise<UserManagement> {
    return this.client.get<UserManagement>(`/admin/users/${id}`);
  }

  /**
   * Update user (admin only)
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<UserManagement> {
    return this.client.put<UserManagement>(`/admin/users/${id}`, data);
  }

  /**
   * Delete user (admin only)
   */
  async deleteUser(id: string): Promise<void> {
    return this.client.delete<void>(`/admin/users/${id}`);
  }

  /**
   * Get system health
   */
  async getHealth(): Promise<Record<string, any>> {
    return this.client.get<Record<string, any>>('/admin/health');
  }

  /**
   * Get platform analytics
   */
  async getAnalytics(params?: Record<string, any>): Promise<Record<string, any>> {
    const query = params ? this.client.buildQueryString(params) : '';
    return this.client.get<Record<string, any>>(`/admin/analytics${query}`);
  }
}

/**
 * Combined API Endpoints
 * Provides access to all endpoint groups
 */
export class ApiEndpoints {
  public readonly auth: AuthEndpoints;
  public readonly assessments: AssessmentEndpoints;
  public readonly benchmarks: BenchmarkEndpoints;
  public readonly goals: GoalEndpoints;
  public readonly organizations: OrganizationEndpoints;
  public readonly admin: AdminEndpoints;

  constructor(client: ApiClient) {
    this.auth = new AuthEndpoints(client);
    this.assessments = new AssessmentEndpoints(client);
    this.benchmarks = new BenchmarkEndpoints(client);
    this.goals = new GoalEndpoints(client);
    this.organizations = new OrganizationEndpoints(client);
    this.admin = new AdminEndpoints(client);
  }
}
