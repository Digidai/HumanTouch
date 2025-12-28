"""
异常定义
"""


class HumanTouchError(Exception):
    """HumanTouch SDK的基类异常"""
    
    def __init__(self, message: str, code: str = None, details: str = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.details = details

    def __str__(self):
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message


class AuthenticationError(HumanTouchError):
    """认证错误"""
    pass


class RateLimitError(HumanTouchError):
    """频率限制错误"""
    pass


class ValidationError(HumanTouchError):
    """参数验证错误"""
    pass


class TaskNotFoundError(HumanTouchError):
    """任务未找到错误"""
    pass


class TaskTimeoutError(HumanTouchError):
    """任务超时错误"""
    pass


class NetworkError(HumanTouchError):
    """网络错误"""
    pass