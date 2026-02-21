import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME = "APEX EduAI Vault"
    API_V1_STR = "/api/v1"

    # Strict fallback for OS specific Vercel logic
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this")
    ALGORITHM = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    # Optional overrides, otherwise fallback to defaults
    ADMIN_PHONE = os.getenv("ADMIN_PHONE", "0202979378")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "FlameFlame@99")

    ALLOWED_ORIGINS = ["*"]

settings = Settings()
