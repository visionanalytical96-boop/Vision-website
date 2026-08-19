"""Map the server brain's preset names onto renderable mechanics.

The server's creative-pack speaks in names (ORBITAL_DRIFT, MASK_REVEAL,
SCHEMATIC_LAB). This module turns each name into a library entry that ffmpeg
and Pillow can actually execute, so the brain's decisions reach the render
instead of being printed and discarded. Names it doesn't recognise fall back to
token overlap, then to a deterministic pick - never to random.
"""

from __future__ import annotations

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


def resolve(name: str, library: list[dict], kind: str) -> dict:
    """Return the library entry that best represents the server's preset name."""
    if not library:
        raise ValueError(f"empty library for {kind}")
    key = slug(name)

    target = SYNONYMS.get(kind, {}).get(key)
    if target:
        for item in library:
            if item.get("id") == target:
                return item

    for item in library:  # exact id match (the converted pack keeps their names)
        if item.get("id") == key:
            return item

    wanted = _tokens(name)
    best, best_score = None, 0
    for item in library:
        score = len(wanted & (_tokens(item.get("id", "")) | _tokens(item.get("label", ""))))
        if score > best_score:
            best, best_score = item, score
    if best is not None:
        return best

    return library[sum(ord(c) for c in key) % len(library)]


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
    if not _distinct(first, second):
        alternatives = [item for item in library if _distinct(first, item)]
        if alternatives:
            second = alternatives[sum(ord(c) for c in first["id"]) % len(alternatives)]
    return first, second
