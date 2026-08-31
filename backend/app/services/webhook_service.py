"""
app/services/webhook_service.py — Fire-and-forget webhook delivery.

Rule: Webhook failure MUST NOT cause analysis failure.
The analysis is already complete and evidence logged before this runs.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.security import validate_webhook_url

logger = get_logger(__name__)


class WebhookDeliveryResult:
    __slots__ = ("success", "status_code", "error")

    def __init__(
        self,
        success: bool,
        status_code: int | None = None,
        error: str | None = None,
    ) -> None:
        self.success = success
        self.status_code = status_code
        self.error = error


async def deliver_webhook(
    url: str,
    payload: dict[str, Any],
    timeout: float | None = None,
) -> WebhookDeliveryResult:
    """
    POST `payload` as JSON to `url`.

    Args:
        url:     Target webhook URL (validated before calling).
        payload: Event payload (must NOT contain secrets, audio, or embeddings).
        timeout: Override for WEBHOOK_TIMEOUT_SECONDS.

    Returns:
        WebhookDeliveryResult.  Never raises — all errors are caught and logged.

    Privacy/security:
        - Never logs the URL (may contain tokens in query params).
        - Never logs the payload contents beyond status codes.
    """
    settings = get_settings()
    effective_timeout = timeout if timeout is not None else settings.WEBHOOK_TIMEOUT_SECONDS

    # Validate URL before attempting delivery
    try:
        validate_webhook_url(url)
    except ValueError as exc:
        logger.warning("Webhook skipped — invalid URL: %s", exc)
        return WebhookDeliveryResult(success=False, error=str(exc))

    try:
        async with httpx.AsyncClient(timeout=effective_timeout) as client:
            response = await client.post(url, json=payload)
            if response.is_success:
                logger.info(
                    "Webhook delivered | event=%s status=%d",
                    payload.get("event", "unknown"),
                    response.status_code,
                )
                return WebhookDeliveryResult(success=True, status_code=response.status_code)
            else:
                logger.warning(
                    "Webhook delivery failed | event=%s http_status=%d",
                    payload.get("event", "unknown"),
                    response.status_code,
                )
                return WebhookDeliveryResult(
                    success=False,
                    status_code=response.status_code,
                    error=f"HTTP {response.status_code}",
                )
    except httpx.TimeoutException:
        logger.warning(
            "Webhook timed out | event=%s timeout=%.1fs",
            payload.get("event", "unknown"),
            effective_timeout,
        )
        return WebhookDeliveryResult(success=False, error="timeout")
    except Exception as exc:
        logger.error(
            "Webhook error | event=%s error=%s",
            payload.get("event", "unknown"),
            type(exc).__name__,
        )
        return WebhookDeliveryResult(success=False, error=str(exc))


def build_risk_alert_payload(
    *,
    analysis_id: str,
    organization: str,
    risk_score: float | None,
    severity: str,
    recommended_action: str,
) -> dict[str, Any]:
    """
    Build the standard voice-clone-risk webhook payload.

    Privacy: Contains only metadata — no audio, no embeddings.
    """
    return {
        "event": "voice_clone_risk",
        "analysis_id": analysis_id,
        "organization": organization,
        "risk_score": risk_score,
        "severity": severity,
        "recommended_action": recommended_action,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def fire_webhook_background(
    url: str,
    analysis_id: str,
    organization: str,
    risk_score: float | None,
    severity: str,
    recommended_action: str,
) -> None:
    """
    Convenience wrapper: build payload and deliver in the background.

    Designed to be called with asyncio.create_task() so it does not block
    the main response path.
    """
    payload = build_risk_alert_payload(
        analysis_id=analysis_id,
        organization=organization,
        risk_score=risk_score,
        severity=severity,
        recommended_action=recommended_action,
    )
    await deliver_webhook(url, payload)
