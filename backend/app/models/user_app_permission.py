from tortoise import fields
from tortoise.models import Model


class UserAppPermission(Model):
    id = fields.UUIDField(pk=True)
    can_read = fields.BooleanField(default=True)
    can_write = fields.BooleanField(default=False)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    updated_at = fields.DatetimeField(auto_now=True)
    
    # Relations
    user = fields.ForeignKeyField("models.User", related_name="permissions", on_delete=fields.CASCADE)
    app = fields.ForeignKeyField("models.App", related_name="permissions")
    category = fields.ForeignKeyField("models.PreferenceCategory", related_name="permissions", null=True)

    class Meta:
        table = "user_app_permissions"
        unique_together = ("user_id", "app_id", "category_id")

    def __str__(self):
        category = self.category_id or "All Categories"
        return f"<UserAppPermission User:{self.user_id} App:{self.app_id} Cat:{category}>"