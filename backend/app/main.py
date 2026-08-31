"""
app/main.py — VoxDetect FastAPI application entry point.

Startup sequence:
  1. Setup logging
  2. Initialise database (create tables if needed)
  3. Load MLService (loads DetectionEngine ONCE)
  4. Load OrganizationService (loads JSON configs)

All services are stored on app.state for access in route handlers.

Model loading happens ONCE here — NEVER inside individual request handlers.
"""
from __future__ import annotations

import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.db.database import close_db, init_db
from app.middleware.error_handler import (
    general_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.services.ml_service import MLService
from app.services.organization_service import OrganizationService

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application startup and shutdown resources."""
    settings = get_settings()

    # ── Setup logging ────────────────────────────────────────────────────
    setup_logging()
    logger.info("VoxDetect backend starting | env=%s", settings.APP_ENV)

    # ── Database ─────────────────────────────────────────────────────────
    t0 = time.perf_counter()
    await init_db()
    logger.info("Database initialised in %.0f ms", (time.perf_counter() - t0) * 1000)

    # ── ML Service ───────────────────────────────────────────────────────
    # This is the ONLY place DetectionEngine is constructed.
    # It is reused for every request.
    t0 = time.perf_counter()
    ml_service = MLService()
    elapsed = (time.perf_counter() - t0) * 1000
    if ml_service.is_available:
        logger.info("MLService ready in %.0f ms", elapsed)
    else:
        logger.warning(
            "MLService unavailable (%.0f ms). Analyze endpoints will return 503. "
            "Install ML Core dependencies to enable inference.",
            elapsed,
        )
    app.state.ml_service = ml_service

    # ── Organization Service ──────────────────────────────────────────────
    org_service = OrganizationService()
    app.state.org_service = org_service

    logger.info("VoxDetect backend ready.")

    yield  # ← application runs here

    # ── Shutdown ──────────────────────────────────────────────────────────
    logger.info("VoxDetect backend shutting down…")
    await close_db()
    logger.info("Shutdown complete.")


def create_application() -> FastAPI:
    """Factory function — create and configure the FastAPI app."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        description=(
            "AI-Powered Real-Time Detection and Prevention of Voice Cloning "
            "Impersonation Attacks — VoxDetect Backend API (P2)"
        ),
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ────────────────────────────────────────────────
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)

    # ── Routers ───────────────────────────────────────────────────────────
    from app.api.v1 import health, analysis, enrollment, streaming, alerts

    # Unversioned health (liveness probe)
    app.include_router(health.router)

    # Versioned API
    app.include_router(analysis.router)
    app.include_router(enrollment.router)
    app.include_router(alerts.router)
    app.include_router(streaming.router)

    return app


app = create_application()
