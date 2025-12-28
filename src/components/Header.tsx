'use client';

import { useEffect, useState } from 'react';
import { FileText, User, KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApiKey } from '@/lib/api-client';

export function Header() {
  const { apiKey, saveApiKey, loadApiKey, clearApiKey } = useApiKey();
  const [inputKey, setInputKey] = useState('');

  useEffect(() => {
    loadApiKey();
  }, [loadApiKey]);

  return (
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
            <div className="flex items-center space-x-3">
              <div className={`flex items-center text-xs px-2 py-1 rounded-full ${apiKey ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                <User className="h-4 w-4 mr-1" />
                {apiKey ? '已设置 API Key' : '未设置 API Key'}
              </div>

              {apiKey ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => clearApiKey()}
                  className="flex items-center space-x-1 text-xs"
                >
                  <LogOut className="h-3 w-3" />
                  <span>清除 Key</span>
                </Button>
              ) : (
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      type="password"
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      placeholder="粘贴 API Key..."
                      className="block w-48 rounded-md border-gray-300 pr-8 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-xs"
                    />
                    <KeyRound className="h-3 w-3 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2" />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (inputKey.trim()) {
                        saveApiKey(inputKey.trim());
                        setInputKey('');
                      }
                    }}
                    className="text-xs"
                  >
                    保存 Key
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}