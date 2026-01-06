'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useApi } from '@/lib/api-client';
import { TaskListItem } from '@/types/api';

interface Task {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
  result?: {
    processed_text?: string;
    detection_scores?: {
      zerogpt: number;
      gptzero: number;
      copyleaks: number;
    };
    processing_time?: number;
    rounds_used?: number;
  };
  error?: string;
  progress?: number;
}

export function TaskMonitor() {
  const t = useTranslations('monitor');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const { getTasks, getTaskStatus, loading, error } = useApi();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const selectedTaskRef = useRef<Task | null>(null);

  // Keep ref in sync with state for use in interval callback
  useEffect(() => {
    selectedTaskRef.current = selectedTask;
  }, [selectedTask]);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await getTasks({ limit: 50 });
      const normalized = (response.tasks || []).map((task: TaskListItem) => ({
        ...task,
        id: task.task_id,
      }));
      setTasks(normalized);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [getTasks]);

  const refreshTaskStatus = useCallback(
    async (taskId: string) => {
      try {
        const response = await getTaskStatus(taskId);
        const updatedTask = {
          ...response,
          id: response.task_id || taskId,
          status: response.status as Task['status'],
        };

        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? { ...task, ...updatedTask } : task))
        );

        // Update selectedTask if it matches
        if (selectedTaskRef.current?.id === taskId) {
          setSelectedTask(updatedTask);
        }
      } catch (err) {
        console.error('Failed to fetch task status:', err);
      }
    },
    [getTaskStatus]
  );

  // Initial fetch and polling setup
  useEffect(() => {
    fetchTasks();

    intervalRef.current = setInterval(() => {
      fetchTasks();

      // Refresh selected task if it's still processing
      const currentTask = selectedTaskRef.current;
      if (currentTask && ['pending', 'processing'].includes(currentTask.status)) {
        refreshTaskStatus(currentTask.id);
      }
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchTasks, refreshTaskStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US');
  };

  return (
    <Card title={t('title')} description={t('description')}>
      <div className="space-y-6">
        {/* Control Bar */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">{t('taskCount', { count: tasks.length })}</div>
          <Button
            onClick={fetchTasks}
            disabled={loading}
            loading={loading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t('refresh')}</span>
          </Button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">{t('empty.title')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('empty.description')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Task List */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.taskId')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.createdAt')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.updatedAt')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {task.id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
                        >
                          {getStatusIcon(task.status)}
                          <span className="ml-1">{tCommon(task.status)}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(task.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(task.updated_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            if (['pending', 'processing'].includes(task.status)) {
                              refreshTaskStatus(task.id);
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('table.view')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-sm text-red-800">{error.message || t('error.fetchFailed')}</p>
            </div>
          </div>
        )}

        {/* Task Detail Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">{t('detail.title')}</h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-700">{t('detail.taskId')}</h4>
                    <p className="text-sm font-mono">{selectedTask.id}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">{t('detail.status')}</h4>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}
                    >
                      {getStatusIcon(selectedTask.status)}
                      <span className="ml-1">{tCommon(selectedTask.status)}</span>
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">{t('detail.createdAt')}</h4>
                    <p className="text-sm">{formatTime(selectedTask.created_at)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700">{t('detail.updatedAt')}</h4>
                    <p className="text-sm">{formatTime(selectedTask.updated_at)}</p>
                  </div>
                </div>

                {selectedTask.error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-medium text-red-800 mb-2">{t('detail.errorInfo')}</h4>
                    <p className="text-sm text-red-700">{selectedTask.error}</p>
                  </div>
                )}

                {selectedTask.result && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">{t('detail.aiScores')}</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            ZeroGPT:{' '}
                            {((selectedTask.result?.detection_scores?.zerogpt ?? 0) * 100).toFixed(
                              1
                            )}
                            %
                          </div>
                          <div>
                            GPTZero:{' '}
                            {((selectedTask.result?.detection_scores?.gptzero ?? 0) * 100).toFixed(
                              1
                            )}
                            %
                          </div>
                          <div>
                            Copyleaks:{' '}
                            {(
                              (selectedTask.result?.detection_scores?.copyleaks ?? 0) * 100
                            ).toFixed(1)}
                            %
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">{t('detail.processingInfo')}</h4>
                        <div className="space-y-1 text-sm">
                          <div>
                            {t('detail.processingTime')}:{' '}
                            {(selectedTask.result.processing_time || 0).toFixed(2)}s
                          </div>
                          <div>
                            {t('detail.roundsUsed')}: {selectedTask.result.rounds_used || 0}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedTask.result.processed_text && (
                      <div>
                        <h4 className="font-medium mb-2">{t('detail.processedText')}</h4>
                        <div className="bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap font-sans">
                            {selectedTask.result.processed_text}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
