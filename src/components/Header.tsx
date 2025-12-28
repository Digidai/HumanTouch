'use client';

import { useState } from 'react';
import { Sparkles, Settings, X, Check, Key, Cpu } from 'lucide-react';
import { useLlmSettings } from '@/lib/api-client';

export function Header() {
  const { apiKey, model, saveSettings, clearSettings, isConfigured } = useLlmSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempModel, setTempModel] = useState('');

  const handleOpenSettings = () => {
    setTempApiKey(apiKey || '');
    setTempModel(model || '');
    setShowSettings(true);
  };

  const handleSave = () => {
    if (tempApiKey.trim() && tempModel.trim()) {
      saveSettings(tempApiKey.trim(), tempModel.trim());
      setShowSettings(false);
    }
  };

  const handleClear = () => {
    clearSettings();
    setTempApiKey('');
    setTempModel('');
    setShowSettings(false);
  };

  return (
    <header className="glass sticky top-0 z-50 animate-fade-in">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & Brand */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--coral-500)] to-[var(--coral-600)] flex items-center justify-center shadow-lg shadow-[var(--coral-500)]/20 animate-float">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[var(--teal-500)] border-2 border-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-[var(--stone-900)] tracking-tight">
                Human<span className="text-gradient">Touch</span>
              </h1>
              <p className="text-sm text-[var(--stone-500)] font-light">
                AI 内容人性化处理
              </p>
            </div>
          </div>

          {/* Settings Badge */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenSettings}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full border transition-all duration-200
                ${isConfigured
                  ? 'bg-[var(--teal-50)] border-[var(--teal-200)] hover:border-[var(--teal-300)]'
                  : 'bg-[var(--stone-50)] border-[var(--stone-200)] hover:border-[var(--stone-300)]'
                }
              `}
            >
              {isConfigured ? (
                <>
                  <Cpu className="w-4 h-4 text-[var(--teal-600)]" />
                  <span className="text-sm font-medium text-[var(--teal-700)]">
                    {model?.split('/').pop() || '自定义模型'}
                  </span>
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 text-[var(--stone-500)]" />
                  <span className="text-sm font-medium text-[var(--stone-600)]">
                    公开版 · 默认模型
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-24">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-[var(--stone-100)]">
              <h2 className="font-display text-lg font-semibold text-[var(--stone-900)]">
                自定义 LLM 设置
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-lg hover:bg-[var(--stone-100)] transition-colors"
              >
                <X className="w-5 h-5 text-[var(--stone-500)]" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--stone-700)]">
                  <Key className="w-4 h-4" />
                  OpenRouter API Key
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full px-4 py-3 rounded-xl border border-[var(--stone-200)] focus:border-[var(--coral-400)] focus:ring-2 focus:ring-[var(--coral-100)] outline-none transition-all text-sm"
                />
                <p className="text-xs text-[var(--stone-500)]">
                  从 <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--coral-600)] hover:underline">openrouter.ai/keys</a> 获取
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[var(--stone-700)]">
                  <Cpu className="w-4 h-4" />
                  模型名称
                </label>
                <input
                  type="text"
                  value={tempModel}
                  onChange={(e) => setTempModel(e.target.value)}
                  placeholder="anthropic/claude-sonnet-4"
                  className="w-full px-4 py-3 rounded-xl border border-[var(--stone-200)] focus:border-[var(--coral-400)] focus:ring-2 focus:ring-[var(--coral-100)] outline-none transition-all text-sm"
                />
                <p className="text-xs text-[var(--stone-500)]">
                  OpenRouter 模型 ID，如 <code className="bg-[var(--stone-100)] px-1 rounded">openai/gpt-4o</code>、<code className="bg-[var(--stone-100)] px-1 rounded">anthropic/claude-sonnet-4</code>
                </p>
              </div>

              <div className="bg-[var(--stone-50)] rounded-xl p-4 text-sm text-[var(--stone-600)]">
                <p>配置后，处理将使用您的 API Key 和指定模型。不配置则使用服务端默认模型。</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-5 border-t border-[var(--stone-100)] bg-[var(--stone-50)]/50 rounded-b-2xl">
              {isConfigured && (
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  清除配置
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--stone-600)] hover:bg-[var(--stone-100)] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={!tempApiKey.trim() || !tempModel.trim()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--coral-500)] hover:bg-[var(--coral-600)] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <Check className="w-4 h-4" />
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
