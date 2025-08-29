from tortoise import fields
from tortoise.models import Model
from uuid import uuid4


class OAuthRefreshToken(Model):
    id = fields.UUIDField(pk=True, default=uuid4)
    token = fields.CharField(max_length=500, unique=True)  # Secure random token
    
    client = fields.ForeignKeyField(
        "models.OAuthClient", related_name="refresh_tokens"
    )
    user = fields.ForeignKeyField(
        "models.User", related_name="oauth_refresh_tokens"
    )
    access_token = fields.ForeignKeyField(
        "models.OAuthAccessToken", related_name="refresh_tokens"
    )
    
    scopes = fields.JSONField()  # List of granted scopes
    expires_at = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)
    
    # Track token family for rotation
    revoked = fields.BooleanField(default=False)

    class Meta:
        table = "oauth_refresh_tokens"

    def __str__(self):
        return f"<OAuthRefreshToken {self.token[:8]}...>"