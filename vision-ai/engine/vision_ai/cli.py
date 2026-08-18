"""Command line entry point for /usr/local/bin/vision-ai-content."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

from .config import load_config
from .library import Library
from .pipeline import AutomationBlocked, Options, Pipeline, check_environment
from .skills.audio import voice_engine
from .skills.ollama_client import OllamaClient

TIMER_UNITS = ("vision-content-studio.timer", "vision-media-studio.timer")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="vision-ai-content",
        description="Vision Analytical creative engine - generates one post set and one phone reel per run.",
        epilog="Automatic generation is disabled by design: this command only ever runs when you run it.",
    )
    parser.add_argument("request", nargs="*", help='e.g. "AMC for Agilent 1260 II HPLC"')
    parser.add_argument("--no-ollama", action="store_true", help="skip the optional short-copy model")
    parser.add_argument("--no-music", action="store_true", help="render with a silent audio track")
    parser.add_argument("--voice", action="store_true", help="add a voice-over if a local TTS is installed")
    parser.add_argument("--piper-model", default="", help="path to a piper .onnx voice model")
    parser.add_argument("--no-reel", action="store_true", help="stills only, no video")
    parser.add_argument("--seed", type=int, default=None, help="reproducible design selection")
    parser.add_argument("--dry-run", action="store_true", help="choose a design and print it, render nothing")
    parser.add_argument("--json", action="store_true", help="machine readable summary on stdout")
    parser.add_argument("--doctor", action="store_true", help="inspect the installation and exit")
    parser.add_argument("--history", type=int, metavar="N", help="show the last N history records and exit")
    parser.add_argument("--benchmark", type=int, metavar="N", help="time N local design selections and exit")
    return parser


def _timer_state() -> dict[str, str]:
    state = {}
    if not shutil.which("systemctl"):
        return {unit: "systemctl not available" for unit in TIMER_UNITS}
    for unit in TIMER_UNITS:
        enabled = subprocess.run(["systemctl", "is-enabled", unit], capture_output=True, text=True, check=False)
        active = subprocess.run(["systemctl", "is-active", unit], capture_output=True, text=True, check=False)
        state[unit] = f"{enabled.stdout.strip() or enabled.stderr.strip().splitlines()[0:1] or 'unknown'} / {active.stdout.strip() or 'inactive'}"
    return state


def doctor(config, library) -> int:
    print("Vision Analytical engine - installation check")
    print("=" * 62)
    print(f"config source     : {config.source}")
    print(f"creative pack     : {config.creative_pack}")
    for key in ("input_photos", "input_videos", "input_music", "output_ready", "work_dir", "audio_dir", "asset_cache"):
        path = config.path(key)
        print(f"{key:<18}: {path} [{'ok' if path.exists() else 'missing'}]")
    print(f"history file      : {config.history_file} "
          f"[{sum(1 for _ in config.history_file.open()) if config.history_file.is_file() else 0} records]")
    print()
    print("creative libraries:", ", ".join(f"{k}={v}" for k, v in library.counts().items()))
    print()
    problems = check_environment()
    print(f"ffmpeg            : {shutil.which('ffmpeg') or 'MISSING'}")
    print(f"ffprobe           : {shutil.which('ffprobe') or 'MISSING'}")
    print(f"local TTS         : {voice_engine() or 'none (voice-over unavailable)'}")
    client = OllamaClient(url=config.ollama["url"], model=config.ollama["model"], timeout=3.0)
    reachable = client.available()
    print(f"ollama            : {'reachable' if reachable else 'not reachable'} at {config.ollama['url']}"
          f" (model {config.ollama['model']}, optional)")
    print()
    print("automatic generation (must stay off):")
    for unit, state in _timer_state().items():
        print(f"  {unit:<32}: {state}")
    if problems:
        print()
        print("PROBLEMS:")
        for problem in problems:
            print(f"  - {problem}")
        return 1
    return 0


def show_history(config, count: int) -> int:
    path = config.history_file
    if not path.is_file():
        print(f"no history yet at {path}")
        return 0
    lines = [line for line in path.read_text(encoding="utf-8", errors="replace").splitlines() if line.strip()]
    print(f"{len(lines)} records in {path}")
    for line in lines[-count:]:
        record = json.loads(line)
        print(f"{record.get('timestamp', '')}  {record.get('manufacturer', ''):<12} "
              f"{record.get('instrument_model', ''):<18} {record.get('design_family', ''):<22} "
              f"{record.get('background', ''):<22} {record.get('animation_1', '')}+{record.get('animation_2', '')}")
    return 0


def benchmark(config, count: int) -> int:
    from .skills.history import DesignHistory
    from .skills.selector import DesignSelector

    library = Library(config)
    history = DesignHistory(config.history_file, int(config.anti_repetition["history_window"]))
    selector = DesignSelector(library, history, config.anti_repetition)
    fields = {"manufacturer": "Agilent", "instrument_model": "1260 Infinity II"}
    started = time.perf_counter()
    designs = []
    for _ in range(count):
        design = selector.select(fields)
        designs.append(design)
        history.records.append(design)
    elapsed = time.perf_counter() - started
    unique = len({d["design_fingerprint"] for d in designs})
    same = sum(1 for d in designs if d["animation_1"] == d["animation_2"])
    print(f"{count} local design selections in {elapsed:.4f}s ({elapsed / count * 1000:.3f} ms each)")
    print(f"unique fingerprints: {unique}/{count}   identical animation pairs: {same}")
    return 0 if unique == count and same == 0 else 1


def main(argv: list[str] | None = None) -> int:
    args = _parser().parse_args(argv)
    config = load_config()
    library = Library(config)

    if args.doctor:
        return doctor(config, library)
    if args.history is not None:
        return show_history(config, args.history)
    if args.benchmark is not None:
        return benchmark(config, args.benchmark)

    problems = check_environment()
    if problems and not args.dry_run:
        for problem in problems:
            print(f"error: {problem}", file=sys.stderr)
        return 2

    options = Options(
        request=" ".join(args.request).strip(),
        use_ollama=not args.no_ollama,
        use_music=not args.no_music,
        use_voice=args.voice,
        skip_reel=args.no_reel,
        seed=args.seed,
        dry_run=args.dry_run,
        piper_model=args.piper_model,
    )

    try:
        outcome = Pipeline(config, options).run()
    except AutomationBlocked as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 3

    if args.json:
        print(json.dumps({
            "ok": outcome.ok,
            "design": outcome.design,
            "files": {k: str(v) for k, v in outcome.files.items()},
            "timings": outcome.timings,
            "warnings": outcome.warnings,
            "notes": outcome.notes,
            "validation": {k: [vars(c) for c in r.checks] for k, r in outcome.reports.items()},
        }, indent=2))
        return 0 if outcome.ok else 1

    design = outcome.design
    print("Vision Analytical - generation complete" if outcome.ok else "Vision Analytical - generation FAILED validation")
    print("-" * 62)
    print(f"instrument   : {design.get('manufacturer', '')} {design.get('instrument_model', '')}".rstrip())
    print(f"image query  : {design.get('image_search_query', '')}")
    print(f"design       : {design.get('design_family_label')} / {design.get('background_label')} / "
          f"{design.get('composition_label')} / {design.get('color_palette_label')}")
    print(f"layout       : {design.get('layout_label')} ({design.get('layout')})  type: {design.get('typography_label')}")
    print(f"motion       : {design.get('animation_1_label')} + {design.get('animation_2_label')} | "
          f"{design.get('transition_label')} | {design.get('effect_label')}")
    print(f"fingerprint  : {design.get('design_fingerprint', '')[:32]}...")
    print(f"timings      : " + ", ".join(f"{k}={v}s" for k, v in outcome.timings.items()))
    for name, path in outcome.files.items():
        print(f"{name:<12} : {path}")
    for name, report in outcome.reports.items():
        failures = report.failures
        print(f"validation {name:<7}: {'PASS' if report.ok else 'FAIL - ' + '; '.join(f.name for f in failures)}")
    for warning in outcome.warnings:
        print(f"warning      : {warning}")
    for note in outcome.notes:
        print(f"note         : {note}")
    return 0 if outcome.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
