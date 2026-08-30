# ml-core/test_data/

This is the **local upload source** for the P1 accuracy dataset. Clips here are archived to
Google Drive as a sha256-verified `test_data.zip` (see `scripts/README.md`). They are **NOT
committed to git** and Colab reads them from Drive, not from this folder.

## Expected structure

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

Language is detected from the folder name (`hindi`, `english`, `tamil`, ...),
so `real/hindi/speaker1/x.wav` counts as a Hindi real clip.

## How to use

1. P4 records real clips + generates cloned versions.
2. Drop them into this structure (on your local machine).
3. Upload once to Drive as an archive:
   ```bash
   python3 scripts/upload_dataset.py \
       --root ml-core/test_data \
       --upload-dir /content/drive/MyDrive/VoxDetect/ml-core/dataset
   ```
4. Every Colab session hydrates a local copy from that archive (notebook cell 1) and runs:
   ```bash
   python3 -m evaluate --root /content/VoxDetect_data \
       --out /content/drive/MyDrive/VoxDetect/ml-core/results/sprintX.json \
       --find-threshold
   ```
5. Paste the JSON numbers into `results.md`.
