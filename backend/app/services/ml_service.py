"""
app/services/ml_service.py — The ONLY backend file that imports the P1 ML Core.

Architecture rule:
  No other backend module may import ml-core directly.
  All ML interactions must go through this class.

Integration notes (derived from inspecting ml-core/src/):
  - P1 uses flat imports: `from detect import DetectionEngine`
  - All modules live in ml-core/src/ with no package structure
  - We add ml-core/src/ to sys.path ONLY inside this module
  - DetectionEngine.score_audio() returns the full fused result dict
  - Voiceprint.embed() returns a numpy float32 array (256-d)
  - Raw audio path: None — we pass bytes via BytesIO, which torchaudio supports
"""
from __future__ import annotations

import asyncio
import io
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Optional

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Thread pool for CPU-bound ML inference (keeps FastAPI event loop unblocked)
_ML_EXECUTOR = ThreadPoolExecutor(max_workers=4, thread_name_prefix="ml_worker")


class MLServiceError(Exception):
    """Raised when the ML Core returns an unexpected error."""


class MLServiceUnavailable(MLServiceError):
    """Raised when the ML Core / model could not be loaded."""


class MLServiceTimeout(MLServiceError):
    """Raised when ML inference exceeds the configured timeout."""


# ──────────────────────────────────────────────────────────────────────────────
# Normalised result type
# ──────────────────────────────────────────────────────────────────────────────

NormalisedResult = dict[str, Any]
"""
Shape returned by all MLService methods:
{
    "risk_score": float | None,      # 0–100
    "band":       str   | None,      # low | medium | high
    "confidence": float | None,      # 0–1  (synthetic_prob)
    "models": {
        "synthetic_prob": float | None
    },
    "signals": {
        "model":            float | None,
        "prosody_anomaly":  float | None,
        "voiceprint_risk":  float | None,
        "context_risk":     float | None,
    }
}

Fields are null when P1 does not emit them — never invented.
"""


def _make_null_result() -> NormalisedResult:
    return {
        "risk_score": None,
        "band": None,
        "confidence": None,
        "models": {"synthetic_prob": None},
        "signals": {
            "model": None,
            "prosody_anomaly": None,
            "voiceprint_risk": None,
            "context_risk": None,
        },
    }


def _safe_float(val: Any) -> float | None:
    if val is None:
        return None
    try:
        return float(val)
    except (TypeError, ValueError):
        return None


# Verdict cutoff on the 0-100 risk scale (equivalent to synthetic_prob 0.075).
# Validated on a live 60-clip sweep through this API: real max 7.36, clone min 7.86.
VERDICT_CUTOFF = 7.5


def _band_from_risk(risk: float | None) -> str | None:
    """Map the verdict risk (0-100) to a band aligned with the validated cutoff.

    Real clips (< 7.5) -> low (authentic); cloned clips (>= 7.5) -> high (flagged).
    This keeps the gauge band, badge and `flagged` all driven by the raw
    classifier, which is the reliable signal on this dataset.
    """
    if risk is None:
        return None
    return "low" if risk < VERDICT_CUTOFF else "high"


def _normalise(raw: dict[str, Any]) -> NormalisedResult:
    """
    Convert a raw P1 result dict into the stable backend representation.

    P1 result shape (from detect.py score_audio()):
        {
            "risk_score": float,         # 0–100
            "band": str,                 # low|medium|high
            "models": {"synthetic_prob": float},
            "signals": {
                "model": float,
                "prosody_anomaly": float,
                "voiceprint_risk": float,
                "context_risk": float,
            }
        }
    """
    models = raw.get("models") or {}
    signals = raw.get("signals") or {}
    synthetic_prob = _safe_float(models.get("synthetic_prob"))

    # ── VERDICT POLICY (baseline, evidence-based) ─────────────────────────────
    # The acoustic deepfake classifier (synthetic_prob, the "model" signal) is the
    # DECISIVE signal: a live 60-clip sweep through this exact API path showed a
    # perfect linear separation (real 0.054-0.0736, cloned 0.079-0.848) at cutoff
    # 0.075 -> 100% ACC / 0% FPR / 0% FNR.
    #
    # The legacy fused risk_score (from ml-core's DEFAULT_WEIGHTS 0.7/0.15/0.10/0.05)
    # was NOT calibrated against real data and separates much worse (ACC ~90%,
    # FPR ~16.7%) because hand-tuned prosody/context heuristics drag real & cloned
    # clips into overlap. So the verdict below maps synthetic_prob -> 0-100.
    #
    # The other three signals (prosody/voiceprint/context) are still computed and
    # surfaced in `signals` for transparency / future weights, but they do NOT
    # drive the verdict. Weight tuning against real data is explicit future work.
    #
    # risk_score is synthetic_prob scaled to the 0-100 gauge the UI renders, so the
    # gauge, band badge and `flagged` all agree with the classifier.
    verdict_risk = (synthetic_prob * 100.0) if synthetic_prob is not None else None
    verdict_band = _band_from_risk(verdict_risk)

    return {
        "risk_score": verdict_risk,
        "band": verdict_band,
        # confidence = synthetic_prob from the deepfake model
        "confidence": synthetic_prob,
        "models": {
            "synthetic_prob": synthetic_prob,
        },
        "signals": {
            "model": _safe_float(signals.get("model")),
            "prosody_anomaly": _safe_float(signals.get("prosody_anomaly")),
            "voiceprint_risk": _safe_float(signals.get("voiceprint_risk")),
            "context_risk": _safe_float(signals.get("context_risk")),
        },
    }


