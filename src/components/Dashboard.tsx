'use client';

import { useEffect, useState } from 'react';
import { FileText, BarChart3, Upload, Zap, Clock, TrendingUp } from 'lucide-react';
import { TextProcessor } from './TextProcessor';
import { TaskMonitor } from './TaskMonitor';
import { BatchProcessor } from './BatchProcessor';
import { useApi, useApiKey } from '@/lib/api-client';
import type { TaskListResponse } from '@/types/api';

const tabs = [
  {
    id: 'process',
    name: '文本处理',
    icon: FileText,
    component: TextProcessor,
  },
  {
    id: 'batch',
    name: '批量处理',
    icon: Upload,
    component: BatchProcessor,
  },
  {
    id: 'monitor',
    name: '任务监控',
    icon: BarChart3,
    component: TaskMonitor,
  },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('process');
  const { apiKey } = useApiKey();
  const { getTasks } = useApi({ apiKey });
  const [todayCount, setTodayCount] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [avgTime, setAvgTime] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      if (!apiKey) return;

      try {
        const data: TaskListResponse = await getTasks({ limit: 100 });
        const tasks = data.tasks || [];

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        const todayTasks = tasks.filter((t: any) =>
          (t.completed_at || t.updated_at || t.created_at || '').startsWith(todayStr)
        );

        setTodayCount(todayTasks.length);

        let scoreSum = 0;
        let scoreCount = 0;
        let timeSum = 0;

        todayTasks.forEach((t: any) => {
          const result = t.result;
          if (result?.detection_scores) {
            const s = result.detection_scores;
            const avg = (s.zerogpt + s.gptzero + s.copyleaks) / 3;
            scoreSum += avg;
            scoreCount += 1;
          }
          if (result?.processing_time) {
            timeSum += result.processing_time;
          }
        });

        setAvgScore(scoreCount ? scoreSum / scoreCount : 0);
        setAvgTime(todayTasks.length ? timeSum / todayTasks.length : 0);
      } catch (e) {
        console.error('获取统计信息失败:', e);
      }
    };

    fetchStats();
  }, [apiKey, getTasks]);

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || TextProcessor;

  return (
    <div className="min-h-screen">
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-10">
        {/* Hero Section */}
        <div className="mb-12 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="decorative-dot" />
            <span className="text-sm font-medium text-[var(--coral-600)] uppercase tracking-wider">
              AI 内容优化
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--stone-900)] leading-tight mb-4">
            让 AI 文本更具
            <span className="text-gradient">人情味</span>
          </h1>
          <p className="text-lg text-[var(--stone-500)] max-w-2xl leading-relaxed">
            通过智能多轮处理，将 AI 生成的文本转换为更自然的人类写作风格，有效降低 AI 检测概率
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="card-hover animate-fade-in-up delay-100 opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-[var(--stone-200)]/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--coral-50)] to-[var(--coral-100)] flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[var(--coral-500)]" />
                </div>
                <span className="text-xs font-medium text-[var(--stone-400)] uppercase tracking-wider">
                  今日
                </span>
              </div>
              <div className="font-display text-3xl font-bold text-[var(--stone-900)] mb-1">
                {todayCount}
                <span className="text-lg font-normal text-[var(--stone-400)] ml-1">次</span>
              </div>
              <p className="text-sm text-[var(--stone-500)]">文本处理次数</p>
            </div>
          </div>

          <div className="card-hover animate-fade-in-up delay-200 opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-[var(--stone-200)]/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--teal-50)] to-[var(--teal-100)] flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-[var(--teal-500)]" />
                </div>
                <span className="text-xs font-medium text-[var(--stone-400)] uppercase tracking-wider">
                  平均
                </span>
              </div>
              <div className="font-display text-3xl font-bold text-[var(--stone-900)] mb-1">
                {(avgScore * 100).toFixed(1)}
                <span className="text-lg font-normal text-[var(--stone-400)] ml-1">%</span>
              </div>
              <p className="text-sm text-[var(--stone-500)]">AI 检测分数</p>
            </div>
          </div>

          <div className="card-hover animate-fade-in-up delay-300 opacity-0" style={{ animationFillMode: 'forwards' }}>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-[var(--stone-200)]/50 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-500" />
                </div>
                <span className="text-xs font-medium text-[var(--stone-400)] uppercase tracking-wider">
                  效率
                </span>
              </div>
              <div className="font-display text-3xl font-bold text-[var(--stone-900)] mb-1">
                {avgTime.toFixed(1)}
                <span className="text-lg font-normal text-[var(--stone-400)] ml-1">秒</span>
              </div>
              <p className="text-sm text-[var(--stone-500)]">平均处理时间</p>
            </div>
          </div>
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
              <span>AI 内容人性化处理</span>
            </div>
            <p className="text-sm text-[var(--stone-400)]">
              让每一段文字都充满温度
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
