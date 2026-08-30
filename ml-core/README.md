# ml-core — P1 (ML Core)

The P1 track: **voice cloning detection model + voiceprint + prosody + accuracy numbers.**

This is the **single source of truth for the ML signal** that P2 (backend) imports. If you
are P2/P3/P4/P5 wiring against `analyze_audio` / `analyze_chunk`, read the **API contract** below.

---

## Folder layout (folium-style: sprint notebooks + one results file per run)

**Durable on Google Drive** (persist across Colab sessions — this is the source of truth):
```
/content/drive/MyDrive/VoxDetect/ml-core/
├── results/       # every evaluate run writes a UNIQUE <sprint>.json here (no overwriting)
├── checkpoints/   # model artifacts (fine-tuned/frozen weights)
└── test_data/     # real/ + cloned/ clips, English + Hindi
```

**In the git repo** (structure + code, not the data):
```
ml-core/
├── notebooks/               # one notebook per experiment, named by concern
│   ├── sprint0_setup_validation.ipynb   <- FIRST. setup deps + validate model sanity
│   ├── sprint1_baseline_english.ipynb
│   ├── sprint2_hindi_test.ipynb
│   └── ... (add more as you run experiments)
├── src/                     # reusable package (flat imports: detect, audio_utils, ...)
│   ├── audio_utils.py, detect.py, voiceprint.py, prosody.py, evaluate.py, validate.py
├── scripts/                 # one-off utilities (dataset organize, clone generation)
├── results/.gitkeep         # repo only tracks the folder placeholder; real JSONs live on Drive
├── learn.md                 # ML term definitions (gitignored working note)
└── results.md               # live log: paste the numbers from Drive results/*.json
```

**Rule:** every sprint notebook mounts Drive (cell 1) and saves output to the **Drive**
`results/<descriptive_name>.json` via `evaluate.py --out`. Never overwrite a previous run —
that's how we keep a clean experiment history for the slides, all safe on Drive.

---

## Quick start (Colab) — P1

1. Upload `notebooks/sprint0_setup_validation.ipynb` to Google Colab.
2. Run cell 1 — it **mounts Drive**, clones the repo, sets `RESULTS_DIR`/`CHECKPOINT_DIR`/
   `TEST_DATA` under `/content/drive/MyDrive/VoxDetect/ml-core/`, installs deps.
3. Run the **FIRST-RUN VALIDATION cell** (prints label mapping + checks a real vs cloned clip).
4. Once validated, run experiment notebooks (sprint1, sprint2, ...) building on it.

---

## API contract (what P2 imports)

```python
from detect import DetectionEngine

eng = DetectionEngine()                    # loads model ONCE; keep it alive in the server

# Batch / file mode
result = eng.analyze_audio("clip.wav", context=None)
# -> {
#      "risk_score": 0..100,
#      "band": "low" | "medium" | "high",
#      "models": {"synthetic_prob": 0..1},
#      "signals": {"model":.., "prosody_anomaly":.., "voiceprint_risk":.., "context_risk":..}
#    }

# Streaming / chunk mode (2-3s chunks)
result = eng.analyze_chunk(chunk_bytes, context=None)
```

`context` is an optional dict of metadata flags the caller can pass:
`{first_time_contact, high_value, odd_hour, sensitive_data_request, enrolled_embedding}`.

Other modules (all under `src/`):
- `audio_utils.py`  — load/`preprocess`/`chunk` any audio → 16kHz mono
- `voiceprint.py`   — speaker embedding (`Voiceprint`), cosine similarity, enroll/match
- `prosody.py`      — `extract_prosody` (pitch/pause/speaking-rate proxy) + `prosody_anomaly_score`
- `evaluate.py`     — accuracy/FPR harness. use `--out results/<name>.json` to save a run
- `validate.py`     — first-run sanity check (label mapping + risk-score expectations)

---

## Files

| Path | Purpose |
|------|---------|
| `learn.md`   | Plain-language definitions of the ML terms (gitignored working note) |
| `results.md` | **Living log** of every number/finding/decision. Paste from Drive `results/*.json` |
| `notebooks/sprint0_*.ipynb` | Setup + first-run validation (start here) |
| `notebooks/sprint1_*.ipynb` | Baseline experiment notebooks (add as you go) |
| `src/*.py`   | The importable modules + evaluate/validate harnesses |
| `scripts/`   | One-off utilities (dataset organize, clone generation) |
| `results/.gitkeep` | Repo tracks the folder shape; real JSONs live on Drive |
| Drive: `.../ml-core/results` | Unique per-run JSON outputs (durable, not in git) |
| Drive: `.../ml-core/test_data` | Where clips go (durable, not in git) |

---

## Model (current)

**`Gustking/wav2vec2-large-xlsr-deepfake-audio-classification`** — Wav2Vec2-XLSR-53
(multilingual base incl. Hindi) fine-tuned for deepfake audio on ASVspoof2019.
Vendor numbers: ACC 0.93, F1 0.94, EER 0.04. See `results.md` for validation status
and `learn.md` for what these terms mean.

> **First thing in Colab:** print `model.config.id2label` and run `validate.py` —
> confirm which class index = "fake" before trusting any risk score.

---

## Status

- ✅ Real deepfake checkpoint wired into `detect.py`
- ✅ Audio preprocess, voiceprint, prosody, evaluate, validate all present & compiling
- ❌ **Not yet validated on our own data** — do the Colab first-run before quoting any accuracy numbers
