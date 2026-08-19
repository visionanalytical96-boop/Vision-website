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
import re
import shutil
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
for _candidate in (_HERE, _HERE.parent / "engine"):   # vendored, then repo layout
    if (_candidate / "vision_ai").is_dir() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

from vision_ai.config import load_config  # noqa: E402
from vision_ai.library import Library  # noqa: E402
from vision_ai.skills.imaging import IMAGE_SUFFIXES, looks_generated, model_dir  # noqa: E402
from vision_ai.skills.instrument import identify  # noqa: E402

try:  # `python3 -m brain.x` from the parent dir
    from . import config_env
except ImportError:  # `python3 /path/to/brain/x.py`
    sys.path.insert(0, str(_HERE.parent))
    from brain import config_env  # noqa: E402


# The posts are rendered at 1080 wide and the reel at 1080x1920, so a small
# web image has to be blown up and shows it. These are the long-edge sizes at
# which that starts to be visible.
GOOD_PIXELS = 900
POOR_PIXELS = 500


def _dimensions(path: Path) -> tuple[int, int] | None:
    from PIL import Image
    try:
        with Image.open(path) as image:
            return image.size
    except (OSError, ValueError):
        return None


def _quality_note(path: Path) -> tuple[str, str]:
    """(grade, note) - grade is one of good / soft / small / unreadable."""
    size = _dimensions(path)
    if size is None:
        return "unreadable", "cannot be opened"
    longest = max(size)
    label = f"{size[0]}x{size[1]}"
    if longest < POOR_PIXELS:
        return "small", f"{label} - too small for a 1080-wide post, it will look blurry"
    if longest < GOOD_PIXELS:
        return "soft", f"{label} - usable, but soft once enlarged"
    return "good", label


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


def _parent_names(source: Path, staging: Path) -> list[str]:
    """Folder names between the photo and the staging root, closest first."""
    names: list[str] = []
    parent = source.parent
    while parent != staging:
        try:
            parent.relative_to(staging)
        except ValueError:
            break          # walked out of the staging tree
        names.append(parent.name)
        parent = parent.parent
    return names


def plan(staging: Path, cache_root: Path, library: Library
         ) -> tuple[list[tuple[Path, Path, str]], list[Path], dict[tuple[str, str], str]]:
    """Return (moves, unidentified). A folder name beats a filename: put photos
    of one instrument in a folder called e.g. 'Agilent 1260 Infinity II'."""
    matched: list[tuple[Path, Path, str]] = []
    unknown: list[Path] = []
    loose: dict[tuple[str, str], str] = {}
    for source in sorted(staging.rglob("*")):
        if not source.is_file() or source.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        if looks_generated(source):
            continue  # a rendered poster is not a photograph
        # Walk up from the photo towards the staging root, deepest folder
        # first. People file photos as "Agilent 1260 Infinity II/Detector",
        # and the model is on the parent, not on the folder holding the file.
        instrument, reason = None, "folder name"
        for folder in _parent_names(source, staging):
            candidate = identify(folder, library)
            if candidate.identified:
                instrument, reason = candidate, f"folder \"{folder}\""
                break
        if instrument is None or not instrument.identified:
            from .scan_library import _is_camera_name, _names_a_manufacturer
            if _is_camera_name(source.stem) and not _names_a_manufacturer(source.stem, library):
                unknown.append(source)
                continue
            instrument = identify(source.stem, library)
            reason = "file name"
        if not instrument.identified:
            unknown.append(source)
            continue
        matched.append((source, model_dir(cache_root, instrument) / source.name,
                        f"{instrument.manufacturer} {instrument.model} (from {reason})"))
        if not instrument.matched_known_model:
            loose.setdefault((instrument.manufacturer_id, instrument.model),
                             model_dir(cache_root, instrument).name)
    return matched, unknown, loose


def catalogue_models(library: Library, manufacturer_id: str) -> list[str]:
    try:
        known = library.get("instruments")["known_models"]
    except (KeyError, TypeError):
        return []
    return [e["model"] for e in known if e.get("manufacturer") == manufacturer_id]


def _closest(name: str, options: list[str]) -> list[str]:
    """Catalogue models sharing digits with the folder name come first."""
    digits = {t for t in re.split(r"[^0-9]+", name) if len(t) >= 3}
    scored = [(len(digits & {t for t in re.split(r"[^0-9]+", o) if len(t) >= 3}), o)
              for o in options]
    scored.sort(key=lambda pair: (-pair[0], pair[1]))
    return [o for _, o in scored]


def report_loose_names(loose: dict, library: Library, cache_root: Path) -> None:
    """A folder called "Shimadzu 2010" files photos where nothing looks for them.

    The generator resolves a request to a catalogue model - LC-2010CHT - and
    looks only in that folder. A short folder name imports cleanly and then the
    photos are never used, with nothing saying why.
    """
    if not loose:
        return
    print("\n  ATTENTION - these folder names are not catalogue models, so a normal")
    print("  request will look somewhere else and never find these photos:\n")
    for (manufacturer_id, model), folder in sorted(loose.items()):
        print(f"    photos went to   {manufacturer_id}/{folder}")
        options = _closest(model, catalogue_models(library, manufacturer_id))
        if options:
            print("    a request finds them only under one of these:")
            for option in options[:4]:
                slug = re.sub(r"[^A-Za-z0-9]+", "-", option.lower()).strip("-")
                print(f"        {manufacturer_id}/{slug:28s}  (\"{ _title(manufacturer_id) } {option}\")")
        print("    -> rename the folder to the full model name and import again\n")


def _title(manufacturer_id: str) -> str:
    return manufacturer_id.replace("-", " ").title()


def run(staging: Path, cache_root: Path, library: Library, apply: bool, move: bool) -> int:
    matched, unknown, loose = plan(staging, cache_root, library)
    if not matched and not unknown:
        print(f"no images found under {staging}")
        return 0

    imported = skipped = 0
    seen: dict[Path, set[str]] = {}
    grades: dict[str, int] = {}
    for source, target, reason in matched:
        digests = seen.setdefault(target.parent, _existing_digests(target.parent))
        digest = _digest(source)
        if digest in digests:
            print(f"  skip   {source.name}  (already in {target.parent.name}/)")
            skipped += 1
            continue
        grade, note = _quality_note(source)
        grades[grade] = grades.get(grade, 0) + 1
        flag = {"good": " ", "soft": "~", "small": "!", "unreadable": "x"}[grade]
        print(f" {flag}{'move' if move else 'copy'}   {source.name}  ->  "
              f"{target.parent.relative_to(cache_root)}/   [{note}]")
        if grade == "unreadable":
            continue
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
    if grades.get("small") or grades.get("soft"):
        print(f"  resolution: {grades.get('good', 0)} good, {grades.get('soft', 0)} soft (~), "
              f"{grades.get('small', 0)} too small (!)")
        print(f"  A post is rendered 1080 wide. Anything under {POOR_PIXELS}px on its long edge")
        print("  will look blurry - replace those with your own photographs when you can.")
    if grades.get("unreadable"):
        print(f"  {grades['unreadable']} file(s) could not be opened and were not imported")
    report_loose_names(loose, library, cache_root)
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
