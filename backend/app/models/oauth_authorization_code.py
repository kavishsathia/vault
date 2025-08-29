from tortoise import fields
from tortoise.models import Model


class OAuthAuthorizationCode(Model):
    code = fields.CharField(max_length=255, pk=True)  # The authorization code itself
    
    client = fields.ForeignKeyField(
        "models.OAuthClient", related_name="authorization_codes"
    )
    user = fields.ForeignKeyField(
        "models.User", related_name="oauth_authorization_codes" 
    )
    
    redirect_uri = fields.CharField(max_length=500)
    scopes = fields.JSONField()  # List of granted scopes
    
    # PKCE support
    code_challenge = fields.CharField(max_length=255, null=True)
    code_challenge_method = fields.CharField(max_length=10, null=True)  # 'plain' or 'S256'
    
    expires_at = fields.DatetimeField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "oauth_authorization_codes"

    def __str__(self):
        return f"<OAuthAuthorizationCode {self.code[:8]}...>"