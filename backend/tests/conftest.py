"""
tests/conftest.py — Shared pytest fixtures.

Architecture:
  - Real DB (in-memory SQLite) for all tests.
  - Mock MLService — deterministic results, no model loading.
  - Tests exercise real FastAPI routing, middleware, schemas, and DB.
  - The mock replaces ONLY the MLService; all other components are real.
"""
from __future__ import annotations

import asyncio
from typing import Any, AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.database import Base, _session_factory
from app.db.models import AnalysisEvidence, EnrolledSpeaker  # noqa: F401  register models
from app.main import create_application
from app.services.ml_service import MLService

# ──────────────────────────────────────────────────────────────────────────────
# Mock ML result
# ──────────────────────────────────────────────────────────────────────────────

MOCK_ML_RESULT: dict[str, Any] = {
    "risk_score": 82.5,
    "band": "high",
    "confidence": 0.88,
    "models": {"synthetic_prob": 0.88},
    "signals": {
        "model": 0.88,
        "prosody_anomaly": 0.71,
        "voiceprint_risk": 0.50,
        "context_risk": 0.35,
    },
}

MOCK_EMBEDDING: list[float] = [0.01] * 256  # 256-d dummy embedding


def make_mock_ml_service() -> MLService:
    """Create a fully-mocked MLService that never touches the ML Core."""
    svc = MagicMock(spec=MLService)
    svc.is_available = True
    svc.model_version = "mock-v0"
    svc._init_error = None

    # Async methods
    svc.analyze_file = AsyncMock(return_value=MOCK_ML_RESULT)
    svc.analyze_chunk = AsyncMock(return_value=MOCK_ML_RESULT)
    svc.enroll_voice = AsyncMock(return_value=MOCK_EMBEDDING)
    svc.compare_voice = AsyncMock(return_value=0.92)

    # Sync method used by streaming (called via run_in_executor)
    svc._sync_analyze_bytes = MagicMock(return_value=MOCK_ML_RESULT)

    svc.status = MagicMock(return_value={"available": True, "model_version": "mock-v0"})
    return svc


# ──────────────────────────────────────────────────────────────────────────────
# In-memory SQLite for tests
# ──────────────────────────────────────────────────────────────────────────────

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Use a single event loop for the whole test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine():
    engine = create_async_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Yield a fresh session per test, rolled back on teardown."""
    factory = async_sessionmaker(test_engine, expire_on_commit=False, class_=AsyncSession)
    async with factory() as session:
        yield session


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI test app
# ──────────────────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture(scope="session")
async def test_app(test_engine) -> FastAPI:
    """Create a test application that uses in-memory SQLite and mock ML."""
    import app.db.database as db_module

    # Patch the global session factory
    db_module._engine = test_engine
    db_module._session_factory = async_sessionmaker(
        test_engine, expire_on_commit=False, class_=AsyncSession
    )

    application = create_application()

    # Inject mock services (bypasses lifespan so no model download)
    from app.services.organization_service import OrganizationService

    application.state.ml_service = make_mock_ml_service()
    application.state.org_service = OrganizationService()

    return application


@pytest_asyncio.fixture
async def client(test_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient backed by the test app."""
    async with AsyncClient(
        transport=ASGITransport(app=test_app), base_url="http://test"
    ) as ac:
        yield ac
