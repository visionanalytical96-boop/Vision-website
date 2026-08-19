"""Campaign selection: what this post is actually selling.

Ten campaign types - website help, sales, refurbished, service, AMC/CMC,
qualification, spares, calibration, training, relocation. The request picks one
when it names one ("AMC for..."), otherwise the least recently used campaign is
taken from history, so the feed keeps moving through the whole range instead of
posting the same message every day.
"""

from __future__ import annotations

import random
import re
from pathlib import Path

DEFAULT_WEBSITE = "visionanalytical.in"


def load(library) -> list[dict]:
    from vision_ai.library import LIBRARIES  # noqa: F401  (kept for symmetry)
    import json
    from vision_ai.config import BUNDLED_PACK

    pack = Path(library.pack) / "skills" / "campaigns.json"
    if not pack.is_file():
        pack = BUNDLED_PACK / "skills" / "campaigns.json"
    return json.loads(pack.read_text())["campaigns"]


def from_request(request: str, campaigns: list[dict]) -> dict | None:
    text = re.sub(r"[^a-z0-9 ]+", " ", (request or "").lower())
    best, best_score = None, 0
    for campaign in campaigns:
        score = sum(1 for word in campaign["keywords"]
                    if re.search(rf"(?<![a-z]){re.escape(word)}(?![a-z])", text))
        if score > best_score:
            best, best_score = campaign, score
    return best


def choose(request: str, campaigns: list[dict], recent: list[str], seed: str = "") -> tuple[dict, str]:
    """Returns (campaign, why). Explicit beats rotation; rotation beats random."""
    named = from_request(request, campaigns)
    if named:
        return named, "named in the request"
    unused = [c for c in campaigns if c["id"] not in recent]
    pool = unused or campaigns
    rng = random.Random(seed or request)
    return rng.choice(pool), ("rotated - not used recently" if unused else "rotated")


def fill(text: str, instrument, website: str) -> str:
    return (text.replace("{instrument}", instrument.display_name or "your instrument")
                .replace("{manufacturer}", instrument.manufacturer or "your")
                .replace("{website}", website))


def copy_for(campaign: dict, instrument, website: str, seed: str) -> dict:
    """One reading of this campaign - a different one next time."""
    rng = random.Random(f"{seed}{campaign['id']}")
    return {
        "campaign": campaign["id"],
        "campaign_label": campaign["label"],
        "eyebrow": campaign["eyebrow"],
        "headline": fill(rng.choice(campaign["headlines"]), instrument, website),
        "subhead": fill(rng.choice(campaign["subheads"]), instrument, website),
        "chips": [fill(chip, instrument, website) for chip in campaign["chips"]],
        "cta": fill(rng.choice(campaign["ctas"]), instrument, website),
        "voice": fill(rng.choice(campaign["voice"]), instrument, website),
    }
