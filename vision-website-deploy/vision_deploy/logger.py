"""Deployment log: written to deploy.log and mirrored to the UI in real time."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Callable, Optional

from vision_deploy.paths import get_log_file

LogCallback = Callable[[str], None]


class DeployLogger:
    def __init__(self, log_file: Optional[Path] = None, on_line: Optional[LogCallback] = None):
        self._log_file = log_file or get_log_file()
        self._on_line = on_line

    @property
    def log_file(self) -> Path:
        return self._log_file

    def line(self, message: str) -> None:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = f"[{timestamp}] {message}"

        self._log_file.parent.mkdir(parents=True, exist_ok=True)
        with self._log_file.open("a", encoding="utf-8") as f:
            f.write(entry + "\n")

        if self._on_line:
            self._on_line(entry)

    def section(self, title: str) -> None:
        self.line(f"--- {title} ---")
