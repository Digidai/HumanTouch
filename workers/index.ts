import { Env, authMiddleware, jsonResponse } from './lib/auth';
import { LLMClient } from './lib/llm-client';
import { DetectorClient } from './lib/detectors';

interface ProcessRequest {
  text: string;
  options?: {
    rounds?: number;
    style?: string;
    target_score?: number;
    model?: string;
  };
}

interface ValidateRequest {
  text: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Health check
    if (path === '/' || path === '/health') {
      return jsonResponse({
        status: 'ok',
        service: 'humantouch-api',
        runtime: 'cloudflare-workers',
        timestamp: new Date().toISOString(),
      });
    }

    // Route handling
    try {
      if (path === '/api/v1/process' && request.method === 'POST') {
        return await handleProcess(request, env);
      }

      if (path === '/api/v1/validate' && request.method === 'POST') {
        return await handleValidate(request, env);
      }

      return jsonResponse(
        { error: { code: 'NOT_FOUND', message: '接口不存在' } },
        404
      );
    } catch (error) {
      console.error('Unhandled error:', error);
      return jsonResponse(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: '内部服务器错误',
            details: error instanceof Error ? error.message : '未知错误',
          },
        },
        500
      );
    }
  },
};

async function handleProcess(request: Request, env: Env): Promise<Response> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // Auth check
  const authError = await authMiddleware(request, env, ['process']);
  if (authError) return authError;

  let body: ProcessRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: { code: 'INVALID_JSON', message: '无效的JSON格式' },
        meta: { request_id: requestId, timestamp: new Date().toISOString(), api_version: 'v1' },
      },
      400
    );
  }

  if (!body.text) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: '文本内容不能为空' },
        meta: { request_id: requestId, timestamp: new Date().toISOString(), api_version: 'v1' },
      },
      400
    );
  }

  const maxLength = parseInt(env.MAX_TEXT_LENGTH || '10000');
  if (body.text.length > maxLength) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'INVALID_TEXT_LENGTH',
          message: '文本长度超过限制',
          details: `最大长度为${maxLength}字符，当前长度为${body.text.length}字符`,
        },
        meta: { request_id: requestId, timestamp: new Date().toISOString(), api_version: 'v1' },
      },
      400
    );
  }

  try {
    const client = new LLMClient(env);
    const result = await client.processText(body.text, {
      rounds: body.options?.rounds || 3,
      style: body.options?.style || 'casual',
      targetScore: body.options?.target_score,
      model: body.options?.model,
    });

    const processingTime = (Date.now() - startTime) / 1000;

    return jsonResponse({
      success: true,
      data: {
        processed_text: result.processedText,
        original_length: body.text.length,
        processed_length: result.processedText.length,
        detection_scores: result.detectionScores,
        processing_time: processingTime,
        rounds_used: body.options?.rounds || 3,
        model_used: result.model,
        provider: result.provider,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
        processing_time: processingTime,
        runtime: 'cloudflare-workers',
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: '处理文本时出错',
          details: error instanceof Error ? error.message : '未知错误',
        },
        meta: { request_id: requestId, timestamp: new Date().toISOString(), api_version: 'v1' },
      },
      500
    );
  }
}

async function handleValidate(request: Request, env: Env): Promise<Response> {
  const requestId = crypto.randomUUID();

  const authError = await authMiddleware(request, env, ['validate']);
  if (authError) return authError;

  let body: ValidateRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: { code: 'INVALID_JSON', message: '无效的JSON格式' },
        meta: { request_id: requestId, timestamp: new Date().toISOString(), api_version: 'v1' },
      },
      400
    );
  }

  if (!body.text) {
    return jsonResponse(
      {
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: '文本内容不能为空' },
        meta: { request_id: requestId, timestamp: new Date().toISOString(), api_version: 'v1' },
      },
      400
    );
  }

  try {
    const detector = new DetectorClient(env);
    const scores = await detector.detectAll(body.text);

    const weights = { zerogpt: 0.4, gptzero: 0.35, copyleaks: 0.25 };
    const overallScore =
      scores.zerogpt * weights.zerogpt +
      scores.gptzero * weights.gptzero +
      scores.copyleaks * weights.copyleaks;

    return jsonResponse({
      success: true,
      data: {
        detection_scores: scores,
        overall_score: Math.round(overallScore * 100) / 100,
        human_likelihood: Math.round((1 - overallScore) * 100) / 100,
        text_length: body.text.length,
      },
      meta: {
        request_id: requestId,
        timestamp: new Date().toISOString(),
        api_version: 'v1',
        runtime: 'cloudflare-workers',
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        success: false,
        error: {
          code: 'DETECTION_ERROR',
          message: '检测文本时出错',
          details: error instanceof Error ? error.message : '未知错误',
        },
        meta: { request_id: requestId, timestamp: new Date().toISOString(), api_version: 'v1' },
      },
      500
    );
  }
}
