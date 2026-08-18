"""Skills 3-10 + the decision half of skill 4: the local creative brain.

Everything here is pure Python and runs in well under a millisecond, which is
why no design decision is ever delegated to a language model.
"""

from __future__ import annotations

import random
from typing import Any, Sequence

from ..library import Library
from .history import FINGERPRINT_FIELDS, DesignHistory, fingerprint, structure_key


def _recency_weights(items: Sequence[dict], recent: list[str]) -> list[float]:
    """Rotation: an id used recently is heavily down-weighted, never excluded."""
    penalty = {value: index + 1 for index, value in enumerate(reversed(recent))}
    weights = []
    for item in items:
        rank = penalty.get(item["id"])
        weights.append(1.0 if rank is None else max(0.05, rank / (len(recent) + 1)))
    return weights


def _weighted_choice(rng: random.Random, items: Sequence[dict], recent: list[str]) -> dict:
    return rng.choices(list(items), weights=_recency_weights(items, recent), k=1)[0]


def pick_two_animations(rng: random.Random, animations: Sequence[dict], recent: list[str]) -> tuple[dict, dict]:
    """Guarantees animation_1 != animation_2 (spec 11: never PUSH_IN + PUSH_IN)."""
    if len(animations) < 2:
        raise ValueError("animation library needs at least two entries")
    first = _weighted_choice(rng, animations, recent)
    remaining = [a for a in animations if a["id"] != first["id"]]
    second = _weighted_choice(rng, remaining, recent)
    return first, second


class DesignSelector:
    def __init__(self, library: Library, history: DesignHistory, settings: dict, seed: int | None = None) -> None:
        self.library = library
        self.history = history
        self.settings = settings
        self.rng = random.Random(seed)

    def _recent(self, field: str, count: int = 12) -> list[str]:
        return self.history.recent_values(field, count)

    def _candidate(self, instrument_fields: dict[str, Any]) -> dict:
        lib = self.library
        rng = self.rng

        family = _weighted_choice(rng, lib.get("families"), self._recent("design_family"))
        palettes = lib.get("palettes")
        preferred = [p for p in palettes if p["id"] in family.get("palettes", [])] or palettes
        palette = _weighted_choice(rng, preferred, self._recent("color_palette"))
        background = _weighted_choice(rng, lib.get("backgrounds"), self._recent("background"))
        composition = _weighted_choice(rng, lib.get("compositions"), self._recent("composition"))
        layout = _weighted_choice(rng, lib.get("layouts"), self._recent("layout"))
        typography = _weighted_choice(rng, lib.get("typography"), self._recent("typography"))
        camera = _weighted_choice(rng, lib.get("cameras"), self._recent("camera"))
        anim1, anim2 = pick_two_animations(rng, lib.get("animations"), self._recent("animation_1") + self._recent("animation_2"))
        transition = _weighted_choice(rng, lib.get("transitions"), self._recent("transition"))
        effect = _weighted_choice(rng, lib.get("effects"), self._recent("effect"))
        music = _weighted_choice(rng, lib.get("music_styles"), self._recent("music_style"))
        voice = _weighted_choice(rng, lib.get("voice_styles"), self._recent("voice_style"))

        design = dict(instrument_fields)
        design.update(
            {
                "design_family": family["id"],
                "design_family_label": family["label"],
                "background": background["id"],
                "background_label": background["label"],
                "composition": composition["id"],
                "composition_label": composition["label"],
                "color_palette": palette["id"],
                "color_palette_label": palette["label"],
                "layout": layout["id"],
                "layout_label": layout["label"],
                "typography": typography["id"],
                "typography_label": typography["label"],
                "camera": camera["id"],
                "camera_label": camera["label"],
                "animation_1": anim1["id"],
                "animation_1_label": anim1["label"],
                "animation_2": anim2["id"],
                "animation_2_label": anim2["label"],
                "transition": transition["id"],
                "transition_label": transition["label"],
                "effect": effect["id"],
                "effect_label": effect["label"],
                "music_style": music["id"],
                "music_style_label": music["label"],
                "voice_style": voice["id"],
                "voice_style_label": voice["label"],
            }
        )
        design["design_fingerprint"] = fingerprint(design)
        return design

    def select(self, instrument_fields: dict[str, Any]) -> dict:
        """Return a design that repeats neither a full fingerprint nor a recent
        background+composition+layout structure."""
        max_attempts = int(self.settings.get("max_attempts", 400))
        structure_window = int(self.settings.get("structure_block_window", 10))
        seen_fingerprints = self.history.fingerprints
        blocked_structures = self.history.recent_structures(structure_window)

        best: dict | None = None
        for attempt in range(max_attempts):
            design = self._candidate(instrument_fields)
            if design["design_fingerprint"] in seen_fingerprints:
                continue
            if structure_key(design) in blocked_structures:
                best = best or design  # unique design, structure still too recent
                continue
            design["selection_attempts"] = attempt + 1
            design["anti_repetition"] = "unique fingerprint + unused recent structure"
            return design

        if best is not None:
            best["selection_attempts"] = max_attempts
            best["anti_repetition"] = "unique fingerprint (structure pool exhausted)"
            return best

        design = self._candidate(instrument_fields)
        design["selection_attempts"] = max_attempts
        design["anti_repetition"] = "history saturated - closest available combination"
        return design


def design_summary(design: dict) -> dict:
    return {field: design.get(field, "") for field in FINGERPRINT_FIELDS}
