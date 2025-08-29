from tortoise import BaseDBAsyncClient


async def upgrade(db: BaseDBAsyncClient) -> str:
    return """
    -- Update vector dimensions from 1536 to 384 for Web LLM compatibility
    -- Drop existing vector columns and recreate with new dimensions
    ALTER TABLE user_preferences DROP COLUMN IF EXISTS embedding;
    ALTER TABLE query_logs DROP COLUMN IF EXISTS embedding;
    
    -- Add new vector columns with 384 dimensions
    ALTER TABLE user_preferences ADD COLUMN embedding vector(384);
    ALTER TABLE query_logs ADD COLUMN embedding vector(384);
    
    -- Create indexes for vector similarity search
    CREATE INDEX IF NOT EXISTS idx_user_preferences_embedding ON user_preferences USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    CREATE INDEX IF NOT EXISTS idx_query_logs_embedding ON query_logs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    """


async def downgrade(db: BaseDBAsyncClient) -> str:
    return """
    -- Revert to 1536 dimensions
    ALTER TABLE user_preferences DROP COLUMN IF EXISTS embedding;
    ALTER TABLE query_logs DROP COLUMN IF EXISTS embedding;
    
    ALTER TABLE user_preferences ADD COLUMN embedding vector(1536);
    ALTER TABLE query_logs ADD COLUMN embedding vector(1536);
    
    CREATE INDEX IF NOT EXISTS idx_user_preferences_embedding ON user_preferences USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    CREATE INDEX IF NOT EXISTS idx_query_logs_embedding ON query_logs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
    """