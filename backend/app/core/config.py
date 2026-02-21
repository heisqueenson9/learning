from pydantic_settings import BaseSettings
from typing import Optional
import os
import secrets


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "APEX EduAI Vault"

    # Database URL — falls back to SQLite for local; supports Postgres on Render/Railway
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./apex.db"

    # Generate a secure random key if not set in environment
    SECRET_KEY: str = secrets.token_hex(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 days default

    # Admin credentials (can be overridden via env vars for security)
    ADMIN_PHONE: str = "0202979378"
    ADMIN_PASSWORD: str = "FlameFlame@99"

    # AI model selection
    APEX_AI_MODEL: str = "google/flan-t5-base"

    # CORS allowed origins (comma-separated for production)
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Fix for Heroku/Render postgres:// → postgresql://
        if self.SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
            object.__setattr__(
                self,
                "SQLALCHEMY_DATABASE_URI",
                self.SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1),
            )
        # Fix for Vercel Serverless environment where ./ is read-only
        if os.getenv("VERCEL") == "1" and self.SQLALCHEMY_DATABASE_URI.startswith("sqlite"):
            object.__setattr__(self, "SQLALCHEMY_DATABASE_URI", "sqlite:////tmp/apex.db")

    def get_allowed_origins(self) -> list:
        """Parse ALLOWED_ORIGINS env var into a list."""
        origins = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        return origins


settings = Settings()
