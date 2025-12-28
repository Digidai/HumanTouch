'use client';

import { useState } from 'react';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useApi } from '@/lib/api-client';

interface BatchTask {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    processed_text: string;
    detection_scores: {
      zerogpt: number;
      gptzero: number;
      copyleaks: number;
    };
  };
  error?: string;
}

export function BatchProcessor() {
  const { batchProcess, loading, error } = useApi();
  
  const [files, setFiles] = useState<File[]>([]);
  const [tasks, setTasks] = useState<BatchTask[]>([]);
  const [options, setOptions] = useState({
    rounds: 3,
    style: 'casual' as 'casual' | 'academic' | 'professional' | 'creative',
    target_score: 0.1,
  });
  const [dragOver, setDragOver] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    const validFiles = uploadedFiles.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension === 'txt' || extension === 'md';
    });
    
    setFiles(prev => [...prev, ...validFiles]);
    
    // 创建任务记录
    const newTasks = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename: file.name,
      status: 'pending' as const,
      progress: 0,
    }));
    
    setTasks(prev => [...prev, ...newTasks]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    const validFiles = droppedFiles.filter(file => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension === 'txt' || extension === 'md';
    });
    
    setFiles(prev => [...prev, ...validFiles]);
    
    const newTasks = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      filename: file.name,
      status: 'pending' as const,
      progress: 0,
    }));
    
    setTasks(prev => [...prev, ...newTasks]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const processBatch = async () => {
    if (files.length === 0) return;
    
    const fileContents = await Promise.all(
      files.map(async file => {
        const content = await file.text();
        return { filename: file.name, content };
      })
    );
    
    try {
      setTasks(prev => prev.map(task => ({ ...task, status: 'processing' as const, progress: 50 })));
      
      const response = await batchProcess({
        texts: fileContents.map(f => f.content),
        options,
        filenames: fileContents.map(f => f.filename),
      });
      
      setTasks(prev => prev.map((task, index) => ({
        ...task,
        status: 'completed' as const,
        progress: 100,
        result: response.results[index],
      })));
      
    } catch (err) {
      console.error('批处理失败:', err);
      setTasks(prev => prev.map(task => ({
        ...task,
        status: 'failed' as const,
        error: '处理失败',
      })));
      setNotice('批量处理失败，请检查网络或稍后重试。');
    }
  };

  const downloadResults = () => {
    const completedTasks = tasks.filter(task => task.status === 'completed' && task.result);
    
    const results = completedTasks.map(task => ({
      filename: task.filename,
      processed_text: task.result?.processed_text,
      detection_scores: task.result?.detection_scores,
    }));
    
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: 'application/json',
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadProcessedFiles = () => {
    const completedTasks = tasks.filter(task => task.status === 'completed' && task.result);
    
    completedTasks.forEach(task => {
      if (task.result?.processed_text) {
        const blob = new Blob([task.result.processed_text], {
          type: 'text/plain;charset=utf-8',
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `processed-${task.filename}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'processing': return '⚡';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'processing': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <Card title="批量处理" description="批量上传和处理多个文本文件">
      <div className="space-y-6">
        {/* 文件上传区域 */}
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">拖拽文件到此处或点击上传</p>
            <p className="text-sm text-gray-500 mb-4">支持 .txt 和 .md 格式文件</p>
            <input
              type="file"
              multiple
              accept=".txt,.md"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <Button
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              选择文件
            </Button>
          </div>

          {/* 文件列表 */}
          {files.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文件名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">大小</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-gray-400" />
                          {file.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center ${getStatusColor(tasks[index]?.status || 'pending')}`}>
                          {getStatusIcon(tasks[index]?.status || 'pending')}
                          <span className="ml-1">{tasks[index]?.status || 'pending'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-900"
                        >
                          移除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 处理选项 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            value={options.style}
            onChange={(e) => setOptions({ ...options, style: e.target.value as 'casual' | 'academic' | 'professional' | 'creative' })}
          >
            <option value="casual">轻松随意</option>
            <option value="academic">学术正式</option>
            <option value="professional">专业商务</option>
            <option value="creative">创意写作</option>
          </select>
          
          <input
            type="number"
            min="1"
            max="5"
            value={options.rounds}
            onChange={(e) => setOptions({ ...options, rounds: parseInt(e.target.value) || 3 })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="处理轮数"
          />
          
          <input
            type="number"
            min="0"
            max="1"
            step="0.01"
            value={options.target_score}
            onChange={(e) => setOptions({ ...options, target_score: parseFloat(e.target.value) || 0.1 })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="目标分数"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-between items-center">
          <div className="space-x-2">
            <Button
              onClick={processBatch}
              disabled={files.length === 0 || loading}
              loading={loading}
            >
              开始批量处理
            </Button>
            
            <Button
              onClick={() => {
                setFiles([]);
                setTasks([]);
              }}
              variant="ghost"
              disabled={files.length === 0}
            >
              清空列表
            </Button>
          </div>

          <div className="space-x-2">
            <Button
              onClick={downloadResults}
              disabled={!tasks.some(t => t.status === 'completed')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>下载结果</span>
            </Button>
            
            <Button
              onClick={downloadProcessedFiles}
              disabled={!tasks.some(t => t.status === 'completed')}
              variant="ghost"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>下载文件</span>
            </Button>
          </div>
        </div>

        {notice && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">{notice}</p>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">{error.message}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
