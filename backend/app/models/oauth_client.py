from tortoise import fields
from tortoise.models import Model
from uuid import uuid4


class OAuthClient(Model):
    id = fields.UUIDField(pk=True, default=uuid4)
    name = fields.CharField(max_length=255)
    client_id = fields.CharField(max_length=255, unique=True)
    client_secret = fields.CharField(max_length=255)
    redirect_uris = fields.JSONField()  # List of allowed redirect URIs
    allowed_scopes = fields.JSONField()  # List of allowed scopes like ['read:preferences:food', 'write:preferences:all']
    is_public = fields.BooleanField(default=False)  # PKCE public clients don't need secret
    
    # Link to existing App model for unified app management
    app = fields.ForeignKeyField("models.App", related_name="oauth_client", null=True)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    # Reverse relations
    authorization_codes: fields.ReverseRelation["OAuthAuthorizationCode"]
    access_tokens: fields.ReverseRelation["OAuthAccessToken"]
    refresh_tokens: fields.ReverseRelation["OAuthRefreshToken"]

    class Meta:
        table = "oauth_clients"

    def __str__(self):
        return f"<OAuthClient {self.name}>"