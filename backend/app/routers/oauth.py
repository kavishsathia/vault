from fastapi import APIRouter, Depends, HTTPException, Query, Request, Form
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import secrets
import jwt
import hashlib
import base64
import os
from datetime import datetime, timedelta, timezone

from app.models import OAuthClient, OAuthAuthorizationCode, OAuthAccessToken, OAuthRefreshToken, User
from app.schema.oauth import (
    OAuthValidateRequest, OAuthConsentRequest, OAuthTokenRequest, OAuthTokenResponse, 
    VaultConsentInfo, VaultScopeInfo
)
from app.utils.auth import get_current_user

# Use same secret key as main auth system
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")

router = APIRouter(prefix="/oauth", tags=["OAuth"])

# Use existing auth middleware - no need to reimplement

# Vault scope definitions
VAULT_SCOPES = {
    "read:preferences": {"description": "Read all preference categories", "access_type": "read"},
    "write:preferences": {"description": "Add preferences to all categories", "access_type": "write"},
    "query:preferences": {"description": "Query preference similarity scores", "access_type": "query"},
    "read:preferences:food": {"description": "Read food preferences", "access_type": "read", "category": "food"},
    "read:preferences:entertainment": {"description": "Read entertainment preferences", "access_type": "read", "category": "entertainment"},
    "read:preferences:gaming": {"description": "Read gaming preferences", "access_type": "read", "category": "gaming"},
    "read:preferences:ui-ux": {"description": "Read UI/UX preferences", "access_type": "read", "category": "ui-ux"},
    "write:preferences:food": {"description": "Add food preferences", "access_type": "write", "category": "food"},
    "write:preferences:entertainment": {"description": "Add entertainment preferences", "access_type": "write", "category": "entertainment"},
}

def parse_scopes(scope_string: str) -> list[str]:
    """Parse space-separated scopes"""
    return scope_string.strip().split() if scope_string else []

def validate_scopes(requested_scopes: list[str], allowed_scopes: list[str]) -> list[str]:
    """Validate requested scopes against allowed scopes"""
    return [scope for scope in requested_scopes if scope in allowed_scopes and scope in VAULT_SCOPES]

@router.get("/authorize")
async def oauth_authorize(
    request: Request,
    response_type: str = Query(...),
    client_id: str = Query(...),
    redirect_uri: str = Query(...),
    scope: str = Query(...),
    state: Optional[str] = Query(None),
    code_challenge: Optional[str] = Query(None),
    code_challenge_method: Optional[str] = Query(None)
):
    """OAuth 2.0 authorization endpoint - redirects to frontend"""
    
    # Only support authorization code flow
    if response_type != "code":
        error_url = f"{redirect_uri}?error=unsupported_response_type&error_description=Only+authorization+code+flow+supported"
        if state:
            error_url += f"&state={state}"
        return RedirectResponse(url=error_url)
    
    # Validate client
    client = await OAuthClient.get_or_none(client_id=client_id)
    if not client:
        error_url = f"{redirect_uri}?error=invalid_client&error_description=Invalid+client+ID"
        if state:
            error_url += f"&state={state}"
        return RedirectResponse(url=error_url)
    
    # Validate redirect URI
    if redirect_uri not in client.redirect_uris:
        raise HTTPException(status_code=400, detail="Invalid redirect URI")
    
    # Parse and validate scopes
    requested_scopes = parse_scopes(scope)
    valid_scopes = validate_scopes(requested_scopes, client.allowed_scopes)
    
    if not valid_scopes:
        error_url = f"{redirect_uri}?error=invalid_scope&error_description=No+valid+scopes+requested"
        if state:
            error_url += f"&state={state}"
        return RedirectResponse(url=error_url)
    
    # Build OAuth parameters for frontend redirect
    oauth_params = f"response_type={response_type}&client_id={client_id}&redirect_uri={redirect_uri}&scope={scope}"
    if state:
        oauth_params += f"&state={state}"
    if code_challenge:
        oauth_params += f"&code_challenge={code_challenge}"
    if code_challenge_method:
        oauth_params += f"&code_challenge_method={code_challenge_method}"
    
    # Always redirect to frontend - let frontend handle authentication check
    frontend_url = f"http://localhost:3000/oauth/authorize?{oauth_params}"
    return RedirectResponse(url=frontend_url)

