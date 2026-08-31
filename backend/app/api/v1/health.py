"""
app/api/v1/health.py — Health check endpoints.
"""
from __future__ import annotations

from fastapi import APIRouter, Request

from app.core.config import get_settings
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Basic health check",
    description="Returns service status. Safe for load-balancer probes.",
)
async def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service=settings.APP_NAME + " backend",
        version=settings.APP_VERSION,
    )


@router.get(
    "/v1/health",
    response_model=HealthResponse,
    summary="Versioned health check",
    description=(
        "Returns service status including database and ML service availability. "
        "No ML inference is performed."
    ),
)
async def v1_health(request: Request) -> HealthResponse:
    settings = get_settings()

    # Check database
    db_status = "unknown"
    try:
        from app.db.database import _engine

        if _engine is not None:
            async with _engine.connect() as conn:
                await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
            db_status = "ok"
        else:
            db_status = "not_initialised"
    except Exception:
        db_status = "error"

    # Check ML service (no inference — just check flag)
    ml_status = "unknown"
    ml_service = getattr(getattr(request, "app", None), "state", None)
    if ml_service:
        svc = getattr(request.app.state, "ml_service", None)
        if svc is not None:
            ml_status = "ok" if svc.is_available else "unavailable"

    return HealthResponse(
        status="ok",
        service=settings.APP_NAME + " backend",
        version=settings.APP_VERSION,
        database=db_status,
        ml_service=ml_status,
    )
