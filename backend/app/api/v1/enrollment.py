"""
app/api/v1/enrollment.py — Speaker enrollment endpoints.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import validate_audio_upload
from app.db.database import get_session
from app.schemas.enrollment import EnrollResponse, SpeakerProfile
from app.services.enrollment_service import EnrollmentService
from app.services.ml_service import MLServiceError, MLServiceUnavailable

router = APIRouter(prefix="/v1", tags=["enrollment"])


@router.post(
    "/enroll",
    response_model=EnrollResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Enroll a speaker's voiceprint",
    description=(
        "Register a known speaker's voice embedding for future voiceprint comparison. "
        "Raw audio is discarded after embedding extraction."
    ),
    responses={
        400: {"description": "Invalid request"},
        415: {"description": "Unsupported audio format"},
        503: {"description": "ML service unavailable"},
    },
)
async def enroll_speaker(
    request: Request,
    speaker_id: str = Form(..., description="Unique identifier for this speaker."),
    name: str = Form(..., description="Display name for this speaker."),
    file: UploadFile = File(..., description="Audio sample for embedding generation."),
    session: AsyncSession = Depends(get_session),
) -> EnrollResponse:
    """
    Enroll a speaker by generating and storing their voice embedding.

    The embedding is derived from the provided audio file.
    The raw audio is **not** stored — only the embedding is retained.
    The embedding is **not** exposed in any public API response.
    """
    ml_service = request.app.state.ml_service

    audio_bytes = await validate_audio_upload(file)

    enrollment_svc = EnrollmentService(ml_service)
    try:
        record = await enrollment_svc.enroll(
            speaker_id=speaker_id,
            display_name=name,
            audio_bytes=audio_bytes,
            session=session,
        )
    except MLServiceUnavailable as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "ML_SERVICE_UNAVAILABLE",
                "message": "Voiceprint module is not available. Ensure resemblyzer is installed.",
            },
        )
    except MLServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "ENROLLMENT_ERROR", "message": "Embedding extraction failed."},
        )

    return EnrollResponse(
        speaker_id=record.speaker_id,
        display_name=record.display_name,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get(
    "/enroll/{speaker_id}",
    response_model=SpeakerProfile,
    summary="Get enrolled speaker profile",
    description="Returns public profile for an enrolled speaker. Never includes the embedding.",
    responses={
        404: {"description": "Speaker not found"},
    },
)
async def get_speaker(
    speaker_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> SpeakerProfile:
    ml_service = request.app.state.ml_service
    enrollment_svc = EnrollmentService(ml_service)
    record = await enrollment_svc.get_profile(speaker_id, session)

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "SPEAKER_NOT_FOUND",
                "message": f"No enrolled speaker with ID '{speaker_id}'.",
            },
        )

    return SpeakerProfile(
        speaker_id=record.speaker_id,
        display_name=record.display_name,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.delete(
    "/enroll/{speaker_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an enrolled speaker",
    description="Remove the stored voiceprint for a speaker.",
    responses={
        404: {"description": "Speaker not found"},
    },
)
async def delete_speaker(
    speaker_id: str,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> None:
    ml_service = request.app.state.ml_service
    enrollment_svc = EnrollmentService(ml_service)
    deleted = await enrollment_svc.delete(speaker_id, session)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "SPEAKER_NOT_FOUND",
                "message": f"No enrolled speaker with ID '{speaker_id}'.",
            },
        )