@router.post("/validate-request")
async def oauth_validate_request(
    request: OAuthValidateRequest,
    user: User = Depends(get_current_user)
):
    """Validate OAuth request parameters (API endpoint for frontend)"""
    
    # Validate client
    client = await OAuthClient.get_or_none(client_id=request.client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Invalid client")
    
    # Validate redirect URI
    if request.redirect_uri not in client.redirect_uris:
        raise HTTPException(status_code=400, detail="Invalid redirect URI")
    
    # Parse and validate scopes
    requested_scopes = parse_scopes(request.scope)
    valid_scopes = validate_scopes(requested_scopes, client.allowed_scopes)
    
    if not valid_scopes:
        raise HTTPException(status_code=400, detail="No valid scopes requested")
    
    # Return client info and scopes for consent page
    scope_info = []
    affected_categories = set()
    
    for scope in valid_scopes:
        if scope in VAULT_SCOPES:
            scope_data = VAULT_SCOPES[scope]
            scope_info.append(VaultScopeInfo(
                scope=scope,
                category=scope_data.get("category"),
                access_type=scope_data["access_type"],
                description=scope_data["description"]
            ))
            if scope_data.get("category"):
                affected_categories.add(scope_data["category"])
    
    # Get user's preference count (mock for now)
    user_preferences_count = 42  # TODO: Get actual count from database
    
    return VaultConsentInfo(
        client_name=client.name,
        client_description=getattr(client, 'description', None),
        requested_scopes=scope_info,
        user_preferences_count=user_preferences_count,
        affected_categories=list(affected_categories)
    )

@router.post("/consent")
async def oauth_consent_submit(
    request: OAuthConsentRequest,
    user: User = Depends(get_current_user)
):
    """Handle OAuth consent form submission (API endpoint for frontend)"""
    
    if not request.approved:
        # User denied - return redirect URL with error
        error_url = f"{request.redirect_uri}?error=access_denied&error_description=User+denied+authorization"
        if request.state:
            error_url += f"&state={request.state}"
        return {"redirect_url": error_url}
    
    # Validate client
    client = await OAuthClient.get_or_none(client_id=request.client_id)
    if not client:
        raise HTTPException(status_code=400, detail="Invalid client")
    
    # Determine granted scopes
    granted_scopes = request.granted_scopes or parse_scopes(request.scope)
    valid_granted_scopes = validate_scopes(granted_scopes, client.allowed_scopes)
    
    # Generate authorization code
    auth_code = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)  # 10 minute expiry
    
    # Store authorization code
    await OAuthAuthorizationCode.create(
        code=auth_code,
        client=client,
        user=user,
        redirect_uri=request.redirect_uri,
        scopes=valid_granted_scopes,
        code_challenge=request.code_challenge,
        code_challenge_method=request.code_challenge_method,
        expires_at=expires_at
    )
    
    # Build redirect URL
    redirect_url = f"{request.redirect_uri}?code={auth_code}"
    if request.state:
        redirect_url += f"&state={request.state}"
    
    return {"redirect_url": redirect_url}

@router.post("/token")
async def oauth_token(
    grant_type: str = Form(...),
    client_id: str = Form(...),
    client_secret: Optional[str] = Form(None),
    code: Optional[str] = Form(None),
    redirect_uri: Optional[str] = Form(None),
    refresh_token: Optional[str] = Form(None),
    code_verifier: Optional[str] = Form(None)
):
    """OAuth 2.0 token endpoint - accepts form-encoded data per OAuth 2.0 spec"""
    
    # Create request object from form data
    request = OAuthTokenRequest(
        grant_type=grant_type,
        client_id=client_id,
        client_secret=client_secret,
        code=code,
        redirect_uri=redirect_uri,
        refresh_token=refresh_token,
        code_verifier=code_verifier
    )
    
    if request.grant_type == "authorization_code":
        return await handle_authorization_code_grant(request)
    elif request.grant_type == "refresh_token":
        return await handle_refresh_token_grant(request)
    else:
        raise HTTPException(status_code=400, detail="Unsupported grant type")

