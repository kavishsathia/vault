import os
from dotenv import load_dotenv

load_dotenv()

TORTOISE_ORM = {
    "connections": {
        "default": os.getenv("DATABASE_URL")
    },
    "apps": {
        "models": {
            "models": [
                "app.models.user",
                "app.models.app", 
                "app.models.preference_category",
                "app.models.user_preference",
                "app.models.preference_source", 
                "app.models.user_app_permission",
                "app.models.query_log",
                "app.models.oauth_client",
                "app.models.oauth_authorization_code",
                "app.models.oauth_access_token",
                "app.models.oauth_refresh_token",
                "aerich.models"
            ],
            "default_connection": "default",
        }
    }
}