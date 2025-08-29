from tortoise import fields
from tortoise.models import Model


class PreferenceCategory(Model):
    id = fields.UUIDField(pk=True)
    name = fields.CharField(max_length=100, unique=True)
    slug = fields.CharField(max_length=100, unique=True)
    description = fields.TextField(null=True)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    
    # Relations
    preferences = fields.ReverseRelation["UserPreference"]
    permissions = fields.ReverseRelation["UserAppPermission"]

    class Meta:
        table = "preference_categories"

    def __str__(self):
        return f"<PreferenceCategory {self.name}>"