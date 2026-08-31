"""
app/core/logging.py — Structured logging for the VoxDetect backend.

Privacy rules enforced here:
  - Never log raw audio content.
  - Never log embeddings.
  - Never log API keys, secrets, or webhook URLs.
  - Never log personal identifiers beyond a request-ID.
"""
from __future__ import annotations

import logging
import sys
from typing import Any

from app.core.config import get_settings


class _SafeFormatter(logging.Formatter):
    """JSON-like single-line structured log format."""

    FMT = (
        "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
    )

    def __init__(self) -> None:
        super().__init__(fmt=self.FMT, datefmt="%Y-%m-%dT%H:%M:%S")


def setup_logging() -> None:
    """Configure root logger once at application startup."""
    settings = get_settings()
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    root = logging.getLogger()
    root.setLevel(level)

    if not root.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        handler.setFormatter(_SafeFormatter())
        root.addHandler(handler)

    # Quiet noisy third-party loggers
    for noisy in ("uvicorn.access", "sqlalchemy.engine", "httpx"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger for a module."""
    return logging.getLogger(name)


def log_analysis_completed(
    logger: logging.Logger,
    *,
    request_id: str,
    analysis_id: str,
    organization: str,
    risk_score: float,
    band: str,
    flagged: bool,
    latency_ms: float,
    **extra: Any,
) -> None:
    """Structured log for a completed analysis. Privacy-safe."""
    logger.info(
        "analysis_completed | request_id=%s analysis_id=%s org=%s "
        "risk_score=%.1f band=%s flagged=%s latency_ms=%.0f",
        request_id,
        analysis_id,
        organization,
        risk_score,
        band,
        flagged,
        latency_ms,
    )


def log_analysis_error(
    logger: logging.Logger,
    *,
    request_id: str,
    error_code: str,
    message: str,
) -> None:
    """Structured log for analysis failure. Never exposes internals."""
    logger.error(
        "analysis_error | request_id=%s error_code=%s message=%s",
        request_id,
        error_code,
        message,
    )
