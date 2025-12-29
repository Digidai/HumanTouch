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
      } else if (err instanceof TypeError && err.message.includes('fetch')) {
        apiError = {
          code: 'NETWORK_ERROR',
          message: '无法连接到服务器',
          details: '请检查网络连接后重试',
        };
      } else {
        apiError = {
          code: 'REQUEST_ERROR',
          message: err instanceof Error ? err.message : '请求失败',
          details: err instanceof Error ? err.stack : String(err),
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

  const createAsyncTask = useCallback(async (
    text: string,
    options?: Record<string, unknown>,
    apiKey?: string
  ) => {
    return makeRequest('/async', 'POST', {
      text,
      options,
      ...(apiKey && { api_key: apiKey }),
    }) as Promise<AsyncTaskResponse>;
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

// LLM Settings Context for sharing API key and model across components
interface LlmSettingsContextType {
  apiKey: string | null;
  model: string | null;
  saveSettings: (apiKey: string, model: string) => void;
  clearSettings: () => void;
  isConfigured: boolean;
}

const LlmSettingsContext = createContext<LlmSettingsContextType | null>(null);

const STORAGE_KEY_API = 'humantouch_api_key';
const STORAGE_KEY_MODEL = 'humantouch_model';

export function LlmSettingsProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem(STORAGE_KEY_API);
    const savedModel = localStorage.getItem(STORAGE_KEY_MODEL);
    if (savedKey) setApiKey(savedKey);
    if (savedModel) setModel(savedModel);
  }, []);

  const saveSettings = useCallback((newApiKey: string, newModel: string) => {
    localStorage.setItem(STORAGE_KEY_API, newApiKey);
    localStorage.setItem(STORAGE_KEY_MODEL, newModel);
    setApiKey(newApiKey);
    setModel(newModel);
  }, []);

  const clearSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_API);
    localStorage.removeItem(STORAGE_KEY_MODEL);
    setApiKey(null);
    setModel(null);
  }, []);

  const isConfigured = Boolean(apiKey && model);

  return (
    <LlmSettingsContext.Provider value={{ apiKey, model, saveSettings, clearSettings, isConfigured }}>
      {children}
    </LlmSettingsContext.Provider>
  );
}

export function useLlmSettings() {
  const context = useContext(LlmSettingsContext);

  // Fallback for when used outside provider
  const [fallbackKey, setFallbackKey] = useState<string | null>(null);
  const [fallbackModel, setFallbackModel] = useState<string | null>(null);

  useEffect(() => {
    if (!context) {
      const key = localStorage.getItem(STORAGE_KEY_API);
      const model = localStorage.getItem(STORAGE_KEY_MODEL);
      if (key) setFallbackKey(key);
      if (model) setFallbackModel(model);
    }
  }, [context]);

  if (context) {
    return context;
  }

  // Fallback implementation
  return {
    apiKey: fallbackKey,
    model: fallbackModel,
    saveSettings: (newApiKey: string, newModel: string) => {
      localStorage.setItem(STORAGE_KEY_API, newApiKey);
      localStorage.setItem(STORAGE_KEY_MODEL, newModel);
      setFallbackKey(newApiKey);
      setFallbackModel(newModel);
    },
    clearSettings: () => {
      localStorage.removeItem(STORAGE_KEY_API);
      localStorage.removeItem(STORAGE_KEY_MODEL);
      setFallbackKey(null);
      setFallbackModel(null);
    },
    isConfigured: Boolean(fallbackKey && fallbackModel),
  };
}

// Backwards compatibility alias
export const ApiKeyProvider = LlmSettingsProvider;
export const useApiKey = useLlmSettings;

// SSE 流式处理进度类型
export interface StreamProgress {
  stage: 'analyzing' | 'round' | 'detecting' | 'completed';
  progress: number;
  message: string;
  round?: number;
  totalRounds?: number;
  chunk?: number;
  totalChunks?: number;
}

interface UseStreamProcessOptions {
  onProgress?: (progress: StreamProgress) => void;
  onError?: (error: ApiError) => void;
  onComplete?: (result: ProcessResponse) => void;
}

export function useStreamProcess() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [progress, setProgress] = useState<StreamProgress | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const processTextStream = useCallback(async (
    request: ProcessRequest,
    options: UseStreamProcessOptions = {}
  ): Promise<ProcessResponse | null> => {
    setLoading(true);
    setError(null);
    setProgress(null);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(`${API_BASE}/process/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let result: ProcessResponse | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 解析 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (eventType === 'progress') {
                setProgress(data);
                options.onProgress?.(data);
              } else if (eventType === 'result') {
                result = data;
                options.onComplete?.(data);
              } else if (eventType === 'error') {
                const apiError: ApiError = {
                  code: data.code,
                  message: data.message,
                  details: data.details,
                };
                setError(apiError);
                options.onError?.(apiError);
                throw apiError;
              }
            } catch (parseError) {
              console.error('SSE parse error:', parseError, 'line:', line);
            }
          }
        }
      }

      return result;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return null;
      }

      let apiError: ApiError;
      if (err && typeof err === 'object' && 'code' in (err as ApiError)) {
        apiError = err as ApiError;
      } else if (err instanceof TypeError && (err.message.includes('fetch') || err.message.includes('Failed to fetch'))) {
        apiError = {
          code: 'NETWORK_ERROR',
          message: '无法连接到服务器',
          details: '请检查网络连接后重试',
        };
      } else {
        apiError = {
          code: 'REQUEST_ERROR',
          message: err instanceof Error ? err.message : '请求失败',
          details: err instanceof Error ? err.message : undefined,
        };
      }

      setError(apiError);
      options.onError?.(apiError);
      throw apiError;
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  }, []);

  const abort = useCallback(() => {
    abortController?.abort();
  }, [abortController]);

  return {
    loading,
    error,
    progress,
    processTextStream,
    abort,
    clearError: () => setError(null),
  };
}