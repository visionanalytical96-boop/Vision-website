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

_HERE = Path(__file__).resolve().parent
for _candidate in (_HERE, _HERE.parent / "engine"):   # vendored, then repo layout
    if (_candidate / "vision_ai").is_dir() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

from vision_ai.config import load_config  # noqa: E402
from vision_ai.library import Library  # noqa: E402
from vision_ai.skills import copywriter, imaging  # noqa: E402
from vision_ai.skills import history as history_skill  # noqa: E402
from vision_ai.skills.history import DesignHistory  # noqa: E402
from vision_ai.skills.instrument import identify  # noqa: E402
from vision_ai.skills.ollama_client import OllamaClient  # noqa: E402
from vision_ai.skills.render_still import Renderer, SceneCopy, save_png  # noqa: E402
from vision_ai.skills.selector import DesignSelector  # noqa: E402

from . import campaign as campaign_skill  # noqa: E402
from . import config_env, deliver, music_gen, photo_studio, preset_map, voices  # noqa: E402

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
        keep_alive=env.get("OLLAMA_KEEP_ALIVE", "30m"),
        threads=int(config_env.number(env, "OLLAMA_THREADS", 0)),
    )
    website = env.get("WEBSITE", campaign_skill.DEFAULT_WEBSITE)
    campaigns = campaign_skill.load(library)
    chosen, why = campaign_skill.choose(request, campaigns,
                                        history.recent_values("campaign", 4),
                                        seed=design["design_fingerprint"])
    campaign_copy = campaign_skill.copy_for(chosen, instrument, website, design["design_fingerprint"])
    design["campaign"] = chosen["id"]
    design["campaign_label"] = chosen["label"]
    print(f"[brain] campaign: {chosen['label']} ({why})")

    pack = copywriter.build(instrument, design, client, bool(config.ollama["enabled"]), campaign_copy)
    design["copy_source"] = pack.source
    details = contact_lines(env)
    if details:
        pack.caption = pack.caption.replace(
            "\n\n#", "\n\n" + " | ".join(details) + "\n\n#")

    # Cut the instrument out of its background when the operator wants that
    # look and the optional dependency is installed.
    if asset.path and config_env.flag(env, "PHOTO_STUDIO", True):
        prepared, note = photo_studio.prepare(Path(asset.path), env.get("CUTOUT_MODEL", "u2net"))
        if prepared is not None:
            asset.path = prepared
            design["image_prepared"] = True
        design["photo_note"] = note
        print(f"[brain] photo studio: {note}")

    _STATE["campaign_copy"] = campaign_copy
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


def style_index(style: str, size: int = 10) -> int:
    """Stand-in for `styles.index(style)` in engines whose hardcoded `styles`
    list was replaced by a brain choice. Deterministic, so a family always gets
    the same treatment, and always inside the engine's expected range."""
    return _index(str(style), size)


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


LOGO_CANDIDATES = (
    "/srv/vision-workspace/vision-ai/creative-pack/brand/logo.png",
    "/srv/vision-workspace/vision-design-brain/assets/vision-logo.png",
    "/srv/vision-workspace/vision-autocontent-v2/assets/vision-logo.png",
    "/srv/vision-workspace/content-engine/uploads/vision-analytical-logo.png",
)


# The narration is delayed by this much inside the audio chain (see
# skills/audio.audio_plan) and wants a breath after the last word, so the reel
# has to be at least lead-in + spoken + tail for nothing to be cut off.
VOICE_LEAD_IN = 0.5
VOICE_TAIL = 1.7
VOICE_MAX_TEMPO = 1.18   # beyond this a voice starts to sound rushed


def _audio_seconds(path: Path) -> float:
    import subprocess
    try:
        out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", str(path)],
                             capture_output=True, text=True, timeout=60).stdout.strip()
        return float(out)
    except (ValueError, OSError, subprocess.SubprocessError):
        return 0.0


def _retime_audio(path: Path, tempo: float) -> bool:
    """Speed a narration file up in place. atempo keeps the pitch, so the
    speaker just talks a little brisker rather than turning into a chipmunk."""
    import subprocess
    path = Path(path)
    tmp = path.with_name(path.stem + "-fit" + path.suffix)
    try:
        done = subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(path),
             "-filter:a", f"atempo={tempo:.3f}", str(tmp)],
            capture_output=True, text=True, timeout=180)
    except (OSError, subprocess.SubprocessError):
        return False
    if done.returncode != 0 or not tmp.is_file() or tmp.stat().st_size < 1000:
        tmp.unlink(missing_ok=True)
        return False
    tmp.replace(path)
    return True


