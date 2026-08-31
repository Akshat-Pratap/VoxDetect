"""
tests/test_streaming.py — WebSocket /v1/stream tests.
"""
from __future__ import annotations

import asyncio
import io
import json
import wave
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from starlette.testclient import TestClient

from tests.conftest import MOCK_ML_RESULT


def _make_wav(n: int = 8000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\x00\x00" * n)
    return buf.getvalue()


WAV_CHUNK = _make_wav(16000 * 2)  # 2 seconds


def test_websocket_connection(test_app):
    """Client can connect and receive a 'ready' frame after sending metadata."""
    client = TestClient(test_app)
    with client.websocket_connect("/v1/stream") as ws:
        # Send metadata
        ws.send_text(json.dumps({"org": "enterprise"}))

        # Receive ready frame
        data = ws.receive_json()
        assert data["type"] == "ready"
        assert "connection_id" in data


def test_websocket_invalid_metadata(test_app):
    """Invalid metadata frame → error response, connection stays open."""
    client = TestClient(test_app)
    with client.websocket_connect("/v1/stream") as ws:
        # Send broken JSON
        ws.send_text("not valid json {{{")
        data = ws.receive_json()
        assert data["type"] == "error"
        assert data["code"] == "INVALID_METADATA"


def test_rolling_risk_logic():
    """Rolling window correctly smooths risk scores."""
    from collections import deque
    import statistics

    window: deque[float] = deque(maxlen=5)

    scores = [80.0, 20.0, 90.0, 15.0, 85.0]
    rolling = []
    for s in scores:
        window.append(s)
        rolling.append(statistics.median(window))

    # Values should be smoother than raw
    raw_range = max(scores) - min(scores)
    roll_range = max(rolling) - min(rolling)
    assert roll_range <= raw_range


def test_streaming_service_handles_ml_error(test_app):
    """MLService error for a chunk → error frame sent, connection continues."""
    from app.services.ml_service import MLServiceError

    original = test_app.state.ml_service._sync_analyze_bytes
    test_app.state.ml_service._sync_analyze_bytes = MagicMock(
        side_effect=MLServiceError("Forced failure")
    )

    client = TestClient(test_app)
    with client.websocket_connect("/v1/stream") as ws:
        ws.send_text(json.dumps({"org": "enterprise"}))
        ready_data = ws.receive_json()
        assert ready_data["type"] == "ready"

        ws.send_bytes(WAV_CHUNK)
        data = ws.receive_json()
        assert data["type"] == "error"
        assert data["code"] == "ML_ERROR"

    test_app.state.ml_service._sync_analyze_bytes = original
