import { detectorClient } from './detectors';

// 支持的 LLM 提供商
export type LLMProvider = 'openrouter' | 'custom';

// 提供商配置
const PROVIDER_CONFIG: Record<LLMProvider, { baseUrl: string; envKey: string }> = {
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
    if (process.env.OPENROUTER_API_KEY) return 'openrouter';
    if (process.env.CUSTOM_LLM_API_KEY && process.env.CUSTOM_LLM_BASE_URL) return 'custom';
    return 'openrouter'; // 默认使用 OpenRouter
  }

  private getApiKey(): string {
    switch (this.provider) {
      case 'openrouter':
        return process.env.OPENROUTER_API_KEY || '';
      case 'custom':
        return process.env.CUSTOM_LLM_API_KEY || '';
      default:
        return '';
    }
  }

  private getDefaultModel(): string {
    switch (this.provider) {
      case 'openrouter':
        return process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';
      case 'custom':
        return process.env.CUSTOM_LLM_MODEL || 'gpt-4';
      default:
        return 'google/gemini-2.0-flash-exp:free';
    }
  }

  // 长文分段阈值（字符数）- 提高以支持更长的文本
  private static readonly CHUNK_THRESHOLD = 15000;  // 15k 字符触发分段
  private static readonly MAX_CHUNK_SIZE = 20000;   // 单段最大 20k 字符

  // Token 限制
  private static readonly MAX_TOKENS = 30000;       // 提高到 30k tokens
  private static readonly MIN_TOKENS = 4000;        // 最小 4k tokens

  // 重试配置 - 增强稳定性
  private static readonly MAX_RETRIES = 5;          // 增加到 5 次重试
  private static readonly RETRY_BASE_DELAY = 2000;  // 2秒起始延迟
  private static readonly LONG_TEXT_TIMEOUT = 300000; // 长文超时 5 分钟
  private static readonly DEFAULT_TIMEOUT = 120000;   // 默认超时 2 分钟

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

    // 长文分段处理
    if (text.length > LLMClient.CHUNK_THRESHOLD) {
      return this.processLongText(text, { rounds, targetScore, style, model });
    }

    return this.processShortText(text, { rounds, targetScore, style, model });
  }

  // 自适应轮次策略 - 根据检测结果选择最有效的下一轮策略
  private static readonly ADAPTIVE_STRATEGY: Record<string, number[]> = {
    // 如果 zerogpt 分数最高，说明需要更多词汇变化和困惑度
    zerogpt_high: [3, 4, 6],  // 词汇多样化 → 思维痕迹 → 极限处理
    // 如果 gptzero 分数最高，说明突发性和句法需要改进
    gptzero_high: [2, 4, 5],  // 句法重组 → 思维痕迹 → 深度打磨
    // 如果 copyleaks 分数最高，说明整体模式需要打破
    copyleaks_high: [1, 2, 6], // AI模式消除 → 句法重组 → 极限处理
    // 默认渐进策略
    default: [1, 2, 3, 4, 5],
  };

  // 处理短文本（带重试机制和自适应策略）
  private async processShortText(text: string, options: {
    rounds: number;
    targetScore: number;
    style: string;
    model: string;
  }): Promise<ProcessingResult> {
    const { rounds, targetScore, style, model } = options;

    let currentText = text;
    const roundScores: number[][] = [];
    let usedRounds: number[] = [];

    // 第一轮始终从 AI 模式消除开始
    let nextRound = 1;

    for (let i = 0; i < rounds; i++) {
      const instruction = this.getHumanizationInstruction(nextRound, style, targetScore, false, currentText);
      usedRounds.push(nextRound);

      console.log(`[LLMClient] 执行第 ${i + 1}/${rounds} 轮处理（策略 #${nextRound}）`);

      // 使用带重试机制的 API 调用
      currentText = await this.chatWithRetry(currentText, instruction, model, false);

      const scores = await detectorClient.detectAll(currentText);
      roundScores.push([scores.zerogpt, scores.gptzero, scores.copyleaks]);

      const avgScore = (scores.zerogpt + scores.gptzero + scores.copyleaks) / 3;
      console.log(`[LLMClient] 轮次 ${i + 1} 完成，平均分数: ${(avgScore * 100).toFixed(1)}%`);

      if (avgScore <= targetScore) {
        console.log(`[LLMClient] 已达到目标分数 ${targetScore}，提前结束`);
        break;
      }

      // 自适应选择下一轮策略
      if (i < rounds - 1) {
        nextRound = this.selectNextRound(scores, usedRounds, i + 2);
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

  // 根据检测分数选择下一轮最佳策略
  private selectNextRound(
    scores: { zerogpt: number; gptzero: number; copyleaks: number },
    usedRounds: number[],
    currentIteration: number
  ): number {
    // 找出分数最高的检测器
    const maxScore = Math.max(scores.zerogpt, scores.gptzero, scores.copyleaks);

    let strategyKey = 'default';
    if (scores.zerogpt === maxScore && scores.zerogpt > 0.3) {
      strategyKey = 'zerogpt_high';
    } else if (scores.gptzero === maxScore && scores.gptzero > 0.3) {
      strategyKey = 'gptzero_high';
    } else if (scores.copyleaks === maxScore && scores.copyleaks > 0.3) {
      strategyKey = 'copyleaks_high';
    }

    const strategy = LLMClient.ADAPTIVE_STRATEGY[strategyKey];

    // 从策略中选择一个还没用过的轮次
    for (const round of strategy) {
      if (!usedRounds.includes(round)) {
        return round;
      }
    }

    // 如果策略中的轮次都用过了，使用默认渐进
    const defaultRound = Math.min(currentIteration, 6);
    return usedRounds.includes(defaultRound) ?
      (defaultRound % 6) + 1 : defaultRound;
  }

  // 处理长文本：分段处理后合并
  private async processLongText(text: string, options: {
    rounds: number;
    targetScore: number;
    style: string;
    model: string;
  }): Promise<ProcessingResult> {
    const { rounds, targetScore, style, model } = options;

    // 按段落边界分割文本
    const chunks = this.splitTextIntoChunks(text);
    console.log(`[LLMClient] 长文分段处理: ${text.length} 字符 → ${chunks.length} 段`);

    const processedChunks: string[] = [];
    const allRoundScores: number[][] = [];

    // 逐段处理（带重试机制）
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[LLMClient] 处理第 ${i + 1}/${chunks.length} 段 (${chunk.length} 字符)`);

      let currentChunk = chunk;

      for (let round = 1; round <= rounds; round++) {
        const instruction = this.getHumanizationInstruction(round, style, targetScore, true, currentChunk);
        // 长文本分段使用带重试机制的 API 调用
        currentChunk = await this.chatWithRetry(currentChunk, instruction, model, true);
      }

      processedChunks.push(currentChunk);
    }

    // 合并处理后的段落
    const processedText = processedChunks.join('\n\n');

    // 获取最终检测分数
    const finalScores = await detectorClient.detectAll(processedText);
    allRoundScores.push([finalScores.zerogpt, finalScores.gptzero, finalScores.copyleaks]);

    return {
      processedText,
      detectionScores: finalScores,
      roundScores: allRoundScores,
      model,
      provider: this.provider,
    };
  }

  // 按段落边界智能分割文本
  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';

    for (const para of paragraphs) {
      // 如果当前段落本身就超过限制，需要按句子分割
      if (para.length > LLMClient.MAX_CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        // 按句子分割长段落
        const sentences = para.split(/(?<=[。！？.!?])\s*/);
        let sentenceChunk = '';
        for (const sentence of sentences) {
          if ((sentenceChunk + sentence).length > LLMClient.MAX_CHUNK_SIZE) {
            if (sentenceChunk) {
              chunks.push(sentenceChunk.trim());
            }
            sentenceChunk = sentence;
          } else {
            sentenceChunk += sentence;
          }
        }
        if (sentenceChunk) {
          currentChunk = sentenceChunk;
        }
        continue;
      }

      // 如果加上这个段落会超过阈值，先保存当前块
      if ((currentChunk + '\n\n' + para).length > LLMClient.CHUNK_THRESHOLD && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      }
    }

    // 保存最后一块
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 0);
  }

  // 带重试机制的单次 API 调用
  private async chatWithRetry(text: string, instruction: string, model: string, isLongText: boolean = false): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= LLMClient.MAX_RETRIES; attempt++) {
      try {
        return await this.chat(text, instruction, model, isLongText);
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === LLMClient.MAX_RETRIES) {
          console.error(`[LLMClient] 第 ${attempt} 次尝试失败（不可重试或已达最大重试次数）:`, lastError.message);
          throw lastError;
        }

        // 指数退避 + 随机抖动
        const delay = LLMClient.RETRY_BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`[LLMClient] 第 ${attempt} 次尝试失败，${Math.round(delay / 1000)}s 后重试: ${lastError.message}`);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Unknown error during chat');
  }

  // 判断错误是否可重试
  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();

    // 可重试的错误类型
    return (
      error.name === 'AbortError' || // 超时
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('econnreset') ||
      message.includes('socket hang up') ||
      message.includes('429') || // 限流
      message.includes('500') || // 服务器错误
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }

  // 辅助函数：延迟
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async chat(text: string, instruction: string, model: string, isLongText: boolean = false): Promise<string> {
    // 根据输入长度动态调整 max_tokens，确保长文能完整处理
    // 中文约2字符/token，英文约4字符/token，取中间值
    const estimatedTokens = Math.ceil(text.length / 2.5);
    const maxTokens = Math.min(
      Math.max(estimatedTokens * 1.8, LLMClient.MIN_TOKENS),
      LLMClient.MAX_TOKENS
    );

    const request: ChatRequest = {
      model,
      messages: [
        { role: 'system', content: instruction },
        { role: 'user', content: text },
      ],
      temperature: 0.7 + Math.random() * 0.2,
      max_tokens: maxTokens,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': process.env.SITE_URL || 'https://humantouch.dev',
      'X-Title': 'HumanTouch',
    };

    // 动态超时：长文使用更长的超时时间
    const timeout = isLongText ? LLMClient.LONG_TEXT_TIMEOUT : LLMClient.DEFAULT_TIMEOUT;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error (${this.provider}): ${response.status} - ${errorText}`);
      }

      const data: ChatResponse = await response.json();
      return data.choices[0]?.message?.content || text;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`LLM API timeout (${this.provider}): 请求超时（${timeout / 1000}s），请稍后重试`);
        }
        // 改进 fetch failed 错误信息
        if (error.message === 'fetch failed' || error.message.includes('fetch')) {
          throw new Error(`LLM API 网络错误 (${this.provider}): 无法连接到 ${this.baseUrl}，请检查网络或稍后重试`);
        }
      }
      throw error;
    }
  }

  // AI 典型模式 - 需要消除的特征
  private static readonly AI_PATTERNS = {
    // 中文 AI 典型表达
    zh: {
      connectors: ['首先', '其次', '再次', '最后', '此外', '另外', '同时', '因此', '所以', '总之', '综上所述', '总而言之'],
      fillers: ['需要注意的是', '值得一提的是', '重要的是', '关键在于', '不可忽视的是', '众所周知', '毫无疑问'],
      formal: ['进行', '实现', '开展', '推动', '促进', '加强', '提升', '优化', '完善', '深化'],
      templates: ['在...方面', '从...角度', '基于...', '针对...', '围绕...', '就...而言'],
    },
    // 英文 AI 典型表达
    en: {
      connectors: ['firstly', 'secondly', 'thirdly', 'finally', 'moreover', 'furthermore', 'additionally', 'consequently', 'therefore', 'in conclusion'],
      fillers: ['it is important to note', 'it is worth mentioning', 'it should be noted', 'it goes without saying', 'needless to say'],
      formal: ['utilize', 'implement', 'facilitate', 'leverage', 'optimize', 'enhance', 'streamline'],
      templates: ['in terms of', 'with regard to', 'in the context of', 'from the perspective of'],
    }
  };

  // 风格配置 - 针对不同写作风格的策略 (中英双语)
  private static readonly STYLE_CONFIG: Record<string, Record<string, {
    tone: string;
    vocabulary: string;
    structure: string;
    personality: string;
  }>> = {
    zh: {
      casual: {
        tone: '轻松、随意、亲切',
        vocabulary: '口语化词汇、俚语、缩写',
        structure: '短句为主、可用不完整句、允许口语化省略',
        personality: '像朋友聊天、可以用"我觉得"、"说实话"等个人化表达',
      },
      academic: {
        tone: '严谨、客观、专业',
        vocabulary: '学术术语、精确用词、避免口语',
        structure: '复杂句式、从句嵌套、逻辑严密',
        personality: '引用式表达、谨慎的断言、承认局限性',
      },
      professional: {
        tone: '专业、简洁、有说服力',
        vocabulary: '行业术语、精炼用词、数据支撑',
        structure: '清晰的论点、有力的论证、结论明确',
        personality: '自信但不傲慢、解决问题导向、注重实效',
      },
      creative: {
        tone: '生动、形象、富有感染力',
        vocabulary: '比喻、隐喻、感官词汇、创意表达',
        structure: '节奏变化、意外转折、留白和暗示',
        personality: '独特视角、情感表达、想象力丰富',
      },
    },
    en: {
      casual: {
        tone: 'relaxed, informal, friendly',
        vocabulary: 'colloquial words, slang, contractions',
        structure: 'short sentences, fragments allowed, conversational omissions',
        personality: 'like chatting with a friend, use "I think", "honestly" etc.',
      },
      academic: {
        tone: 'rigorous, objective, professional',
        vocabulary: 'academic terminology, precise wording, avoid colloquialisms',
        structure: 'complex sentences, nested clauses, logical rigor',
        personality: 'citation-style, cautious assertions, acknowledge limitations',
      },
      professional: {
        tone: 'professional, concise, persuasive',
        vocabulary: 'industry terms, refined wording, data-backed',
        structure: 'clear arguments, strong evidence, definite conclusions',
        personality: 'confident but not arrogant, solution-oriented, pragmatic',
      },
      creative: {
        tone: 'vivid, imaginative, engaging',
        vocabulary: 'metaphors, sensory words, creative expressions',
        structure: 'rhythm variations, unexpected turns, strategic pauses',
        personality: 'unique perspective, emotional expression, rich imagination',
      },
    },
  };

  // 检测文本主要语言
  private detectLanguage(text: string): 'zh' | 'en' {
    // 简单的中文检测：统计中文字符比例
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const ratio = chineseChars.length / text.length;
    return ratio > 0.1 ? 'zh' : 'en';
  }

  /**
   * 获取人性化指令 - 基于 AI 检测器原理的科学策略
   *
   * 核心原理：
   * 1. 困惑度 (Perplexity): AI文本可预测性高，需增加不可预测性
   * 2. 突发性 (Burstiness): AI句子均匀，需制造句长变化
   * 3. 词汇多样性: AI重复模式多，需增加词汇变异
   * 4. 句法变异: AI结构统一，需改变句法模式
   */
  private getHumanizationInstruction(round: number, style: string, targetScore: number, isChunk: boolean = false, inputText?: string): string {
    // 检测语言，默认使用中文
    const lang = inputText ? this.detectLanguage(inputText) : 'zh';
    const chunkNote = lang === 'zh'
      ? (isChunk ? '\n\n【片段处理注意】这是长文的一个片段，保持内容连贯，不要添加开头语或结尾总结。' : '')
      : (isChunk ? '\n\n[CHUNK NOTE] This is a segment of a longer text. Maintain continuity, do not add introductions or conclusions.' : '');
    const styleConfig = LLMClient.STYLE_CONFIG[lang]?.[style] || LLMClient.STYLE_CONFIG[lang]?.casual || LLMClient.STYLE_CONFIG.zh.casual;

    // 中文指令
    const instructionsZh: Record<number, string> = {
      // 第1轮：AI 模式消除 - 移除 AI 典型特征
      1: `【角色】你是一位资深编辑，专门将机械化文本改写为自然人类表达。

【核心任务】消除 AI 写作的典型模式，让文本像真人写的。

【必须消除的 AI 特征】
1. 列表式连接词：删除或替换"首先/其次/最后"、"第一/第二/第三"等
2. AI 惯用语：移除"需要注意的是"、"值得一提的是"、"综上所述"等
3. 过度正式词汇：将"进行"换成具体动词，"实现"换成"做到/达成"
4. 模板化句式：改写"在...方面"、"从...角度"等套话

【改写策略】
- 用具体动词替代抽象动词（"进行讨论"→"聊了聊"/"讨论"）
- 打破并列结构，改用自然过渡
- 合并过于短小的段落，或拆分过长段落

【风格要求】${styleConfig.tone}
【词汇选择】${styleConfig.vocabulary}

直接输出改写后的文本，禁止任何解释或元描述。`,

      // 第2轮：句法重组 - 增加句法多样性和突发性
      2: `【角色】你是一位语言学家，专注于句法结构的自然变异。

【核心任务】重组句子结构，制造人类写作特有的"突发性"(Burstiness)。

【什么是突发性】
人类写作的句子长度会剧烈变化：有时很短，有时很长。AI 写作则倾向于均匀的句子长度。

【句法重组策略】
1. 句长变异：
   - 在长句后插入短句（"就这样。"/"没错。"/"真的。"）
   - 将部分长句拆成2-3个短句
   - 偶尔使用特别长的复合句

2. 句式变换：
   - 改变主谓宾顺序（"研究人员发现..."→"这个发现让研究人员..."）
   - 将陈述句改为反问句或感叹句
   - 使用倒装、省略等变体句式

3. 段落节奏：
   - 有的段落只有一两句话
   - 有的段落信息密集
   - 避免每段都是3-4句的标准结构

【风格要求】${styleConfig.tone}
【结构参考】${styleConfig.structure}

直接输出改写后的文本，禁止任何解释。`,

      // 第3轮：词汇多样化 - 增加困惑度
      3: `【角色】你是一位词汇学专家，擅长丰富文本的词汇层次。

【核心任务】增加词汇多样性，提高文本"困惑度"(Perplexity)。

【什么是困惑度】
AI 检测器通过预测下一个词来判断文本。如果下一个词很容易被预测，则困惑度低（像AI）。人类会使用更多意外的、不常见的词汇搭配。

【词汇多样化策略】
1. 同义替换但不生硬：
   - 不要简单替换为生僻词
   - 选择同样自然但更少用的表达
   - 例："很重要"→"挺关键的"/"不能忽视"/"这点很要紧"

2. 打破固定搭配：
   - "取得成功"→"事儿成了"/"搞定了"
   - "具有重要意义"→"意义不小"/"挺有分量"

3. 引入具象表达：
   - 用具体比喻替代抽象描述
   - 用感官词汇增加画面感
   - 例："发展很快"→"像坐火箭一样"

4. 口语化词汇（如果风格允许）：
   - 语气词："嗯"、"呢"、"吧"、"啊"
   - 口语表达："说白了"、"其实吧"、"你想啊"

【风格要求】${styleConfig.tone}
【词汇选择】${styleConfig.vocabulary}

直接输出改写后的文本，禁止任何解释。`,

      // 第4轮：思维痕迹注入 - 模拟人类思维过程
      4: `【角色】你是一位心理语言学家，专门研究人类写作中的思维痕迹。

【核心任务】注入人类思维过程的痕迹，让文本带有"思考的味道"。

【人类思维的写作特征】
1. 思维跳跃：人类不会完美地按逻辑顺序写作
2. 自我修正：会出现"不对，应该说..."这样的修正
3. 不确定表达：人类会承认不确定性
4. 情感反应：对内容有真实的情感回应

【注入策略】
1. 插入思维痕迹：
   - "说到这儿，我想起..."
   - "等等，这里要补充一下"
   - "老实说，..."
   - "现在回想起来..."

2. 表达不确定性：
   - "大概是..."/"可能..."/"我记得好像..."
   - "这点我不太确定，但..."
   - "虽然不能百分百肯定，但..."

3. 个人立场表达：
   - "我个人觉得..."/"在我看来..."
   - "这让我想到..."
   - "不得不说，..."

4. 情感反应：
   - "有意思的是..."/"让人惊讶的是..."
   - "说实话，这点挺让人..."
   - 适当使用感叹

【风格要求】${styleConfig.tone}
【个性表达】${styleConfig.personality}

直接输出改写后的文本，禁止任何解释。`,

      // 第5轮：深度打磨 - 最终优化和质量保证
      5: `【角色】你是一位资深作家和文字打磨专家。

【核心任务】最终打磨，确保文本既能通过 AI 检测，又保持高质量。

【打磨要点】
1. 自然度检查：
   - 朗读测试：读出来是否像人说的话？
   - 删除任何听起来像"AI在解释"的内容
   - 确保过渡自然，不生硬

2. 独特性注入：
   - 添加1-2处独特观点或见解
   - 使用一个独特的比喻或类比
   - 留下"作者印记"

3. 不完美性：
   - 人类写作不会完美
   - 可以有轻微的重复
   - 可以有不那么精确的表达
   - 但要保持可读性

4. 最终节奏调整：
   - 检查开头是否吸引人
   - 检查结尾是否自然（不是AI式总结）
   - 整体阅读流畅度

【风格要求】${styleConfig.tone}
【质量标准】保持原意准确性的同时，确保文本无AI痕迹

直接输出改写后的文本，禁止任何解释。`,

      // 第6轮（如需要）：极限处理 - 针对顽固AI痕迹
      6: `【角色】你是一位反AI检测专家，专门处理顽固的AI痕迹。

【核心任务】对仍有AI痕迹的文本进行极限处理。

【极限处理策略】
1. 完全重写关键句子：
   - 不是修改，是用完全不同的方式表达同一意思
   - 改变信息的呈现顺序

2. 引入意外元素：
   - 一个出人意料的类比
   - 一个小故事或例子
   - 一个反问或设问

3. 破坏AI模式：
   - 故意打破"问题-分析-解决"模式
   - 先说结论再说原因
   - 中间穿插相关但不完全对齐的内容

4. 增加人类"缺陷"：
   - 一处轻微的信息冗余
   - 一处不那么精确但更生动的表达
   - 保持这些"缺陷"是自然的、不影响理解的

【风格要求】${styleConfig.tone}

直接输出改写后的文本，禁止任何解释。`,
    };

    // English instructions
    const instructionsEn: Record<number, string> = {
      // Round 1: AI Pattern Elimination - Remove typical AI characteristics
      1: `[ROLE] You are a senior editor specializing in transforming mechanical text into natural human expression.

[CORE TASK] Eliminate typical AI writing patterns to make the text read like it was written by a real person.

[AI FEATURES TO ELIMINATE]
1. Sequential connectors: Remove or replace "firstly/secondly/finally", "first/second/third", etc.
2. AI clichés: Remove "it is important to note", "it is worth mentioning", "in conclusion", etc.
3. Overly formal vocabulary: Replace "utilize" with "use", "implement" with "do/get done"
4. Template phrases: Rewrite "in terms of", "from the perspective of", "with regard to"

[REWRITING STRATEGIES]
- Replace abstract verbs with concrete ones ("conduct a discussion" → "talked about"/"discussed")
- Break parallel structures, use natural transitions instead
- Merge overly short paragraphs or split long ones

[STYLE] ${styleConfig.tone}
[VOCABULARY] ${styleConfig.vocabulary}

Output the rewritten text directly. No explanations or meta-commentary.`,

      // Round 2: Syntactic Restructuring - Increase syntactic diversity and burstiness
      2: `[ROLE] You are a linguist specializing in natural syntactic variation.

[CORE TASK] Restructure sentences to create the "burstiness" characteristic of human writing.

[WHAT IS BURSTINESS]
Human writing has dramatic sentence length variation: sometimes very short, sometimes very long. AI writing tends to have uniform sentence lengths.

[SYNTACTIC RESTRUCTURING STRATEGIES]
1. Sentence length variation:
   - Insert short sentences after long ones ("Just like that." / "Right." / "Really.")
   - Split some long sentences into 2-3 short ones
   - Occasionally use extra-long compound sentences

2. Sentence structure changes:
   - Change subject-verb-object order ("Researchers found..." → "This discovery led researchers...")
   - Convert statements to rhetorical questions or exclamations
   - Use inversions, ellipses, and other variant structures

3. Paragraph rhythm:
   - Some paragraphs have only one or two sentences
   - Some paragraphs are information-dense
   - Avoid the standard 3-4 sentence structure for every paragraph

[STYLE] ${styleConfig.tone}
[STRUCTURE] ${styleConfig.structure}

Output the rewritten text directly. No explanations.`,

      // Round 3: Vocabulary Diversification - Increase perplexity
      3: `[ROLE] You are a vocabulary expert skilled at enriching text with varied word choices.

[CORE TASK] Increase vocabulary diversity to raise the text's "perplexity."

[WHAT IS PERPLEXITY]
AI detectors judge text by predicting the next word. If the next word is easily predictable, perplexity is low (AI-like). Humans use more unexpected, uncommon word combinations.

[VOCABULARY DIVERSIFICATION STRATEGIES]
1. Synonym substitution without awkwardness:
   - Don't simply replace with obscure words
   - Choose equally natural but less common expressions
   - Example: "very important" → "pretty crucial" / "can't overlook this" / "matters a lot"

2. Break fixed collocations:
   - "achieve success" → "pulled it off" / "got it done"
   - "of great significance" → "means something" / "carries weight"

3. Introduce concrete expressions:
   - Use specific metaphors instead of abstract descriptions
   - Add sensory words for vividness
   - Example: "growing rapidly" → "shooting up like a rocket"

4. Colloquial vocabulary (if style permits):
   - Interjections: "well", "so", "you know", "I mean"
   - Casual expressions: "basically", "honestly", "thing is"

[STYLE] ${styleConfig.tone}
[VOCABULARY] ${styleConfig.vocabulary}

Output the rewritten text directly. No explanations.`,

      // Round 4: Thought Trace Injection - Simulate human thought process
      4: `[ROLE] You are a psycholinguist specializing in traces of human thought in writing.

[CORE TASK] Inject traces of human thought processes to give the text a "thinking flavor."

[HUMAN THOUGHT CHARACTERISTICS IN WRITING]
1. Thought jumps: Humans don't write perfectly in logical order
2. Self-correction: Phrases like "no wait, I mean..." appear
3. Uncertainty expressions: Humans acknowledge uncertainty
4. Emotional reactions: Real emotional responses to content

[INJECTION STRATEGIES]
1. Insert thought traces:
   - "Speaking of which, I remember..."
   - "Hold on, I should add..."
   - "Honestly,..."
   - "Looking back now..."

2. Express uncertainty:
   - "probably..." / "maybe..." / "I think I recall..."
   - "I'm not entirely sure about this, but..."
   - "Can't say for certain, but..."

3. Personal stance expressions:
   - "Personally, I think..." / "The way I see it..."
   - "This reminds me of..."
   - "I have to say,..."

4. Emotional reactions:
   - "Interestingly enough..." / "What's surprising is..."
   - "To be honest, this is kind of..."
   - Use appropriate exclamations

[STYLE] ${styleConfig.tone}
[PERSONALITY] ${styleConfig.personality}

Output the rewritten text directly. No explanations.`,

      // Round 5: Deep Polish - Final optimization and quality assurance
      5: `[ROLE] You are a senior writer and text polishing expert.

[CORE TASK] Final polish to ensure the text passes AI detection while maintaining high quality.

[POLISHING POINTS]
1. Naturalness check:
   - Read-aloud test: Does it sound like something a person would say?
   - Remove anything that sounds like "AI explaining"
   - Ensure transitions are natural, not forced

2. Uniqueness injection:
   - Add 1-2 unique viewpoints or insights
   - Use a distinctive metaphor or analogy
   - Leave an "author's mark"

3. Imperfection:
   - Human writing isn't perfect
   - Can have slight repetition
   - Can have less-than-precise expressions
   - But maintain readability

4. Final rhythm adjustment:
   - Check if the opening is engaging
   - Check if the ending is natural (not an AI-style summary)
   - Overall reading flow

[STYLE] ${styleConfig.tone}
[QUALITY] Maintain accuracy while ensuring no AI traces

Output the rewritten text directly. No explanations.`,

      // Round 6 (if needed): Extreme Processing - For stubborn AI traces
      6: `[ROLE] You are an anti-AI detection expert specializing in stubborn AI traces.

[CORE TASK] Apply extreme processing to text that still shows AI traces.

[EXTREME PROCESSING STRATEGIES]
1. Complete sentence rewrites:
   - Not modification, but expressing the same meaning in a completely different way
   - Change the order of information presentation

2. Introduce unexpected elements:
   - A surprising analogy
   - A small story or example
   - A rhetorical question

3. Break AI patterns:
   - Deliberately break "problem-analysis-solution" patterns
   - State conclusion before reasoning
   - Intersperse related but not perfectly aligned content

4. Add human "imperfections":
   - One slight information redundancy
   - One less precise but more vivid expression
   - Keep these "imperfections" natural and not affecting comprehension

[STYLE] ${styleConfig.tone}

Output the rewritten text directly. No explanations.`,
    };

    const instructions = lang === 'zh' ? instructionsZh : instructionsEn;

    const instruction = instructions[round] || instructions[1];
    return instruction + chunkNote;
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

// 延迟实例化，避免在构建时因缺少环境变量而失败
let _llmClient: LLMClient | null = null;

export function getLLMClient(): LLMClient {
  if (!_llmClient) {
    _llmClient = new LLMClient();
  }
  return _llmClient;
}
