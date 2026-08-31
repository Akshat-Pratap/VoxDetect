"""
finetune_head.py — Fine-tune only the classification head of the Gustking model
on YOUR volunteer+clone dataset (one TTS engine, a few hundred clips).

Strategy (from learn.md sec. 2, proven by the garystafford model on this same base):
  - keep the Gustking wav2vec2 backbone; do NOT chase 'detect all TTS'
  - split freeze schedules for COL compute budget:
      * LOSO folds: train ONLY the head (--loso-frozen 24) — fast (near-linear-probe);
        LOSO is a generalization SIGNAL, not a tuning exercise.
      * final deployable checkpoint: the single rung can afford the full recipe
        (--final-frozen 12/20) since it's run once.
  - --augment adds noise/speed/volume jitter to TRAIN clips only
  - LABEL ORDER is verified, not assumed: we set real=0, fake=1 explicitly and assert it.
  - SPEAKER-PARTITIONED eval: leave-one-speaker-out cross-validation, so the same
    person's real+cloned clips are NEVER split across train/test. A random clip-level
    split would just learn "that one person's voice" and fake the numbers.
  - guard: EVERY speaker must have both real and cloned clips, or we hard-fail.

Input layout (canonical — SPEAKER is the folder directly above each clip):
    data_root/
      real/<language>/<speaker>/*.wav        (bonafide)
      cloned/<language>/<speaker>/*.wav      (spoof, from your chosen TTS tool)
  (a leading train/ or test/ split dir is also tolerated)

Output (--out-dir):
  - saved_model/                  HuggingFace model dir (final model trained on ALL speakers)
  - finetune_report.json           LOSO mean +/- std (ACC/FPR/FNR) + per-fold rows + final eval,
                                  plus per-epoch train/eval loss sequences for overfit checks.

Colab usage (from the repo clone, after mount+hydrate):
    python3 scripts/finetune_head.py \
        --data team \
        --data-dir /content/VoxDetect_data \
        --out-dir /content/drive/MyDrive/VoxDetect/ml-core/checkpoints/ft_head_v1 \
        --epochs 6 --batch-size 4 --lr 1e-5 --augment \
        --holdout speaker1
    # LOSO folds default to head-only (fast); the FINAL model uses --final-frozen (20).
    # Relax --final-frozen to 12 only if underfitting (test acc ~= train acc but low).
    # Drop --augment / adjust --epochs to trim Colab time.

Two data modes (manual --data flag; Track A garystafford and Track B team are SEPARATE stories):
  * --data team        : YOUR volunteer+clone clips (real/<lang>/<speaker> + cloned/<lang>/<speaker>).
                         Default eval = LEAVE-ONE-SPEAKER-OUT CV (each speaker has real+cloned).
  * --data garystafford: OPEN-LICENSE English fallback (see prepare_garystafford.py). NO per-speaker
                         pairing, so eval is a PLAIN stratified train/val/test split: --no-loso is
                         forced and --val-split sizes the held-out TEST set.

Colab usage (garystafford backup, plain split):
    python3 scripts/finetune_head.py \
        --data garystafford \
        --data-dir /content/garystafford_data \
        --out-dir /content/drive/MyDrive/VoxDetect/ml-core/checkpoints/ft_gs_v1 \
        --epochs 5 --batch-size 4 --lr 1e-5 --val-split 0.2
    # Per-epoch + best checkpoints are written under <out-dir>/checkpoints/; --resume continues a run.

See notebooks/sprint3_finetune_head.ipynb for the full walkthrough.
"""
import argparse
import glob
import json
import os
import pathlib
import shutil
import sys

_PATH = os.path.dirname(os.path.abspath(__file__))   # this script's dir (scripts/)
_SRC = os.path.join(os.path.dirname(_PATH), "src")    # sibling src/
if _SRC not in sys.path:
    sys.path.insert(0, _SRC)

import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoFeatureExtractor,
    AutoModelForAudioClassification,
    DataCollatorWithPadding,
    TrainingArguments,
    Trainer,
)

from results_tracking import log_ablation_row, make_row


IMG_KEY = "input_values"
LABELS = ("real", "fake")          # idx 0 = real, 1 = fake/cloned
# Default freeze is CONSERVATIVE for our tiny (~150 clip) dataset. The garystafford
# recipe was tuned on ~1,866 samples; at ~150 we'd overfit 160M params on 12 layers.
# Start here, then relax only if underfitting (e.g. --head-only as the minimal baseline).
NUM_FREEZE_BOTTOM = 20             # of 24 wav2vec2 transformer layers


