"""
prepare_garystafford.py — Download & dump the garystafford backup dataset (Track A).

Why this exists:
  - Our own clips are user-provided (uploaded via upload_dataset.py). But before those
    arrive, and to GUARANTEE a trained model + numbers by Tuesday, we use an OPEN-LICENSE
    fallback: https://huggingface.co/datasets/garystafford/deepfake-audio-detection
    (CC-BY-4.0, 1,866 balanced FLAC: 933 real / 933 fake, English).
  - garystafford is a HuggingFace **datasets object** (audio+label), NOT a folder tree.
    This script converts a sampled subset into the folder layout that evaluate.py and
    finetune_head.py already understand:
        <out>/real/<source>/*.wav     (speaker dir = yt source id)
        <out>/fake/<source>/*.wav     (speaker dir = TTS prefix: po_, el_, hg_, hu_, lv_, sp_)
  - Uses streaming=True so only the sampled clips (not all 1.16 GB) are downloaded.

Honest caveat (kept for the slides/results): garystafford is a RANDOM clip-level set;
the Gustking base was already trained on similar TTS engines, so ACC/AUC here will look
high but are "fine-tuning adapts to this corpus", NOT a generalization claim. The team
LOSO run (Track B) is the real generalization story.

Colab usage:
    python3 scripts/prepare_garystafford.py --out garystafford_data --n 900
        -> garystafford_data/real/<yt#>/*.wav
        -> garystafford_data/fake/<po_|el_|...>/*.wav
"""
import argparse
import os

import numpy as np


FALLBACK_DATA = "garystafford/deepfake-audio-detection"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="garystafford_data",
                    help="output dir with real/ + fake/ (speaker subfolders)")
    ap.add_argument("--n", type=int, default=900,
                    help="total clips sampled (balanced ~50/50 real/fake). "
                         "Max 1,866 (dataset size).")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--repo", default=FALLBACK_DATA)
    args = ap.parse_args()

    n_half = args.n // 2
    if args.n > 1866:
        raise SystemExit(f"--n {args.n} exceeds dataset size (1,866). Lower it.")

    try:
        from datasets import load_dataset
    except ImportError:
        raise SystemExit("pip install datasets soundfile  (Colab: already present)")

    print(f"Loading {args.repo} ...")
    # Split once, take balanced sample from each class.
    ds = load_dataset(args.repo, split="train")
    print("[data] full set rows:", len(ds))

    idx = np.arange(len(ds))
    rng = np.random.default_rng(args.seed)
    rng.shuffle(idx)

    labels = ds["label"]
    real_idx = [int(i) for i in idx if labels[int(i)] == 0]
    fake_idx = [int(i) for i in idx if labels[int(i)] == 1]

    real_pick = real_idx[:n_half]
    fake_pick = fake_idx[:n_half]
    print(f"[sample] real={len(real_pick)} fake={len(fake_pick)} (balanced, n={args.n})")

    os.makedirs(os.path.join(args.out, "real"), exist_ok=True)
    os.makedirs(os.path.join(args.out, "fake"), exist_ok=True)

    import soundfile as sf

    def src_dir(rel_path):
        """Root folder name for provenance: yt_* or the TTS prefix (el_, po_, ...)."""
        base = os.path.basename(rel_path)
        prefix = base.split("_")[0] if base else "src"
        return prefix

    def write(item, label):
        audio = item["audio"]
        wav = audio["array"]
        sr = audio["sampling_rate"]
        # For audiofolder datasets the provenance lives on audio['path'] (e.g.
        # fake/el_xxx.flac). Fall back to a stable id if absent.
        rel = audio.get("path") or item.get("file_name") or item.get("name") \
            or f"clip_{label}"
        sub = src_dir(os.path.basename(str(rel)))
        folder = "real" if label == 0 else "fake"
        outdir = os.path.join(args.out, folder, sub)
        os.makedirs(outdir, exist_ok=True)
        base = os.path.splitext(os.path.basename(str(rel)))[0] or "clip"
        out = os.path.join(outdir, f"{base}.wav")
        n = 1
        while os.path.exists(out):
            out = os.path.join(outdir, f"{base}_{n}.wav")
            n += 1
        sf.write(out, wav, sr)
        return out

    n_real_w = n_fake_w = 0
    for i in real_pick:
        write(ds[i], 0); n_real_w += 1
    for i in fake_pick:
        write(ds[i], 1); n_fake_w += 1
    print(f"[done] wrote {n_real_w} real + {n_fake_w} fake clips -> {args.out}")
    print("Tree (for evaluate.py --root / finetune_head.py --data-dir):")
    print(f"  {args.out}/real/<yt_source>/*.wav   (real)")
    print(f"  {args.out}/fake/<tts_prefix>/*.wav  (fake/cloned)")


if __name__ == "__main__":
    main()
