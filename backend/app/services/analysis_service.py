"""
app/services/analysis_service.py — Orchestrates the full analysis pipeline.

Flow:
    audio_bytes
        ↓
    MLService.analyze_file()
        ↓
    OrganizationService.evaluate()
        ↓
    EvidenceRepository.create()
        ↓
    (optional background webhook)
        ↓
    AnalysisResponse
"""
from __future__ import annotations

import asyncio
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger, log_analysis_completed, log_analysis_error
from app.db.repositories import EvidenceRepository
from app.schemas.analysis import AnalysisResponse, ModelsSchema, SignalsSchema
from app.services.ml_service import (
    MLService,
    MLServiceError,
    MLServiceTimeout,
    MLServiceUnavailable,
)
from app.services.organization_service import OrganizationService
from app.services.webhook_service import fire_webhook_background

logger = get_logger(__name__)


class AnalysisService:
    """Orchestrates: ML inference → policy evaluation → evidence log → webhook."""

    def __init__(
        self,
        ml_service: MLService,
        org_service: OrganizationService,
    ) -> None:
        self._ml = ml_service
        self._org = org_service

    async def run_analysis(
        self,
        *,
        request_id: str,
        audio_bytes: bytes,
        org: str,
        context: Optional[dict[str, Any]],
        session: AsyncSession,
        enrolled_embedding: Optional[list[float]] = None,
        fusion: Optional[dict[str, bool]] = None,
    ) -> AnalysisResponse:
        """
        Full analysis pipeline.

        Args:
            request_id:        Correlation ID for logging.
            audio_bytes:       Raw audio bytes (deleted from memory after use).
            org:               Validated organization name.
            context:           Optional metadata flags forwarded to ML Core.
            session:           Database session.
            enrolled_embedding: If the context references a speaker, the embedding
                               resolved from the DB is passed here for ML comparison.
            fusion:            Optional signal->bool mask enabling a multi-signal
                               weighted verdict instead of the raw classifier alone.

        Returns:
            AnalysisResponse ready to send to the client.
        """
        analysis_id = str(uuid.uuid4())
        t0 = time.perf_counter()

        # Build ML context dict — forward enrolled embedding if available
        ml_context: dict[str, Any] | None = None
        if context is not None:
            ml_context = dict(context)
            if enrolled_embedding is not None:
                import numpy as np

                ml_context["enrolled_embedding"] = np.asarray(
                    enrolled_embedding, dtype="float32"
                )

        # ── ML Inference ────────────────────────────────────────────────
        ml_result = None
        ml_error_code: str | None = None
        ml_error_msg: str | None = None

        try:
            ml_result = await self._ml.analyze_file(
                audio_bytes, context=ml_context, fusion=fusion
            )
        except MLServiceUnavailable as exc:
            ml_error_code = "ML_SERVICE_UNAVAILABLE"
            ml_error_msg = str(exc)
        except MLServiceTimeout as exc:
            ml_error_code = "ML_TIMEOUT"
            ml_error_msg = str(exc)
        except MLServiceError as exc:
            ml_error_code = "ML_ERROR"
            ml_error_msg = str(exc)
        finally:
            # Critical: ensure audio bytes are released from memory
            del audio_bytes

        latency_ms = (time.perf_counter() - t0) * 1000

        if ml_result is None:
            log_analysis_error(
                logger,
                request_id=request_id,
                error_code=ml_error_code or "ML_ERROR",
                message=ml_error_msg or "Unknown ML error",
            )
            # Raise the appropriate HTTP error
            from fastapi import HTTPException, status

            if ml_error_code == "ML_SERVICE_UNAVAILABLE":
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail={
                        "code": "ML_SERVICE_UNAVAILABLE",
                        "message": "ML service is not available.",
                    },
                )
            elif ml_error_code == "ML_TIMEOUT":
                raise HTTPException(
                    status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                    detail={
                        "code": "ML_TIMEOUT",
                        "message": "ML inference timed out.",
                    },
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail={
                        "code": "ML_ERROR",
                        "message": "ML inference failed.",
                    },
                )

        # ── Policy Evaluation ────────────────────────────────────────────
        policy = self._org.evaluate(ml_result, org)

        # ── Evidence Logging ─────────────────────────────────────────────
        evidence_repo = EvidenceRepository(session)
        signals = ml_result.get("signals", {})
        models = ml_result.get("models", {})

        evidence_data = {
            "analysis_id": analysis_id,
            "organization": org,
            "risk_score": ml_result.get("risk_score"),
            "risk_band": ml_result.get("band"),
            "confidence": ml_result.get("confidence"),
            "synthetic_probability": models.get("synthetic_prob"),
            "prosody_anomaly": signals.get("prosody_anomaly"),
            "voiceprint_risk": signals.get("voiceprint_risk"),
            "context_risk": signals.get("context_risk"),
            "flagged": policy.flagged,
            "severity": policy.severity,
            "recommended_action": policy.recommended_action,
            "model_version": self._ml.model_version,
            "processing_latency_ms": latency_ms,
        }

        evidence = await evidence_repo.create(evidence_data)

        log_analysis_completed(
            logger,
            request_id=request_id,
            analysis_id=analysis_id,
            organization=org,
            risk_score=ml_result.get("risk_score") or 0.0,
            band=ml_result.get("band") or "unknown",
            flagged=policy.flagged,
            latency_ms=latency_ms,
        )

        # ── Webhook (fire-and-forget) ─────────────────────────────────────
        if policy.should_webhook:
            webhook_url = self._org.get_webhook_url(org)
            if webhook_url:
                asyncio.create_task(
                    fire_webhook_background(
                        url=webhook_url,
                        analysis_id=analysis_id,
                        organization=org,
                        risk_score=ml_result.get("risk_score"),
                        severity=policy.severity,
                        recommended_action=policy.recommended_action,
                    )
                )

        # ── Build response ────────────────────────────────────────────────
        return AnalysisResponse(
            analysis_id=analysis_id,
            risk_score=ml_result.get("risk_score"),
            band=ml_result.get("band"),
            confidence=ml_result.get("confidence"),
            models=ModelsSchema(
                synthetic_prob=models.get("synthetic_prob"),
            ),
            signals=SignalsSchema(
                model=signals.get("model"),
                prosody_anomaly=signals.get("prosody_anomaly"),
                voiceprint_risk=signals.get("voiceprint_risk"),
                context_risk=signals.get("context_risk"),
            ),
            organization=org,
            flagged=policy.flagged,
            severity=policy.severity,
            recommended_action=policy.recommended_action,
            timestamp=datetime.now(timezone.utc),
            evidence_id=evidence.analysis_id,
            processing_latency_ms=latency_ms,
        )
