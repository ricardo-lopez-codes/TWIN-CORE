import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "TWIN-CORE Dashboard API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    DB_PATH: Path = DATA_DIR / "twincore.db"
    
    # Default Hardware Gateway
    SERIAL_PORT: str = "AUTO"
    SERIAL_BAUD: int = 115200
    SERIAL_TIMEOUT_SECONDS: float = 1.0
    HARDWARE_STALE_TIMEOUT_SECONDS: float = 5.0
    
    # WebSocket / Broadcast rate (Hz)
    STREAM_FREQUENCY_HZ: float = 1.0
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
