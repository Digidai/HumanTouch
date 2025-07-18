import { NextRequest, NextResponse } from 'next/server';
import { moonshotClient } from '@/lib/moonshot';
import { createAuthMiddleware } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { BatchRequest, BatchResponse, ApiResponse } from '@/types/api';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    // 应用认证中间件
    const authResult = await createAuthMiddleware(['process', 'batch'])(request);
    if (authResult) return authResult;

    const body: BatchRequest = await request.json();
    
    // 验证请求参数
    if (!body.texts || !Array.isArray(body.texts)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '文本数组不能为空',
            details: '请提供要处理的文本数组',
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

    const texts = body.texts;
    const maxTexts = 10; // 每批最多处理10个文本
    const maxLengthPerText = parseInt(process.env.MAX_TEXT_LENGTH || '10000');
    
    if (texts.length > maxTexts) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '批量处理数量超出限制',
            details: `单次最多处理${maxTexts}个文本，当前为${texts.length}个`,
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

    for (const text of texts) {
      if (text.length > maxLengthPerText) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_TEXT_LENGTH',
              message: '单个文本长度超过限制',
              details: `单个文本最大长度为${maxLengthPerText}字符`,
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
    }

    const rounds = body.options?.rounds || 2;
    const style = body.options?.style || 'casual';

    // 批量处理文本
    const results = await Promise.all(
      texts.map(async (text) => {
        const result = await moonshotClient.processText(text, {
          rounds,
          style,
        });
        
        return {
          original_text: text,
          processed_text: result.processedText,
          detection_scores: result.detectionScores,
        };
      })
    );

    const processingTime = (Date.now() - startTime) / 1000;

    const response: ApiResponse<BatchResponse> = {
      success: true,
      data: {
        results,
        total_processed: texts.length,
        total_time: processingTime,
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
    console.error('Error processing batch:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '批量处理失败',
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

// 支持GET请求查看批量处理状态
export async function GET() {
  const requestId = Math.random().toString(36).substring(2, 15);
  
  return NextResponse.json({
    success: true,
    data: {
      max_batch_size: 10,
      max_text_length: parseInt(process.env.MAX_TEXT_LENGTH || '10000'),
      supported_styles: ['academic', 'casual', 'professional', 'creative'],
      default_rounds: 2,
    },
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      api_version: 'v1',
    },
  } as ApiResponse, { status: 200 });
}