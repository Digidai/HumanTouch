import { Env } from './auth';
import { DetectorClient } from './detectors';

export type LLMProvider = 'moonshot' | 'openrouter' | 'custom';

const PROVIDER_CONFIG: Record<LLMProvider, { baseUrl: string }> = {
  moonshot: { baseUrl: 'https://api.moonshot.cn/v1' },
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1' },
  custom: { baseUrl: '' },
};

interface ChatRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  choices: Array<{ message: { content: string } }>;
}

interface ProcessingResult {
  processedText: string;
  detectionScores: { zerogpt: number; gptzero: number; copyleaks: number };
  roundScores: number[][];
  model: string;
  provider: string;
}

export class LLMClient {
  private provider: LLMProvider;
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private detectorClient: DetectorClient;
  private siteUrl: string;

  constructor(env: Env, overrides?: { apiKey?: string; model?: string; provider?: LLMProvider; baseUrl?: string }) {
    const defaultProvider = overrides?.provider || (overrides?.apiKey ? 'openrouter' : this.detectProvider(env));
    this.provider = defaultProvider;
    this.apiKey = overrides?.apiKey || this.getApiKey(env);
    this.model = overrides?.model || this.getDefaultModel(env);
    this.baseUrl = overrides?.baseUrl || env.CUSTOM_LLM_BASE_URL || PROVIDER_CONFIG[this.provider].baseUrl;
    this.detectorClient = new DetectorClient(env);
    this.siteUrl = env.SITE_URL || 'https://humantouch.dev';

    if (!this.apiKey) {
      throw new Error(`[LLMClient] API key required for provider: ${this.provider}`);
    }
  }

  private detectProvider(env: Env): LLMProvider {
    if (env.MOONSHOT_API_KEY) return 'moonshot';
    if (env.OPENROUTER_API_KEY) return 'openrouter';
    if (env.CUSTOM_LLM_API_KEY && env.CUSTOM_LLM_BASE_URL) return 'custom';
    return 'moonshot'; // 默认使用 Moonshot
  }

  private getApiKey(env: Env): string {
    if (this.provider === 'openrouter') return env.OPENROUTER_API_KEY || '';
    if (this.provider === 'moonshot') return env.MOONSHOT_API_KEY || '';
    return env.CUSTOM_LLM_API_KEY || '';
  }

  private getDefaultModel(env: Env): string {
    if (this.provider === 'openrouter') return env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-preview';
    if (this.provider === 'moonshot') return env.MOONSHOT_MODEL || 'kimi-k2-0711-preview';
    return env.CUSTOM_LLM_MODEL || 'gpt-4';
  }

  async processText(text: string, options: {
    rounds?: number;
    targetScore?: number;
    style?: string;
    model?: string;
  } = {}): Promise<ProcessingResult> {
    const rounds = options.rounds || 3;
    const targetScore = options.targetScore || 0.1;
    const style = options.style || 'casual';
    const model = options.model || this.model;

    let currentText = text;
    const roundScores: number[][] = [];

    for (let round = 1; round <= rounds; round++) {
      const instruction = this.getInstruction(round, style, targetScore);
      currentText = await this.chat(currentText, instruction, model);

      const scores = await this.detectorClient.detectAll(currentText);
      roundScores.push([scores.zerogpt, scores.gptzero, scores.copyleaks]);

      const avgScore = (scores.zerogpt + scores.gptzero + scores.copyleaks) / 3;
      if (avgScore <= targetScore) break;
    }

    const finalScores = await this.detectorClient.detectAll(currentText);
    return { processedText: currentText, detectionScores: finalScores, roundScores, model, provider: this.provider };
  }

  private async chat(text: string, instruction: string, model: string): Promise<string> {
    const request: ChatRequest = {
      model,
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: text },
      ],
      temperature: 0.7 + Math.random() * 0.2,
      max_tokens: Math.min(text.length * 2, 4000),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (this.provider === 'openrouter') {
      headers['HTTP-Referer'] = this.siteUrl;
      headers['X-Title'] = 'HumanTouch';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${this.provider}): ${response.status} - ${errorText}`);
    }

    const data: ChatResponse = await response.json();
    return data.choices[0]?.message?.content || text;
  }

  private getInstruction(round: number, style: string, targetScore: number): string {
    const instructions: Record<number, string> = {
      1: `你是一个专业的文本人性化专家。请将以下AI生成的文本转换为更自然、更像人类写作的内容。
要求：去除机械化表达，增加自然语言的不规则性，风格：${style}，目标分数：≤${targetScore}
直接输出改写后的文本，不要有任何解释。`,
      2: `你是一个文体学专家。请重组文本结构，增加语言变异性和突发性，风格：${style}
直接输出改写后的文本，不要有任何解释。`,
      3: `你是一个语言优化专家。请优化文体特征，提高困惑度和不可预测性，风格：${style}
直接输出改写后的文本，不要有任何解释。`,
    };
    return instructions[round] || instructions[1];
  }

  getConfig() {
    return { provider: this.provider, model: this.model, baseUrl: this.baseUrl };
  }
}
