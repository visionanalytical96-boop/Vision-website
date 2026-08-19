"""Skills 2 + 18: authentic image sourcing and asset management.

The engine never invents instrument hardware and never silently substitutes a
neighbouring model. It resolves a real photograph of the requested instrument
or it says so, in the Info file and on stderr, and falls back to a typographic
design with no instrument imagery.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from .instrument import Instrument

IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

# Ranked from strongest to weakest evidence that the file really shows the
# instrument that was asked for.
SOURCE_EXACT_CURATED = "curated-pack-exact-model"
SOURCE_EXACT_INPUT = "input-photo-exact-model"
SOURCE_MANUFACTURER = "input-photo-manufacturer-only"
SOURCE_UNVERIFIED = "input-photo-unverified"
SOURCE_NONE = "none-typographic"


@dataclass
class ImageAsset:
    path: Path | None = None
    source: str = SOURCE_NONE
    exact_match: bool = False
    candidates: int = 0
    note: str = ""

    @property
    def name(self) -> str:
        return self.path.name if self.path else "(none)"


def _tokens(text: str) -> list[str]:
    return [t for t in re.split(r"[^A-Za-z0-9]+", (text or "").lower()) if t]


GENERATED_DIRS = {"generated", "outputs", "posters", "renders"}
GENERATED_NAMES = ("vision-analytical-", "-post", "-story", "-square", "-poster", "-reel")


def _is_render_output(parts: tuple[str, ...]) -> bool:
    """OUTPUT/READY only counts as rendered output when both appear together,
    so a folder merely called "output" elsewhere is not caught."""
    lowered = [part.lower() for part in parts]
    return any(a == "output" and b == "ready" for a, b in zip(lowered, lowered[1:]))


def looks_generated(path: Path) -> bool:
    """A previously rendered poster is not a photograph of an instrument.

    Putting one in the asset library stacks a design on top of a design - the
    instrument disappears and the branding doubles up.
    """
    parts = Path(path).parts
    if any(part.lower() in GENERATED_DIRS for part in parts) or _is_render_output(parts):
        return True
    stem = Path(path).stem.lower()
    return any(token in stem for token in GENERATED_NAMES)


def _photos(directory: Path) -> list[Path]:
    if not directory.is_dir():
        return []
    return sorted(p for p in directory.rglob("*")
                  if p.is_file() and p.suffix.lower() in IMAGE_SUFFIXES and not looks_generated(p))


def model_dir(cache_root: Path, instrument: Instrument) -> Path:
    """Curated location for authentic photographs of one exact model."""
    model_slug = re.sub(r"[^A-Za-z0-9]+", "-", instrument.model.lower()).strip("-")
    return cache_root / (instrument.manufacturer_id or "unspecified") / (model_slug or "unspecified")


def _conflicting_model(photo: Path, model_tokens: list[str]) -> bool:
    """True when the filename carries a model number other than the requested one."""
    if not model_tokens:
        return False
    numeric = [t for t in _tokens(photo.stem) if any(ch.isdigit() for ch in t)]
    return any(token not in model_tokens for token in numeric)


def _least_used(candidates: list[Path], used: list[str]) -> Path:
    """Rotate authentic views: prefer the file that history used least recently."""
    counts = {str(c): 0 for c in candidates}
    for index, name in enumerate(used):
        for candidate in candidates:
            if candidate.name == Path(name).name:
                counts[str(candidate)] += 1 + (index / max(1, len(used)))
    return min(candidates, key=lambda c: (counts[str(c)], c.name))


def resolve(
    instrument: Instrument,
    cache_root: Path,
    photo_dir: Path,
    used_assets: list[str] | None = None,
) -> ImageAsset:
    used = used_assets or []

    if instrument.identified:
        curated = _photos(model_dir(cache_root, instrument))
        if curated:
            return ImageAsset(_least_used(curated, used), SOURCE_EXACT_CURATED, True, len(curated),
                              "authentic photograph of the requested model from the curated pack")

    photos = _photos(photo_dir)
    if not photos:
        return ImageAsset(None, SOURCE_NONE, False, 0,
                          "no input photograph available - rendered as a typographic design")

    model_tokens = [t for t in _tokens(instrument.model) if len(t) > 1]
    man_tokens = _tokens(instrument.manufacturer_id)

    if model_tokens:
        exact = [p for p in photos if all(t in _tokens(p.stem) for t in model_tokens)]
        if man_tokens:
            exact = [p for p in exact if any(t in _tokens(p.stem) for t in man_tokens)] or exact
        if exact:
            return ImageAsset(_least_used(exact, used), SOURCE_EXACT_INPUT, True, len(exact),
                              "input photograph whose filename matches the requested model")

    if man_tokens:
        same_brand = [p for p in photos if any(t in _tokens(p.stem) for t in man_tokens)]
        # A filename that names a different model is a different instrument:
        # "Agilent-1260..." must never be used for a request for the 1290.
        same_brand = [p for p in same_brand if not _conflicting_model(p, model_tokens)]
        if same_brand:
            return ImageAsset(_least_used(same_brand, used), SOURCE_MANUFACTURER, False, len(same_brand),
                              "manufacturer matches but the model is unverified - confirm the photo shows "
                              f"{instrument.manufacturer} {instrument.model}")

    if instrument.identified:
        return ImageAsset(None, SOURCE_NONE, False, len(photos),
                          f"no photograph of {instrument.manufacturer} {instrument.model} found - "
                          "rendered as a typographic design rather than showing a different instrument")

    return ImageAsset(_least_used(photos, used), SOURCE_UNVERIFIED, False, len(photos),
                      "no instrument identified - using the supplied photograph as provided")


def search_brief(instrument: Instrument, camera_hint: str = "") -> str:
    """What the operator should search for when an authentic photo is missing."""
    query = instrument.image_search_query()
    return f"{query} - {camera_hint}" if camera_hint else query
