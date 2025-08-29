from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL PRIMARY KEY,
    "email" VARCHAR(255),
    "name" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS "apps" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "api_key" VARCHAR(255) NOT NULL UNIQUE,
    "is_active" BOOL NOT NULL DEFAULT True,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "preference_categories" (
    "id" UUID NOT NULL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL UNIQUE,
    "slug" VARCHAR(100) NOT NULL UNIQUE,
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "user_preferences" (
    "id" UUID NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "embedding" public.vector(1536) NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_updated" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category_id" UUID REFERENCES "preference_categories" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_user_prefer_user_id_bf0617" ON "user_preferences" ("user_id", "category_id");
CREATE TABLE IF NOT EXISTS "preference_sources" (
    "id" UUID NOT NULL PRIMARY KEY,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_id" UUID REFERENCES "apps" ("id") ON DELETE CASCADE,
    "preference_id" UUID NOT NULL REFERENCES "user_preferences" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_preference__prefere_f37180" UNIQUE ("preference_id", "app_id", "user_id")
);
CREATE TABLE IF NOT EXISTS "user_app_permissions" (
    "id" UUID NOT NULL PRIMARY KEY,
    "can_read" BOOL NOT NULL DEFAULT True,
    "can_write" BOOL NOT NULL DEFAULT False,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_id" UUID NOT NULL REFERENCES "apps" ("id") ON DELETE CASCADE,
    "category_id" UUID REFERENCES "preference_categories" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
    CONSTRAINT "uid_user_app_pe_user_id_bf842f" UNIQUE ("user_id", "app_id", "category_id")
);
CREATE TABLE IF NOT EXISTS "query_logs" (
    "id" UUID NOT NULL PRIMARY KEY,
    "embedding" public.vector(1536) NOT NULL,
    "result" DOUBLE PRECISION,
    "context" VARCHAR(500),
    "noise_level" DOUBLE PRECISION,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_id" UUID NOT NULL REFERENCES "apps" ("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_query_logs_app_id_8bba60" ON "query_logs" ("app_id", "user_id", "timestamp");
CREATE TABLE IF NOT EXISTS "aerich" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "version" VARCHAR(255) NOT NULL,
    "app" VARCHAR(100) NOT NULL,
    "content" JSONB NOT NULL
);"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        """
