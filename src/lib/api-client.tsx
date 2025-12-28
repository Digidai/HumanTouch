import { useState, useCallback, createContext, useContext, ReactNode, useEffect } from 'react';
import { ProcessRequest, ProcessResponse, BatchRequest, BatchResponse, AsyncTaskResponse, TaskStatusResponse, ValidateRequest, ValidateResponse, TaskListResponse } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  httpStatus?: number;
}

interface UseApiOptions {
  apiKey?: string | null;
}

export function useApi(options: UseApiOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const makeRequest = useCallback(async (
    endpoint: string,
    method: string = 'GET',
    data?: Record<string, unknown> | ProcessRequest | BatchRequest | ValidateRequest
  ) => {
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (options.apiKey) {
        headers['Authorization'] = `Bearer ${options.apiKey}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await response.json();

      if (!result.success) {
        const errPayload = result.error || {};
        const apiError: ApiError = {
          code: errPayload.code || 'UNKNOWN_ERROR',
          message: errPayload.message || '请求失败',
          details: errPayload.details,
          httpStatus: response.status,
        };
        throw apiError;
      }

      return result.data;
    } catch (err) {
      let apiError: ApiError;

      if (err && typeof err === 'object' && 'code' in (err as any)) {
        const e = err as any;
        apiError = {
          code: e.code || 'UNKNOWN_ERROR',
          message: e.message || '请求失败',
          details: e.details,
          httpStatus: e.httpStatus,
        };
      } else {
        apiError = {
          code: 'NETWORK_ERROR',
          message: '网络请求失败',
          details: err instanceof Error ? err.message : String(err),
        };
      }

      setError(apiError);
      throw apiError;
    } finally {
      setLoading(false);
    }
  }, [options.apiKey]);

  const processText = useCallback(async (request: ProcessRequest) => {
    return makeRequest('/process', 'POST', request) as Promise<ProcessResponse>;
  }, [makeRequest]);

  const batchProcess = useCallback(async (request: BatchRequest) => {
    return makeRequest('/batch', 'POST', request) as Promise<BatchResponse>;
  }, [makeRequest]);

  const createAsyncTask = useCallback(async (text: string, options?: Record<string, unknown>) => {
    return makeRequest('/async', 'POST', { text, options }) as Promise<AsyncTaskResponse>;
  }, [makeRequest]);

  const getTaskStatus = useCallback(async (taskId: string) => {
    return makeRequest(`/status/${taskId}`) as Promise<TaskStatusResponse>;
  }, [makeRequest]);

  const getTasks = useCallback(async (params?: { status?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    
    return makeRequest(`/tasks?${query.toString()}`) as Promise<TaskListResponse>;
  }, [makeRequest]);

  const validateText = useCallback(async (request: ValidateRequest) => {
    return makeRequest('/validate', 'POST', request) as Promise<ValidateResponse>;
  }, [makeRequest]);

  return {
    loading,
    error,
    processText,
    batchProcess,
    createAsyncTask,
    getTaskStatus,
    getTasks,
    validateText,
    clearError: () => setError(null),
  };
}

// API Key Context for sharing state across components
interface ApiKeyContextType {
  apiKey: string | null;
  saveApiKey: (key: string) => void;
  loadApiKey: () => string | null;
  clearApiKey: () => void;
}

const ApiKeyContext = createContext<ApiKeyContextType | null>(null);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Load API key from localStorage on mount
  useEffect(() => {
    const key = localStorage.getItem('humantouch_api_key');
    if (key) {
      setApiKey(key);
    }
  }, []);

  const saveApiKey = useCallback((key: string) => {
    localStorage.setItem('humantouch_api_key', key);
    setApiKey(key);
  }, []);

  const loadApiKey = useCallback(() => {
    const key = localStorage.getItem('humantouch_api_key');
    setApiKey(key);
    return key;
  }, []);

  const clearApiKey = useCallback(() => {
    localStorage.removeItem('humantouch_api_key');
    setApiKey(null);
  }, []);

  return (
    <ApiKeyContext.Provider value={{ apiKey, saveApiKey, loadApiKey, clearApiKey }}>
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);

  // Fallback for when used outside provider (shouldn't happen, but for safety)
  const [fallbackKey, setFallbackKey] = useState<string | null>(null);

  useEffect(() => {
    if (!context) {
      const key = localStorage.getItem('humantouch_api_key');
      if (key) setFallbackKey(key);
    }
  }, [context]);

  if (context) {
    return context;
  }

  // Fallback implementation
  return {
    apiKey: fallbackKey,
    saveApiKey: (key: string) => {
      localStorage.setItem('humantouch_api_key', key);
      setFallbackKey(key);
    },
    loadApiKey: () => {
      const key = localStorage.getItem('humantouch_api_key');
      setFallbackKey(key);
      return key;
    },
    clearApiKey: () => {
      localStorage.removeItem('humantouch_api_key');
      setFallbackKey(null);
    },
  };
}