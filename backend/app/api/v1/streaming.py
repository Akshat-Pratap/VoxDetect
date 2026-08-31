"""
app/api/v1/streaming.py — WebSocket /v1/stream endpoint.
"""
from __future__ import annotations

from fastapi import APIRouter, WebSocket

from app.services.streaming_service import StreamingSession

router = APIRouter(tags=["streaming"])


@router.websocket("/v1/stream")
async def stream_endpoint(websocket: WebSocket) -> None:
    """
    Real-time voice-cloning risk analysis via WebSocket.

    **Protocol:**
    1. Connect to `ws://host/v1/stream`
    2. Send a JSON metadata frame:
       ```json
       {
         "org": "bank",
         "first_time_contact": true,
         "high_value": false,
         "odd_hour": false,
         "sensitive_data_request": false,
         "enrolled_speaker_id": null
       }
       ```
    3. Server responds with `{"type": "ready", "connection_id": "..."}`
    4. Send binary audio chunks (2–3 seconds of PCM/WAV/etc.)
    5. Receive `risk_update` JSON frames for each chunk
    6. Disconnect when done

    **Notes:**
    - Audio chunks are never persisted.
    - Each connection maintains isolated state (rolling risk window, etc.).
    - Malformed chunks return `{"type": "error", ...}` frames — they do not
      terminate the connection.
    """
    ml_service = websocket.app.state.ml_service
    org_service = websocket.app.state.org_service

    session = StreamingSession(websocket, ml_service, org_service)
    await session.run()
