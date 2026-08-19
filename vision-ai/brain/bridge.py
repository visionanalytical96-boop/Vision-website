"""The API the patched engine calls. Six small entry points, no rewrite.

    D = bridge.decide(sys.argv[1:])          # one decision per run
    source = bridge.pick_source(D, images, videos)
    style  = bridge.pick_style(D, styles)    # still one of YOUR styles
    layout = bridge.pick_layout(D, layouts)  # still one of YOUR layouts
    data   = bridge.copy_pack(D, data)       # short copy, no 86 s call
    bridge.finish(D, READY, STAMP, post, reel)
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # brain/vision_ai

from vision_ai.config import load_config  # noqa: E402
from vision_ai.library import Library  # noqa: E402
from vision_ai.skills import copywriter, imaging  # noqa: E402
from vision_ai.skills.history import DesignHistory  # noqa: E402
from vision_ai.skills.instrument import identify  # noqa: E402
from vision_ai.skills.ollama_client import OllamaClient  # noqa: E402
from vision_ai.skills.render_still import Renderer, SceneCopy, save_png  # noqa: E402
from vision_ai.skills.selector import DesignSelector  # noqa: E402

from . import config_env, deliver, preset_map  # noqa: E402

_STATE: dict = {}


def _index(text: str, size: int) -> int:
    return sum(ord(c) for c in text) % max(1, size)


def request_text() -> str:
    """The operator's request, for engines that derive identity from a filename."""
    return " ".join(sys.argv[1:]).strip()


def decide(argv: list[str] | None = None) -> dict:
    """Identify the instrument, choose a non-repeating design, resolve a photo."""
    env = config_env.load()
    config = load_config(config_env.to_overrides(env))
    library = Library(config)
    history = DesignHistory(config.history_file, int(config.anti_repetition["history_window"]))

    request = " ".join(argv or []).strip()
    photo_dir = config.path("input_photos")
    hints = [p.name for p in photo_dir.glob("*")] if photo_dir.is_dir() else []
    instrument = identify(request, library, hints)

    design = DesignSelector(library, history, config.anti_repetition).select(instrument.to_dict())
    asset = imaging.resolve(instrument, config.path("asset_cache"), photo_dir,
                            history.recent_values("image_asset", 40))
    camera = library.by_id("cameras", design["camera"]) or {}
    design["image_search_query"] = imaging.search_brief(instrument, camera.get("hint", ""))
    design["image_asset"] = asset.name
    design["image_source"] = asset.source
    design["image_exact_match"] = asset.exact_match

    client = OllamaClient(
        url=config.ollama["url"], model=config.ollama["model"],
        timeout=float(config.ollama["timeout_seconds"]),
        num_predict=int(config.ollama["num_predict"]),
        enabled=bool(config.ollama["enabled"]),
    )
    pack = copywriter.build(instrument, design, client, bool(config.ollama["enabled"]))
    design["copy_source"] = pack.source

    _STATE.update(env=env, config=config, library=library, history=history,
                  instrument=instrument, design=design, asset=asset, copy=pack)

    warnings = list(instrument.warnings)
    if not asset.exact_match:
        warnings.append(asset.note)
    print(f"[brain] {instrument.display_name or 'unidentified'} | "
          f"{design['design_family_label']} / {design['background_label']} / {design['layout_label']} | "
          f"{design['animation_1_label']} + {design['animation_2_label']} | copy: {pack.source}")
    for warning in warnings:
        print(f"[brain] warning: {warning}")
    return design


def pick_source(design: dict, images: list, videos: list):
    """Replaces random.choice(images): the requested instrument, or a
    typographic base - never a photograph of a different instrument."""
    asset = _STATE.get("asset")
    env = _STATE.get("env", {})
    if asset is not None and asset.path is not None:
        return Path(asset.path)
    if config_env.flag(env, "EXACT_MODEL_IMAGE_REQUIRED", True):
        base = _typographic_base(design, (1080, 1350))
        print(f"[brain] no authentic photograph - typographic base rendered: {base}")
        return base
    pool = list(images) + list(videos)
    return Path(pool[_index(design["design_fingerprint"], len(pool))]) if pool else None


def pick_style(design: dict, styles: list[str]) -> str:
    """Keeps the engine's own style vocabulary, but rotates it with history."""
    return styles[_index(design["design_family"] + design["design_fingerprint"], len(styles))]


def pick_layout(design: dict, layouts: list[str]) -> str:
    return layouts[_index(design["layout"] + design["design_fingerprint"], len(layouts))]


def copy_pack(design: dict, fallback: dict | None = None) -> dict:
    pack = _STATE.get("copy")
    if pack is None:
        return fallback or {}
    return {"title": pack.headline, "hook": pack.subhead, "caption": pack.caption, "cta": pack.cta}


