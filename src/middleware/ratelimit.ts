import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  requestsPerWindow: number;
  windowMs: number;
  keyGenerator?: (request: NextRequest) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = Object.assign({
      requestsPerWindow: 100,
      windowMs: 60000, // 1 minute
      keyGenerator: (req: NextRequest) => {
        // Use IP address as default key
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0] : 'unknown';
        return ip;
      }
    }, config);
  }

  async check(request: NextRequest): Promise<{ allowed: boolean; resetTime: number; limit: number; remaining: number }> {
    const key = this.config.keyGenerator!(request);
    const now = Date.now();
    
    // Clean up expired entries
    this.cleanup();
    
    if (!this.store[key]) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
    } else {
      if (this.store[key].resetTime <= now) {
        // Reset counter for new window
        this.store[key] = {
          count: 1,
          resetTime: now + this.config.windowMs,
        };
      } else {
        this.store[key].count++;
      }
    }

    const { count, resetTime } = this.store[key];
    const allowed = count <= this.config.requestsPerWindow;
    const remaining = Math.max(0, this.config.requestsPerWindow - count);

    return { allowed, resetTime, limit: this.config.requestsPerWindow, remaining };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const key in this.store) {
      if (this.store[key].resetTime <= now) {
        delete this.store[key];
      }
    }
  }
}

const defaultRateLimiter = new RateLimiter({
  requestsPerWindow: parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '100'),
  windowMs: 60000,
});

export function createRateLimitMiddleware(limiter = defaultRateLimiter) {
  return async (request: NextRequest) => {
    const result = await limiter.check(request);
    
    if (!result.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: '请求频率超过限制',
            details: `每分钟最多${result.limit}次请求`,
          },
          meta: {
            request_id: Math.random().toString(36).substring(2, 15),
            timestamp: new Date().toISOString(),
            api_version: 'v1',
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
          },
        }
      );
    }

    return null; // Allow request to continue
  };
}

export const rateLimitMiddleware = createRateLimitMiddleware();