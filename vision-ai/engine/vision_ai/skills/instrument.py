"""Skill 1 + 2: instrument identification and exact image-search query.

Rule that must never bend: the manufacturer and model the operator asked for
are the manufacturer and model that go into the query and onto the design.
A near-neighbour model is never substituted.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from ..library import Library

# "1260 Infinity II", "8890", "LC-2030C", "QP2020", "iS20"
_MODEL_TOKEN = re.compile(
    r"\b("
    r"[A-Za-z]{1,4}-?\d{2,5}[A-Za-z+]{0,3}"      # LC-2030C, QP2020, TQ-S, XPR205
    r"|\d{3,5}[A-Za-z+]{0,3}"                     # 1260, 7890B, 6500+
    r")\b"
)
_SUFFIX = re.compile(r"\b(infinity\s+(?:ii|iii)|ii|iii|nx|plus|core|series)\b", re.I)


@dataclass
class Instrument:
    manufacturer_id: str = ""
    manufacturer: str = ""
    model: str = ""
    technique_id: str = ""
    technique: str = ""
    technique_long: str = ""
    service_id: str = ""
    service: str = ""
    request: str = ""
    matched_known_model: bool = False
    warnings: list[str] = field(default_factory=list)

    @property
    def identified(self) -> bool:
        return bool(self.manufacturer and self.model)

    @property
    def display_name(self) -> str:
        parts = [p for p in (self.manufacturer, self.model, self.technique) if p]
        return " ".join(parts) if parts else "Laboratory Solutions"

    @property
    def slug(self) -> str:
        raw = "-".join(p for p in (self.manufacturer_id, self.model) if p)
        return re.sub(r"[^A-Za-z0-9]+", "-", raw).strip("-").lower() or "vision-analytical"

    def image_search_query(self) -> str:
        """Skill 2. Always carries the exact manufacturer + exact model."""
        parts = [p for p in (self.manufacturer, self.model) if p]
        if self.technique:
            parts.append(self.technique)
        parts.append("system")
        return " ".join(parts).strip()

    def to_dict(self) -> dict:
        return {
            "manufacturer": self.manufacturer or "Vision Analytical",
            "manufacturer_id": self.manufacturer_id,
            "instrument_model": self.model,
            "technique": self.technique,
            "technique_long": self.technique_long,
            "service": self.service,
            "image_search_query": self.image_search_query(),
        }


def _norm(text: str) -> str:
    """Lowercase and flatten separators so 'UV-1900i' and 'uv 1900i' compare equal."""
    return re.sub(r"\s+", " ", re.sub(r"[_\-./]+", " ", text or "").lower()).strip()


def _contains(haystack: str, needle: str, allow_suffix: bool = False) -> bool:
    """Whole-token containment - keeps 'hp' out of 'uhplc'.

    allow_suffix lets a model pattern match a lettered variant ('uv 1900' in
    'uv 1900i') while still refusing a longer number ('1200' in '12000').
    """
    needle = _norm(needle)
    if not needle:
        return False
    tail = r"(?![0-9])" if allow_suffix else r"(?![a-z0-9])"
    return re.search(rf"(?<![a-z0-9]){re.escape(needle)}{tail}", haystack) is not None


def identify(request: str, library: Library, filename_hints: list[str] | None = None) -> Instrument:
    """Parse an exact instrument identity out of the request (filenames as backup)."""
    kb = library.get("instruments")
    text = _norm(request)
    hint_text = " ".join(_norm(Path(h).stem) for h in (filename_hints or []))
    haystacks = [(text, False), (hint_text, True)]

    inst = Instrument(request=(request or "").strip())

    # manufacturer -------------------------------------------------
    for haystack, from_hint in haystacks:
        if inst.manufacturer_id:
            break
        for man in kb["manufacturers"]:
            if any(_contains(haystack, alias) for alias in man["aliases"]):
                inst.manufacturer_id, inst.manufacturer = man["id"], man["label"]
                if from_hint:
                    inst.warnings.append("manufacturer taken from input filename")
                break

    # known model (longest pattern first, so "1260 infinity ii" beats "1260")
    known = sorted(
        kb["known_models"],
        key=lambda m: max(len(_norm(p)) for p in m["patterns"]),
        reverse=True,
    )
    for haystack, from_hint in haystacks:
        if inst.model:
            break
        for entry in known:
            if inst.manufacturer_id and entry["manufacturer"] != inst.manufacturer_id:
                continue
            if any(_contains(haystack, pattern, allow_suffix=True) for pattern in entry["patterns"]):
                inst.model = entry["model"]
                inst.matched_known_model = True
                inst.technique_id = entry["technique"]
                if not inst.manufacturer_id:
                    inst.manufacturer_id = entry["manufacturer"]
                    man = next(m for m in kb["manufacturers"] if m["id"] == entry["manufacturer"])
                    inst.manufacturer = man["label"]
                if from_hint:
                    inst.warnings.append("model taken from input filename")
                break

    # free-form model token (unknown model -> keep the operator's exact string)
    if not inst.model:
        for haystack, from_hint in haystacks:
            match = _MODEL_TOKEN.search(haystack)
            if not match:
                continue
            model = match.group(1).upper()
            tail = haystack[match.end():match.end() + 24]
            suffix = _SUFFIX.search(tail)
            if suffix:
                model = f"{model} {suffix.group(1).title()}"
            inst.model = model
            if from_hint:
                inst.warnings.append("model taken from input filename")
            break

    # technique ----------------------------------------------------
    if not inst.technique_id:
        for tech in kb["techniques"]:
            if any(_contains(text, a) for a in tech["aliases"]):
                inst.technique_id = tech["id"]
                break
    if inst.technique_id:
        tech = next(t for t in kb["techniques"] if t["id"] == inst.technique_id)
        inst.technique, inst.technique_long = tech["label"], tech["long"]

    # service ------------------------------------------------------
    for svc in kb["services"]:
        if any(_contains(text, k) for k in svc["keywords"]):
            inst.service_id, inst.service = svc["id"], svc["label"]
            break

    if not inst.manufacturer:
        inst.warnings.append("no manufacturer identified - design will not show a branded instrument")
    if not inst.model:
        inst.warnings.append("no model identified - image search query is incomplete")
    return inst
