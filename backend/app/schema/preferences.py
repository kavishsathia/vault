from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime


class PreferenceSourceSchema(BaseModel):
    app_name: Optional[str] = None
    added_at: datetime
    strength: float

    class Config:
        from_attributes = True


class UserPreferenceSchema(BaseModel):
    id: str
    text: str
    strength: float
    category_name: Optional[str] = None
    sources: List[PreferenceSourceSchema] = []
    last_updated: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class TopPreferencesResponse(BaseModel):
    preferences: List[UserPreferenceSchema]
    total_count: int


class AddPreferenceRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000)
    embedding: List[float] = Field(..., min_items=1, max_items=384)
    category_slug: Optional[str] = None
    strength: float = Field(default=1.0, ge=0.0, le=10.0)

    @validator('category_slug')
    def validate_category_slug(cls, v):
        if v is not None:
            valid_categories = [
                'food', 'entertainment', 'work-productivity', 'ui-ux', 'gaming',
                'social', 'shopping', 'health-fitness', 'travel', 'learning'
            ]
            if v not in valid_categories:
                raise ValueError(f'Category must be one of: {valid_categories}')
        return v


class AddPreferenceResponse(BaseModel):
    id: str
    text: str
    strength: float
    category_name: Optional[str] = None
    created_at: datetime


class PreferenceDetailResponse(BaseModel):
    id: str
    text: str
    strength: float
    category_name: Optional[str] = None
    sources: List[PreferenceSourceSchema]
    last_updated: datetime
    created_at: datetime
    temporal_decay_info: dict  # Will contain decay calculation details


class QueryRequest(BaseModel):
    embedding: List[float] = Field(..., min_items=1, max_items=384)
    context: Optional[str] = Field(None, max_length=500)


class QueryResponse(BaseModel):
    score: float
    confidence: float
    noise_level: float


class ContextItem(BaseModel):
    text: str
    category: Optional[str] = None
    score: float


class QueryContextsRequest(BaseModel):
    embeddings: List[List[float]] = Field(..., min_items=1, max_items=10)
    context: Optional[str] = Field(None, max_length=500)
    
    @validator('embeddings')
    def validate_embeddings(cls, v):
        for embedding in v:
            if len(embedding) != 384:
                raise ValueError('Each embedding must be exactly 384 dimensions')
        return v


class QueryContextsResponse(BaseModel):
    results: List[List[ContextItem]]  # Array of results, each containing top 3 contexts
    noise_level: float