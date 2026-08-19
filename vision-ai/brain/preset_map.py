"""Map the server brain's preset names onto renderable mechanics.

The server's creative-pack speaks in names (ORBITAL_DRIFT, MASK_REVEAL,
SCHEMATIC_LAB). This module turns each name into a library entry that ffmpeg
and Pillow can actually execute, so the brain's decisions reach the render
instead of being printed and discarded. Names it doesn't recognise fall back to
token overlap, then to a deterministic pick - never to random.
"""

from __future__ import annotations

import random
import re

# Server preset name -> library id. Only the non-obvious ones need an entry;
# everything else resolves by token overlap.
SYNONYMS = {
    "animations": {
        "slow_push": "push_in", "orbital_drift": "camera_drift", "camera_orbit_sim": "camera_drift",
        "micro_parallax": "parallax", "depth_zoom": "depth_move", "diagonal_drift": "diagonal_move",
        "horizontal_pan_left": "horizontal_pan", "horizontal_pan_right": "horizontal_pan_r",
        "vertical_pan_up": "vertical_pan_up", "vertical_pan_down": "vertical_pan",
        "floating_card": "floating_cards", "particle_drift": "floating_cards",
        "glass_panel_entry": "masked_reveal", "data_line_motion": "layer_move",
        "whip_motion": "diagonal_move", "hero_reveal": "hero_rise",
        "micro_zoom": "slow_zoom", "slow_zoom_in": "slow_zoom", "macro_zoom": "push_in",
        "blur_reveal": "focus_shift", "light_sweep": "light_sweep", "text_reveal": "text_reveal",
    },
    "transitions": {
        "dip": "fade", "cross_dissolve": "dissolve", "directional_wipe": "slide_left",
        "light_flash": "flash_transition", "lens_flash": "flash_transition",
        "soft_white_flash": "light_reveal", "film_burn_sim": "light_reveal",
        "dark_cut": "fade", "whip_pan": "slide_right", "diagonal_reveal": "wipe_diagonal",
    },
    "effects": {
        "motion_blur": "focus_blur", "floating_dots": "floating_particles",
        "light_leak": "light_streak", "grain": "particle_dust",
    },
    "families": {
        "schematic_lab": "graphite_technical", "floating_ui": "futuristic_glass_lab",
        "cinematic_lab": "dark_cinematic_lab", "pharma_white": "clean_pharmaceutical",
        "dark_luxury": "black_luxury_corporate", "glass_science": "futuristic_glass_lab",
        "futuristic_lab": "future_pharma", "stainless_precision": "stainless_steel_lab",
    },
    "layouts": {
        "asymmetric_editorial": "L10_editorial_split", "bottom_stack": "L01_lower_stack",
        "side_panel": "L07_side_rail_left", "glass_card": "L09_glass_card",
        "top_title": "L03_upper_left", "floating_ui": "L09_glass_card",
    },
}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(name).strip().lower()).strip("_")


def _tokens(text: str) -> set[str]:
    return {t for t in re.split(r"[^a-z0-9]+", str(text).lower()) if len(t) > 2}


def _score(name: str, item: dict, kind: str) -> int:
    """How well one library entry answers the server's preset name."""
    key = slug(name)
    if SYNONYMS.get(kind, {}).get(key) == item.get("id"):
        return 100
    if item.get("id") == key:
        return 90
    overlap = len(_tokens(name) & (_tokens(item.get("id", "")) | _tokens(item.get("label", ""))))
    return overlap * 10


def _ranked(name: str, library: list[dict], kind: str) -> list[tuple[int, dict]]:
    scored = [(_score(name, item, kind), item) for item in library]
    scored.sort(key=lambda pair: (-pair[0], pair[1].get("id", "")))
    return scored


def resolve(name: str, library: list[dict], kind: str) -> dict:
    """Return the library entry that best represents the server's preset name."""
    if not library:
        raise ValueError(f"empty library for {kind}")
    ranked = _ranked(name, library, kind)
    if ranked[0][0] > 0:
        return ranked[0][1]
    return library[sum(ord(c) for c in slug(name)) % len(library)]


# How many entries a single preset name is allowed to reach, and how much less
# likely the widened ones are than the literal best match.
DEFAULT_POOL = 8
WIDENED_WEIGHT = 0.62


