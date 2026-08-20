"""Background removal, so the instrument sits on the designed background.

Uses rembg when it is installed (the u2netp model is ~5 MB and runs fine on
CPU); without it, nothing breaks - the photo is used as-is and the reason is
printed. Cutouts are cached next to the source, so a photo is processed once.

    pip install "rembg[cpu]" onnxruntime        # optional, one time
    python3 brain/cutout.py photo.jpg           # writes photo-cutout.png
"""

from __future__ import annotations

import sys
from pathlib import Path

SUFFIX = "-cutout.png"


def available() -> bool:
    try:
        import rembg  # noqa: F401
        return True
    except Exception:
        return False


def cutout_path(source: Path) -> Path:
    return Path(source).with_name(Path(source).stem + SUFFIX)


def make(source: Path, model: str = "u2netp") -> tuple[Path | None, str]:
    """Return (transparent PNG, note). Cached: a photo is only processed once."""
    source = Path(source)
    if source.name.endswith(SUFFIX):
        return source, "already a cutout"
    target = cutout_path(source)
    if target.is_file() and target.stat().st_mtime >= source.stat().st_mtime:
        return target, "cached cutout"
    if not available():
        return None, ("background removal unavailable - install it with: "
                      'pip install "rembg[cpu]" onnxruntime')
    try:
        from rembg import new_session, remove
        from PIL import Image

        session = new_session(model)
        with Image.open(source) as image:
            result = remove(image.convert("RGBA"), session=session)
        result.save(target, "PNG")
    except Exception as exc:  # a failed cutout must never stop a generation
        return None, f"background removal failed: {str(exc)[:120]}"
    return target, f"background removed ({model})"


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    for name in args:
        path, note = make(Path(name))
        print(f"{name}: {note}" + (f" -> {path}" if path else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