def get_sample_rate(proc):
    """Read the feature extractor's expected resampling rate instead of hardcoding.
    Wav2Vec2/XLSR models are picky: a silent SR mismatch degrades everything downstream."""
    return int(getattr(proc, "sampling_rate", None) or 16000)


def speaker_of(path, data_root):
    """Return the SPEAKER folder for a clip, asserting the exact folder depth.

    Supported layouts (speaker is ALWAYS the folder directly above the clip):
        real/<language>/<speaker>/clip.wav          -> 4 parts  (team data)
        train/real/<language>/<speaker>/clip.wav    -> 5 parts  (team, with split dir)
        real/<speaker>/clip.wav                     -> 3 parts  (garystafford flat layout)
    We fail loudly if the depth differs, rather than inferring the speaker
    structurally and silently mis-partitioning the split.
    """
    rel = pathlib.Path(path).relative_to(data_root).parts
    if len(rel) == 4:
        label, lang, speaker, fname = rel
    elif len(rel) == 3:
        label, speaker, fname = rel
    elif len(rel) == 5:
        _, label, lang, speaker, fname = rel
    else:
        raise SystemExit(
            f"[FAIL] unexpected folder depth {len(rel)} for {path}\n"
            f"Expected 'real/<language>/<speaker>/clip.wav' (4), "
            f"'real/<speaker>/clip.wav' (3), or with a leading train/ or test/ split dir.\n"
            f"The SPEAKER must be the folder directly above the clip. Check your tree:\n"
            f"  -> {rel}"
        )
    if not fname.lower().endswith(".wav"):
        raise SystemExit(f"[FAIL] {path}: expected a .wav file as the leaf, got '{fname}'")
    return speaker


def gather(data_root):
    """Return {speaker_name: [(path, label_idx)]} scanning data_root/real + data_root/cloned."""
    speakers = {}
    for label, lab_idx in (("real", 0), ("cloned", 1), ("fake", 1)):
        for p in glob.glob(os.path.join(data_root, label, "**", "*.wav"), recursive=True):
            sp = speaker_of(p, data_root)
            speakers.setdefault(sp, []).append((p, lab_idx))
    return speakers


def check_speaker_classes(speakers):
    """Hard-fail if ANY speaker is missing either class — a one-class fold makes its
    FPR or FNR undefined and silently poisons the LOSO aggregate."""
    bad = []
    for sp, items in sorted(speakers.items()):
        n_real = sum(1 for _, l in items if l == 0)
        n_fake = sum(1 for _, l in items if l == 1)
        if n_real == 0 or n_fake == 0:
            bad.append((sp, n_real, n_fake))
    if bad:
        rows = "\n".join(f"   - {sp}: real={r} cloned={c}" for sp, r, c in bad)
        raise SystemExit(
            f"[FAIL] every speaker must have BOTH real and cloned clips, but these don't:\n"
            f"{rows}\n"
            f"A held-out speaker with only one class gives a degenerate fold (undefined "
            f"FPR/FNR). Re-record the missing clips, or drop the speaker and re-run.")
    return True


def load_wav(path, sr):
    import librosa
    return librosa.load(path, sr=sr)[0]


def augment(wav, sr, seed=None, prob=0.5, rng=None):
    """Simple augmentation for tiny datasets: additive noise + speed/pitch jitter +
    volume jitter. Applied to TRAIN clips only (never the held-out test speaker)."""
    rng = rng or np.random.default_rng(seed)
    if rng.random() > prob:
        return wav
    wav = wav + rng.normal(0, 0.004, wav.shape).astype("float32")
    rate = float(rng.uniform(0.95, 1.05))
    import librosa
    new_len = int(len(wav) / rate)
    wav = librosa.resample(wav, orig_sr=sr, target_sr=sr * rate)
    if wav.shape[0] < new_len:
        wav = np.pad(wav, (0, new_len - wav.shape[0]))
    else:
        wav = wav[:new_len]
    return (wav * float(rng.uniform(0.9, 1.1))).astype("float32")


def make_collator(proc):
    """Pad variable-length audio per-batch to the longest clip + build attention_mask.

    Clips have different durations, so raw tensors can't be stacked. Wav2Vec2 handles
    variable length only when input_values are padded to the batch max AND the
    attention_mask is provided. Returns a DataCollatorWithPadding bound to `proc`.
    """
    return DataCollatorWithPadding(tokenizer=proc, padding="longest", return_tensors="pt")


