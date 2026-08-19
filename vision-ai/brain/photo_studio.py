"""Turn a hand-taken lab photo into a clean cutout, ready for the design.

Steps, in order: honour the EXIF rotation, correct the colour cast, lift
contrast, sharpen, remove the background, trim to the instrument. rembg does
the cutout when it is installed; without it, a flood fill from the corners
handles the common case of an instrument shot against a plain wall or bench,
and anything busier is left as a photo rather than butchered.

Everything is Pillow except the optional rembg, and the result is cached, so a
photo is only ever processed once.

    python3 brain/photo_studio.py IMG_2201.jpg
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

try:  # iPhone HEIC support when the optional package is present
    import pillow_heif

    pillow_heif.register_heif_opener()
except Exception:
    pass

SUFFIX = "-studio.png"


def studio_path(source: Path) -> Path:
    return Path(source).with_name(Path(source).stem + SUFFIX)


def enhance(image: Image.Image) -> Image.Image:
    """Colour cast, contrast, sharpness - what you would do by hand first."""
    image = ImageOps.exif_transpose(image).convert("RGB")

    # Grey-world white balance: lab lighting is rarely neutral.
    pixel_count = max(1, image.width * image.height)
    stats = [sum(level * count for level, count in enumerate(channel.histogram())) / pixel_count
             for channel in image.split()]
    grey = sum(stats) / 3
    if min(stats) > 1:
        image = Image.merge("RGB", [
            channel.point(lambda value, gain=grey / stat: min(255, int(value * gain)))
            for channel, stat in zip(image.split(), stats)])

    image = ImageOps.autocontrast(image, cutoff=1)
    image = ImageEnhance.Color(image).enhance(1.06)
    image = image.filter(ImageFilter.UnsharpMask(radius=2, percent=115, threshold=3))
    return image


def _corner_background(image: Image.Image, tolerance: int = 26) -> Image.Image | None:
    """Flood fill from the corners. Returns an alpha mask, or None when the
    background is too busy to remove safely."""
    width, height = image.size
    small = image.resize((min(width, 700), int(min(width, 700) * height / width)), Image.BILINEAR)
    pixels = small.load()
    corners = [(0, 0), (small.width - 1, 0), (0, small.height - 1), (small.width - 1, small.height - 1)]
    samples = [pixels[x, y] for x, y in corners]
    spread = max(max(abs(a[i] - b[i]) for i in range(3)) for a in samples for b in samples)
    if spread > 60:
        return None  # corners disagree - not a plain background

    reference = tuple(sum(sample[i] for sample in samples) // len(samples) for i in range(3))
    mask = Image.new("L", small.size, 255)
    mask_pixels = mask.load()
    stack = list(corners)
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < small.width and 0 <= y < small.height):
            continue
        seen.add((x, y))
        pixel = pixels[x, y]
        if max(abs(pixel[i] - reference[i]) for i in range(3)) > tolerance:
            continue
        mask_pixels[x, y] = 0
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]

    lit = sum(level * count for level, count in enumerate(mask.histogram()))
    removed = 1 - lit / (255 * small.width * small.height)
    if removed < 0.08 or removed > 0.92:
        return None  # removed almost nothing, or almost everything
    mask = mask.filter(ImageFilter.GaussianBlur(1.5)).resize(image.size, Image.BILINEAR)
    return mask


VENV_CANDIDATES = (
    "REMBG_PYTHON",  # environment override
    str(Path(__file__).resolve().parent / "rembg-venv" / "bin" / "python"),
    "/srv/vision-workspace/vision-ai/brain/rembg-venv/bin/python",
)

_REMBG_SCRIPT = """
import sys
from rembg import new_session, remove
from PIL import Image
source, target, model = sys.argv[1], sys.argv[2], sys.argv[3]
with Image.open(source) as image:
    remove(image.convert("RGBA"), session=new_session(model)).save(target, "PNG")
"""


def rembg_python() -> str | None:
    """rembg in its own virtualenv keeps numpy/scipy/jsonschema off the system
    python - which is what the Debian jsonschema conflict is about."""
    override = os.environ.get(VENV_CANDIDATES[0], "")
    for candidate in ([override] if override else []) + list(VENV_CANDIDATES[1:]):
        if candidate and Path(candidate).is_file() and os.access(candidate, os.X_OK):
            return candidate
    return None


def _rembg_via_venv(image: Image.Image, python: str, model: str) -> tuple[Image.Image, str] | None:
    import tempfile
    with tempfile.TemporaryDirectory() as work:
        source, target = Path(work) / "in.png", Path(work) / "out.png"
        image.convert("RGBA").save(source, "PNG")
        result = subprocess.run([python, "-c", _REMBG_SCRIPT, str(source), str(target), model],
                                capture_output=True, text=True, timeout=600)
        if result.returncode != 0 or not target.is_file():
            return None
        with Image.open(target) as done:
            return done.copy(), f"background removed ({model}, rembg venv)"


def remove_background(image: Image.Image, model: str = "u2netp") -> tuple[Image.Image, str]:
    try:
        from rembg import new_session, remove
        result = remove(image.convert("RGBA"), session=new_session(model))
        return result, f"background removed ({model})"
    except ImportError:
        python = rembg_python()
        if python:
            try:
                done = _rembg_via_venv(image, python, model)
            except Exception as exc:
                done = None
                print(f"  rembg venv failed: {str(exc)[:80]}")
            if done is not None:
                return done
    except Exception as exc:
        return image.convert("RGBA"), f"rembg failed ({str(exc)[:60]}) - photo kept as-is"

    mask = _corner_background(image)
    if mask is None:
        return (image.convert("RGBA"),
                "background kept (not a plain backdrop) - for any background, install rembg in its own venv: "
                "python3 -m venv /srv/vision-workspace/vision-ai/brain/rembg-venv && "
                "/srv/vision-workspace/vision-ai/brain/rembg-venv/bin/pip install \"rembg[cpu]\" onnxruntime pillow")
    cut = image.convert("RGBA")
    cut.putalpha(mask)
    return cut, "background removed (plain-backdrop fill)"


def trim(image: Image.Image, padding: int = 12) -> Image.Image:
    """Crop away empty space so the instrument fills the frame it is given."""
    if image.mode != "RGBA":
        return image
    box = image.getchannel("A").point(lambda value: 255 if value > 8 else 0).getbbox()
    if not box:
        return image
    left = max(0, box[0] - padding)
    top = max(0, box[1] - padding)
    right = min(image.width, box[2] + padding)
    bottom = min(image.height, box[3] + padding)
    return image.crop((left, top, right, bottom))


def prepare(source: Path, model: str = "u2netp") -> tuple[Path | None, str]:
    source = Path(source)
    if source.name.endswith(SUFFIX):
        return source, "already prepared"
    target = studio_path(source)
    if target.is_file() and target.stat().st_mtime >= source.stat().st_mtime:
        return target, "cached"
    try:
        with Image.open(source) as opened:
            cleaned = enhance(opened)
        cut, note = remove_background(cleaned, model)
        cut = trim(cut)
        cut.save(target, "PNG")
    except Exception as exc:
        return None, f"photo preparation failed: {str(exc)[:120]}"
    return target, note


def main(argv: list[str] | None = None) -> int:
    args = argv if argv is not None else sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    for name in args:
        path, note = prepare(Path(name))
        print(f"{name}: {note}" + (f" -> {path.name}" if path else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
