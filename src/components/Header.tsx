'use client';

import { Sparkles } from 'lucide-react';

export function Header() {
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

          {/* Access Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--stone-50)] border border-[var(--stone-200)]">
              <span className="text-sm font-medium text-[var(--stone-600)]">
                公开版 · 默认模型
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