class AudioDS(Dataset):
    def __init__(self, proc, items, sr, augment_train=False):
        self.proc, self.items, self.sr = proc, items, sr
        self.augment = augment_train
        self.rng = np.random.default_rng(42)

    def __len__(self):
        return len(self.items)

    def __getitem__(self, i):
        path, label = self.items[i]
        wav = load_wav(path, self.sr)
        if self.augment:
            wav = augment(wav, self.sr, rng=self.rng)
        feats = self.proc(wav, sampling_rate=self.sr, return_tensors="pt")
        return {IMG_KEY: feats[IMG_KEY][0], "labels": label}


def build_model(repo):
    """Fresh pretrained model with a NEW binary head (real=0, fake=1) + freeze applied.

    Rebuilt per train run from the local HF cache so each LOSO fold trains on an
    untouched copy — no weights leak between folds. Label order is set + asserted here,
    NOT assumed by position.
    """
    model = AutoModelForAudioClassification.from_pretrained(repo)

    print("[label-check] pretrained id2label:", model.config.id2label)
    # Replace the classifier with a fresh binary head sized to the backbone hidden dim.
    # (Setting .out_features in place does NOT resize the weight matrix.)
    hidden = model.classifier.in_features
    model.classifier = nn.Linear(hidden, 2)
    model.config.num_labels = 2
    model.config.label2id = {"real": 0, "fake": 1}
    model.config.id2label = {0: "real", 1: "fake"}
    assert model.config.id2label[1] == "fake", "label mapping must match gather() (1=fake)"
    return model


def freeze_head(model, n_freeze=12):
    """Freeze bottom n wav2vec2 transformer layers; unfreeze the rest + head."""
    w2v = model.wav2vec2
    layers = w2v.encoder.layers
    for layer in layers[:n_freeze]:
        for p in layer.parameters():
            p.requires_grad = False
    for layer in layers[n_freeze:]:
        for p in layer.parameters():
            p.requires_grad = True
    for p in w2v.feature_extractor.parameters():
        p.requires_grad = False
    for p in model.classifier.parameters():
        p.requires_grad = True
    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total = sum(p.numel() for p in model.parameters())
    print(f"[freeze] bottom {n_freeze}/{len(layers)} frozen; "
          f"trainable {trainable/1e6:.2f}M / {total/1e6:.2f}M")
    return model


def compute_metrics(metrics):
    """Trainer compute_metrics — receives an EvalPrediction (metrics.predictions/label_ids)."""
    preds = np.argmax(metrics.predictions, axis=-1)
    labels = metrics.label_ids
    return {
        "acc": float((preds == labels).mean()),
        "fpr": float(((labels == 0) & (preds == 1)).sum() / max(1, (labels == 0).sum())),
        "fnr": float(((labels == 1) & (preds == 0)).sum() / max(1, (labels == 1).sum())),
    }


def train_once(repo, proc, train_items, test_items, sr, args, n_freeze,
               ckpt_dir=None, resume=None, tag=""):
    """Fine-tune on train_items, evaluate on test_items (held-out speakers).

    Checkpointing (so a Colab runtime drop never loses an epoch):
      - per-epoch + best checkpoints saved under <ckpt_dir>/checkpoints/epoch_* /
        best_<tag>.pt  (HuggingFace-style dirs, so --resume / evaluate --checkpoint work).
      - if resume points at a saved HF dir, we continue from it instead of rebuilding.
    """
    model = build_model(repo)
    freeze_head(model, n_freeze=n_freeze)

    if resume and os.path.isdir(resume):
        try:
            model = AutoModelForAudioClassification.from_pretrained(resume)
            print(f"[resume] continuing from existing model at {resume}")
        except Exception as e:
            print(f"[resume] could not load {resume} ({e}); starting fresh")

    train_ds = AudioDS(proc, train_items, sr, augment_train=args.augment)
    test_ds = AudioDS(proc, test_items, sr, augment_train=False)

    save_dir = None
    if ckpt_dir:
        save_dir = os.path.join(ckpt_dir, "checkpoints")
        os.makedirs(save_dir, exist_ok=True)

    save_steps = max(1, args.epochs)  # save once per epoch (single pass control)

    train_args = TrainingArguments(
        output_dir=save_dir or "/content/_ft_checkpoints",
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        learning_rate=args.lr,
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch" if save_dir else "no",
        save_total_limit=max(1, args.epochs),
        metric_for_best_model="eval_acc",
        greater_is_better=True,
        load_best_model_at_end=True if save_dir else False,
        report_to=[],
        push_to_hub=False,
    )
    trainer = Trainer(
        model=model,
        args=train_args,
        train_dataset=train_ds,
        eval_dataset=test_ds,
        data_collator=make_collator(proc),
        compute_metrics=compute_metrics,
    )
    trainer.train(resume_from_checkpoint=resume if (resume and os.path.isdir(resume)) else None)
    metrics = trainer.evaluate(test_ds)

    # Persist the BEST model (in-memory, because load_best_model_at_end=True already
    # swapped the best weights in) to a predictable best_<tag> dir so both --resume and
    # evaluate --checkpoint can point straight at it. Don't copy the LAST checkpoint dir
    # here — with load_best_model_at_end the last-dir step number is NOT the best one.
    if save_dir and os.path.isdir(save_dir):
        best_dir = os.path.join(save_dir, "best_" + (tag or "model"))
        if os.path.exists(best_dir):
            shutil.rmtree(best_dir)
        os.makedirs(best_dir)
        trainer.save_model(best_dir)
        proc.save_pretrained(best_dir)
        print(f"[ckpt] best model + processor -> {best_dir}")

    # Per-epoch train + eval loss so we can eyeball the overfit trend (divergence),
    # not just a single before/after snapshot.
    train_losses = []
    eval_losses = []
    for log in getattr(trainer.state, "log_history", []):
        if "loss" in log:
            train_losses.append(float(log["loss"]))
        if "eval_loss" in log:
            eval_losses.append(float(log["eval_loss"]))

    return {
        "train_losses": train_losses,
        "eval_losses": eval_losses,
        "eval": {
            k: float(v)
            for k, v in metrics.items()
            if k not in ("eval_runtime", "eval_samples_per_second")
        },
    }, model


