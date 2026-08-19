"""Skills 13 + 14: music selection and optional CPU voice-over.

Music is never downloaded - only tracks the operator placed in INPUT/MUSIC are
used. Voice-over is off unless asked for, and only uses a TTS binary that is
already installed.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

AUDIO_SUFFIXES = {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg", ".opus"}


@dataclass
class AudioChoice:
    music: Path | None = None
    voice: Path | None = None
    music_note: str = ""
    voice_note: str = ""


def _tracks(music_dir: Path) -> list[Path]:
    if not Path(music_dir).is_dir():
        return []
    return sorted(p for p in Path(music_dir).rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_SUFFIXES)


def select_music(style: dict, music_dir: Path, used: list[str] | None = None) -> tuple[Path | None, str]:
    """Skill 14. Prefer a track whose filename matches the selected style, then
    rotate through whatever else the operator supplied."""
    tracks = _tracks(music_dir)
    if not tracks:
        return None, "no track in INPUT/MUSIC - reel rendered with a silent audio track"
    used = used or []
    keywords = [k.lower() for k in style.get("keywords", [])]
    matches = [t for t in tracks if any(k in t.stem.lower() for k in keywords)]
    pool = matches or tracks
    counts = {str(t): sum(1 for u in used if Path(u).name == t.name) for t in pool}
    choice = min(pool, key=lambda t: (counts[str(t)], t.name))
    note = "matched the selected music style" if matches else "no style match - using an available track"
    return choice, note


VENV_PIPER = "/srv/vision-workspace/vision-ai/brain/piper-venv/bin/piper"


def voice_engine(preference: str = "auto") -> str:
    """Which CPU TTS is actually installed."""
    if Path(VENV_PIPER).is_file():
        return "piper-venv"
    if preference in {"piper", "espeak"} and shutil.which(preference if preference != "espeak" else "espeak-ng"):
        return preference
    if shutil.which("piper"):
        return "piper"
    if shutil.which("espeak-ng"):
        return "espeak"
    if shutil.which("espeak"):
        return "espeak"
    return ""


def synthesize_voice(script: str, style: dict, out_path: Path, preference: str = "auto",
                     model: str = "") -> tuple[Path | None, str]:
    """Skill 13. Returns (wav path, note). Never installs anything."""
    engine = voice_engine(preference)
    if not engine:
        return None, "no local TTS binary found (install piper or espeak-ng to enable voice-over)"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        if engine == "piper":
            if not model:
                return None, "piper is installed but no voice model was configured"
            subprocess.run(["piper", "--model", model, "--output_file", str(out_path)],
                           input=script.encode("utf-8"), check=True, capture_output=True, timeout=120)
        else:
            binary = "espeak-ng" if shutil.which("espeak-ng") else "espeak"
            subprocess.run([binary, "-s", str(style.get("rate", 150)), "-p", str(style.get("pitch", 40)),
                            "-w", str(out_path), script],
                           check=True, capture_output=True, timeout=120)
    except (subprocess.SubprocessError, OSError) as exc:
        return None, f"voice synthesis failed: {str(exc)[:120]}"
    if not out_path.is_file() or out_path.stat().st_size < 1000:
        return None, "voice synthesis produced no audio"
    return out_path, f"generated with {engine}"


def audio_plan(choice: AudioChoice, duration: float, volume: float, fade_in: float, fade_out: float,
               sample_rate: int, channels: int, first_index: int = 0) -> tuple[list[str], list[str], str]:
    """Build the ffmpeg input args and filter chain for the audio track.

    There is always an audio stream: a silent one when nothing was supplied, so
    the phone-compatibility contract (AAC audio present) always holds.
    """
    inputs: list[str] = []
    filters: list[str] = []
    labels: list[str] = []

    if choice.music:
        index = first_index + len(labels)
        inputs += ["-stream_loop", "-1", "-i", str(choice.music)]
        filters.append(
            f"[{index}:a]atrim=0:{duration:.2f},asetpts=PTS-STARTPTS,"
            f"afade=t=in:st=0:d={fade_in:.2f},afade=t=out:st={max(0.0, duration - fade_out):.2f}:d={fade_out:.2f},"
            f"volume={volume:.2f}[mus]"
        )
        labels.append("mus")
    if choice.voice:
        index = first_index + len(labels)
        inputs += ["-i", str(choice.voice)]
        # Broadcast-style voice chain: cut the rumble, even out the level, then
        # sit it above the bed. This is most of what makes narration sound
        # produced rather than pasted on.
        filters.append(
            f"[{index}:a]adelay=500|500,atrim=0:{duration:.2f},asetpts=PTS-STARTPTS,"
            f"highpass=f=90,acompressor=threshold=0.09:ratio=4:attack=15:release=250,"
            f"dynaudnorm=f=250:g=6,volume=1.7[voc]"
        )
        labels.append("voc")

    if not labels:
        inputs += ["-f", "lavfi", "-t", f"{duration:.2f}",
                   "-i", f"anullsrc=channel_layout={'stereo' if channels == 2 else 'mono'}:sample_rate={sample_rate}"]
        return inputs, [], f"{first_index}:a"

    if len(labels) == 1:
        chain = filters + [f"[{labels[0]}]aformat=sample_rates={sample_rate}:channel_layouts="
                           f"{'stereo' if channels == 2 else 'mono'},apad,atrim=0:{duration:.2f}[aout]"]
        return inputs, chain, "aout"

    if "mus" in labels and "voc" in labels:
        # Duck the music under the narration the way an ad does, instead of
        # leaving both at a fixed level and hoping.
        chain = filters + [
            "[voc]asplit=2[voc_key][voc_out]",
            "[mus][voc_key]sidechaincompress=threshold=0.045:ratio=9:attack=25:release=450:makeup=1[mus_ducked]",
            f"[mus_ducked][voc_out]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,"
            f"alimiter=limit=0.93:level=disabled,"
            f"aformat=sample_rates={sample_rate}:channel_layouts="
            f"{'stereo' if channels == 2 else 'mono'},apad,atrim=0:{duration:.2f}[aout]",
        ]
        return inputs, chain, "aout"

    mixed = "".join(f"[{label}]" for label in labels)
    chain = filters + [
        f"{mixed}amix=inputs={len(labels)}:duration=first:dropout_transition=0:normalize=0,"
        f"alimiter=limit=0.93:level=disabled,"
        f"aformat=sample_rates={sample_rate}:channel_layouts={'stereo' if channels == 2 else 'mono'},"
        f"apad,atrim=0:{duration:.2f}[aout]"
    ]
    return inputs, chain, "aout"
