from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class PermissionDetail(BaseModel):
    category_id: str
    category_name: str
    can_read: bool
    can_write: bool


class AppIntegrationSchema(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime
    permissions_summary: dict  # {category: {can_read: bool, can_write: bool}}
    permissions: List[PermissionDetail]  # Frontend expects this array format
    preferences_contributed: int
    queries_made: int

    class Config:
        from_attributes = True


class IntegratedAppsResponse(BaseModel):
    apps: List[AppIntegrationSchema]
    total_count: int


class AppPreferenceContribution(BaseModel):
    preference_id: str
    text: str
    strength: float
    added_at: datetime
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


class AppContributedPreferencesResponse(BaseModel):
    app_name: str
    app_id: str
    preferences: List[AppPreferenceContribution]
    total_count: int


class CreateAppRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)


class CreateAppResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    api_key: str
    created_at: datetime