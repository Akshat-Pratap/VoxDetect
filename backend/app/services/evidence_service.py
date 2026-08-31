"""
app/services/evidence_service.py — Evidence query service for the alerts endpoint.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories import EvidenceRepository
from app.db.models import AnalysisEvidence
from typing import Sequence


class EvidenceService:
    """Query/filter analysis evidence records for the /v1/alerts endpoint."""

    async def list_alerts(
        self,
        session: AsyncSession,
        organization: Optional[str] = None,
        severity: Optional[str] = None,
        from_ts: Optional[datetime] = None,
        to_ts: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[Sequence[AnalysisEvidence], int]:
        repo = EvidenceRepository(session)
        return await repo.list_filtered(
            organization=organization,
            severity=severity,
            from_ts=from_ts,
            to_ts=to_ts,
            limit=min(limit, 200),  # hard cap
            offset=offset,
        )
