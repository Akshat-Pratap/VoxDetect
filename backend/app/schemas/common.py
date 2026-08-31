"""
app/schemas/common.py — Shared Pydantic schemas.
"""
from __future__ import annotations

from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    database: str | None = None
    ml_service: str | None = None
    model_source: str | None = None
