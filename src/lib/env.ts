/**
 * 环境变量验证和配置
 */

interface EnvConfig {
  // 必需的环境变量（生产环境）
  JWT_SECRET?: string;

  // 可选的环境变量
  OPENROUTER_API_KEY?: string;
  ALLOWED_API_KEYS?: string;
  CORS_ALLOWED_ORIGINS?: string;
  RATE_LIMIT_REQUESTS_PER_MINUTE?: string;
  MAX_TEXT_LENGTH?: string;
  WEBHOOK_SECRET?: string;
  API_KEY_SECRET?: string;
  API_KEY_PREFIX?: string;
  API_KEY_ISSUER?: string;
  API_KEY_AUDIENCE?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnv(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProd = process.env.NODE_ENV === 'production';

  // 生产环境必需的变量
  if (isProd) {
    if (!process.env.JWT_SECRET) {
      errors.push('JWT_SECRET is required in production');
    } else if (process.env.JWT_SECRET.length < 32) {
      warnings.push('JWT_SECRET should be at least 32 characters for security');
    }

    if (!process.env.CORS_ALLOWED_ORIGINS) {
      warnings.push('CORS_ALLOWED_ORIGINS not set, CORS will be disabled in production');
    }
  }

  // 开发环境警告
  if (!isProd) {
    if (!process.env.JWT_SECRET) {
      warnings.push(
        'JWT_SECRET not set, using random secret (tokens will not persist across restarts)'
      );
    }
  }

  // API Key 配置警告
  if (!process.env.OPENROUTER_API_KEY && !process.env.ALLOWED_API_KEYS) {
    warnings.push(
      'Neither OPENROUTER_API_KEY nor ALLOWED_API_KEYS configured. Public mode will require users to provide their own API keys.'
    );
  }

  // 数值类型验证
  const rateLimit = process.env.RATE_LIMIT_REQUESTS_PER_MINUTE;
  if (rateLimit && (isNaN(parseInt(rateLimit)) || parseInt(rateLimit) <= 0)) {
    errors.push('RATE_LIMIT_REQUESTS_PER_MINUTE must be a positive number');
  }

  const maxTextLength = process.env.MAX_TEXT_LENGTH;
  if (maxTextLength && (isNaN(parseInt(maxTextLength)) || parseInt(maxTextLength) <= 0)) {
    errors.push('MAX_TEXT_LENGTH must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export function getEnvConfig(): EnvConfig {
  return {
    JWT_SECRET: process.env.JWT_SECRET,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    ALLOWED_API_KEYS: process.env.ALLOWED_API_KEYS,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
    RATE_LIMIT_REQUESTS_PER_MINUTE: process.env.RATE_LIMIT_REQUESTS_PER_MINUTE,
    MAX_TEXT_LENGTH: process.env.MAX_TEXT_LENGTH,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    API_KEY_SECRET: process.env.API_KEY_SECRET,
    API_KEY_PREFIX: process.env.API_KEY_PREFIX,
    API_KEY_ISSUER: process.env.API_KEY_ISSUER,
    API_KEY_AUDIENCE: process.env.API_KEY_AUDIENCE,
  };
}

// 启动时验证环境变量
export function checkEnvOnStartup(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    console.warn('[ENV] Warnings:');
    result.warnings.forEach((w) => console.warn(`  - ${w}`));
  }

  if (!result.valid) {
    console.error('[ENV] Errors:');
    result.errors.forEach((e) => console.error(`  - ${e}`));

    if (process.env.NODE_ENV === 'production') {
      throw new Error('[ENV] Environment validation failed. Please check your configuration.');
    }
  }
}

// 获取配置值的辅助函数
export function getNumericEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * 生成安全的唯一请求 ID
 * 使用 crypto.randomUUID() 替代不安全的 Math.random()
 */
export function generateRequestId(): string {
  // 在 Node.js 和现代浏览器中使用 crypto.randomUUID
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // 降级方案：使用 crypto.getRandomValues (浏览器兼容)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // 最终降级：时间戳 + 随机数（仅用于极端情况）
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * 生成安全的任务 ID
 * 带有 task_ 前缀的唯一标识符
 */
export function generateTaskId(): string {
  return `task_${generateRequestId()}`;
}

/**
 * 生成安全的批处理项目 ID
 * 带有时间戳前缀的唯一标识符
 */
export function generateBatchItemId(): string {
  return `${Date.now()}-${generateRequestId().substring(0, 8)}`;
}
