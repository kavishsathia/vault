from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# OAuth Client Schemas
class OAuthClientCreateRequest(BaseModel):
    name: str = Field(..., description="OAuth client name")
    description: Optional[str] = Field(None, description="OAuth client description")
    redirect_uris: List[str] = Field(..., description="List of allowed redirect URIs")
    allowed_scopes: List[str] = Field(..., description="List of allowed OAuth scopes")
    is_public: bool = Field(False, description="Whether this is a public client (PKCE)")


class OAuthClientResponse(BaseModel):
    id: str
    name: str
    client_id: str
    client_secret: str  # Only returned on creation
    redirect_uris: List[str]
    allowed_scopes: List[str]
    is_public: bool
    created_at: datetime
    

# OAuth Authorization Schemas  
class OAuthAuthorizeRequest(BaseModel):
    response_type: str = Field(..., description="Must be 'code'")
    client_id: str = Field(..., description="OAuth client ID")
    redirect_uri: str = Field(..., description="Redirect URI")
    scope: str = Field(..., description="Requested scopes (space-separated)")
    state: Optional[str] = Field(None, description="State parameter for CSRF protection")
    code_challenge: Optional[str] = Field(None, description="PKCE code challenge")
    code_challenge_method: Optional[str] = Field(None, description="PKCE challenge method")


class OAuthValidateRequest(BaseModel):
    client_id: str = Field(..., description="OAuth client ID")
    redirect_uri: str = Field(..., description="Redirect URI")
    scope: str = Field(..., description="Requested scopes")
    state: Optional[str] = Field(None, description="State parameter")
    code_challenge: Optional[str] = Field(None, description="PKCE code challenge")
    code_challenge_method: Optional[str] = Field(None, description="PKCE challenge method")


class OAuthConsentRequest(BaseModel):
    client_id: str = Field(..., description="OAuth client ID")
    redirect_uri: str = Field(..., description="Redirect URI")
    scope: str = Field(..., description="Requested scopes")
    state: Optional[str] = Field(None, description="State parameter")
    code_challenge: Optional[str] = Field(None, description="PKCE code challenge")
    code_challenge_method: Optional[str] = Field(None, description="PKCE challenge method")
    approved: bool = Field(..., description="Whether user approved the authorization")
    granted_scopes: Optional[List[str]] = Field(None, description="User-selected scopes")


class OAuthConsentResponse(BaseModel):
    redirect_url: str = Field(..., description="URL to redirect user to with authorization code")


# OAuth Token Schemas
class OAuthTokenRequest(BaseModel):
    grant_type: str = Field(..., description="Grant type - 'authorization_code' or 'refresh_token'")
    client_id: str = Field(..., description="OAuth client ID")
    client_secret: Optional[str] = Field(None, description="Client secret (for confidential clients)")
    code: Optional[str] = Field(None, description="Authorization code (for authorization_code grant)")
    redirect_uri: Optional[str] = Field(None, description="Redirect URI (for authorization_code grant)")
    refresh_token: Optional[str] = Field(None, description="Refresh token (for refresh_token grant)")
    code_verifier: Optional[str] = Field(None, description="PKCE code verifier")


class OAuthTokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("Bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    refresh_token: Optional[str] = Field(None, description="Refresh token")
    scope: str = Field(..., description="Granted scopes (space-separated)")


# OAuth Error Response
class OAuthErrorResponse(BaseModel):
    error: str = Field(..., description="Error code")
    error_description: Optional[str] = Field(None, description="Human-readable error description")
    error_uri: Optional[str] = Field(None, description="URI with more information about the error")
    state: Optional[str] = Field(None, description="State parameter if provided")


# Vault-Specific Schemas
class VaultScopeInfo(BaseModel):
    scope: str = Field(..., description="Scope identifier")
    category: Optional[str] = Field(None, description="Preference category if applicable")
    access_type: str = Field(..., description="'read', 'write', or 'query'")
    description: str = Field(..., description="Human-readable scope description")


class VaultConsentInfo(BaseModel):
    client_name: str = Field(..., description="OAuth client display name")
    client_description: Optional[str] = Field(None, description="OAuth client description")
    requested_scopes: List[VaultScopeInfo] = Field(..., description="Requested scopes with details")
    user_preferences_count: int = Field(..., description="Total number of user preferences")
    affected_categories: List[str] = Field(..., description="List of preference categories that would be accessible")