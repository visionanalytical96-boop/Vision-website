"""Skills 15 + 16: phone compatibility and output validation.

Nothing is reported as delivered until ffprobe agrees it matches the contract:
H.264 High/Main, yuv420p, 1080x1920, 30 fps, AAC audio present, duration on
target, faststart-friendly file size.
"""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Check:
    name: str
    ok: bool
    detail: str


@dataclass
class Report:
    path: Path
    checks: list[Check] = field(default_factory=list)
    probe: dict = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return all(check.ok for check in self.checks)

    @property
    def failures(self) -> list[Check]:
        return [check for check in self.checks if not check.ok]

    def as_lines(self) -> list[str]:
        return [f"[{'PASS' if c.ok else 'FAIL'}] {c.name}: {c.detail}" for c in self.checks]


def ffprobe(path: Path) -> dict:
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True, check=False, timeout=60,
    )
    if proc.returncode != 0:
        return {}
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError:
        return {}


def _fps(stream: dict) -> float:
    raw = stream.get("avg_frame_rate") or stream.get("r_frame_rate") or "0/1"
    try:
        num, den = raw.split("/")
        return float(num) / float(den) if float(den) else 0.0
    except (ValueError, ZeroDivisionError):
        return 0.0


def validate_video(path: Path, video: dict, settings: dict) -> Report:
    path = Path(path)
    report = Report(path)
    add = report.checks.append

    if not path.is_file():
        add(Check("file exists", False, f"{path} is missing"))
        return report
    size = path.stat().st_size
    add(Check("file exists", True, f"{path.name} ({size / 1_048_576:.2f} MB)"))
    ceiling = int(settings.get("max_video_bytes", 26_214_400))
    add(Check("file size", int(settings.get("min_video_bytes", 300000)) <= size <= ceiling,
              f"{size} bytes (min {settings.get('min_video_bytes')}, max {ceiling} - phone/WhatsApp friendly)"))

    probe = ffprobe(path)
    report.probe = probe
    if not probe:
        add(Check("ffprobe", False, "ffprobe could not read the file"))
        return report

    streams = probe.get("streams", [])
    video_streams = [s for s in streams if s.get("codec_type") == "video"]
    audio_streams = [s for s in streams if s.get("codec_type") == "audio"]

    add(Check("video stream", bool(video_streams), f"{len(video_streams)} video stream(s)"))
    add(Check("audio stream", bool(audio_streams), f"{len(audio_streams)} audio stream(s)"))
    if not video_streams:
        return report

    v = video_streams[0]
    add(Check("video codec", v.get("codec_name") == "h264", str(v.get("codec_name"))))
    add(Check("profile", str(v.get("profile", "")).lower() in {"high", "main", "constrained baseline", "baseline"},
              str(v.get("profile"))))
    add(Check("pixel format", v.get("pix_fmt") == video["pix_fmt"], str(v.get("pix_fmt"))))
    add(Check("width", int(v.get("width", 0)) == int(video["width"]), str(v.get("width"))))
    add(Check("height", int(v.get("height", 0)) == int(video["height"]), str(v.get("height"))))
    fps = _fps(v)
    add(Check("frame rate", abs(fps - float(video["fps"])) < 0.6, f"{fps:.2f} fps"))

    if audio_streams:
        a = audio_streams[0]
        add(Check("audio codec", a.get("codec_name") == "aac", str(a.get("codec_name"))))
        add(Check("sample rate", int(a.get("sample_rate", 0)) == int(video["sample_rate"]),
                  str(a.get("sample_rate"))))

    duration = float(probe.get("format", {}).get("duration", 0.0))
    tolerance = float(settings.get("duration_tolerance", 0.75))
    add(Check("duration", abs(duration - float(video["duration"])) <= tolerance,
              f"{duration:.2f}s (target {video['duration']}s +/-{tolerance})"))
    return report


def validate_image(path: Path, expected: tuple[int, int], settings: dict) -> Report:
    from PIL import Image

    path = Path(path)
    report = Report(path)
    add = report.checks.append
    if not path.is_file():
        add(Check("file exists", False, f"{path} is missing"))
        return report
    size = path.stat().st_size
    add(Check("file exists", True, f"{path.name} ({size / 1024:.0f} KB)"))
    add(Check("file size", size >= int(settings.get("min_image_bytes", 40000)), f"{size} bytes"))
    try:
        with Image.open(path) as image:
            dimensions = image.size
    except OSError as exc:
        add(Check("readable", False, str(exc)[:120]))
        return report
    add(Check("dimensions", dimensions == expected, f"{dimensions[0]}x{dimensions[1]} (expected {expected[0]}x{expected[1]})"))
    return report
