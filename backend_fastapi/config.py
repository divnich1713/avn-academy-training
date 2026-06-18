import os
import re
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SCHEMA: str = "t_p29017774_avn_academy_training"
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:54322/postgres"
    REDIS_URL: str = "redis://localhost:6379/0"
    DISCORD_BOT_TOKEN: str = ""
    
    @property
    def async_database_url(self) -> str:
        # Convert postgresql:// to postgresql+asyncpg:// for SQLAlchemy async engine
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        if url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        # asyncpg expects ssl=require instead of sslmode=require
        if "sslmode=" in url:
            url = url.replace("sslmode=", "ssl=")
        return url

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Secure identifier assert for the database schema to prevent injection
assert re.fullmatch(r"[a-zA-Z_][a-zA-Z0-9_]*", settings.SCHEMA), f"Invalid SCHEMA: {settings.SCHEMA}"
