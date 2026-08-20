"""The local-first generation pipeline (spec section 35).

request -> instrument -> exact image query -> local creative brain ->
history check -> unique design -> authentic image -> stills -> reel ->
optional short copy -> optional voice -> validation -> history.

Ollama and TTS sit at the edges: if either is down the run still completes.
"""

from __future__ import annotations

import os
import platform
import shutil
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from .config import Config
from .library import Library
from .skills import audio as audio_skill
from .skills import brand, copywriter, imaging, motion, validate
from .skills import reel as reel_skill
from .skills.history import DesignHistory
from .skills.instrument import identify
from .skills.ollama_client import OllamaClient
from .skills.render_still import Renderer, SceneCopy, save_png
from .skills.selector import DesignSelector

OUTPUT_SIZES = {
    "POST": (1080, 1350),   # Instagram / Facebook portrait
    "SQUARE": (1080, 1080),  # Instagram square
    "STORY": (1080, 1920),   # story / status
}


class AutomationBlocked(RuntimeError):
    pass


@dataclass
class Options:
    request: str = ""
    use_ollama: bool = True
    use_music: bool = True
    use_voice: bool = False
    skip_reel: bool = False
    seed: int | None = None
    dry_run: bool = False
    piper_model: str = ""


@dataclass
class Outcome:
    design: dict = field(default_factory=dict)
    files: dict[str, Path] = field(default_factory=dict)
    timings: dict[str, float] = field(default_factory=dict)
    notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    reports: dict[str, validate.Report] = field(default_factory=dict)
    ok: bool = False

    @property
    def valid(self) -> bool:
        return all(report.ok for report in self.reports.values())


def guard_automation(config: Config) -> None:
    """Spec section 32: generation happens only when a human asks for it."""
    if config.data.get("automation", {}).get("allow_timer_execution"):
        return
    if os.environ.get("VISION_AI_ALLOW_AUTOMATION") == "1":
        return
    markers = [key for key in ("INVOCATION_ID", "JOURNAL_STREAM", "SYSTEMD_EXEC_PID") if os.environ.get(key)]
    if markers:
        raise AutomationBlocked(
            "refusing to run from a systemd unit/timer (" + ", ".join(markers) + "). "
            "Automatic generation is intentionally disabled; run the command interactively."
        )


