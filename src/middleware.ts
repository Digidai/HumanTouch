import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

/**
 * 获取 CORS 允许的 Origin
 * 支持环境变量 CORS_ALLOWED_ORIGINS 配置，逗号分隔
 */
function getCorsOrigin(requestOrigin?: string | null): string {
  const origins = process.env.CORS_ALLOWED_ORIGINS;

  // 如果未配置，开发环境默认允许所有，生产环境返回空
  if (!origins) {
    return process.env.NODE_ENV !== 'production' ? '*' : '';
  }

  const allowedOrigins = origins.split(',').map(o => o.trim()).filter(Boolean);

  if (allowedOrigins.includes('*')) {
    return '*';
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0] || '';
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle API routes with CORS
  if (pathname.startsWith('/api/')) {
    const requestOrigin = request.headers.get('origin');
    const allowedOrigin = getCorsOrigin(requestOrigin);

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    };

    if (allowedOrigin) {
      corsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
      if (allowedOrigin !== '*') {
        corsHeaders['Vary'] = 'Origin';
      }
    }

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    // Add CORS headers to response
    const response = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Handle i18n for non-API routes
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - API routes that don't need i18n
    // - Static files
    // - Internal Next.js paths
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
