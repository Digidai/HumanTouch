import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { headers } from 'next/headers';

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

  constructor() {
    this.isDev = process.env.NODE_ENV !== 'production';
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      if (this.isDev) {
        console.warn('[AuthManager] JWT_SECRET is not set. Using insecure development fallback. DO NOT use this in production.');
        this.jwtSecret = 'dev-only-insecure-secret-change-this';
      } else {
        throw new Error('[AuthManager] JWT_SECRET must be set in production environment');
      }
    } else {
      this.jwtSecret = secret;
    }
  }

  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  generateApiKey(userId: string, permissions: string[] = ['process']): string {
    const prefix = process.env.API_KEY_PREFIX || 'hk_';
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `${prefix}${randomPart}${timestamp}`;
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
    const prefix = process.env.API_KEY_PREFIX || 'hk_';
    if (!apiKey.startsWith(prefix)) {
      return { valid: false };
    }

    // 生产环境必须使用显式允许列表，避免任何符合前缀的 key 都通过
    const allowed = process.env.ALLOWED_API_KEYS;

    if (!allowed) {
      if (this.isDev) {
        console.warn('[AuthManager] ALLOWED_API_KEYS not configured. Accepting any key with correct prefix in development.');
        return {
          valid: true,
          userId: 'dev-user',
          permissions: ['process', 'validate', 'batch', 'async', 'status'],
        };
      }

      return { valid: false };
    }

    const allowedKeys = allowed.split(',').map(k => k.trim()).filter(Boolean);
    if (!allowedKeys.includes(apiKey)) {
      return { valid: false };
    }

    return {
      valid: true,
      userId: 'api-key-user',
      permissions: ['process', 'validate', 'batch', 'async', 'status'],
    };
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

export function createAuthMiddleware(requiredPermissions: string[] = []) {
  return async (request: NextRequest) => {
    const token = extractAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: { code: 'INVALID_API_KEY', message: 'API密钥缺失' } },
        { status: 401 }
      );
    }

    const authManager = AuthManager.getInstance();
    
    // 先尝试作为API密钥验证
    const apiKeyValidation = authManager.validateApiKey(token);
    if (apiKeyValidation.valid) {
      // 检查权限
      const hasPermission = requiredPermissions.length === 0 || 
        requiredPermissions.some(perm => apiKeyValidation.permissions?.includes(perm));
      
      if (!hasPermission) {
        return NextResponse.json(
          { error: { code: 'INSUFFICIENT_PERMISSIONS', message: '权限不足' } },
          { status: 403 }
        );
      }

      return null; // 验证通过
    }

    // 尝试作为JWT令牌验证
    const user = authManager.verifyJwtToken(token);
    if (user) {
      const hasPermission = requiredPermissions.length === 0 || 
        requiredPermissions.some(perm => user.permissions.includes(perm));
      
      if (!hasPermission) {
        return NextResponse.json(
          { error: { code: 'INSUFFICIENT_PERMISSIONS', message: '权限不足' } },
          { status: 403 }
        );
      }

      return null; // 验证通过
    }

    return NextResponse.json(
      { error: { code: 'INVALID_API_KEY', message: '无效的API密钥或令牌' } },
      { status: 401 }
    );
  };
}

export const authManager = AuthManager.getInstance();