def classify_metrics(labels, preds, probs=None):
    """Full 'how good is it' metric set from 0=real / 1=fake labels & preds.

    Returns ACC, FPR, FNR, per-class precision/recall/F1 (class 0 = real), plus
    ROC-AUC (threshold-independent) when logits/probs are provided.
    """
    labels = np.asarray(labels)
    preds = np.asarray(preds)
    n = max(1, len(labels))
    acc = float((preds == labels).mean())

    # confusion counts (0=real negative-flip FPR; 1=fake positive-truth FN)
    tp = int(((labels == 1) & (preds == 1)).sum())   # fake detected
    fn_ = int(((labels == 1) & (preds == 0)).sum())   # fake missed
    fp = int(((labels == 0) & (preds == 1)).sum())    # real flagged fake
    tn = int(((labels == 0) & (preds == 0)).sum())    # real correct

    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    fnr = fn_ / (fn_ + tp) if (fn_ + tp) else 0.0

    def prf(tp_, fp_, fn_):
        p = tp_ / (tp_ + fp_) if (tp_ + fp_) else 0.0
        r = tp_ / (tp_ + fn_) if (tp_ + fn_) else 0.0
        f = 2 * p * r / (p + r) if (p + r) else 0.0
        return p, r, f

    # per-class for the real class (0) and fake class (1)
    p_real, r_real, f_real = prf(tn, fn_, fp)   # 'real' as the positive view
    p_fake, r_fake, f_fake = prf(tp, fp, fn_)

    auc = 0.0
    if probs is not None and len(np.unique(labels)) == 2:
        try:
            from sklearn.metrics import roc_auc_score
            auc = float(roc_auc_score(labels, np.asarray(probs)))
        except Exception:
            auc = 0.0

    return {
        "acc": acc, "fpr": fpr, "fnr": fnr, "roc_auc": auc,
        "precision_real": p_real, "recall_real": r_real, "f1_real": f_real,
        "precision_fake": p_fake, "recall_fake": r_fake, "f1_fake": f_fake,
        "tp": tp, "fp": fp, "tn": tn, "fn": fn_, "n": len(labels),
    }


def inference_eval(model, proc, items, sr):
    """Run a trained model inference-only over items; return full classify_metrics."""
    model.eval()
    ds = AudioDS(proc, items, sr, augment_train=False)
    dl = DataLoader(ds, batch_size=4, shuffle=False, collate_fn=make_collator(proc))
    preds, labels, probs = [], [], []
    with torch.no_grad():
        for batch in dl:
            feats = batch[IMG_KEY].to(device())
            if "attention_mask" in batch:
                mask = batch["attention_mask"].to(device())
                out = model(feats, attention_mask=mask).logits.detach().cpu().numpy()
            else:
                out = model(feats).logits.detach().cpu().numpy()
            p = torch.softmax(torch.from_numpy(out), dim=-1).numpy()
            preds.extend(np.argmax(out, axis=-1))
            labels.extend(batch["labels"].numpy())
            probs.extend(p[:, 1].tolist())
    return classify_metrics(labels, preds, probs)