def candidates(name: str, library: list[dict], kind: str, pool: int = DEFAULT_POOL) -> list[dict]:
    """Every library entry that could honestly stand in for this preset name.

    The server brain only ever says a handful of words - four layout names
    covered 42 runs - so mapping each word to exactly one entry left 84% of the
    library unused. The best match and its near neighbours are all valid
    readings of the same intent, so they all belong in the pool.
    """
    if not library:
        raise ValueError(f"empty library for {kind}")
    ranked = _ranked(name, library, kind)
    if ranked[0][0] == 0:  # nothing matched - the whole library is fair game
        start = sum(ord(c) for c in slug(name)) % len(library)
        return [library[(start + i) % len(library)] for i in range(min(pool, len(library)))]
    top = [item for score, item in ranked if score == ranked[0][0]]
    chosen = list(top)
    for _, item in ranked[len(top):]:
        if len(chosen) >= max(pool, len(top)):
            break
        chosen.append(item)
    return chosen


def _recency_weight(item: dict, recent: list[str]) -> float:
    """An id used recently is heavily down-weighted, never excluded."""
    penalty = {value: index + 1 for index, value in enumerate(reversed(recent))}
    rank = penalty.get(item.get("id"))
    return 1.0 if rank is None else max(0.05, rank / (len(recent) + 1))


def rotate(items: list[dict], recent: list[str] | None = None, seed: str = "") -> dict:
    """Recency-weighted pick from a pool that is already the right shape."""
    if not items:
        raise ValueError("nothing to rotate")
    recent = list(recent or [])
    weights = [_recency_weight(item, recent) for item in items]
    return random.Random(seed).choices(items, weights=weights, k=1)[0]


def resolve_rotated(name: str, library: list[dict], kind: str,
                    recent: list[str] | None = None, seed: str = "",
                    pool: int = DEFAULT_POOL) -> dict:
    """Honour what the server brain asked for without repeating it forever.

    Picks inside the band of entries that all match the name, preferring the
    literal best match but steering away from whatever was used recently.
    """
    band = candidates(name, library, kind, pool)
    if len(band) == 1:
        return band[0]
    recent = list(recent or [])
    best_score = _ranked(name, library, kind)[0][0]
    weights = []
    for item in band:
        literal = 1.0 if _score(name, item, kind) == best_score and best_score > 0 else WIDENED_WEIGHT
        weights.append(literal * _recency_weight(item, recent))
    rng = random.Random(f"{seed}|{kind}|{slug(name)}")
    return rng.choices(band, weights=weights, k=1)[0]


def _mechanic(entry: dict) -> tuple:
    """What the viewer actually sees - two different names can render identically."""
    camera = entry.get("camera", {})
    z_from, z_to = float(camera.get("z_from", 1)), float(camera.get("z_to", 1))
    direction = (z_to > z_from) - (z_to < z_from)  # zoom in / hold / zoom out
    return (camera.get("type"), direction, camera.get("dir", 1))


def _distinct(a: dict, b: dict) -> bool:
    """Two zooms travelling the same way read as one motion repeated."""
    return _mechanic(a) != _mechanic(b)


def resolve_pair(names, library: list[dict]) -> tuple[dict, dict]:
    """Two motions that are visibly different.

    Names alone are not enough: MICRO_ZOOM and PARALLAX can both resolve onto
    the same camera move, which would render as one motion twice. The second
    pick is compared by mechanic, not by id.
    """
    names = list(names or [])
    first = resolve(names[0] if names else "slow_zoom", library, "animations")
    second = resolve(names[1] if len(names) > 1 else "push_in", library, "animations")
    return _separate(first, second, library, "")


def resolve_pair_rotated(names, library: list[dict], recent: list[str] | None = None,
                         seed: str = "", pool: int = DEFAULT_POOL) -> tuple[dict, dict]:
    """resolve_pair, but rotating inside each name's band (see resolve_rotated)."""
    names = list(names or [])
    recent = list(recent or [])
    first = resolve_rotated(names[0] if names else "slow_zoom", library, "animations",
                            recent, seed, pool)
    second = resolve_rotated(names[1] if len(names) > 1 else "push_in", library, "animations",
                             recent + [first["id"]], seed + "|b", pool)
    return _separate(first, second, library, seed)


def _separate(first: dict, second: dict, library: list[dict], seed: str) -> tuple[dict, dict]:
    if _distinct(first, second):
        return first, second
    alternatives = [item for item in library if _distinct(first, item)]
    if alternatives:
        second = alternatives[sum(ord(c) for c in first["id"] + seed) % len(alternatives)]
    return first, second