def narration_plan(spoken: float, floor: float, ceiling: float,
                   allow_tempo: bool = True) -> tuple[float, float]:
    """Work out how long the reel has to be for `spoken` seconds of narration,
    and how much faster the speaker has to talk to stay inside `ceiling`.

    Returns (tempo, duration). Fitting the ceiling never wins over finishing
    the sentence: if even the fastest comfortable pace does not fit, the reel
    is allowed to run long instead of cutting the words off.
    """
    import math
    tempo = 1.0
    needed = VOICE_LEAD_IN + spoken + VOICE_TAIL
    if needed > ceiling and allow_tempo:
        room = max(1.0, ceiling - VOICE_LEAD_IN - VOICE_TAIL)
        # round the pace *up* so the rounding itself can never re-introduce
        # the overrun we just removed
        tempo = min(VOICE_MAX_TEMPO, math.ceil(spoken / room * 1000) / 1000)
        needed = VOICE_LEAD_IN + spoken / tempo + VOICE_TAIL
    return tempo, math.ceil(max(needed, floor) * 100) / 100


def _bitrate_bps(value: str) -> int:
    text = str(value).strip().lower()
    try:
        if text.endswith("m"):
            return int(float(text[:-1]) * 1_000_000)
        if text.endswith("k"):
            return int(float(text[:-1]) * 1_000)
        return int(float(text))
    except ValueError:
        return 8_000_000


def _fit_size_budget(video: dict, validation: dict) -> None:
    """A longer reel must not grow past what a phone will happily send, so cap
    the encoder's ceiling to fit the duration we ended up with."""
    max_bytes = int(validation.get("max_video_bytes", 26_214_400))
    seconds = max(1.0, float(video["duration"]))
    audio_bps = _bitrate_bps(video.get("abitrate", "192k"))
    budget = int(max_bytes * 8 * 0.82 / seconds) - audio_bps
    budget = max(1_200_000, budget)
    if budget < _bitrate_bps(video.get("maxrate", "8M")):
        video["maxrate"] = f"{budget // 1000}k"
        video["bufsize"] = f"{budget * 2 // 1000}k"


def contact_lines(env: dict) -> list[str]:
    """Whatever the operator filled in - nothing is invented."""
    ordered = ("BRAND_PHONE", "BRAND_EMAIL", "WEBSITE", "BRAND_INSTAGRAM", "BRAND_ADDRESS")
    out = []
    for key in ordered:
        value = (env.get(key) or "").strip()
        if not value:
            continue
        if key == "BRAND_INSTAGRAM" and not value.startswith("@"):
            value = "@" + value.lstrip("@")
        out.append(value)
    return out


