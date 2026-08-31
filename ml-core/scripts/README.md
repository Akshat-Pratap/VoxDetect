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

Two modes:

**A. Drive mounted / inside Colab** — uploads straight to Drive:

```bash
# from your machine, first time only (or any time you add/change clips):
python3 ml-core/scripts/upload_dataset.py \
    --root ml-core/test_data \
    --upload-dir /content/drive/MyDrive/VoxDetect/ml-core/dataset
```

**B. Package locally, upload by hand (Mac / no Drive mount)** — just emits the
`test_data.zip` + `test_data.zip.manifest.json` into `--package-dir`, then you drag
both files into `<Drive>/.../ml-core/dataset/` yourself:

```bash
python3 ml-core/scripts/upload_dataset.py --root ml-core/test_data --package-dir .
```

Either way it zips `real/` + `cloned/` (English + Hindi) into a single `test_data.zip`
and writes a sha256-verified `test_data.zip.manifest.json` (total count + per-language
breakdown). Re-run any time you add/change clips — it overwrites the previous archive.

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

### Threshold calibration (priority when a holdout shows AUC 1.0 but low accuracy)

A holdout run can rank-order perfectly (ROC-AUC 1.0) yet score poorly on accuracy if the
fixed cutoff (default 70) is cutting through the middle of your real/clone scores. That is a
**calibration** problem, not a model problem — fix the threshold, don't retrain.

1. **See the separation with your own eyes** — print every clip's raw risk score,
   labeled REAL vs CLONE, plus the min/max/median of each group, for your holdout root
   and your final checkpoint:
   ```bash
   python3 -m evaluate --root /content/holdout_root \
        --checkpoint /content/drive/MyDrive/VoxDetect/ml-core/ft_head_v1 \
        --scores
   ```
   With a clean separation there is a gap between `REAL max` and `CLONE min`; set the
   cutoff mid-gap. If they overlap, the model isn't separating these clips and no
   threshold fixes it.

2. **Automatically pick the best cutoff** on the same holdout (max accuracy, tie-break
   lower FPR):
   ```bash
   python3 -m evaluate --root /content/holdout_root \
        --checkpoint /content/drive/MyDrive/VoxDetect/ml-core/ft_head_v1 \
        --find-threshold --json
   ```
   It prints `Best threshold ... cutoff=<N>  ACC=...%  FPR=...%`. Use that `<N>` as your
   live-demo `THRESH` (and update `RISK_BANDS` in `detect.py` if you want the band
   boundary at the same place).

> `--checkpoint` MUST point at the **final deployable model** (`ft_head_v1/` root) — the
> LOSO fold artifacts live under `ft_head_v1/checkpoints/` and are deliberately weak
> (head-only, built for speed). Root over folds.

You can also append one row per run to the folium-style source-of-truth CSV
(`ml-core/results/ablation_results.csv`), which self-documents **which dataset and
checkpoint** were used plus every "how good is it" metric:

```bash
python3 -m evaluate --root /content/garystafford_data \
    --run-name baseline_garystafford --dataset garystafford \
    --results /content/drive/MyDrive/VoxDetect/ml-core/results/ablation_results.csv \
    --find-threshold --json
```

CSV columns: `variant, dataset, split, model, checkpoint, n_clips, accuracy, fpr,
fnr, roc_auc, precision, recall, f1, threshold, epochs, lr, n_freeze, repo_commit,
src_root, timestamp`. Re-running the same `(variant, dataset, split, checkpoint)`
skips the duplicate so the table stays clean.

### 2b. prepare_garystafford.py — open-license backup dataset (Track A / insurance)

Our own clips are user-provided, but to GUARANTEE a trained model + numbers by the
deadline we also support a public, open-license fallback
(`garystafford/deepfake-audio-detection`, CC-BY-4.0, 1,866 balanced FLAC, English).
This converts a sampled subset into the folder layout evaluate/finetune already read:

```bash
python3 scripts/prepare_garystafford.py --out garystafford_data --n 900
# -> garystafford_data/real/<yt_source>/*.wav  and  fake/<tts_prefix>/*.wav
```

> **Honest caveat:** garystafford is a random clip-level set. The Gustking base was
> already trained on similar TTS engines, so ACC/AUC here look high — it's
> "fine-tuning adapts to this corpus," NOT a generalization claim. The team-LOSO run
> (Track B) is the real generalization story. Keep the two as separate rows/stories.

### 3. finetune_head.py — fine-tune the classification head (keep backbone)

We keep the Gustking backbone (no model swap). Sprint 3 fine-tunes only the head.
Two explicit data modes via `--data` (manual; Track A and Track B are SEPARATE stories):

* `--data team` (default): YOUR real+cloned clips. Default eval = **leave-one-speaker-out**
  CV (each speaker has both classes).
