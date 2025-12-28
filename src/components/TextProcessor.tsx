'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { useApi, useApiKey } from '@/lib/api-client';

const styleOptions = [
  { value: 'casual', label: '轻松随意' },
  { value: 'academic', label: '学术正式' },
  { value: 'professional', label: '专业商务' },
  { value: 'creative', label: '创意写作' },
];

export function TextProcessor() {
  const { apiKey } = useApiKey();
  const { processText, createAsyncTask, loading, error } = useApi({ apiKey });

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

  const handleProcess = async () => {
    if (!text.trim()) {
      setFieldError('请输入需要处理的文本');
      return;
    }

    if (!apiKey) {
      setFieldError('请先在顶部设置 API Key');
      return;
    }

    setFieldError(null);

    try {
      setResult(null);

      if (mode === 'sync') {
        const response = await processText({ text, options });
        setResult(response);
      } else {
        const task = await createAsyncTask(text, {
          ...options,
          notify_url: webhookUrl || undefined,
        });
        setResult({ task_id: task.task_id, mode: 'async' });
      }
    } catch (err) {
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
            maxLength={10000}
            disabled={loading || !apiKey}
          />
          <div className="flex justify-between items-center text-sm">
            <span className={fieldError ? 'text-red-500' : 'text-[var(--stone-500)]'}>
              {fieldError ?? '最多支持 10,000 字符，建议分段处理长文'}
            </span>
            <span className="text-[var(--stone-400)] tabular-nums">
              {text.length.toLocaleString()}/10,000
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
          <label className="block text-sm font-medium text-[var(--stone-700)]">处理模式</label>
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
            disabled={loading || !text.trim() || !apiKey}
            loading={loading}
            icon={<Play className="w-4 h-4" />}
          >
            {mode === 'sync' ? '开始处理' : '创建任务'}
          </Button>
        </div>

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
                  <div className="bg-[var(--stone-50)] rounded-xl p-4">
                    <p className="text-xs text-[var(--stone-500)] mb-1">ZeroGPT</p>
                    <p className="font-display text-2xl font-bold text-[var(--stone-900)]">
                      {((result as ProcessResponse).detection_scores?.zerogpt * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-[var(--stone-50)] rounded-xl p-4">
                    <p className="text-xs text-[var(--stone-500)] mb-1">GPTZero</p>
                    <p className="font-display text-2xl font-bold text-[var(--stone-900)]">
                      {((result as ProcessResponse).detection_scores?.gptzero * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-[var(--stone-50)] rounded-xl p-4">
                    <p className="text-xs text-[var(--stone-500)] mb-1">Copyleaks</p>
                    <p className="font-display text-2xl font-bold text-[var(--stone-900)]">
                      {((result as ProcessResponse).detection_scores?.copyleaks * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-[var(--coral-50)] to-[var(--coral-100)] rounded-xl p-4">
                    <p className="text-xs text-[var(--coral-600)] mb-1">处理时间</p>
                    <p className="font-display text-2xl font-bold text-[var(--coral-700)]">
                      {(result as ProcessResponse).processing_time?.toFixed(2)}s
                    </p>
                  </div>
                </div>

                {/* Processed Text */}
                <div className="bg-white/80 backdrop-blur-sm border border-[var(--stone-200)]/50 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-4 h-4 text-[var(--coral-500)]" />
                    <span className="text-sm font-medium text-[var(--stone-700)]">处理后的文本</span>
                    <span className="text-xs text-[var(--stone-400)]">
                      ({(result as ProcessResponse).original_length} → {(result as ProcessResponse).processed_length} 字符)
                    </span>
                  </div>
                  <p className="text-[var(--stone-700)] leading-relaxed whitespace-pre-wrap">
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
              <div>
                <p className="font-medium text-red-800">处理出错</p>
                <p className="text-sm text-red-600 mt-1">
                  {error.code === 'RATE_LIMIT_EXCEEDED'
                    ? '请求过于频繁，请稍后再试。'
                    : error.message || '处理过程中出现错误，请稍后重试。'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* No API Key Warning */}
        {!apiKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">需要 API Key</p>
                <p className="text-sm text-amber-600 mt-1">
                  请先在页面顶部设置 API Key 以开始使用
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