def legacy_seconds() -> str:
    """The engine's own 12 s single-zoom reel is a stub once the brain renders
    the deliverable; set BRAIN_SKIP_LEGACY_REEL=1 to cut it to one second."""
    return "1" if config_env.flag(_STATE.get("env", {}), "BRAIN_SKIP_LEGACY_REEL", False) else "12"


def _renderer(design: dict, photo: Path | None) -> Renderer:
    library, instrument = _STATE["library"], _STATE["instrument"]
    return Renderer(
        design,
        library.by_id("palettes", design["color_palette"]),
        library.by_id("layouts", design["layout"]),
        library.by_id("compositions", design["composition"]),
        library.by_id("backgrounds", design["background"]),
        library.by_id("typography", design["typography"]),
        library.by_id("effects", design["effect"]),
        photo,
        seed=design["design_fingerprint"],
        ghost=instrument.display_name,
    )


def _typographic_base(design: dict, size) -> Path:
    work = _STATE["config"].path("work_dir")
    work.mkdir(parents=True, exist_ok=True)
    pack = _STATE["copy"]
    image = _renderer(design, None).render(size, SceneCopy(
        pack.eyebrow, pack.headline, pack.subhead, tuple(pack.chips), pack.cta))
    return save_png(image, work / f"typographic-{design['design_fingerprint'][:12]}.png")


def adopt(design: dict, brain_choice: dict | None) -> dict:
    """Let the server's own brain drive the render.

    Its names (ORBITAL_DRIFT, MASK_REVEAL, SCHEMATIC_LAB...) are resolved to
    executable mechanics; the fields it does not choose - palette, typography,
    camera, effect, music - stay with the local selector.
    """
    if not brain_choice:
        return design
    library = _STATE["library"]
    first, second = preset_map.resolve_pair(brain_choice.get("motions"), library.get("animations"))
    transition = preset_map.resolve(brain_choice.get("transition", "fade"), library.get("transitions"), "transitions")
    family = preset_map.resolve(brain_choice.get("family", ""), library.get("families"), "families")
    layout = preset_map.resolve(brain_choice.get("layout", ""), library.get("layouts"), "layouts")
    design.update({
        "animation_1": first["id"], "animation_1_label": first["label"],
        "animation_2": second["id"], "animation_2_label": second["label"],
        "transition": transition["id"], "transition_label": transition["label"],
        "design_family": family["id"], "design_family_label": family["label"],
        "layout": layout["id"], "layout_label": layout["label"],
        "brain_choice": {k: brain_choice.get(k) for k in ("family", "layout", "motions", "transition", "fingerprint")},
        "decision_source": "server brain",
    })
    print(f"[brain] server choice adopted: {brain_choice.get('motions')} -> "
          f"{first['id']} + {second['id']} | {brain_choice.get('transition')} -> {transition['xfade']}")
    return design


