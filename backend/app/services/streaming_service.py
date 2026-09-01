"""
app/services/streaming_service.py — Per-connection state for /v1/stream.

Each WebSocket connection gets its own StreamingSession instance.
No global mutable state is shared between connections.

Rolling risk uses a simple sliding window median to prevent the dashboard
from jumping wildly between chunks.
"""
from __future__ import annotations

import asyncio
import io
import json
import statistics
import uuid
from collections import deque
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import WebSocket, WebSocketDisconnect

from app.core.config import get_settings
from app.core.logging import get_logger
from app.schemas.stream import StreamChunkResult, StreamErrorResult, StreamMetadata
from app.services.ml_service import (
    MLService,
    MLServiceError,
    MLServiceTimeout,
    MLServiceUnavailable,
)
from app.services.organization_service import OrganizationService

logger = get_logger(__name__)

# Audio conversion: WebM/Opus (from browser MediaRecorder) -> WAV PCM for ML
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    logger.warning("pydub not available; WebM/Opus chunk decoding will fail. Install pydub + ffmpeg.")


def _webm_opus_to_wav_pcm(chunk_bytes: bytes) -> bytes:
    """
    Convert WebM/Opus audio chunk (from browser MediaRecorder) to 16kHz mono WAV PCM bytes.

    Returns raw WAV bytes suitable for the ML pipeline.
    """
    if not PYDUB_AVAILABLE:
        raise RuntimeError("pydub not installed; cannot decode WebM/Opus audio chunks")

    # Load WebM/Opus from bytes
    webm_audio = AudioSegment.from_file(io.BytesIO(chunk_bytes), format="webm")

    # Convert to 16kHz mono PCM (what the ML model expects)
    wav_audio = webm_audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)

    # Export as WAV bytes
    wav_bytes = io.BytesIO()
    wav_audio.export(wav_bytes, format="wav")
    return wav_bytes.getvalue()


class StreamingSession:
    """
    Manages a single WebSocket connection's full lifecycle.

    Maintains per-connection state:
      - connection_id
      - chunk_index
      - rolling risk window
      - metadata/context from first frame

    Privacy: Audio chunk bytes are never persisted.
    """

    def __init__(
        self,
        websocket: WebSocket,
        ml_service: MLService,
        org_service: OrganizationService,
    ) -> None:
        self._ws = websocket
        self._ml = ml_service
        self._org = org_service
        self._settings = get_settings()

        self.connection_id = str(uuid.uuid4())
        self._chunk_index = 0
        self._metadata: Optional[StreamMetadata] = None
        self._rolling: deque[float] = deque(
            maxlen=self._settings.STREAM_ROLLING_WINDOW
        )
        self._ml_context: dict[str, Any] | None = None

    async def run(self) -> None:
        """Main connection loop.  Returns when the client disconnects."""
        logger.info("WebSocket connected | connection_id=%s", self.connection_id)
        try:
            await self._ws.accept()
            await self._handle_loop()
        except WebSocketDisconnect:
            logger.info(
                "WebSocket disconnected | connection_id=%s chunks=%d",
                self.connection_id,
                self._chunk_index,
            )
        except Exception as exc:
            logger.error(
                "WebSocket error | connection_id=%s error=%s",
                self.connection_id,
                type(exc).__name__,
            )
            try:
                await self._send_error("INTERNAL_ERROR", str(exc))
            except Exception:
                pass

    async def _handle_loop(self) -> None:
        while True:
            raw = await self._ws.receive()

            # Handle disconnect frame
            if raw.get("type") == "websocket.disconnect":
                raise WebSocketDisconnect()

            # First frame: JSON metadata
            if raw.get("text") is not None:
                await self._handle_text_frame(raw["text"])
            elif raw.get("bytes") is not None:
                await self._handle_audio_chunk(raw["bytes"])
            else:
                await self._send_error("INVALID_FRAME", "Expected text or bytes frame.")

    async def _handle_text_frame(self, text: str) -> None:
        """Parse client's JSON metadata frame."""
        try:
            data = json.loads(text)
            self._metadata = StreamMetadata(**data)
            org = self._metadata.org

            # Validate org
            self._org.validate_org(org)

            # Build ML context
            self._ml_context = {
                "first_time_contact": self._metadata.first_time_contact,
                "high_value": self._metadata.high_value,
                "odd_hour": self._metadata.odd_hour,
                "sensitive_data_request": self._metadata.sensitive_data_request,
            }

            await self._ws.send_text(
                json.dumps({"type": "ready", "connection_id": self.connection_id})
            )
        except Exception as exc:
            await self._send_error("INVALID_METADATA", f"Metadata parse error: {exc}")

    async def _handle_audio_chunk(self, chunk_bytes: bytes) -> None:
        """Analyse a single audio chunk and send a risk_update response."""
        settings = self._settings
        max_bytes = settings.max_upload_bytes

        # Guard: oversized chunk
        if len(chunk_bytes) > max_bytes:
            await self._send_error("CHUNK_TOO_LARGE", "Audio chunk exceeds size limit.")
            del chunk_bytes
            return

        # Guard: empty chunk
        if len(chunk_bytes) == 0:
            await self._send_error("EMPTY_CHUNK", "Received empty audio chunk.")
            return

        org = self._metadata.org if self._metadata else settings.DEFAULT_ORG
        chunk_idx = self._chunk_index
        self._chunk_index += 1

        # Convert WebM/Opus (browser MediaRecorder) -> WAV PCM for ML
        try:
            wav_bytes = await asyncio.get_running_loop().run_in_executor(
                None,
                _webm_opus_to_wav_pcm,
                chunk_bytes,
            )
        except Exception as exc:
            await self._send_error("AUDIO_DECODE_ERROR", f"Failed to decode audio chunk: {type(exc).__name__}")
            del chunk_bytes
            return

        del chunk_bytes  # free original

        try:
            ml_result = await asyncio.get_running_loop().run_in_executor(
                None,
                self._ml._sync_analyze_bytes,  # already thread-safe, reuse
                wav_bytes,
                self._ml_context,
            )
        except (MLServiceUnavailable, MLServiceTimeout, MLServiceError) as exc:
            await self._send_error(
                "ML_ERROR", f"ML inference failed for chunk {chunk_idx}."
            )
            return
        except Exception as exc:
            await self._send_error("ML_ERROR", f"Unexpected error: {type(exc).__name__}")
            return
        finally:
            del chunk_bytes  # never persist

        # Rolling window
        risk = ml_result.get("risk_score")
        if risk is not None:
            self._rolling.append(risk)
        rolling_risk = statistics.median(self._rolling) if self._rolling else risk

        # Policy
        policy = self._org.evaluate(ml_result, org)

        signals = ml_result.get("signals", {})
        result = StreamChunkResult(
            type="risk_update",
            timestamp=datetime.now(timezone.utc),
            chunk_index=chunk_idx,
            risk_score=risk,
            rolling_risk_score=rolling_risk,
            band=ml_result.get("band"),
            confidence=ml_result.get("confidence"),
            signals=signals,
            flagged=policy.flagged,
            severity=policy.severity,
            recommended_action=policy.recommended_action,
        )

        await self._ws.send_text(result.model_dump_json())

    async def _send_error(self, code: str, message: str) -> None:
        err = StreamErrorResult(
            type="error",
            timestamp=datetime.now(timezone.utc),
            message=message,
            code=code,
        )
        try:
            await self._ws.send_text(err.model_dump_json())
        except Exception:
            pass  # client may have already disconnected
