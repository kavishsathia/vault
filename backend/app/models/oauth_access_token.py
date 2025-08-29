from tortoise import fields
from tortoise.models import Model
from uuid import uuid4


class OAuthAccessToken(Model):
    id = fields.UUIDField(pk=True, default=uuid4)
    token = fields.CharField(max_length=500, unique=True)  # JWT token
    
    client = fields.ForeignKeyField(
        "models.OAuthClient", related_name="access_tokens"
    )
    user = fields.ForeignKeyField(
        "models.User", related_name="oauth_access_tokens"
    )
    
    scopes = fields.JSONField()  # List of granted scopes
    expires_at = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)
    
    # Reverse relation
    refresh_tokens: fields.ReverseRelation["OAuthRefreshToken"]

    class Meta:
        table = "oauth_access_tokens"

    def __str__(self):
        return f"<OAuthAccessToken {self.token[:8]}...>"