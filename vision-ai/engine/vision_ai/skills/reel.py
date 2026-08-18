"""Skill 11: reel construction.

Two scenes, each with its own camera move and its own text move, joined by the
selected transition and finished with the selected motion effect. Encoding is
fixed to the phone-compatibility contract in skill 15.
"""

from __future__ import annotations

import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from . import motion
from .audio import AudioChoice, audio_plan
from .render_still import hex_rgb


@dataclass
class ReelInputs:
    scene_a_base: Path
    scene_a_text: Path
    scene_b_base: Path
    scene_b_text: Path
    animation_a: dict
    animation_b: dict
    transition: dict
    effect: dict
    audio: AudioChoice
    sprite: Path | None = None


@dataclass
class ReelResult:
    path: Path
    command: list[str] = field(default_factory=list)
    seconds: float = 0.0
    stderr: str = ""
    ok: bool = False


def make_sprite(effect: dict, size: tuple[int, int], accent: str) -> Image.Image | None:
    """Light-streak / lens-flare sprite drawn once and moved by ffmpeg."""
    kind = effect.get("filter")
    strength = float(effect.get("strength", 0.3))
    w, h = size
    if kind == "streak":
        sprite = Image.new("RGBA", (int(w * 0.42), h), (0, 0, 0, 0))
        draw = ImageDraw.Draw(sprite)
        draw.polygon([(sprite.width * 0.55, 0), (sprite.width * 0.95, 0),
                      (sprite.width * 0.45, h), (sprite.width * 0.05, h)],
                     fill=(255, 255, 255, int(70 * strength)))
        return sprite.filter(ImageFilter.GaussianBlur(w // 40))
    if kind == "flare":
        sprite = Image.new("RGBA", (int(w * 0.5), int(w * 0.5)), (0, 0, 0, 0))
        draw = ImageDraw.Draw(sprite)
        cx = sprite.width / 2
        for radius, alpha in ((0.48, 26), (0.30, 40), (0.16, 70)):
            r = sprite.width * radius
            draw.ellipse((cx - r, cx - r, cx + r, cx + r),
                         fill=(*hex_rgb(accent), int(alpha * strength * 3)))
        return sprite.filter(ImageFilter.GaussianBlur(sprite.width // 12))
    return None


def build_command(inputs: ReelInputs, out_path: Path, video: dict) -> list[str]:
    width, height = int(video["width"]), int(video["height"])
    fps = int(video["fps"])
    total = float(video["duration"])
    xfade_seconds = float(video["transition_duration"])
    scene_seconds = (total + xfade_seconds) / 2
    frames = max(2, int(round(scene_seconds * fps)))

    args: list[str] = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error"]
    for still in (inputs.scene_a_base, inputs.scene_a_text, inputs.scene_b_base, inputs.scene_b_text):
        args += ["-loop", "1", "-framerate", str(fps), "-t", f"{scene_seconds:.2f}", "-i", str(still)]
    next_index = 4
    if inputs.sprite:
        args += ["-loop", "1", "-framerate", str(fps), "-t", f"{total:.2f}", "-i", str(inputs.sprite)]
        next_index = 5

    audio_inputs, audio_filters, audio_label = audio_plan(
        inputs.audio, total, float(video.get("music_volume", 0.55)),
        float(video.get("fade_in", 1.0)), float(video.get("fade_out", 1.5)),
        int(video["sample_rate"]), int(video["channels"]), first_index=next_index,
    )
    args += audio_inputs

    chains: list[str] = []
    for index, (animation, base_in, text_in, out) in enumerate((
        (inputs.animation_a, "0:v", "1:v", "sa"),
        (inputs.animation_b, "2:v", "3:v", "sb"),
    )):
        camera = motion.camera_filter(animation["camera"], frames, width, height, fps)
        pre, ox, oy = motion.layer_filters(animation["layer"], width, height)
        chains.append(f"[{base_in}]{camera}[bg{index}]")
        chains.append(f"[{text_in}]{pre}[tx{index}]")
        chains.append(
            f"[bg{index}][tx{index}]overlay=x={ox}:y={oy}:format=auto:eval=frame,"
            f"fps={fps},format=yuv420p,setsar=1,settb=AVTB[{out}]"
        )

    offset = scene_seconds - xfade_seconds
    chains.append(
        f"[sa][sb]{motion.transition_filter(inputs.transition['xfade'], xfade_seconds, offset)}[vx]"
    )

    label = "vx"
    if inputs.sprite:
        sx, sy = motion.sprite_overlay(inputs.effect, width, height, total)
        chains.append(f"[{label}][4:v]overlay=x={sx}:y={sy}:format=auto:eval=frame[vfx]")
        label = "vfx"

    effect_chain = motion.effect_filter(inputs.effect)
    if effect_chain:
        chains.append(f"[{label}]{effect_chain}[vfe]")
        label = "vfe"

    chains.append(f"[{label}]format={video['pix_fmt']},fps={fps}[vout]")
    chains += audio_filters

    args += ["-filter_complex", ";".join(chains), "-map", "[vout]"]
    args += ["-map", f"[{audio_label}]" if audio_label.endswith("out") else audio_label]
    args += [
        "-c:v", video["vcodec"], "-profile:v", video["profile"], "-preset", video["preset"],
        "-crf", str(video["crf"]), "-maxrate", str(video.get("maxrate", "8M")),
        "-bufsize", str(video.get("bufsize", "16M")),
        "-pix_fmt", video["pix_fmt"], "-r", str(fps),
        "-g", str(fps * 2), "-c:a", video["acodec"], "-b:a", video["abitrate"],
        "-ar", str(video["sample_rate"]), "-ac", str(video["channels"]),
        "-t", f"{total:.2f}", "-shortest",
    ]
    if video.get("faststart", True):
        args += ["-movflags", "+faststart"]
    args.append(str(out_path))
    return args


def render(inputs: ReelInputs, out_path: Path, video: dict, timeout: int = 900) -> ReelResult:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    command = build_command(inputs, out_path, video)
    started = time.perf_counter()
    try:
        proc = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
    except subprocess.SubprocessError as exc:
        return ReelResult(out_path, command, time.perf_counter() - started, str(exc)[:400], False)
    seconds = time.perf_counter() - started
    ok = proc.returncode == 0 and out_path.is_file()
    return ReelResult(out_path, command, seconds, proc.stderr[-1200:], ok)
