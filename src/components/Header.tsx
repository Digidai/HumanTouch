'use client';

import { useState, useEffect, useRef } from 'react';
import { Sparkles, Settings, X, Check, Key, Cpu, Globe, ChevronDown } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/routing';
import { useLlmSettings } from '@/lib/api-client';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function Header() {
  const t = useTranslations('header');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { apiKey, model, saveSettings, clearSettings, isConfigured } = useLlmSettings();
  const [showSettings, setShowSettings] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempModel, setTempModel] = useState('');
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close language menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const switchLocale = (newLocale: Locale) => {
    setShowLangMenu(false);
    router.replace(pathname, { locale: newLocale });
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
                {t('tagline')}
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
                    {model?.split('/').pop() || t('customModel')}
                  </span>
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4 text-[var(--stone-500)]" />
                  <span className="text-sm font-medium text-[var(--stone-600)]">
                    {t('publicMode')}
                  </span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <div className="relative" ref={langMenuRef}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-200 ${
                  showLangMenu
                    ? 'border-[var(--coral-300)] bg-[var(--coral-50)]'
                    : 'border-[var(--stone-200)] bg-white/50 hover:border-[var(--stone-300)]'
                }`}
              >
                <Globe className="w-4 h-4 text-[var(--stone-500)]" />
                <span className="text-sm font-medium text-[var(--stone-600)]">
                  {localeNames[locale]}
                </span>
                <ChevronDown className={`w-3 h-3 text-[var(--stone-400)] transition-transform duration-200 ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>
              {showLangMenu && (
                <div className="absolute right-0 mt-2 py-2 w-32 bg-white rounded-xl shadow-lg border border-[var(--stone-100)] animate-fade-in">
                  {locales.map((l) => (
                    <button
                      key={l}
                      onClick={() => switchLocale(l)}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-[var(--stone-50)] transition-colors ${
                        l === locale ? 'text-[var(--coral-600)] font-medium' : 'text-[var(--stone-600)]'
                      }`}
                    >
                      {localeNames[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-start justify-center pt-24">
          <div className="card card-elevated w-full max-w-md mx-4 animate-fade-in-up !bg-white">
            <div className="flex items-center justify-between p-5 border-b border-[var(--stone-100)]">
              <h2 className="font-display text-lg font-semibold text-[var(--stone-900)]">
                {t('settings.title')}
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
                <label className="label flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  {t('settings.apiKey')}
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="input-base"
                />
                <p className="caption">
                  {t('settings.apiKeyHint')} <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[var(--coral-600)] hover:underline">openrouter.ai/keys</a>
                </p>
              </div>

              <div className="space-y-2">
                <label className="label flex items-center gap-2">
                  <Cpu className="w-4 h-4" />
                  {t('settings.model')}
                </label>
                <input
                  type="text"
                  value={tempModel}
                  onChange={(e) => setTempModel(e.target.value)}
                  placeholder="anthropic/claude-sonnet-4"
                  className="input-base"
                />
                <p className="caption">
                  {t('settings.modelHint')}
                </p>
              </div>

              <div className="bg-[var(--stone-50)] rounded-xl p-4 text-sm text-[var(--stone-600)]">
                <p>{t('settings.notice')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-5 border-t border-[var(--stone-100)] bg-[var(--stone-50)]/50 rounded-b-2xl">
              {isConfigured && (
                <button
                  onClick={handleClear}
                  className="btn btn-ghost !text-red-600 hover:!bg-red-50"
                >
                  {t('settings.clear')}
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setShowSettings(false)}
                className="btn btn-ghost"
              >
                {t('settings.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={!tempApiKey.trim() || !tempModel.trim()}
                className="btn btn-primary"
              >
                <Check className="w-4 h-4" />
                {t('settings.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
