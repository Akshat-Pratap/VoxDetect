"""
detect.py — P1 ML Core: Pretrained deepfake-audio detection + multi-signal fusion
This is the API that P2 (backend) imports. It returns a single risk score I keep stable.

Model:
  - Default: Gustking/wav2vec2-large-xlsr-deepfake-audio-classification
    (Wav2Vec2-XLSR-53, multilingual, fine-tuned for deepfake audio vs ASVspoof2019:
     ACC 0.93, F1 0.94, EER 0.04). XLSR-53 base covers Hindi too.
    NOTE: as fine-tuned it is English/TTS-dominant — validate Hindi separately
    with evaluate.py's per-language breakdown.
  - Swap in AASIST / RawNet2 later for the final accuracy table if time allows.

Usage (from backend):
    from detect import DetectionEngine
    eng = DetectionEngine()                      # loads model (once, keep alive)
    result = eng.analyze_audio("clip.wav")       # {risk_score, confidence, signals}
    result = eng.analyze_chunk(chunk_bytes)      # streaming chunk
"""
import numpy as np

# Tunable fusion weights (P5/P6: these are v0 HEURISTICS, not calibrated to data yet.
# Calibrate with calibrate_thresholds() / evaluate.py before quoting accuracy numbers.)
DEFAULT_WEIGHTS = {
    "model": 0.5,      # spectral/artifact deepfake detector
    "prosody": 0.25,   # prosody anomaly
    "voiceprint": 0.15,# cross-session speaker match (inverted: low match -> high risk)
    "context": 0.10,   # metadata flags (first-time, high-value, odd-hour)
}

# Risk bands
RISK_BANDS = [(0, 30, "low"), (30, 70, "medium"), (70, 101, "high")]


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


class DetectionEngine:
    def __init__(self, model_variant="wav2vec2", weights=None, device="auto"):
        self.model_variant = model_variant
        self.device = device
        self.weights = DEFAULT_WEIGHTS if weights is None else weights
        self._model = None
        self._proc = None
        self._load_model()

    def _load_model(self):
        if self.model_variant == "wav2vec2":
            try:
                import torch
                from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
                repo = "Gustking/wav2vec2-large-xlsr-deepfake-audio-classification"
                self._proc = AutoFeatureExtractor.from_pretrained(repo)
                self._model = AutoModelForAudioClassification.from_pretrained(repo)
                # CRITICAL: verify class labels. Don't assume index order.
                try:
                    self.id2label = self._model.config.id2label
                    print("Model class mapping:", self.id2label)
                except Exception:
                    self.id2label = {}
                # figure out which index is "fake/synthetic"
                self._fake_idx = self._find_fake_index()
            except Exception as e:
                raise RuntimeError(
                    f"Couldn't load deepfake model. Run: pip install transformers torch\n{e}"
                )
        else:
            raise ValueError(f"Unsupported model_variant: {self.model_variant}")

    def _find_fake_index(self):
        """Determine the class index representing 'fake/synthetic'. Inspect id2label
        or fall back to the LAST class (common in binary HF checkpoints)."""
        labels = getattr(self, "id2label", {}) or {}
        for idx, name in labels.items():
            n = str(name).lower()
            if any(k in n for k in ("fake", "spoof", "synthetic", "bot", "1")):
                return int(idx)
        # default heuristic: last class
        return len(labels) - 1 if labels else -1

    # ---- public API used by backend ----

    def analyze_audio(self, path_or_bytes, context=None):
        """Full analysis of one clip/file. Returns risk score + signal breakdown."""
        import audio_utils
        from prosody import extract_prosody, prosody_anomaly_score
        from voiceprint import Voiceprint

        wav, sr = audio_utils.load_audio(path_or_bytes)

        conf = self._model_confidence(wav, sr)          # 0..1 (1 = fake)
        pros_feat = extract_prosody(path_or_bytes)
        pros_anom = prosody_anomaly_score(pros_feat)

        # voiceprint: default = no enrollment -> neutral (0.5 risk contribution)
        vp_contrib = 0.5
        if context and context.get("enrolled_embedding") is not None:
            try:
                vp = Voiceprint()
                emb = vp.embed(path_or_bytes)
                sim, _ = vp.is_match(emb, {"embedding": context["enrolled_embedding"]})
                # low similarity to a "known" number => higher risk
                vp_contrib = 1.0 - sim
            except Exception:
                vp_contrib = 0.5

        context_anom = self._context_anomaly(context)

        risk = self._fuse(conf, pros_anom, vp_contrib, context_anom)
        band = self._band(risk)

        return {
            "risk_score": round(risk, 1),
            "band": band,
            "models": {"synthetic_prob": float(conf)},
            "signals": {
                "model": round(float(conf), 3),
                "prosody_anomaly": round(float(pros_anom), 3),
                "voiceprint_risk": round(float(vp_contrib), 3),
                "context_risk": round(float(context_anom), 3),
            },
        }

    def analyze_chunk(self, chunk_bytes, context=None):
        """Streaming: pass a raw chunk (wav bytes or PCM) -> per-chunk risk score.
        Thin wrapper over analyze_audio for now (backend can call per chunk).
        """
        return self.analyze_audio(chunk_bytes, context=context)

    # ---- internals ----

    def _model_confidence(self, wav, sr):
        """Run the pretrained model -> probability [0,1] the audio is synthetic.
        For a single-pooled classification head: softmax over logits, take the
        'fake' class index (resolved in _find_fake_index)."""
        import torch
        inputs = self._proc(wav, sampling_rate=sr, return_tensors="pt")
        with torch.no_grad():
            logits = self._model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)
        if self._fake_idx < 0 or probs.shape[-1] <= self._fake_idx:
            # fallback: take max-prob class as a provisional fake signal
            prob_fake = float(probs[0].max().item())
        else:
            prob_fake = float(probs[0, self._fake_idx].item())
        return prob_fake

    def _context_anomaly(self, context):
        """Contextual risk from metadata. Semantics:
          - no context provided  -> neutral-ish (0.35): unknown, but not penalized
          - context with flags   -> higher when sensitive/high-value/odd-hour.
        Bug fixed: 'we know nothing' no longer scores riskier than 'we checked,
        nothing flagged'."""
        if not context:
            return 0.35
        flags = {
            "first_time_contact": 0.6,
            "high_value": 0.6,
            "odd_hour": 0.5,
            "sensitive_data_request": 0.7,
        }
        hits = [flags[k] for k in flags if context.get(k)]
        if not hits:
            return 0.15
        boost = np.mean(hits)
        # scale so a single serious flag lands in a moderate-high contribution
        return float(np.clip(0.35 + 0.65 * boost, 0, 1))

    def _fuse(self, conf, pros, vp, ctx):
        w = self.weights
        raw = (w["model"] * conf
               + w["prosody"] * pros
               + w["voiceprint"] * vp
               + w["context"] * ctx)
        # squash to 0..100
        return 100.0 * sigmoid(4 * (raw - 0.5))

    def _band(self, score):
        for lo, hi, name in RISK_BANDS:
            if lo <= score < hi:
                return name
        return "high"


def quick_check(path_or_bytes, context=None):
    """One-liner for CLI / Colab testing."""
    eng = DetectionEngine()
    return eng.analyze_audio(path_or_bytes, context=context)


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        r = quick_check(sys.argv[1])
        print(r)
