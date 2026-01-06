/**
 * CORS 配置工具
 * 支持通过环境变量配置允许的域名
 */

// 从环境变量读取允许的域名，支持逗号分隔的多个域名
function getAllowedOrigins(): string[] {
  const origins = process.env.CORS_ALLOWED_ORIGINS;
  if (!origins) {
    // 开发环境默认允许所有域名
    if (process.env.NODE_ENV !== 'production') {
      return ['*'];
    }
    // 生产环境未配置时，只允许同源请求
    return [];
  }
  return origins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function getCorsOrigin(requestOrigin?: string | null): string {
  const allowedOrigins = getAllowedOrigins();

  // 如果配置了 '*'，允许所有域名
  if (allowedOrigins.includes('*')) {
    return '*';
  }

  // 如果没有配置任何允许的域名，返回空字符串（不设置 CORS 头）
  if (allowedOrigins.length === 0) {
    return '';
  }

  // 检查请求的 Origin 是否在允许列表中
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  // 默认返回第一个允许的域名
  return allowedOrigins[0];
}

/**
 * 安全相关的 HTTP 响应头
 * 防止常见的 Web 安全漏洞
 */
export const securityHeaders: Record<string, string> = {
  // 防止 MIME 类型嗅探攻击
  'X-Content-Type-Options': 'nosniff',
  // 防止点击劫持
  'X-Frame-Options': 'DENY',
  // 启用浏览器的 XSS 过滤器
  'X-XSS-Protection': '1; mode=block',
  // 控制 Referrer 信息的发送
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // 限制页面可以加载的资源来源
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://openrouter.ai https://*.openrouter.ai",
  // 限制浏览器功能的使用
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * 生产环境额外的安全头
 */
export const productionSecurityHeaders: Record<string, string> = {
  // 强制 HTTPS（仅在生产环境启用）
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const origin = getCorsOrigin(requestOrigin);
  const isProd = process.env.NODE_ENV === 'production';

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    // 添加安全头
    ...securityHeaders,
    // 生产环境添加额外安全头
    ...(isProd ? productionSecurityHeaders : {}),
  };

  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    // 如果不是通配符，添加 Vary 头
    if (origin !== '*') {
      headers['Vary'] = 'Origin';
    }
  }

  return headers;
}

// 便捷常量，用于简单场景
export const corsHeaders = getCorsHeaders();
