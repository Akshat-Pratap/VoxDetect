"""
app/api/v1/analysis.py — POST /v1/analyze-call endpoint.
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import generate_request_id, validate_audio_upload
from app.db.database import get_session
from app.schemas.analysis import AnalysisResponse, CallContext
from app.services.analysis_service import AnalysisService
from app.services.enrollment_service import EnrollmentService

router = APIRouter(prefix="/v1", tags=["analysis"])


@router.post(
    "/analyze-call",
    response_model=AnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse a voice call for cloning risk",
    description=(
        "Upload an audio file (wav/mp3/flac/ogg) and receive a risk assessment. "
        "Raw audio is never stored — only metadata and risk scores are persisted."
    ),
    responses={
        400: {"description": "Missing or invalid file"},
        413: {"description": "Audio file too large"},
        415: {"description": "Unsupported audio format"},
        503: {"description": "ML service unavailable"},
        504: {"description": "ML inference timed out"},
    },
)
async def analyze_call(
    request: Request,
    file: UploadFile = File(..., description="Audio file to analyse."),
    org: str = Form(default="enterprise", description="Organisation profile to apply."),
    context: Optional[str] = Form(
        default=None,
        description="JSON-encoded CallContext metadata (optional).",
    ),
    fusion: Optional[str] = Form(
        default=None,
        description='JSON-encoded signal->bool mask enabling fusion (e.g. {"model":true,"prosody_anomaly":true,"voiceprint_risk":true,"context_risk":true}).',
    ),
    session: AsyncSession = Depends(get_session),
) -> AnalysisResponse:
    """
    Full voice-clone risk analysis pipeline.

    Accepts multipart/form-data with:
    - `file`: audio file (wav/mp3/flac/ogg ≤ MAX_UPLOAD_SIZE_MB)
    - `org`: organisation profile (bank | enterprise | government)
    - `context`: JSON string of CallContext (optional)
    - `fusion`: JSON string of signal->bool mask enabling multi-signal verdict (optional)

    Returns a complete risk assessment.  Audio is deleted after processing.
    """
    request_id = generate_request_id()

    # ── Resolve services ──────────────────────────────────────────────────
    ml_service = request.app.state.ml_service
    org_service = request.app.state.org_service

    # ── Validate org ──────────────────────────────────────────────────────
    org = org_service.validate_org(org)

    # ── Parse context ─────────────────────────────────────────────────────
    call_context: Optional[CallContext] = None
    if context:
        try:
            call_context = CallContext(**json.loads(context))
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_CONTEXT",
                    "message": "context must be a valid JSON-encoded CallContext object.",
                },
            )

    # ── Parse fusion mask (optional) ──────────────────────────────────────
    fusion_mask: Optional[dict[str, bool]] = None
    if fusion:
        try:
            fusion_mask = json.loads(fusion)
            if not isinstance(fusion_mask, dict):
                raise ValueError("must be an object")
            fusion_mask = {
                k: bool(v)
                for k, v in fusion_mask.items()
                if k in ("model", "prosody_anomaly", "voiceprint_risk", "context_risk")
            }
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "INVALID_FUSION",
                    "message": (
                        "fusion must be a JSON object of signal->bool, e.g. "
                        '{"model":true,"prosody_anomaly":true,"voiceprint_risk":true,"context_risk":true}.'
                    ),
                },
            )

    # ── Validate + read audio ─────────────────────────────────────────────
    audio_bytes = await validate_audio_upload(file)

    # ── Resolve enrolled embedding (if speaker_id supplied) ───────────────
    enrolled_embedding = None
    if call_context and call_context.enrolled_speaker_id:
        enrollment_svc = EnrollmentService(ml_service)
        enrolled_embedding = await enrollment_svc.get_embedding(
            call_context.enrolled_speaker_id, session
        )

    # ── Build ML context dict ──────────────────────────────────────────────
    ml_context_dict: dict | None = None
    if call_context:
        ml_context_dict = call_context.model_dump(exclude={"enrolled_speaker_id"})

    # ── Run analysis pipeline ──────────────────────────────────────────────
    analysis_svc = AnalysisService(ml_service, org_service)
    return await analysis_svc.run_analysis(
        request_id=request_id,
        audio_bytes=audio_bytes,
        org=org,
        context=ml_context_dict,
        session=session,
        enrolled_embedding=enrolled_embedding,
        fusion=fusion_mask,
    )
