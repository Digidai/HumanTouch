'use client';

import { useState } from 'react';
import { FileText, User } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useApiKey } from '@/lib/api-client';

export function Header() {
  const { apiKey } = useApiKey();

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
            <div className="flex items-center text-sm text-green-600">
              <User className="h-4 w-4 mr-1" />
              系统运行中
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}