def finish(design: dict, ready, stamp: str, post, reel, brain_choice: dict | None = None) -> bool:
    """Render the real reel over the engine's stub, validate it, write Info,
    record history, and hand the package to the existing sync chain."""
    design = adopt(design, brain_choice)
    from vision_ai.skills import audio as audio_skill
    from vision_ai.skills import motion, validate
    from vision_ai.skills import reel as reel_skill

    config, library = _STATE["config"], _STATE["library"]
    asset, pack, instrument = _STATE["asset"], _STATE["copy"], _STATE["instrument"]
    ready, reel, post = Path(ready), Path(reel), Path(post)

    video = dict(config.video)
    video.update(music_volume=float(config.music.get("volume", 0.55)),
                 fade_in=float(config.music.get("fade_in", 1.0)),
                 fade_out=float(config.music.get("fade_out", 1.5)))
    frame = (int(video["width"]), int(video["height"]))
    big = (int(frame[0] * float(video.get("render_scale", 1.5))),
           int(frame[1] * float(video.get("render_scale", 1.5))))

    work = config.path("work_dir") / f"reel-{stamp}"
    work.mkdir(parents=True, exist_ok=True)
    renderer = _renderer(design, Path(asset.path) if asset.path else None)

    hero = SceneCopy(pack.eyebrow, pack.headline, pack.subhead, tuple(pack.chips), pack.cta)
    detail = SceneCopy(instrument.technique or "VISION ANALYTICAL", pack.scene2_headline,
                       pack.subhead, tuple(pack.chips), pack.cta)
    scenes = {
        "a_base": save_png(renderer.render_base(big, 0), work / "a-base.png"),
        "b_base": save_png(renderer.render_base(big, 1), work / "b-base.png"),
    }
    for variant, (name, copy) in enumerate((("a_text", hero), ("b_text", detail))):
        layer = renderer.render_text_layer(frame, copy, variant)
        layer.save(work / f"{name}.png", "PNG")
        scenes[name] = work / f"{name}.png"

    effect = library.by_id("effects", design["effect"]) or {}
    sprite_path = None
    if motion.uses_sprite(effect):
        sprite = reel_skill.make_sprite(effect, frame, renderer.palette["accent"])
        if sprite is not None:
            sprite_path = work / "sprite.png"
            sprite.save(sprite_path, "PNG")

    choice = audio_skill.AudioChoice()
    track, note = audio_skill.select_music(library.by_id("music_styles", design["music_style"]) or {},
                                           config.path("input_music"),
                                           _STATE["history"].recent_values("music_track", 30))
    choice.music, choice.music_note = track, note
    design["music_track"] = track.name if track else ""

    result = reel_skill.render(reel_skill.ReelInputs(
        scenes["a_base"], scenes["a_text"], scenes["b_base"], scenes["b_text"],
        library.by_id("animations", design["animation_1"]),
        library.by_id("animations", design["animation_2"]),
        library.by_id("transitions", design["transition"]),
        effect, choice, sprite_path), reel, video)

    report = validate.validate_video(reel, config.video, config.validation)
    info = ready / f"Vision-Analytical-{stamp}-Info.txt"
    info.write_text(_info_text(design, instrument, asset, report, result), encoding="utf-8")

    if not (result.ok and report.ok):
        print(f"[brain] REEL VALIDATION FAILED - nothing recorded, nothing delivered")
        for check in report.failures:
            print(f"[brain]   {check.name}: {check.detail}")
        if result.stderr:
            print(f"[brain]   ffmpeg: {result.stderr[-300:]}")
        return False

    _STATE["history"].append(_record(design, reel))
    files = [p for p in (post, reel, info, ready / f"Vision-Analytical-{stamp}-Caption.txt") if p.is_file()]
    deliver.publish(files, stamp, _STATE["env"])
    print(f"[brain] reel OK  {reel}  ({reel.stat().st_size / 1048576:.2f} MB, "
          f"{result.seconds:.1f}s, history {len(_STATE['history'].records)})")
    return True


def _info_text(design, instrument, asset, report, result) -> str:
    lines = [
        "VISION ANALYTICAL - GENERATION INFO", "=" * 52,
        f"Request             : {instrument.request or '(none)'}",
        f"Manufacturer        : {design.get('manufacturer', '')}",
        f"Instrument          : {design.get('instrument_model', '') or '(not identified)'}",
        f"Design Family       : {design['design_family_label']}",
        f"Background          : {design['background_label']}",
        f"Composition         : {design['composition_label']}",
        f"Palette             : {design['color_palette_label']}",
        f"Layout              : {design['layout_label']} ({design['layout']})",
        f"Typography          : {design['typography_label']}",
        f"Camera              : {design['camera_label']}",
        f"Animation 1         : {design['animation_1_label']}",
        f"Animation 2         : {design['animation_2_label']}",
        f"Transition          : {design['transition_label']}",
        f"Effect              : {design['effect_label']}",
        f"Music               : {design['music_style_label']} | {design.get('music_track') or '(silent)'}",
        f"Image Search Query  : {design['image_search_query']}",
        f"Image Asset         : {asset.name} [{asset.source}]",
        f"Image Exact Match   : {'yes' if asset.exact_match else 'NO - ' + asset.note}",
        f"Design Fingerprint  : {design['design_fingerprint']}",
        f"Anti-Repetition     : {design.get('anti_repetition', '')}",
        f"Copy Source         : {design.get('copy_source', 'local')}",
        f"Render Seconds      : {result.seconds:.1f}",
        "", "VALIDATION", "-" * 52,
    ]
    lines += [f"  {line}" for line in report.as_lines()]
    lines += ["", "Automatic generation is disabled - this run was started manually.", ""]
    return "\n".join(lines)


def _record(design: dict, reel: Path) -> dict:
    from datetime import datetime, timezone
    keys = ("design_family", "background", "composition", "color_palette", "layout", "typography",
            "camera", "animation_1", "animation_2", "transition", "effect", "music_style",
            "voice_style", "image_search_query", "image_asset", "image_source",
            "design_fingerprint", "copy_source", "manufacturer", "instrument_model")
    record = {key: design.get(key, "") for key in keys}
    record["timestamp"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    record["layout_id"] = design.get("layout", "")
    record["music_track"] = design.get("music_track", "")
    record["output_path"] = str(reel)
    if design.get("brain_choice"):
        record["brain_choice"] = design["brain_choice"]
        record["decision_source"] = design.get("decision_source", "server brain")
    return record
