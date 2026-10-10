"""Environment-backed application settings."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FloodLens API"
    app_env: str = "development"
    log_level: str = "INFO"
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    model_config_path: str = "ml-model/config.yaml"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def resolve_model_config_path(self) -> Path:
        """Resolve the model configuration path across execution directories."""
        direct = Path(self.model_config_path)
        # If a non-default custom path was specified, do not fall back
        if self.model_config_path != "ml-model/config.yaml":
            return direct.resolve()
        if direct.is_file():
            return direct.resolve()
        # Fallback: check relative to repository root from this file
        repo_root = Path(__file__).resolve().parents[3]
        fallback = repo_root / "ml-model" / "config.yaml"
        if fallback.is_file():
            return fallback.resolve()
        parent_rel = Path("..") / "ml-model" / "config.yaml"
        if parent_rel.is_file():
            return parent_rel.resolve()
        return direct.resolve()


@lru_cache
def get_settings() -> Settings:
    """Return cached process settings loaded from the environment."""
    return Settings()
