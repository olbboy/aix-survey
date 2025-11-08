import { useEffect, useRef, useState, useCallback } from 'react';

interface AutosaveOptions {
  delay?: number; // Delay in milliseconds before autosave (default: 3000ms)
  onSave: (data: any) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface AutosaveState {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: Date | null;
  error: string | null;
}

export function useAutosave<T>(data: T, options: AutosaveOptions) {
  const { delay = 3000, onSave, onSuccess, onError } = options;

  const [state, setState] = useState<AutosaveState>({
    status: 'idle',
    lastSaved: null,
    error: null,
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousDataRef = useRef<T>(data);

  const save = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, status: 'saving', error: null }));
      await onSave(data);
      setState({
        status: 'saved',
        lastSaved: new Date(),
        error: null,
      });
      onSuccess?.();

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setState((prev) => ({ ...prev, status: 'idle' }));
      }, 2000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Save failed';
      setState({
        status: 'error',
        lastSaved: null,
        error: errorMessage,
      });
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [data, onSave, onSuccess, onError]);

  useEffect(() => {
    // Don't save if data hasn't changed
    if (JSON.stringify(data) === JSON.stringify(previousDataRef.current)) {
      return;
    }

    previousDataRef.current = data;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, save]);

  return state;
}
