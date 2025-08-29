from pydantic import BaseModel
from typing import Dict, List


class CategoryPermission(BaseModel):
    category_id: str
    category_name: str
    can_read: bool
    can_write: bool

    class Config:
        from_attributes = True


class AppPermissionSchema(BaseModel):
    app_id: str
    app_name: str
    permissions: List[CategoryPermission]

    class Config:
        from_attributes = True


class UserPermissionsResponse(BaseModel):
    apps: List[AppPermissionSchema]


class UpdatePermissionRequest(BaseModel):
    app_id: str
    category_id: str  # Use "all" for all categories
    can_read: bool
    can_write: bool


class UpdatePermissionResponse(BaseModel):
    success: bool
    message: str


class PermissionMatrixResponse(BaseModel):
    apps: List[str]  # app names
    categories: List[str]  # category names
    permissions: Dict[str, Dict[str, dict]]  # {app_id: {category_id: {can_read, can_write}}}