# ml-core/test_data/

Audio clips go here for the P1 accuracy harness. **Clips are NOT committed to git**
(they live on Google Drive / Colab). This folder documents the expected layout.

## Expected structure (what `evaluate.py` scans)

```
test_data/
  real/
    english/  <speaker>/*.wav
    hindi/    <speaker>/*.wav
    <other-language>/...
  cloned/
    english/  <speaker>/*.wav     (TTS/cloned versions of the same speakers)
    hindi/    <speaker>/*.wav
```

Language is detected from the folder name (`hindi`, `english`, `tamil`, ...).
So `real/hindi/speaker1/x.wav` counts as a Hindi real clip.

## How to use

1. P4 records real clips + generates cloned versions.
2. Drop them into this structure (on Drive or Colab).
3. Run the harness:
   ```bash
   python3 src/evaluate.py --root test_data --threshold 70
   python3 src/evaluate.py --root test_data --find-threshold
   ```
4. Copy the output (with `--json` for a clean paste) into `results.md`.
