"""Creative-library loader.

Libraries are plain JSON under creative-pack/. The installed pack wins, the
bundled pack is the fallback, so an operator can edit the libraries on the
server without touching the engine.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .config import BUNDLED_PACK, Config

# library key -> (relative path, top-level json key)
LIBRARIES = {
    "families": ("designs/design-families.json", "families"),
    "backgrounds": ("designs/backgrounds.json", "backgrounds"),
    "compositions": ("designs/compositions.json", "compositions"),
    "layouts": ("layouts/layouts.json", "layouts"),
    "palettes": ("colors/palettes.json", "palettes"),
    "typography": ("colors/typography.json", "typography"),
    "animations": ("animations/animations.json", "animations"),
    "cameras": ("animations/cameras.json", "cameras"),
    "transitions": ("transitions/transitions.json", "transitions"),
    "effects": ("effects/effects.json", "effects"),
    "music_styles": ("music/music-styles.json", "styles"),
    "voice_styles": ("voice/voice-styles.json", "styles"),
    "instruments": ("skills/instruments.json", None),
}


@lru_cache(maxsize=64)
def _read(path: str) -> dict:
    return json.loads(Path(path).read_text())


def _resolve(pack: Path, relative: str) -> Path:
    candidate = pack / relative
    if candidate.is_file():
        return candidate
    return BUNDLED_PACK / relative


class Library:
    def __init__(self, config: Config) -> None:
        self.pack = config.creative_pack

    def get(self, name: str):
        relative, key = LIBRARIES[name]
        data = _read(str(_resolve(self.pack, relative)))
        return data if key is None else data[key]

    def by_id(self, name: str, item_id: str) -> dict | None:
        for item in self.get(name):
            if item.get("id") == item_id:
                return item
        return None

    def ids(self, name: str) -> list[str]:
        return [item["id"] for item in self.get(name)]

    def counts(self) -> dict[str, int]:
        out = {}
        for name in LIBRARIES:
            if name == "instruments":
                continue
            out[name] = len(self.get(name))
        return out
