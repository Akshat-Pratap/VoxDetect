"""
app/db/database.py — Async SQLAlchemy engine + session factory.

Uses SQLite via aiosqlite for the hackathon MVP.
The database file is stored in data/voxdetect.db (gitignored).
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


# These are module-level singletons, initialised by init_db().
_engine = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def _get_db_url() -> str:
    settings = get_settings()
    url = settings.DATABASE_URL
    # Ensure the data/ directory exists for local SQLite paths
    if url.startswith("sqlite"):
        # Extract file path from URL  (sqlite+aiosqlite:///./data/...)
        file_part = url.split("///", 1)[-1]
        db_path = Path(file_part)
        db_path.parent.mkdir(parents=True, exist_ok=True)
    return url


async def init_db() -> None:
    """Create engine, session factory, and all tables.  Called at startup."""
    global _engine, _session_factory

    db_url = _get_db_url()
    logger.info("Initialising database: %s", db_url)

    _engine = create_async_engine(
        db_url,
        echo=False,
        connect_args={"check_same_thread": False},
    )
    _session_factory = async_sessionmaker(
        _engine, expire_on_commit=False, class_=AsyncSession
    )

    # Import models so Base has them registered before create_all
    from app.db import models  # noqa: F401

    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Database ready.")


async def close_db() -> None:
    """Dispose the engine on shutdown."""
    global _engine
    if _engine:
        await _engine.dispose()
        logger.info("Database connection closed.")


async def get_session() -> AsyncSession:  # type: ignore[return]
    """FastAPI dependency that yields a database session."""
    if _session_factory is None:
        raise RuntimeError("Database not initialised. Call init_db() at startup.")
    async with _session_factory() as session:
        yield session
