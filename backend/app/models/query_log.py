from tortoise import fields
from tortoise.models import Model
from tortoise_vector.field import VectorField


class QueryLog(Model):
    id = fields.UUIDField(pk=True)
    embedding = VectorField(vector_size=384)
    result = fields.FloatField(null=True)
    context = fields.CharField(max_length=500, null=True)
    noise_level = fields.FloatField(null=True)
    
    timestamp = fields.DatetimeField(auto_now_add=True)
    
    # Relations
    app = fields.ForeignKeyField("models.App", related_name="queries")
    user = fields.ForeignKeyField("models.User", related_name="query_logs")

    class Meta:
        table = "query_logs"
        indexes = ["app_id", "user_id", "timestamp"]

    def __str__(self):
        return f"<QueryLog App:{self.app_id} User:{self.user_id} Score:{self.result}>"