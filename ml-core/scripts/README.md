# scripts/

One-off utilities for the P1 ML track (folium-style). Reusable modules stay in `src/`,
experiments stay in `notebooks/`, and DURABLE data/results live on Google Drive.

## Data pipeline (mirrors folium: archive on Drive, hydrate locally per session)

We do NOT download a dataset (our clips are user-provided). The flow is:

```text
[local machine]                         [Google Drive]                 [Colab session]
real/ cloned/ audio clips       /content/drive/MyDrive/VoxDetect/ml-core/dataset/
        |  upload_dataset.py            test_data.zip          organize_dataset.py
        +---------------------------------> + .manifest.json -------> /content/VoxDetect_data
                                                                        real/ cloned/
                                                                             |
                                                                    evaluate.py --out results/...
                                                                             |
                                                              /content/drive/.../results/sprintX.json
```

### 1. upload_dataset.py — put clips on Drive as a verified archive (run ONCE, locally)

```bash
# from your machine, first time only (or any time you add/change clips):
python3 ml-core/scripts/upload_dataset.py \
    --root ml-core/test_data \
    --upload-dir /content/drive/MyDrive/VoxDetect/ml-core/dataset
```

Zips `real/` + `cloned/` (English + Hindi) into a single `test_data.zip` and writes a
sha256-verified `test_data.manifest.json` (total count + per-language breakdown).

> **Why an archive (learned from folium):** individual files on Drive hit Google's
> per-day file-operation quota and the FUSE cache can hide partial writes. One
> sha256-verified archive is durable (2 file ops). We never touch Drive per clip.

### 2. organize_dataset.py — hydrate a session-local test_data from the Drive archive (each Colab run)

Called automatically by notebook cell 1 (sprint0/1/2). Or manually:

```bash
python3 ml-core/scripts/organize_dataset.py \
    --raw-dir /content/drive/MyDrive/VoxDetect/ml-core/dataset \
    --data-dir /content/VoxDetect_data
```

Verifies sha256 vs manifest, unzips into `/content/VoxDetect_data`, prints the clip count.

### Then evaluate per sprint, saving results to Drive

```bash
python3 -m evaluate --root /content/VoxDetect_data \
    --out /content/drive/MyDrive/VoxDetect/ml-core/results/sprint1_baseline_english.json \
    --find-threshold
```

### 3. finetune_head.py — fine-tune the classification head on YOUR data (keep backbone)

We keep the Gustking backbone (no model swap). Sprint 3 fine-tunes only the head on
your own volunteer+clone clips (one TTS engine). See `notebooks/sprint3_finetune_head.ipynb`.

Key guardrails:
- **Label order is verified, not assumed**: prints pretrained `id2label`, sets our own
  `real=0, fake=1`, asserts it before training.
- **Sample rate read from the feature extractor config** (not hardcoded).
- **Speaker-level eval (LOSO), never clip-level**: leave-one-speaker-out cross-validation
  so the held-out speaker's real+cloned clips are never in training. A clip-level split
  would just learn "that one person's voice" — meaningless numbers.
- **Dual freeze schedules for the Colab compute budget**:
  * LOSO folds train **only the head** (`--loso-frozen 24`) — fast, near-linear-probe.
    LOSO is a generalization **signal**, not a tuning exercise (full unfreeze ×5 eats budget).
  * The **final deployable model** is a single run, so it can afford the fuller recipe
    (`--final-frozen`, default 20 / relax to 12 only if underfitting).
- `--augment` adds noise/speed/volume jitter to **train clips only**, never the held-out test.
- **Guard**: every speaker must have BOTH real and cloned clips; `gather()` prints a
  per-speaker table and **hard-fails** if any speaker has one class (which would make a
  fold's FPR/FNR undefined).
- `--holdout <speaker>` keeps one speaker entirely out of the final model so you can A/B
  base-vs-finetuned on the SAME unseen speaker (the "measured lift" slide).

```bash
python3 scripts/finetune_head.py \
    --data-dir <root with real/ cloned/ as <lang>/<speaker>/*.wav> \
    --out-dir /content/drive/MyDrive/VoxDetect/ml-core/checkpoints/ft_head_v1 \
    --epochs 5 --batch-size 4 --lr 1e-5 --augment \
    --holdout speaker1
```

Saves the HF model dir + `finetune_report.json` (records strategy, label mapping, SR,
augment flag, LOSO mean±std ACC/FPR/FNR, per-fold rows, holdout eval, and per-epoch
train/eval loss sequences so you can check the overfit trend). Load the saved model back
with `evaluate.py --checkpoint <dir>` / `DetectionEngine(checkpoint=<dir>)`.

## Creating the cloned clips (the fake half of the dataset)

Use **`notebooks/clone_voice_xtts.ipynb`** (Coqui XTTS-v2, open-source, free, runs on
Colab). Each team member opens it, uploads ONE ~10-20s real clip as their reference voice,
and generates cloned clips of the SAME sentences in English + Hindi.

**Why XTTS-v2 and not ElevenLabs/PlayHT free:** as of 2026 the hosted free tiers no longer
include instant voice cloning (they need the paid tier or a card), and quotas/daily limits
are a lottery on a Sunday night. XTTS-v2 has no signup, no paywall, and — important for a
clean dataset — **one consistent TTS engine across all speakers** instead of 5 people each
picking a different tool (mixing engines would confound results).

## Planned / add as needed

- `audit_results.py` — summarize every Drive `results/*.json` into a comparison table.
