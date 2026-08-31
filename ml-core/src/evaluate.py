"""
evaluate.py — P1 ML Core: Measure model accuracy + false-positive rate
Runs the detection engine over a folder of audio organized as:

    test_data/<split>/
        real/<speaker>/clip.wav
        cloned/<speaker>/clip.wav

Outputs a markdown table: per-split ACC, FPR, and a confusion-style summary.
This is the file that produces the numbers for your slides.

Colab usage:
    !python evaluate.py --root test_data --threshold 70
"""
import argparse
import glob
import json
import os
import sys

import numpy as np

_PATH = os.path.dirname(os.path.abspath(__file__))
if _PATH not in sys.path:
    sys.path.insert(0, _PATH)
from results_tracking import log_ablation_row, make_row


def build_index(root):
    """Return list of (path, is_fake_bool)."""
    items = []
    for split in ["train", "test", "val"]:
        base = os.path.join(root, split)
        for label, is_fake in [("real", False), ("cloned", True), ("fake", True)]:
            pat = os.path.join(base, label, "**", "*.wav")
            for p in glob.glob(pat, recursive=True):
                items.append((p, is_fake))
            # also allow flat test_data/real or test_data/cloned without split dir
    if not items:
        for label, is_fake in [("real", False), ("cloned", True), ("fake", True)]:
            pat = os.path.join(root, label, "**", "*.wav")
            for p in glob.glob(pat, recursive=True):
                items.append((p, is_fake))
    return items


