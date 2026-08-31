"""
app/schemas/analysis.py — Request/response schemas for /v1/analyze-call.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class CallContext(BaseModel):
    """Optional contextual metadata the caller can provide per-call.
    These flags are forwarded to the ML Core context dict.
    """

    first_time_contact: bool = False
    high_value: bool = False
    odd_hour: bool = False
    sensitive_data_request: bool = False
    enrolled_speaker_id: Optional[str] = None  # DB speaker_id for voiceprint lookup


class ModelsSchema(BaseModel):
    """Per-model probability scores from the ML Core."""

    synthetic_prob: Optional[float] = Field(
        None, description="Probability [0,1] the audio is synthetic (ML model output)."
    )


class SignalsSchema(BaseModel):
    """Breakdown of individual risk signals from the ML Core.
    Fields are null when the ML Core does not emit them.
    """

    model: Optional[float] = Field(None, description="Deepfake model signal [0,1].")
    prosody_anomaly: Optional[float] = Field(
        None, description="Prosody anomaly score [0,1]."
    )
    voiceprint_risk: Optional[float] = Field(
        None,
        description="Voiceprint risk [0,1]. 1 = caller does not match enrolled speaker.",
    )
    context_risk: Optional[float] = Field(
        None, description="Contextual risk [0,1] derived from metadata flags."
    )


class AnalysisResponse(BaseModel):
    """Full response from POST /v1/analyze-call."""

    analysis_id: str = Field(..., description="UUID of this analysis run.")
    risk_score: Optional[float] = Field(
        None, description="Fused risk score 0–100."
    )
    band: Optional[str] = Field(None, description="Risk band: low | medium | high.")
    confidence: Optional[float] = Field(
        None, description="Model confidence [0,1]."
    )
    models: ModelsSchema
    signals: SignalsSchema

    organization: Optional[str] = Field(None, description="Organisation profile used.")
    flagged: bool = Field(..., description="Whether the call is flagged for review.")
    severity: Optional[str] = Field(
        None, description="Severity level: low | medium | high | critical."
    )
    recommended_action: Optional[str] = Field(
        None, description="Human-readable recommended response."
    )

    timestamp: datetime
    evidence_id: Optional[str] = Field(
        None, description="UUID of the persisted evidence record."
    )
    processing_latency_ms: Optional[float] = None

    model_config = {"from_attributes": True}
