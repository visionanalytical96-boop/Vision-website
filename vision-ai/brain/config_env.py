"""Reader for the operator's own creative-pack/config.env.

That file is already the contract for this system (TIMER=OFF,
EXACT_MODEL_IMAGE_REQUIRED=1, RECENT_DESIGNS_BLOCK=1000, PHONE_VIDEO_*).
The engine simply never honoured it. Everything the brain does is driven from
here, so editing config.env on the server changes behaviour with no code edit.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

DEFAULT_ENV = Path("/srv/vision-workspace/vision-ai/creative-pack/config.env")

_LINE = re.compile(r"^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$")


# Settings a run may override from the environment. Everything the brain reads
# begins with one of these, so nothing unrelated to this system can leak in.
OVERRIDABLE_PREFIXES = (
    "VOICE", "BRAND_", "WEBSITE", "REEL_", "BRAIN_", "LOGO_", "MUSIC_",
    "TURBO_", "FAST_", "EXACT_", "PIPER_", "NEXTCLOUD_", "META_", "IG_",
    "INSTAGRAM_", "VISION_",
)


def load(path: Path | str | None = None) -> dict[str, str]:
    path = Path(path or os.environ.get("VISION_AI_CONFIG_ENV") or DEFAULT_ENV)
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = _LINE.match(line)
        if match:
            values[match.group(1)] = match.group(2).strip().strip('"').strip("'")

    # A setting given on the command line wins for that one run, so an option
    # can be tried without editing the file. Silently ignoring it - which is
    # what happened before - looks exactly like the option not working.
    for key, value in os.environ.items():
        if key in values or key.startswith(OVERRIDABLE_PREFIXES):
            values[key] = value
    return values


def flag(env: dict[str, str], key: str, default: bool = False) -> bool:
    raw = env.get(key)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def number(env: dict[str, str], key: str, default: float) -> float:
    try:
        return float(env[key])
    except (KeyError, TypeError, ValueError):
        return default


def to_overrides(env: dict[str, str]) -> dict:
    """Translate config.env into vision_ai config overrides."""
    pack = env.get("VISION_AI_PACK", str(DEFAULT_ENV.parent))
    overrides: dict = {
        "paths": {"creative_pack": pack},
        "video": {
            "width": int(number(env, "PHONE_VIDEO_WIDTH", 1080)),
            "height": int(number(env, "PHONE_VIDEO_HEIGHT", 1920)),
            "fps": int(number(env, "PHONE_VIDEO_FPS", 30)),
            "duration": number(env, "PHONE_VIDEO_SECONDS", 15.0),
        },
        "anti_repetition": {
            "history_window": int(number(env, "RECENT_DESIGNS_BLOCK", 1000)),
            "structure_block_window": int(number(env, "RECENT_STRUCTURE_BLOCK", 10)),
        },
        "ollama": {
            "model": env.get("OLLAMA_MODEL", "qwen2.5:1.5b"),
            "url": env.get("OLLAMA_URL", "http://127.0.0.1:11434"),
            "enabled": flag(env, "OLLAMA_ENABLED", True),
            "timeout_seconds": number(env, "OLLAMA_TIMEOUT", 8),
        },
    }
    if env.get("DESIGN_HISTORY"):
        overrides["paths"]["history_file"] = env["DESIGN_HISTORY"]
    if env.get("OUTPUT_READY"):
        overrides["paths"]["output_ready"] = env["OUTPUT_READY"]
    return overrides
