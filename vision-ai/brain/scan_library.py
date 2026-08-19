"""Find instrument photos inside a big photo backup (Nextcloud, iPhone dumps).

Walks a folder tree, works out which instrument each photo shows, and reports
what it found. Optionally files the matches into the per-model asset library
and generates a post + reel for each instrument it is confident about.

    # 1. look only (no changes)
    python3 -m brain.scan_library --from /path/to/nextcloud/data/<user>/files

    # 2. read the model text printed on the instrument as well (needs tesseract)
    python3 -m brain.scan_library --from ... --ocr

    # 3. file the matches into creative-pack/images/<manufacturer>/<model>/
    python3 -m brain.scan_library --from ... --import

    # 4. generate one post + reel per instrument found
    python3 -m brain.scan_library --from ... --generate

Detection is text-first: folder names and filenames are the strongest signal
and cost nothing. OCR is optional and only runs on files that text matching
could not place, so a 20,000-photo backup stays workable on CPU.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
import time
from collections import defaultdict
from pathlib import Path

_HERE = Path(__file__).resolve().parent
for _candidate in (_HERE, _HERE.parent / "engine"):
    if (_candidate / "vision_ai").is_dir() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

from vision_ai.config import load_config  # noqa: E402
from vision_ai.library import Library  # noqa: E402
from vision_ai.skills.imaging import IMAGE_SUFFIXES, model_dir  # noqa: E402
from vision_ai.skills.instrument import Instrument, identify  # noqa: E402

try:  # `python3 -m brain.x` from the parent dir
    from . import config_env
except ImportError:  # `python3 /path/to/brain/x.py`
    sys.path.insert(0, str(_HERE.parent))
    from brain import config_env  # noqa: E402

HEIC = {".heic", ".heif"}
SKIP_DIRS = {"files_trashbin", "files_versions", "cache", "thumbnails", "preview", "previews",
             ".git", "node_modules", "files_external", "venv", "site-packages", "comfyui",
             "models", "custom_nodes", "dist", "build", "__pycache__"}
SKIP_PREFIXES = ("appdata_", "__groupfolders", ".")


def nextcloud_data_dir(container: str = "nextcloud") -> Path | None:
    """Host path of the Nextcloud data directory, read from the container's mounts.

    `occ config:system:get datadirectory` returns the path *inside* the
    container (/var/www/html/data), which does not exist on the host - this
    translates it.
    """
    try:
        raw = subprocess.run(["docker", "inspect", "-f", "{{json .Mounts}}", container],
                             capture_output=True, text=True, timeout=20, check=False)
        mounts = json.loads(raw.stdout or "[]")
    except Exception:
        return None
    for wanted in ("/var/www/html/data", "/var/www/html"):
        for mount in mounts:
            if mount.get("Destination") == wanted:
                source = Path(mount["Source"])
                found = source if wanted.endswith("data") else source / "data"
                if found.is_dir():
                    return found

    # Not bind-mounted: the data lives in the container's own filesystem, which
    # the host can still read through the overlay merged directory (root only).
    try:
        merged = subprocess.run(
            ["docker", "inspect", "-f", "{{.GraphDriver.Data.MergedDir}}", container],
            capture_output=True, text=True, timeout=20, check=False).stdout.strip()
    except Exception:
        merged = ""
    if merged:
        candidate = Path(merged) / "var/www/html/data"
        if candidate.is_dir():
            return candidate
    return None



CAMERA_NAME = re.compile(r"^(img|dsc|dscn|photo|image|screenshot|pxl|vid|mvimg)[-_ ]?\\d*$", re.I)
UUID_ISH = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}", re.I)


def _is_camera_name(stem: str) -> bool:
    """IMG_75944CC1-31EF-4BE7-8060-... is a camera filename, not a model number."""
    return bool(UUID_ISH.search(stem) or CAMERA_NAME.match(stem.split("-")[0].strip()))


def _names_a_manufacturer(text: str, library) -> bool:
    lowered = re.sub(r"[^a-z0-9]+", " ", text.lower())
    for man in library.get("instruments")["manufacturers"]:
        if any(re.search(rf"(?<![a-z]){re.escape(alias)}(?![a-z])", lowered) for alias in man["aliases"]):
            return True
    return False


def ocr_available() -> bool:
    return shutil.which("tesseract") is not None


def ocr_text(path: Path, timeout: int = 20) -> str:
    """Read whatever text is printed on the instrument (brand, model badge)."""
    try:
        from PIL import Image
    except ImportError:
        return ""
    work = Path("/tmp") / f"vision-ocr-{path.stat().st_size}.png"
    try:
        with Image.open(path) as image:
            image = image.convert("L")
            image.thumbnail((1400, 1400))
            image.save(work)
        result = subprocess.run(["tesseract", str(work), "stdout", "--psm", "6"],
                                capture_output=True, text=True, timeout=timeout, check=False)
        return result.stdout
    except Exception:
        return ""
    finally:
        work.unlink(missing_ok=True)


def candidates(root: Path) -> list[Path]:
    files = []
    for path in root.rglob("*"):
        if path.is_dir():
            continue
        parts = [part.lower() for part in path.parts]
        if any(part in SKIP_DIRS or part.startswith(SKIP_PREFIXES) for part in parts):
            continue
        suffix = path.suffix.lower()
        if suffix in IMAGE_SUFFIXES or suffix in HEIC:
            files.append(path)
    return sorted(files)


def detect(path: Path, library: Library, use_ocr: bool) -> tuple[Instrument | None, str]:
    """Folder name, then filename, then (optionally) the text in the photo."""
    for text, source in ((path.parent.name, "folder"), (path.stem, "filename")):
        # A camera filename full of hex can contain "8060" by accident - only
        # trust it when the name also carries a manufacturer.
        if source == "filename" and _is_camera_name(text) and not _names_a_manufacturer(text, library):
            continue
        instrument = identify(text, library)
        if instrument.identified:
            return instrument, source
    if use_ocr and path.suffix.lower() in IMAGE_SUFFIXES:
        text = ocr_text(path)
        if text.strip():
            instrument = identify(text, library)
            if instrument.identified:
                return instrument, "ocr"
    return None, "none"


def scan(root: Path, library: Library, use_ocr: bool, limit: int, ocr_limit: int) -> dict:
    files = candidates(root)
    if limit:
        files = files[:limit]
    found: dict[str, dict] = defaultdict(lambda: {"photos": [], "manufacturer": "", "model": "",
                                                  "technique": "", "query": "", "sources": []})
    unknown: list[str] = []
    heic: list[str] = []
    started, ocr_used = time.perf_counter(), 0

    for index, path in enumerate(files, 1):
        if path.suffix.lower() in HEIC:
            heic.append(str(path))
        allow_ocr = use_ocr and (not ocr_limit or ocr_used < ocr_limit)
        instrument, source = detect(path, library, allow_ocr)
        if source == "ocr":
            ocr_used += 1
        if instrument is None:
            unknown.append(str(path))
        else:
            key = f"{instrument.manufacturer}|{instrument.model}"
            entry = found[key]
            entry.update(manufacturer=instrument.manufacturer, model=instrument.model,
                         technique=instrument.technique, query=instrument.image_search_query())
            entry["photos"].append(str(path))
            entry["sources"].append(source)
        if index % 500 == 0:
            print(f"  ...{index}/{len(files)} scanned ({time.perf_counter() - started:.0f}s)")

    found = _merge_variants(found)
    return {"root": str(root), "scanned": len(files), "seconds": round(time.perf_counter() - started, 1),
            "ocr_used": ocr_used, "instruments": dict(found), "unknown": unknown, "heic": heic}


def _merge_variants(found: dict) -> dict:
    """'Agilent 1260' and 'Agilent 1260 Infinity II' are one instrument, and one
    asset folder - fold the shorter name into the longer one."""
    keys = sorted(found, key=lambda k: len(found[k]["model"]), reverse=True)
    merged: dict = {}
    for key in keys:
        entry = found[key]
        target = None
        for existing in merged.values():
            if (existing["manufacturer"] == entry["manufacturer"] and entry["model"]
                    and existing["model"].lower().startswith(entry["model"].lower())):
                target = existing
                break
        if target is None:
            merged[key] = entry
        else:
            target["photos"].extend(entry["photos"])
            target["sources"].extend(entry["sources"])
    return merged


def report(result: dict) -> None:
    print(f"\nscanned {result['scanned']} photos in {result['seconds']}s"
          + (f" (OCR on {result['ocr_used']})" if result["ocr_used"] else ""))
    print(f"instruments found: {len(result['instruments'])}\n")
    for key, entry in sorted(result["instruments"].items(), key=lambda kv: -len(kv[1]["photos"])):
        by_source = ", ".join(f"{s}:{entry['sources'].count(s)}" for s in ("folder", "filename", "ocr")
                              if entry["sources"].count(s))
        print(f"  {entry['manufacturer']} {entry['model']:<22} {len(entry['photos']):>4} photos   [{by_source}]")
        print(f"      query: {entry['query']}")
        for photo in entry["photos"][:2]:
            print(f"      e.g.  {photo}")
    if result["heic"]:
        print(f"\n  {len(result['heic'])} HEIC file(s) (iPhone format). To use them:")
        print("      pip install pillow-heif      # or: sudo apt install libheif-examples")
    if result["unknown"]:
        print(f"\n  {len(result['unknown'])} photo(s) not recognised as an instrument (normal for a phone backup)")
        print("      name a folder after the instrument to place them, e.g. 'Agilent 1260 Infinity II'")


def do_import(result: dict, cache_root: Path, move: bool = False) -> int:
    try:
        from .import_photos import _digest, _existing_digests
    except ImportError:
        from brain.import_photos import _digest, _existing_digests

    imported = 0
    for entry in result["instruments"].values():
        instrument = Instrument(manufacturer=entry["manufacturer"], model=entry["model"],
                                manufacturer_id=entry["manufacturer"].split()[0].lower())
        target_dir = model_dir(cache_root, instrument)
        digests = _existing_digests(target_dir)
        for photo in entry["photos"]:
            source = Path(photo)
            if source.suffix.lower() in HEIC:
                continue
            digest = _digest(source)
            if digest in digests:
                continue
            target_dir.mkdir(parents=True, exist_ok=True)
            target = target_dir / source.name
            counter = 1
            while target.exists():
                target = target_dir / f"{source.stem}-{counter}{source.suffix}"
                counter += 1
            shutil.move(str(source), target) if move else shutil.copy2(source, target)
            digests.add(digest)
            imported += 1
    print(f"\nfiled {imported} photo(s) into {cache_root}")
    return imported


def do_generate(result: dict, engine: str, per_instrument: int = 1) -> None:
    print(f"\ngenerating with {engine} (this is the only step that produces content)")
    for entry in result["instruments"].values():
        request = " ".join(x for x in (entry["manufacturer"], entry["model"], entry["technique"]) if x)
        for _ in range(per_instrument):
            print(f"\n=== {request} ===")
            subprocess.run([engine, request], check=False)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--from", dest="roots", nargs="+", metavar="FOLDER",
                        help="one or more folders to scan")
    parser.add_argument("--nextcloud", nargs="?", const="nextcloud", metavar="CONTAINER",
                        help="scan the Nextcloud data directory (host path found automatically)")
    parser.add_argument("--ocr", action="store_true", help="also read text printed on the instrument")
    parser.add_argument("--limit", type=int, default=0, help="stop after N photos")
    parser.add_argument("--ocr-limit", type=int, default=400, help="cap OCR attempts (default 400)")
    parser.add_argument("--report", help="write the full result as JSON")
    parser.add_argument("--import", dest="do_import", action="store_true", help="file matches into the asset library")
    parser.add_argument("--move", action="store_true", help="with --import: move instead of copy")
    parser.add_argument("--generate", action="store_true", help="run the engine once per instrument found")
    parser.add_argument("--engine", default="/usr/local/bin/vision-ai-content")
    args = parser.parse_args(argv)

    if args.nextcloud and not args.roots:
        found = nextcloud_data_dir(args.nextcloud)
        if found is None:
            print(f"could not locate the data directory of container '{args.nextcloud}'.", file=sys.stderr)
            print("  it is neither bind-mounted nor readable through the container filesystem.", file=sys.stderr)
            print("  run as root, or copy the photos out with:", file=sys.stderr)
            print(f"    docker cp {args.nextcloud}:/var/www/html/data /srv/vision-mobile/INBOX/nextcloud",
                  file=sys.stderr)
            print("  then:  --from /srv/vision-mobile/INBOX/nextcloud", file=sys.stderr)
            return 2
        print(f"Nextcloud data directory: {found}")
        args.roots = [str(found)]
    if not args.roots:
        print("give --from <folder> [<folder> ...] or --nextcloud", file=sys.stderr)
        return 2

    roots = [Path(r).expanduser() for r in args.roots]
    missing = [r for r in roots if not r.is_dir()]
    for r in missing:
        print(f"skipping (not a folder): {r}", file=sys.stderr)
    roots = [r for r in roots if r.is_dir()]
    if not roots:
        return 2
    if args.ocr and not ocr_available():
        print("tesseract not installed - continuing with text matching only")
        print("  install it with: sudo apt install -y tesseract-ocr")
        args.ocr = False

    config = load_config(config_env.to_overrides(config_env.load()))
    library = Library(config)
    merged = {"root": ", ".join(str(r) for r in roots), "scanned": 0, "seconds": 0.0,
              "ocr_used": 0, "instruments": {}, "unknown": [], "heic": []}
    for root in roots:
        print(f"scanning {root} ...")
        part = scan(root, library, args.ocr, args.limit, args.ocr_limit)
        merged["scanned"] += part["scanned"]
        merged["seconds"] = round(merged["seconds"] + part["seconds"], 1)
        merged["ocr_used"] += part["ocr_used"]
        merged["unknown"] += part["unknown"]
        merged["heic"] += part["heic"]
        for key, entry in part["instruments"].items():
            existing = merged["instruments"].get(key)
            if existing:
                existing["photos"] += entry["photos"]
                existing["sources"] += entry["sources"]
            else:
                merged["instruments"][key] = entry
    result = merged
    report(result)

    if args.report:
        Path(args.report).write_text(json.dumps(result, indent=2), encoding="utf-8")
        print(f"\nreport: {args.report}")
    if args.do_import:
        do_import(result, config.path("asset_cache"), args.move)
    if args.generate:
        do_generate(result, args.engine)
    if not (args.do_import or args.generate):
        print("\nnothing was changed. Add --import to file the photos, --generate to make posts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
