'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Key, X, Check } from 'lucide-react';
import { useApiKey } from '@/lib/api-client';

export function Header() {
  const { apiKey, saveApiKey, loadApiKey, clearApiKey } = useApiKey();
  const [inputKey, setInputKey] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);

  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  const handleSaveKey = () => {
    if (inputKey.trim()) {
      saveApiKey(inputKey.trim());
      setInputKey('');
      setIsInputVisible(false);
    }
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

          {/* API Key Section */}
          <div className="flex items-center gap-3">
            {apiKey ? (
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--teal-50)] border border-[var(--teal-200)]">
                  <div className="status-dot status-dot-success" />
                  <span className="text-sm font-medium text-[var(--teal-700)]">
                    API 已连接
                  </span>
                </div>
                <button
                  onClick={() => clearApiKey()}
                  className="p-2 rounded-xl text-[var(--stone-400)] hover:text-[var(--coral-500)] hover:bg-[var(--coral-50)] transition-all duration-200"
                  aria-label="清除 API Key"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : isInputVisible ? (
              <div className="flex items-center gap-2 animate-slide-in-left">
                <div className="relative">
                  <input
                    type="password"
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
                    placeholder="输入 API Key..."
                    className="w-56 px-4 py-2.5 pr-10 rounded-xl border border-[var(--stone-200)] bg-white/80 text-sm focus:outline-none focus:border-[var(--coral-400)] focus:ring-2 focus:ring-[var(--coral-100)] transition-all duration-200 placeholder:text-[var(--stone-400)]"
                    autoFocus
                  />
                  <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--stone-400)]" />
                </div>
                <button
                  onClick={handleSaveKey}
                  disabled={!inputKey.trim()}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-[var(--coral-500)] to-[var(--coral-600)] text-white shadow-lg shadow-[var(--coral-500)]/25 hover:shadow-xl hover:shadow-[var(--coral-500)]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setIsInputVisible(false);
                    setInputKey('');
                  }}
                  className="p-2.5 rounded-xl text-[var(--stone-500)] hover:bg-[var(--stone-100)] transition-all duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsInputVisible(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--coral-500)] to-[var(--coral-600)] text-white text-sm font-medium shadow-lg shadow-[var(--coral-500)]/25 hover:shadow-xl hover:shadow-[var(--coral-500)]/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 animate-fade-in"
              >
                <Key className="w-4 h-4" />
                <span>设置 API Key</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
