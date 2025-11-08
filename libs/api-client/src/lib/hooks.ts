/**
 * React Hooks for API Client
 * Type-safe data fetching hooks with proper cleanup and state management
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getApiClient } from './client';
import { ApiClientError, formatErrorMessage } from './error';

/**
 * API Hook State
 */
export interface UseApiState<T> {
  data: T | null;
  error: ApiClientError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

/**
 * API Hook Options
 */
export interface UseApiOptions {
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: ApiClientError) => void;
}

/**
 * Mutation Hook State
 */
export interface UseMutationState<T> {
  data: T | null;
  error: ApiClientError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

/**
 * Mutation Hook Options
 */
export interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: ApiClientError, variables: TVariables) => void;
  onSettled?: (data: TData | null, error: ApiClientError | null, variables: TVariables) => void;
}

/**
 * Hook for fetching data from API
 *
 * @example
 * const { data, isLoading, error, refetch } = useApi(
 *   (client) => client.get('/api/assessments'),
 *   { enabled: true }
 * );
 */
export function useApi<T>(
  fetcher: (client: ReturnType<typeof getApiClient>) => Promise<T>,
  options: UseApiOptions = {}
): UseApiState<T> & { refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isMountedRef = useRef(true);
  const { enabled = true, retry = 0, retryDelay = 1000, onSuccess, onError } = options;

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    let attempt = 0;
    const maxAttempts = retry + 1;

    while (attempt < maxAttempts) {
      try {
        const client = getApiClient();
        const result = await fetcher(client);

        if (isMountedRef.current) {
          setData(result);
          setError(null);
          setIsLoading(false);
          onSuccess?.(result);
        }

        return;
      } catch (err) {
        const apiError = err instanceof ApiClientError ? err : new ApiClientError(
          formatErrorMessage(err),
          0,
          'UNKNOWN_ERROR'
        );

        attempt++;

        // If this is the last attempt or error is not retryable, fail
        if (attempt >= maxAttempts || (apiError.isClientError() && !apiError.isAuthError())) {
          if (isMountedRef.current) {
            setError(apiError);
            setData(null);
            setIsLoading(false);
            onError?.(apiError);
          }
          return;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }, [fetcher, enabled, retry, retryDelay, onSuccess, onError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    refetch: fetchData,
  };
}

/**
 * Hook for mutations (POST, PUT, DELETE operations)
 *
 * @example
 * const { mutate, isLoading, error } = useMutation(
 *   (client, data) => client.post('/api/assessments', data),
 *   { onSuccess: (data) => console.log('Created!', data) }
 * );
 *
 * mutate({ title: 'New Assessment' });
 */
export function useMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (client: ReturnType<typeof getApiClient>, variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationState<TData> & {
  mutate: (variables: TVariables) => Promise<void>;
  reset: () => void;
} {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<ApiClientError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isMountedRef = useRef(true);
  const { onSuccess, onError, onSettled } = options;

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      setError(null);

      try {
        const client = getApiClient();
        const result = await mutationFn(client, variables);

        if (isMountedRef.current) {
          setData(result);
          setError(null);
          setIsLoading(false);
          onSuccess?.(result, variables);
          onSettled?.(result, null, variables);
        }
      } catch (err) {
        const apiError = err instanceof ApiClientError ? err : new ApiClientError(
          formatErrorMessage(err),
          0,
          'UNKNOWN_ERROR'
        );

        if (isMountedRef.current) {
          setError(apiError);
          setData(null);
          setIsLoading(false);
          onError?.(apiError, variables);
          onSettled?.(null, apiError, variables);
        }
      }
    },
    [mutationFn, onSuccess, onError, onSettled]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    error,
    isLoading,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    mutate,
    reset,
  };
}

/**
 * Hook for paginated data fetching
 *
 * @example
 * const { data, isLoading, page, setPage, hasMore } = usePaginatedApi(
 *   (client, page) => client.get(`/api/assessments?page=${page}`),
 *   { initialPage: 1 }
 * );
 */
export function usePaginatedApi<T>(
  fetcher: (client: ReturnType<typeof getApiClient>, page: number) => Promise<T>,
  options: UseApiOptions & { initialPage?: number } = {}
): UseApiState<T> & {
  page: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  refetch: () => Promise<void>;
} {
  const [page, setPage] = useState(options.initialPage ?? 1);

  const fetcherWithPage = useCallback(
    (client: ReturnType<typeof getApiClient>) => fetcher(client, page),
    [fetcher, page]
  );

  const { data, error, isLoading, isError, isSuccess, refetch } = useApi<T>(
    fetcherWithPage,
    options
  );

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  return {
    data,
    error,
    isLoading,
    isError,
    isSuccess,
    page,
    setPage,
    nextPage,
    prevPage,
    refetch,
  };
}
