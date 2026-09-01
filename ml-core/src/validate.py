"""validate.py — P1 ML Core: Claude's #1 caveat check, done for you.

Runs the FIRST-RUN validation automatically:
  1. Loads the model and prints id2label (class index -> which is 'fake')
  2. Runs a real clip  -> expects LOW risk
  3. Runs a cloned clip -> expects HIGH risk
  4. If the model's fake index appears wrong / scores look inverted, it tells you
     exactly what to flip.

Colab usage (single cell):
    import validate
    validate.run()                      # interactive: pick real + cloned files
    validate.run(real="a.wav", cloned="b.wav", threshold=70)
"""
import os


def _print_label_mapping(eng):
    labels = getattr(eng, "id2label", {}) or {}
    print("\n=== Model class mapping (id2label) ===")
    print("  fake index resolved =", eng._fake_idx)
    for idx, name in labels.items():
        print(f"  {idx}: {name}")
    print("=" * 45)


def _check_clip(eng, path, expected, threshold=7.5):
    if not os.path.exists(path):
        print(f"  [SKIP] no file at {path}")
        return None
    r = eng.analyze_audio(path)
    pred = "fake" if r["risk_score"] >= threshold else "real"
    match = "CORRECT" if (pred == expected) else "WRONG"
    print(f"  {path}")
    print(f"    expected={expected:5s}  got={pred:5s}  [{match}]  "
          f"risk={r['risk_score']:.1f} band={r['band']}  "
          f"model_prob={r['models']['synthetic_prob']:.3f}")
    return match == "CORRECT"


def run(real=None, cloned=None, threshold=7.5):
    from detect import DetectionEngine
    eng = DetectionEngine(model_variant="wav2vec2")
    _print_label_mapping(eng)

    if real is None and cloned is None:
        print("\nNo files passed. Either pass paths to run() or"
              "\n  upload files via the Files panel and call:"
              "\n  validate.run(real='real.wav', cloned='fake.wav')")
        print("\nYou can generate a quick test pair now (download 2 public clips "
              "or use files.upload). See README for sample sources.")
        return

    print("\n=== Checking risk scores (threshold=%d) ===" % threshold)
    results = []
    if real:
        results.append(("real", _check_clip(eng, real, "real", threshold)))
    if cloned:
        results.append(("cloned", _check_clip(eng, cloned, "fake", threshold)))

    ok = all(r[1] for r in results if r[1] is not None)
    if ok:
        print("\n[PASS] Detection looks sane. Proceed to dataset + evaluate.py.")
    else:
        print("\n[CHECK] Scores don't look right. In detect.py, `_find_fake_index`"
              " picks the 'fake' class. If real scored HIGH / cloned scored LOW,"
              " the class index is swapped -> flip the priority so the real "
              "'fake' label is chosen, or hard-set `self._fake_idx`.")


if __name__ == "__main__":
    import sys
    r = sys.argv[1] if len(sys.argv) > 1 else None
    c = sys.argv[2] if len(sys.argv) > 2 else None
    run(real=r, cloned=c)
