"""Skills 19 + 20: Vision Analytical brand style and instrument marketing angles."""

from __future__ import annotations

BRAND_NAME = "Vision Analytical"
BRAND_TAGLINE = "Analytical Instruments - Service - Solutions"
BRAND_LINE_SHORT = "VISION ANALYTICAL"

# Claims stay factual and verifiable - no performance numbers are invented.
SERVICE_ANGLES = {
    "amc": {
        "eyebrow": "AMC / CMC",
        "angle": "Planned maintenance that keeps the instrument qualified and running.",
        "cta": "Ask for an AMC quotation",
    },
    "calibration": {
        "eyebrow": "CALIBRATION",
        "angle": "Traceable calibration with documented results.",
        "cta": "Book a calibration slot",
    },
    "qualification": {
        "eyebrow": "IQ / OQ / PQ",
        "angle": "Full qualification documentation for audit-ready laboratories.",
        "cta": "Request the qualification protocol",
    },
    "refurbishment": {
        "eyebrow": "REFURBISHMENT",
        "angle": "Fully reconditioned systems, tested against original specification.",
        "cta": "See available refurbished systems",
    },
    "spares": {
        "eyebrow": "SPARES & CONSUMABLES",
        "angle": "Genuine and compatible parts, held for fast dispatch.",
        "cta": "Send your part number",
    },
    "breakdown": {
        "eyebrow": "BREAKDOWN SUPPORT",
        "angle": "Engineer-led diagnosis and repair with minimum downtime.",
        "cta": "Raise a service call",
    },
    "relocation": {
        "eyebrow": "RELOCATION & INSTALLATION",
        "angle": "De-installation, transport and re-qualification handled end to end.",
        "cta": "Plan your instrument move",
    },
    "training": {
        "eyebrow": "OPERATOR TRAINING",
        "angle": "Hands-on training for analysts and QC teams.",
        "cta": "Schedule a training session",
    },
}

TECHNIQUE_ANGLES = {
    "hplc": "Reproducible separations for QC and R&D laboratories.",
    "gc": "Stable, repeatable gas chromatography for routine analysis.",
    "lcms": "Sensitive quantitation for trace and impurity work.",
    "gcms": "Confident identification and quantitation of volatiles.",
    "uv": "Fast, dependable UV-Vis measurement for routine QC.",
    "ir": "Rapid material identification and verification.",
    "aas": "Reliable elemental analysis for routine testing.",
    "icpms": "Trace elemental analysis at the lowest working levels.",
    "icpoes": "Multi-element analysis for high-throughput laboratories.",
    "ttr": "Consistent dissolution testing for formulation QC.",
    "kf": "Precise moisture determination for release testing.",
    "balance": "Accurate weighing that holds its calibration.",
}

DEFAULT_ANGLE = "Analytical instrument support for pharmaceutical and testing laboratories."

SPEC_CHIPS = {
    "hplc": ["Method transfer", "Column & consumables", "Preventive maintenance"],
    "gc": ["Inlet & detector service", "Carrier gas setup", "Column installation"],
    "lcms": ["Source cleaning", "Mass calibration", "Sensitivity check"],
    "gcms": ["Source cleaning", "Tune verification", "Leak check"],
    "uv": ["Wavelength accuracy", "Photometric check", "Lamp replacement"],
    "ir": ["Resolution check", "Signal-to-noise", "ATR maintenance"],
    "kf": ["Titre standardisation", "Electrode service", "Drift check"],
    "balance": ["Calibration", "Levelling & setup", "Routine verification"],
}
DEFAULT_CHIPS = ["Preventive maintenance", "Calibration", "Spares support"]

HASHTAG_POOL = [
    "#VisionAnalytical", "#AnalyticalInstruments", "#LaboratorySolutions",
    "#HPLC", "#GC", "#LCMS", "#GCMS", "#PharmaQC", "#LabLife",
    "#InstrumentService", "#Calibration", "#QualityControl",
]


def hashtags(technique_id: str, service_id: str, limit: int = 8) -> list[str]:
    tags = ["#VisionAnalytical", "#AnalyticalInstruments"]
    if technique_id:
        tag = "#" + technique_id.upper().replace("-", "")
        if tag not in tags:
            tags.append(tag)
    service_tags = {"amc": "#AMC", "calibration": "#Calibration", "qualification": "#IQOQPQ"}
    if service_id in service_tags:
        tags.append(service_tags[service_id])
    for tag in HASHTAG_POOL:
        if len(tags) >= limit:
            break
        if tag not in tags:
            tags.append(tag)
    return tags[:limit]
