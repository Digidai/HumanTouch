'use client';

import { useEffect, useState } from 'react';
import { FileText, BarChart3, Upload } from 'lucide-react';
import { TextProcessor } from './TextProcessor';
import { TaskMonitor } from './TaskMonitor';
import { BatchProcessor } from './BatchProcessor';
import { Card } from '@/components/ui/Card';
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

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || TextProcessor;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI内容人性化处理系统</h1>
          <p className="mt-2 text-gray-600">
            将AI生成的文本转换为更自然的人类写作风格，有效降低AI检测概率
          </p>
        </div>

        {/* 标签导航 */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="transition-opacity duration-300">
          <ActiveComponent />
        </div>

        {/* 统计信息 */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card title="今日处理" description="今日处理的文本数量">
            <div className="text-2xl font-bold text-blue-600">
              {todayCount}
              <span className="text-sm text-gray-500 font-normal ml-1">条</span>
            </div>
          </Card>
          <Card title="平均分数" description="AI检测平均分数">
            <div className="text-2xl font-bold text-green-600">
              {(avgScore * 100).toFixed(1)}
              <span className="text-sm text-gray-500 font-normal ml-1">%</span>
            </div>
          </Card>
          <Card title="处理效率" description="平均处理时间">
            <div className="text-2xl font-bold text-purple-600">
              {avgTime.toFixed(2)}
              <span className="text-sm text-gray-500 font-normal ml-1">秒</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}