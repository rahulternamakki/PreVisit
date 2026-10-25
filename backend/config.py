import os
from pydantic_settings import BaseSettings
from typing import Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_FILE = os.path.join(BASE_DIR, ".env")

class Settings(BaseSettings):
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Supabase (Phase 1)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    
    # Groq (Phase 2 & Phase 3)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    
    # Doctor Portal Security (Phase 4)
    DOCTOR_PASSCODE: str = "123456"
    JWT_SECRET_KEY: str = "default_insecure_secret_key"

    class Config:
        env_file = ENV_FILE
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
