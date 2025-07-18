import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/taskqueue';
import { createAuthMiddleware } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { AsyncTaskRequest, ApiResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    // 应用认证中间件
    const authResult = await createAuthMiddleware(['process', 'async'])(request);
    if (authResult) return authResult;

    const body: AsyncTaskRequest = await request.json();
    
    // 验证请求参数
    if (!body.text) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '文本内容不能为空',
            details: '请提供要处理的文本内容',
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

    const text = body.text;
    const maxLength = parseInt(process.env.MAX_TEXT_LENGTH || '10000');
    
    if (text.length > maxLength) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_TEXT_LENGTH',
            message: '文本长度超过限制',
            details: `最大长度为${maxLength}字符，当前长度为${text.length}字符`,
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

    const rounds = body.options?.rounds || 3;
    const style = body.options?.style || 'casual';
    const webhook_url = body.options?.notify_url;

    // 估算处理时间（基于文本长度和轮数）
    const estimatedTime = Math.max(1, Math.ceil(text.length / 1000) * rounds);

    // 添加任务到队列
    const taskId = taskQueue.addTask(text, { rounds, style }, webhook_url);

    const response: ApiResponse = {
      success: true,
      data: {
        task_id: taskId,
        status: 'pending',
        estimated_time: estimatedTime,
        webhook_url: webhook_url || null,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
      },
    };

    return NextResponse.json(response, { status: 202 });

  } catch (error) {
    console.error('Error creating async task:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '创建任务失败',
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

export async function GET() {
  const requestId = Math.random().toString(36).substring(2, 15);
  
  return NextResponse.json({
    success: true,
    data: {
      max_text_length: parseInt(process.env.MAX_TEXT_LENGTH || '10000'),
      supported_styles: ['academic', 'casual', 'professional', 'creative'],
      default_rounds: 3,
      max_concurrent_tasks: 3,
      webhook_support: true,
      polling_support: true,
    },
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      api_version: 'v1',
    },
  } as ApiResponse, { status: 200 });
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Allow': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}