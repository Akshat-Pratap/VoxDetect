"""
upload_dataset.py — Ship the audio dataset to Google Drive as a verified archive.

Mirrors folium's download_datasets.py upload half, MINUS the download (our clips are
user-provided, not pulled from the internet):

    - zips the local ml-core/test_data/ (real/ + cloned/, English + Hindi) into
      ONE archive:  test_data.zip
    - writes a sha256-verified manifest:  test_data.manifest.json
    - copies both to the Drive mount (default /content/drive/MyDrive/VoxDetect/ml-core/dataset)

Why an archive (learned from folium): individual files on Drive hit Google's
per-day file-operation quota and the FUSE cache can hide partial writes. One
sha256-verified archive is durable and cheap (2 file ops). Each session unzips it
locally, so we never touch Drive per request.

Usage (local machine):
    python3 scripts/upload_dataset.py --root ml-core/test_data
        --upload-dir /content/drive/MyDrive/VoxDetect/ml-core/dataset

    # optional, on Colab, after Drive is mounted:
    python3 scripts/upload_dataset.py --root local_test_data --upload-dir <Drive dir>
"""
import argparse
import hashlib
import json
import os
import pathlib
import shutil
import zipfile

ARCHIVE = "test_data.zip"


def _sha256_bytes(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _build_manifest(root, zip_path):
    counts = {"real": {}, "cloned": {}}
    total = 0
    for label in ("real", "cloned"):
        for p in pathlib.Path(root).glob(f"{label}/**/*.wav"):
            rel = p.relative_to(root).as_posix()   # e.g. real/english/speaker1/a.wav
            lang = rel.split("/")[1] if "/" in rel else "other"
            counts[label].setdefault(lang, 0)
            counts[label][lang] += 1
            total += 1
    return {
        "dataset": "voice-cloning-testdata",
        "archive": ARCHIVE,
        "total_clips": total,
        "counts": counts,
        "zip_sha256": _sha256_bytes(zip_path),
        "zip_bytes": os.path.getsize(zip_path),
        "created_at": __import__("datetime").datetime.now().isoformat(),
    }


def _upload_zip(root, upload_dir, name=ARCHIVE):
    root = pathlib.Path(root)
    zip_path = root / f".{name}"   # build a temp archive inside root to avoid self-including
    zip_path = root.parent / name

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(root.rglob("*")):
            if p.is_file() and p.name in ("README.md",):
                continue
            if p.is_file():
                zf.write(p, p.relative_to(root).as_posix())

    manifest = _build_manifest(root, zip_path)

    dest_dir = pathlib.Path(upload_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(zip_path, dest_dir / name)
    with open(dest_dir / f"{name}.manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    os.remove(zip_path)

    print(f"Uploaded {dest_dir / name}")
    print(f"Manifest -> {dest_dir / name}.manifest.json")
    print(f"total_clips={manifest['total_clips']}")
    return manifest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default="ml-core/test_data",
                    help="local test_data/ folder to archive (real/ + cloned/)")
    ap.add_argument(
        "--upload-dir", default=None,
        help="Drive folder to persist the archive, e.g. "
             "/content/drive/MyDrive/VoxDetect/ml-core/dataset (requires a mounted "
             "Drive; leave unset to just package locally and upload by hand)")
    ap.add_argument(
        "--package-dir", default=".",
        help="local folder to write test_data.zip + test_data.zip.manifest.json when "
             "--upload-dir is not set (so you can drag both files into Drive yourself)")
    args = ap.parse_args()

    if not pathlib.Path(args.root, "real").exists():
        raise SystemExit(f"No {args.root}/real found. Put real + cloned clips there first.")

    if args.upload_dir:
        _upload_zip(args.root, args.upload_dir)
        return

    # Local package-only: build the zip + manifest into --package-dir, but leave the
    # temp archive OUTSIDE root (matching _upload_zip) and DON'T clean it up so the
    # user can grab both files to upload manually.
    root = pathlib.Path(args.root)
    dest_dir = pathlib.Path(args.package_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    zip_path = root.parent / "test_data.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(root.rglob("*")):
            if p.is_file() and p.name == "README.md":
                continue
            if p.is_file():
                zf.write(p, p.relative_to(root).as_posix())
    manifest = _build_manifest(root, zip_path)
    shutil.copy2(zip_path, dest_dir / "test_data.zip")
    with open(dest_dir / "test_data.zip.manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    os.remove(zip_path)
    print(f"Packaged -> {dest_dir / 'test_data.zip'}")
    print(f"Manifest -> {dest_dir / 'test_data.zip.manifest.json'}")
    print(f"total_clips={manifest['total_clips']}  counts={json.dumps(manifest['counts'])}")
    print("Upload BOTH files to: <Drive>/VoxDetect/ml-core/dataset/")


if __name__ == "__main__":
    main()
