"""
app/services/enrollment_service.py — Speaker enrollment CRUD.
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import EnrolledSpeaker
from app.db.repositories import EnrollmentRepository
from app.services.ml_service import MLService, MLServiceError, MLServiceUnavailable

logger = get_logger(__name__)


class EnrollmentService:
    """Handles speaker enrollment: embed → store.  Raw audio never persisted."""

    def __init__(self, ml_service: MLService) -> None:
        self._ml = ml_service

    async def enroll(
        self,
        *,
        speaker_id: str,
        display_name: str,
        audio_bytes: bytes,
        session: AsyncSession,
    ) -> EnrolledSpeaker:
        """
        Generate a voice embedding from audio and persist it.

        Privacy: audio_bytes are not stored; only the embedding is retained.

        Raises:
            MLServiceUnavailable: If Voiceprint module unavailable.
            MLServiceError:       If embedding extraction fails.
        """
        try:
            embedding = await self._ml.enroll_voice(audio_bytes, speaker_id)
        finally:
            del audio_bytes  # ensure audio bytes are released

        repo = EnrollmentRepository(session)
        record = await repo.create_or_update(speaker_id, display_name, embedding)
        logger.info(
            "Speaker enrolled | speaker_id=%s name=%s", speaker_id, display_name
        )
        return record

    async def get_profile(
        self,
        speaker_id: str,
        session: AsyncSession,
    ) -> EnrolledSpeaker | None:
        repo = EnrollmentRepository(session)
        return await repo.get(speaker_id)

    async def delete(
        self,
        speaker_id: str,
        session: AsyncSession,
    ) -> bool:
        repo = EnrollmentRepository(session)
        deleted = await repo.delete(speaker_id)
        if deleted:
            logger.info("Speaker enrollment deleted | speaker_id=%s", speaker_id)
        return deleted

    async def get_embedding(
        self,
        speaker_id: str,
        session: AsyncSession,
    ) -> list[float] | None:
        """
        Retrieve embedding for INTERNAL comparison (not for public API).
        Returns None if speaker not enrolled.
        """
        repo = EnrollmentRepository(session)
        return await repo.get_embedding(speaker_id)
