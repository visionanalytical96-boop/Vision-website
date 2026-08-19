#!/usr/bin/env python3
"""Show what is actually sitting in each instrument folder, so a wrong photo
never reaches a post.

The folder name is the only claim that a photo shows a given instrument, and
phone dumps land dozens of mixed shots in one place. Nothing here guesses what
an instrument is - it groups the photos that look alike, marks the odd ones
out, and builds a numbered contact sheet so the call stays with the operator.

    python3 photo_review.py --audit
    python3 photo_review.py --sheet
    python3 photo_review.py --move shimadzu/lc-2010cht 4,7,9 shimadzu/uv-1900i
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "vision_ai"))
sys.path.insert(0, str(ROOT.parent / "engine"))

from vision_ai.config import load_config  # noqa: E402
from vision_ai.skills.imaging import IMAGE_SUFFIXES  # noqa: E402

HASH_SIZE = 8
# Photos of one instrument from one session sit well inside this; a different
# instrument lands far outside it. Measured on real folders the two bands are
# separated by a wide margin, so the exact number is not delicate.
OUTLIER_DISTANCE = 14


def photos(folder: Path) -> list[Path]:
    return sorted(p for p in folder.iterdir()
                  if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES
                  and not p.stem.endswith("-studio"))


def instrument_folders(root: Path) -> list[Path]:
    return sorted(d for d in root.glob("*/*") if d.is_dir() and photos(d))


def fingerprint(path: Path) -> tuple[int, int] | None:
    """Two 64-bit views of the photo: where the light is, and which way it steps.

    Together they tell two shots of one instrument apart from two different
    instruments without anything having to recognise what an instrument is.
    """
    from PIL import Image
    try:
        with Image.open(path) as raw:
            grey = raw.convert("L")
            flat = grey.resize((HASH_SIZE, HASH_SIZE), Image.LANCZOS)
            step = grey.resize((HASH_SIZE + 1, HASH_SIZE), Image.LANCZOS)
    except (OSError, ValueError):
        return None

    pixels = list(flat.tobytes())
    mean = sum(pixels) / len(pixels)
    average = sum(1 << index for index, value in enumerate(pixels) if value > mean)

    row = list(step.tobytes())
    width = HASH_SIZE + 1
    difference = 0
    bit = 0
    for y in range(HASH_SIZE):
        for x in range(HASH_SIZE):
            if row[y * width + x] > row[y * width + x + 1]:
                difference |= 1 << bit
            bit += 1
    return average, difference


def distance(a: tuple[int, int], b: tuple[int, int]) -> float:
    return (bin(a[0] ^ b[0]).count("1") + bin(a[1] ^ b[1]).count("1")) / 2


def group(fingerprints: dict[Path, tuple[int, int]]) -> list[list[Path]]:
    """Photos of one instrument from one session cluster; the rest fall out."""
    groups: list[list[Path]] = []
    for path, value in fingerprints.items():
        for existing in groups:
            if any(distance(value, fingerprints[other]) <= OUTLIER_DISTANCE for other in existing):
                existing.append(path)
                break
        else:
            groups.append([path])
    groups.sort(key=len, reverse=True)
    return groups


def describe(path: Path) -> str:
    from PIL import Image
    try:
        with Image.open(path) as image:
            size = f"{image.width}x{image.height}"
    except (OSError, ValueError):
        size = "unreadable"
    return f"{size:>11}  {path.stat().st_size / 1024:6.0f} KB  {path.name}"


def audit(root: Path) -> int:
    folders = instrument_folders(root)
    if not folders:
        print(f"no instrument photos under {root}")
        return 1
    suspect = 0
    for folder in folders:
        found = photos(folder)
        fingerprints = {p: h for p in found if (h := fingerprint(p)) is not None}
        groups = group(fingerprints)
        rel = folder.relative_to(root)
        print(f"\n{rel}  ({len(found)} photos, {len(groups)} visual group(s))")
        # The biggest group is taken to be the instrument the folder is named
        # after. Anything else is worth a human look - it is often a different
        # instrument that came off the same phone.
        majority = len(groups[0]) if groups else 0
        trustworthy = len(groups) > 1 and majority >= 2 and majority >= len(found) / 2
        number = 0
        for index, members in enumerate(groups, 1):
            odd = trustworthy and index > 1
            label = "DOES NOT MATCH THE REST" if odd else f"group {index}"
            if odd:
                suspect += len(members)
            print(f"  [{label}]")
            for path in members:
                number += 1
                print(f"    {number:3d}. {describe(path)}")
        unreadable = [p for p in found if p not in fingerprints]
        for path in unreadable:
            print(f"    ---  unreadable: {path.name}")
    print(f"\n{len(folders)} folder(s) checked, {suspect} photo(s) that do not look like the rest.")
    print("Look at them with --sheet, then move the wrong ones with --move.")
    return 0


def sheet(root: Path, out_dir: Path, columns: int = 5, thumb: int = 300) -> int:
    from PIL import Image, ImageDraw
    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for folder in instrument_folders(root):
        found = photos(folder)
        rows = (len(found) + columns - 1) // columns
        canvas = Image.new("RGB", (columns * thumb, rows * (thumb + 26)), (245, 246, 248))
        draw = ImageDraw.Draw(canvas)
        for index, path in enumerate(found):
            x, y = (index % columns) * thumb, (index // columns) * (thumb + 26)
            try:
                with Image.open(path) as raw:
                    tile = raw.convert("RGB")
                    tile.thumbnail((thumb - 8, thumb - 8), Image.LANCZOS)
                canvas.paste(tile, (x + 4, y + 4))
            except (OSError, ValueError):
                draw.rectangle((x + 4, y + 4, x + thumb - 4, y + thumb - 4), fill=(220, 60, 60))
            draw.text((x + 6, y + thumb + 4), f"{index + 1}. {path.name[:34]}", fill=(30, 34, 40))
        target = out_dir / (str(folder.relative_to(root)).replace("/", "__") + ".png")
        canvas.save(target)
        written.append(target)
        print(f"  {target}   ({len(found)} photos)")
    if not written:
        print(f"no instrument photos under {root}")
        return 1
    print(f"\n{len(written)} contact sheet(s) in {out_dir} - open them, note the numbers that are wrong.")
    return 0


def move(root: Path, source: str, numbers: str, destination: str, apply: bool) -> int:
    src = root / source
    dst = root / destination
    if not src.is_dir():
        print(f"no such folder: {src}")
        return 1
    found = photos(src)
    try:
        wanted = sorted({int(n) for n in numbers.replace(" ", "").split(",") if n})
    except ValueError:
        print(f"could not read the numbers: {numbers}")
        return 1
    out_of_range = [n for n in wanted if not 1 <= n <= len(found)]
    if out_of_range:
        print(f"{src.name} has {len(found)} photos - no number {out_of_range}")
        return 1
    dst.mkdir(parents=True, exist_ok=True)
    for number in wanted:
        path = found[number - 1]
        target = dst / path.name
        if target.exists():
            print(f"  skip {path.name} - already in {destination}")
            continue
        print(f"  {'move' if apply else 'would move'} {path.name}  ->  {destination}/")
        if apply:
            shutil.move(str(path), str(target))
            for extra in src.glob(f"{path.stem}-studio.*"):
                extra.unlink()   # the cutout belonged to the old folder
    if not apply:
        print("\nnothing moved - add --apply to do it")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--images", default="", help="photo root (default: the configured asset cache)")
    parser.add_argument("--audit", action="store_true", help="group each folder and mark the odd ones out")
    parser.add_argument("--sheet", action="store_true", help="write a numbered contact sheet per folder")
    parser.add_argument("--out", default="", help="where the contact sheets go")
    parser.add_argument("--move", nargs=3, metavar=("FOLDER", "NUMBERS", "DESTINATION"),
                        help="move photos by their contact-sheet number, e.g. shimadzu/lc-2010cht 4,7 shimadzu/uv-1900i")
    parser.add_argument("--apply", action="store_true", help="actually move (default is a dry run)")
    args = parser.parse_args(argv)

    config = load_config({})
    root = Path(args.images) if args.images else config.path("asset_cache")
    if not root.is_dir():
        print(f"photo root does not exist: {root}")
        return 1

    if args.move:
        return move(root, args.move[0], args.move[1], args.move[2], args.apply)
    if args.sheet:
        return sheet(root, Path(args.out) if args.out else root.parent / "photo-review")
    return audit(root)


if __name__ == "__main__":
    raise SystemExit(main())
