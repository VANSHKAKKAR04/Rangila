from functools import lru_cache
from pydantic import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # General
    project_name: str = "Rangila Gift Shop API"
    environment: str = "development"

    # Backend - Store as optional string to avoid parsing errors
    backend_cors_origins: Optional[str] = None

    # Security
    secret_key: str = "change-me-in-env"
    access_token_expires_minutes: int = 10080  # 7 days (7 * 24 * 60 = 10080 minutes)
    refresh_token_expires_days: int = 30  # 30 days
    algorithm: str = "HS256"

    # Database
    database_url: str = "postgresql+psycopg2://user:password@localhost:5432/rangila"
    
    # Razorpay Configuration
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""  # For webhook signature verification

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

