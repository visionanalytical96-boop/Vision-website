"""One-way, additive converter: existing .txt presets -> JSON libraries.

Rule: your names, our mechanics. Every name in the operator's presets.txt
becomes a real library entry. Names that match a bundled entry inherit its
mechanics; names that don't are mapped deterministically onto a bundled
mechanic so they still render. The .txt files are never modified or deleted,
and an existing .json is never overwritten.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

# creative-pack .txt source -> (target json, top-level key, bundled library name)
SOURCES = {
    "designs/families.txt": ("designs/design-families.json", "families", "families"),
    "layouts/presets.txt": ("layouts/layouts.json", "layouts", "layouts"),
    "animations/presets.txt": ("animations/animations.json", "animations", "animations"),
    "transitions/presets.txt": ("transitions/transitions.json", "transitions", "transitions"),
    "effects/presets.txt": ("effects/effects.json", "effects", "effects"),
    "colors/palettes.txt": ("colors/palettes.json", "palettes", "palettes"),
    "music/styles.txt": ("music/music-styles.json", "styles", "music_styles"),
    "backgrounds/presets.txt": ("designs/backgrounds.json", "backgrounds", "backgrounds"),
    "camera/presets.txt": ("animations/cameras.json", "cameras", "cameras"),
    "typography/presets.txt": ("colors/typography.json", "typography", "typography"),
}


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.strip().lower()).strip("_")


def label(text: str) -> str:
    cleaned = re.sub(r"[_\-]+", " ", text.strip()).strip()
    return cleaned.title() if cleaned.isupper() or "_" in text else cleaned


def read_presets(path: Path) -> list[str]:
    """One entry per line; '#' comments, blank lines and 'ID | note' all fine."""
    if not path.is_file():
        return []
    entries = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        entries.append(re.split(r"\s*[|:=]\s*", line, maxsplit=1)[0].strip())
    return [e for e in entries if e]


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", text.lower()) if len(t) > 2}


def best_match(name: str, bundled: list[dict]) -> dict:
    """Nearest bundled entry by token overlap; deterministic fallback by hash."""
    wanted = _tokens(name)
    scored = []
    for item in bundled:
        pool = _tokens(item.get("id", "")) | _tokens(item.get("label", ""))
        scored.append((len(wanted & pool), item.get("id", "")))
    score, best_id = max(scored) if scored else (0, "")
    if score:
        return next(item for item in bundled if item["id"] == best_id)
    return bundled[sum(ord(c) for c in name) % len(bundled)]


def convert(pack: Path, bundled_get, dry_run: bool = True) -> list[str]:
    """Returns a human-readable log of what would be (or was) written."""
    log: list[str] = []
    for source, (target, key, library) in SOURCES.items():
        src_path, dst_path = pack / source, pack / target
        names = read_presets(src_path)
        if not names:
            continue
        if dst_path.is_file():
            log.append(f"keep    {target} (already exists - untouched)")
            continue
        bundled = bundled_get(library)
        entries, seen = [], set()
        for name in names:
            entry_id = slug(name)
            if not entry_id or entry_id in seen:
                continue
            seen.add(entry_id)
            template = dict(best_match(name, bundled))
            template["id"] = entry_id
            template["label"] = label(name)
            template["source"] = f"creative-pack/{source}"
            entries.append(template)
        for item in bundled:  # keep bundled entries the operator does not have
            if item["id"] not in seen:
                entries.append(dict(item))
        payload = {
            "_comment": f"Generated from {source} by brain/pack_convert.py. "
                        f"Your names are preserved; mechanics come from the bundled library. "
                        f"Edit freely - this file is never regenerated once it exists.",
            key: entries,
        }
        log.append(f"write   {target} ({len(names)} from .txt + {len(entries) - len(seen)} bundled)")
        if not dry_run:
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            dst_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return log