def brand_logo() -> Path | None:
    """BRAND_LOGO in config.env wins; otherwise the logos already on the box."""
    configured = _STATE.get("env", {}).get("BRAND_LOGO", "")
    for candidate in ([configured] if configured else []) + list(LOGO_CANDIDATES):
        if candidate and Path(candidate).is_file():
            return Path(candidate)
    return None


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
        logo=brand_logo(),
        contact=contact_lines(_STATE.get("env", {})),
        logo_mono=config_env.flag(_STATE.get("env", {}), "LOGO_MONO", False),
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
    env = _STATE.get("env", {})
    history = _STATE.get("history")
    seed = design.get("design_fingerprint", "")

    # The server brain says the same handful of words every run. Taken
    # literally that pinned 42 runs onto 4 layouts and 5 families, which is why
    # the posts started looking alike. Rotate inside each word's meaning unless
    # the operator asks for the literal mapping back.
    if config_env.flag(env, "BRAIN_TRUST_SERVER", False) or history is None:
        first, second = preset_map.resolve_pair(brain_choice.get("motions"), library.get("animations"))
        transition = preset_map.resolve(brain_choice.get("transition", "fade"), library.get("transitions"), "transitions")
        family = preset_map.resolve(brain_choice.get("family", ""), library.get("families"), "families")
        layout = preset_map.resolve(brain_choice.get("layout", ""), library.get("layouts"), "layouts")
    else:
        pool = int(config_env.number(env, "BRAIN_PRESET_POOL", preset_map.DEFAULT_POOL))
        look_back = int(config_env.number(env, "BRAIN_ROTATION_WINDOW", 12))
        recent = history.recent_values
        first, second = preset_map.resolve_pair_rotated(
            brain_choice.get("motions"), library.get("animations"),
            recent("animation_1", look_back) + recent("animation_2", look_back), seed, pool)
        transition = preset_map.resolve_rotated(
            brain_choice.get("transition", "fade"), library.get("transitions"), "transitions",
            recent("transition", look_back), seed, pool)
        family = preset_map.resolve_rotated(
            brain_choice.get("family", ""), library.get("families"), "families",
            recent("design_family", look_back), seed, pool)
        layout = preset_map.resolve_rotated(
            brain_choice.get("layout", ""), library.get("layouts"), "layouts",
            recent("layout", look_back), seed, pool)
    design.update({
        "animation_1": first["id"], "animation_1_label": first["label"],
        "animation_2": second["id"], "animation_2_label": second["label"],
        "transition": transition["id"], "transition_label": transition["label"],
        "design_family": family["id"], "design_family_label": family["label"],
        "layout": layout["id"], "layout_label": layout["label"],
        "brain_choice": {k: brain_choice.get(k) for k in ("family", "layout", "motions", "transition", "fingerprint")},
        "decision_source": "server brain",
    })
    # The local selector matched the palette to the family it chose; that family
    # has just been replaced, so the colours no longer belong to the look being
    # rendered. Re-pick inside the adopted family, still steering off whatever
    # was used recently.
    if not config_env.flag(env, "BRAIN_TRUST_SERVER", False) and history is not None:
        palettes = library.get("palettes")
        preferred = [p for p in palettes if p["id"] in family.get("palettes", [])] or palettes
        look_back = int(config_env.number(env, "BRAIN_ROTATION_WINDOW", 12))
        palette = preset_map.rotate(preferred, history.recent_values("color_palette", look_back),
                                    seed + "|palette")
        design.update({"color_palette": palette["id"], "color_palette_label": palette["label"]})

    # The fingerprint was computed before these four fields were replaced, so
    # recompute it - otherwise history records a design that was never rendered
    # and the next run's rotation is blind to what actually went out.
    design["design_fingerprint"] = history_skill.fingerprint(design)
    print(f"[brain] server choice adopted: {brain_choice.get('motions')} -> "
          f"{first['id']} + {second['id']} | {brain_choice.get('transition')} -> {transition['xfade']}")
    print(f"[brain] look: {family['id']} / {design.get('color_palette')} / {layout['id']} "
          f"/ {design.get('background')} / {design.get('effect')}")
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
    env = _STATE.get("env", {})
    if config_env.flag(env, "TURBO_MODE", False):
        # Shortest wall clock that still meets the phone contract.
        # ultrafast spends bits to save time; hold the bitrate down so the file
        # stays easy to send on WhatsApp.
        video.update(preset="ultrafast", crf=26, render_scale=1.1,
                     maxrate="5M", bufsize="10M")
    elif config_env.flag(env, "FAST_MODE", True):
        # Tuned for a GPU-less box: same 1080x1920 contract, less encoder work.
        video.update(preset="superfast", crf=23, render_scale=1.3)
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

    # The engine writes one flat poster - photo, a white headline, nothing else -
    # so every post looked identical no matter what the design system chose.
    # Re-render it here, plus the square and story crops, through the same
    # palette/layout/background/typography that drive the reel.
    stills = _render_stills(renderer, hero, detail, ready, stamp, post, config)

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
    if track is None and config_env.flag(_STATE.get("env", {}), "MUSIC_GENERATE", True):
        # No supplied track: synthesise an instrumental bed locally. Nothing is
        # downloaded, so there is no licence attached to the result.
        cache = config.creative_pack / "music" / "generated"
        seed = int(design["design_fingerprint"][:8], 16)
        recent = set(_STATE["history"].recent_values("music_track", 4))
        track = music_gen.ensure(design["music_style"], cache, seed=seed)
        for attempt in range(1, 6):  # never the same bed two reels running
            if track.name not in recent:
                break
            style = music_gen.STYLES and sorted(music_gen.STYLES)[(seed + attempt) % len(music_gen.STYLES)]
            track = music_gen.ensure(style, cache, seed=seed + attempt)
        note = f"generated locally ({design['music_style']})"
        print(f"[brain] music: {track.name} (local instrumental bed, generated - no licence)")
    choice.music, choice.music_note = track, note
    design["music_track"] = track.name if track else ""

    # Voice-over: the campaign script, spoken by whatever CPU TTS is installed.
    if config_env.flag(env, "VOICE", False):
        roster = voices.roster(library)
        lang = env.get("VOICE_LANG", "mix").strip().lower()
        usable = voices.available(roster) or roster   # never shadow `ready`, the output dir
        voice = voices.choose(usable, _STATE["history"].recent_values("voice_name", 3),
                              seed=design["design_fingerprint"], lang=lang)
        design["voice_name"] = voice["id"]
        design["voice_character"] = voice["character"]
        script = (_STATE.get("campaign_copy", {}).get("voice_hi") if voice.get("lang") == "hi"
                  else pack.voice_script) or pack.voice_script
        voice_path, voice_note = voices.speak(
            script, voice, config.path("audio_dir") / f"{stamp}-voice.wav")
        if voice_path is None:
            print("[brain] piper voice not ready - falling back to espeak, which sounds robotic")
            print("[brain] for a human voice run once:  sudo python3 "
                  "/srv/vision-workspace/vision-ai/brain/voices.py --warm")
        if voice_path is None:  # piper unavailable - fall back to whatever TTS exists
            voice_path, voice_note = audio_skill.synthesize_voice(
                pack.voice_script,
                library.by_id("voice_styles", design["voice_style"]) or {},
                config.path("audio_dir") / f"{stamp}-voice.wav",
                preference=env.get("VOICE_ENGINE", "auto"), model=env.get("PIPER_MODEL", ""))
        choice.voice = voice_path
        design["voice_track"] = voice_path.name if voice_path else ""
        print(f"[brain] voice: {voice_note}")
        if voice_path:
            # duck the bed so the words stay on top
            video["music_volume"] = round(float(video["music_volume"]) * 0.45, 2)
            # and give the narration room to finish - a reel that cuts a
            # sentence in half is worse than a reel that runs a bit long
            spoken = _audio_seconds(voice_path)
            if spoken:
                floor = config_env.number(env, "REEL_MIN_SECONDS", 15.0)
                ceiling = config_env.number(env, "REEL_MAX_SECONDS", 30.0)
                tempo, wanted = narration_plan(spoken, floor, ceiling)
                if tempo > 1.01 and _retime_audio(voice_path, tempo):
                    spoken = _audio_seconds(voice_path) or spoken / tempo
                    _, wanted = narration_plan(spoken, floor, ceiling, allow_tempo=False)
                    print(f"[brain] narration paced up x{tempo:.2f} to fit the {ceiling:.0f}s reel")
                if wanted > ceiling:
                    print(f"[brain] narration needs {wanted:.1f}s - letting the reel run past "
                          f"{ceiling:.0f}s so no sentence is cut")
                if wanted > float(video["duration"]):
                    print(f"[brain] narration is {spoken:.1f}s - stretching the reel to {wanted:.1f}s")
                video["duration"] = wanted

    _fit_size_budget(video, config.validation)
    print(f"[brain] rendering the reel: 2 scenes, {int(float(video['duration']) * int(video['fps']))} frames "
          f"at {video['width']}x{video['height']} - this takes 20-40s, please do not interrupt",
          flush=True)
    result = reel_skill.render(reel_skill.ReelInputs(
        scenes["a_base"], scenes["a_text"], scenes["b_base"], scenes["b_text"],
        library.by_id("animations", design["animation_1"]),
        library.by_id("animations", design["animation_2"]),
        library.by_id("transitions", design["transition"]),
        effect, choice, sprite_path), reel, video)

    report = validate.validate_video(reel, video, config.validation)
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
    files = [p for p in (*stills, reel, info, ready / f"Vision-Analytical-{stamp}-Caption.txt")
             if p.is_file()]
    deliver.publish(files, stamp, _STATE["env"])
    print(f"[brain] reel OK  {reel}  ({reel.stat().st_size / 1048576:.2f} MB, "
          f"{result.seconds:.1f}s, history {len(_STATE['history'].records)})")
    return True


