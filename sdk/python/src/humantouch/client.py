"""
Client implementation for HumanTouch SDK
"""

import time
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urljoin

import requests

from .exceptions import (
    AuthenticationError,
    HumanTouchError,
    NetworkError,
    RateLimitError,
    TaskNotFoundError,
    TaskTimeoutError,
    ValidationError,
)
from .models import (
    AsyncOptions,
    AsyncTaskResponse,
    BatchResponse,
    DetectionScores,
    ProcessOptions,
    ProcessResponse,
    TaskStatusResponse,
    ValidateResponse,
)


class HumanTouchClient:
    """HumanTouch API 客户端"""

    def __init__(
        self,
        api_key: str = "",
        base_url: str = "https://api.humantouch.dev",
        timeout: int = 30,
        retries: int = 3,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.retries = retries
        self._session = requests.Session()
        self._session.headers.update(
            {
                "Content-Type": "application/json",
                "User-Agent": "humantouch-sdk-python/1.0.0",
            }
        )
        if self.api_key:
            self._session.headers.update({"Authorization": f"Bearer {self.api_key}"})

    def set_api_key(self, api_key: str) -> None:
        """设置 API 密钥"""
        self.api_key = api_key
        self._session.headers.update({"Authorization": f"Bearer {self.api_key}"})

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None,
    ) -> Dict:
        """发送请求并处理通用的错误"""
        url = urljoin(self.base_url, endpoint)

        try:
            response = self._session.request(
                method, url, json=data, params=params, timeout=self.timeout
            )
        except requests.exceptions.RequestException as e:
            raise NetworkError(
                f"Network error occurred: {str(e)}", code="NETWORK_ERROR"
            )

        if 200 <= response.status_code < 300:
            return response.json()

        # 处理错误响应
        try:
            error_data = response.json()
            error_info = error_data.get("error", {})
            message = error_info.get("message", "Unknown error")
            code = error_info.get("code", "UNKNOWN_ERROR")
            details = error_info.get("details")
        except ValueError:
            message = response.text
            code = "UNKNOWN_ERROR"
            details = None

        if response.status_code == 401:
            raise AuthenticationError(message, code, details)
        elif response.status_code == 429:
            raise RateLimitError(message, code, details)
        elif response.status_code == 400:
            raise ValidationError(message, code, details)
        elif response.status_code == 404:
            raise TaskNotFoundError(message, code, details)
        else:
            raise HumanTouchError(message, code, details)

    def process(
        self, text: str, options: Optional[ProcessOptions] = None
    ) -> ProcessResponse:
        """
        同步处理文本
        """
        payload = {"text": text}
        if options:
            payload["options"] = {
                "rounds": options.rounds,
                "style": options.style,
                "target_score": options.target_score,
                "preserve_formatting": options.preserve_formatting,
            }

        data = self._request("POST", "/api/v1/process", data=payload)
        result = data["data"]

        return ProcessResponse(
            processed_text=result["processed_text"],
            original_length=result["original_length"],
            processed_length=result["processed_length"],
            detection_scores=DetectionScores(**result["detection_scores"]),
            processing_time=result["processing_time"],
            rounds_used=result["rounds_used"],
        )

    def batch(
        self, texts: List[str], options: Optional[ProcessOptions] = None
    ) -> BatchResponse:
        """
        批量处理文本
        """
        payload = {"texts": texts}
        if options:
            payload["options"] = {
                "rounds": options.rounds,
                "style": options.style,
                "target_score": options.target_score,
                "preserve_formatting": options.preserve_formatting,
            }

        data = self._request("POST", "/api/v1/batch", data=payload)
        result = data["data"]

        processed_results = []
        for item in result["results"]:
            processed_results.append(
                ProcessResponse(
                    processed_text=item["processed_text"],
                    original_length=len(
                        item["original_text"]
                    ),  # Assuming API returns original text or we infer length
                    processed_length=len(item["processed_text"]),
                    detection_scores=DetectionScores(**item["detection_scores"]),
                    processing_time=0,  # Individual times might not be exposed in batch summary
                    rounds_used=0,  # Individual rounds might not be exposed
                )
            )

        return BatchResponse(
            results=processed_results,
            total_processed=result["total_processed"],
            total_time=result["total_time"],
        )

    def create_async_task(
        self, text: str, options: Optional[AsyncOptions] = None
    ) -> AsyncTaskResponse:
        """
        创建异步任务
        """
        payload = {"text": text}
        if options:
            payload["options"] = {
                "rounds": options.rounds,
                "style": options.style,
                "target_score": options.target_score,
                "preserve_formatting": options.preserve_formatting,
                "notify_url": options.notify_url,
            }

        data = self._request("POST", "/api/v1/async", data=payload)
        result = data["data"]

        return AsyncTaskResponse(
            task_id=result["task_id"],
            status=result["status"],
            estimated_time=result["estimated_time"],
            webhook_url=result.get("webhook_url"),
        )

    def get_task_status(self, task_id: str) -> TaskStatusResponse:
        """
        获取任务状态
        """
        data = self._request("GET", f"/api/v1/status/{task_id}")
        result = data["data"]

        process_result = None
        if result.get("result"):
            res = result["result"]
            process_result = ProcessResponse(
                processed_text=res["processed_text"],
                original_length=res["original_length"],
                processed_length=res["processed_length"],
                detection_scores=DetectionScores(**res["detection_scores"]),
                processing_time=res["processing_time"],
                rounds_used=res["rounds_used"],
            )

        return TaskStatusResponse(
            task_id=result["task_id"],
            status=result["status"],
            result=process_result,
            error=result.get("error"),
            created_at=result.get("created_at"),
            updated_at=result.get("updated_at"),
            completed_at=result.get("completed_at"),
        )

    def validate(
        self, text: str, detectors: Optional[List[str]] = None
    ) -> ValidateResponse:
        """
        验证文本 AI 分数
        """
        payload = {"text": text}
        if detectors:
            payload["detectors"] = detectors

        data = self._request("POST", "/api/v1/validate", data=payload)
        result = data["data"]

        return ValidateResponse(
            text=result.get("text", text),  # API might not return text echo
            detection_scores=result["detection_scores"],
            summary=result["summary"],
        )

    def wait_for_task(
        self, task_id: str, interval: int = 2, timeout: int = 300
    ) -> TaskStatusResponse:
        """
        轮询直到任务完成
        """
        start_time = time.time()
        while time.time() - start_time < timeout:
            status = self.get_task_status(task_id)
            if status.status == "completed":
                return status
            if status.status == "failed":
                raise HumanTouchError(status.error or "Task failed", code="TASK_FAILED")

            time.sleep(interval)

        raise TaskTimeoutError("Task timed out", code="TASK_TIMEOUT")