def device():
    return "cuda" if torch.cuda.is_available() else "cpu"


def summarize_rows(rows):
    """Collapse per-fold rows into mean +/- std for each key metric.

    Fold rows store Trainer eval metrics under the 'eval_' prefix (eval_acc, eval_fpr,
    eval_fnr). Resolve each metric key tolerantly so a missing/renamed key can't nuke
    the whole LOSO aggregate.
    """
    keys = ("acc", "fpr", "fnr")
    out = {}
    for k in keys:
        vals = []
        for r in rows:
            ev = r.get("eval") or {}
            v = ev.get(k)
            if v is None:
                v = ev.get("eval_" + k)
            if v is not None:
                vals.append(float(v))
        out[k] = {
            "mean": float(np.mean(vals)) if vals else 0.0,
            "std": float(np.std(vals)) if vals else 0.0,
            "min": float(np.min(vals)) if vals else 0.0,
            "max": float(np.max(vals)) if vals else 0.0,
            "per_fold": [float(v) for v in vals],
        }
    return out


def stratified_split(items, frac, seed=42):
    """Plain clip-level stratified split -> (train_items, test_items) keeping both
    classes present in each side. Used for --data garystafford (no speaker pairing,
    so LOSO does not apply)."""
    import random
    rng = random.Random(seed)
    items = list(items)
    by_label = {0: [], 1: []}
    for it in items:
        by_label[it[1]].append(it)
    train, test = [], []
    for lab in (0, 1):
        pool = list(by_label[lab])
        rng.shuffle(pool)
        n_test = max(1, int(round(len(pool) * frac)))
        test.extend(pool[:n_test])
        train.extend(pool[n_test:])
    rng.shuffle(train)
    rng.shuffle(test)
    return train, test


