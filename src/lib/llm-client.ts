import { detectorClient } from './detectors';

// 支持的 LLM 提供商
export type LLMProvider = 'moonshot' | 'openrouter' | 'custom';

// 提供商配置
const PROVIDER_CONFIG: Record<LLMProvider, { baseUrl: string; envKey: string }> = {
  moonshot: {
    baseUrl: 'https://api.moonshot.cn/v1',
    envKey: 'MOONSHOT_API_KEY',
  },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
  },
  custom: {
    baseUrl: '',
    envKey: 'CUSTOM_LLM_API_KEY',
  },
};

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
  baseUrl?: string; // 自定义 API 地址
}

interface ChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface ProcessingResult {
  processedText: string;
  detectionScores: {
    zerogpt: number;
    gptzero: number;
    copyleaks: number;
  };
  roundScores: number[][];
  model: string;
  provider: string;
}

export class LLMClient {
  private provider: LLMProvider;
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config?: LLMConfig) {
    // 确定提供商
    this.provider = config?.provider || this.detectProvider();
    
    // 获取 API Key
    this.apiKey = config?.apiKey || this.getApiKey();
    if (!this.apiKey) {
      throw new Error(`[LLMClient] API key is required for provider: ${this.provider}`);
    }

    // 确定模型
    this.model = config?.model || this.getDefaultModel();

    // 确定 Base URL
    this.baseUrl = config?.baseUrl || PROVIDER_CONFIG[this.provider].baseUrl;
    if (!this.baseUrl) {
      throw new Error('[LLMClient] Base URL is required for custom provider');
    }
  }

  private detectProvider(): LLMProvider {
    if (process.env.MOONSHOT_API_KEY) return 'moonshot';
    if (process.env.OPENROUTER_API_KEY) return 'openrouter';
    if (process.env.CUSTOM_LLM_API_KEY && process.env.CUSTOM_LLM_BASE_URL) return 'custom';
    return 'moonshot'; // 默认使用 Moonshot
  }

  private getApiKey(): string {
    switch (this.provider) {
      case 'openrouter':
        return process.env.OPENROUTER_API_KEY || '';
      case 'moonshot':
        return process.env.MOONSHOT_API_KEY || '';
      case 'custom':
        return process.env.CUSTOM_LLM_API_KEY || '';
      default:
        return '';
    }
  }

  private getDefaultModel(): string {
    switch (this.provider) {
      case 'openrouter':
        return process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash-preview';
      case 'moonshot':
        return process.env.MOONSHOT_MODEL || 'kimi-k2-0711-preview';
      case 'custom':
        return process.env.CUSTOM_LLM_MODEL || 'gpt-4';
      default:
        return 'kimi-k2-0711-preview';
    }
  }

  async processText(text: string, options: {
    rounds?: number;
    targetScore?: number;
    style?: string;
    model?: string; // 允许单次请求覆盖模型
  } = {}): Promise<ProcessingResult> {
    const rounds = options.rounds || 3;
    const targetScore = options.targetScore || 0.1;
    const style = options.style || 'casual';
    const model = options.model || this.model;

    let currentText = text;
    const roundScores: number[][] = [];

    for (let round = 1; round <= rounds; round++) {
      const instruction = this.getHumanizationInstruction(round, style, targetScore);
      currentText = await this.chat(currentText, instruction, model);

      const scores = await detectorClient.detectAll(currentText);
      roundScores.push([scores.zerogpt, scores.gptzero, scores.copyleaks]);

      const avgScore = (scores.zerogpt + scores.gptzero + scores.copyleaks) / 3;
      if (avgScore <= targetScore) {
        break;
      }
    }

    const finalScores = await detectorClient.detectAll(currentText);

    return {
      processedText: currentText,
      detectionScores: finalScores,
      roundScores,
      model,
      provider: this.provider,
    };
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

    // OpenRouter 需要额外的 headers
    if (this.provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.SITE_URL || 'https://humantouch.dev';
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

  private getHumanizationInstruction(round: number, style: string, targetScore: number): string {
    const instructions: Record<number, string> = {
      1: `你是一个专业的文本人性化专家。请将以下AI生成的文本转换为更自然、更像人类写作的内容。
      
要求：
- 去除机械化的表达和模板化句式
- 增加自然语言的不规则性和个性化特征
- 保持原文的核心意思，但让表达方式更贴近人类写作习惯
- 风格：${style}
- 目标AI检测分数：≤ ${targetScore}

重点：打破AI写作的过度规整化，注入真实人类的思维模式和表达习惯。
直接输出改写后的文本，不要有任何解释。`,

      2: `你是一个文体学专家。请重组文本的语义结构，增加语言的变异性和突发性。
      
要求：
- 打破模板化句式，增加句式多样性
- 注入合理的思维跳跃和不连贯性（模拟人类真实思维）
- 调整段落结构和逻辑连接
- 风格：${style}

重点：让人类写作的自然特征更加明显，避免AI的过度逻辑化。
直接输出改写后的文本，不要有任何解释。`,

      3: `你是一个语言优化专家。请优化文本的文体特征，提高困惑度和不可预测性。
      
要求：
- 调整词汇丰富度和句法复杂度
- 模拟人类写作的节奏变化
- 增加不可预测的语言模式
- 风格：${style}

重点：使文本在困惑度、突发性等检测指标上更接近人类写作。
直接输出改写后的文本，不要有任何解释。`,

      4: `你是一个个性化写作专家。为文本注入个人化的人类写作特征。
      
要求：
- 添加个人化的表达方式和语言习惯
- 模拟真实作者的写作特征
- 注入适当的情感色彩和主观表达
- 风格：${style}

重点：创造独特的个人写作风格，避免AI的同质化特征。
直接输出改写后的文本，不要有任何解释。`,

      5: `你是一个质量控制专家。对文本进行最终优化，确保质量和检测效果。
      
要求：
- 确保内容连贯性和可读性
- 平衡人性化处理和内容质量
- 最终调整语言自然度
- 风格：${style}

重点：确保最终文本能够通过AI检测，同时保持高质量和可读性。
直接输出改写后的文本，不要有任何解释。`,
    };

    return instructions[round] || instructions[1];
  }

  // 获取当前配置信息
  getConfig() {
    return {
      provider: this.provider,
      model: this.model,
      baseUrl: this.baseUrl,
    };
  }
}

// 创建默认客户端实例
export const llmClient = new LLMClient();

// 向后兼容：保留 moonshotClient 别名
export const moonshotClient = llmClient;
