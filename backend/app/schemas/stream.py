"""
app/schemas/stream.py — WebSocket streaming schemas.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class StreamMetadata(BaseModel):
    """Initial metadata frame sent by client over WebSocket before audio chunks."""

    org: str = "enterprise"
    first_time_contact: bool = False
    high_value: bool = False
    odd_hour: bool = False
    sensitive_data_request: bool = False
    enrolled_speaker_id: Optional[str] = None
    # signal->bool mask controlling which signals vote in the verdict
    fusion: Optional[dict[str, bool]] = None


class StreamChunkResult(BaseModel):
    """Risk update sent to client after each audio chunk is analysed."""

    type: str = "risk_update"
    timestamp: datetime
    chunk_index: int
    risk_score: Optional[float] = None
    rolling_risk_score: Optional[float] = None
    band: Optional[str] = None
    confidence: Optional[float] = None
    signals: dict = {}
    flagged: bool = False
    severity: Optional[str] = None
    recommended_action: Optional[str] = None
    error: Optional[str] = None


class StreamErrorResult(BaseModel):
    type: str = "error"
    timestamp: datetime
    message: str
    code: str