def log_metrics_row(args, csv_path, variant, dataset, split, metrics, checkpoint,
                    n_clips=None, lr=None, epochs=None, n_freeze=None):
    """Append one source-of-truth CSV row from a classify_metrics dict."""
    if not csv_path:
        return
    row = make_row(
        variant=variant,
        dataset=dataset,
        split=split,
        model=args.repo if not os.path.isdir(checkpoint) else checkpoint,
        checkpoint=str(checkpoint),
        n_clips=n_clips if n_clips is not None else metrics.get("n", 0),
        accuracy=(metrics["acc"] * 100.0),
        fpr=(metrics["fpr"] * 100.0),
        fnr=(metrics["fnr"] * 100.0),
        roc_auc=(metrics["roc_auc"] * 100.0),
        precision=(metrics["precision_real"] * 100.0),
        recall=(metrics["recall_real"] * 100.0),
        f1=(metrics["f1_real"] * 100.0),
        threshold=0.0,
        epochs=epochs if epochs is not None else args.epochs,
        lr=lr if lr is not None else args.lr,
        n_freeze=n_freeze if n_freeze is not None else args.final_frozen,
        src_root=args.data_dir,
    )
    log_ablation_row(csv_path, row)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", choices=("team", "garystafford"), default="team",
                    help="which corpus: 'team' = YOUR real+cloned clips (LOSO by default); "
                         "'garystafford' = open-license English fallback (PLAIN split forced). "
                         "Track A (garystafford) and Track B (team) are separate stories.")
    ap.add_argument("--data-dir", required=True,
                    help="root with real/ + cloned/ (each <lang>/<speaker>/*.wav)")
    ap.add_argument("--out-dir", required=True, help="where to save the final model + report")
    ap.add_argument("--repo", default="Gustking/wav2vec2-large-xlsr-deepfake-audio-classification")
    ap.add_argument("--epochs", type=int, default=4)
    ap.add_argument("--batch-size", type=int, default=4)
    ap.add_argument("--lr", type=float, default=1e-5)
    ap.add_argument("--val-split", type=float, default=0.2,
                    help="held-out test fraction for --data garystafford (plain stratified "
                         "split). 0.2 = 20% held out as test; the rest trains. "
                         "Ignored for --data team (which uses LOSO/holdout).")
    ap.add_argument("--no-loso", action="store_true",
                    help="skip leave-one-speaker-out CV; just train+eval on all data. "
                         "Default is LOSO because a single 80/20 speaker split is only "
                         "n=1 sample — high variance. AUTO-ENABLED for --data garystafford.")
    ap.add_argument("--resume", default=None,
                    help="path to a previously-saved HF checkpoint dir to continue from "
                         "(e.g. <out-dir>/checkpoints/best_<tag>). Colab safety net: if a "
                         "runtime drops, re-run with --resume to continue instead of losing "
                         "the epoch(s) already trained.")
    ap.add_argument("--results-csv", default=None,
                    help="folium-style source-of-truth CSV to append one row per run "
                         "(default None = skip). All metrics + dataset + checkpoint logged.")
    ap.add_argument("--holdout", default=None,
                    help="speaker name kept ENTIRELY out of the final model's training, "
                         "then evaluated on it, so you can A/B base-vs-finetuned on the "
                         "SAME unseen speaker (pass the exact folder name). Leave unset "
                         "to train the final model on every speaker.")
    ap.add_argument("--freeze-bottom", type=int, default=NUM_FREEZE_BOTTOM,
                    help="number of bottom wav2vec2 layers to freeze for the FINAL "
                         "deployable model (of 24). Default 20; the garystafford recipe "
                         "is 12 but that overfits our tiny data. Relax only if underfitting.")
    ap.add_argument("--loso-frozen", type=int, default=24,
                    help="layers frozen during the 5 LOSO folds. Default 24 = train ONLY "
                         "the classification head (fast, near-linear-probe) — LOSO is a "
                         "generalization signal, not a tuning exercise, and full unfreeze "
                         "x5 runs would eat the Colab budget. Combine with --augment.")
    ap.add_argument("--final-frozen", type=int, default=None,
                    help="layers frozen for the ONE final deployable checkpoint. Defaults "
                         "to --freeze-bottom (20). This is a single run, so it can afford "
                         "the full recipe (e.g. 12) if you want.")
    ap.add_argument("--head-only", action="store_true",
                    help="train ONLY the classification head (freeze all 24 layers) for "
                         "EVERY run (LOSO + final). Best minimal baseline.")
    ap.add_argument("--augment", action="store_true",
                    help="apply noise/speed/volume augmentation to TRAIN clips only "
                         "(never the held-out test set). Recommend ON for tiny datasets.")
    args = ap.parse_args()
    if args.head_only:
        args.freeze_bottom = 24
        args.loso_frozen = 24
        args.final_frozen = 24
        print("[hint] --head-only: recommend also adding --augment.")
    if args.final_frozen is None:
        args.final_frozen = args.freeze_bottom

    # garystafford has NO per-speaker real/clone pairing -> LOSO is impossible.
    # Force the plain-train/test-split path and skip the both-classes-per-speaker guard.
    if args.data == "garystafford":
        args.no_loso = True
        print("[data-mode] garystafford: forced plain train/test split (no LOSO because "
              "real and fake are NOT paired per speaker).")

    speakers = gather(args.data_dir)
    if not speakers:
        raise SystemExit(f"No clips found under {args.data_dir}/real or /cloned. "
                         f"Wanted real/<lang>/<speaker>/*.wav. Check the tree.")
    n_real = sum(1 for its in speakers.values() for _, l in its if l == 0)
    n_fake = sum(1 for its in speakers.values() for _, l in its if l == 1)
    print(f"[data] speakers={len(speakers)} clips real={n_real} cloned={n_fake}")
    print("[data] per-speaker real/cloned counts (must have BOTH classes per speaker):")
    for sp in sorted(speakers):
        c_real = sum(1 for _, l in speakers[sp] if l == 0)
        c_fake = sum(1 for _, l in speakers[sp] if l == 1)
        print(f"   - {sp}: real={c_real} cloned={c_fake}")
    # Both-classes-per-speaker guard applies ONLY to team data (LOSO needs it). For
    # garystafford (plain split) the real speakers (yt_*) and fake TTS voices are in
    # different folders, so the guard would wrongly hard-fail — skip it there.
    if args.data == "team":
        check_speaker_classes(speakers)

    # Optional holdout (team mode): a speaker kept ENTIRELY out of the final model so
    # we can A/B base-vs-finetuned on the SAME unseen speaker (see notebook verify cell).
    holdout_items = []
    if args.holdout:
        if args.holdout not in speakers:
            raise SystemExit(f"--holdout '{args.holdout}' not found in speakers: "
                             f"{sorted(speakers)}")
        holdout_items = speakers[args.holdout]
        print(f"[holdout] '{args.holdout}' ({len(holdout_items)} clips) kept "
              f"OUT of the final model + evaluated on it.")

    proc = AutoFeatureExtractor.from_pretrained(args.repo)
    sr = get_sample_rate(proc)
    print(f"[sr] feature extractor sampling_rate = {sr} Hz")

    all_items = [it for its in speakers.values() for it in its]
    report = {
        "data_mode": args.data,
        "strategy": (f"loso_frozen_{args.loso_frozen}_of_24 / "
                     f"final_frozen_{args.final_frozen}_of_24"
                     f"{'+ head-only' if args.head_only else ''}"),
        "label_mapping": {"real": 0, "fake": 1},
        "augment_train": args.augment,
        "sampling_rate": sr,
        "epochs": args.epochs, "lr": args.lr, "batch_size": args.batch_size,
        "n_speakers": len(speakers), "n_real": n_real, "n_fake": n_fake,
        "holdout": args.holdout,
        "folds": [], "loso": None,
    }

    os.makedirs(args.out_dir, exist_ok=True)

    # ------------------------- Track A: garystafford (plain split) -------------------------
    if args.data == "garystafford":
        train_items, test_items = stratified_split(all_items, args.val_split)
        print(f"[gs] stratified split: train={len(train_items)} test={len(test_items)} "
              f"(held-out test {args.val_split:.0%})")
        # baseline (no fine-tune) on the SAME test set for the "lift" comparison.
        # Use the UNTOUCHED pretrained model (its own trained 2-class head), NOT
        # build_model() which resets the head to random init and would give a bogus baseline.
        base_model = AutoModelForAudioClassification.from_pretrained(args.repo)
        base_model.eval()
        base_test = inference_eval(base_model, proc, test_items, sr)
        report["baseline_test"] = base_test
        print(f"[gs] baseline (pretrained, no fine-tune) on test: {base_test}")
        if args.results_csv:
            log_metrics_row(args, args.results_csv, f"baseline_{args.data}", args.data,
                            "test", base_test, args.repo, n_clips=len(test_items),
                            epochs=0, n_freeze=24)
        del base_model, base_test

        # final model trained on the TRAIN split, evaluated on held-out TEST
        print("\n=== Training garystafford final model on TRAIN split "
              f"(frozen {args.final_frozen}/24), eval on TEST ===")
        ckpt_dir = os.path.join(args.out_dir, "checkpoints")
        gs_tag = f"gs_frozen{args.final_frozen}"
        final, final_model = train_once(
            args.repo, proc, train_items, test_items, sr, args, args.final_frozen,
            ckpt_dir=ckpt_dir, resume=args.resume, tag=gs_tag,
        )
        report["final_train_test"] = {
            "n_train": len(train_items), "n_test": len(test_items),
            "n_freeze": args.final_frozen, "train_losses": final["train_losses"],
        }
        # inference eval on the held-out TEST (clean, uses classify_metrics incl. AUC)
        test_metrics = inference_eval(final_model, proc, test_items, sr)
        report["final_eval_test"] = test_metrics
        print(f"[gs] fine-tuned on TEST: {test_metrics}")
        if args.results_csv:
            log_metrics_row(args, args.results_csv, f"finetuned_{args.data}", args.data,
                            "test", test_metrics, args.out_dir, n_clips=len(test_items))
        final_model.save_pretrained(args.out_dir)
        proc.save_pretrained(args.out_dir)
        json.dump(report, open(os.path.join(args.out_dir, "finetune_report.json"), "w"),
                  indent=2)
        print(f"\nSaved garystafford final model + report -> {args.out_dir}")
        print("Track A numbers are the 'fine-tuning adapts to corpus' proof, NOT a "
              "generalization claim (Gustking base already knew these TTS engines).")
        return

    # ------------------------- Track B: team data (LOSO + holdout) -------------------------
    if not args.no_loso and len(speakers) >= 2:
        # Leave-one-speaker-out: hold out one speaker's real+cloned clips per fold.
        # LOSO folds train ONLY the head (--loso-frozen 24) — fast, and it's a
        # generalization signal, not a tuning exercise.
        names = sorted(speakers.keys())
        for held in names:
            train_items = [it for sp, its in speakers.items() if sp != held for it in its]
            test_items = speakers[held]
            print(f"\n=== LOSO fold: held-out speaker '{held}' "
                  f"(train={len(train_items)}, test={len(test_items)}) ===")
            fold = {
                "held_out_speaker": held,
                "n_train": len(train_items),
                "n_test": len(test_items),
                "n_freeze": args.loso_frozen,
                "augment_train": args.augment,
                **train_once(args.repo, proc, train_items, test_items, sr, args, args.loso_frozen)[0],
            }
            report["folds"].append(fold)
            print(f"[LOSO] {held}: {fold['eval']}")
            if args.results_csv:
                ev = fold["eval"]
                log_metrics_row(args, args.results_csv, f"loso_fold_{held}", args.data,
                                "loso_fold",
                                {"acc": ev.get("eval_acc", ev.get("acc", 0.0)),
                                 "fpr": ev.get("eval_fpr", 0.0), "fnr": ev.get("eval_fnr", 0.0),
                                 "roc_auc": 0.0, "precision_real": 0.0, "recall_real": 0.0,
                                 "f1_real": 0.0, "n": len(test_items)},
                                args.repo, epochs=args.epochs, n_freeze=args.loso_frozen)
        report["loso"] = summarize_rows(report["folds"])
        report["loso"]["_claim"] = (
            f"LOSO: leave-one-speaker-out CV over ALL {len(names)} speakers, "
            f"each fold trained on the other {len(names)-1}. NOT the same thing as the "
            f"single --holdout A/B below. If --holdout was set, that speaker was STILL "
            f"included here as one of the folds."
        )
        print("\n[LOSO aggregate] ACC/FPR/FNR mean +/- std over all held-out speakers "
              f"(frozen {args.loso_frozen}/24):")
        for k, v in report["loso"].items():
            if k.startswith("_"):
                continue
            print(f"   {k}: {v['mean']:.3f} +/- {v['std']:.3f}  "
                  f"(min {v['min']:.3f}, max {v['max']:.3f})")
        if args.results_csv:
            m = report["loso"]
            log_metrics_row(args, args.results_csv, f"loso_{args.data}", args.data,
                            "loso_aggregate",
                            {"acc": m["acc"]["mean"], "fpr": m["fpr"]["mean"],
                             "fnr": m["fnr"]["mean"], "roc_auc": 0.0,
                             "precision_real": 0.0, "recall_real": 0.0, "f1_real": 0.0,
                             "n": sum(len(test_items) for _ in names)},
                            args.repo, epochs=args.epochs, n_freeze=args.loso_frozen)

    # Final deployable model: train on ALL (non-holdout) speakers with the FULL recipe
    # (single run, so it can afford unfreezing). This is the checkpoint that ships.
    final_items = all_items if not holdout_items else \
        [it for it in all_items if it not in set(holdout_items)]
    print("\n=== Training final model on all speakers "
          f"(frozen {args.final_frozen}/24) — the saved checkpoint ===")
    ckpt_dir = os.path.join(args.out_dir, "checkpoints")
    final, final_model = train_once(
        args.repo, proc, final_items, final_items, sr, args, args.final_frozen,
        ckpt_dir=ckpt_dir, resume=args.resume, tag="final",
    )
    report["final_train_on_all"] = {
        "n_train": len(final_items),
        "n_freeze": args.final_frozen,
        "train_losses": final["train_losses"],
    }
    report["final_eval_train_split"] = final["eval"]


    # Evaluate the final (fine-tuned) model on the held-out speaker for the A/B slide.
    if holdout_items:
        hold_eval = inference_eval(final_model, proc, holdout_items, sr)
        report["holdout"] = {
            "speaker": args.holdout,
            "n_clips": len(holdout_items),
            "finetuned_eval": hold_eval,
            "_claim": ("TRUE holdout: 1 speaker kept ENTIRELY out of the final model's "
                       "training, single run. Distinct from the LOSO aggregate above, "
                       "which is N-fold CV over all speakers (including this one)."),
        }
        print(f"\n[holdout] SAY THIS ON THE SLIDE as a SEPARATE claim from LOSO:")
        print(f"   'Fine-tuned model on 1 truly-unseen speaker: {hold_eval}")
        print("   (This speaker was still one of the LOSO folds above; here it's a "
              "separate, single-run check on a model that never saw it during training.)")
        if args.results_csv:
            log_metrics_row(args, args.results_csv, f"holdout_{args.holdout}", args.data,
                            "holdout", hold_eval, args.out_dir, n_clips=len(holdout_items))

    os.makedirs(args.out_dir, exist_ok=True)
    final_model.save_pretrained(args.out_dir)
    proc.save_pretrained(args.out_dir)

    with open(os.path.join(args.out_dir, "finetune_report.json"), "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nSaved final model + report -> {args.out_dir}")
    print("Read finetune_report.json for: LOSO mean +/- std, per-fold rows, and the "
          "train/eval loss trend (watch eval_loss diverging from train_loss = overfit).")


if __name__ == "__main__":
    main()
