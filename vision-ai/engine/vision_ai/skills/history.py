"""Skill 17 + 4 (storage half): persistent design memory and fingerprints.

One JSONL line per successful generation. The file is append-only; nothing is
ever rewritten or deleted by the engine.
"""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any, Iterable

# Order matters: the fingerprint is a stable hash over exactly these fields.
FINGERPRINT_FIELDS = (
    "manufacturer",
    "instrument_model",
    "design_family",
    "background",
    "composition",
    "color_palette",
    "layout",
    "typography",
    "camera",
    "animation_1",
    "animation_2",
    "transition",
    "effect",
    "music_style",
    "voice_style",
)

STRUCTURE_FIELDS = ("background", "composition", "layout")


def fingerprint(design: dict[str, Any]) -> str:
    """Skill: deterministic design fingerprint (SHA-256 over the design fields)."""
    payload = "|".join(str(design.get(field, "")).strip().lower() for field in FINGERPRINT_FIELDS)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def structure_key(design: dict[str, Any]) -> str:
    return "|".join(str(design.get(field, "")).strip().lower() for field in STRUCTURE_FIELDS)


class DesignHistory:
    """Reads the tail of design-history.jsonl and appends new records."""

    def __init__(self, path: Path, window: int = 1000) -> None:
        self.path = Path(path)
        self.window = window
        self.records: list[dict] = self._load()

    def _load(self) -> list[dict]:
        if not self.path.is_file():
            return []
        records: list[dict] = []
        with self.path.open("r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                line = line.strip()
                if not line:
                    continue
                try:
                    records.append(json.loads(line))
                except json.JSONDecodeError:
                    continue  # a truncated line must never stop a generation
        return records[-self.window:]

    # -- queries ------------------------------------------------------
    @property
    def fingerprints(self) -> set[str]:
        return {r.get("design_fingerprint", "") for r in self.records}

    def recent_structures(self, count: int) -> set[str]:
        return {structure_key(r) for r in self.records[-count:]} if count else set()

    def recent_values(self, field: str, count: int) -> list[str]:
        return [str(r.get(field, "")) for r in self.records[-count:] if r.get(field)]

    def usage_counts(self, field: str) -> dict[str, int]:
        counts: dict[str, int] = {}
        for record in self.records:
            value = record.get(field)
            if value:
                counts[str(value)] = counts.get(str(value), 0) + 1
        return counts

    def is_repeat(self, design: dict, structure_window: int) -> bool:
        if design.get("design_fingerprint") in self.fingerprints:
            return True
        return structure_key(design) in self.recent_structures(structure_window)

    # -- writes -------------------------------------------------------
    def append(self, record: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        line = json.dumps(record, ensure_ascii=False, sort_keys=True)
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
            handle.flush()
            os.fsync(handle.fileno())
        self.records.append(record)
        self.records = self.records[-self.window:]

    def prune_to(self, keep: int, backup: bool = True) -> int:
        """Operator utility: trim the file to its last `keep` lines. Never called
        automatically."""
        if not self.path.is_file():
            return 0
        lines = self.path.read_text(encoding="utf-8", errors="replace").splitlines()
        if len(lines) <= keep:
            return len(lines)
        if backup:
            self.path.with_suffix(self.path.suffix + ".bak").write_text("\n".join(lines) + "\n")
        fd, tmp = tempfile.mkstemp(dir=str(self.path.parent))
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write("\n".join(lines[-keep:]) + "\n")
        os.replace(tmp, self.path)
        self.records = self._load()
        return keep


def iter_history(path: Path) -> Iterable[dict]:
    if not Path(path).is_file():
        return []
    with Path(path).open("r", encoding="utf-8", errors="replace") as handle:
        for line in handle:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    continue
