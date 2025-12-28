export interface ApiResponse<T = unknown> {
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
    processing_time?: number;
  };
}

export interface ProcessRequest {
  text: string;
  options?: {
    rounds?: number;
    style?: 'academic' | 'casual' | 'professional' | 'creative';
    target_score?: number;
    preserve_formatting?: boolean;
    model?: string; // 自定义模型，如 "openai/gpt-4o" 或 "anthropic/claude-sonnet-4"
  };
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
  model_used?: string;  // 实际使用的模型
  provider?: string;    // 提供商: moonshot, openrouter, custom
}

export interface BatchRequest {
  texts: string[];
  options?: {
    rounds?: number;
    style?: 'academic' | 'casual' | 'professional' | 'creative';
    target_score?: number;
  };
  filenames?: string[];
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

export interface AsyncTaskRequest {
  text: string;
  options?: {
    rounds?: number;
    style?: string;
    notify_url?: string;
  };
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
}

export interface TaskListItem {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  completed_at?: string;
  text_preview: string;
  text_length: number;
  result?: ProcessResponse;
}

export interface TaskListResponse {
  tasks: TaskListItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    cache_size: number;
    cache_ttl: number;
  };
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