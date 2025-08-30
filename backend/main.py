from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from tortoise.contrib.fastapi import register_tortoise
import uvicorn
import os
from dotenv import load_dotenv
from app.routers import main_router as router

load_dotenv()

api = FastAPI(
    title="Vault API",
    description="Universal preference manager - your digital preference layer 🔐",
    version="1.0.0"
)

api.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",
                   "http://127.0.0.1:3000",
                   "http://localhost:3001",
                   "http://127.0.0.1:3001",
                   "http://localhost:5173",
                   "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api.include_router(router)

@api.get("/")
async def root():
    return {"message": "Vault is securing your preferences ⚡"}

@api.get("/health")
async def health():
    return {"status": "healthy", "service": "vault-api"}

register_tortoise(
    api,
    db_url=os.getenv("DATABASE_URL", "postgresql://vault:vault@localhost:5432/vault"),
    modules={"models": ["app.models.user", "app.models.app", "app.models.preference_category",
                        "app.models.user_preference", "app.models.preference_source",
                        "app.models.user_app_permission", "app.models.query_log",
                        "app.models.oauth_client", "app.models.oauth_authorization_code",
                        "app.models.oauth_access_token", "app.models.oauth_refresh_token"]},
    generate_schemas=False,
    add_exception_handlers=True,
)

if __name__ == "__main__":
    uvicorn.run("main:api", host="0.0.0.0", port=8000, reload=True)