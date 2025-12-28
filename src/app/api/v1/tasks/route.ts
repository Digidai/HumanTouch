import { NextRequest, NextResponse } from 'next/server';
import { publicTaskQueue, privateTaskQueue } from '@/lib/taskqueue';
import { resolveAccess } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { ApiResponse } from '@/types/api';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    // 解析访问模式（公开网页 or 鉴权 API）
    const { context, response: authResponse } = resolveAccess(request, ['process', 'status'], true);
    if (authResponse) return authResponse;
    const accessMode = context?.mode || 'public';

    const url = new URL(request.url);
    const statusParam = url.searchParams.get('status');
    const statusFilter = statusParam && ['pending', 'processing', 'completed', 'failed'].includes(statusParam) ? statusParam as 'pending' | 'processing' | 'completed' | 'failed' : null;
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const queue = accessMode === 'private' ? privateTaskQueue : publicTaskQueue;
    let tasks = queue.getAllTasks();

    // 应用状态过滤
    if (statusFilter && ['pending', 'processing', 'completed', 'failed'].includes(statusFilter)) {
      tasks = tasks.filter(task => task.status === statusFilter);
    }

    // 应用分页
    const total = tasks.length;
    const paginatedTasks = tasks.slice(offset, offset + limit);

    const response: ApiResponse = {
      success: true,
      data: {
        tasks: paginatedTasks.map(task => ({
          task_id: task.id,
          status: task.status,
          created_at: task.created_at,
          updated_at: task.updated_at,
          completed_at: task.completed_at,
          text_preview: task.text.substring(0, 100) + (task.text.length > 100 ? '...' : ''),
          text_length: task.text.length,
        })),
        pagination: {
          total,
          limit,
          offset,
          has_more: offset + limit < total,
        },
        stats: queue.getStats(),
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error getting tasks:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '获取任务列表失败',
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

export async function DELETE(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    // 解析访问模式（公开网页 or 鉴权 API）
    const { context, response: authResponse } = resolveAccess(request, ['process', 'status'], true);
    if (authResponse) return authResponse;
    const accessMode = context?.mode || 'public';

    const url = new URL(request.url);
    const olderThan = parseInt(url.searchParams.get('older_than') || '86400000'); // 默认24小时

    // 清理任务逻辑
    const queue = accessMode === 'private' ? privateTaskQueue : publicTaskQueue;
    queue.cleanup(olderThan);

    const stats = queue.getStats();

    const response: ApiResponse = {
      success: true,
      data: {
        message: '任务清理完成',
        stats,
        cleaned_older_than: olderThan,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error cleaning tasks:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '清理任务失败',
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
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Allow': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
