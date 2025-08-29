from tortoise import fields
from tortoise.models import Model


class PreferenceSource(Model):
    id = fields.UUIDField(pk=True)
    strength = fields.FloatField(default=1.0)
    
    added_at = fields.DatetimeField(auto_now_add=True)
    
    # Relations
    preference = fields.ForeignKeyField("models.UserPreference", related_name="sources", on_delete=fields.CASCADE)
    app = fields.ForeignKeyField("models.App", related_name="preference_sources", null=True)
    user = fields.ForeignKeyField("models.User", related_name="preference_sources")

    class Meta:
        table = "preference_sources"
        unique_together = ("preference_id", "app_id", "user_id")

    def __str__(self):
        app_name = "User" if not self.app_id else f"App {self.app_id}"
        return f"<PreferenceSource {app_name} -> {self.preference_id}>"