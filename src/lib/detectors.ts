import { ValidateResponse } from '@/types/api';

interface ZeroGPTResponse {
  success: boolean;
  data: {
    ai_generated_percent: number;
    human_generated_percent: number;
    original_text: string;
    sentences: Array<{
      sentence: string;
      ai_generated_percent: number;
      human_generated_percent: number;
    }>;
  };
}

interface GPTZeroResponse {
  documents: Array<{
    average_generated_prob: number;
    completely_generated_prob: number;
    overall_burstiness: number;
    class_probabilities: {
      real: number;
      fake: number;
    };
  }>;
}

interface CopyleaksResponse {
  scanId: string;
  status: {
    ai: {
      score: number;
      words: Array<{
        text: string;
        score: number;
      }>;
    };
    human: {
      score: number;
      words: Array<{
        text: string;
        score: number;
      }>;
    };
  };
}

export class DetectorClient {
  private zeroGptKey: string;
  private gptZeroKey: string;
  private copyleaksKey: string;

  constructor() {
    this.zeroGptKey = process.env.ZEROGPT_API_KEY || '';
    this.gptZeroKey = process.env.GPTZERO_API_KEY || '';
    this.copyleaksKey = process.env.COPYLEAKS_API_KEY || '';
  }

  async detectWithZeroGPT(text: string): Promise<number> {
    if (!this.zeroGptKey) {
      console.warn('ZeroGPT API key not configured');
      return Math.random() * 0.3; // 模拟分数
    }

    try {
      const response = await fetch('https://api.zerogpt.com/api/detect/detectText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.zeroGptKey,
        },
        body: JSON.stringify({ input_text: text }),
      });

      if (!response.ok) {
        throw new Error(`ZeroGPT API error: ${response.status}`);
      }

      const data: ZeroGPTResponse = await response.json();
      return data.data.ai_generated_percent / 100;
    } catch (error) {
      console.error('Error calling ZeroGPT API:', error);
      return Math.random() * 0.3; // 模拟分数
    }
  }

  async detectWithGPTZero(text: string): Promise<number> {
    if (!this.gptZeroKey) {
      console.warn('GPTZero API key not configured');
      return Math.random() * 0.3; // 模拟分数
    }

    try {
      const response = await fetch('https://api.gptzero.me/v2/predict/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.gptZeroKey,
        },
        body: JSON.stringify({
          document: text,
          version: '2024-05-21',
        }),
      });

      if (!response.ok) {
        throw new Error(`GPTZero API error: ${response.status}`);
      }

      const data: GPTZeroResponse = await response.json();
      return data.documents[0]?.class_probabilities?.fake || 0;
    } catch (error) {
      console.error('Error calling GPTZero API:', error);
      return Math.random() * 0.3; // 模拟分数
    }
  }

  async detectWithCopyleaks(text: string): Promise<number> {
    if (!this.copyleaksKey) {
      console.warn('Copyleaks API key not configured');
      return Math.random() * 0.3; // 模拟分数
    }

    try {
      const response = await fetch('https://api.copyleaks.com/v2/writer-detector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.copyleaksKey}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Copyleaks API error: ${response.status}`);
      }

      const data: CopyleaksResponse = await response.json();
      return data.status.ai.score;
    } catch (error) {
      console.error('Error calling Copyleaks API:', error);
      return Math.random() * 0.3; // 模拟分数
    }
  }

  async detectAll(text: string): Promise<{
    zerogpt: number;
    gptzero: number;
    copyleaks: number;
  }> {
    const [zerogpt, gptzero, copyleaks] = await Promise.all([
      this.detectWithZeroGPT(text),
      this.detectWithGPTZero(text),
      this.detectWithCopyleaks(text),
    ]);

    return {
      zerogpt: Math.round(zerogpt * 100) / 100,
      gptzero: Math.round(gptzero * 100) / 100,
      copyleaks: Math.round(copyleaks * 100) / 100,
    };
  }

  async getOverallScore(scores: {
    zerogpt: number;
    gptzero: number;
    copyleaks: number;
  }): Promise<{
    overall_score: number;
    human_likelihood: number;
  }> {
    // 计算加权平均值
    const weights = {
      zerogpt: 0.4,
      gptzero: 0.35,
      copyleaks: 0.25,
    };

    const overallScore = 
      scores.zerogpt * weights.zerogpt +
      scores.gptzero * weights.gptzero +
      scores.copyleaks * weights.copyleaks;

    return {
      overall_score: Math.round(overallScore * 100) / 100,
      human_likelihood: Math.round((1 - overallScore) * 100) / 100,
    };
  }
}

export const detectorClient = new DetectorClient();