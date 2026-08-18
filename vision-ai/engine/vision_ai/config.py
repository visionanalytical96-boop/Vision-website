"""Configuration loading and path resolution.

Order of precedence (highest first):
  1. environment variables  (VISION_AI_*)
  2. installed config       (/srv/vision-workspace/vision-ai/creative-pack/config/engine.json)
  3. bundled config         (<repo>/vision-ai/creative-pack/config/engine.json)

VISION_AI_ROOT prefixes every absolute path, which is what lets the test-suite
run the whole pipeline inside a sandbox without touching the real server.
"""

from __future__ import annotations

import copy
import json
import os
from pathlib import Path
from typing import Any

PACKAGE_ROOT = Path(__file__).resolve().parent
BUNDLE_ROOT = PACKAGE_ROOT.parents[1]  # <...>/vision-ai (repo) or <...>/brain (vendored)
INSTALLED_PACK = Path("/srv/vision-workspace/vision-ai/creative-pack")


def _find_bundled_pack() -> Path:
    """The library defaults travel with the engine, wherever it is vendored."""
    candidates = []
    if os.environ.get("VISION_AI_BUNDLED_PACK"):
        candidates.append(Path(os.environ["VISION_AI_BUNDLED_PACK"]))
    candidates += [
        PACKAGE_ROOT.parent / "creative-pack",   # vendored: <...>/brain/creative-pack
        BUNDLE_ROOT / "creative-pack",           # repo:     <...>/vision-ai/creative-pack
    ]
    for candidate in candidates:
        if (candidate / "config" / "engine.json").is_file():
            return candidate
    return BUNDLE_ROOT / "creative-pack"


BUNDLED_PACK = _find_bundled_pack()

_PATH_ENV = {
    "creative_pack": "VISION_AI_CREATIVE_PACK",
    "input_photos": "VISION_AI_INPUT_PHOTOS",
    "input_videos": "VISION_AI_INPUT_VIDEOS",
    "input_music": "VISION_AI_INPUT_MUSIC",
    "output_ready": "VISION_AI_OUTPUT_READY",
    "work_dir": "VISION_AI_WORK_DIR",
    "audio_dir": "VISION_AI_AUDIO_DIR",
    "asset_cache": "VISION_AI_ASSET_CACHE",
}


def _deep_merge(base: dict, override: dict) -> dict:
    out = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(out.get(key), dict):
            out[key] = _deep_merge(out[key], value)
        else:
            out[key] = value
    return out


def _sandbox(path: Path) -> Path:
    """Re-root an absolute path under VISION_AI_ROOT when that is set."""
    root = os.environ.get("VISION_AI_ROOT", "").strip()
    if not root:
        return path
    return Path(root) / str(path).lstrip("/")


def _config_file() -> Path | None:
    explicit = os.environ.get("VISION_AI_CONFIG", "").strip()
    if explicit:
        return Path(explicit)
    installed = _sandbox(INSTALLED_PACK / "config" / "engine.json")
    if installed.is_file():
        return installed
    return None


class Config:
    def __init__(self, overrides: dict[str, Any] | None = None) -> None:
        data = json.loads((BUNDLED_PACK / "config" / "engine.json").read_text())
        found = _config_file()
        if found and found.is_file() and found != (BUNDLED_PACK / "config" / "engine.json"):
            data = _deep_merge(data, json.loads(found.read_text()))
        if overrides:
            data = _deep_merge(data, overrides)
        self.data = data
        self.source = str(found) if found else str(BUNDLED_PACK / "config" / "engine.json")

    # -- sections -----------------------------------------------------
    @property
    def video(self) -> dict:
        return self.data["video"]

    @property
    def ollama(self) -> dict:
        return self.data["ollama"]

    @property
    def music(self) -> dict:
        return self.data["music"]

    @property
    def voice(self) -> dict:
        return self.data["voice"]

    @property
    def anti_repetition(self) -> dict:
        return self.data["anti_repetition"]

    @property
    def validation(self) -> dict:
        return self.data["validation"]

    # -- paths --------------------------------------------------------
    def path(self, key: str) -> Path:
        env = _PATH_ENV.get(key)
        if env and os.environ.get(env):
            return Path(os.environ[env]).expanduser()
        return _sandbox(Path(self.data["paths"][key]))

    @property
    def creative_pack(self) -> Path:
        """Installed creative pack when present, bundled copy otherwise."""
        configured = self.path("creative_pack")
        return configured if configured.is_dir() else BUNDLED_PACK

    @property
    def history_file(self) -> Path:
        return self.creative_pack / "history" / "design-history.jsonl"

    def ensure_runtime_dirs(self) -> None:
        """Create only the directories we write into. Existing dirs are reused."""
        for key in ("output_ready", "work_dir", "audio_dir"):
            self.path(key).mkdir(parents=True, exist_ok=True)
        self.history_file.parent.mkdir(parents=True, exist_ok=True)


def load_config(overrides: dict[str, Any] | None = None) -> Config:
    return Config(overrides)
