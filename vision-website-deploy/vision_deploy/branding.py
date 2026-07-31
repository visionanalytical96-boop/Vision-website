"""Colors and logo loading for the dark blue + cyan lab/server theme.

Ships without a real Vision logo - drop `logo.png` (and optionally
`icon.ico` for the window/taskbar icon) into the `assets/` folder next to
this package and they'll be picked up automatically. Until then a simple
generated placeholder (server rack glyph on a dark blue tile) is used so
the app looks intentional rather than broken.
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw

# Dark blue + cyan, "lab/server" palette.
COLOR_BACKGROUND = "#0A1420"
COLOR_SURFACE = "#0F1F33"
COLOR_SURFACE_ALT = "#13293F"
COLOR_BORDER = "#1E3A52"
COLOR_ACCENT = "#00D4FF"
COLOR_ACCENT_HOVER = "#33DDFF"
COLOR_TEXT = "#E5F6FF"
COLOR_TEXT_MUTED = "#7FA8C9"

COLOR_STATUS_CONNECTED = "#22D3A6"
COLOR_STATUS_DISCONNECTED = "#F5555F"
COLOR_STATUS_DEPLOYING = "#F5C542"


def assets_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "assets"


def logo_path() -> Optional[Path]:
    candidate = assets_dir() / "logo.png"
    return candidate if candidate.exists() else None


def icon_path() -> Optional[Path]:
    candidate = assets_dir() / "icon.ico"
    return candidate if candidate.exists() else None


def build_placeholder_logo(size: int = 160) -> Image.Image:
    """Draws a simple server-rack glyph so the UI has a logo even before
    Vision Analytical branding assets are added."""
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    pad = size * 0.12
    draw.rounded_rectangle(
        [pad, pad, size - pad, size - pad],
        radius=size * 0.14,
        fill=COLOR_SURFACE,
        outline=COLOR_ACCENT,
        width=max(2, size // 40),
    )

    rack_left = pad * 1.8
    rack_right = size - pad * 1.8
    rack_top = pad * 1.8
    row_height = (size - pad * 3.6) / 3
    gap = row_height * 0.18

    for i in range(3):
        top = rack_top + i * row_height
        bottom = top + row_height - gap
        draw.rounded_rectangle(
            [rack_left, top, rack_right, bottom],
            radius=row_height * 0.15,
            fill=COLOR_SURFACE_ALT,
            outline=COLOR_BORDER,
            width=max(1, size // 80),
        )
        dot_radius = row_height * 0.12
        dot_cx = rack_right - dot_radius * 2.2
        dot_cy = (top + bottom) / 2
        draw.ellipse(
            [dot_cx - dot_radius, dot_cy - dot_radius, dot_cx + dot_radius, dot_cy + dot_radius],
            fill=COLOR_ACCENT,
        )

    return image
