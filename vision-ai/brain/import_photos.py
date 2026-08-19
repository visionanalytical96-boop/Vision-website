"""Sort a pile of instrument photos into the per-model asset library.

Point it at whatever folder the phone uploads land in. Each file is identified
from its containing folder name first, then its own filename, and copied to
creative-pack/images/<manufacturer>/<model-slug>/ - the exact place the engine
looks before it will show real hardware.

    python3 -m brain.import_photos --from /srv/vision-mobile/INBOX          # dry run
    python3 -m brain.import_photos --from /srv/vision-mobile/INBOX --apply

Nothing is deleted: files are copied unless --move is given, duplicates are
skipped by content hash, and anything it cannot identify is listed for you.
"""

from __future__ import annotations

import argparse
import hashlib
import shutil
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
for _candidate in (_HERE, _HERE.parent / "engine"):   # vendored, then repo layout
    if (_candidate / "vision_ai").is_dir() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

from vision_ai.config import load_config  # noqa: E402
from vision_ai.library import Library  # noqa: E402
from vision_ai.skills.imaging import IMAGE_SUFFIXES, model_dir  # noqa: E402
from vision_ai.skills.instrument import identify  # noqa: E402

from . import config_env  # noqa: E402


def _digest(path: Path) -> str:
    sha = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            sha.update(chunk)
    return sha.hexdigest()


def _existing_digests(directory: Path) -> set[str]:
    if not directory.is_dir():
        return set()
    return {_digest(p) for p in directory.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES}


def plan(staging: Path, cache_root: Path, library: Library) -> tuple[list[tuple[Path, Path, str]], list[Path]]:
    """Return (moves, unidentified). A folder name beats a filename: put photos
    of one instrument in a folder called e.g. 'Agilent 1260 Infinity II'."""
    matched: list[tuple[Path, Path, str]] = []
    unknown: list[Path] = []
    for source in sorted(staging.rglob("*")):
        if not source.is_file() or source.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        folder_hint = source.parent.name if source.parent != staging else ""
        instrument = identify(folder_hint, library) if folder_hint else None
        reason = "folder name"
        if instrument is None or not instrument.identified:
            instrument = identify(source.stem, library)
            reason = "file name"
        if not instrument.identified:
            unknown.append(source)
            continue
        matched.append((source, model_dir(cache_root, instrument) / source.name,
                        f"{instrument.manufacturer} {instrument.model} (from {reason})"))
    return matched, unknown


def run(staging: Path, cache_root: Path, library: Library, apply: bool, move: bool) -> int:
    matched, unknown = plan(staging, cache_root, library)
    if not matched and not unknown:
        print(f"no images found under {staging}")
        return 0

    imported = skipped = 0
    seen: dict[Path, set[str]] = {}
    for source, target, reason in matched:
        digests = seen.setdefault(target.parent, _existing_digests(target.parent))
        digest = _digest(source)
        if digest in digests:
            print(f"  skip   {source.name}  (already in {target.parent.name}/)")
            skipped += 1
            continue
        print(f"  {'move' if move else 'copy'}   {source.name}  ->  "
              f"{target.parent.relative_to(cache_root)}/   [{reason}]")
        if apply:
            target.parent.mkdir(parents=True, exist_ok=True)
            final = target
            counter = 1
            while final.exists():
                final = target.with_name(f"{target.stem}-{counter}{target.suffix}")
                counter += 1
            shutil.move(str(source), final) if move else shutil.copy2(source, final)
            digests.add(digest)
        imported += 1

    if unknown:
        print(f"\n  {len(unknown)} file(s) could not be identified - put them in a folder named after the")
        print("  instrument (e.g. 'Shimadzu GCMS-QP2020 NX') and run again:")
        for path in unknown[:15]:
            print(f"    ? {path}")
        if len(unknown) > 15:
            print(f"    ... and {len(unknown) - 15} more")

    print(f"\n{'imported' if apply else 'would import'}: {imported}   skipped (duplicate): {skipped}   "
          f"unidentified: {len(unknown)}")
    if not apply and imported:
        print("re-run with --apply to actually file them")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--from", dest="staging", required=True, help="folder the phone uploads land in")
    parser.add_argument("--apply", action="store_true", help="actually file the photos (default: dry run)")
    parser.add_argument("--move", action="store_true", help="move instead of copy")
    args = parser.parse_args(argv)

    staging = Path(args.staging).expanduser()
    if not staging.is_dir():
        print(f"not a folder: {staging}", file=sys.stderr)
        return 2

    config = load_config(config_env.to_overrides(config_env.load()))
    library = Library(config)
    cache_root = config.path("asset_cache")
    print(f"staging : {staging}")
    print(f"library : {cache_root}\n")
    return run(staging, cache_root, library, args.apply, args.move)


if __name__ == "__main__":
    raise SystemExit(main())
