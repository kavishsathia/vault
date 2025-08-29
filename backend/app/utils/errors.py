from typing import Optional


class AppError(Exception):
    """Base application error"""
    
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class NotFoundError(AppError):
    """Resource not found error"""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=404)


class PermissionDeniedError(AppError):
    """Permission denied error"""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=403)


class ConflictError(AppError):
    """Resource conflict error"""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=409)


class ValidationError(AppError):
    """Validation error"""
    
    def __init__(self, message: str):
        super().__init__(message, status_code=422)