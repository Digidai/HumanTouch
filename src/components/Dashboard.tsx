'use client';

import { useState } from 'react';
import { FileText, BarChart3, Upload, BookOpen } from 'lucide-react';
import { TextProcessor } from './TextProcessor';
import { TaskMonitor } from './TaskMonitor';
import { BatchProcessor } from './BatchProcessor';
import { Card } from '@/components/ui/Card';
import { useApiKey } from '@/lib/api-client';

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
  const { apiKey } = useApiKey();
  const [activeTab, setActiveTab] = useState('process');

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

        {/* 使用说明卡片 */}
        {!apiKey && (
          <Card className="mb-6">
            <div className="flex items-start space-x-4">
              <BookOpen className="h-6 w-6 text-blue-600 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-2">使用说明</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 首先点击右上角&quot;设置API密钥&quot;进行身份验证</li>
                  <li>• 使用&quot;文本处理&quot;处理单个文本，支持同步和异步模式</li>
                  <li>• 使用&quot;批量处理&quot;上传多个文本文件进行批量处理</li>
                  <li>• 使用&quot;任务监控&quot;查看所有异步任务的处理状态</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

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
        {apiKey && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card title="今日处理" description="今日处理的文本数量">
              <div className="text-2xl font-bold text-blue-600">
                0
                <span className="text-sm text-gray-500 font-normal ml-1">条</span>
              </div>
            </Card>
            <Card title="平均分数" description="AI检测平均分数">
              <div className="text-2xl font-bold text-green-600">
                0.0
                <span className="text-sm text-gray-500 font-normal ml-1">%</span>
              </div>
            </Card>
            <Card title="处理效率" description="平均处理时间">
              <div className="text-2xl font-bold text-purple-600">
                0.0
                <span className="text-sm text-gray-500 font-normal ml-1">秒</span>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}