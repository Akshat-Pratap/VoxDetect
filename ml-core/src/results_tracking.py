"""
results_tracking.py — P1 ML Core: folium-style source-of-truth results table.

Mirrors folium/ml/evaluate.py's `ablation_results.csv` pattern. Every evaluation /
fine-tuning run appends ONE row that self-documents WHICH dataset and CHECKPOINT
were used, plus the full set of "how good is it" stats. Re-running the same
(variant, dataset, split, checkpoint) skips the duplicate so the table stays clean.

Single shared writer imported by both `evaluate.py` and `finetune_head.py`, so a
reviewer reads one CSV and sees both the garystafford (Track A) and team LOSO
(Track B) stories side by side.
"""
import csv
import datetime
import os
import subprocess
from pathlib import Path

# Column order is the source of truth. Add columns here only if every row can
# fill them (evaluate.py and finetune_head.py both write into this table).
ABLATION_COLUMNS = [
    "variant",          # run name, e.g. baseline_garystafford / loso_team / holdout_team
    "dataset",          # WHICH test corpus: garystafford | team | team_hindi ...
    "split",            # train | val | test | loso_fold | loso_aggregate | holdout
    "model",            # backbone repo or local checkpoint dir actually scored
    "checkpoint",       # full path of the model used (pretrained repo vs finetuned dir)
    "n_clips",          # number of clips in this row's test set
    "accuracy",         # ACC %
    "fpr",              # false-positive rate % (real -> cloned)
    "fnr",              # false-negative rate % (cloned -> real)
    "roc_auc",          # threshold-independent separation
    "precision",        # precision % (predict-real precision)
    "recall",           # recall % (real recall)
    "f1",               # F1 % (real class)
    "threshold",        # risk cutoff used for ACC/FPR/FNR
    "epochs",           # training epochs (0 for baseline / inference-only)
    "lr",               # learning rate
    "n_freeze",         # wav2vec2 layers frozen during training
    "repo_commit",      # git commit of the code that produced this row
    "src_root",         # exact --root passed
    "timestamp",        # ISO UTC of the run
]


def git_commit(path=None):
    """Return the current repo's short commit hash ('' if not a git repo / error)."""
    try:
        if path is not None:
            out = subprocess.run(
                ["git", "-C", str(path), "rev-parse", "--short", "HEAD"],
                capture_output=True, text=True,
            )
        else:
            out = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True, text=True,
            )
        return out.stdout.strip()
    except Exception:
        return ""


def pct(x):
    """Percent helper: probability -> 0..100 float (numpy-safe if numpy present)."""
    try:
        import numpy as np
        x = np.asarray(x) * 100.0
        return round(float(x), 2)
    except Exception:
        return round(float(x) * 100.0, 2)


def _identity_row(row):
    """Identity key for dedup: variant + dataset + split + checkpoint."""
    return (row["variant"], row["dataset"], row["split"], row["checkpoint"])


def log_ablation_row(path, row: dict):
    """Append one row to the results CSV. Skips if the same identity already exists.

    `row` must be a dict with keys in ABLATION_COLUMNS (missing -> '').
    `path` is the CSV path (folium-style, e.g. results/ablation_results.csv).
    """
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    # Fill missing keys so the row always has the full fixed column set.
    full = {col: row.get(col, "") for col in ABLATION_COLUMNS}

    if path.exists() and path.stat().st_size > 0:
        with open(path, newline="") as f:
            reader = csv.DictReader(f)
            existing = [r for r in reader]
        new_id = _identity_row(full)
        for r in existing:
            if _identity_row(r) == new_id:
                print(f"[results] skipped duplicate row (already logged): "
                      f"({new_id[0]}, {new_id[1]}, {new_id[2]})")
                return
        rows = existing + [full]
    else:
        rows = [full]

    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=ABLATION_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"[results] appended row -> {path.resolve()}  "
          f"variant={full['variant']} dataset={full['dataset']} split={full['split']}")


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")


def make_row(**kwargs):
    """Build a row dict with timestamp + repo_commit filled in, common defaults 0."""
    base = {
        "n_clips": 0, "accuracy": 0.0, "fpr": 0.0, "fnr": 0.0, "roc_auc": 0.0,
        "precision": 0.0, "recall": 0.0, "f1": 0.0, "threshold": 0.0,
        "epochs": 0, "lr": 0.0, "n_freeze": 0, "src_root": "",
        "variant": "", "dataset": "", "split": "", "model": "", "checkpoint": "",
        "repo_commit": git_commit(), "timestamp": now_iso(),
    }
    base.update(kwargs)
    return base
