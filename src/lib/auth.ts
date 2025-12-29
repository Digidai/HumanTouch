import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getCorsHeaders } from './cors';

export interface AuthUser {
  id: string;
  email: string;
  permissions: string[];
}

export interface ApiKey {
  key: string;
  userId: string;
  permissions: string[];
  createdAt: Date;
  lastUsed?: Date;
}

export class AuthManager {
  private static instance: AuthManager;
  private jwtSecret: string;
  private isDev: boolean;
  private apiKeySecret: string;
  private apiKeyPrefix: string;
  private apiKeyIssuer: string;
  private apiKeyAudience: string;

  constructor() {
    this.isDev = process.env.NODE_ENV !== 'production';
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      if (this.isDev) {
        // 开发环境生成随机密钥，每次重启不同，避免硬编码安全风险
        const devSecret = randomBytes(32).toString('hex');
        console.warn('[AuthManager] JWT_SECRET not set. Generated random dev secret (will change on restart).');
        this.jwtSecret = devSecret;
      } else {
        throw new Error('[AuthManager] JWT_SECRET must be set in production environment');
      }
    } else {
      // 验证密钥长度
      if (secret.length < 32) {
        console.warn('[AuthManager] JWT_SECRET is shorter than 32 characters. Consider using a stronger secret.');
      }
      this.jwtSecret = secret;
    }

    this.apiKeySecret = process.env.API_KEY_SECRET || this.jwtSecret;
    this.apiKeyPrefix = process.env.API_KEY_PREFIX || 'hk_';
    this.apiKeyIssuer = process.env.API_KEY_ISSUER || 'humantouch';
    this.apiKeyAudience = process.env.API_KEY_AUDIENCE || 'api_key';
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private generateApiKeyId(): string {
    return randomBytes(16).toString('hex');
  }

  generateApiKey(userId: string, permissions: string[] = ['process']): string {
    const token = jwt.sign(
      {
        sub: userId,
        permissions,
        typ: 'api_key',
      },
      this.apiKeySecret,
      {
        issuer: this.apiKeyIssuer,
        audience: this.apiKeyAudience,
        jwtid: this.generateApiKeyId(),
      }
    );
    return `${this.apiKeyPrefix}${token}`;
  }

  generateJwtToken(user: AuthUser): string {
    return jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        permissions: user.permissions 
      },
      this.jwtSecret,
      { expiresIn: '7d' }
    );
  }

  verifyJwtToken(token: string): AuthUser | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as AuthUser;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  validateApiKey(apiKey: string): { valid: boolean; userId?: string; permissions?: string[] } {
    if (!apiKey.startsWith(this.apiKeyPrefix)) {
      return { valid: false };
    }

    // 支持显式允许列表和签名 API Key
    const allowed = process.env.ALLOWED_API_KEYS;

    if (!allowed) {
      if (this.isDev) {
        console.warn('[AuthManager] ALLOWED_API_KEYS not configured. Falling back to signed API key validation in development.');
      }
    } else {
      const allowedKeys = allowed.split(',').map(k => k.trim()).filter(Boolean);
      if (allowedKeys.includes(apiKey)) {
        return {
          valid: true,
          userId: 'api-key-user',
          permissions: ['process', 'validate', 'batch', 'async', 'status'],
        };
      }
    }

    const token = apiKey.slice(this.apiKeyPrefix.length);
    try {
      const decoded = jwt.verify(token, this.apiKeySecret, {
        issuer: this.apiKeyIssuer,
        audience: this.apiKeyAudience,
      }) as JwtPayload | string;

      if (!decoded || typeof decoded === 'string') {
        return { valid: false };
      }

      const payload = decoded as JwtPayload & { permissions?: string[]; typ?: string };
      const permissions = Array.isArray(payload.permissions) ? payload.permissions : null;
      const userId = typeof payload.sub === 'string' ? payload.sub : undefined;
      if (!permissions || !userId || payload.typ !== 'api_key') {
        return { valid: false };
      }

      return {
        valid: true,
        userId,
        permissions,
      };
    } catch (error) {
      if (this.isDev) {
        console.warn('[AuthManager] Signed API key validation failed:', error);
      }
      return { valid: false };
    }
  }
}

export function extractAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

const corsHeaders = getCorsHeaders();

export type AccessMode = 'public' | 'private';

export interface AccessContext {
  mode: AccessMode;
  userId?: string;
  permissions?: string[];
}

export function resolveAccess(
  request: NextRequest,
  requiredPermissions: string[] = [],
  allowPublic: boolean = true
): { context?: AccessContext; response?: NextResponse } {
  const token = extractAuthToken(request);

  if (!token) {
    if (allowPublic) {
      return { context: { mode: 'public' } };
    }
    return {
      response: NextResponse.json(
        { error: { code: 'INVALID_API_KEY', message: 'API密钥缺失' } },
        { status: 401, headers: corsHeaders }
      ),
    };
  }

  const authManager = AuthManager.getInstance();

  const apiKeyValidation = authManager.validateApiKey(token);
  if (apiKeyValidation.valid) {
    const hasPermission = requiredPermissions.length === 0 ||
      requiredPermissions.some(perm => apiKeyValidation.permissions?.includes(perm));

    if (!hasPermission) {
      return {
        response: NextResponse.json(
          { error: { code: 'INSUFFICIENT_PERMISSIONS', message: '权限不足' } },
          { status: 403, headers: corsHeaders }
        ),
      };
    }

    return {
      context: {
        mode: 'private',
        userId: apiKeyValidation.userId,
        permissions: apiKeyValidation.permissions,
      },
    };
  }

  const user = authManager.verifyJwtToken(token);
  if (user) {
    const hasPermission = requiredPermissions.length === 0 ||
      requiredPermissions.some(perm => user.permissions.includes(perm));

    if (!hasPermission) {
      return {
        response: NextResponse.json(
          { error: { code: 'INSUFFICIENT_PERMISSIONS', message: '权限不足' } },
          { status: 403, headers: corsHeaders }
        ),
      };
    }

    return {
      context: {
        mode: 'private',
        userId: user.id,
        permissions: user.permissions,
      },
    };
  }

  return {
    response: NextResponse.json(
      { error: { code: 'INVALID_API_KEY', message: '无效的API密钥或令牌' } },
      { status: 401, headers: corsHeaders }
    ),
  };
}

export function createAuthMiddleware(requiredPermissions: string[] = []) {
  return async (request: NextRequest) => {
    const { response } = resolveAccess(request, requiredPermissions, false);
    return response ?? null;
  };
}

export const authManager = AuthManager.getInstance();
