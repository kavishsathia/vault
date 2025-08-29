from tortoise import fields
from tortoise.models import Model
from tortoise_vector.field import VectorField


class UserPreference(Model):
    id = fields.UUIDField(pk=True)
    text = fields.TextField()
    embedding = VectorField(vector_size=384)
    strength = fields.FloatField(default=1.0)
    
    created_at = fields.DatetimeField(auto_now_add=True)
    last_updated = fields.DatetimeField(auto_now=True)
    
    # Relations
    user = fields.ForeignKeyField("models.User", related_name="preferences", on_delete=fields.CASCADE)
    category = fields.ForeignKeyField("models.PreferenceCategory", related_name="preferences", null=True)
    sources = fields.ReverseRelation["PreferenceSource"]

    class Meta:
        table = "user_preferences"
        indexes = ["user_id", "category_id"]

    def __str__(self):
        return f"<UserPreference {self.text[:50]}...>"