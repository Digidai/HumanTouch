'use client';

import { useState } from 'react';
import { FileText, BarChart3, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TextProcessor } from './TextProcessor';
import { TaskMonitor } from './TaskMonitor';
import { BatchProcessor } from './BatchProcessor';

export function Dashboard() {
  const t = useTranslations('dashboard');
  const [activeTab, setActiveTab] = useState('process');

  const tabs = [
    {
      id: 'process',
      name: t('tabs.process'),
      icon: FileText,
      component: TextProcessor,
    },
    {
      id: 'batch',
      name: t('tabs.batch'),
      icon: Upload,
      component: BatchProcessor,
    },
    {
      id: 'monitor',
      name: t('tabs.monitor'),
      icon: BarChart3,
      component: TaskMonitor,
    },
  ];

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || TextProcessor;

  return (
    <div className="min-h-screen">
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="decorative-dot" />
            <span className="badge badge-coral">{t('hero.badge')}</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--stone-900)] leading-tight mb-4 text-balance">
            {t('hero.title')}
            <span className="text-gradient">{t('hero.highlight')}</span>
          </h1>
          <p className="text-lg text-[var(--stone-500)] max-w-2xl leading-relaxed text-pretty">
            {t('hero.description')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 animate-fade-in-up delay-400 opacity-0" style={{ animationFillMode: 'forwards' }}>
          <div className="inline-flex p-1.5 bg-[var(--stone-100)]/80 backdrop-blur-sm rounded-2xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium
                    transition-all duration-300 ease-out
                    ${
                      isActive
                        ? 'bg-white text-[var(--stone-900)] shadow-md'
                        : 'text-[var(--stone-500)] hover:text-[var(--stone-700)]'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--coral-500)]' : ''}`} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="animate-fade-in">
          <ActiveComponent />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--stone-200)]/50 mt-16">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-[var(--stone-500)]">
              <span className="font-display font-semibold text-[var(--stone-700)]">HumanTouch</span>
              <span className="text-[var(--stone-300)]">|</span>
              <span>{t('footer.tagline')}</span>
            </div>
            <p className="text-sm text-[var(--stone-400)]">
              {t('footer.slogan')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