POST_SIZES = {
    "POST": (1080, 1350),    # Instagram / Facebook portrait - the engine's own name
    "SQUARE": (1080, 1080),  # Instagram square
    "STORY": (1080, 1920),   # story / WhatsApp status
}


def _render_stills(renderer, hero, detail, ready: Path, stamp: str, post: Path, config) -> list[Path]:
    """Overwrite the engine's poster and add the square and story crops."""
    from vision_ai.skills import validate

    written: list[Path] = []
    for name, size in POST_SIZES.items():
        target = post if name == "POST" else ready / f"Vision-Analytical-{stamp}-{name}.png"
        try:
            image = renderer.render(size, hero if name != "STORY" else detail, variant=0)
        except (OSError, ValueError) as exc:
            print(f"[brain] {name} render failed ({exc}) - keeping what the engine wrote")
            if target.is_file():
                written.append(target)
            continue
        save_png(image, target)
        report = validate.validate_image(target, size, config.validation)
        if not report.ok:
            print(f"[brain] {name} validation: {[c.detail for c in report.failures]}")
        written.append(target)
    print(f"[brain] posters rendered: {', '.join(p.name for p in written)}")
    return written


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
    keys = ("campaign", "voice_name", "design_family", "background", "composition", "color_palette", "layout", "typography",
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
