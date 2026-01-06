/**
 * 输入验证工具
 */

import { getNumericEnv } from './env';

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: ValidationError[];
}

// 文本处理请求验证
export interface ProcessTextInput {
  text: string;
  options?: {
    rounds?: number;
    style?: string;
    target_score?: number;
    model?: string;
  };
  api_key?: string;
}

export function validateProcessTextInput(input: unknown): ValidationResult<ProcessTextInput> {
  const errors: ValidationError[] = [];

  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      errors: [{ field: 'body', code: 'INVALID_BODY', message: '请求体必须是有效的 JSON 对象' }],
    };
  }

  const data = input as Record<string, unknown>;

  // 验证 text
  if (!data.text) {
    errors.push({ field: 'text', code: 'REQUIRED', message: '文本内容不能为空' });
  } else if (typeof data.text !== 'string') {
    errors.push({ field: 'text', code: 'INVALID_TYPE', message: '文本必须是字符串' });
  } else {
    const maxLength = getNumericEnv('MAX_TEXT_LENGTH', 30000);
    if (data.text.length > maxLength) {
      errors.push({
        field: 'text',
        code: 'TOO_LONG',
        message: `文本长度超过限制，最大 ${maxLength} 字符`,
      });
    }
    if (data.text.trim().length === 0) {
      errors.push({ field: 'text', code: 'EMPTY', message: '文本内容不能为空白' });
    }
  }

  // 验证 options
  if (data.options !== undefined) {
    if (typeof data.options !== 'object' || data.options === null) {
      errors.push({ field: 'options', code: 'INVALID_TYPE', message: 'options 必须是对象' });
    } else {
      const options = data.options as Record<string, unknown>;

      // 验证 rounds
      if (options.rounds !== undefined) {
        if (typeof options.rounds !== 'number' || !Number.isInteger(options.rounds)) {
          errors.push({
            field: 'options.rounds',
            code: 'INVALID_TYPE',
            message: 'rounds 必须是整数',
          });
        } else if (options.rounds < 1 || options.rounds > 10) {
          errors.push({
            field: 'options.rounds',
            code: 'OUT_OF_RANGE',
            message: 'rounds 必须在 1-10 之间',
          });
        }
      }

      // 验证 style
      if (options.style !== undefined) {
        const validStyles = ['casual', 'academic', 'professional', 'creative'];
        if (typeof options.style !== 'string') {
          errors.push({
            field: 'options.style',
            code: 'INVALID_TYPE',
            message: 'style 必须是字符串',
          });
        } else if (!validStyles.includes(options.style)) {
          errors.push({
            field: 'options.style',
            code: 'INVALID_VALUE',
            message: `style 必须是以下之一: ${validStyles.join(', ')}`,
          });
        }
      }

      // 验证 target_score
      if (options.target_score !== undefined) {
        if (typeof options.target_score !== 'number') {
          errors.push({
            field: 'options.target_score',
            code: 'INVALID_TYPE',
            message: 'target_score 必须是数字',
          });
        } else if (options.target_score < 0 || options.target_score > 1) {
          errors.push({
            field: 'options.target_score',
            code: 'OUT_OF_RANGE',
            message: 'target_score 必须在 0-1 之间',
          });
        }
      }

      // 验证 model
      if (options.model !== undefined && typeof options.model !== 'string') {
        errors.push({
          field: 'options.model',
          code: 'INVALID_TYPE',
          message: 'model 必须是字符串',
        });
      }
    }
  }

  // 验证 api_key
  if (data.api_key !== undefined && typeof data.api_key !== 'string') {
    errors.push({ field: 'api_key', code: 'INVALID_TYPE', message: 'api_key 必须是字符串' });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      text: data.text as string,
      options: data.options as ProcessTextInput['options'],
      api_key: data.api_key as string | undefined,
    },
    errors: [],
  };
}

// 通用字符串清理
export function sanitizeString(str: string): string {
  // 移除潜在的控制字符，保留换行和制表符
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// URL 验证
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Email 验证
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
