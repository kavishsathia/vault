from pydantic import BaseModel
from returns.maybe import Maybe, Nothing
from typing import List


class OAuthAuthorizationPipeline(BaseModel):
    """Pipeline state for OAuth authorization flow"""
    
    # Request parameters
    client_id: Maybe[str] = Nothing
    redirect_uri: Maybe[str] = Nothing
    scope: Maybe[str] = Nothing
    state: Maybe[str] = Nothing
    code_challenge: Maybe[str] = Nothing
    code_challenge_method: Maybe[str] = Nothing
    user_id: Maybe[str] = Nothing
    
    # Validated data
    client: Maybe[dict] = Nothing
    parsed_scopes: Maybe[List[str]] = Nothing
    user_preferences_count: Maybe[int] = Nothing
    affected_categories: Maybe[List[str]] = Nothing
    
    # Generated data
    authorization_code: Maybe[str] = Nothing
    
    # User consent
    approved: Maybe[bool] = Nothing
    granted_scopes: Maybe[List[str]] = Nothing

    class Config:
        arbitrary_types_allowed = True