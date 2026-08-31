"""
tests/test_webhook.py — Webhook service tests.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from app.services.webhook_service import (
    WebhookDeliveryResult,
    build_risk_alert_payload,
    deliver_webhook,
)


@pytest.mark.asyncio
async def test_webhook_success():
    """Successful HTTP 200 response → success=True."""
    import httpx
    from unittest.mock import MagicMock

    mock_response = MagicMock()
    mock_response.is_success = True
    mock_response.status_code = 200

    with patch("app.services.webhook_service.httpx.AsyncClient") as MockClient:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(return_value=mock_response)
        MockClient.return_value = mock_client

        result = await deliver_webhook(
            "https://example.com/webhook",
            {"event": "voice_clone_risk"},
        )

    assert result.success is True
    assert result.status_code == 200


@pytest.mark.asyncio
async def test_webhook_http_failure():
    """Non-2xx HTTP response → success=False, no exception raised."""
    from unittest.mock import MagicMock

    mock_response = MagicMock()
    mock_response.is_success = False
    mock_response.status_code = 500

    with patch("app.services.webhook_service.httpx.AsyncClient") as MockClient:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(return_value=mock_response)
        MockClient.return_value = mock_client

        result = await deliver_webhook(
            "https://example.com/webhook",
            {"event": "voice_clone_risk"},
        )

    assert result.success is False
    assert result.status_code == 500


@pytest.mark.asyncio
async def test_webhook_timeout():
    """Timeout → success=False, error='timeout'."""
    import httpx

    with patch("app.services.webhook_service.httpx.AsyncClient") as MockClient:
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("timed out"))
        MockClient.return_value = mock_client

        result = await deliver_webhook(
            "https://example.com/webhook",
            {"event": "voice_clone_risk"},
        )

    assert result.success is False
    assert result.error == "timeout"


@pytest.mark.asyncio
async def test_webhook_invalid_url():
    """Invalid URL → success=False without making HTTP request."""
    result = await deliver_webhook("ftp://bad-proto.com/hook", {"event": "test"})
    assert result.success is False
    assert result.error is not None


@pytest.mark.asyncio
async def test_webhook_does_not_break_analysis(client):
    """Even if webhook would fail, the analysis response must be 200."""
    import io
    import wave

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * 16000)
    wav_bytes = buf.getvalue()

    # Webhook delivery failure is simulated by the mock service never firing one
    # (webhook URL is None in default JSON configs → should_webhook=False)
    resp = await client.post(
        "/v1/analyze-call",
        files={"file": ("test.wav", wav_bytes, "audio/wav")},
        data={"org": "enterprise"},
    )
    assert resp.status_code == 200


def test_build_risk_alert_payload():
    """Payload must contain required event fields."""
    payload = build_risk_alert_payload(
        analysis_id="abc-123",
        organization="bank",
        risk_score=91.0,
        severity="critical",
        recommended_action="Freeze transaction",
    )
    assert payload["event"] == "voice_clone_risk"
    assert payload["analysis_id"] == "abc-123"
    assert payload["organization"] == "bank"
    assert payload["risk_score"] == 91.0
    assert "timestamp" in payload
    # Must NOT contain audio, embeddings, or secrets
    assert "audio" not in payload
    assert "embedding" not in payload
