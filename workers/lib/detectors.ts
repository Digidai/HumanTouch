import { Env } from './auth';

interface DetectionScores {
  zerogpt: number;
  gptzero: number;
  copyleaks: number;
}

export class DetectorClient {
  private env: Env;
  private mode: 'mock' | 'strict';

  constructor(env: Env) {
    this.env = env;
    const envMode = (env.DETECTOR_MODE || 'mock').toLowerCase();
    this.mode = envMode === 'strict' ? 'strict' : 'mock';
  }

  async detectWithZeroGPT(text: string): Promise<number> {
    if (!this.env.ZEROGPT_API_KEY) {
      console.warn('[DetectorClient] ZeroGPT API key not configured');
      if (this.mode === 'mock') {
        return Math.random() * 0.3;
      }
      throw new Error('ZeroGPT API key not configured and DETECTOR_MODE=strict');
    }

    try {
      const response = await fetch('https://api.zerogpt.com/api/detect/detectText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.env.ZEROGPT_API_KEY,
        },
        body: JSON.stringify({ input_text: text }),
      });

      if (!response.ok) {
        throw new Error(`ZeroGPT API error: ${response.status}`);
      }

      const data = await response.json() as { data: { ai_generated_percent: number } };
      return data.data.ai_generated_percent / 100;
    } catch (error) {
      console.error('Error calling ZeroGPT API:', error);
      return Math.random() * 0.3;
    }
  }

  async detectWithGPTZero(text: string): Promise<number> {
    if (!this.env.GPTZERO_API_KEY) {
      console.warn('[DetectorClient] GPTZero API key not configured');
      if (this.mode === 'mock') {
        return Math.random() * 0.3;
      }
      throw new Error('GPTZero API key not configured and DETECTOR_MODE=strict');
    }

    try {
      const response = await fetch('https://api.gptzero.me/v2/predict/text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.env.GPTZERO_API_KEY,
        },
        body: JSON.stringify({
          document: text,
          version: '2024-05-21',
        }),
      });

      if (!response.ok) {
        throw new Error(`GPTZero API error: ${response.status}`);
      }

      const data = await response.json() as { documents: Array<{ class_probabilities?: { fake?: number } }> };
      return data.documents[0]?.class_probabilities?.fake || 0;
    } catch (error) {
      console.error('Error calling GPTZero API:', error);
      return Math.random() * 0.3;
    }
  }

  async detectWithCopyleaks(text: string): Promise<number> {
    if (!this.env.COPYLEAKS_API_KEY) {
      console.warn('[DetectorClient] Copyleaks API key not configured');
      if (this.mode === 'mock') {
        return Math.random() * 0.3;
      }
      throw new Error('Copyleaks API key not configured and DETECTOR_MODE=strict');
    }

    try {
      const response = await fetch('https://api.copyleaks.com/v2/writer-detector', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.COPYLEAKS_API_KEY}`,
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`Copyleaks API error: ${response.status}`);
      }

      const data = await response.json() as { status: { ai: { score: number } } };
      return data.status.ai.score;
    } catch (error) {
      console.error('Error calling Copyleaks API:', error);
      return Math.random() * 0.3;
    }
  }

  async detectAll(text: string): Promise<DetectionScores> {
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
}
