from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
        -- Delete existing users (they don't have passwords anyway)
        DELETE FROM "users";
        
        -- Add new required columns
        ALTER TABLE "users" ADD "is_active" BOOL NOT NULL DEFAULT True;
        ALTER TABLE "users" ADD "password_hash" TEXT NOT NULL;
        ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "uid_users_email_133a6f" ON "users" ("email");"""


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
        DROP INDEX IF EXISTS "uid_users_email_133a6f";
        ALTER TABLE "users" DROP COLUMN "is_active";
        ALTER TABLE "users" DROP COLUMN "password_hash";
        ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;"""
