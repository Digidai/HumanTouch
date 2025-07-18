'use client';

import { useState } from 'react';
import type { ProcessResponse } from '@/types/api';
import { Play, Clock, AlertCircle } from 'lucide-react';
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
  const [result, setResult] = useState<ProcessResponse | { task_id: string; mode: 'async' } | null>(null);
  const [mode, setMode] = useState<'sync' | 'async'>('sync');
  const [webhookUrl, setWebhookUrl] = useState('');

  const handleProcess = async () => {
    if (!text.trim()) return;
    
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

  return (
    <Card title="文本处理" description="将AI生成的文本转换为更自然的人类写作风格">
      <div className="space-y-6">
        {/* 文本输入 */}
        <div>
          <Textarea
            label="输入文本"
            placeholder="粘贴需要处理的AI生成文本..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            maxLength={10000}
            disabled={loading || !apiKey}
          />
          <div className="text-sm text-gray-500 mt-1">{text.length}/10000 字符</div>
        </div>

        {/* 处理选项 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="写作风格"
            value={options.style}
            onChange={(e) => setOptions({ ...options, style: e.target.value as 'casual' | 'academic' | 'professional' | 'creative' })}
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
          />
          
          <Input
            label="目标分数"
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={options.target_score}
            onChange={(e) => setOptions({ ...options, target_score: parseFloat(e.target.value) || 0.1 })}
            helperText="0.0-1.0，越低越难检测为AI"
            disabled={loading}
          />
        </div>

        {/* 处理模式 */}
        <div className="flex space-x-4">
          <div className="flex items-center">
            <input
              type="radio"
              id="sync-mode"
              name="mode"
              value="sync"
              checked={mode === 'sync'}
              onChange={() => setMode('sync')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sync-mode" className="ml-2 text-sm text-gray-700">
              同步处理 (实时返回)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="radio"
              id="async-mode"
              name="mode"
              value="async"
              checked={mode === 'async'}
              onChange={() => setMode('async')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="async-mode" className="ml-2 text-sm text-gray-700">
              异步任务 (适合长文本)
            </label>
          </div>
        </div>

        {/* Webhook URL (异步模式) */}
        {mode === 'async' && (
          <Input
            label="Webhook通知URL (可选)"
            type="url"
            placeholder="https://your-webhook.com/callback"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            helperText="任务完成后会发送通知到此URL"
            disabled={loading}
          />
        )}

        {/* 处理按钮 */}
        <div className="flex justify-end">
          <Button
            onClick={handleProcess}
            disabled={loading || !text.trim() || !apiKey}
            loading={loading}
            className="flex items-center space-x-2"
          >
            <Play className="h-4 w-4" />
            <span>{mode === 'sync' ? '同步处理' : '创建任务'}</span>
          </Button>
        </div>

        {/* 结果展示 */}
        {result && (
          <div className="border-t pt-6">
            {mode === 'sync' ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">处理结果</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">AI检测分数</h4>
                    <div className="space-y-1 text-sm">
                      <div>ZeroGPT: {((result as ProcessResponse).detection_scores?.zerogpt * 100).toFixed(1)}%</div>
                      <div>GPTZero: {((result as ProcessResponse).detection_scores?.gptzero * 100).toFixed(1)}%</div>
                      <div>Copyleaks: {((result as ProcessResponse).detection_scores?.copyleaks * 100).toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2">处理信息</h4>
                    <div className="space-y-1 text-sm">
                      <div>处理时间: {(result as ProcessResponse).processing_time?.toFixed(2)}s</div>
                      <div>使用轮数: {(result as ProcessResponse).rounds_used}</div>
                      <div>文本长度: {(result as ProcessResponse).original_length} → {(result as ProcessResponse).processed_length}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">处理后的文本</h4>
                  <div className="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {(result as ProcessResponse).processed_text}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="font-medium">异步任务已创建</p>
                    <p className="text-sm text-gray-600">任务ID: {(result as { task_id: string }).task_id}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">{error.message}</p>
            </div>
          </div>
        )}

        {/* 未认证提示 */}
        {!apiKey && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800">请先设置API密钥以开始使用</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}