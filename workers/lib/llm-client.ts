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

  // 长文分段阈值（字符数）
  private static readonly CHUNK_THRESHOLD = 15000;
  private static readonly MAX_CHUNK_SIZE = 20000;

  // Token 限制
  private static readonly MAX_TOKENS = 30000;
  private static readonly MIN_TOKENS = 4000;

  // 重试配置
  private static readonly MAX_RETRIES = 5;
  private static readonly RETRY_BASE_DELAY = 2000;

  // 自适应轮次策略
  private static readonly ADAPTIVE_STRATEGY: Record<string, number[]> = {
    zerogpt_high: [3, 4, 6],
    gptzero_high: [2, 4, 5],
    copyleaks_high: [1, 2, 6],
    default: [1, 2, 3, 4, 5],
  };

  // 风格配置 (中英双语)
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
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    const ratio = chineseChars.length / text.length;
    return ratio > 0.1 ? 'zh' : 'en';
  }

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
    return 'moonshot';
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

    if (text.length > LLMClient.CHUNK_THRESHOLD) {
      return this.processLongText(text, { rounds, targetScore, style, model });
    }

    return this.processShortText(text, { rounds, targetScore, style, model });
  }

  // 处理短文本（带自适应策略）
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
    let nextRound = 1;

    for (let i = 0; i < rounds; i++) {
      const instruction = this.getInstruction(nextRound, style, targetScore, false, currentText);
      usedRounds.push(nextRound);

      console.log(`[LLMClient] 执行第 ${i + 1}/${rounds} 轮处理（策略 #${nextRound}）`);

      currentText = await this.chatWithRetry(currentText, instruction, model);

      const scores = await this.detectorClient.detectAll(currentText);
      roundScores.push([scores.zerogpt, scores.gptzero, scores.copyleaks]);

      const avgScore = (scores.zerogpt + scores.gptzero + scores.copyleaks) / 3;
      console.log(`[LLMClient] 轮次 ${i + 1} 完成，平均分数: ${(avgScore * 100).toFixed(1)}%`);

      if (avgScore <= targetScore) {
        console.log(`[LLMClient] 已达到目标分数，提前结束`);
        break;
      }

      if (i < rounds - 1) {
        nextRound = this.selectNextRound(scores, usedRounds, i + 2);
      }
    }

    const finalScores = await this.detectorClient.detectAll(currentText);
    return { processedText: currentText, detectionScores: finalScores, roundScores, model, provider: this.provider };
  }

  // 自适应策略选择
  private selectNextRound(
    scores: { zerogpt: number; gptzero: number; copyleaks: number },
    usedRounds: number[],
    currentIteration: number
  ): number {
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

    for (const round of strategy) {
      if (!usedRounds.includes(round)) {
        return round;
      }
    }

    const defaultRound = Math.min(currentIteration, 6);
    return usedRounds.includes(defaultRound) ? (defaultRound % 6) + 1 : defaultRound;
  }

  // 处理长文本
  private async processLongText(text: string, options: {
    rounds: number;
    targetScore: number;
    style: string;
    model: string;
  }): Promise<ProcessingResult> {
    const { rounds, targetScore, style, model } = options;

    const chunks = this.splitTextIntoChunks(text);
    console.log(`[LLMClient] 长文分段处理: ${text.length} 字符 → ${chunks.length} 段`);

    const processedChunks: string[] = [];
    const allRoundScores: number[][] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[LLMClient] 处理第 ${i + 1}/${chunks.length} 段 (${chunk.length} 字符)`);

      let currentChunk = chunk;

      for (let round = 1; round <= rounds; round++) {
        const instruction = this.getInstruction(round, style, targetScore, true, currentChunk);
        currentChunk = await this.chatWithRetry(currentChunk, instruction, model);
      }

      processedChunks.push(currentChunk);
    }

    const processedText = processedChunks.join('\n\n');
    const finalScores = await this.detectorClient.detectAll(processedText);
    allRoundScores.push([finalScores.zerogpt, finalScores.gptzero, finalScores.copyleaks]);

    return {
      processedText,
      detectionScores: finalScores,
      roundScores: allRoundScores,
      model,
      provider: this.provider,
    };
  }

  // 分割文本
  private splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if (para.length > LLMClient.MAX_CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        const sentences = para.split(/(?<=[。！？.!?])\s*/);
        let sentenceChunk = '';
        for (const sentence of sentences) {
          if ((sentenceChunk + sentence).length > LLMClient.MAX_CHUNK_SIZE) {
            if (sentenceChunk) chunks.push(sentenceChunk.trim());
            sentenceChunk = sentence;
          } else {
            sentenceChunk += sentence;
          }
        }
        if (sentenceChunk) currentChunk = sentenceChunk;
        continue;
      }

      if ((currentChunk + '\n\n' + para).length > LLMClient.CHUNK_THRESHOLD && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = para;
      } else {
        currentChunk = currentChunk ? currentChunk + '\n\n' + para : para;
      }
    }

    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks.filter(c => c.length > 0);
  }

  // 带重试的 API 调用
  private async chatWithRetry(text: string, instruction: string, model: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= LLMClient.MAX_RETRIES; attempt++) {
      try {
        return await this.chat(text, instruction, model);
      } catch (error) {
        lastError = error as Error;
        const isRetryable = this.isRetryableError(error);

        if (!isRetryable || attempt === LLMClient.MAX_RETRIES) {
          console.error(`[LLMClient] 第 ${attempt} 次尝试失败:`, lastError.message);
          throw lastError;
        }

        const delay = LLMClient.RETRY_BASE_DELAY * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`[LLMClient] 第 ${attempt} 次尝试失败，${Math.round(delay / 1000)}s 后重试`);
        await this.sleep(delay);
      }
    }

    throw lastError || new Error('Unknown error during chat');
  }

  private isRetryableError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return (
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('fetch failed') ||
      message.includes('econnreset') ||
      message.includes('socket hang up') ||
      message.includes('429') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async chat(text: string, instruction: string, model: string): Promise<string> {
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

  /**
   * 获取人性化指令 - 基于 AI 检测器原理的科学策略
   */
  private getInstruction(round: number, style: string, targetScore: number, isChunk: boolean = false, inputText?: string): string {
    const lang = inputText ? this.detectLanguage(inputText) : 'zh';
    const chunkNote = lang === 'zh'
      ? (isChunk ? '\n\n【片段处理注意】这是长文的一个片段，保持内容连贯，不要添加开头语或结尾总结。' : '')
      : (isChunk ? '\n\n[CHUNK NOTE] This is a segment of a longer text. Maintain continuity, do not add introductions or conclusions.' : '');
    const styleConfig = LLMClient.STYLE_CONFIG[lang]?.[style] || LLMClient.STYLE_CONFIG[lang]?.casual || LLMClient.STYLE_CONFIG.zh.casual;

    // 中文指令
    const instructionsZh: Record<number, string> = {
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

      2: `【角色】你是一位语言学家，专注于句法结构的自然变异。

【核心任务】重组句子结构，制造人类写作特有的"突发性"(Burstiness)。

【什么是突发性】
人类写作的句子长度会剧烈变化：有时很短，有时很长。AI 写作则倾向于均匀的句子长度。

【句法重组策略】
1. 句长变异：在长句后插入短句，将部分长句拆成2-3个短句
2. 句式变换：改变主谓宾顺序，将陈述句改为反问句或感叹句
3. 段落节奏：有的段落只有一两句话，有的段落信息密集

【风格要求】${styleConfig.tone}
【结构参考】${styleConfig.structure}

直接输出改写后的文本，禁止任何解释。`,

      3: `【角色】你是一位词汇学专家，擅长丰富文本的词汇层次。

【核心任务】增加词汇多样性，提高文本"困惑度"(Perplexity)。

【词汇多样化策略】
1. 同义替换但不生硬：选择同样自然但更少用的表达
2. 打破固定搭配："取得成功"→"事儿成了"/"搞定了"
3. 引入具象表达：用具体比喻替代抽象描述
4. 口语化词汇（如果风格允许）：语气词、口语表达

【风格要求】${styleConfig.tone}
【词汇选择】${styleConfig.vocabulary}

直接输出改写后的文本，禁止任何解释。`,

      4: `【角色】你是一位心理语言学家，专门研究人类写作中的思维痕迹。

【核心任务】注入人类思维过程的痕迹，让文本带有"思考的味道"。

【注入策略】
1. 插入思维痕迹："说到这儿，我想起..."、"老实说，..."
2. 表达不确定性："大概是..."、"这点我不太确定，但..."
3. 个人立场表达："我个人觉得..."、"不得不说，..."
4. 情感反应："有意思的是..."、"让人惊讶的是..."

【风格要求】${styleConfig.tone}
【个性表达】${styleConfig.personality}

直接输出改写后的文本，禁止任何解释。`,

      5: `【角色】你是一位资深作家和文字打磨专家。

【核心任务】最终打磨，确保文本既能通过 AI 检测，又保持高质量。

【打磨要点】
1. 自然度检查：读出来是否像人说的话？
2. 独特性注入：添加1-2处独特观点或比喻
3. 不完美性：人类写作不会完美，可以有轻微的重复
4. 最终节奏调整：开头吸引人，结尾自然（不是AI式总结）

【风格要求】${styleConfig.tone}
【质量标准】保持原意准确性的同时，确保文本无AI痕迹

直接输出改写后的文本，禁止任何解释。`,

      6: `【角色】你是一位反AI检测专家，专门处理顽固的AI痕迹。

【核心任务】对仍有AI痕迹的文本进行极限处理。

【极限处理策略】
1. 完全重写关键句子：用完全不同的方式表达同一意思
2. 引入意外元素：一个出人意料的类比或小故事
3. 破坏AI模式：打破"问题-分析-解决"模式
4. 增加人类"缺陷"：一处轻微的信息冗余或不那么精确但更生动的表达

【风格要求】${styleConfig.tone}

直接输出改写后的文本，禁止任何解释。`,
    };

    // English instructions
    const instructionsEn: Record<number, string> = {
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

      2: `[ROLE] You are a linguist specializing in natural syntactic variation.

[CORE TASK] Restructure sentences to create the "burstiness" characteristic of human writing.

[WHAT IS BURSTINESS]
Human writing has dramatic sentence length variation: sometimes very short, sometimes very long. AI writing tends to have uniform sentence lengths.

[SYNTACTIC RESTRUCTURING STRATEGIES]
1. Sentence length variation: Insert short sentences after long ones, split some long sentences into 2-3 short ones
2. Sentence structure changes: Change subject-verb-object order, convert statements to rhetorical questions or exclamations
3. Paragraph rhythm: Some paragraphs have only one or two sentences, some are information-dense

[STYLE] ${styleConfig.tone}
[STRUCTURE] ${styleConfig.structure}

Output the rewritten text directly. No explanations.`,

      3: `[ROLE] You are a vocabulary expert skilled at enriching text with varied word choices.

[CORE TASK] Increase vocabulary diversity to raise the text's "perplexity."

[VOCABULARY DIVERSIFICATION STRATEGIES]
1. Synonym substitution without awkwardness: Choose equally natural but less common expressions
2. Break fixed collocations: "achieve success" → "pulled it off" / "got it done"
3. Introduce concrete expressions: Use specific metaphors instead of abstract descriptions
4. Colloquial vocabulary (if style permits): Interjections, casual expressions

[STYLE] ${styleConfig.tone}
[VOCABULARY] ${styleConfig.vocabulary}

Output the rewritten text directly. No explanations.`,

      4: `[ROLE] You are a psycholinguist specializing in traces of human thought in writing.

[CORE TASK] Inject traces of human thought processes to give the text a "thinking flavor."

[INJECTION STRATEGIES]
1. Insert thought traces: "Speaking of which, I remember...", "Honestly,..."
2. Express uncertainty: "probably...", "I'm not entirely sure about this, but..."
3. Personal stance expressions: "Personally, I think...", "I have to say,..."
4. Emotional reactions: "Interestingly enough...", "What's surprising is..."

[STYLE] ${styleConfig.tone}
[PERSONALITY] ${styleConfig.personality}

Output the rewritten text directly. No explanations.`,

      5: `[ROLE] You are a senior writer and text polishing expert.

[CORE TASK] Final polish to ensure the text passes AI detection while maintaining high quality.

[POLISHING POINTS]
1. Naturalness check: Does it sound like something a person would say?
2. Uniqueness injection: Add 1-2 unique viewpoints or metaphors
3. Imperfection: Human writing isn't perfect, can have slight repetition
4. Final rhythm adjustment: Engaging opening, natural ending (not AI-style summary)

[STYLE] ${styleConfig.tone}
[QUALITY] Maintain accuracy while ensuring no AI traces

Output the rewritten text directly. No explanations.`,

      6: `[ROLE] You are an anti-AI detection expert specializing in stubborn AI traces.

[CORE TASK] Apply extreme processing to text that still shows AI traces.

[EXTREME PROCESSING STRATEGIES]
1. Complete sentence rewrites: Express the same meaning in a completely different way
2. Introduce unexpected elements: A surprising analogy or small story
3. Break AI patterns: Deliberately break "problem-analysis-solution" patterns
4. Add human "imperfections": One slight information redundancy or less precise but more vivid expression

[STYLE] ${styleConfig.tone}

Output the rewritten text directly. No explanations.`,
    };

    const instructions = lang === 'zh' ? instructionsZh : instructionsEn;
    const instruction = instructions[round] || instructions[1];
    return instruction + chunkNote;
  }

  getConfig() {
    return { provider: this.provider, model: this.model, baseUrl: this.baseUrl };
  }
}
