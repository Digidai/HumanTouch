import { NextRequest } from 'next/server';
import { LLMClient, ProgressInfo } from '@/lib/llm-client';
import { resolveAccess } from '@/lib/auth';
import { rateLimitMiddleware } from '@/middleware/ratelimit';
import { ProcessRequest, ProcessResponse } from '@/types/api';
import { corsHeaders } from '@/lib/cors';
import { generateRequestId } from '@/lib/env';

// Vercel Serverless Function 配置
export const maxDuration = 300; // 5分钟超时
export const dynamic = 'force-dynamic';

// SSE 事件类型
interface SSEEvent {
  type: 'progress' | 'result' | 'error';
  data: ProgressInfo | ProcessResponse | { code: string; message: string; details?: string };
}

function formatSSE(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();

  // 创建 SSE 响应流
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      streamController = controller;
    },
    cancel() {
      streamController = null;
    },
  });

  // 发送 SSE 事件
  const sendEvent = (event: SSEEvent) => {
    if (streamController) {
      try {
        streamController.enqueue(encoder.encode(formatSSE(event)));
      } catch {
        // Stream closed
      }
    }
  };

  const closeStream = () => {
    if (streamController) {
      try {
        streamController.close();
      } catch {
        // Already closed
      }
    }
  };

  // 异步处理逻辑 - 使用 Promise catch 确保错误被记录
  const processAsync = async () => {
    try {
      // 应用限流中间件
      const rateLimitResult = await rateLimitMiddleware(request);
      if (rateLimitResult) {
        sendEvent({
          type: 'error',
          data: { code: 'RATE_LIMIT', message: '请求过于频繁，请稍后再试' },
        });
        closeStream();
        return;
      }

      // 解析访问模式
      const { context, response: authResponse } = resolveAccess(request, ['process'], true);
      if (authResponse) {
        sendEvent({
          type: 'error',
          data: { code: 'UNAUTHORIZED', message: '认证失败' },
        });
        closeStream();
        return;
      }
      const accessMode = context?.mode || 'public';

      const body: ProcessRequest = await request.json();

      // 验证请求参数
      if (!body.text) {
        sendEvent({
          type: 'error',
          data: { code: 'INVALID_PARAMETERS', message: '文本内容不能为空' },
        });
        closeStream();
        return;
      }

      const text = body.text;
      const maxLength = parseInt(process.env.MAX_TEXT_LENGTH || '30000');

      if (text.length > maxLength) {
        sendEvent({
          type: 'error',
          data: {
            code: 'INVALID_TEXT_LENGTH',
            message: '文本长度超过限制',
            details: `最大长度为${maxLength}字符，当前长度为${text.length}字符`,
          },
        });
        closeStream();
        return;
      }

      const rounds = body.options?.rounds || 3;
      const style = body.options?.style || 'casual';
      const llmApiKey = body.api_key || (body as { key?: string }).key;

      // 私有模式必须提供 api_key
      if (accessMode === 'private' && !llmApiKey) {
        sendEvent({
          type: 'error',
          data: { code: 'LLM_API_KEY_REQUIRED', message: '需要提供 LLM API Key' },
        });
        closeStream();
        return;
      }

      const useCustomLlm = Boolean(llmApiKey);
      const model = useCustomLlm ? body.options?.model : undefined;

      const llmClient = useCustomLlm
        ? new LLMClient({ provider: 'openrouter', apiKey: llmApiKey })
        : new LLMClient();

      // 处理文本，带进度回调
      const result = await llmClient.processText(text, {
        rounds,
        style,
        targetScore: body.options?.target_score,
        model,
        onProgress: (info: ProgressInfo) => {
          sendEvent({ type: 'progress', data: info });
        },
      });

      const processingTime = (Date.now() - startTime) / 1000;

      // 发送最终结果
      sendEvent({
        type: 'result',
        data: {
          processed_text: result.processedText,
          original_length: text.length,
          processed_length: result.processedText.length,
          detection_scores: result.detectionScores,
          processing_time: processingTime,
          rounds_used: rounds,
          model_used: result.model,
          provider: result.provider,
        },
      });

      closeStream();
    } catch (error) {
      console.error('Error processing text:', error);

      const errorMessage = error instanceof Error ? error.message : '未知错误';
      let code = 'INTERNAL_ERROR';
      let message = '处理失败';

      if (errorMessage.includes('API key is required')) {
        code = 'API_KEY_REQUIRED';
        message = '需要配置 API Key';
      } else if (errorMessage.includes('401') || errorMessage.includes('Invalid Authentication')) {
        code = 'INVALID_API_KEY';
        message = 'API Key 无效';
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        code = 'RATE_LIMIT';
        message = 'API 调用次数超限';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
        code = 'TIMEOUT';
        message = '请求超时';
      } else if (errorMessage.includes('网络错误') || errorMessage.includes('fetch failed')) {
        code = 'NETWORK_ERROR';
        message = 'LLM 服务网络连接失败';
      }

      sendEvent({
        type: 'error',
        data: { code, message, details: errorMessage },
      });
      closeStream();
    }
  };

  // 启动异步处理，确保未捕获的错误被记录
  processAsync().catch((err) => {
    console.error('[Stream] Unhandled async error:', err);
    sendEvent({
      type: 'error',
      data: { code: 'INTERNAL_ERROR', message: '处理过程中发生未知错误' },
    });
    closeStream();
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Request-Id': requestId,
    },
  });
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
