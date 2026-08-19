"""Skills 6, 9, 10, 13 (still half): Pillow renderer for frames and posts.

One renderer builds every still: the reel's two scene frames, the square post,
the portrait post and the story. Backgrounds, layouts, palettes, typography and
the still-stage effects all come from the creative pack, so the visual language
rotates without touching this file.
"""

from __future__ import annotations

import math
import random
import re
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import brand

BASE_WIDTH = 1080  # every geometry constant below is expressed at this width

FALLBACK_FONTS = {
    True: [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ],
    False: [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
    ],
}


@lru_cache(maxsize=64)
def _fc_match(family: str, bold: bool) -> str | None:
    try:
        pattern = f"{family}:{'bold' if bold else 'regular'}"
        out = subprocess.run(
            ["fc-match", "-f", "%{file}", pattern],
            capture_output=True, text=True, timeout=5, check=False,
        ).stdout.strip()
        return out or None
    except (OSError, subprocess.SubprocessError):
        return None


@lru_cache(maxsize=128)
def _font_path(families: tuple[str, ...], bold: bool) -> str:
    """Resolve a font family list against the host, with hard fallbacks."""
    for family in families:
        path = _fc_match(family, bold)
        if path and Path(path).is_file() and family.split()[0].lower() in Path(path).stem.lower().replace("-", ""):
            return path
    for family in families:
        path = _fc_match(family, bold)
        if path and Path(path).is_file():
            return path
    for path in FALLBACK_FONTS[bold]:
        if Path(path).is_file():
            return path
    raise RuntimeError("no usable TrueType font found on this host")


def load_font(families: list[str], size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(_font_path(tuple(families), bold), max(8, int(size)))


def hex_rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))  # type: ignore[return-value]


def linear_gradient(size: tuple[int, int], c1, c2, angle_deg: float = 115.0) -> Image.Image:
    """Cheap CPU gradient: build it small, then resample up."""
    w, h = size
    small = Image.new("RGB", (64, 64))
    pixels = small.load()
    rad = math.radians(angle_deg)
    dx, dy = math.cos(rad), math.sin(rad)
    norm = abs(dx) + abs(dy)
    for y in range(64):
        for x in range(64):
            t = ((x / 63) * dx + (y / 63) * dy + (abs(min(dx, 0)) + abs(min(dy, 0)))) / norm
            pixels[x, y] = mix(c1, c2, min(1.0, max(0.0, t)))
    return small.resize((w, h), Image.LANCZOS)


def radial_spot(size, base, spot, cx=0.5, cy=0.38, radius=0.75) -> Image.Image:
    w, h = size
    small_w, small_h = 96, int(96 * h / w)
    layer = Image.new("RGB", (small_w, small_h), base)
    pixels = layer.load()
    for y in range(small_h):
        for x in range(small_w):
            dx = (x / small_w - cx) * 1.0
            dy = (y / small_h - cy) * (small_h / small_w) * (w / h)
            dist = math.sqrt(dx * dx + dy * dy) / radius
            pixels[x, y] = mix(spot, base, min(1.0, dist ** 1.4))
    return layer.resize((w, h), Image.LANCZOS)


