/**
 * API Error Handling
 * Comprehensive error handling for API requests
 */

import type { ApiError } from './types';

/**
 * Custom API Error Class
 */
export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly error?: string;
  public readonly timestamp: string;

  constructor(message: string, statusCode: number, error?: string) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.error = error;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiClientError);
    }
  }

  /**
   * Check if error is authentication related
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /**
   * Check if error is client-side
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Check if error is server-side
   */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /**
   * Convert to plain object for logging
   */
  toJSON(): ApiError {
    return {
      message: this.message,
      statusCode: this.statusCode,
      error: this.error,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Parse error response from API
 */
export async function parseErrorResponse(response: Response): Promise<ApiClientError> {
  let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
  let errorType: string | undefined;

  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || errorMessage;
    errorType = errorData.error;
  } catch {
    // If parsing fails, use default message
  }

  return new ApiClientError(errorMessage, response.status, errorType);
}

/**
 * Handle network errors
 */
export function handleNetworkError(error: Error): ApiClientError {
  if (error instanceof ApiClientError) {
    return error;
  }

  return new ApiClientError(
    error.message || 'Network request failed',
    0,
    'NETWORK_ERROR'
  );
}

/**
 * Retry logic for failed requests
 */
export async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx) except 408 (Request Timeout) and 429 (Too Many Requests)
      if (error instanceof ApiClientError) {
        if (error.isClientError() && error.statusCode !== 408 && error.statusCode !== 429) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }

  throw lastError!;
}

/**
 * Error message formatter
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unknown error occurred';
}
