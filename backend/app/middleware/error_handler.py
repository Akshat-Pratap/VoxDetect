"""
app/middleware/error_handler.py — Centralised exception → structured JSON error responses.

Privacy: Never exposes stack traces, paths, secrets, or model internals in production.
"""
from __future__ import annotations

import traceback

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _error_response(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Convert FastAPI/Starlette HTTPException to our structured format."""
    settings = get_settings()

    # If the detail is already our structured dict, pass it through
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
        )

    code = _status_to_code(exc.status_code)
    message = str(exc.detail) if exc.detail else code
    return _error_response(code, message, exc.status_code)


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic validation errors to a structured response."""
    errors = exc.errors()
    # Summarise without exposing internal paths
    summary = "; ".join(
        f"{'.'.join(str(loc) for loc in e['loc'])}: {e['msg']}" for e in errors[:5]
    )
    return _error_response(
        "VALIDATION_ERROR",
        f"Request validation failed: {summary}",
        status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all for unexpected errors — never exposes internals."""
    settings = get_settings()
    logger.error(
        "Unhandled exception | path=%s method=%s error=%s",
        request.url.path,
        request.method,
        type(exc).__name__,
    )
    if settings.APP_ENV == "development":
        # Slightly more detail in dev (but still no secrets)
        message = f"{type(exc).__name__}: {str(exc)[:200]}"
    else:
        message = "An unexpected error occurred. Please try again later."

    return _error_response(
        "INTERNAL_SERVER_ERROR",
        message,
        status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _status_to_code(status_code: int) -> str:
    _MAP = {
        400: "INVALID_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        413: "AUDIO_TOO_LARGE",
        415: "UNSUPPORTED_AUDIO",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        500: "INTERNAL_SERVER_ERROR",
        503: "ML_SERVICE_UNAVAILABLE",
        504: "ML_TIMEOUT",
    }
    return _MAP.get(status_code, "ERROR")
