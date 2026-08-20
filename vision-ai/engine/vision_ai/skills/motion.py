"""Skills 6, 7, 8 (motion half): camera moves, layer moves, transitions, effects.

Everything here returns ffmpeg filter fragments. Motion is driven by zoompan on
an over-rendered still (1.5x), which keeps CPU cost low and stays sharp because
the frame is always downsampled, never upscaled.
"""

from __future__ import annotations

CENTER_X = "iw/2-(iw/zoom/2)"
CENTER_Y = "ih/2-(ih/zoom/2)"


def _constant_zoom(spec: dict) -> bool:
    if spec.get("blur_in"):
        return False
    if spec.get("type") not in {"pan_h", "pan_v", "pan_diag", "drift", "static"}:
        return False
    return abs(float(spec.get("z_to", 1.0)) - float(spec.get("z_from", 1.0))) < 1e-6


def _crop_filter(spec: dict, frames: int, width: int, height: int, fps: int) -> str:
    """crop + one scale, with x/y walking over time (crop re-evaluates them)."""
    kind = spec.get("type", "pan_h")
    zoom = max(1.001, float(spec.get("z_from", 1.10)))
    direction = float(spec.get("dir", 1))
    seconds = max(0.1, frames / float(fps))
    p = f"(t/{seconds:.3f})"
    span_x, span_y = f"(iw-iw/{zoom})", f"(ih-ih/{zoom})"
    centre_x, centre_y = f"{span_x}/2", f"{span_y}/2"

    if kind == "pan_h":
        x = f"{span_x}*{p}" if direction > 0 else f"{span_x}*(1-{p})"
        y = centre_y
    elif kind == "pan_v":
        x = centre_x
        y = f"{span_y}*{p}" if direction > 0 else f"{span_y}*(1-{p})"
    elif kind == "pan_diag":
        if direction > 0:
            x, y = f"{span_x}*{p}", f"{span_y}*{p}"
        else:
            x, y = f"{span_x}*(1-{p})", f"{span_y}*(1-{p})"
    elif kind == "drift":
        x = f"{span_x}*(0.5+0.34*sin(2*PI*{p}*0.5))"
        y = f"{span_y}*(0.5+0.28*cos(2*PI*{p}*0.5))"
    else:
        x, y = centre_x, centre_y

    return (f"fps={fps},crop=w=iw/{zoom}:h=ih/{zoom}:x='{x}':y='{y}',"
            f"scale={width}:{height}:flags=bicubic,setsar=1,format=rgba")


def _progress(frames: int) -> str:
    return f"on/{max(1, frames - 1)}"


def camera_filter(spec: dict, frames: int, width: int, height: int, fps: int) -> str:
    """Camera move for one scene's background/instrument layer.

    A move at constant zoom (pans, drifts) is a crop that walks across the
    over-rendered still - about twice as fast as zoompan, which rescales every
    frame. Only real zooms still need zoompan.
    """
    if _constant_zoom(spec):
        return _crop_filter(spec, frames, width, height, fps)
    kind = spec.get("type", "zoom")
    z_from = float(spec.get("z_from", 1.0))
    z_to = float(spec.get("z_to", 1.08))
    direction = float(spec.get("dir", 1))
    p = _progress(frames)

    if kind == "pulse":
        zoom = f"{z_from}+({z_to - z_from})*0.5*(1-cos(2*PI*{p}*2))"
    elif kind == "drift":
        zoom = f"{z_from}+({z_to - z_from})*{p}"
    else:
        zoom = f"{z_from}+({z_to - z_from})*{p}"

    span_x, span_y = "(iw-iw/zoom)", "(ih-ih/zoom)"
    if kind == "pan_h":
        x = f"{span_x}*({p})" if direction > 0 else f"{span_x}*(1-{p})"
        y = CENTER_Y
    elif kind == "pan_v":
        x = CENTER_X
        y = f"{span_y}*({p})" if direction > 0 else f"{span_y}*(1-{p})"
    elif kind == "pan_diag":
        if direction > 0:
            x, y = f"{span_x}*({p})", f"{span_y}*({p})"
        else:
            x, y = f"{span_x}*(1-{p})", f"{span_y}*(1-{p})"
    elif kind == "drift":
        x = f"{span_x}*(0.5+0.34*sin(2*PI*{p}*0.5))"
        y = f"{span_y}*(0.5+0.28*cos(2*PI*{p}*0.5))"
    else:  # zoom / pulse / static
        x, y = CENTER_X, CENTER_Y

    chain = (
        f"zoompan=z='{zoom}':x='{x}':y='{y}':d=1:s={width}x{height}:fps={fps}"
        f",setsar=1,format=rgba"
    )
    if spec.get("blur_in"):
        # Focus shift: soft at the cut, sharp by ~1.2s. Stepped because blur
        # filters take static parameters - only the enable window varies.
        sigma = float(spec["blur_in"])
        for index, (limit, factor) in enumerate(((0.4, 1.0), (0.8, 0.55), (1.2, 0.25))):
            lower = (0.0, 0.4, 0.8)[index]
            chain += (f",gblur=sigma={sigma * factor * 4:.1f}:steps=1:"
                      f"enable='between(t,{lower},{limit})'")
    return chain


