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
import numpy as np


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
    args = ap.parse_args()

    from detect import DetectionEngine
    eng = DetectionEngine(model_variant=args.variant)

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

    if args.find_threshold:
        best = _find_best_threshold(rows)
        payload = {"mode": "find-threshold", "best": {k: round(v, 4) for k, v in best.items()}}
        _emit(args, payload)
        if not (args.json or args.out):
            print("=" * 50)
            print(f"Best threshold (max ACC, tie-break lower FPR): cutoff={best['thr']:.0f}, "
                  f"ACC={best['acc']*100:.1f}%, FPR={best['fpr']*100:.1f}%")
            print("=" * 50)
            print(f"Suggested fixed cutoff for your risk bands: {best['thr']:.0f}")
        return

    payload = {
        "mode": "evaluate",
        "n_clips": n,
        "threshold": args.threshold,
        "accuracy": round(acc, 4),
        "fpr": round(fpr, 4),
        "fnr": round(fnr, 4),
        "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "per_language": lang_stats,
        "src_root": args.root,
    }
    if args.json or args.out:
        _emit(args, payload)
        return

    print("=" * 50)
    print(f"Dataset: {n} clips, threshold={args.threshold}")
    print(f"  Accuracy  : {acc*100:.1f}%")
    print(f"  False Pos : {fpr*100:.1f}%")
    print(f"  False Neg : {fnr*100:.1f}%")
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
