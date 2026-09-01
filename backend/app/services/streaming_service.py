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
# Uses ffmpeg subprocess (system PATH or imageio-ffmpeg fallback)


def _get_ffmpeg_bin() -> str:
    """Return path to ffmpeg binary (from system PATH or imageio-ffmpeg)."""
    import shutil
    ffmpeg_path = shutil.which("ffmpeg")
    if ffmpeg_path:
        return ffmpeg_path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def _webm_opus_to_wav_pcm(webm_bytes: bytes) -> bytes:
    """
    Convert an accumulated WebM/Opus stream (browser MediaRecorder) to 16kHz mono WAV PCM bytes.

    IMPORTANT: MediaRecorder sends a continuous WebM stream split into chunks, where the
    container header lives only in the FIRST chunk. Individual continuation chunks are NOT
    self-describing and fail to decode on their own. So callers must accumulate the full
    stream and pass the complete buffer here each time.

    Uses ffmpeg subprocess.
    Returns raw WAV bytes suitable for the ML pipeline.
    """
    import subprocess

    ffmpeg_bin = _get_ffmpeg_bin()
    result = subprocess.run(
        [
            ffmpeg_bin,
            "-y",
            "-i",
            "-",
            "-f",
            "wav",
            "-ar",
            "16000",
            "-ac",
            "1",
            "-",
        ],
        input=webm_bytes,
        capture_output=True,
    )

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="ignore") if result.stderr else "unknown error"
        raise RuntimeError(f"ffmpeg decode failed: {stderr}")

    if not result.stdout:
        raise RuntimeError("ffmpeg produced empty output")

    return result.stdout