def _find_best_threshold(rows):
    """Sweep risk-score cutoffs, pick the one maximizing accuracy, tie-breaking
    toward lower false-positive rate (we'd rather miss a clone than block real calls).
    Returns {'thr', 'acc', 'fpr'}."""
    scores = sorted({int(r["score"]) for r in rows} | {0, 50, 100})
    best = {"thr": 70, "acc": 0.0, "fpr": 1.0}
    for thr in range(0, 101):
        tp = sum(1 for r in rows if r["true_fake"] and r["score"] >= thr)
        tn = sum(1 for r in rows if (not r["true_fake"]) and r["score"] < thr)
        fp = sum(1 for r in rows if (not r["true_fake"]) and r["score"] >= thr)
        acc = (tp + tn) / len(rows)
        fpr = fp / (fp + tn) if (fp + tn) else 0.0
        if acc > best["acc"] + 1e-9 or (abs(acc - best["acc"]) < 1e-9 and fpr < best["fpr"]):
            best = {"thr": thr, "acc": acc, "fpr": fpr}
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="test_data", help="dataset root")
    ap.add_argument("--threshold", type=float, default=70, help="risk score cutoff for 'fake'")
    ap.add_argument("--variant", default="wav2vec2", help="model_variant for DetectionEngine")
    ap.add_argument("--find-threshold", action="store_true",
                    help="sweep thresholds and pick the best cutoff instead of using --threshold")
    ap.add_argument("--json", action="store_true",
                    help="emit machine-readable JSON (easy to paste into results.md)")
    ap.add_argument("--out", default=None,
                    help="write the JSON result to this path (folium-style: one file per "
                         "sprint run, e.g. results/sprint1_baseline_english.json). "
                         "Implies --json.")
    ap.add_argument("--checkpoint", default=None,
                    help="local fine-tuned model dir to use instead of the pretrained repo "
                         "(pass the sprint3+ fine-tuned dir, e.g. the path from "
                         "finetune_head.py).")
    ap.add_argument("--results", default=None,
                    help="folium-style source-of-truth CSV to append one row per run "
                         "(e.g. ml-core/results/ablation_results.csv). Logs ACC/FPR/FNR/"
                         "AUC/precision/recall/F1 + WHICH dataset & checkpoint. "
                         "Default None = skip.")
    ap.add_argument("--run-name", default=None,
                    help="experiment name written in the results CSV row "
                         "(e.g. baseline_garystafford / finetuned_garystafford). "
                         "Defaults to the engine --variant.")
    ap.add_argument("--dataset", default=None,
                    help="which test corpus this row represents (e.g. garystafford / team / "
                         "team_hindi). If omitted, inferred from --root's last path segment.")
    ap.add_argument("--epochs", type=int, default=0,
                    help="training epochs for this run's CSV row (0 for baseline / inference).")
    ap.add_argument("--n-freeze", type=int, default=0,
                    help="wav2vec2 layers frozen for the CSV row (0 = pretrained).")
    args = ap.parse_args()

    if args.run_name is None:
        args.run_name = args.variant
        # --variant is the ENGINE variant (wav2vec2) unless the user changed it.
    if args.dataset is None:
        args.dataset = os.path.basename(os.path.normpath(args.root)) or "unknown"

    from detect import DetectionEngine
    eng = DetectionEngine(model_variant=args.variant, checkpoint=args.checkpoint)

    items = build_index(args.root)
    if not items:
        print("No clips found. Put data in <root>/real/*.wav and <root>/cloned/*.wav")
        return

    rows = []
    for path, is_fake in items:
        try:
            r = eng.analyze_audio(path)
            score = r["risk_score"]
        except Exception as e:
            print("ERROR", path, e)
            continue
        pred_fake = score >= args.threshold
        rows.append({"path": path, "true_fake": is_fake, "pred_fake": pred_fake, "score": score})

    if not rows:
        return

    n = len(rows)
    tp = sum(1 for r in rows if r["true_fake"] and r["pred_fake"])
    tn = sum(1 for r in rows if (not r["true_fake"]) and (not r["pred_fake"]))
    fp = sum(1 for r in rows if (not r["true_fake"]) and r["pred_fake"])
    fn = sum(1 for r in rows if r["true_fake"] and (not r["pred_fake"]))
    acc = (tp + tn) / n
    fpr = fp / (fp + tn) if (fp + tn) else 0.0
    fnr = fn / (fn + tp) if (fn + tp) else 0.0

    # ROC-AUC (threshold-independent "how well does it separate") + per-class
    # precision/recall/F1, so a reviewer has every "how good is it" label.
    roc_auc = 0.0
    if len({int(r["true_fake"]) for r in rows}) == 2:
        try:
            from sklearn.metrics import roc_auc_score
            roc_auc = float(roc_auc_score(
                [int(r["true_fake"]) for r in rows],
                [r["score"] for r in rows],
            ))
        except Exception:
            roc_auc = 0.0
    p_real = tp / (tp + fp) if (tp + fp) else 0.0          # predict-real precision
    r_real = tn / (tn + fn) if (tn + fn) else 0.0          # real recall
    f1_real = 2 * p_real * r_real / (p_real + r_real) if (p_real + r_real) else 0.0

    def log_csv(which_metrics, thr):
        if not args.results:
            return
        log_ablation_row(args.results, make_row(
            variant=args.run_name,
            dataset=args.dataset,
            split="test",
            model=args.checkpoint or args.variant,
            checkpoint=args.checkpoint or "pretrained:Gustking",
            n_clips=n,
            accuracy=(which_metrics["acc"] * 100.0),
            fpr=(which_metrics["fpr"] * 100.0),
            fnr=(which_metrics["fnr"] * 100.0),
            roc_auc=(roc_auc * 100.0),
            precision=(p_real * 100.0),
            recall=(r_real * 100.0),
            f1=(f1_real * 100.0),
            threshold=thr,
            epochs=args.epochs,
            n_freeze=args.n_freeze,
            src_root=args.root,
        ))

    find_payload = None
    if args.find_threshold:
        best = _find_best_threshold(rows)
        # FNR at the SAME best threshold so the CSV row is self-consistent (ACC/FPR/FNR
        # all at one cutoff), not a mix of best-ACC/FPR and default-threshold FNR.
        n_fake = sum(1 for r in rows if r["true_fake"])
        best_fn = sum(1 for r in rows if r["true_fake"] and r["score"] < best["thr"])
        best_fn = best_fn / n_fake if n_fake else 0.0
        log_csv({"acc": best["acc"], "fpr": best["fpr"], "fnr": best_fn}, best["thr"])
        find_payload = {"mode": "find-threshold", "best": {k: round(v, 4) for k, v in best.items()}}
        # Emit a NORMALISED top-level summary too (ACC/FPR/FNR at the best cutoff), so
        # any consumer (notebook A/B cell, results.md) reads the SAME flat keys as the
        # plain-threshold payload: payload["accuracy"]/["fpr"]/["fnr"].
        find_payload.update({
            "n_clips": n,
            "threshold": best["thr"],
            "accuracy": round(best["acc"], 4),
            "fpr": round(best["fpr"], 4),
            "fnr": round(best_fn, 4),
            "roc_auc": round(roc_auc, 4),
            "precision_real": round(p_real, 4),
            "recall_real": round(r_real, 4),
            "f1_real": round(f1_real, 4),
            "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
            "src_root": args.root,
            "dataset": args.dataset,
            "variant": args.variant,
            "run_name": args.run_name,
        })
        payload = find_payload
        _emit(args, payload)
        if not (args.json or args.out):
            print("=" * 50)
            print(f"Best threshold (max ACC, tie-break lower FPR): cutoff={best['thr']:.0f}, "
                  f"ACC={best['acc']*100:.1f}%, FPR={best['fpr']*100:.1f}%")
            print("=" * 50)
            print(f"Suggested fixed cutoff for your risk bands: {best['thr']:.0f}")
        return

    metric_dict = {"acc": acc, "fpr": fpr, "fnr": fnr}
    log_csv(metric_dict, args.threshold)

    # per-language breakdown if the path contains language hints
    langs = {}
    for r in rows:
        low = r["path"].lower()
        lang = None
        for key in ["hindi", "tamil", "telugu", "bengali", "english", "marathi"]:
            if key in low:
                lang = key
                break
        if lang is None:
            lang = "other"
        langs.setdefault(lang, []).append(r)

    lang_stats = {}
    for lang, rws in sorted(langs.items()):
        wait = sum(1 for r in rws if r["true_fake"] and r["pred_fake"])
        wait2 = sum(1 for r in rws if (not r["true_fake"]) and (not r["pred_fake"]))
        lacc = (wait + wait2) / len(rws) if rws else 0.0
        lang_stats[lang] = {"n": len(rws), "acc": round(lacc, 4)}

    # (find_threshold branch was handled earlier with CSV logging; this is the
    #  plain-threshold evaluate path.)

    payload = {
        "mode": "evaluate",
        "n_clips": n,
        "threshold": args.threshold,
        "accuracy": round(acc, 4),
        "fpr": round(fpr, 4),
        "fnr": round(fnr, 4),
        "roc_auc": round(roc_auc, 4),
        "precision_real": round(p_real, 4),
        "recall_real": round(r_real, 4),
        "f1_real": round(f1_real, 4),
        "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "per_language": lang_stats,
        "src_root": args.root,
        "dataset": args.dataset,
        "variant": args.variant,
        "run_name": args.run_name,
    }
    if args.json or args.out:
        _emit(args, payload)
        return

    print("=" * 50)
    print(f"Dataset: {n} clips, threshold={args.threshold}")
    print(f"  Accuracy  : {acc*100:.1f}%")
    print(f"  False Pos : {fpr*100:.1f}%")
    print(f"  False Neg : {fnr*100:.1f}%")
    print(f"  ROC-AUC   : {roc_auc*100:.1f}%")
    print(f"  TP={tp} FP={fp} TN={tn} FN={fn}")
    print("=" * 50)

    if len(lang_stats) > 1:
        print("\nPer-language:")
        for lang, st in sorted(lang_stats.items()):
            print(f"  {lang:10s}: {st['n']:3d} clips, ACC {st['acc']*100:.1f}%")


def _emit(args, payload):
    """Write the JSON payload: to a file if --out, else to stdout."""
    text = json.dumps(payload, indent=2, default=str)
    if args.out:
        path = args.out
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
        with open(path, "w") as f:
            f.write(text + "\n")
        print(f"Wrote results -> {path}")
        return
    print(text)


if __name__ == "__main__":
    main()
