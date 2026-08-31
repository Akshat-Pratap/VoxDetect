"""
app/db/repositories.py — Data-access layer (repository pattern).

Repositories handle all database I/O.
Business logic lives in services, not here.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AnalysisEvidence, EnrolledSpeaker


# ─────────────────────────────────────────────────────────────
# Evidence repository
# ─────────────────────────────────────────────────────────────


class EvidenceRepository:
    """CRUD operations for AnalysisEvidence records."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, data: dict[str, Any]) -> AnalysisEvidence:
        """Persist a new evidence record and return the saved object."""
        record = AnalysisEvidence(**data)
        self._session.add(record)
        await self._session.commit()
        await self._session.refresh(record)
        return record

    async def get_by_analysis_id(self, analysis_id: str) -> Optional[AnalysisEvidence]:
        stmt = select(AnalysisEvidence).where(
            AnalysisEvidence.analysis_id == analysis_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_filtered(
        self,
        organization: str | None = None,
        severity: str | None = None,
        from_ts: datetime | None = None,
        to_ts: datetime | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[AnalysisEvidence], int]:
        """Return a filtered, paginated list of evidence records and total count."""
        stmt = select(AnalysisEvidence)

        if organization:
            stmt = stmt.where(AnalysisEvidence.organization == organization)
        if severity:
            stmt = stmt.where(AnalysisEvidence.severity == severity)
        if from_ts:
            stmt = stmt.where(AnalysisEvidence.created_at >= from_ts)
        if to_ts:
            stmt = stmt.where(AnalysisEvidence.created_at <= to_ts)

        stmt = stmt.order_by(AnalysisEvidence.created_at.desc())

        # Count without pagination
        count_stmt = stmt.with_only_columns(AnalysisEvidence.id)  # type: ignore[arg-type]
        count_result = await self._session.execute(count_stmt)
        total = len(count_result.all())

        # Apply pagination
        stmt = stmt.limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return result.scalars().all(), total


# ─────────────────────────────────────────────────────────────
# Enrollment repository
# ─────────────────────────────────────────────────────────────


class EnrollmentRepository:
    """CRUD operations for EnrolledSpeaker records."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_or_update(
        self,
        speaker_id: str,
        display_name: str,
        embedding: list[float],
    ) -> EnrolledSpeaker:
        """Insert or replace a speaker record (upsert via speaker_id)."""
        existing = await self.get(speaker_id)
        embedding_json = json.dumps(embedding)

        if existing:
            existing.display_name = display_name
            existing.embedding_json = embedding_json
            await self._session.commit()
            await self._session.refresh(existing)
            return existing

        record = EnrolledSpeaker(
            speaker_id=speaker_id,
            display_name=display_name,
            embedding_json=embedding_json,
        )
        self._session.add(record)
        await self._session.commit()
        await self._session.refresh(record)
        return record

    async def get(self, speaker_id: str) -> Optional[EnrolledSpeaker]:
        stmt = select(EnrolledSpeaker).where(
            EnrolledSpeaker.speaker_id == speaker_id
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_embedding(self, speaker_id: str) -> list[float] | None:
        """Retrieve embedding for internal comparison. Never for public API."""
        record = await self.get(speaker_id)
        if record is None:
            return None
        return json.loads(record.embedding_json)

    async def delete(self, speaker_id: str) -> bool:
        """Delete a speaker enrollment.  Returns True if a record was deleted."""
        record = await self.get(speaker_id)
        if record is None:
            return False
        await self._session.delete(record)
        await self._session.commit()
        return True

    async def exists(self, speaker_id: str) -> bool:
        return (await self.get(speaker_id)) is not None