def _trim_wav_to_newest_seconds(wav_bytes: bytes, seconds: int) -> bytes:
    """Slice a 16kHz mono 16-bit WAV to its newest `seconds` of PCM.

    ffmpeg's piped WAV output is not a fixed 44-byte header: it can contain a
    LIST/info chunk before `data`, and it writes 0xFFFFFFFF "unknown" sizes for
    streamed input. So we parse the chunk structure to find the real `data`
    offset, slice the PCM tail, and rebuild a clean standard WAV header.
    Returns the input unchanged if there isn't enough audio yet.
    """
    import struct

    def find_data(wave_bytes: bytes) -> int | None:
        # Standard RIFF/RIFF chunk walk starting after the 12-byte header
        fmt_size = struct.unpack_from("<H", wave_bytes, 16)[0]
        pos = 20 + fmt_size  # past 'fmt ' chunk and its payload
        pos += pos % 2  # chunks are 2-byte aligned
        while pos + 8 <= len(wave_bytes):
            cid = wave_bytes[pos : pos + 4]
            csz = struct.unpack_from("<I", wave_bytes, pos + 4)[0]
            if cid == b"data":
                return pos
            if csz == 0xFFFFFFFF:  # unknown size, stop walking
                return None
            pos += 8 + csz + (csz % 2)
        return None

    data_pos = find_data(wav_bytes)
    if data_pos is None:
        return wav_bytes  # can't locate data; analyse as-is

    payload_start = data_pos + 8
    payload = len(wav_bytes) - payload_start
    if payload <= 0:
        return wav_bytes

    keep = int(seconds * 32000)  # 16kHz mono 16-bit
    keep = max(keep, 16000)  # at least 0.5s
    if payload <= keep:
        return wav_bytes

    # Take last `keep` PCM bytes
    tail_offset = payload_start + (payload - keep)
    pcm_tail = wav_bytes[tail_offset:]

    # Rebuild clean standard WAV: RIFF header + fmt chunk + data chunk
    channels, sr, bits = 1, 16000, 16
    byte_rate = sr * channels * bits // 8
    block_align = channels * bits // 8
    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        36 + keep,
        b"WAVE",
        b"fmt ",
        16,
        1,  # PCM
        channels,
        sr,
        byte_rate,
        block_align,
        bits,
        b"data",
        keep,
    )
    return header + pcm_tail


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
        self._fusion: Optional[dict[str, bool]] = None
        self._rolling: deque[float] = deque(
            maxlen=self._settings.STREAM_ROLLING_WINDOW
        )
        # Accumulated WebM/Opus stream for this connection. WebM chunks from the
        # browser must be concatenated (header lives in chunk 0) and decoded as
        # one buffer; the decoded PCM is trimmed to the newest window each time.
        self._webm_buffer = bytearray()
        self._max_webm = max(
            16 * 1024 * 1024, self._settings.max_upload_bytes * 4
        )
        self._ml_context: dict[str, Any] | None = None

        # Hysteresis / sticky flag state: once a chunk flags HIGH or CRITICAL
        # the alarm stays armed until STREAM_DISARM_STREAK consecutive low
        # (unflagged) chunks are observed. This prevents a single weak 4s audio
        # window from flickering a genuine clone alarm back to "not flagged".
        self._armed = False
        self._low_streak = 0

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

            # Remember the fusion mask (which signals vote in the verdict)
            self._fusion = self._metadata.fusion

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

        # Accumulate WebM/Opus stream. The browser's MediaRecorder sends one long
        # WebM container split into chunks; the header is only in the first chunk,
        # so individual chunks are NOT self-decodable. We buffer the whole stream
        # and decode it as one unit each time.
        self._webm_buffer += chunk_bytes
        del chunk_bytes

        # Bound memory: if the accumulated WebM grows too large (≈30+ min of audio),
        # clear it so we never hold unbounded audio. Context resets.
        if len(self._webm_buffer) > self._max_webm:
            logger.warning("WebM buffer exceeded cap; resetting accumulation")
            self._webm_buffer = bytearray()
            await self._send_error(
                "BUFFER_RESET", "Decode buffer reset (long-running stream)."
            )
            return

        try:
            wav_bytes = await asyncio.get_running_loop().run_in_executor(
                None,
                _webm_opus_to_wav_pcm,
                bytes(self._webm_buffer),
            )
        except Exception as exc:
            await self._send_error(
                "AUDIO_DECODE_ERROR", f"Failed to decode audio: {type(exc).__name__}"
            )
            return

        # Analyse only the newest analysis window, not the whole accumulated
        # conversation. Keeps inference constant-time (fast, reactive updates)
        # and makes the score reflect recent speech instead of all audio so far.
        wav_bytes = await asyncio.get_running_loop().run_in_executor(
            None,
            _trim_wav_to_newest_seconds,
            wav_bytes,
            settings.STREAM_ANALYSIS_WINDOW_SECONDS,
        )

        try:
            ml_result = await asyncio.get_running_loop().run_in_executor(
                None,
                self._ml._sync_analyze_bytes,  # already thread-safe, reuse
                wav_bytes,
                self._ml_context,
                self._fusion,
            )
        except (MLServiceUnavailable, MLServiceTimeout, MLServiceError) as exc:
            await self._send_error(
                "ML_ERROR", f"ML inference failed for chunk {chunk_idx}."
            )
            return
        except Exception as exc:
            await self._send_error("ML_ERROR", f"Unexpected error: {type(exc).__name__}")
            return

        # Rolling window
        risk = ml_result.get("risk_score")
        if risk is not None:
            self._rolling.append(risk)
        rolling_risk = statistics.median(self._rolling) if self._rolling else risk

        # Policy
        policy = self._org.evaluate(ml_result, org)

        # ── Hysteresis / sticky flagging ──────────────────────────────────
        # The per-window raw score can flicker (a clone scored 89 one window,
        # 19 the next). Base the *decision* on the policy severity but keep the
        # alarm ARMED once a high/critical chunk is seen, clearing it only after
        # STREAM_DISARM_STREAK consecutive low (unflagged) chunks. This matches
        # real-time alarm debouncing: don't un-flag a genuine clone on one weak
        # 4-second window.
        disarm_streak = self._settings.STREAM_DISARM_STREAK
        if policy.severity in ("high", "critical"):
            self._armed = True
            self._low_streak = 0
        elif self._armed:
            self._low_streak += 1
            if self._low_streak >= disarm_streak:
                self._armed = False
                self._low_streak = 0

        flagged = bool(policy.flagged or self._armed)
        severity = policy.severity
        # While armed but currently below threshold, keep a clear (high) label
        # so the UI doesn't show a contradictory not-flagged state.
        if self._armed and not policy.flagged:
            severity = "high"
        # Keep band aligned with the effective severity so the gauge/badge match
        # the armed decision rather than flickering with the raw window score.
        band = severity if severity in ("low", "medium", "high", "critical") else ml_result.get("band")

        signals = ml_result.get("signals", {})
        result = StreamChunkResult(
            type="risk_update",
            timestamp=datetime.now(timezone.utc),
            chunk_index=chunk_idx,
            risk_score=risk,
            rolling_risk_score=rolling_risk,
            band=band,
            confidence=ml_result.get("confidence"),
            signals=signals,
            flagged=flagged,
            severity=severity,
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
