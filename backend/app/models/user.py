from tortoise import fields
from tortoise.models import Model


class User(Model):
    id = fields.UUIDField(pk=True)
    email = fields.CharField(max_length=255, unique=True)
    name = fields.CharField(max_length=255, null=True)
    password_hash = fields.TextField()
    is_active = fields.BooleanField(default=True)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    last_seen_at = fields.DatetimeField(null=True)
    
    # Relations
    preferences = fields.ReverseRelation["UserPreference"]
    permissions = fields.ReverseRelation["UserAppPermission"]
    preference_sources = fields.ReverseRelation["PreferenceSource"]

    class Meta:
        table = "users"

    def __str__(self):
        return f"<User {self.email or self.id}>"