/**
 * API Client
 * Type-safe HTTP client with automatic JWT token injection
 */

import {
  ApiClientError,
  parseErrorResponse,
  handleNetworkError,
  retryRequest,
} from './error';
import type { RequestConfig } from './types';

/**
 * HTTP Methods
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Token Provider Function
 */
type TokenProvider = () => string | null | Promise<string | null>;

/**
 * API Client Configuration
 */
export interface ApiClientConfig {
  baseUrl: string;
  tokenProvider: TokenProvider;
  defaultTimeout?: number;
  defaultRetry?: number;
  onUnauthorized?: () => void;
}

/**
 * Base API Client Class
 *
 * Features:
 * - Automatic JWT token injection
 * - Type-safe requests/responses
 * - Comprehensive error handling
 * - Retry logic with exponential backoff
 * - Request timeout support
 * - Unauthorized callback
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly tokenProvider: TokenProvider;
  private readonly defaultTimeout: number;
  private readonly defaultRetry: number;
  private readonly onUnauthorized?: () => void;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.tokenProvider = config.tokenProvider;
    this.defaultTimeout = config.defaultTimeout ?? 30000; // 30 seconds default
    this.defaultRetry = config.defaultRetry ?? 3;
    this.onUnauthorized = config.onUnauthorized;
  }

  /**
   * Make HTTP request with automatic token injection
   */
  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = await this.tokenProvider();

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...config?.headers,
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build request options
    const options: RequestInit = {
      method,
      headers,
      cache: config?.cache ?? 'no-store',
    };

    // Add body for POST/PUT/PATCH requests
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = config?.timeout ?? this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;

    try {
      // Execute request with retry logic
      const response = await retryRequest(
        () => fetch(url, options),
        config?.retry ?? this.defaultRetry
      );

      clearTimeout(timeoutId);

      // Handle non-OK responses
      if (!response.ok) {
        const error = await parseErrorResponse(response);

        // Call unauthorized callback on 401
        if (error.statusCode === 401 && this.onUnauthorized) {
          this.onUnauthorized();
        }

        throw error;
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // Parse JSON response
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort error
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ApiClientError('Request timeout', 408, 'TIMEOUT');
      }

      // Handle other errors
      throw handleNetworkError(error as Error);
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', endpoint, data, config);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }

  /**
   * Build query string from object
   */
  buildQueryString(params: Record<string, any>): string {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });

    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
  }
}

/**
 * Create singleton API client instance
 */
let clientInstance: ApiClient | null = null;

export function createApiClient(config: ApiClientConfig): ApiClient {
  clientInstance = new ApiClient(config);
  return clientInstance;
}

export function getApiClient(): ApiClient {
  if (!clientInstance) {
    throw new Error('API client not initialized. Call createApiClient() first.');
  }
  return clientInstance;
}