def layer_filters(spec: dict, width: int, height: int) -> tuple[str, str, str]:
    """Return (pre-filter for the text layer, overlay x expr, overlay y expr)."""
    kind = spec.get("type", "fade")
    delay = float(spec.get("delay", 0.3))
    duration = max(0.2, float(spec.get("duration", 0.9)))
    distance = float(spec.get("distance", 80))
    fade = f"format=rgba,fade=in:st={delay:.2f}:d={duration:.2f}:alpha=1"

    ramp = f"min(1,max(0,(t-{delay:.2f})/{duration:.2f}))"
    x, y = "0", "0"
    if kind == "slide_up":
        y = f"'{distance:.0f}*(1-{ramp})'"
    elif kind == "slide_down":
        y = f"'-{distance:.0f}*(1-{ramp})'"
    elif kind == "slide_left":
        x = f"'{distance:.0f}*(1-{ramp})'"
    elif kind in {"slide_right", "mask_wipe"}:
        x = f"'-{distance if kind == 'slide_right' else 90:.0f}*(1-{ramp})'"
    elif kind == "scale_in":
        y = f"'{distance * 0.4:.0f}*(1-{ramp})'"
    elif kind == "float":
        y = f"'{distance:.0f}*0.5*sin(2*PI*(t)/4)*{ramp}'"
    return fade, x, y


def transition_filter(xfade_name: str, duration: float, offset: float) -> str:
    return f"xfade=transition={xfade_name}:duration={duration:.2f}:offset={offset:.2f}"


def effect_filter(effect: dict) -> str:
    """Motion-stage effect applied to the finished timeline. Kept CPU-cheap."""
    if effect.get("stage") != "motion":
        return ""
    strength = float(effect.get("strength", 0.25))
    kind = effect.get("filter", "")
    if kind == "grain":
        return f"noise=alls={max(4, int(40 * strength))}:allf=t"
    if kind == "particles":
        return f"noise=alls={max(3, int(30 * strength))}:allf=t+u,eq=saturation=1.04"
    if kind == "bloom":
        return (f"split[bl_a][bl_b];[bl_b]boxblur=12:1[bl_b];"
                f"[bl_a][bl_b]blend=all_mode=screen:all_opacity={min(0.45, strength):.2f}")
    if kind == "chroma":
        shift = max(1, int(6 * strength))
        return f"rgbashift=rh={shift}:bh=-{shift}"
    if kind == "vignette":
        return f"vignette=angle=PI/{max(3.0, 5.0 - strength):.2f}"
    if kind == "contrast":
        return f"eq=contrast={1 + strength:.2f}:saturation={1 + strength / 2:.2f}:brightness={strength / 12:.3f}"
    if kind in {"streak", "flare"}:
        # handled as an overlay sprite by reel.py; nothing to add to the chain
        return ""
    return ""


def uses_sprite(effect: dict) -> bool:
    return effect.get("stage") == "motion" and effect.get("filter") in {"streak", "flare"}


def sprite_overlay(effect: dict, width: int, height: int, total: float) -> tuple[str, str]:
    """Overlay expressions for a light-streak / lens-flare sprite."""
    if effect.get("filter") == "flare":
        x = f"'W*0.62+W*0.12*sin(2*PI*t/{max(4.0, total):.1f})-w/2'"
        y = f"'H*0.24+H*0.05*cos(2*PI*t/{max(4.0, total):.1f})-h/2'"
    else:
        x = f"'-w+((W+w)*mod(t/{max(3.0, total / 3):.1f},1))'"
        y = "0"
    return x, y
