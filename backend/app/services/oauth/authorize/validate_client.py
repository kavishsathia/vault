from returns.result import Result, Success, Failure
from returns.maybe import Nothing
from app.models import OAuthClient
from app.utils.errors import NotFoundError, AppError
from .pipeline import OAuthAuthorizationPipeline


async def validate_client(data: OAuthAuthorizationPipeline) -> Result[OAuthAuthorizationPipeline, AppError]:
    """Validate OAuth client exists and is active"""
    
    if data.client_id is Nothing:
        return Failure(NotFoundError("Missing client_id"))
    
    try:
        client_id = data.client_id.unwrap()
        client = await OAuthClient.get_or_none(client_id=client_id)
        
        if not client:
            return Failure(NotFoundError(f"OAuth client '{client_id}' not found"))
        
        # Convert client to dict for pipeline
        client_data = {
            "id": str(client.id),
            "name": client.name,
            "client_id": client.client_id,
            "redirect_uris": client.redirect_uris,
            "allowed_scopes": client.allowed_scopes,
            "is_public": client.is_public
        }
        
        data.client = client_data
        return Success(data)
        
    except Exception as e:
        return Failure(AppError(f"Error validating client: {str(e)}"))