import { ProcessResponse } from '@/types/api';

export interface Task {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  text: string;
  options: {
    rounds?: number;
    style?: string;
    target_score?: number;
  };
  result?: ProcessResponse;
  error?: string;
  webhook_url?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number = 3;
  private cache: Map<string, { result: ProcessResponse; timestamp: number }> = new Map();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  addTask(text: string, options: Record<string, unknown> = {}, webhook_url?: string): string {
    const taskId = this.generateTaskId();
    const task: Task = {
      id: taskId,
      status: 'pending',
      text,
      options,
      webhook_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    this.tasks.set(taskId, task);
    this.processNext();
    return taskId;
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

  private generateCacheKey(text: string, options: unknown): string {
    const key = JSON.stringify({ text, options });
    return Buffer.from(key).toString('base64');
  }

  getCachedResult(text: string, options: any): ProcessResponse | null {
    const cacheKey = this.generateCacheKey(text, options);
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

  setCachedResult(text: string, options: any, result: ProcessResponse): void {
    const cacheKey = this.generateCacheKey(text, options);
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
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
    const cachedResult = this.getCachedResult(task.text, task.options);
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
      const { moonshotClient } = await import('./moonshot');
      
      const processingResult = await moonshotClient.processText(task.text, task.options);
      
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
      this.setCachedResult(task.text, task.options, result);
      
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

      await this.postWithRetry(task.webhook_url, body, headers);
    } catch (error) {
      console.error(`Failed to send webhook for task ${task.id}:`, error);
    }
  }

  private async postWithRetry(url: string, body: string, headers: Record<string, string>, retries = 2): Promise<void> {
    let attempt = 0;
    while (attempt <= retries) {
      try {
        await fetch(url, {
          method: 'POST',
          headers,
          body,
        });
        return;
      } catch (error) {
        attempt += 1;
        if (attempt > retries) {
          throw error;
        }
        const delay = 500 * attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
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
export const taskQueue = new TaskQueue();