"""
tests/test_real_integration.py — End-to-end integration test with the REAL ML Core.

This test does NOT mock MLService:
It initializes the real FastAPI application with the real DetectionEngine and
verifies the complete pipeline:
  Audio Bytes -> DetectionEngine -> Wav2Vec2/Prosody/Voiceprint -> OrganizationService -> SQLite -> API Response
"""
from __future__ import annotations

import io
import json
import wave
import numpy as np
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.database import Base, _session_factory
import app.db.database as db_module
from app.main import create_application
from app.services.ml_service import MLService
from app.services.organization_service import OrganizationService


def _create_synthetic_wav(duration: float = 2.0, sr: int = 16000) -> bytes:
    """Generate a valid speech-like WAV in memory."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False, dtype=np.float32)
    f0 = 140.0 + 15.0 * np.sin(2 * np.pi * 3.0 * t)
    phase = np.cumsum(2 * np.pi * f0 / sr)
    audio = 0.5 * np.sin(phase) + 0.3 * np.sin(3 * phase) + 0.2 * np.sin(5 * phase)
    env = 0.5 * (1.0 + np.sin(2 * np.pi * 1.5 * t))
    audio = (audio * env).astype(np.float32)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


@pytest.mark.asyncio
async def test_real_ml_integration_pipeline():
    """Verify complete end-to-end analysis with REAL DetectionEngine."""
    # 1. Initialize real MLService (loads real DetectionEngine)
    ml_svc = MLService()
    if not ml_svc.is_available:
        pytest.skip("ML dependencies not available in test runner")

    # 2. Setup in-memory SQLite DB and backup original
    orig_engine = db_module._engine
    orig_factory = db_module._session_factory

    test_engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    db_module._engine = test_engine
    db_module._session_factory = async_sessionmaker(
        test_engine, expire_on_commit=False, class_=AsyncSession
    )

    try:
        # 3. Create app with real services
        app = create_application()
        app.state.ml_service = ml_svc
        app.state.org_service = OrganizationService()

        wav_bytes = _create_synthetic_wav(2.0)

        async with AsyncClient(
            transport=ASGITransport(app=app), base_url="http://test"
        ) as client:
            # A. Health check
            h_resp = await client.get("/v1/health")
            assert h_resp.status_code == 200
            assert h_resp.json()["ml_service"] == "ok"
            assert h_resp.json()["database"] == "ok"

            # B. Real Analysis Call
            resp = await client.post(
                "/v1/analyze-call",
                files={"file": ("real_test.wav", wav_bytes, "audio/wav")},
                data={
                    "org": "bank",
                    "context": json.dumps({"first_time_contact": True, "high_value": True}),
                },
            )
            assert resp.status_code == 200
            data = resp.json()

            assert "analysis_id" in data
            assert isinstance(data["risk_score"], (int, float))
            assert data["band"] in ("low", "medium", "high")
            assert data["organization"] == "bank"
            assert "signals" in data
            assert isinstance(data["signals"]["model"], (int, float))
            assert isinstance(data["signals"]["prosody_anomaly"], (int, float))
            assert isinstance(data["signals"]["context_risk"], (int, float))
            assert "evidence_id" in data

            # C. Verify Alerts Endpoint returns this evidence
            alerts_resp = await client.get("/v1/alerts")
            assert alerts_resp.status_code == 200
            alerts_data = alerts_resp.json()
            assert alerts_data["total"] >= 1
            assert any(
                item["analysis_id"] == data["analysis_id"]
                for item in alerts_data["items"]
            )

            # D. Real Enrollment + Comparison
            enroll_resp = await client.post(
                "/v1/enroll",
                files={"file": ("real_speaker.wav", wav_bytes, "audio/wav")},
                data={"speaker_id": "spk_integration_01", "name": "Test Speaker"},
            )
            assert enroll_resp.status_code == 201
            assert "embedding" not in enroll_resp.json()

            # E. Analysis with enrolled speaker match
            match_resp = await client.post(
                "/v1/analyze-call",
                files={"file": ("real_speaker_call.wav", wav_bytes, "audio/wav")},
                data={
                    "org": "enterprise",
                    "context": json.dumps({"enrolled_speaker_id": "spk_integration_01"}),
                },
            )
            assert match_resp.status_code == 200
            match_data = match_resp.json()
            assert match_data["signals"]["voiceprint_risk"] <= 0.1
    finally:
        await test_engine.dispose()
        db_module._engine = orig_engine
        db_module._session_factory = orig_factory
