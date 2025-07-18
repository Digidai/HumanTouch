'use client';

import { useState } from 'react';
import { FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApiKey } from '@/lib/api-client';

export function Header() {
  const { apiKey, loadApiKey, saveApiKey, clearApiKey } = useApiKey();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  const handleSaveApiKey = () => {
    if (newApiKey.trim()) {
      saveApiKey(newApiKey.trim());
      setShowApiKeyModal(false);
      setNewApiKey('');
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">HumanTouch</h1>
                <p className="text-sm text-gray-600">AI内容人性化处理系统</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {apiKey ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-sm text-green-600">
                    <User className="h-4 w-4 mr-1" />
                    已认证
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={clearApiKey}
                  >
                    退出
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="primary" 
                  size="sm"
                  onClick={() => setShowApiKeyModal(true)}
                >
                  设置API密钥
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">设置API密钥</h3>
            <input
              type="password"
              placeholder="输入您的API密钥"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowApiKeyModal(false);
                  setNewApiKey('');
                }}
              >
                取消
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveApiKey}
              >
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}