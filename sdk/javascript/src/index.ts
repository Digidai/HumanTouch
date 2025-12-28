import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface HumanTouchConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  retries?: number;
}

export interface ProcessOptions {
  rounds?: number;
  style?: 'academic' | 'casual' | 'professional' | 'creative';
  target_score?: number;
  preserve_formatting?: boolean;
}

export interface AsyncOptions extends ProcessOptions {
  notify_url?: string;
}

export interface ProcessRequest {
  text: string;
  options?: ProcessOptions;
}

export interface ProcessResponse {
  processed_text: string;
  original_length: number;
  processed_length: number;
  detection_scores: {
    zerogpt: number;
    gptzero: number;
    copyleaks: number;
  };
  processing_time: number;
  rounds_used: number;
}

export interface BatchRequest {
  texts: string[];
  options?: ProcessOptions;
}

export interface BatchResponse {
  results: Array<{
    original_text: string;
    processed_text: string;
    detection_scores: {
      zerogpt: number;
      gptzero: number;
      copyleaks: number;
    };
  }>;
  total_processed: number;
  total_time: number;
}

export interface AsyncTaskResponse {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimated_time: number;
  webhook_url?: string;
}

export interface TaskStatusResponse {
  task_id: string;
  status: string;
  result?: ProcessResponse;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface ValidateRequest {
  text: string;
  detectors?: ('zerogpt' | 'gptzero' | 'copyleaks')[];
}

export interface ValidateResponse {
  text: string;
  detection_scores: {
    [key: string]: number;
  };
  summary: {
    overall_score: number;
    human_likelihood: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
  meta?: {
    request_id: string;
    timestamp: string;
    api_version: string;
  };
}

export class HumanTouchError extends Error {
  code: string;
  details?: string;

  constructor(message: string, code: string, details?: string) {
    super(message);
    this.name = 'HumanTouchError';
    this.code = code;
    this.details = details;
  }
}

export class HumanTouchClient {
  private client: AxiosInstance;
  private config: Required<HumanTouchConfig>;

  constructor(config: HumanTouchConfig = {}) {
    this.config = {
      apiKey: config.apiKey || '',
      baseURL: config.baseURL || 'https://api.humantouch.dev',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
    };

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'humantouch-sdk-js/1.0.0',
      },
    });

    this.client.interceptors.request.use((config) => {
      if (this.config.apiKey) {
        config.headers.Authorization = `Bearer ${this.config.apiKey}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.data?.error) {
          const { message, code, details } = error.response.data.error;
          throw new HumanTouchError(message, code, details);
        }
        throw error;
      }
    );
  }

  /**
   * 设置API密钥
   */
  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  /**
   * 同步处理文本
   */
  async process(text: string, options?: ProcessOptions): Promise<ProcessResponse> {
    const response = await this.client.post<ApiResponse<ProcessResponse>>('/api/v1/process', {
      text,
      options,
    });
    return response.data.data!;
  }

  /**
   * 批量处理文本
   */
  async batch(texts: string[], options?: ProcessOptions): Promise<BatchResponse> {
    const response = await this.client.post<ApiResponse<BatchResponse>>('/api/v1/batch', {
      texts,
      options,
    });
    return response.data.data!;
  }

  /**
   * 创建异步任务
   */
  async createAsyncTask(text: string, options?: AsyncOptions): Promise<AsyncTaskResponse> {
    const response = await this.client.post<ApiResponse<AsyncTaskResponse>>('/api/v1/async', {
      text,
      options,
    });
    return response.data.data!;
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    const response = await this.client.get<ApiResponse<TaskStatusResponse>>(`/api/v1/status/${taskId}`);
    return response.data.data!;
  }

  /**
   * 获取任务列表
   */
  async getTasks(options?: {
    status?: 'pending' | 'processing' | 'completed' | 'failed';
    limit?: number;
    offset?: number;
  }): Promise<TaskListResponse> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const response = await this.client.get<ApiResponse<TaskListResponse>>(`/api/v1/tasks?${params}`);
    return response.data.data!;
  }

  /**
   * 验证文本AI检测分数
   */
  async validate(text: string, detectors?: ('zerogpt' | 'gptzero' | 'copyleaks')[]): Promise<ValidateResponse> {
    const response = await this.client.post<ApiResponse<ValidateResponse>>('/api/v1/validate', {
      text,
      detectors,
    });
    return response.data.data!;
  }

  /**
   * 轮询任务直到完成
   */
  async waitForTask(taskId: string, options?: {
    interval?: number;
    timeout?: number;
  }): Promise<TaskStatusResponse> {
    const { interval = 2000, timeout = 300000 } = options || {};
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.status === 'completed') {
        return status;
      }
      
      if (status.status === 'failed') {
        throw new HumanTouchError(status.error || '任务处理失败', 'TASK_FAILED');
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new HumanTouchError('任务处理超时', 'TASK_TIMEOUT');
  }
}

// 默认导出实例
export default HumanTouchClient;

// 类型别名便于使用
export const HumanTouch = HumanTouchClient;