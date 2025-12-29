/**
 * 结构化日志系统
 * 支持 JSON 格式输出，便于日志聚合和分析
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  requestId?: string;
  duration?: number;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private context: string;
  private minLevel: LogLevel;
  private isJson: boolean;

  constructor(context: string = 'app') {
    this.context = context;
    this.minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.isJson = process.env.LOG_FORMAT === 'json' || process.env.NODE_ENV === 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatMessage(entry: LogEntry): string {
    if (this.isJson) {
      return JSON.stringify(entry);
    }

    // 人类可读格式
    const { timestamp, level, message, context, requestId, duration, ...rest } = entry;
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${context}]`;
    const reqId = requestId ? ` [req:${requestId}]` : '';
    const dur = duration !== undefined ? ` (${duration}ms)` : '';
    const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : '';

    return `${prefix}${reqId} ${message}${dur}${extra}`;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...meta,
    };

    const formatted = this.formatMessage(entry);

    switch (level) {
      case 'debug':
      case 'info':
        console.log(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log('error', message, meta);
  }

  // 创建子 logger
  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`);
  }

  // API 请求日志
  request(
    requestId: string,
    method: string,
    path: string,
    meta?: Record<string, unknown>
  ): void {
    this.info(`${method} ${path}`, { requestId, ...meta });
  }

  // API 响应日志
  response(
    requestId: string,
    status: number,
    duration: number,
    meta?: Record<string, unknown>
  ): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(level, `Response ${status}`, { requestId, duration, status, ...meta });
  }

  // LLM 调用日志
  llmCall(
    requestId: string,
    provider: string,
    model: string,
    success: boolean,
    duration: number,
    meta?: Record<string, unknown>
  ): void {
    const level = success ? 'info' : 'error';
    this.log(level, `LLM ${provider}/${model} ${success ? 'success' : 'failed'}`, {
      requestId,
      provider,
      model,
      success,
      duration,
      ...meta,
    });
  }
}

// 全局 logger 实例
export const logger = new Logger('humantouch');

// 便捷方法
export function createLogger(context: string): Logger {
  return new Logger(context);
}
