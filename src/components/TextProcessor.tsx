'use client';

import { useState, useEffect, useRef } from 'react';
import type { ProcessResponse } from '@/types/api';
import {
  Play,
  Clock,
  AlertCircle,
  Sparkles,
  Copy,
  Check,
  Zap,
  Target,
  RotateCcw,
  Link2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { useApi, useLlmSettings } from '@/lib/api-client';

const styleOptions = [
  { value: 'casual', label: '轻松随意' },
  { value: 'academic', label: '学术正式' },
  { value: 'professional', label: '专业商务' },
  { value: 'creative', label: '创意写作' },
];

export function TextProcessor() {
  const { processText, createAsyncTask, loading, error } = useApi();
  const { apiKey: llmApiKey, model: llmModel, isConfigured } = useLlmSettings();

  const [text, setText] = useState('');
  const [options, setOptions] = useState({
    rounds: 3,
    style: 'casual' as 'casual' | 'academic' | 'professional' | 'creative',
    target_score: 0.1,
  });
  const [result, setResult] = useState<
    ProcessResponse | { task_id: string; mode: 'async' } | null
  >(null);
  const [mode, setMode] = useState<'sync' | 'async'>('sync');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState('');
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // 处理进度模拟
  const stages = [
    { progress: 10, text: '正在分析文本结构...' },
    { progress: 25, text: '第 1 轮人性化处理...' },
    { progress: 45, text: '第 2 轮语义重组...' },
    { progress: 65, text: '第 3 轮风格优化...' },
    { progress: 80, text: '正在进行 AI 检测评估...' },
    { progress: 95, text: '生成最终结果...' },
  ];

  const startProgress = () => {
    setProgress(0);
    setProgressStage(stages[0].text);
    let stageIndex = 0;

    progressInterval.current = setInterval(() => {
      stageIndex++;
      if (stageIndex < stages.length) {
        setProgress(stages[stageIndex].progress);
        setProgressStage(stages[stageIndex].text);
      }
    }, 2000 + Math.random() * 1000);
  };

  const stopProgress = (success: boolean) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    if (success) {
      setProgress(100);
      setProgressStage('处理完成！');
    }
  };

  useEffect(() => {
    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const handleProcess = async () => {
    if (!text.trim()) {
      setFieldError('请输入需要处理的文本');
      return;
    }

    setFieldError(null);
    setProgress(0);

    try {
      setResult(null);

      // Build request with optional custom LLM settings
      const requestOptions = isConfigured
        ? { ...options, model: llmModel! }
        : options;

      if (mode === 'sync') {
        startProgress();
        const response = await processText({
          text,
          options: requestOptions,
          ...(isConfigured && { api_key: llmApiKey! }),
        });
        stopProgress(true);
        setResult(response);
      } else {
        const task = await createAsyncTask(
          text,
          { ...requestOptions, notify_url: webhookUrl || undefined },
          isConfigured ? llmApiKey! : undefined
        );
        setResult({ task_id: task.task_id, mode: 'async' });
      }
    } catch (err) {
      stopProgress(false);
      setProgress(0);
      setProgressStage('');
      console.error('处理失败:', err);
    }
  };

  const handleCopy = async () => {
    if (result && 'processed_text' in result) {
      await navigator.clipboard.writeText(result.processed_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setText('');
    setResult(null);
    setFieldError(null);
  };

  return (
    <Card
      title="文本处理"
      description="将 AI 生成的文本转换为更自然的人类写作风格"
      icon={<Sparkles className="w-5 h-5" />}
    >
      <div className="space-y-8">
        {/* Text Input Area */}
        <div className="space-y-3">
          <Textarea
            label="输入文本"
            placeholder="粘贴需要处理的 AI 生成文本..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={30000}
            disabled={loading}
          />
          <div className="flex justify-between items-center text-sm">
            <span className={fieldError ? 'text-red-500' : 'text-[var(--stone-500)]'}>
              {fieldError ?? (text.length > 6000 ? '长文将自动分段处理' : '支持长文本，自动分段处理')}
            </span>
            <span className="text-[var(--stone-400)] tabular-nums">
              {text.length.toLocaleString()}/30,000
            </span>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Select
            label="写作风格"
            value={options.style}
            onChange={(e) =>
              setOptions({
                ...options,
                style: e.target.value as 'casual' | 'academic' | 'professional' | 'creative',
              })
            }
            options={styleOptions}
            disabled={loading}
          />

          <Input
            label="处理轮数"
            type="number"
            min={1}
            max={5}
            value={options.rounds}
            onChange={(e) => setOptions({ ...options, rounds: parseInt(e.target.value) || 3 })}
            disabled={loading}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          />

          <Input
            label="目标分数"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={options.target_score}
            onChange={(e) =>
              setOptions({ ...options, target_score: parseFloat(e.target.value) || 0.1 })
            }
            helperText="0.0-1.0，越低越难检测"
            disabled={loading}
            leftIcon={<Target className="w-4 h-4" />}
          />
        </div>

        {/* Processing Mode */}
        <div className="space-y-4">
          <label className="label">处理模式</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode('sync')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl border-2
                transition-all duration-200 text-sm font-medium
                ${
                  mode === 'sync'
                    ? 'border-[var(--coral-500)] bg-[var(--coral-50)] text-[var(--coral-700)]'
                    : 'border-[var(--stone-200)] bg-white/50 text-[var(--stone-600)] hover:border-[var(--stone-300)]'
                }
              `}
            >
              <Zap className="w-4 h-4" />
              <span>同步处理</span>
              <span className="text-xs opacity-70">实时返回</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('async')}
              className={`
                flex-1 flex items-center justify-center gap-2 px-5 py-4 rounded-xl border-2
                transition-all duration-200 text-sm font-medium
                ${
                  mode === 'async'
                    ? 'border-[var(--teal-500)] bg-[var(--teal-50)] text-[var(--teal-700)]'
                    : 'border-[var(--stone-200)] bg-white/50 text-[var(--stone-600)] hover:border-[var(--stone-300)]'
                }
              `}
            >
              <Clock className="w-4 h-4" />
              <span>异步任务</span>
              <span className="text-xs opacity-70">适合长文本</span>
            </button>
          </div>
        </div>

        {/* Webhook URL (Async Mode) */}
        {mode === 'async' && (
          <div className="animate-fade-in">
            <Input
              label="Webhook 通知 URL（可选）"
              type="url"
              placeholder="https://your-webhook.com/callback"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              helperText="任务完成后会发送通知到此 URL"
              disabled={loading}
              leftIcon={<Link2 className="w-4 h-4" />}
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          {text && (
            <Button variant="ghost" onClick={handleReset} disabled={loading}>
              清空
            </Button>
          )}
          <Button
            onClick={handleProcess}
            disabled={loading || !text.trim()}
            loading={loading}
            icon={<Play className="w-4 h-4" />}
          >
            {mode === 'sync' ? '开始处理' : '创建任务'}
          </Button>
        </div>

        {/* Progress Bar */}
        {loading && mode === 'sync' && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-white/80 backdrop-blur-sm border border-[var(--stone-200)]/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--coral-100)] to-[var(--coral-200)] flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-[var(--coral-600)] animate-spin" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--stone-800)]">正在处理</p>
                    <p className="text-sm text-[var(--stone-500)]">{progressStage}</p>
                  </div>
                </div>
                <span className="text-2xl font-display font-bold text-[var(--coral-600)]">
                  {progress}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative h-3 bg-[var(--stone-100)] rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-[var(--coral-500)] to-[var(--coral-400)] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
                {/* Shimmer effect */}
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full animate-pulse"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Stage Indicators */}
              <div className="flex justify-between mt-4 text-xs text-[var(--stone-400)]">
                <span className={progress >= 10 ? 'text-[var(--coral-500)]' : ''}>分析</span>
                <span className={progress >= 25 ? 'text-[var(--coral-500)]' : ''}>第1轮</span>
                <span className={progress >= 45 ? 'text-[var(--coral-500)]' : ''}>第2轮</span>
                <span className={progress >= 65 ? 'text-[var(--coral-500)]' : ''}>第3轮</span>
                <span className={progress >= 80 ? 'text-[var(--coral-500)]' : ''}>检测</span>
                <span className={progress >= 95 ? 'text-[var(--coral-500)]' : ''}>完成</span>
              </div>
            </div>

            {/* Processing Tips */}
            <div className="flex items-center gap-2 text-sm text-[var(--stone-500)] justify-center">
              <Sparkles className="w-4 h-4 text-[var(--coral-400)]" />
              <span>多轮处理可有效降低 AI 检测分数，请耐心等待...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="border-t border-[var(--stone-200)]/50 pt-8 animate-fade-in-up">
            {mode === 'sync' && 'processed_text' in result ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-semibold text-[var(--stone-900)]">
                    处理结果
                  </h3>
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-[var(--teal-500)]" />
                        <span>已复制</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>复制结果</span>
                      </>
                    )}
                  </Button>
                </div>

                {/* Score Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="card stat-card">
                    <p className="stat-label">ZeroGPT</p>
                    <p className="stat-value tabular-nums">
                      {((result as ProcessResponse).detection_scores?.zerogpt * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="card stat-card">
                    <p className="stat-label">GPTZero</p>
                    <p className="stat-value tabular-nums">
                      {((result as ProcessResponse).detection_scores?.gptzero * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="card stat-card">
                    <p className="stat-label">Copyleaks</p>
                    <p className="stat-value tabular-nums">
                      {((result as ProcessResponse).detection_scores?.copyleaks * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="card stat-card !bg-gradient-to-br !from-[var(--coral-50)] !to-[var(--coral-100)]">
                    <p className="stat-label !text-[var(--coral-600)]">处理时间</p>
                    <p className="stat-value tabular-nums !text-[var(--coral-700)]">
                      {(result as ProcessResponse).processing_time?.toFixed(2)}s
                    </p>
                  </div>
                </div>

                {/* Processed Text */}
                <div className="card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[var(--coral-500)]" />
                    <span className="label !mb-0">处理后的文本</span>
                    <span className="badge badge-gray">
                      {(result as ProcessResponse).original_length} → {(result as ProcessResponse).processed_length} 字符
                    </span>
                  </div>
                  <p className="text-[var(--stone-700)] leading-relaxed whitespace-pre-wrap text-pretty">
                    {(result as ProcessResponse).processed_text}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[var(--teal-50)] to-[var(--teal-100)] border border-[var(--teal-200)] rounded-xl p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--teal-500)] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--teal-800)]">异步任务已创建</p>
                    <p className="text-sm text-[var(--teal-600)]">
                      任务 ID: <code className="bg-white/50 px-2 py-0.5 rounded">{(result as { task_id: string }).task_id}</code>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">处理出错</p>
                <p className="text-sm text-red-600 mt-1">
                  {error.message || '处理过程中出现错误，请稍后重试。'}
                </p>
                {error.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-500 cursor-pointer hover:text-red-700">
                      查看详细信息
                    </summary>
                    <pre className="mt-2 text-xs text-red-500 bg-red-100/50 p-2 rounded overflow-x-auto">
                      {error.details}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </Card>
  );
}
