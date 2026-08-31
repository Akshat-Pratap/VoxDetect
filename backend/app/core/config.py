"""
app/core/config.py — VoxDetect backend configuration.

All settings are read from environment variables (or .env file).
Defaults are chosen for a safe local development setup.
Never hardcode secrets; use .env (gitignored).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All backend configuration, sourced from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    APP_NAME: str = "VoxDetect"
    APP_ENV: str = "development"
    APP_VERSION: str = "1.0.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # ── Database ───────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/voxdetect.db"

    # ── ML Core ───────────────────────────────────────────────────────────
    MODEL_DEVICE: str = "cpu"
    MODEL_CHECKPOINT: str | None = None  # path to fine-tuned checkpoint dir

    # ── Organisation ──────────────────────────────────────────────────────
    DEFAULT_ORG: str = "enterprise"

    # ── Upload limits ─────────────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 25

    # ── Streaming ─────────────────────────────────────────────────────────
    STREAM_CHUNK_SECONDS: int = 3
    STREAM_ROLLING_WINDOW: int = 5  # number of recent chunks for rolling avg

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    # ── Webhooks ──────────────────────────────────────────────────────────
    WEBHOOK_TIMEOUT_SECONDS: int = 5

    # ── Logging ───────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"

    # ── Derived helpers ───────────────────────────────────────────────────
    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def ml_core_src_path(self) -> Path:
        """Absolute path to ml-core/src/ relative to the backend/ directory."""
        # backend/ lives one level below the repository root
        backend_dir = Path(__file__).resolve().parents[2]  # backend/
        repo_root = backend_dir.parent                       # repo root
        return repo_root / "ml-core" / "src"

    @property
    def config_dir(self) -> Path:
        backend_dir = Path(__file__).resolve().parents[2]
        return backend_dir / "config"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance (singleton for the process lifetime)."""
    return Settings()