def vignette(image: Image.Image, strength: float) -> Image.Image:
    if strength <= 0:
        return image
    w, h = image.size
    mask = Image.new("L", (96, 96), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((-18, -18, 114, 114), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(18)).resize((w, h), Image.LANCZOS)
    dark = Image.new("RGB", (w, h), (0, 0, 0))
    return Image.composite(image, Image.blend(image, dark, min(0.9, strength)), mask)


def _trim_logo(mark: Image.Image) -> Image.Image:
    """Cut the empty margin baked into most logo files.

    Without this the logo looks tiny: the file is mostly padding, so scaling to
    a share of the frame scales the padding too.
    """
    alpha = mark.getchannel("A")
    box = alpha.point(lambda value: 255 if value > 12 else 0).getbbox()
    if box is None or alpha.getextrema()[0] > 250:
        # opaque file: trim the near-white (or near-black) border instead
        grey = mark.convert("L")
        corner = grey.getpixel((0, 0))
        threshold = 245 if corner > 200 else 12
        mask = grey.point(lambda value: 0 if (value >= threshold if corner > 200 else value <= threshold) else 255)
        box = mask.getbbox()
    return mark.crop(box) if box else mark


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def draw_tracked(draw: ImageDraw.ImageDraw, xy, text, font, fill, tracking: float = 0.0, anchor_right=False):
    """Letter-spaced text (Pillow has no tracking of its own)."""
    x, y = xy
    if abs(tracking) < 0.05:
        draw.text((x, y), text, font=font, fill=fill)
        return draw.textlength(text, font=font)
    width = sum(draw.textlength(ch, font=font) + tracking for ch in text) - tracking
    if anchor_right:
        x -= width
    for char in text:
        draw.text((x, y), char, font=font, fill=fill)
        x += draw.textlength(char, font=font) + tracking
    return width


def text_width(draw, text, font, tracking=0.0) -> float:
    if abs(tracking) < 0.05:
        return draw.textlength(text, font=font)
    return sum(draw.textlength(ch, font=font) + tracking for ch in text) - tracking


def wrap(draw, text: str, font, max_width: float, tracking: float = 0.0) -> list[str]:
    words, lines, current = text.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if text_width(draw, candidate, font, tracking) <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def apply_case(text: str, case: str) -> str:
    if case == "upper":
        return text.upper()
    if case == "title":
        return text
    return text


@dataclass
class SceneCopy:
    eyebrow: str = ""
    headline: str = ""
    subhead: str = ""
    chips: tuple[str, ...] = ()
    cta: str = ""
    footer: str = ""


class Renderer:
    """Renders one design at any output size."""

    def __init__(self, design: dict, palette: dict, layout: dict, composition: dict,
                 background: dict, typography: dict, effect: dict, photo: Path | None,
                 seed: str = "", ghost: str = "", logo: Path | None = None) -> None:
        self.design = design
        self.palette = palette
        self.layout = layout
        self.composition = composition
        self.background = background
        self.typography = typography
        self.effect = effect
        self.photo = photo
        self.ghost = ghost
        self.logo = Path(logo) if logo else None
        self.rng = random.Random(seed or design.get("design_fingerprint", ""))
        self.c_bg1 = hex_rgb(palette["bg1"])
        self.c_bg2 = hex_rgb(palette["bg2"])
        self.c_accent = hex_rgb(palette["accent"])
        self.c_text = hex_rgb(palette["text"])
        self.c_dim = hex_rgb(palette["text_dim"])
        self.c_panel = hex_rgb(palette["panel"])
        self.dark = bool(palette.get("dark"))

    # -- background ---------------------------------------------------
    def _background(self, size: tuple[int, int], variant: int) -> Image.Image:
        w, h = size
        style = self.background.get("style", "soft_gradient")
        angle = 115 + (25 * variant) + self.rng.uniform(-12, 12)
        if style == "spot_gradient":
            image = radial_spot(size, self.c_bg1, mix(self.c_bg2, self.c_accent, 0.18),
                                cx=0.5 + 0.08 * variant, cy=0.36)
        elif style == "depth_blur":
            image = linear_gradient(size, self.c_bg2, self.c_bg1, angle)
            image = image.filter(ImageFilter.GaussianBlur(max(2, w // 120)))
        else:
            image = linear_gradient(size, self.c_bg1, self.c_bg2, angle)

        draw = ImageDraw.Draw(image, "RGBA")
        s = w / BASE_WIDTH
        line = (*mix(self.c_text, self.c_bg1, 0.72), 70 if self.dark else 45)

        if style == "technical_grid":
            step = int(72 * s)
            for x in range(0, w, step):
                draw.line([(x, 0), (x, h)], fill=line, width=max(1, int(s)))
            for y in range(0, h, step):
                draw.line([(0, y), (w, y)], fill=line, width=max(1, int(s)))
        elif style == "glass_panels":
            for index in range(3):
                pw, ph = int(w * self.rng.uniform(0.4, 0.75)), int(h * self.rng.uniform(0.18, 0.34))
                px = int(self.rng.uniform(-0.1, 0.6) * w)
                py = int((0.12 + 0.26 * index) * h)
                panel = Image.new("RGBA", (pw, ph), (*self.c_panel, 46))
                image.paste(panel, (px, py), panel)
                draw.rounded_rectangle((px, py, px + pw, py + ph), radius=int(28 * s),
                                       outline=(*self.c_accent, 60), width=max(1, int(2 * s)))
        elif style == "brushed_metal":
            for y in range(0, h, max(2, int(3 * s))):
                shade = self.rng.randint(-10, 10)
                draw.line([(0, y), (w, y)], fill=(*mix(self.c_bg2, self.c_bg1, 0.5 + shade / 100), 40), width=1)
        elif style == "split_field":
            split = int(h * (0.52 + 0.06 * variant))
            draw.rectangle((0, split, w, h), fill=(*mix(self.c_bg2, self.c_text, 0.10), 255))
            draw.line([(0, split), (w, split)], fill=(*self.c_accent, 180), width=max(2, int(3 * s)))

        return vignette(image, float(self.background.get("vignette", 0.3)))

    # -- instrument ---------------------------------------------------
    def _ghost_mark(self, canvas: Image.Image, variant: int) -> None:
        """Typographic hero used when no authentic photograph is available - the
        engine shows the instrument's name rather than someone else's hardware."""
        w, h = canvas.size
        s = w / BASE_WIDTH
        draw = ImageDraw.Draw(canvas, "RGBA")
        cx, cy = w * 0.5, h * (0.34 + 0.02 * variant)
        radius = w * (0.30 + 0.02 * variant)
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius),
                     outline=(*self.c_accent, 90), width=max(2, int(3 * s)))
        draw.ellipse((cx - radius * 0.72, cy - radius * 0.72, cx + radius * 0.72, cy + radius * 0.72),
                     outline=(*self.c_text, 45), width=max(1, int(2 * s)))
        text = (self.ghost or brand.BRAND_LINE_SHORT).upper()
        families = self.typography.get("headline", ["DejaVu Sans"])
        font = load_font(families, int(64 * s), bold=True)
        lines = wrap(draw, text, font, radius * 1.7, 2 * s)
        while len(lines) > 3 and font.size > int(30 * s):
            font = load_font(families, int(font.size * 0.85), bold=True)
            lines = wrap(draw, text, font, radius * 1.7, 2 * s)
        y = cy - (len(lines) * font.size * 1.2) / 2
        for line in lines:
            width = text_width(draw, line, font, 2 * s)
            draw_tracked(draw, (cx - width / 2, y), line, font, (*self.c_text, 205), 2 * s)
            y += font.size * 1.2

    def photo_box(self, size: tuple[int, int], variant: int) -> tuple[int, int, int, int] | None:
        """Where the instrument will sit, in this frame's pixels. The text layer
        uses it to stay off the instrument."""
        if not self.photo or not Path(self.photo).is_file():
            return None
        try:
            with Image.open(self.photo) as probe:
                photo_w, photo_h = probe.size
        except OSError:
            return None
        w, h = size
        subject = self.composition.get("subject", {"x": 0.5, "y": 0.44, "scale": 0.86})
        # Text-heavy layouts (spec lists, panels) get a smaller instrument so the
        # copy keeps a usable type size instead of shrinking to fit.
        heavy = bool(self.layout.get("specs") or self.layout.get("panel"))
        scale = subject["scale"] * (1.0 + 0.05 * variant) * (0.86 if heavy else 1.0)
        box_w = int(w * min(0.98, 0.94 * scale))
        box_h = int(h * min(0.52 if heavy else 0.68, 0.55 * scale))
        ratio = min(box_w / photo_w, box_h / photo_h)
        target_w, target_h = max(2, int(photo_w * ratio)), max(2, int(photo_h * ratio))
        cx, cy = int(w * subject["x"]), int(h * subject["y"])
        px, py = cx - target_w // 2, cy - target_h // 2
        return px, py, px + target_w, py + target_h

    def _place_photo(self, canvas: Image.Image, variant: int) -> None:
        if not self.photo or not Path(self.photo).is_file():
            self._ghost_mark(canvas, variant)
            return
        try:
            opened = Image.open(self.photo)
            # A cutout keeps its alpha, so the instrument sits on the design
            # rather than inside a photographic rectangle.
            photo = opened.convert("RGBA") if opened.mode in ("RGBA", "LA", "P") else opened.convert("RGB")
        except OSError:
            return
        transparent = photo.mode == "RGBA" and photo.getchannel("A").getextrema()[0] < 250
        w, h = canvas.size
        s = w / BASE_WIDTH
        comp = self.composition
        subject = comp.get("subject", {"x": 0.5, "y": 0.44, "scale": 0.86})
        box = self.photo_box(canvas.size, variant)
        if box is None:
            return
        photo = photo.resize((box[2] - box[0], box[3] - box[1]), Image.LANCZOS)

        if self.effect.get("id") == "focus_blur":
            photo = photo.filter(ImageFilter.GaussianBlur(0.8 * s))

        radius = int(26 * s)
        mask = photo.getchannel("A") if transparent else rounded_mask(photo.size, radius)
        if comp.get("rotate"):
            photo = photo.rotate(comp["rotate"], resample=Image.BICUBIC, expand=True)
            mask = mask.rotate(comp["rotate"], resample=Image.BICUBIC, expand=True)

        px, py = box[0], box[1]

        shadow_strength = comp.get("shadow", 0.35 if self.dark else 0.25)
        if self.effect.get("id") == "depth_shadow":
            shadow_strength = max(shadow_strength, self.effect.get("strength", 0.6))
        if shadow_strength > 0:
            shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            blob = Image.new("RGBA", photo.size, (0, 0, 0, int(190 * shadow_strength)))
            shadow.paste(blob, (px, py + int(18 * s)), mask)
            shadow = shadow.filter(ImageFilter.GaussianBlur(int(26 * s)))
            canvas.alpha_composite(shadow)

        layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        layer.paste(photo.convert("RGB"), (px, py), mask)
        canvas.alpha_composite(layer)

        draw = ImageDraw.Draw(canvas, "RGBA")
        if transparent:
            return  # no frame or fade around a cutout - it is not a photo card
        if self.effect.get("id") in {"edge_light", "metallic_highlight", "glass"}:
            draw.rounded_rectangle((px, py, px + photo.width, py + photo.height), radius=radius,
                                   outline=(*self.c_accent, 130), width=max(2, int(2.5 * s)))
        if comp.get("id") == "emerging_from_dark" or self.background.get("style") == "spot_gradient":
            fade = Image.new("RGBA", (photo.width, int(photo.height * 0.4)), (0, 0, 0, 0))
            fade_draw = ImageDraw.Draw(fade)
            for i in range(fade.height):
                alpha = int(180 * (i / fade.height) ** 1.6)
                fade_draw.line([(0, i), (fade.width, i)], fill=(*self.c_bg1, alpha))
            canvas.alpha_composite(fade, (px, py + photo.height - fade.height))

    # -- still effects ------------------------------------------------
    def _still_effect(self, canvas: Image.Image) -> None:
        effect = self.effect
        if effect.get("stage") != "still":
            return
        w, h = canvas.size
        s = w / BASE_WIDTH
        strength = float(effect.get("strength", 0.4))
        draw = ImageDraw.Draw(canvas, "RGBA")
        kind = effect.get("id")

        if kind in {"glow", "halo_glow"}:
            glow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            ImageDraw.Draw(glow).ellipse(
                (w * 0.12, h * 0.10, w * 0.88, h * 0.58),
                fill=(*self.c_accent, int(60 * strength)))
            canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(int(90 * s))))
        elif kind == "technical_grid":
            step = int(96 * s)
            for x in range(0, w, step):
                draw.line([(x, 0), (x, h)], fill=(*self.c_accent, int(48 * strength)), width=max(1, int(s)))
            for y in range(0, h, step):
                draw.line([(0, y), (w, y)], fill=(*self.c_accent, int(48 * strength)), width=max(1, int(s)))
        elif kind == "scanline_tech":
            for y in range(0, h, max(3, int(4 * s))):
                draw.line([(0, y), (w, y)], fill=(0, 0, 0, int(40 * strength)), width=1)
        elif kind == "gradient_mesh":
            mesh = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            mesh_draw = ImageDraw.Draw(mesh)
            for _ in range(3):
                cx, cy = self.rng.uniform(0.1, 0.9) * w, self.rng.uniform(0.1, 0.8) * h
                rad = self.rng.uniform(0.25, 0.5) * w
                mesh_draw.ellipse((cx - rad, cy - rad, cx + rad, cy + rad),
                                  fill=(*self.c_accent, int(38 * strength)))
            canvas.alpha_composite(mesh.filter(ImageFilter.GaussianBlur(int(120 * s))))
        elif kind == "reflection":
            band = Image.new("RGBA", (w, int(h * 0.18)), (0, 0, 0, 0))
            band_draw = ImageDraw.Draw(band)
            for i in range(band.height):
                band_draw.line([(0, i), (w, i)],
                               fill=(255, 255, 255, int(70 * strength * (1 - i / band.height))))
            canvas.alpha_composite(band, (0, int(h * 0.56)))
        elif kind in {"glass", "metallic_highlight", "edge_light"}:
            streak = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
            streak_draw = ImageDraw.Draw(streak)
            streak_draw.polygon(
                [(w * 0.06, 0), (w * 0.30, 0), (w * 0.14, h), (-w * 0.10, h)],
                fill=(255, 255, 255, int(46 * strength)))
            canvas.alpha_composite(streak.filter(ImageFilter.GaussianBlur(int(40 * s))))

    # -- text ---------------------------------------------------------
    def _fonts(self, families, bold, s, k):
        return {
            "eyebrow": load_font(families, int(26 * s * k), bold=False),
            "head": load_font(families, int(78 * s * k), bold=bold),
            "sub": load_font(families, int(31 * s * k), bold=False),
            "chip": load_font(families, int(27 * s * k), bold=False),
            "cta": load_font(families, int(33 * s * k), bold=True),
            "brand": load_font(families, int(25 * s), bold=True),
        }

    def _measure(self, draw, copy: "SceneCopy", fonts, max_width, s):
        """Lay the text block out on paper before committing it to the frame."""
        layout = self.layout
        typo = self.typography
        tracking = float(typo.get("tracking", 0.0)) * s
        headline = apply_case(copy.headline, typo.get("case", "title"))
        head_lines = wrap(draw, headline, fonts["head"], max_width, tracking)
        sub_lines = wrap(draw, copy.subhead, fonts["sub"], max_width) if copy.subhead else []
        chips = list(copy.chips) if (layout.get("specs") and copy.chips) else []

        height = 0.0
        if layout.get("eyebrow") and copy.eyebrow:
            height += fonts["eyebrow"].size * 1.9
        height += len(head_lines) * fonts["head"].size * 1.16
        if layout.get("rule"):
            height += 34 * s
        if sub_lines:
            height += len(sub_lines) * fonts["sub"].size * 1.35 + 14 * s
        height += len(chips) * fonts["chip"].size * 1.75
        if copy.cta:
            height += fonts["cta"].size * 2.4
        return head_lines, sub_lines, chips, height, tracking

    def render_text_layer(self, size: tuple[int, int], copy: SceneCopy, variant: int = 0) -> Image.Image:
        w, h = size
        s = w / BASE_WIDTH
        layer = Image.new("RGBA", size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(layer, "RGBA")
        layout, typo = self.layout, self.typography
        families = typo.get("headline", ["DejaVu Sans"])
        bold = typo.get("weight", "bold") == "bold"
        max_width = w * float(layout.get("width", 0.84))
        x0 = w * layout["anchor"][0]
        align = layout.get("align", "left")

        # The brand footer owns the bottom strip; text never enters it.
        top_limit = h * 0.05
        bottom_limit = h * 0.88
        anchor_y = h * layout["anchor"][1]

        # Regions the text may use: the whole safe area, or - when an instrument
        # photograph is in frame - the clear bands above and below it.
        box = self.photo_box(size, variant)
        gap = h * 0.025
        if box:
            regions = [(top_limit, max(top_limit, box[1] - gap)),
                       (min(bottom_limit, box[3] + gap), bottom_limit)]
        else:
            regions = [(top_limit, bottom_limit)]
        regions.sort(key=lambda r: (-(r[1] - r[0] > h * 0.14), abs((r[0] + r[1]) / 2 - anchor_y)))

        k, scrim = 1.0, False
        while True:
            fonts = self._fonts(families, bold, s, k)
            head_lines, sub_lines, chips, block_h, tracking = self._measure(draw, copy, fonts, max_width, s)
            region = next((r for r in regions if r[1] - r[0] >= block_h), None)
            if region is not None:
                break
            if k <= 0.66:
                # nothing fits cleanly: use the whole safe area and protect
                # legibility with a scrim behind the text
                region, scrim = (top_limit, bottom_limit), True
                break
            k *= 0.9

        region_top, region_bottom = region
        y = min(max(anchor_y, region_top), max(region_top, region_bottom - block_h))

        if scrim:
            pad = 30 * s
            veil = Image.new("RGBA", size, (0, 0, 0, 0))
            ImageDraw.Draw(veil).rounded_rectangle(
                (x0 - pad, y - pad, x0 + max_width + pad, y + block_h + pad),
                radius=int(26 * s), fill=(*(self.c_bg1 if self.dark else (255, 255, 255)), 190))
            layer.alpha_composite(veil)

        if layout.get("panel"):
            pad = 34 * s
            panel = Image.new("RGBA", size, (0, 0, 0, 0))
            ImageDraw.Draw(panel).rounded_rectangle(
                (x0 - pad, y - pad, x0 + max_width + pad, y + block_h + pad), radius=int(30 * s),
                fill=(*self.c_panel, 205 if self.dark else 225),
                outline=(*self.c_accent, 120), width=max(1, int(1.6 * s)))
            layer.alpha_composite(panel)

        def line_x(width: float) -> float:
            if align == "center":
                return x0 + (max_width - width) / 2
            if align == "right":
                return x0 + max_width - width
            return x0

        if layout.get("eyebrow") and copy.eyebrow:
            eyebrow = copy.eyebrow.upper()
            width = text_width(draw, eyebrow, fonts["eyebrow"], 3 * s)
            draw_tracked(draw, (line_x(width), y), eyebrow, fonts["eyebrow"], (*self.c_accent, 255), 3 * s)
            y += fonts["eyebrow"].size * 1.9

        for line in head_lines:
            width = text_width(draw, line, fonts["head"], tracking)
            draw_tracked(draw, (line_x(width), y), line, fonts["head"], (*self.c_text, 255), tracking)
            y += fonts["head"].size * 1.16

        if layout.get("rule"):
            rule_w = max_width * 0.24
            rx = line_x(rule_w)
            draw.rectangle((rx, y + 12 * s, rx + rule_w, y + 12 * s + max(3, int(5 * s))),
                           fill=(*self.c_accent, 255))
            y += 34 * s

        for line in sub_lines:
            width = draw.textlength(line, font=fonts["sub"])
            draw.text((line_x(width), y), line, font=fonts["sub"], fill=(*self.c_dim, 255))
            y += fonts["sub"].size * 1.35
        if sub_lines:
            y += 14 * s

        for chip in chips:
            dot_r = 5 * s
            width = draw.textlength(chip, font=fonts["chip"]) + 26 * s
            cx = line_x(width)
            draw.ellipse((cx, y + fonts["chip"].size * 0.42 - dot_r, cx + 2 * dot_r,
                          y + fonts["chip"].size * 0.42 + dot_r), fill=(*self.c_accent, 255))
            draw.text((cx + 26 * s, y), chip, font=fonts["chip"], fill=(*self.c_text, 235))
            y += fonts["chip"].size * 1.75

        if copy.cta:
            cta = copy.cta.upper() if typo.get("case") == "upper" else copy.cta
            pad_x, pad_y = 30 * s, 18 * s
            width = draw.textlength(cta, font=fonts["cta"])
            bx = line_x(width + pad_x * 2)
            box = (bx, y + 10 * s, bx + width + pad_x * 2, y + 10 * s + fonts["cta"].size + pad_y * 2)
            if layout.get("badge"):
                draw.rounded_rectangle(box, radius=int((fonts["cta"].size + pad_y * 2) / 2),
                                       fill=(*self.c_accent, 255))
                draw.text((bx + pad_x, y + 10 * s + pad_y), cta, font=fonts["cta"], fill=(255, 255, 255, 255))
            else:
                draw.rounded_rectangle(box, radius=int(14 * s), outline=(*self.c_accent, 255),
                                       width=max(2, int(2.5 * s)))
                draw.text((bx + pad_x, y + 10 * s + pad_y), cta, font=fonts["cta"], fill=(*self.c_accent, 255))

        self._brand_block(layer, draw, size, align, fonts, copy)
        return layer

    def _brand_block(self, layer, draw, size, align, fonts, copy) -> None:
        """Logo top-left, wordmark bottom - sized to be read on a phone."""
        w, h = size
        s = w / BASE_WIDTH
        families = self.typography.get("headline", ["DejaVu Sans"])

        if self.logo and self.logo.is_file():
            try:
                with Image.open(self.logo) as raw:
                    mark = _trim_logo(raw.convert("RGBA"))
                target_w = int(w * 0.30)
                mark = mark.resize((target_w, max(1, int(mark.height * target_w / mark.width))), Image.LANCZOS)
                x, y = int(w * 0.07), int(h * 0.055)
                alpha = mark.getchannel("A")
                if alpha.getextrema()[0] > 250 and self.dark:
                    # opaque logo on a dark design: give it a tight light plate
                    pad = int(14 * s)
                    plate = Image.new("RGBA", (mark.width + pad * 2, mark.height + pad * 2), (0, 0, 0, 0))
                    ImageDraw.Draw(plate).rounded_rectangle(
                        (0, 0, plate.width - 1, plate.height - 1), radius=int(16 * s),
                        fill=(255, 255, 255, 235))
                    plate.alpha_composite(mark, (pad, pad))
                    layer.alpha_composite(plate, (x, y))
                    bottom = y + plate.height
                else:
                    layer.alpha_composite(mark, (x, y))
                    bottom = y + mark.height
                del bottom
            except OSError:
                pass

        footer = copy.footer or brand.BRAND_NAME.upper()
        font = load_font(families, int(38 * s), bold=True)
        tracking = 6 * s
        fw = text_width(draw, footer, font, tracking)
        fx = (w - fw) / 2 if align == "center" else w * 0.07
        fy = h - h * 0.075
        draw.rectangle((fx, fy - 22 * s, fx + max(fw, 60 * s), fy - 22 * s + max(3, int(5 * s))),
                       fill=(*self.c_accent, 240))
        draw_tracked(draw, (fx, fy), footer, font, (*self.c_text, 245), tracking)

        tagline = load_font(families, int(21 * s), bold=False)
        draw.text((fx, fy + font.size * 1.15), brand.BRAND_TAGLINE, font=tagline,
                  fill=(*self.c_dim, 220))

    # -- public -------------------------------------------------------
    def render_base(self, size: tuple[int, int], variant: int = 0) -> Image.Image:
        canvas = self._background(size, variant).convert("RGBA")
        self._place_photo(canvas, variant)
        self._still_effect(canvas)
        return canvas

    def render(self, size: tuple[int, int], copy: SceneCopy, variant: int = 0) -> Image.Image:
        canvas = self.render_base(size, variant)
        canvas.alpha_composite(self.render_text_layer(size, copy, variant))
        return canvas.convert("RGB")


def save_png(image: Image.Image, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "PNG", optimize=True)
    return path
