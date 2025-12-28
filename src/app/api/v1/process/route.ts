import { NextRequest, NextResponse } from 'next/server';
import { LLMClient } from '@/lib/llm-client';
import { createAuthMiddleware } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { ProcessRequest, ProcessResponse, ApiResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    // 应用认证中间件
    const authResult = await createAuthMiddleware(['process'])(request);
    if (authResult) return authResult;

    const body: ProcessRequest = await request.json();
    
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
    const model = body.options?.model;

    // 创建 LLM 客户端（支持动态选择模型）
    const llmClient = new LLMClient();

    // 处理文本
    const result = await llmClient.processText(text, {
      rounds,
      style,
      targetScore: body.options?.target_score,
      model,
    });
    
    // 获取真实检测分数
    const detectionScores = result.detectionScores;

    const processingTime = (Date.now() - startTime) / 1000;

    const response: ApiResponse<ProcessResponse> = {
      success: true,
      data: {
        processed_text: result.processedText,
        original_length: text.length,
        processed_length: result.processedText.length,
        detection_scores: detectionScores,
        processing_time: processingTime,
        rounds_used: rounds,
        model_used: result.model,
        provider: result.provider,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
        processing_time: processingTime,
      },
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error processing text:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '内部服务器错误',
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
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}