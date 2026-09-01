#!/usr/bin/env python3
"""Sweep all real+cloned test clips through the running backend and report the verdict.

Run with the backend up:
    cd backend && ./.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
Then, from the repo root:
    python ml-core/scripts/sweep.py

Outputs ml-core/results/base_model_60clip_sweep.csv (per clip) and prints the summary.
"""
import glob, json, subprocess, csv, sys, os

BASE = os.environ.get("VX_BASE", "http://127.0.0.1:8000")
ORG = os.environ.get("VX_ORG", "bank")
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(REPO, "ml-core", "test_data")
OUT = os.path.join(REPO, "ml-core", "results", "base_model_60clip_sweep.csv")


def analyze(path: str) -> dict:
    r = subprocess.run(
        ["curl", "-s", "--max-time", "90", "-X", "POST", f"{BASE}/v1/analyze-call",
         "-F", f"file=@{path}", "-F", f"org={ORG}"],
        capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except Exception as e:
        return {"error": str(e), "raw": r.stdout[:300], "path": path}


rows = []
for label, is_fake in (("real", False), ("cloned", True)):
    for path in sorted(glob.glob(f"{DATA}/{label}/**/*.wav", recursive=True)):
        d = analyze(path)
        if "error" in d:
            rows.append({"path": path, "true_fake": is_fake, "score": None,
                         "synthetic_prob": None, "band": None, "error": d["error"]})
            print(f"ERR {label} {path}: {d['error']}")
            continue
        rows.append({
            "path": path,
            "true_fake": is_fake,
            "score": d.get("risk_score"),
            "synthetic_prob": d.get("models", {}).get("synthetic_prob"),
            "band": d.get("band"),
            "flagged": d.get("flagged"),
            "latency": d.get("processing_latency_ms"),
        })
        print(f"{'CLONE' if is_fake else 'REAL '} "
              f"{path.split('test_data/')[-1]:60s} risk={d.get('risk_score')} "
              f"band={d.get('band')} flagged={d.get('flagged')}")

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["path", "true_fake", "risk_score", "synthetic_prob", "band", "flagged", "latency_ms", "error"])
    for r in rows:
        w.writerow([r.get("path"), r["true_fake"], r.get("score"),
                    r.get("synthetic_prob"), r.get("band"), r.get("flagged"),
                    r.get("latency"), r.get("error")])

scored = [r for r in rows if r.get("score") is not None]
reals = [r for r in scored if not r["true_fake"]]
clones = [r for r in scored if r["true_fake"]]

print("\n=================== BASE MODEL 60-CLIP SWEEP ===================")
print(f"scored: {len(scored)}/60")
if reals:
    rs = [r["score"] for r in reals]
    print(f"REAL risk   : min={min(rs):.2f} max={max(rs):.2f} n={len(rs)}")
if clones:
    cs = [r["score"] for r in clones]
    print(f"CLONE risk  : min={min(cs):.2f} max={max(cs):.2f} n={len(cs)}")

# Verdict = risk_score cutoff 7.5 (Option A) -> synthetic_prob 0.075
CUTOFF = 7.5
tp = sum(1 for r in clones if r["score"] >= CUTOFF)
tn = sum(1 for r in reals if r["score"] < CUTOFF)
n = len(scored)
acc = (tp + tn) / n
fpr = (len(reals) - tn) / len(reals) if reals else 0
fnr = (len(clones) - tp) / len(clones) if clones else 0
print(f"\nVerdict cutoff risk=7.5 (synthetic_prob=0.075):")
print(f"  ACC={acc*100:.1f}%  FPR(falsely flagged real)={fpr*100:.1f}%  "
      f"FNR(missed clones)={fnr*100:.1f}%")
print(f"  real correctly LOW     : {tn}/30")
print(f"  clone correctly HIGH   : {tp}/30")
print(f"\nCSV written -> {OUT}")
