import { env } from 'process';
import { detectorClient } from './detectors';

interface MoonshotConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface MoonshotRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface MoonshotResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ProcessingResult {
  processedText: string;
  detectionScores: {
    zerogpt: number;
    gptzero: number;
    copyleaks: number;
  };
  roundScores: number[][];
}

const config: MoonshotConfig = {
  apiKey: process.env.MOONSHOT_API_KEY || '',
  model: process.env.MOONSHOT_MODEL || 'kimi-k2-0711-preview',
  baseUrl: 'https://api.moonshot.cn/v1',
};

export class MoonshotClient {
  private config: MoonshotConfig;

  constructor(configOverride?: Partial<MoonshotConfig>) {
    this.config = { ...config, ...configOverride };
  }

  async processText(text: string, options: {
    rounds?: number;
    targetScore?: number;
    style?: string;
  } = {}): Promise<ProcessingResult> {
    if (!this.config.apiKey) {
      throw new Error('MOONSHOT_API_KEY is required');
    }

    const rounds = options.rounds || 3;
    const targetScore = options.targetScore || 0.1;
    const style = options.style || 'casual';

    let currentText = text;
    const roundScores: number[][] = [];

    for (let round = 1; round <= rounds; round++) {
      const instruction = this.getHumanizationInstruction(round, style, targetScore);
      
      currentText = await this.processSingleRound(currentText, instruction);
      
      // 每轮结束后检测分数
      const scores = await detectorClient.detectAll(currentText);
      roundScores.push([scores.zerogpt, scores.gptzero, scores.copyleaks]);

      // 如果达到目标分数，提前终止
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
    };
  }

  private async processSingleRound(text: string, instruction: string): Promise<string> {
    const request: MoonshotRequest = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: instruction
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7 + Math.random() * 0.2, // 增加随机性
      max_tokens: Math.min(text.length * 2, 4000)
    };

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Moonshot API error: ${response.status} ${response.statusText}`);
      }

      const data: MoonshotResponse = await response.json();
      return data.choices[0]?.message?.content || text;
    } catch (error) {
      console.error('Error calling Moonshot API:', error);
      throw error;
    }
  }

  private getHumanizationInstruction(round: number, style: string, targetScore: number): string {
    const instructions = {
      1: `你是一个专业的文本人性化专家。请将以下AI生成的文本转换为更自然、更像人类写作的内容。
      
      当前要求：
      - 去除机械化的表达和模板化句式
      - 增加自然语言的不规则性和个性化特征
      - 保持原文的核心意思，但让表达方式更贴近人类写作习惯
      - 风格：${style}
      - 目标AI检测分数：≤ ${targetScore}
      
      重点：打破AI写作的过度规整化，注入真实人类的思维模式和表达习惯。`,

      2: `你是一个文体学专家。请重组文本的语义结构，增加语言的变异性和突发性。
      
      当前要求：
      - 打破模板化句式，增加句式多样性
      - 注入合理的思维跳跃和不连贯性（模拟人类真实思维）
      - 调整段落结构和逻辑连接
      - 增加语言的"突发性"特征
      - 风格：${style}
      
      重点：让人类写作的自然特征更加明显，避免AI的过度逻辑化。`,

      3: `你是一个语言优化专家。请优化文本的文体特征，提高困惑度和不可预测性。
      
      当前要求：
      - 调整词汇丰富度和句法复杂度
      - 模拟人类写作的节奏变化
      - 增加不可预测的语言模式
      - 避免过于规整和可预测的表达
      - 风格：${style}
      
      重点：使文本在困惑度、突发性等检测指标上更接近人类写作。`,

      4: `你是一个个性化写作专家。为文本注入个人化的人类写作特征。
      
      当前要求：
      - 添加个人化的表达方式和语言习惯
      - 模拟真实作者的写作特征
      - 注入适当的情感色彩和主观表达
      - 增加个体差异性
      - 风格：${style}
      
      重点：创造独特的个人写作风格，避免AI的同质化特征。`,

      5: `你是一个质量控制专家。对文本进行最终优化，确保质量和检测效果。
      
      当前要求：
      - 检查并优化检测逃避效果
      - 确保内容连贯性和可读性
      - 平衡人性化处理和内容质量
      - 最终调整语言自然度
      - 风格：${style}
      
      重点：确保最终文本能够通过AI检测，同时保持高质量和可读性。`
    };

    return instructions[round as keyof typeof instructions] || instructions[1];
  }
}

export const moonshotClient = new MoonshotClient();