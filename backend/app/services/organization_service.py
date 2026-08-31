"""
app/services/organization_service.py — Organization policy evaluation.

Responsibilities:
  - Load organization JSON configuration.
  - Translate ML risk score → severity level.
  - Determine flagged status and recommended action.
  - Decide whether a webhook should fire.

This service does NOT perform ML inference — that belongs to MLService.
The ML Core owns the risk score; this service owns the operational decision.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Valid organization names (expand as JSON configs are added)
VALID_ORGS: frozenset[str] = frozenset({"bank", "enterprise", "government"})


class PolicyResult:
    """Output of OrganizationService.evaluate()."""

    __slots__ = ("flagged", "severity", "recommended_action", "should_webhook")

    def __init__(
        self,
        flagged: bool,
        severity: str,
        recommended_action: str,
        should_webhook: bool,
    ) -> None:
        self.flagged = flagged
        self.severity = severity
        self.recommended_action = recommended_action
        self.should_webhook = should_webhook

    def as_dict(self) -> dict[str, Any]:
        return {
            "flagged": self.flagged,
            "severity": self.severity,
            "recommended_action": self.recommended_action,
            "should_webhook": self.should_webhook,
        }


class OrganizationService:
    """
    Loads and caches organization configuration, then evaluates policy decisions
    against ML results.
    """

    def __init__(self) -> None:
        self._cache: dict[str, dict] = {}
        self._load_all()

    def _load_all(self) -> None:
        settings = get_settings()
        config_dir = settings.config_dir

        # Load default first
        default_path = config_dir / "default.json"
        if default_path.exists():
            self._cache["default"] = json.loads(default_path.read_text())

        # Load each organization
        org_dir = config_dir / "organizations"
        if org_dir.is_dir():
            for json_file in org_dir.glob("*.json"):
                org_name = json_file.stem
                self._cache[org_name] = json.loads(json_file.read_text())
                logger.info("OrganizationService: loaded config for '%s'", org_name)

        if not self._cache:
            logger.warning(
                "OrganizationService: no organization configs found in %s", config_dir
            )

    def get_config(self, org: str) -> dict:
        """Return the config dict for an organization, falling back to default."""
        if org in self._cache:
            return self._cache[org]
        return self._cache.get("default", {})

    def validate_org(self, org: str) -> str:
        """Validate that `org` is known.  Raises 400 if not."""
        if org not in VALID_ORGS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "code": "UNKNOWN_ORGANIZATION",
                    "message": (
                        f"Unknown organization '{org}'. "
                        f"Valid values: {sorted(VALID_ORGS)}"
                    ),
                },
            )
        return org

    def evaluate(
        self,
        ml_result: dict[str, Any],
        org: str,
    ) -> PolicyResult:
        """
        Evaluate organization policy against an ML result.

        Args:
            ml_result: Normalised result from MLService.
            org:       Organization name (already validated).

        Returns:
            PolicyResult with flagged, severity, recommended_action, should_webhook.
        """
        config = self.get_config(org)
        thresholds = config.get("thresholds", {})
        actions = config.get("actions", {})
        webhook_cfg = config.get("webhook", {})

        risk_score: float = ml_result.get("risk_score") or 0.0

        severity = self._classify_severity(risk_score, thresholds)
        flagged = severity in ("high", "critical")
        action = actions.get(severity, f"Risk level: {severity}")

        trigger_on: list[str] = webhook_cfg.get("trigger_on", ["high", "critical"])
        webhook_url: str | None = webhook_cfg.get("url")
        should_webhook = bool(webhook_url and severity in trigger_on)

        return PolicyResult(
            flagged=flagged,
            severity=severity,
            recommended_action=action,
            should_webhook=should_webhook,
        )

    @staticmethod
    def _classify_severity(risk_score: float, thresholds: dict) -> str:
        critical_min = thresholds.get("critical_min", 90)
        high_min = thresholds.get("high_min", 70)
        medium_max = thresholds.get("medium_max", 70)
        low_max = thresholds.get("low_max", 30)

        if risk_score >= critical_min:
            return "critical"
        if risk_score >= high_min:
            return "high"
        if risk_score >= low_max:
            return "medium"
        return "low"

    def get_webhook_url(self, org: str) -> str | None:
        """Return the webhook URL for an org (None if not configured)."""
        config = self.get_config(org)
        return config.get("webhook", {}).get("url")
