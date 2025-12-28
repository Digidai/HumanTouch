"""
数据模型定义
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ProcessOptions:
    """处理选项"""
    rounds: int = 3
    style: str = "casual"
    target_score: float = 0.1
    preserve_formatting: bool = False


@dataclass
class DetectionScores:
    """检测分数"""
    zerogpt: float
    gptzero: float
    copyleaks: float


@dataclass
class ProcessResponse:
    """处理响应"""
    processed_text: str
    original_length: int
    processed_length: int
    detection_scores: DetectionScores
    processing_time: float
    rounds_used: int


@dataclass
class BatchRequest:
    """批量处理请求"""
    texts: List[str]
    options: Optional[ProcessOptions] = None


@dataclass
class BatchResponse:
    """批量处理响应"""
    results: List[ProcessResponse]
    total_processed: int
    total_time: float


@dataclass
class AsyncOptions(ProcessOptions):
    """异步处理选项"""
    notify_url: Optional[str] = None


@dataclass
class AsyncTaskResponse:
    """异步任务响应"""
    task_id: str
    status: str
    estimated_time: int
    webhook_url: Optional[str] = None


@dataclass
class TaskStatusResponse:
    """任务状态响应"""
    task_id: str
    status: str
    result: Optional[ProcessResponse] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@dataclass
class ValidateRequest:
    """验证请求"""
    text: str
    detectors: Optional[List[str]] = None


@dataclass
class ValidateResponse:
    """验证响应"""
    text: str
    detection_scores: Dict[str, float]
    summary: Dict[str, float]


@dataclass
class ApiResponse:
    """通用API响应"""
    success: bool
    data: Optional[Any] = None
    error: Optional[Dict[str, str]] = None
    meta: Optional[Dict[str, str]] = None


@dataclass
class ConfigResponse:
    """配置响应"""
    max_text_length: int
    supported_styles: List[str]
    default_rounds: int
    max_concurrent_tasks: int
    webhook_support: bool
    polling_support: bool