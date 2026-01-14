"""
SalesGPT - Smart Salesperson Assistant System
Configuration and Settings
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    app_name: str = "SalesGPT"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = Field(default="dev-secret-key-change-in-production", env="SECRET_KEY")
    
    # Database
    database_url: str = Field(default="sqlite+aiosqlite:///./salesgpt.db", env="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    
    # AI Services
    openai_api_key: str = Field(default="", env="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")
    deepgram_api_key: str = Field(default="", env="DEEPGRAM_API_KEY")
    deepgram_project_id: Optional[str] = Field(default=None, env="DEEPGRAM_PROJECT_ID")
    hf_auth_token: Optional[str] = Field(default=None, env="HF_AUTH_TOKEN")
    
    # JWT Settings
    jwt_secret_key: str = Field(default="dev-jwt-secret-change-in-production", env="JWT_SECRET_KEY")
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7
    
    # Storage
    upload_dir: str = "./uploads"
    max_upload_size: int = 104857600  # 100MB
    
    # Privacy Settings
    require_prospect_consent: bool = True
    auto_delete_recordings_days: int = 90
    
    # Speech Processing
    whisper_model: str = "base"  # tiny, base, small, medium, large
    min_silence_duration: float = 0.5  # seconds
    speech_threshold: float = 0.5
    
    # Real-time Settings
    transcription_chunk_size: int = 4096
    suggestion_debounce_ms: int = 500
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables


@lru_cache()
def get_settings() -> Settings:
    return Settings()
