"""
tests/test_evidence.py — Evidence log tests.
"""
from __future__ import annotations

import io
import uuid
import wave

import pytest
from sqlalchemy import select

from app.db.models import AnalysisEvidence


def _make_wav() -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 16000)
    return buf.getvalue()


WAV = _make_wav()


@pytest.mark.asyncio
async def test_evidence_created_after_analysis(client, db_session):
    """Each successful analysis must create exactly one evidence record."""
    # Count before
    before = (await db_session.execute(select(AnalysisEvidence))).scalars().all()
    before_count = len(before)

    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", WAV, "audio/wav")},
        data={"org": "enterprise"},
    )
    assert resp.status_code == 200
    evidence_id = resp.json()["evidence_id"]

    # Confirm record exists
    after = (await db_session.execute(select(AnalysisEvidence))).scalars().all()
    assert len(after) == before_count + 1

    # Confirm analysis_id matches
    record = next((r for r in after if r.analysis_id == evidence_id), None)
    assert record is not None


@pytest.mark.asyncio
async def test_evidence_no_raw_audio(client, db_session):
    """Evidence record must not contain any audio bytes or file path."""
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", WAV, "audio/wav")},
        data={"org": "bank"},
    )
    assert resp.status_code == 200
    evidence_id = resp.json()["evidence_id"]

    stmt = select(AnalysisEvidence).where(AnalysisEvidence.analysis_id == evidence_id)
    result = await db_session.execute(stmt)
    record = result.scalar_one()

    # There must be NO audio-related column on AnalysisEvidence
    assert not hasattr(record, "audio_bytes")
    assert not hasattr(record, "audio_path")
    assert not hasattr(record, "raw_audio")

    # Scores must be populated
    assert record.risk_score is not None
    assert record.risk_band is not None
    assert record.organization == "bank"


@pytest.mark.asyncio
async def test_evidence_fields(client, db_session):
    """Verify all expected evidence fields are populated."""
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", WAV, "audio/wav")},
        data={"org": "government"},
    )
    assert resp.status_code == 200
    evidence_id = resp.json()["evidence_id"]

    stmt = select(AnalysisEvidence).where(AnalysisEvidence.analysis_id == evidence_id)
    result = await db_session.execute(stmt)
    record = result.scalar_one()

    assert record.organization == "government"
    assert record.processing_latency_ms is not None
    assert record.model_version is not None
    assert record.created_at is not None


@pytest.mark.asyncio
async def test_alerts_endpoint_returns_evidence(client):
    """GET /v1/alerts returns paginated evidence metadata."""
    # Ensure at least one record
    await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", WAV, "audio/wav")},
        data={"org": "enterprise"},
    )

    resp = await client.get("/v1/alerts")
    assert resp.status_code == 200
    data = resp.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)
    assert data["total"] >= 1

    item = data["items"][0]
    # Must not expose audio or embeddings
    assert "audio" not in item
    assert "embedding" not in item


@pytest.mark.asyncio
async def test_alerts_filter_by_org(client):
    """Filter by organization works."""
    resp = await client.get("/v1/alerts?organization=enterprise")
    assert resp.status_code == 200
    data = resp.json()
    for item in data["items"]:
        assert item["organization"] == "enterprise"


@pytest.mark.asyncio
async def test_alerts_pagination(client):
    """limit and offset params are respected."""
    resp = await client.get("/v1/alerts?limit=1&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) <= 1
