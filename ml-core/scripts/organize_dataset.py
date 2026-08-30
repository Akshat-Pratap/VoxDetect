"""
organize_dataset.py — Hydrate a session-local test_data from the Drive archive.

Mirrors folium's organize_datasets.py, MINUS the train/val/test split building
(our data is already labeled by folder: real/ vs cloned/). Each Colab session:

    !python scripts/organize_dataset.py \
        --raw-dir /content/drive/MyDrive/VoxDetect/ml-core/dataset \
        --data-dir /content/VoxDetect_data

verifies the sha256 on Drive, unzips test_data.zip into /content/VoxDetect_data,
then run evaluate.py against it. Never touches Drive per clip — one unzip per session.
"""
import argparse
import hashlib
import json
import pathlib
import shutil
import zipfile

ARCHIVE = "test_data.zip"
EXPECTED_TOP = ("real", "cloned")


def _sha256_bytes(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def hydrate(raw_dir, data_dir, force=False):
    raw_dir = pathlib.Path(raw_dir)
    data_dir = pathlib.Path(data_dir)
    zip_path = raw_dir / ARCHIVE
    manifest_path = raw_dir / f"{ARCHIVE}.manifest.json"

    if not zip_path.exists():
        raise SystemExit(f"{zip_path} not found on Drive. Run upload_dataset.py first.")

    if manifest_path.exists():
        m = json.loads(manifest_path.read_text())
        if _sha256_bytes(zip_path) != m.get("zip_sha256"):
            print("WARNING: sha256 mismatch vs manifest; data may have changed.")
        print(f"manifest total_clips={m.get('total_clips')} "
              f"counts={json.dumps(m.get('counts', {}))}")

    dest = data_dir
    if dest.exists() and not force:
        print(f"{dest} already exists (force=False). Delete it or pass --force to "
              f"re-hydrate from the Drive archive.")
        return dest
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(dest)

    missing = [t for t in EXPECTED_TOP if not (dest / t).exists()]
    if missing:
        print(f"WARNING: archive missing top-level dirs: {missing}")

    n = sum(1 for _ in dest.rglob("*.wav"))
    print(f"hydrated {n} clips -> {dest}")
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw-dir", required=True,
                    help="Drive dataset dir holding test_data.zip + manifest")
    ap.add_argument("--data-dir", default="/content/VoxDetect_data",
                    help="session-local folder to unzip into")
    ap.add_argument("--force", action="store_true",
                    help="wipe and re-hydrate even if data-dir exists")
    args = ap.parse_args()

    hydrate(args.raw_dir, args.data_dir, force=args.force)


if __name__ == "__main__":
    main()
