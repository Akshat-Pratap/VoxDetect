"""
app/core/security.py — Upload validation, URL safety, and security helpers.

Validates uploaded audio files before they touch the ML Core.
"""
from __future__ import annotations

import re
from urllib.parse import urlparse

from fastapi import HTTPException, UploadFile, status

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Supported audio extensions
ALLOWED_EXTENSIONS: frozenset[str] = frozenset(
    {".wav", ".mp3", ".flac", ".ogg", ".m4a", ".webm"}
)

# Accepted MIME types (Content-Type may be browser-supplied; use alongside extension)
ALLOWED_MIME_TYPES: frozenset[str] = frozenset(
    {
        "audio/wav",
        "audio/x-wav",
        "audio/wave",
        "audio/mpeg",
        "audio/mp3",
        "audio/flac",
        "audio/x-flac",
        "audio/ogg",
        "audio/mp4",
        "audio/x-m4a",
        "audio/webm",
        "application/octet-stream",  # some clients send generic binary
    }
)


async def validate_audio_upload(file: UploadFile) -> bytes:
    """
    Read, size-check, and extension-validate an uploaded audio file.

    Returns:
        The raw bytes of the audio file.

    Raises:
        HTTPException 400 if no file supplied.
        HTTPException 413 if file exceeds MAX_UPLOAD_SIZE_MB.
        HTTPException 415 if extension is not in the allowed set.
    """
    settings = get_settings()

    if file is None or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "MISSING_FILE",
                "message": "No audio file was supplied.",
            },
        )

    # Extension check
    suffix = _get_extension(file.filename)
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail={
                "code": "UNSUPPORTED_AUDIO",
                "message": (
                    f"Unsupported audio format '{suffix}'. "
                    f"Accepted: {sorted(ALLOWED_EXTENSIONS)}"
                ),
            },
        )

    # Read with size guard — read in one call then check size
    limit = settings.max_upload_bytes
    audio_bytes = await file.read()
    total = len(audio_bytes)
    if total > limit:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "AUDIO_TOO_LARGE",
                "message": (
                    f"Audio exceeds maximum size of "
                    f"{settings.MAX_UPLOAD_SIZE_MB} MB."
                ),
            },
        )

    if len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMPTY_FILE",
                "message": "Uploaded audio file is empty.",
            },
        )

    return audio_bytes


def validate_webhook_url(url: str) -> None:
    """
    Validate that a webhook URL is a safe HTTP/HTTPS endpoint.

    Raises:
        ValueError if the URL is not safe.
    """
    try:
        parsed = urlparse(url)
    except Exception:
        raise ValueError(f"Invalid webhook URL: {url!r}")

    if parsed.scheme not in ("http", "https"):
        raise ValueError(
            f"Webhook URL must use http or https scheme. Got: {parsed.scheme!r}"
        )

    if not parsed.netloc:
        raise ValueError("Webhook URL has no host.")

    # Block private/loopback addresses in production if desired
    # (kept permissive for dev so local servers can receive webhooks)


def _get_extension(filename: str) -> str:
    """Return normalised lowercase file extension including the dot."""
    if not filename:
        return ""
    # Take last suffix only
    parts = filename.rsplit(".", 1)
    if len(parts) < 2:
        return ""
    return f".{parts[-1].lower()}"


def generate_request_id() -> str:
    """Generate a short UUID4-based request correlation ID."""
    import uuid

    return str(uuid.uuid4())
