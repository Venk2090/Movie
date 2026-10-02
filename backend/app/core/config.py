import os
from pathlib import Path

try:
    from pydantic_settings import BaseSettings
    class BaseSettingsClass(BaseSettings):
        pass
except ImportError:
    try:
        from pydantic import BaseSettings as PydanticBaseSettings
        class BaseSettingsClass(PydanticBaseSettings):
            pass
    except ImportError:
        class BaseSettingsClass:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

class Settings(BaseSettingsClass):
    PROJECT_NAME: str = "OpenVideoStudio"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    CONFIGS_DIR: Path = BASE_DIR / "configs"
    MODELS_DIR: Path = BASE_DIR / "models"
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR}/storage/studio.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    HARDWARE_MODE: str = os.getenv("HARDWARE_MODE", "auto")
    MOCK_PIPELINE: bool = os.getenv("MOCK_PIPELINE", "true").lower() in ("true", "1", "yes")
    
    SECRET_KEY: str = os.getenv("SECRET_KEY", "openvideostudio-secret-key-development")
    MAX_UPLOAD_SIZE_MB: int = 500

    class Config:
        case_sensitive = True

settings = Settings()

# Ensure primary directories exist
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
for sub in ["uploads", "audio", "transcripts", "translations", "storyboards", "voiceovers", "videos", "subtitles"]:
    (settings.STORAGE_DIR / sub).mkdir(parents=True, exist_ok=True)
