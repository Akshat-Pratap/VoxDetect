"""
app/api/v1/alerts.py — GET /v1/alerts endpoint.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_session
from app.schemas.alert import AlertListResponse, AlertRecord
from app.services.evidence_service import EvidenceService

router = APIRouter(prefix="/v1", tags=["alerts"])

_evidence_svc = EvidenceService()


@router.get(
    "/alerts",
    response_model=AlertListResponse,
    summary="List recent risk alerts",
    description=(
        "Retrieve paginated evidence metadata for risk alerts. "
        "Supports filtering by organization, severity, and timestamp range. "
        "Never returns raw audio or speaker embeddings."
    ),
)
async def list_alerts(
    organization: Optional[str] = Query(None, description="Filter by organization."),
    severity: Optional[str] = Query(
        None, description="Filter by severity: low | medium | high | critical."
    ),
    from_ts: Optional[datetime] = Query(None, description="ISO-8601 start timestamp."),
    to_ts: Optional[datetime] = Query(None, description="ISO-8601 end timestamp."),
    limit: int = Query(50, ge=1, le=200, description="Max records to return."),
    offset: int = Query(0, ge=0, description="Pagination offset."),
    session: AsyncSession = Depends(get_session),
) -> AlertListResponse:
    records, total = await _evidence_svc.list_alerts(
        session=session,
        organization=organization,
        severity=severity,
        from_ts=from_ts,
        to_ts=to_ts,
        limit=limit,
        offset=offset,
    )

    items = [
        AlertRecord(
            analysis_id=r.analysis_id,
            organization=r.organization,
            risk_score=r.risk_score,
            risk_band=r.risk_band,
            flagged=r.flagged,
            severity=r.severity,
            recommended_action=r.recommended_action,
            processing_latency_ms=r.processing_latency_ms,
            created_at=r.created_at,
        )
        for r in records
    ]

    return AlertListResponse(items=items, total=total, limit=limit, offset=offset)