class Pipeline:
    def __init__(self, config: Config, options: Options) -> None:
        self.config = config
        self.options = options
        self.library = Library(config)
        self.history = DesignHistory(config.history_file, int(config.anti_repetition["history_window"]))
        self.timings: dict[str, float] = {}

    def _timed(self, name: str, func, *args, **kwargs):
        started = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            self.timings[name] = round(time.perf_counter() - started, 4)

    def run(self) -> Outcome:
        guard_automation(self.config)
        config, options = self.config, self.options
        outcome = Outcome()
        config.ensure_runtime_dirs()

        photo_dir = config.path("input_photos")
        photos = [p.name for p in photo_dir.glob("*")] if photo_dir.is_dir() else []

        # 1 - instrument identity
        instrument = self._timed("identify", identify, options.request, self.library, photos)
        outcome.warnings.extend(instrument.warnings)

        # 2 - local creative brain + anti-repetition
        selector = DesignSelector(self.library, self.history, config.anti_repetition, seed=options.seed)
        design = self._timed("select_design", selector.select, instrument.to_dict())

        # 3 - authentic image
        asset = self._timed(
            "resolve_image", imaging.resolve, instrument,
            config.path("asset_cache"), photo_dir,
            self.history.recent_values("image_asset", 40),
        )
        if not asset.exact_match:
            outcome.warnings.append(asset.note)
        design["image_asset"] = asset.name
        design["image_source"] = asset.source
        design["image_exact_match"] = asset.exact_match
        camera = self.library.by_id("cameras", design["camera"]) or {}
        design["image_search_query"] = imaging.search_brief(instrument, camera.get("hint", ""))

        # 4 - copy (Ollama optional, tiny prompts only)
        client = OllamaClient(
            url=config.ollama["url"], model=config.ollama["model"],
            timeout=float(config.ollama["timeout_seconds"]),
            num_predict=int(config.ollama["num_predict"]),
            temperature=float(config.ollama["temperature"]),
            enabled=bool(config.ollama["enabled"]) and options.use_ollama,
        )
        pack = self._timed("copy", copywriter.build, instrument, design, client, options.use_ollama)
        design["copy_source"] = pack.source
        if client.enabled and pack.source == "local":
            outcome.notes.append("Ollama unavailable or rejected - local copy templates used")

        if options.dry_run:
            outcome.design = design
            outcome.timings = self.timings
            outcome.ok = True
            return outcome

        # 5 - stills
        renderer = Renderer(
            design,
            self.library.by_id("palettes", design["color_palette"]),
            self.library.by_id("layouts", design["layout"]),
            self.library.by_id("compositions", design["composition"]),
            self.library.by_id("backgrounds", design["background"]),
            self.library.by_id("typography", design["typography"]),
            self.library.by_id("effects", design["effect"]),
            asset.path,
            seed=design["design_fingerprint"],
            ghost=instrument.display_name,
        )
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        prefix = f"Vision-Analytical-{stamp}"
        out_dir = config.path("output_ready")
        work = config.path("work_dir") / prefix
        work.mkdir(parents=True, exist_ok=True)

        hero = SceneCopy(pack.eyebrow, pack.headline, pack.subhead, tuple(pack.chips), pack.cta)
        detail = SceneCopy(
            eyebrow=instrument.technique or brand.BRAND_LINE_SHORT,
            headline=pack.scene2_headline,
            subhead=pack.subhead,
            chips=tuple(pack.chips),
            cta=pack.cta,
        )

        def render_posts() -> None:
            for name, size in OUTPUT_SIZES.items():
                image = renderer.render(size, hero if name != "STORY" else detail, variant=0)
                outcome.files[name] = save_png(image, out_dir / f"{prefix}-{name}.png")

        self._timed("render_posts", render_posts)

        # 6 - reel
        if not options.skip_reel:
            self._timed("render_reel", self._render_reel, renderer, design, hero, detail,
                        work, out_dir, prefix, pack, outcome)

        # 7 - caption + info
        caption_path = out_dir / f"{prefix}-Caption.txt"
        caption_path.write_text(pack.caption + "\n", encoding="utf-8")
        outcome.files["Caption"] = caption_path

        outcome.design = design
        outcome.timings = self.timings

        # 8 - validation
        for name, size in OUTPUT_SIZES.items():
            outcome.reports[name] = validate.validate_image(outcome.files[name], size, config.validation)
        if "Reel" in outcome.files:
            outcome.reports["Reel"] = validate.validate_video(outcome.files["Reel"], config.video, config.validation)

        info_path = out_dir / f"{prefix}-Info.txt"
        info_path.write_text(self._info_text(instrument, design, pack, asset, outcome), encoding="utf-8")
        outcome.files["Info"] = info_path

        # 9 - history (only for a run that produced valid files)
        outcome.ok = outcome.valid
        if outcome.ok:
            self.history.append(self._history_record(design, outcome))
        else:
            outcome.warnings.append("validation failed - nothing was written to design history")
        return outcome

    # -- helpers ------------------------------------------------------
    def _render_reel(self, renderer, design, hero, detail, work, out_dir, prefix, pack, outcome) -> None:
        config = self.config
        video = dict(config.video)
        video["music_volume"] = float(config.music.get("volume", 0.55))
        video["fade_in"] = float(config.music.get("fade_in", 1.0))
        video["fade_out"] = float(config.music.get("fade_out", 1.5))

        scale = float(video.get("render_scale", 1.5))
        big = (int(video["width"] * scale), int(video["height"] * scale))
        frame = (int(video["width"]), int(video["height"]))

        paths = {
            "a_base": save_png(renderer.render_base(big, 0), work / "scene-a-base.png"),
            "b_base": save_png(renderer.render_base(big, 1), work / "scene-b-base.png"),
        }
        for variant, (name, copy) in enumerate((("a_text", hero), ("b_text", detail))):
            layer = renderer.render_text_layer(frame, copy, variant)
            layer.save(work / f"scene-{name}.png", "PNG")
            paths[name] = work / f"scene-{name}.png"

        effect = self.library.by_id("effects", design["effect"]) or {}
        sprite_path = None
        if motion.uses_sprite(effect):
            sprite = reel_skill.make_sprite(effect, frame, renderer.palette["accent"])
            if sprite is not None:
                sprite_path = work / "sprite.png"
                sprite.save(sprite_path, "PNG")

        choice = audio_skill.AudioChoice()
        if self.options.use_music and config.music.get("enabled", True):
            track, note = audio_skill.select_music(
                self.library.by_id("music_styles", design["music_style"]) or {},
                config.path("input_music"),
                self.history.recent_values("music_track", 30),
            )
            choice.music, choice.music_note = track, note
            if track is None:
                outcome.notes.append(note)
        if self.options.use_voice:
            voice_path, note = audio_skill.synthesize_voice(
                pack.voice_script,
                self.library.by_id("voice_styles", design["voice_style"]) or {},
                config.path("audio_dir") / f"{prefix}-voice.wav",
                preference=config.voice.get("engine", "auto"),
                model=self.options.piper_model or config.voice.get("model", ""),
            )
            choice.voice, choice.voice_note = voice_path, note
            if voice_path is None:
                outcome.warnings.append(note)

        design["music_track"] = choice.music.name if choice.music else ""
        design["voice_track"] = choice.voice.name if choice.voice else ""

        inputs = reel_skill.ReelInputs(
            scene_a_base=paths["a_base"], scene_a_text=paths["a_text"],
            scene_b_base=paths["b_base"], scene_b_text=paths["b_text"],
            animation_a=self.library.by_id("animations", design["animation_1"]),
            animation_b=self.library.by_id("animations", design["animation_2"]),
            transition=self.library.by_id("transitions", design["transition"]),
            effect=effect, audio=choice, sprite=sprite_path,
        )
        result = reel_skill.render(inputs, out_dir / f"{prefix}-Reel.mp4", video)
        outcome.timings["ffmpeg"] = round(result.seconds, 2)
        if result.ok:
            outcome.files["Reel"] = result.path
        else:
            outcome.warnings.append(f"reel render failed: {result.stderr[-400:]}")

    def _info_text(self, instrument, design, pack, asset, outcome) -> str:
        video = self.config.video
        probe = outcome.reports.get("Reel").probe if outcome.reports.get("Reel") else {}
        duration = probe.get("format", {}).get("duration", "-") if probe else "-"
        lines = [
            "VISION ANALYTICAL - GENERATION INFO",
            "=" * 52,
            f"Generated           : {datetime.now(timezone.utc).astimezone().isoformat(timespec='seconds')}",
            f"Request             : {instrument.request or '(none - taken from input media)'}",
            f"Manufacturer        : {design.get('manufacturer', '')}",
            f"Instrument          : {design.get('instrument_model', '') or '(not identified)'}",
            f"Technique           : {instrument.technique_long or instrument.technique or '-'}",
            f"Service             : {instrument.service or '-'}",
            f"Design Family       : {design['design_family_label']} ({design['design_family']})",
            f"Background          : {design['background_label']} ({design['background']})",
            f"Composition         : {design['composition_label']} ({design['composition']})",
            f"Palette             : {design['color_palette_label']} ({design['color_palette']})",
            f"Layout              : {design['layout_label']} ({design['layout']})",
            f"Typography          : {design['typography_label']} ({design['typography']})",
            f"Camera              : {design['camera_label']} ({design['camera']})",
            f"Animation 1         : {design['animation_1_label']} ({design['animation_1']})",
            f"Animation 2         : {design['animation_2_label']} ({design['animation_2']})",
            f"Transition          : {design['transition_label']} ({design['transition']})",
            f"Effect              : {design['effect_label']} ({design['effect']})",
            f"Music               : {design['music_style_label']} | track: {design.get('music_track') or '(silent)'}",
            f"Voice               : {design['voice_style_label']} | track: {design.get('voice_track') or '(none)'}",
            f"Image Search Query  : {design['image_search_query']}",
            f"Image Asset         : {asset.name} [{asset.source}]",
            f"Image Exact Match   : {'yes' if asset.exact_match else 'NO - ' + asset.note}",
            f"Layout ID           : {design['layout']}",
            f"Design Fingerprint  : {design['design_fingerprint']}",
            f"Anti-Repetition     : {design.get('anti_repetition', '')} "
            f"(attempt {design.get('selection_attempts', 1)}, history {len(self.history.records)})",
            f"Copy Source         : {design.get('copy_source', 'local')}",
            f"AI Model            : {self.config.ollama['model']} (short copy only, optional)",
            f"GPU                 : none - CPU pipeline ({platform.machine()}, {os.cpu_count()} cores)",
            f"Video Codec         : {video['vcodec']} / {video['profile']} / {video['pix_fmt']}",
            f"Audio Codec         : {video['acodec']} {video['abitrate']} @ {video['sample_rate']} Hz",
            f"Resolution          : {video['width']}x{video['height']}",
            f"FPS                 : {video['fps']}",
            f"Duration            : {duration}",
            "",
            "TIMINGS (seconds)",
            "-" * 52,
        ]
        lines += [f"{name:<20}: {value}" for name, value in outcome.timings.items()]
        lines += ["", "OUTPUT FILES", "-" * 52]
        lines += [f"{name:<20}: {path}" for name, path in outcome.files.items()]
        lines += ["", "VALIDATION", "-" * 52]
        for name, report in outcome.reports.items():
            lines += [f"{name}:"] + [f"  {line}" for line in report.as_lines()]
        if outcome.warnings:
            lines += ["", "WARNINGS", "-" * 52] + [f"- {w}" for w in outcome.warnings]
        if outcome.notes:
            lines += ["", "NOTES", "-" * 52] + [f"- {n}" for n in outcome.notes]
        lines += ["", "Automatic generation is disabled - this run was started manually.", ""]
        return "\n".join(lines)

    def _history_record(self, design: dict, outcome: Outcome) -> dict:
        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "manufacturer": design.get("manufacturer", ""),
            "instrument_model": design.get("instrument_model", ""),
            "design_family": design["design_family"],
            "background": design["background"],
            "composition": design["composition"],
            "color_palette": design["color_palette"],
            "layout": design["layout"],
            "typography": design["typography"],
            "camera": design["camera"],
            "animation_1": design["animation_1"],
            "animation_2": design["animation_2"],
            "transition": design["transition"],
            "effect": design["effect"],
            "music_style": design["music_style"],
            "music_track": design.get("music_track", ""),
            "voice_style": design["voice_style"],
            "voice_track": design.get("voice_track", ""),
            "image_search_query": design["image_search_query"],
            "image_asset": design.get("image_asset", ""),
            "image_source": design.get("image_source", ""),
            "layout_id": design["layout"],
            "design_fingerprint": design["design_fingerprint"],
            "copy_source": design.get("copy_source", "local"),
            "output_path": str(outcome.files.get("Reel") or outcome.files.get("POST", "")),
        }
        return record


def check_environment() -> list[str]:
    """Report missing external tools without trying to install anything."""
    problems = []
    if not shutil.which("ffmpeg"):
        problems.append("ffmpeg is not installed")
    if not shutil.which("ffprobe"):
        problems.append("ffprobe is not installed")
    try:
        Image.new("RGB", (2, 2))
    except Exception as exc:  # pragma: no cover - Pillow import failure
        problems.append(f"Pillow is not usable: {exc}")
    return problems
