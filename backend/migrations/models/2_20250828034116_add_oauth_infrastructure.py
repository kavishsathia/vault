from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "oauth_clients" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "client_id" VARCHAR(255) NOT NULL UNIQUE,
    "client_secret" VARCHAR(255) NOT NULL,
    "redirect_uris" JSONB NOT NULL,
    "allowed_scopes" JSONB NOT NULL,
    "is_public" BOOL NOT NULL DEFAULT False,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_id" UUID REFERENCES "apps" ("id") ON DELETE CASCADE
);
        CREATE TABLE IF NOT EXISTS "oauth_authorization_codes" (
    "code" VARCHAR(255) NOT NULL PRIMARY KEY,
    "redirect_uri" VARCHAR(500) NOT NULL,
    "scopes" JSONB NOT NULL,
    "code_challenge" VARCHAR(255),
    "code_challenge_method" VARCHAR(10),
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" UUID NOT NULL REFERENCES "oauth_clients" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
);
        CREATE TABLE IF NOT EXISTS "oauth_access_tokens" (
    "id" UUID NOT NULL PRIMARY KEY,
    "token" VARCHAR(500) NOT NULL UNIQUE,
    "scopes" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_id" UUID NOT NULL REFERENCES "oauth_clients" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
);
        CREATE TABLE IF NOT EXISTS "oauth_refresh_tokens" (
    "id" UUID NOT NULL PRIMARY KEY,
    "token" VARCHAR(500) NOT NULL UNIQUE,
    "scopes" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOL NOT NULL DEFAULT False,
    "access_token_id" UUID NOT NULL REFERENCES "oauth_access_tokens" ("id") ON DELETE CASCADE,
    "client_id" UUID NOT NULL REFERENCES "oauth_clients" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP TABLE IF EXISTS "oauth_clients";
        DROP TABLE IF EXISTS "oauth_authorization_codes";
        DROP TABLE IF EXISTS "oauth_access_tokens";
        DROP TABLE IF EXISTS "oauth_refresh_tokens";"""