* `--data garystafford`: OPEN-LICENSE fallback. No per-speaker pairing, so `--no-loso`
  is forced and `--val-split` sizes the held-out TEST (plain stratified split).

Key guardrails:
- **Label order is verified, not assumed**: prints pretrained `id2label`, sets `real=0, fake=1`.
- **Sample rate read from the feature extractor config** (not hardcoded).
- **Speaker-level eval (LOSO), never clip-level** for team data; plain split for garystafford.
- **Dual freeze schedules for the Colab compute budget**:
  * LOSO folds train **only the head** (`--loso-frozen 24`) — fast.
  * The **final deployable model** uses the fuller recipe (`--final-frozen`, default 20 / relax to 12 only if underfitting).
- `--augment` adds noise/speed/volume jitter to **train clips only**.
- **Checkpointing + resume**: per-epoch + `best_<tag>` checkpoints are saved under
  `<out-dir>/checkpoints/`, and `--resume <dir>` continues a run — so a Colab runtime
  drop never loses progress.
- **Guard**: every speaker must have BOTH real and cloned clips (LOSO); hard-fails otherwise.
- `--holdout <speaker>` keeps one speaker entirely out of the final model for the A/B slide.
- `--results <csv>` appends each metric row to the source-of-truth table.

```bash
# Team (LOSO + holdout)
python3 scripts/finetune_head.py \
    --data team \
    --data-dir /content/VoxDetect_data \
    --out-dir /content/drive/MyDrive/VoxDetect/ml-core/checkpoints/ft_head_v1 \
    --epochs 5 --batch-size 4 --lr 1e-5 --augment \
    --holdout speaker1 \
    --results /content/drive/MyDrive/VoxDetect/ml-core/results/ablation_results.csv

# garystafford (plain split, insurance for Tuesday)
python3 scripts/finetune_head.py \
    --data garystafford \
    --data-dir /content/garystafford_data \
    --out-dir /content/drive/MyDrive/VoxDetect/ml-core/checkpoints/ft_gs_v1 \
    --epochs 5 --batch-size 4 --lr 1e-5 --val-split 0.2 \
    --results /content/drive/MyDrive/VoxDetect/ml-core/results/ablation_results.csv
```

Saves the HF model dir + `finetune_report.json` (records strategy, label mapping, SR,
augment flag, LOSO mean±std ACC/FPR/FNR, per-fold rows, holdout eval, and per-epoch
train/eval loss sequences so you can check the overfit trend). Load the saved model back
with `evaluate.py --checkpoint <dir>` / `DetectionEngine(checkpoint=<dir>)`.

## Live demo (notebooks/live_demo.ipynb)

The demo of "real-time detection" runs in Colab: `score_audio(wav, sr)` scores an
in-memory buffer (mic capture) with the same fusion as `analyze_audio(path)`. Beat 1 =
real voice via mic -> REAL; beat 2 = pre-made team `clone_*.wav` -> CLONED; ends on the
numbers table. Run on the fine-tuned checkpoint if one exists.

## Creating the cloned clips (the fake half of the dataset)

Use **`notebooks/clone_voice_xtts.ipynb`** (Coqui XTTS-v2, open-source, free, runs on
Colab). Each team member opens it, uploads ONE ~10-20s real clip as their reference voice,
and generates cloned clips of the SAME sentences in English + Hindi.

**Reference format:** uploads may be `.wav`, `.m4a`, `.aac`, or `.mp3` — cell 1 auto-converts
the two reference clips to 22050 Hz mono PCM WAV (XTTS's expected `speaker_wav` format).

**Real-clip conversion:** cell 4 takes your 6 phone recordings in TWO upload stages —
your 3 English clips first, then your 3 Hindi clips — and converts them to WAV, named
`real_english_01..03.wav` / `real_hindi_01..03.wav` under `/content/real_recs/<YOUR_NAME>/<lang>/`.
Language comes from which stage you upload in, so it is always correct (browser duplicate
suffixes like ` (1)` don't matter). Files are sorted by sentence index within each language
and the plan is shown for confirmation before writing. This folder is copied locally
one-per-person, then pushed to the shared Drive `real/<lang>/<YOUR_NAME>/` tree.

**Why XTTS-v2 and not ElevenLabs/PlayHT free:** as of 2026 the hosted free tiers no longer
include instant voice cloning (they need the paid tier or a card), and quotas/daily limits
are a lottery on a Sunday night. XTTS-v2 has no signup, no paywall, and — important for a
clean dataset — **one consistent TTS engine across all speakers** instead of 5 people each
picking a different tool (mixing engines would confound results).

## Planned / add as needed

- `audit_results.py` — summarize every Drive `results/*.json` into a comparison table.
