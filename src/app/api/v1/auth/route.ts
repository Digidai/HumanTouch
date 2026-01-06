import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { authManager } from '@/lib/auth';
import { ApiResponse } from '@/types/api';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { generateRequestId } from '@/lib/env';

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

const generateUserId = () => randomBytes(12).toString('hex');

// 用户注册
export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { email, password, name } = body as RegisterRequest;

    // 验证输入
    if (!email || !password || !name) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '缺少必要参数',
            details: '需要提供email、password和name',
          },
          meta: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            api_version: 'v1',
          },
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '邮箱格式无效',
          },
          meta: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            api_version: 'v1',
          },
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 验证密码强度
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '密码强度不足',
            details: '密码至少需要6个字符',
          },
          meta: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            api_version: 'v1',
          },
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 模拟用户创建逻辑
    const userId = generateUserId();
    const token = authManager.generateJwtToken({
      id: userId,
      email,
      permissions: ['process', 'validate', 'batch'],
    });

    const apiKey = authManager.generateApiKey(userId, ['process', 'validate', 'batch']);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: userId,
            email,
            name,
          },
          token,
          api_key: apiKey,
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          api_version: 'v1',
        },
      } as ApiResponse,
      { status: 201 }
    );
  } catch (error) {
    console.error('Error registering user:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '注册失败',
          details: error instanceof Error ? error.message : '未知错误',
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          api_version: 'v1',
        },
      } as ApiResponse,
      { status: 500 }
    );
  }
}

// 用户登录
export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const { email, password } = body as LoginRequest;

    // 验证输入
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '缺少必要参数',
            details: '需要提供email和password',
          },
          meta: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            api_version: 'v1',
          },
        } as ApiResponse,
        { status: 400 }
      );
    }

    // 模拟用户验证逻辑
    // 实际项目中应该查询数据库验证密码
    const userId = `demo-user-${generateUserId().slice(0, 8)}`;
    const token = authManager.generateJwtToken({
      id: userId,
      email,
      permissions: ['process', 'validate', 'batch'],
    });

    const apiKey = authManager.generateApiKey(userId, ['process', 'validate', 'batch']);

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: userId,
            email,
          },
          token,
          api_key: apiKey,
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          api_version: 'v1',
        },
      } as ApiResponse,
      { status: 200 }
    );
  } catch (error) {
    console.error('Error logging in user:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '登录失败',
          details: error instanceof Error ? error.message : '未知错误',
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          api_version: 'v1',
        },
      } as ApiResponse,
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        Allow: 'POST, PATCH, OPTIONS',
        'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}
