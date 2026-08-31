"""
tests/test_analysis.py — POST /v1/analyze-call tests.
"""
from __future__ import annotations

import io
import struct
import wave
from unittest.mock import AsyncMock

import pytest

from tests.conftest import MOCK_ML_RESULT


def _make_wav(duration_s: float = 1.0, sr: int = 16000) -> bytes:
    """Generate a minimal valid WAV file in memory."""
    n_samples = int(sr * duration_s)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(b"\x00\x00" * n_samples)
    return buf.getvalue()


VALID_WAV = _make_wav(1.0)


@pytest.mark.asyncio
async def test_analyze_call_valid(client):
    """Happy path: valid WAV, enterprise org → 200 with full result."""
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", VALID_WAV, "audio/wav")},
        data={"org": "enterprise"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()

    assert "analysis_id" in data
    assert data["risk_score"] == pytest.approx(82.5)
    assert data["band"] == "high"
    assert data["flagged"] is True
    assert data["organization"] == "enterprise"
    assert "recommended_action" in data
    assert "evidence_id" in data
    assert "signals" in data
    assert "models" in data


@pytest.mark.asyncio
async def test_analyze_call_bank_org(client):
    """Bank org with high risk → critical or high severity."""
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", VALID_WAV, "audio/wav")},
        data={"org": "bank"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # risk=82.5, bank critical_min=85 → should be high (not critical)
    assert data["severity"] in ("high", "critical")


@pytest.mark.asyncio
async def test_analyze_call_missing_file(client):
    """No file → 422 validation error."""
    resp = await client.post("/v1/analyze-call", data={"org": "enterprise"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_analyze_call_unsupported_format(client):
    """Unsupported extension → 415."""
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("audio.txt", b"not audio", "text/plain")},
        data={"org": "enterprise"},
    )
    assert resp.status_code == 415
    data = resp.json()
    assert data["error"]["code"] == "UNSUPPORTED_AUDIO"


@pytest.mark.asyncio
async def test_analyze_call_empty_file(client):
    """Empty file → 400."""
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("empty.wav", b"", "audio/wav")},
        data={"org": "enterprise"},
    )
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "EMPTY_FILE"


@pytest.mark.asyncio
async def test_analyze_call_oversized_file(client):
    """File exceeding MAX_UPLOAD_SIZE_MB → 413."""
    from unittest.mock import patch

    # Patch max_upload_bytes to 1 byte so any real file fails
    with patch("app.core.security.get_settings") as mock_settings_fn:
        mock_cfg = mock_settings_fn.return_value
        mock_cfg.MAX_UPLOAD_SIZE_MB = 0
        mock_cfg.max_upload_bytes = 1  # 1 byte limit
        mock_cfg.ml_core_src_path = __import__("pathlib").Path("nonexistent")

        resp = await client.post(
            "/v1/analyze-call",
            files={"file": ("big.wav", VALID_WAV, "audio/wav")},
            data={"org": "enterprise"},
        )
    assert resp.status_code == 413
    data = resp.json()
    assert data["error"]["code"] == "AUDIO_TOO_LARGE"


@pytest.mark.asyncio
async def test_analyze_call_unknown_org(client):
    """Unknown org → 400 UNKNOWN_ORGANIZATION."""
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", VALID_WAV, "audio/wav")},
        data={"org": "rogue_org"},
    )
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "UNKNOWN_ORGANIZATION"


@pytest.mark.asyncio
async def test_analyze_call_ml_unavailable(client, test_app):
    """ML service unavailable → 503."""
    original = test_app.state.ml_service.analyze_file
    from app.services.ml_service import MLServiceUnavailable

    test_app.state.ml_service.analyze_file = AsyncMock(
        side_effect=MLServiceUnavailable("model not loaded")
    )

    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", VALID_WAV, "audio/wav")},
        data={"org": "enterprise"},
    )
    # Restore
    test_app.state.ml_service.analyze_file = original
    assert resp.status_code == 503
    data = resp.json()
    assert data["error"]["code"] == "ML_SERVICE_UNAVAILABLE"


@pytest.mark.asyncio
async def test_analyze_call_ml_timeout(client, test_app):
    """ML timeout → 504."""
    original = test_app.state.ml_service.analyze_file
    from app.services.ml_service import MLServiceTimeout

    test_app.state.ml_service.analyze_file = AsyncMock(
        side_effect=MLServiceTimeout("timed out")
    )

    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", VALID_WAV, "audio/wav")},
        data={"org": "enterprise"},
    )
    test_app.state.ml_service.analyze_file = original
    assert resp.status_code == 504
    data = resp.json()
    assert data["error"]["code"] == "ML_TIMEOUT"


@pytest.mark.asyncio
async def test_analyze_call_with_context(client):
    """Valid context JSON → parsed and included in analysis."""
    import json

    ctx = json.dumps({
        "first_time_contact": True,
        "high_value": True,
        "odd_hour": False,
        "sensitive_data_request": True,
    })
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", VALID_WAV, "audio/wav")},
        data={"org": "bank", "context": ctx},
    )
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_response_schema(client):
    """Response must contain all required schema fields."""
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", VALID_WAV, "audio/wav")},
        data={"org": "enterprise"},
    )
    assert resp.status_code == 200
    data = resp.json()
    required = [
        "analysis_id", "risk_score", "band", "confidence",
        "models", "signals", "organization", "flagged",
        "severity", "recommended_action", "timestamp", "evidence_id"
    ]
    for field in required:
        assert field in data, f"Missing field: {field}"
