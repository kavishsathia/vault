from tortoise import fields
from tortoise.models import Model


class App(Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=255)
    description = fields.TextField(null=True)
    api_key = fields.CharField(max_length=255, unique=True)
    is_active = fields.BooleanField(default=True)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    # Relations
    permissions = fields.ReverseRelation["UserAppPermission"]
    preference_sources = fields.ReverseRelation["PreferenceSource"]
    queries = fields.ReverseRelation["QueryLog"]
    oauth_client = fields.ReverseRelation["OAuthClient"]  # One-to-One with OAuth client

    class Meta:
        table = "apps"

    def __str__(self):
        return f"<App {self.name}>"