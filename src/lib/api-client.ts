import { useState, useCallback } from 'react';
import { ProcessRequest, ProcessResponse, BatchRequest, BatchResponse, AsyncTaskResponse, TaskStatusResponse, ValidateRequest, ValidateResponse } from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

interface ApiError {
  code: string;
  message: string;
  details?: string;
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
        throw result.error;
      }

      return result.data;
    } catch (err) {
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: '网络请求失败',
        details: err instanceof Error ? err.message : String(err),
      };
      
      if (err && typeof err === 'object') {
        apiError.code = (err as any).code || 'UNKNOWN_ERROR';
        apiError.message = (err as any).message || '请求失败';
        apiError.details = (err as any).details;
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
    
    return makeRequest(`/tasks?${query.toString()}`);
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

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);

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

  return {
    apiKey,
    saveApiKey,
    loadApiKey,
    clearApiKey,
  };
}