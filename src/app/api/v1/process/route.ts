import { NextRequest, NextResponse } from 'next/server';
import { LLMClient } from '@/lib/llm-client';
import { createAuthMiddleware, extractAuthToken } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { ProcessRequest, ProcessResponse, ApiResponse } from '@/types/api';

// Vercel Serverless Function 配置
export const maxDuration = 60; // 60秒超时，足够多轮 LLM 处理
export const dynamic = 'force-dynamic';

// CORS 响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

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
        { status: 400, headers: corsHeaders }
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
        { status: 400, headers: corsHeaders }
      );
    }

    const rounds = body.options?.rounds || 3;
    const style = body.options?.style || 'casual';
    const model = body.options?.model;

    // 获取用户提供的 API Key，如果是 LLM Key (sk-xxx) 则使用它
    const userToken = extractAuthToken(request);
    const userLLMKey = userToken?.startsWith('sk-') ? userToken : undefined;

    // 创建 LLM 客户端（支持用户提供的 API Key 或使用环境变量配置）
    const llmClient = new LLMClient(userLLMKey ? {
      provider: 'openrouter',
      apiKey: userLLMKey,
    } : undefined);

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

    return NextResponse.json(response, {
      status: 200,
      headers: corsHeaders,
    });

  } catch (error) {
    console.error('Error processing text:', error);

    const errorMessage = error instanceof Error ? error.message : '未知错误';

    // 解析更具体的错误类型
    let code = 'INTERNAL_ERROR';
    let message = '处理失败';
    let status = 500;

    if (errorMessage.includes('API key is required')) {
      code = 'API_KEY_REQUIRED';
      message = '需要配置 API Key';
      status = 401;
    } else if (errorMessage.includes('401') || errorMessage.includes('Invalid Authentication')) {
      code = 'INVALID_API_KEY';
      message = 'API Key 无效，请检查您的 OpenRouter API Key 是否正确';
      status = 401;
    } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
      code = 'RATE_LIMIT';
      message = 'API 调用次数超限，请稍后再试';
      status = 429;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('LLM API timeout')) {
      code = 'TIMEOUT';
      message = '请求超时，请稍后重试';
      status = 504;
    } else if (errorMessage.includes('网络错误') || errorMessage.includes('fetch failed') || errorMessage.includes('fetch')) {
      code = 'NETWORK_ERROR';
      message = 'LLM 服务网络连接失败，请稍后重试';
      status = 503;
    } else if (errorMessage.includes('LLM API error')) {
      code = 'LLM_ERROR';
      message = 'LLM 服务调用失败';
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          message,
          details: errorMessage,
        },
        meta: {
          request_id: requestId,
          timestamp: new Date().toISOString(),
          api_version: 'v1',
        },
      } as ApiResponse,
      { status, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}