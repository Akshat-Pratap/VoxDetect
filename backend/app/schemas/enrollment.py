"""
app/schemas/enrollment.py — Speaker enrollment schemas.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class EnrollResponse(BaseModel):
    """Returned after successful enrollment."""

    speaker_id: str
    display_name: str
    enrolled: bool = True
    message: str = "Speaker enrolled successfully."
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SpeakerProfile(BaseModel):
    """Public profile returned by GET /v1/enroll/{speaker_id}.
    NOTE: Never includes the raw embedding.
    """

    speaker_id: str
    display_name: str
    enrolled: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
