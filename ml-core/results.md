# results.md — P1 ML Core: Results & Findings Log

**Living document.** Every number, finding, model decision, and measurement goes here. If it's not in this file, it didn't happen — judges will ask for specifics, and this is your source of truth.

> ⚠️ **Status: NOT RELIABLE YET.** The detector pipeline was just wired to a real deepfake model. **Do not quote any numbers in this file for slides until validation is done** (see Step 4 below). Everything before then is plumbing, not results.

---

## 1. Model Decision (as of last update)

| Field | Value |
|-------|-------|
| **Chosen model** | `Gustking/wav2vec2-large-xlsr-deepfake-audio-classification` |
| **Architecture** | Wav2Vec2-XLSR-53 (multilingual base) + classification head |
| **Reported (vendor) ASVspoof2019 numbers** | ACC 0.9286 · Precision 0.9999 · Recall 0.9205 · F1 0.9363 · EER 0.0401 |
| **Params** | ~0.3B |
| **Why chosen** | Real deepfake checkpoint (not placeholder), multilingual base covers Hindi, pip-installable, heavily used as a base by others |
| **Alternative** | garystafford/wav2vec2-deepfake-voice-detector (same base, further fine-tuned, vendor claims ROC-AUC 0.998) — use if time allows |
| **Status** | ✅ Wired into `detect.py` · ❌ Not yet validated on our own data |

---

## 2. Critical Validation Checklist (DO THIS FIRST)

Run `src/validate.py` in Colab — it automates this:
```python
import validate
validate.run(real="real.wav", cloned="fake.wav", threshold=70)
```

- [ ] Print `model.config.id2label` → confirm which class index = "fake" vs "real"
- [ ] Run a **real** clip → expect LOW risk score (e.g. < 30)
- [ ] Run a **cloned** clip → expect HIGH risk score (e.g. > 70)
- [ ] If scores look backwards, flip `_find_fake_index()` priority in `detect.py`
- [ ] Log the output shape of `logits` once — confirm single-pooled (not frame-level)

> **Record the label mapping here once confirmed:**
> `id2label = {0: "___", 1: "___"}` → fake index = ___

---

## 3. Environment / Setup Notes

| Item | Value |
|------|-------|
| Runtime | Google Colab (+CPU or +GPU? note here) |
| Torch version | |
| Transformers version | |
| Inference time (CPU) per 5s clip | |
| Inference time (GPU) per 5s clip | |
| Model load time | |
| HF token needed? | (Gustking may be gated) |

---

## 4. Dataset (as it grows — maintained with P4)

Track what audio exists. P4 generates/records; you measure.

| Split | Speaker | Language | # Real | # Cloned | Tool used for cloning | Source |
|-------|---------|----------|--------|----------|----------------------|--------|
| dev | Speaker1 | English | | | | self-recorded |
| dev | Speaker1 | English | | | | |
| dev | Speaker2 | Hindi | | | XTTS-v2 | self-recorded |
| ... | | | | | | |

### Expected dataset size target
- **Minimum for a believable table:** 20 real + 20 cloned, at least 2 languages (English + Hindi)
- **Ideal:** 30+ per language, multiple clone tools (XTTS-v2, ElevenLabs-style, etc.)

---

## 5. Measured Results (the numbers that go on slides)

> Fill these after running `evaluate.py`. Copy the exact output below.

### Overall (all languages combined)

| Metric | Value |
|--------|-------|
| # clips | |
| Threshold used | |
| **Accuracy** | |
| **False Positive Rate** | |
| **False Negative Rate** | |
| TP / FP / TN / FN | |

### Per-language (from `evaluate.py`)

| Language | # clips | Accuracy | Notes |
|----------|---------|----------|-------|
| English | | | baseline |
| Hindi | | | expected lower — see learn.md |
| (regional) | | | |

### Per-clone-tool (if you tag clones by tool)

| Clone tool | # clips | Detection rate | Notes |
|------------|---------|----------------|-------|
| XTTS-v2 | | | |
| (other) | | | |

### Best threshold (from `evaluate.py --find-threshold`)

| Best cutoff | ACC at cutoff | FPR at cutoff |
|-------------|--------------|---------------|
| | | |

### Risk-band sanity (decision boundary = 7.5, verified on the 60-clip sweep)

| Band | Real clip scores | Cloned clip scores |
|------|------------------|--------------------|
| low (<7.5, authentic) | 5.4–7.3 | — |
| high (7.5–85, flagged clone) | — | 7.9–84.8 |
| critical (>=85) | — | — |

> Note: the gauge/verdict use the raw deepfake classifier scaled to 0–100
> (`synthetic_prob × 100`), NOT the old 30/70 fused-score bands in detect.py's RISK_BANDS.
> detect.py's bands are metadata-only and overridden by the backend (ml_service._normalise).

---

## 6. Voiceprint (speaker verification) findings

| Test | Result | Notes |
|------|--------|-------|
| Same speaker, same clip | sim = ___ | expect high (~0.9+) |
| Same speaker, different clip | sim = ___ | |
| Different speaker | sim = ___ | expect low (<0.5) |
| Tuned match threshold | ___ | if false-match too high, raise it |

---

## 7. Prosody findings

Compare **real vs cloned** on the prosody features. What actually separates them?

| Feature | Real avg | Cloned avg | Separating? |
|---------|----------|------------|-------------|
| pitch_var | | | ? |
| pause_ratio | | | ? |
| speaking_rate_proxy | | | ? |
| voiced_ratio | | | ? |

> Record what the data actually shows — don't force a story. If prosody *doesn't* separate your clones, say so honestly and drop its weight.

---

## 8. Fusion weight calibration

Current (v0, heuristic — NOT calibrated):

```
DEFAULT_WEIGHTS = {"model": 0.5, "prosody": 0.25, "voiceprint": 0.15, "context": 0.10}
```

**IF** you run `evaluate.py --find-threshold` and the model alone already separates well, consider simplifying (e.g. model 0.8). Record any change + the before/after accuracy here.

---

## 9. Honest limitations (for judges — better to say it first)

- Model fine-tuned on English/TTS-heavy ASVspoof data → **expect lower Hindi accuracy** (measure it, don't guess)
- Prosody + voiceprint + context are **heuristics, not trained** — weight them lightly until proven
- No fine-tuning done yet (or note if you did: frozen bottom 12 layers, trained top 12 + head → before/after accuracy)
- Clone quality varies by tool — high-quality commercial clones are harder to catch than XTTS-v2

---

## 10. Timeline / Decisions log

| Date | Decision | Why | Outcome |
|------|----------|-----|---------|
| (today) | Swapped placeholder → Gustking real checkpoint | placeholder was keyword-spotting, not deepfake | detect.py now loads real model |
| | Fine-tune on Hindi? | pending Hindi gap measurement | pending |
| | Add AASIST/RawNet2 path? | only if want SOTA numbers | pending |

---

## How to update the numbers (copy-paste command)

```bash
cd ml-core
# 1. overall + per-language + per-tool at a fixed threshold
python3 src/evaluate.py --root test_data --threshold 70

# 2. find the best threshold automatically
python3 src/evaluate.py --root test_data --find-threshold

# 3. quick check on one clip
python3 src/detect.py test_data/real/english/speaker1.wav
```

Then paste the output into sections 5-8 above.
