# ml-core — P1 (ML Core)

The P1 track: **voice cloning detection model + voiceprint + prosody + accuracy numbers.**

This is the **single source of truth for the ML signal** that P2 (backend) imports. If you
are P2/P3/P4/P5 wiring against `analyze_audio` / `analyze_chunk`, read the **API contract** below.

---

## Folder layout (folium-style: sprint notebooks + data on Drive as a verified archive)

**Durable on Google Drive** (persist across Colab sessions — the source of truth):
```
/content/drive/MyDrive/VoxDetect/ml-core/
├── dataset/                            # the audio dataset as ONE verified archive
│   ├── test_data.zip                   #   real/ + cloned/ clips (English + Hindi)
│   └── test_data.manifest.json         #   sha256 + per-language clip counts
├── results/                            # every evaluate run writes a UNIQUE <sprint>.json
└── checkpoints/                        # model artifacts (fine-tuned/frozen weights)
```

**Per-session local** (rebuilt each Colab run, wiped when the session ends):
```
/content/VoxDetect/data                # hydrated test_data (real/ + cloned/) via organize_dataset.py
/content/VoxDetect                     # session-only git clone of this repo (src/, scripts/)
```

**In the git repo** (structure + code, not the data):
```
ml-core/
├── notebooks/               # one notebook per experiment, named by concern
│   ├── sprint0_setup_validation.ipynb   <- FIRST. setup deps + validate model sanity
│   ├── sprint1_baseline_english.ipynb   #  English baseline on pretrained model
│   ├── sprint2_hindi_test.ipynb         #  Hindi / multilingual test
│   ├── sprint3_finetune_head.ipynb      #  fine-tune the HEAD on your data (keep backbone)
│   ├── clone_voice_xtts.ipynb           #  team: build cloned clips free (XTTS-v2, no account)
│   └── ... (add more as you run experiments)
├── src/                     # reusable package (flat imports: detect, audio_utils, ...)
│   ├── audio_utils.py, detect.py, voiceprint.py, prosody.py, evaluate.py, validate.py
├── scripts/                 # upload/organize_dataset.py + finetune_head.py (see scripts/README.md)
├── results/.gitkeep         # repo tracks the folder placeholder; real JSONs live on Drive
├── learn.md                 # ML term definitions (gitignored working note)
└── results.md               # live log: paste the numbers from Drive results/*.json
```

**Rule (mirrors folium):** cell 1 of EVERY sprint notebook mounts Drive, clones the repo,
and hydrates `test_data` LOCALLY from the Drive archive. Each run then writes its output to
the **Drive** `results/<descriptive_name>.json` via `evaluate.py --out`. Never overwrite a
previous run — that's how we keep a clean experiment history, all safe on Drive.

---

## Data on Drive (upload once)

Unlike folium we do **not download** a dataset — our audio clips are user-provided. Get the
clips onto Drive as a verified archive (~2 file ops, avoids Drive's per-day file quota):

```bash
# from your machine, first time only (or whenever you add clips):
python3 ml-core/scripts/upload_dataset.py \
    --root ml-core/test_data \
    --upload-dir /content/drive/MyDrive/VoxDetect/ml-core/dataset
```

## Quick start (Colab) — P1

1. Upload `notebooks/sprint0_setup_validation.ipynb` to Google Colab.
2. Run cell 1 — **mounts Drive**, clones the repo, hydrates local test_data from the Drive
   archive, installs deps.
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
| `notebooks/sprint1_*.ipynb` | English baseline on the pretrained model |
| `notebooks/sprint2_*.ipynb` | Hindi / multilingual test |
| `notebooks/sprint3_*.ipynb` | Fine-tune the classification head on your data (keep backbone) |
| `notebooks/clone_voice_xtts.ipynb` | Team: generate cloned clips free (Coqui XTTS-v2, no account) |
| `src/*.py`   | The importable modules + evaluate/validate harnesses |
| `scripts/`   | upload/organize_dataset.py + finetune_head.py |
| `results/.gitkeep` | Repo tracks the folder shape; real JSONs live on Drive |
| Drive: `.../ml-core/results` | Unique per-run JSON outputs (durable, not in git) |
| Drive: `.../ml-core/checkpoints/ft_head_v1` | Fine-tuned head (created by sprint3) |
| Drive: `.../ml-core/dataset` | test_data.zip archive + manifest (durable, not in git) |

---

## Model (current)

**`Gustking/wav2vec2-large-xlsr-deepfake-audio-classification`** — Wav2Vec2-XLSR-53
(multilingual base incl. Hindi) fine-tuned for deepfake audio on ASVspoof2019.
Vendor numbers: ACC 0.93, F1 0.94, EER 0.04. See `results.md` for validation status
and `learn.md` for what these terms mean.

> **First thing in Colab:** print `model.config.id2label` and run `validate.py` —
> confirm which class index = "fake" before trusting any risk score.

**We keep this backbone. We do NOT swap it.** Per the team review: no pretrained checkpoint
fixes the modern-TTS gap (VoxENES 2026: best of 8 pretrained detectors = 28.98% EER). Instead,
**sprint3 fine-tunes only the classification head** on our own volunteer+clone data (one TTS
engine), validated with **leave-one-speaker-out cross-validation** (no speaker leaks across
train/test — the numbers are about real-vs-synthetic, not speaker ID). For the Colab compute
budget, LOSO folds train only the head while the single final checkpoint uses the fuller
recipe. `evaluate.py --checkpoint <dir>` / `DetectionEngine(checkpoint=...)` load the final
model. See `notebooks/sprint3_finetune_head.ipynb` and `scripts/finetune_head.py`.

## Status

- ✅ Real deepfake checkpoint wired into `detect.py`
- ✅ Audio preprocess, voiceprint, prosody, evaluate, validate all present & compiling
- ✅ Fine-tune harness (`scripts/finetune_head.py`) + `--checkpoint` swap-in wired up
- ❌ **Not yet validated on our own data** — do the Colab first-run before quoting any accuracy numbers
