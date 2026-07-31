"""Filesystem locations used by the app.

Centralized so tests can monkeypatch a single function instead of chasing
os.path calls through every module.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

APP_DIR_NAME = "VisionWebsiteDeploy"


def get_app_data_dir() -> Path:
    """Per-user, writable directory for settings, logs and backups metadata.

    Uses %APPDATA% on Windows (the conventional location for portable apps
    that still need to persist local state) and falls back to a dotfile
    under the home directory elsewhere, so the same code runs on the
    Linux/macOS dev machines this is built and tested on.
    """
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or str(Path.home())
        app_dir = Path(base) / APP_DIR_NAME
    else:
        app_dir = Path.home() / f".{APP_DIR_NAME.lower()}"

    app_dir.mkdir(parents=True, exist_ok=True)
    return app_dir


def get_config_file() -> Path:
    return get_app_data_dir() / "config.enc"


def get_log_file() -> Path:
    return get_app_data_dir() / "deploy.log"


def get_default_website_folder() -> Path:
    if sys.platform == "win32":
        drive = os.environ.get("SystemDrive", "C:")
        return Path(f"{drive}\\VisionWebsite")
    return Path.home() / "VisionWebsite"
