"""
HumanTouch Python SDK

AI内容人性化处理系统的Python SDK，用于将AI生成的文本转换为更自然的人类写作风格。
"""

from .client import HumanTouchClient
from .exceptions import HumanTouchError
from .models import (
    ProcessOptions,
    ProcessResponse,
    BatchRequest,
    BatchResponse,
    AsyncTaskResponse,
    TaskStatusResponse,
    ValidateRequest,
    ValidateResponse,
)

__version__ = "1.0.0"
__author__ = "HumanTouch Team"
__email__ = "support@humantouch.dev"

__all__ = [
    "HumanTouchClient",
    "HumanTouchError",
    "ProcessOptions",
    "ProcessResponse",
    "BatchRequest",
    "BatchResponse",
    "AsyncTaskResponse",
    "TaskStatusResponse",
    "ValidateRequest",
    "ValidateResponse",
]