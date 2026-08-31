"""
app/db/models.py — SQLAlchemy ORM models.

Privacy rules enforced at model level:
  - AnalysisEvidence never stores raw audio bytes or file paths.
  - EnrolledSpeaker stores embeddings serialised as JSON; raw audio is not stored.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _uuid4() -> str:
    return str(uuid.uuid4())


class AnalysisEvidence(Base):
    """
    Immutable audit record for every completed analysis.

    PRIVACY: Does NOT store raw audio, audio paths, or speaker PII beyond a
    caller-supplied speaker_id reference (if provided).
    """

    __tablename__ = "analysis_evidence"

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Business identifier — returned to callers
    analysis_id: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, default=_uuid4, index=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now_utc, index=True
    )

    # Organisation context
    organization: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    # ML risk output
    risk_score: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    risk_band: Mapped[str | None] = mapped_column(String(16), nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    # ML signal breakdown (null when P1 does not emit them)
    synthetic_probability: Mapped[float | None] = mapped_column(Float, nullable=True)
    prosody_anomaly: Mapped[float | None] = mapped_column(Float, nullable=True)
    voiceprint_risk: Mapped[float | None] = mapped_column(Float, nullable=True)
    context_risk: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Policy decision
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    severity: Mapped[str | None] = mapped_column(String(16), nullable=True, index=True)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Operational metadata
    model_version: Mapped[str | None] = mapped_column(String(128), nullable=True)
    processing_latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Composite indexes for common dashboard queries
    __table_args__ = (
        Index("ix_evidence_org_created", "organization", "created_at"),
        Index("ix_evidence_severity_created", "severity", "created_at"),
    )

    def __repr__(self) -> str:
        return (
            f"<AnalysisEvidence id={self.id} analysis_id={self.analysis_id} "
            f"risk={self.risk_score} band={self.risk_band}>"
        )


class EnrolledSpeaker(Base):
    """
    Registered speaker voiceprint.

    PRIVACY: Stores only the embedding vector (JSON-serialised float array),
    never the raw audio.  The embedding is not exposed in public API responses.
    """

    __tablename__ = "enrolled_speakers"

    # Use speaker_id as the natural primary key (supplied by caller)
    speaker_id: Mapped[str] = mapped_column(String(128), primary_key=True)

    display_name: Mapped[str] = mapped_column(String(256), nullable=False)

    # 256-d float32 embedding serialised as a JSON array string.
    # Not exposed through public API; only used internally.
    embedding_json: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now_utc
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_now_utc, onupdate=_now_utc
    )

    def __repr__(self) -> str:
        return f"<EnrolledSpeaker speaker_id={self.speaker_id} name={self.display_name}>"
