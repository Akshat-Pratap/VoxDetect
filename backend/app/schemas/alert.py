"""
app/schemas/alert.py — Alert / evidence listing schemas.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class AlertRecord(BaseModel):
    """A single alert entry from the evidence log."""

    analysis_id: str
    organization: Optional[str]
    risk_score: Optional[float]
    risk_band: Optional[str]
    flagged: bool
    severity: Optional[str]
    recommended_action: Optional[str]
    processing_latency_ms: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    """Paginated alert list."""

    items: List[AlertRecord]
    total: int
    limit: int
    offset: int
