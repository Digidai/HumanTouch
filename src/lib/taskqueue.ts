import { isIP } from 'net';
import { ProcessResponse } from '@/types/api';

export interface Task {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  text: string;
  options: {
    rounds?: number;
    style?: string;
    target_score?: number;
    model?: string;
  };
  llmApiKey?: string;
  result?: ProcessResponse;
  error?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

const WEBHOOK_TIMEOUT_MS = 10000;
const WEBHOOK_MAX_REDIRECTS = 3;

export function validateWebhookUrl(rawUrl: string): { valid: boolean; normalized?: string; reason?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, reason: 'Webhook URL 不能为空' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, reason: 'Webhook URL 格式无效' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: 'Webhook URL 仅支持 http/https' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, reason: 'Webhook URL 不允许包含用户名或密码' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (isPrivateHostname(hostname)) {
    return { valid: false, reason: 'Webhook URL 不允许指向本地或内网地址' };
  }

  return { valid: true, normalized: parsed.toString() };
}

function isPrivateHostname(hostname: string): boolean {
  if (!hostname) return true;
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true;

  const ipType = isIP(hostname);
  if (ipType === 4) return isPrivateIpv4(hostname);
  if (ipType === 6) return isPrivateIpv6(hostname);
  return false;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(part => Number.isNaN(part))) return true;
  const [a, b] = parts;

  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;

  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
  if (normalized.startsWith('fe80')) return true;
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.replace('::ffff:', '');
    return isPrivateIpv4(mapped);
  }
  return false;
}

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private cache: Map<string, { result: ProcessResponse; timestamp: number }> = new Map();
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30分钟缓存
  private static readonly MAX_TASKS = 1000; // 最大任务数
  private static readonly MAX_CACHE = 500; // 最大缓存数
  private static readonly CLEANUP_INTERVAL = 10 * 60 * 1000; // 10分钟清理一次
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // 启动定时清理
    this.startAutoCleanup();
  }

  private startAutoCleanup(): void {
    if (this.cleanupTimer) return;
    this.cleanupTimer = setInterval(() => {
      this.cleanup(60 * 60 * 1000); // 清理1小时前的任务
    }, TaskQueue.CLEANUP_INTERVAL);
    // 允许进程退出
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  addTask(
    text: string,
    options: Task['options'] = {},
    webhook_url?: string,
    llmApiKey?: string
  ): string {
    // 容量检查：超过限制时清理旧任务
    if (this.tasks.size >= TaskQueue.MAX_TASKS) {
      this.cleanup(30 * 60 * 1000); // 清理30分钟前的已完成任务
      // 如果仍然超限，强制清理最旧的已完成任务
      if (this.tasks.size >= TaskQueue.MAX_TASKS) {
        this.forceCleanupOldest(Math.floor(TaskQueue.MAX_TASKS * 0.2));
      }
    }

    const taskId = this.generateTaskId();
    const task: Task = {
      id: taskId,
      status: 'pending',
      text,
      options,
      llmApiKey,
      webhook_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.tasks.set(taskId, task);
    this.processNext();
    return taskId;
  }

  private forceCleanupOldest(count: number): void {
    const completedTasks = Array.from(this.tasks.entries())
      .filter(([, task]) => task.status === 'completed' || task.status === 'failed')
      .sort((a, b) => new Date(a[1].created_at).getTime() - new Date(b[1].created_at).getTime());

    for (let i = 0; i < Math.min(count, completedTasks.length); i++) {
      this.tasks.delete(completedTasks[i][0]);
    }
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private generateCacheKey(text: string, options: unknown, llmApiKey?: string): string {
    const key = JSON.stringify({ text, options, llmApiKey });
    return Buffer.from(key).toString('base64');
  }

  getCachedResult(text: string, options: Task['options'], llmApiKey?: string): ProcessResponse | null {
    const cacheKey = this.generateCacheKey(text, options, llmApiKey);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < TaskQueue.CACHE_TTL) {
      return cached.result;
    }
    
    // 清理过期缓存
    if (cached && Date.now() - cached.timestamp >= TaskQueue.CACHE_TTL) {
      this.cache.delete(cacheKey);
    }
    
    return null;
  }

  setCachedResult(text: string, options: Task['options'], result: ProcessResponse, llmApiKey?: string): void {
    // 缓存容量检查
    if (this.cache.size >= TaskQueue.MAX_CACHE) {
      this.cleanupOldestCache(Math.floor(TaskQueue.MAX_CACHE * 0.2));
    }

    const cacheKey = this.generateCacheKey(text, options, llmApiKey);
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
  }

  private cleanupOldestCache(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private async processNext(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) {
      return;
    }

    const pendingTasks = Array.from(this.tasks.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (pendingTasks.length === 0) {
      return;
    }

    const task = pendingTasks[0];
    this.processTask(task.id);
  }

  private async processTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return;
    }

    // 检查缓存
    const cachedResult = this.getCachedResult(task.text, task.options, task.llmApiKey);
    if (cachedResult) {
      task.status = 'completed';
      task.result = cachedResult;
      task.completed_at = new Date().toISOString();
      task.updated_at = new Date().toISOString();

      // 发送webhook通知
      if (task.webhook_url) {
        await this.sendWebhook(task);
      }
      return;
    }

    this.processing.add(taskId);
    task.status = 'processing';
    task.started_at = new Date().toISOString();
    task.updated_at = new Date().toISOString();

    try {
      let llmClient;
      if (task.llmApiKey) {
        const { LLMClient } = await import('./llm-client');
        llmClient = new LLMClient({
          provider: 'openrouter',
          apiKey: task.llmApiKey,
        });
      } else {
        const { getLLMClient } = await import('./llm-client');
        llmClient = getLLMClient();
      }

      const processingResult = await llmClient.processText(task.text, {
        rounds: task.options.rounds,
        style: task.options.style,
        targetScore: task.options.target_score,
        model: task.options.model,
      });
      
      // 转换为ProcessResponse格式
      const result: ProcessResponse = {
        processed_text: processingResult.processedText,
        original_length: task.text.length,
        processed_length: processingResult.processedText.length,
        detection_scores: processingResult.detectionScores,
        processing_time: 0, // 这里可以计算实际处理时间
        rounds_used: task.options.rounds || 3
      };
      
      // 缓存结果
      this.setCachedResult(task.text, task.options, result, task.llmApiKey);
      
      task.status = 'completed';
      task.result = result;
      task.completed_at = new Date().toISOString();
      task.updated_at = new Date().toISOString();

      // 发送webhook通知
      if (task.webhook_url) {
        await this.sendWebhook(task);
      }
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : '未知错误';
      task.completed_at = new Date().toISOString();
      task.updated_at = new Date().toISOString();

      // 发送失败的webhook通知
      if (task.webhook_url) {
        await this.sendWebhook(task);
      }
    } finally {
      this.processing.delete(taskId);
      this.processNext();
    }
  }

  private async sendWebhook(task: Task): Promise<void> {
    if (!task.webhook_url) return;

    try {
      const validation = validateWebhookUrl(task.webhook_url);
      if (!validation.valid || !validation.normalized) {
        console.warn(`[TaskQueue] Invalid webhook URL for task ${task.id}: ${validation.reason || 'unknown reason'}`);
        return;
      }

      const secret = process.env.WEBHOOK_SECRET || process.env.JWT_SECRET;
      const payload = {
        task_id: task.id,
        status: task.status,
        result: task.result,
        error: task.error,
        timestamp: new Date().toISOString(),
      };

      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (secret) {
        const crypto = await import('crypto');
        const signature = crypto
          .createHmac('sha256', secret)
          .update(body)
          .digest('hex');
        headers['X-Humantouch-Signature'] = signature;
      }

      await this.postWithRetry(validation.normalized, body, headers);
    } catch (error) {
      console.error(`Failed to send webhook for task ${task.id}:`, error);
    }
  }

  private async postWithRetry(url: string, body: string, headers: Record<string, string>, retries = 2): Promise<void> {
    let attempt = 0;
    let lastError: Error | null = null;
    while (attempt <= retries) {
      try {
        const response = await this.postOnce(url, body, headers);

        if (!response.ok) {
          const error = new Error(`Webhook HTTP error: ${response.status}`);
          (error as { retryable?: boolean }).retryable = response.status >= 500 || response.status === 429;
          throw error;
        }

        return;
      } catch (error) {
        lastError = error as Error;
        const retryable = this.isRetryableWebhookError(error);
        if (!retryable || attempt === retries) {
          throw lastError;
        }
        attempt += 1;
        const delay = 500 * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  private async postOnce(url: string, body: string, headers: Record<string, string>): Promise<Response> {
    let currentUrl = url;

    for (let redirectCount = 0; redirectCount <= WEBHOOK_MAX_REDIRECTS; redirectCount++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
      let response: Response;

      try {
        response = await fetch(currentUrl, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
          redirect: 'manual',
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          return response;
        }

        const nextUrl = new URL(location, currentUrl).toString();
        const validation = validateWebhookUrl(nextUrl);
        if (!validation.valid || !validation.normalized) {
          const error = new Error(`Invalid webhook redirect URL: ${validation.reason || 'unknown reason'}`);
          (error as { retryable?: boolean }).retryable = false;
          throw error;
        }

        currentUrl = validation.normalized;
        continue;
      }

      return response;
    }

    const error = new Error('Webhook redirect limit exceeded');
    (error as { retryable?: boolean }).retryable = false;
    throw error;
  }

  private isRetryableWebhookError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'retryable' in error) {
      return Boolean((error as { retryable?: boolean }).retryable);
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        error.name === 'AbortError' ||
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('fetch failed') ||
        message.includes('econnreset') ||
        message.includes('socket hang up')
      );
    }

    return false;
  }

  getStats() {
    const tasks = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      ...this.getCacheStats(),
    };
  }

  cleanup(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    for (const [id, task] of this.tasks) {
      if (new Date(task.created_at).getTime() < cutoff && 
          (task.status === 'completed' || task.status === 'failed')) {
        this.tasks.delete(id);
      }
    }

    // 清理过期缓存
    const cacheCutoff = Date.now() - TaskQueue.CACHE_TTL;
    for (const [key, cached] of this.cache) {
      if (cached.timestamp < cacheCutoff) {
        this.cache.delete(key);
      }
    }
  }

  getCacheStats() {
    return {
      cache_size: this.cache.size,
      cache_ttl: TaskQueue.CACHE_TTL,
    };
  }
}

// 全局任务队列实例
export const publicTaskQueue = new TaskQueue();
export const privateTaskQueue = new TaskQueue();
export const taskQueue = publicTaskQueue;