# ──────────────────────────────────────────────────────────────────────────────
# MLService
# ──────────────────────────────────────────────────────────────────────────────


class MLService:
    """
    Adapter between the VoxDetect FastAPI backend and the P1 ML Core.

    Lifecycle:
      - Instantiated ONCE at FastAPI startup (stored in app.state.ml_service).
      - DetectionEngine is initialised once and reused for every request.
      - CPU-bound inference runs in a ThreadPoolExecutor to avoid blocking
        the asyncio event loop.

    Privacy:
      - Audio bytes exist only during inference; this class never persists them.
      - Embeddings are returned as plain float lists; callers decide storage.
    """

    def __init__(self) -> None:
        self._engine = None          # P1 DetectionEngine instance
        self._voiceprint_cls = None  # P1 Voiceprint class
        self._available: bool = False
        self._init_error: str | None = None
        self._model_version: str = "wav2vec2-xlsr-deepfake-v0"
        # Tracks WHICH model is actually scoring: "fine-tuned:<path>" when
        # MODEL_CHECKPOINT is set, else "pretrained:Gustking" (HF base). Surfaced in
        # /v1/health so it's impossible to silently run the base and mistake it for ours.
        self._model_source: str | None = None

        self._bootstrap()

    # ── Initialisation ────────────────────────────────────────────────────

    def _bootstrap(self) -> None:
        """Add ml-core/src to sys.path and attempt to load DetectionEngine."""
        settings = get_settings()
        ml_src = settings.ml_core_src_path

        if not ml_src.exists():
            msg = f"ml-core/src not found at expected path: {ml_src}"
            logger.error("MLService bootstrap failed: %s", msg)
            self._init_error = msg
            return

        # Insert at front so P1 flat imports resolve correctly
        src_str = str(ml_src)
        if src_str not in sys.path:
            sys.path.insert(0, src_str)
            logger.info("MLService: added %s to sys.path", src_str)

        try:
            t0 = time.perf_counter()
            from detect import DetectionEngine  # type: ignore[import]

            device = settings.MODEL_DEVICE
            checkpoint = settings.MODEL_CHECKPOINT or None
            self._model_source = (
                f"fine-tuned:{checkpoint}" if checkpoint else "pretrained:Gustking"
            )

            logger.info(
                "MLService: loading DetectionEngine (device=%s checkpoint=%s)…",
                device,
                checkpoint,
            )
            self._engine = DetectionEngine(
                model_variant="wav2vec2",
                device=device,
                checkpoint=checkpoint,
            )
            logger.warning(
                "MLService FETCHED MODEL SOURCE -> %s  "
                "(if you expected the fine-tuned model, verify MODEL_CHECKPOINT is set)",
                self._model_source,
            )

            # Also cache and adapt the Voiceprint class for enrollment
            import torch
            from voiceprint import Voiceprint  # type: ignore[import]

            _orig_vp_init = Voiceprint.__init__

            def _safe_vp_init(vp_self, vp_device="auto"):
                if vp_device == "auto" or not vp_device:
                    vp_device = "cuda" if torch.cuda.is_available() else "cpu"
                _orig_vp_init(vp_self, device=vp_device)

            Voiceprint.__init__ = _safe_vp_init
            self._voiceprint_cls = Voiceprint

            elapsed = (time.perf_counter() - t0) * 1000
            logger.info(
                "MLService: DetectionEngine and Voiceprint ready in %.0f ms", elapsed
            )
            self._available = True

        except Exception as exc:
            msg = f"DetectionEngine load failed: {exc}"
            logger.error("MLService: %s", msg)
            self._init_error = msg
            self._available = False

    @property
    def is_available(self) -> bool:
        return self._available

    @property
    def model_version(self) -> str:
        return self._model_version

    def _require_engine(self) -> None:
        if not self._available or self._engine is None:
            raise MLServiceUnavailable(
                self._init_error or "ML engine not initialised."
            )

    # ── Sync inference helpers (run in thread pool) ───────────────────────

    def _sync_analyze_bytes(
        self, audio_bytes: bytes, context: dict | None
    ) -> NormalisedResult:
        """Synchronous inference from raw audio bytes.  Runs in thread pool."""
        self._require_engine()
        buf = io.BytesIO(audio_bytes)
        raw = self._engine.analyze_audio(buf, context=context)
        return _normalise(raw)

    def _sync_analyze_array(
        self, wav, sr: int, context: dict | None
    ) -> NormalisedResult:
        """Synchronous inference from a numpy float32 array.  Runs in thread pool."""
        self._require_engine()
        raw = self._engine.score_audio(wav, sr, context=context)
        return _normalise(raw)

    def _sync_embed(self, audio_bytes: bytes) -> list[float]:
        """Produce a speaker embedding from audio bytes.  Runs in thread pool."""
        if self._voiceprint_cls is None:
            raise MLServiceUnavailable("Voiceprint module not loaded.")
        vp = self._voiceprint_cls()
        buf = io.BytesIO(audio_bytes)
        emb = vp.embed(buf)  # returns numpy float32 array
        return emb.tolist()

    # ── Async public API ─────────────────────────────────────────────────

    async def analyze_file(
        self,
        audio_bytes: bytes,
        context: Optional[dict] = None,
        timeout: float = 60.0,
    ) -> NormalisedResult:
        """
        Analyse an audio file supplied as raw bytes.

        This is the primary path for POST /v1/analyze-call.
        Runs inference in the thread pool; does NOT persist audio.

        Args:
            audio_bytes: Raw audio file bytes (wav/mp3/flac/ogg).
            context:     Optional dict with metadata flags for the ML Core.
            timeout:     Maximum seconds to wait for inference.

        Returns:
            Normalised result dict.

        Raises:
            MLServiceUnavailable: If DetectionEngine could not be loaded.
            MLServiceTimeout:     If inference exceeds `timeout` seconds.
            MLServiceError:       For any other ML-side error.
        """
        self._require_engine()
        loop = asyncio.get_running_loop()
        try:
            result = await asyncio.wait_for(
                loop.run_in_executor(
                    _ML_EXECUTOR,
                    self._sync_analyze_bytes,
                    audio_bytes,
                    context,
                ),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            raise MLServiceTimeout(
                f"ML inference timed out after {timeout:.0f}s."
            )
        except MLServiceUnavailable:
            raise
        except Exception as exc:
            raise MLServiceError(f"ML inference error: {exc}") from exc
        return result

    async def analyze_chunk(
        self,
        chunk_bytes: bytes,
        context: Optional[dict] = None,
        timeout: float = 30.0,
    ) -> NormalisedResult:
        """
        Analyse a streaming audio chunk (2–3 seconds of PCM/audio bytes).

        Delegates to analyze_file — P1's analyze_chunk is the same path.
        Runs in the thread pool to keep the event loop unblocked.
        """
        return await self.analyze_file(chunk_bytes, context=context, timeout=timeout)

    async def enroll_voice(
        self,
        audio_bytes: bytes,
        speaker_id: str,
        timeout: float = 60.0,
    ) -> list[float]:
        """
        Generate a speaker embedding for enrollment.

        Audio bytes are processed in the thread pool.
        The raw bytes are NOT retained by this method.

        Returns:
            256-d speaker embedding as a plain Python float list.

        Raises:
            MLServiceUnavailable: If Voiceprint module could not be loaded.
            MLServiceTimeout:     If embedding extraction exceeds `timeout`.
            MLServiceError:       For any other error.
        """
        if self._voiceprint_cls is None:
            raise MLServiceUnavailable(
                "Voiceprint module not loaded. resemblyzer may not be installed."
            )
        loop = asyncio.get_running_loop()
        try:
            embedding = await asyncio.wait_for(
                loop.run_in_executor(
                    _ML_EXECUTOR,
                    self._sync_embed,
                    audio_bytes,
                ),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            raise MLServiceTimeout(
                f"Voice embedding timed out after {timeout:.0f}s."
            )
        except MLServiceUnavailable:
            raise
        except Exception as exc:
            raise MLServiceError(f"Voice embedding error: {exc}") from exc
        return embedding

    async def compare_voice(
        self,
        audio_bytes: bytes,
        enrolled_embedding: list[float],
        timeout: float = 30.0,
    ) -> float:
        """
        Compare incoming audio to an enrolled embedding.

        Returns:
            Similarity score [0, 1].  Higher = more similar to enrolled speaker.
        """
        import numpy as np

        if self._voiceprint_cls is None:
            raise MLServiceUnavailable("Voiceprint module not loaded.")

        def _run() -> float:
            vp = self._voiceprint_cls()
            buf = io.BytesIO(audio_bytes)
            emb = vp.embed(buf)
            enrolled_arr = {"embedding": np.asarray(enrolled_embedding, dtype=np.float32)}
            sim, _ = vp.is_match(emb, enrolled_arr)
            return float(sim)

        loop = asyncio.get_running_loop()
        try:
            return await asyncio.wait_for(
                loop.run_in_executor(_ML_EXECUTOR, _run),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            raise MLServiceTimeout(f"Voice comparison timed out after {timeout:.0f}s.")
        except Exception as exc:
            raise MLServiceError(f"Voice comparison error: {exc}") from exc

    @property
    def model_source(self) -> str | None:
        """Which model is actually scoring (surfaced in /v1/health)."""
        return self._model_source

    def status(self) -> dict[str, Any]:
        """Return a safe status dict (no secrets, no model weights)."""
        return {
            "available": self._available,
            "model_version": self._model_version,
            "model_source": self._model_source,
            "error": self._init_error,
        }
