import { NextRequest, NextResponse } from 'next/server';
import { detectorClient } from '@/lib/detectors';
import { resolveAccess } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { ValidateRequest, ValidateResponse, ApiResponse } from '@/types/api';
import { generateRequestId } from '@/lib/env';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();

  try {
    // 应用限流中间件
    const rateLimitResult = await rateLimitMiddleware(request);
    if (rateLimitResult) return rateLimitResult;

    // 解析访问模式（公开网页 or 鉴权 API）
    const { response: authResponse } = resolveAccess(request, ['validate'], true);
    if (authResponse) return authResponse;

    const body: ValidateRequest = await request.json();

    // 验证请求参数
    if (!body.text) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '文本内容不能为空',
            details: '请提供要检测的文本内容',
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
    const maxLength = parseInt(process.env.MAX_TEXT_LENGTH || '30000');

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

    const allowedDetectors = ['zerogpt', 'gptzero', 'copyleaks'] as const;
    const detectors = (
      body.detectors && body.detectors.length > 0 ? body.detectors : allowedDetectors
    ).filter((detector) => allowedDetectors.includes(detector));

    if (detectors.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: '检测器列表无效',
            details: '请至少选择一个检测器',
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

    // 检测文本
    const detectionScores: { [key: string]: number } = {};

    if (detectors.includes('zerogpt')) {
      detectionScores.zerogpt = await detectorClient.detectWithZeroGPT(text);
    }

    if (detectors.includes('gptzero')) {
      detectionScores.gptzero = await detectorClient.detectWithGPTZero(text);
    }

    if (detectors.includes('copyleaks')) {
      detectionScores.copyleaks = await detectorClient.detectWithCopyleaks(text);
    }

    // 计算总体评分
    const summary = await detectorClient.getOverallScore(detectionScores);

    const processingTime = (Date.now() - startTime) / 1000;

    const response: ApiResponse<ValidateResponse> = {
      success: true,
      data: {
        text,
        detection_scores: detectionScores,
        summary,
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
    console.error('Error validating text:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '检测验证失败',
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
  const requestId = generateRequestId();

  return NextResponse.json(
    {
      success: true,
      data: {
        supported_detectors: ['zerogpt', 'gptzero', 'copyleaks'],
        max_text_length: parseInt(process.env.MAX_TEXT_LENGTH || '30000'),
        features: ['实时AI检测', '多检测器对比', '置信度评分', '详细分析报告'],
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
      },
    } as ApiResponse,
    { status: 200 }
  );
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        Allow: 'GET, POST, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}