async def handle_authorization_code_grant(request: OAuthTokenRequest):
    """Handle authorization code grant"""
    
    if not request.code or not request.redirect_uri:
        raise HTTPException(status_code=400, detail="Missing code or redirect_uri")
    
    # Get authorization code
    auth_code = await OAuthAuthorizationCode.get_or_none(
        code=request.code
    ).prefetch_related("client", "user")
    
    if not auth_code:
        raise HTTPException(status_code=400, detail="Invalid authorization code")
    
    # Check expiry
    if datetime.now(timezone.utc) > auth_code.expires_at:
        await auth_code.delete()
        raise HTTPException(status_code=400, detail="Authorization code expired")
    
    # Validate client
    if auth_code.client.client_id != request.client_id:
        raise HTTPException(status_code=400, detail="Client mismatch")
    
    # Validate redirect URI
    if auth_code.redirect_uri != request.redirect_uri:
        raise HTTPException(status_code=400, detail="Redirect URI mismatch")
    
    # Validate client secret (for confidential clients)
    if not auth_code.client.is_public:
        if not request.client_secret or request.client_secret != auth_code.client.client_secret:
            raise HTTPException(status_code=400, detail="Invalid client secret")
    
    # Validate PKCE (for public clients)
    if auth_code.client.is_public and auth_code.code_challenge:
        if not request.code_verifier:
            raise HTTPException(status_code=400, detail="Missing code verifier")
        
        if auth_code.code_challenge_method == "S256":
            expected_challenge = base64.urlsafe_b64encode(
                hashlib.sha256(request.code_verifier.encode()).digest()
            ).decode().rstrip("=")
        else:
            expected_challenge = request.code_verifier
        
        if auth_code.code_challenge != expected_challenge:
            raise HTTPException(status_code=400, detail="Invalid code verifier")
    
    # Generate tokens
    access_token_jwt = generate_access_token(str(auth_code.user.id), auth_code.client.client_id, auth_code.scopes)
    refresh_token_str = secrets.token_urlsafe(32)
    
    # Store tokens in database
    access_token = await OAuthAccessToken.create(
        token=access_token_jwt,
        client=auth_code.client,
        user=auth_code.user,
        scopes=auth_code.scopes,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    
    await OAuthRefreshToken.create(
        token=refresh_token_str,
        client=auth_code.client,
        user=auth_code.user,
        access_token=access_token,
        scopes=auth_code.scopes,
        expires_at=datetime.now(timezone.utc) + timedelta(days=30)
    )
    
    # Clean up authorization code
    await auth_code.delete()
    
    return OAuthTokenResponse(
        access_token=access_token_jwt,
        token_type="Bearer",
        expires_in=3600,  # 1 hour
        refresh_token=refresh_token_str,
        scope=" ".join(auth_code.scopes)
    )

async def handle_refresh_token_grant(request: OAuthTokenRequest):
    """Handle refresh token grant"""
    
    if not request.refresh_token:
        raise HTTPException(status_code=400, detail="Missing refresh token")
    
    # Get refresh token
    refresh_token = await OAuthRefreshToken.get_or_none(
        token=request.refresh_token,
        revoked=False
    ).prefetch_related("client", "access_token")
    
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Invalid refresh token")
    
    # Check expiry
    if datetime.now(timezone.utc) > refresh_token.expires_at:
        await refresh_token.update(revoked=True)
        raise HTTPException(status_code=400, detail="Refresh token expired")
    
    # Validate client
    if refresh_token.client.client_id != request.client_id:
        raise HTTPException(status_code=400, detail="Client mismatch")
    
    # Generate new access token
    new_access_token_jwt = generate_access_token(
        str(refresh_token.user.id), refresh_token.client.client_id, refresh_token.scopes
    )
    
    # Update access token in database
    await refresh_token.access_token.update(
        token=new_access_token_jwt,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1)
    )
    
    return OAuthTokenResponse(
        access_token=new_access_token_jwt,
        token_type="Bearer", 
        expires_in=3600,
        scope=" ".join(refresh_token.scopes)
    )

def generate_access_token(user_id: str, client_id: str, scopes: list[str]) -> str:
    """Generate JWT access token"""
    
    payload = {
        "sub": user_id,
        "aud": client_id,
        "scope": " ".join(scopes),
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=1)
    }
    
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")