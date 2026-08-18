"""Skills 12 + 13 (script) + 19: caption, on-design copy and voice script.

Local templates produce every line first. Ollama, when it is reachable, is
asked for at most four very short strings and any answer that fails validation
is thrown away - so copy quality never depends on the model being up.
"""

from __future__ import annotations

import random
import re
from dataclasses import dataclass, field

from . import brand
from .instrument import Instrument
from .ollama_client import OllamaClient

HEADLINES = {
    "amc": ["Maintenance that keeps you running", "Cover the instrument, protect the schedule", "Planned service, predictable uptime"],
    "calibration": ["Calibrated. Documented. Ready.", "Accuracy you can evidence", "Calibration that stands up to audit"],
    "qualification": ["Qualified and audit-ready", "IQ, OQ, PQ - completed properly", "Documentation your auditor expects"],
    "refurbishment": ["Refurbished to specification", "A second life, fully tested", "Reconditioned. Verified. Delivered."],
    "spares": ["Parts in stock, dispatched fast", "The part you need, when you need it", "Spares that keep the run going"],
    "breakdown": ["Down today, running tomorrow", "Engineer-led fault resolution", "Fast diagnosis, real repair"],
    "relocation": ["Moved, installed, re-qualified", "Relocation handled end to end", "Your instrument, safely re-sited"],
    "training": ["Trained analysts, better data", "Hands-on operator training", "Confidence at the keyboard"],
}
DEFAULT_HEADLINES = [
    "Precision, supported",
    "Built for reliable results",
    "Analytical performance, maintained",
    "Laboratory performance you can trust",
    "Engineered for consistent results",
]
SUBHEADS = [
    "Sales - Service - Spares - Qualification",
    "Supported by Vision Analytical engineers",
    "Installation, service and qualification",
    "Nationwide analytical instrument support",
]


@dataclass
class CopyPack:
    eyebrow: str = ""
    headline: str = ""
    subhead: str = ""
    chips: list[str] = field(default_factory=list)
    cta: str = ""
    scene2_headline: str = ""
    caption: str = ""
    voice_script: str = ""
    source: str = "local"
    ollama_seconds: float = 0.0


def _rng(seed_text: str) -> random.Random:
    return random.Random(seed_text)


def _protects_identity(text: str, instrument: Instrument) -> bool:
    """Reject generated copy that introduces a model number we did not ask for."""
    allowed = set(re.findall(r"\d{2,5}", instrument.model or ""))
    return all(number in allowed for number in re.findall(r"\d{2,5}", text))


def build(
    instrument: Instrument,
    design: dict,
    client: OllamaClient | None = None,
    use_ollama: bool = True,
) -> CopyPack:
    rng = _rng(design.get("design_fingerprint", "") or instrument.display_name)
    service = brand.SERVICE_ANGLES.get(instrument.service_id, {})
    angle = service.get("angle") or brand.TECHNIQUE_ANGLES.get(instrument.technique_id, brand.DEFAULT_ANGLE)

    pack = CopyPack()
    pack.eyebrow = service.get("eyebrow") or (instrument.technique.upper() if instrument.technique else brand.BRAND_LINE_SHORT)
    pack.headline = rng.choice(HEADLINES.get(instrument.service_id, DEFAULT_HEADLINES))
    pack.subhead = angle
    pack.chips = list(brand.SPEC_CHIPS.get(instrument.technique_id, brand.DEFAULT_CHIPS))
    pack.cta = service.get("cta") or "Talk to Vision Analytical"
    pack.scene2_headline = instrument.display_name if instrument.identified else brand.BRAND_TAGLINE

    if client is not None and use_ollama and client.available():
        headline = client.ask(
            f"Write one Instagram headline of at most 6 words for a {instrument.display_name} "
            f"laboratory instrument post. Return only the headline.",
            max_words=6,
        )
        if headline.ok and _protects_identity(headline.text, instrument):
            pack.headline, pack.source = headline.text, "ollama"
        cta = client.ask(
            f"Write one call to action of at most 5 words for a laboratory instrument service post. "
            f"Return only the call to action.",
            max_words=5,
            num_predict=20,
        )
        if cta.ok and _protects_identity(cta.text, instrument):
            pack.cta, pack.source = cta.text, "ollama"
        pack.ollama_seconds = round(sum(call["seconds"] for call in client.calls), 2)

    pack.caption = caption(instrument, pack)
    pack.voice_script = voice_script(instrument, pack)
    return pack


def caption(instrument: Instrument, pack: CopyPack) -> str:
    """Skill 12. Short, professional, no AI paragraphs."""
    lines = [f"{pack.headline}."]
    if instrument.identified:
        lines.append(f"{instrument.manufacturer} {instrument.model}"
                     + (f" | {instrument.technique_long}" if instrument.technique_long else ""))
    lines.append(pack.subhead)
    lines.append("")
    lines.extend(f"- {chip}" for chip in pack.chips)
    lines.append("")
    lines.append(f"{pack.cta}.")
    lines.append(f"{brand.BRAND_NAME} | {brand.BRAND_TAGLINE}")
    lines.append("")
    lines.append(" ".join(brand.hashtags(instrument.technique_id, instrument.service_id)))
    return "\n".join(lines)


def voice_script(instrument: Instrument, pack: CopyPack) -> str:
    """Skill 13 (script half). Around 35 words - roughly 14 seconds of speech."""
    subject = instrument.display_name if instrument.identified else "your analytical instruments"
    return (
        f"{pack.headline}. "
        f"Vision Analytical supports {subject} with {pack.chips[0].lower()}, "
        f"{pack.chips[1].lower()} and {pack.chips[2].lower()}. "
        f"{pack.cta}."
    )
