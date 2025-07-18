import { NextRequest, NextResponse } from 'next/server';
import { taskQueue } from '@/lib/taskqueue';
import { createAuthMiddleware } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { ApiResponse } from '@/types/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    // 应用认证中间件
    const authResult = await createAuthMiddleware(['process', 'status'])(request);
    if (authResult) return authResult;

    const { taskId } = await params;

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '任务ID不能为空',
            details: '请提供有效的任务ID',
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

    const task = taskQueue.getTask(taskId);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: '任务未找到',
            details: '指定的任务ID不存在或已过期',
          },
          meta: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            api_version: 'v1',
          },
        } as ApiResponse,
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: {
        task_id: task.id,
        status: task.status,
        result: task.result,
        error: task.error,
        created_at: task.created_at,
        updated_at: task.updated_at,
        started_at: task.started_at,
        completed_at: task.completed_at,
        progress: task.status === 'processing' ? calculateProgress(task) : null,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error getting task status:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取任务状态失败',
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    // 应用认证中间件
    const authResult = await createAuthMiddleware(['process', 'status'])(request);
    if (authResult) return authResult;

    if (!taskId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '任务ID不能为空',
            details: '请提供有效的任务ID',
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

    // 这里可以添加任务取消逻辑
    // 目前仅返回任务状态
    const task = taskQueue.getTask(taskId);

    if (!task) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TASK_NOT_FOUND',
            message: '任务未找到',
            details: '指定的任务ID不存在或已过期',
          },
          meta: {
            request_id: requestId,
            timestamp: new Date().toISOString(),
            api_version: 'v1',
          },
        } as ApiResponse,
        { status: 404 }
      );
    }

    const response: ApiResponse = {
      success: true,
      data: {
        task_id: task.id,
        status: task.status,
        message: '任务状态已返回，取消功能待实现',
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error deleting task:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '操作任务失败',
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

function calculateProgress(task: { started_at?: string; text?: string; options?: { rounds?: number } }): number {
  // 简单的进度计算，可以根据实际需求优化
  if (!task.started_at) return 0;
  
  const startTime = new Date(task.started_at).getTime();
  const now = Date.now();
  const estimatedDuration = Math.max(30, Math.ceil((task.text || '').length / 1000) * (task.options?.rounds || 3));
  
  const progress = Math.min(95, ((now - startTime) / 1000 / estimatedDuration) * 100);
  return Math.round(progress);
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Allow': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}