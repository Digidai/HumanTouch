'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Upload, Download, FileText, AlertCircle, RotateCcw, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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
  const t = useTranslations('batch');
  const tProcessor = useTranslations('processor');
  const tCommon = useTranslations('common');
  const { batchProcess, loading, error } = useApi();

  const styleOptions = [
    { value: 'casual', label: tProcessor('options.styles.casual') },
    { value: 'academic', label: tProcessor('options.styles.academic') },
    { value: 'professional', label: tProcessor('options.styles.professional') },
    { value: 'creative', label: tProcessor('options.styles.creative') },
  ];

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
    const validFiles = uploadedFiles.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension === 'txt' || extension === 'md';
    });

    setFiles((prev) => [...prev, ...validFiles]);

    // 创建任务记录
    const newTasks = validFiles.map((file) => ({
      id: `${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
      filename: file.name,
      status: 'pending' as const,
      progress: 0,
    }));

    setTasks((prev) => [...prev, ...newTasks]);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const droppedFiles = Array.from(event.dataTransfer.files);
    const validFiles = droppedFiles.filter((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      return extension === 'txt' || extension === 'md';
    });

    setFiles((prev) => [...prev, ...validFiles]);

    const newTasks = validFiles.map((file) => ({
      id: `${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
      filename: file.name,
      status: 'pending' as const,
      progress: 0,
    }));

    setTasks((prev) => [...prev, ...newTasks]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const processBatch = async () => {
    if (files.length === 0) return;

    const fileContents = await Promise.all(
      files.map(async (file) => {
        const content = await file.text();
        return { filename: file.name, content };
      })
    );

    try {
      setTasks((prev) =>
        prev.map((task) => ({ ...task, status: 'processing' as const, progress: 50 }))
      );

      const response = await batchProcess({
        texts: fileContents.map((f) => f.content),
        options,
        filenames: fileContents.map((f) => f.filename),
      });

      setTasks((prev) =>
        prev.map((task, index) => ({
          ...task,
          status: 'completed' as const,
          progress: 100,
          result: response.results[index],
        }))
      );
    } catch (err) {
      console.error('Batch processing failed:', err);
      setTasks((prev) =>
        prev.map((task) => ({
          ...task,
          status: 'failed' as const,
          error: t('error.processingFailed'),
        }))
      );
      setNotice(t('error.batchFailed'));
    }
  };

  const downloadResults = () => {
    const completedTasks = tasks.filter((task) => task.status === 'completed' && task.result);

    const results = completedTasks.map((task) => ({
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
    const completedTasks = tasks.filter((task) => task.status === 'completed' && task.result);

    completedTasks.forEach((task) => {
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
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚡';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-[var(--stone-500)]';
      case 'processing':
        return 'text-[var(--coral-600)]';
      case 'completed':
        return 'text-[var(--teal-600)]';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-[var(--stone-500)]';
    }
  };

  return (
    <Card title={t('title')} description={t('description')} icon={<Upload className="w-5 h-5" />}>
      <div className="space-y-8">
        {/* File Upload Area */}
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 ${
              dragOver
                ? 'border-[var(--coral-400)] bg-[var(--coral-50)]'
                : 'border-[var(--stone-300)] hover:border-[var(--coral-300)] hover:bg-[var(--stone-50)]'
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--coral-50)] to-[var(--coral-100)] flex items-center justify-center mx-auto mb-4">
              <Upload className="h-7 w-7 text-[var(--coral-500)]" />
            </div>
            <p className="text-[var(--stone-700)] font-medium mb-2">{t('upload.dragDrop')}</p>
            <p className="text-sm text-[var(--stone-500)] mb-4">{t('upload.formats')}</p>
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
              variant="outline"
            >
              {t('upload.selectFiles')}
            </Button>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="card overflow-hidden">
              <table className="min-w-full divide-y divide-[var(--stone-200)]">
                <thead className="bg-[var(--stone-50)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--stone-500)] uppercase tracking-wider">
                      {t('table.filename')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--stone-500)] uppercase tracking-wider">
                      {t('table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--stone-500)] uppercase tracking-wider">
                      {t('table.size')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--stone-500)] uppercase tracking-wider">
                      {t('table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-[var(--stone-100)]">
                  {files.map((file, index) => (
                    <tr key={index} className="hover:bg-[var(--stone-50)] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--stone-900)]">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-[var(--coral-500)]" />
                          {file.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span
                          className={`inline-flex items-center ${getStatusColor(tasks[index]?.status || 'pending')}`}
                        >
                          {getStatusIcon(tasks[index]?.status || 'pending')}
                          <span className="ml-1">{tCommon(tasks[index]?.status || 'pending')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--stone-500)] tabular-nums">
                        {(file.size / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => removeFile(index)}
                          className="text-red-500 hover:text-red-700 font-medium transition-colors"
                        >
                          {t('table.remove')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Processing Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Select
            label={tProcessor('options.style')}
            value={options.style}
            onChange={(e) =>
              setOptions({
                ...options,
                style: e.target.value as 'casual' | 'academic' | 'professional' | 'creative',
              })
            }
            options={styleOptions}
            disabled={loading}
          />

          <Input
            label={tProcessor('options.rounds')}
            type="number"
            min={1}
            max={5}
            value={options.rounds}
            onChange={(e) => setOptions({ ...options, rounds: parseInt(e.target.value) || 3 })}
            disabled={loading}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          />

          <Input
            label={tProcessor('options.targetScore')}
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={options.target_score}
            onChange={(e) => {
              const nextValue = parseFloat(e.target.value);
              setOptions({ ...options, target_score: Number.isNaN(nextValue) ? 0.1 : nextValue });
            }}
            helperText={tProcessor('options.targetScoreHint')}
            disabled={loading}
            leftIcon={<Target className="w-4 h-4" />}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <div className="space-x-2">
            <Button
              onClick={processBatch}
              disabled={files.length === 0 || loading}
              loading={loading}
            >
              {t('actions.startBatch')}
            </Button>

            <Button
              onClick={() => {
                setFiles([]);
                setTasks([]);
              }}
              variant="ghost"
              disabled={files.length === 0}
            >
              {t('actions.clearList')}
            </Button>
          </div>

          <div className="space-x-2">
            <Button
              onClick={downloadResults}
              disabled={!tasks.some((task) => task.status === 'completed')}
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{t('actions.downloadResults')}</span>
            </Button>

            <Button
              onClick={downloadProcessedFiles}
              disabled={!tasks.some((task) => task.status === 'completed')}
              variant="ghost"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>{t('actions.downloadFiles')}</span>
            </Button>
          </div>
        </div>

        {notice && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-amber-600 mr-3 flex-shrink-0" />
              <p className="text-sm text-amber-800">{notice}</p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-800">{t('error.title')}</p>
                <p className="text-sm text-red-600 mt-1">{error.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
