"""Human-sounding voice-over: download, verify and rotate piper voices.

espeak sounds like a machine because it is a formant synthesiser. piper is a
neural voice and sounds like a person, runs on CPU, and each voice is a 60-120
MB file downloaded once. This module keeps a roster, fetches a voice the first
time it is needed, proves it actually loads (a download can arrive corrupt),
and picks a different character each run.

    python3 brain/voices.py --list
    python3 brain/voices.py --warm            # download the whole roster
    python3 brain/voices.py --say "hello"     # try the next voice
"""

from __future__ import annotations

import argparse
import json
import random
import re
import subprocess
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
for _candidate in (_HERE, _HERE.parent / "engine"):
    if (_candidate / "vision_ai").is_dir() and str(_candidate) not in sys.path:
        sys.path.insert(0, str(_candidate))

VOICE_DIR = _HERE / "piper-voices"
PIPER_VENV = _HERE / "piper-venv"
BROKEN_MARKER = ".broken"


def piper_binary() -> Path | None:
    candidate = PIPER_VENV / "bin" / "piper"
    return candidate if candidate.is_file() else None


def piper_python() -> Path | None:
    candidate = PIPER_VENV / "bin" / "python"
    return candidate if candidate.is_file() else None


def roster(library) -> list[dict]:
    from vision_ai.config import BUNDLED_PACK
    path = Path(library.pack) / "voice" / "voices.json"
    if not path.is_file():
        path = BUNDLED_PACK / "voice" / "voices.json"
    return json.loads(path.read_text())["voices"]


def model_path(voice: dict) -> Path:
    return VOICE_DIR / f"{voice['piper']}.onnx"


def _verify(model: Path) -> bool:
    """A download can finish and still be truncated - make it speak one word."""
    binary = piper_binary()
    if binary is None or not model.is_file() or model.stat().st_size < 5_000_000:
        return False
    probe = model.with_suffix(".probe.wav")
    try:
        result = subprocess.run([str(binary), "-m", str(model), "-f", str(probe)],
                                input=b"ready", capture_output=True, timeout=300)
        ok = result.returncode == 0 and probe.is_file() and probe.stat().st_size > 2000
    except (subprocess.SubprocessError, OSError):
        ok = False
    finally:
        probe.unlink(missing_ok=True)
    return ok


def ensure(voice: dict, quiet: bool = False) -> Path | None:
    """Return a usable model file, downloading and checking it once."""
    model = model_path(voice)
    marker = model.with_suffix(model.suffix + BROKEN_MARKER)
    if marker.is_file():
        return None
    if model.is_file() and model.with_suffix(".onnx.json").is_file():
        return model

    python = piper_python()
    if python is None:
        if not quiet:
            print(f"[voice] piper venv missing at {PIPER_VENV}")
        return None
    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    if not quiet:
        print(f"[voice] downloading {voice['piper']} ({voice['character']}) - one time, ~60-120 MB")
    try:
        subprocess.run([str(python), "-m", "piper.download_voices", voice["piper"],
                        "--download-dir", str(VOICE_DIR)],
                       capture_output=True, timeout=1800, check=True)
    except (subprocess.SubprocessError, OSError) as exc:
        if not quiet:
            print(f"[voice] download failed: {str(exc)[:100]}")
        return None
    if not _verify(model):
        if not quiet:
            print(f"[voice] {voice['piper']} downloaded but will not load - skipping it from now on")
        model.unlink(missing_ok=True)
        marker.write_text("model failed to load after download\n")
        return None
    return model


def choose(voices: list[dict], recent: list[str], seed: str = "", lang: str = "mix") -> dict:
    """A different character than the last few runs, in the wanted language.

    'mix' is what an Indian audience actually hears: mostly Indian English,
    with Hindi every fourth or so post.
    """
    rng = random.Random(seed)
    if lang == "mix":
        lang = "hi" if rng.random() < 0.25 else "en-in"
    voices = [v for v in voices if v.get("lang", "en") == lang] or voices
    unused = [v for v in voices if v["id"] not in recent]
    return rng.choice(unused or voices)


def available(voices: list[dict]) -> list[dict]:
    return [v for v in voices if model_path(v).is_file()
            and not model_path(v).with_suffix(".onnx" + BROKEN_MARKER).is_file()]


ACRONYMS = {
    "HPLC": "H P L C", "UHPLC": "U H P L C", "GC": "G C", "LCMS": "L C M S", "GCMS": "G C M S",
    "LC-MS": "L C M S", "GC-MS": "G C M S", "ICP-MS": "I C P M S", "ICP-OES": "I C P O E S",
    "AMC": "A M C", "CMC": "C M C", "IQ": "I Q", "OQ": "O Q", "PQ": "P Q", "QC": "Q C",
    "UV": "U V", "FTIR": "F T I R", "AAS": "A A S", "R&D": "R and D", "NX": "N X",
}


def speakable(text: str, lang: str = "en") -> str:
    """Write it the way it should be read aloud: web addresses, acronyms and
    model numbers are what make a synthetic voice sound wrong."""
    out = text
    if lang == "hi":
        # the Hindi scripts are already written the way they should be read
        return re.sub(r"\s{2,}", " ", out).strip()
    out = re.sub(r"\b([\w-]+)\.(in|com|net|org|co\.in)\b",
                 lambda m: f"{re.sub(r'[-.]', ' ', m.group(1))} dot {m.group(2).replace('.', ' dot ')}", out)
    for token, spoken in ACRONYMS.items():
        out = re.sub(rf"(?<![A-Za-z]){re.escape(token)}(?![A-Za-z])", spoken, out)
    # 1260 reads better as "twelve sixty" than "one thousand two hundred sixty"
    out = re.sub(r"\b(1[0-9])([0-9]{2})\b", lambda m: f"{m.group(1)} {m.group(2)}", out)
    return re.sub(r"\s{2,}", " ", out).strip()


def speak(script: str, voice: dict, out_path: Path, sentence_silence: float = 0.35) -> tuple[Path | None, str]:
    """Synthesise one line. Returns (wav, note); never raises into a run."""
    model = ensure(voice, quiet=True)
    if model is None:
        return None, f"voice {voice['id']} unavailable (run: python3 brain/voices.py --warm)"
    binary = piper_binary()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        command = [str(binary), "-m", str(model), "-f", str(out_path)]
        if voice.get("speaker") is not None:
            command += ["-s", str(voice["speaker"])]
        result = subprocess.run(
            command + [
             "--length-scale", str(voice.get("length_scale", 1.0)),
             "--noise-scale", str(voice.get("noise_scale", 0.667)),
             "--noise-w-scale", str(voice.get("noise_w", 0.8)),
             "--sentence-silence", str(sentence_silence)],
            input=speakable(script, voice.get("lang", "en")).encode("utf-8"),
            capture_output=True, timeout=600)
    except (subprocess.SubprocessError, OSError) as exc:
        return None, f"voice synthesis failed: {str(exc)[:100]}"
    if result.returncode != 0 or not out_path.is_file() or out_path.stat().st_size < 4000:
        return None, f"voice synthesis produced nothing ({result.stderr.decode()[-80:].strip()})"
    return out_path, f"{voice['id']} - {voice['character']}"


def main(argv: list[str] | None = None) -> int:
    from vision_ai.config import load_config
    from vision_ai.library import Library
    try:  # `python3 -m brain.voices` from the parent dir
        from . import config_env
    except ImportError:  # `python3 /path/to/brain/voices.py`
        sys.path.insert(0, str(_HERE.parent))
        from brain import config_env

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", action="store_true")
    parser.add_argument("--warm", action="store_true", help="download every voice in the roster")
    parser.add_argument("--say", help="synthesise a line with the next voice")
    parser.add_argument("--voice", help="use this voice id")
    args = parser.parse_args(argv)

    library = Library(load_config(config_env.to_overrides(config_env.load())))
    voices = roster(library)

    if args.list or not (args.warm or args.say):
        ready = {v["id"] for v in available(voices)}
        for voice in voices:
            print(f"  {voice['id']:12s} {voice['piper']:38s} {voice['character']:26s} "
                  f"{'ready' if voice['id'] in ready else 'not downloaded'}")
        return 0

    if args.warm:
        ok = sum(1 for voice in voices if ensure(voice) is not None)
        print(f"\n{ok}/{len(voices)} voices ready in {VOICE_DIR}")
        return 0

    voice = next((v for v in voices if v["id"] == args.voice), None) if args.voice else choose(voices, [], "cli")
    model = ensure(voice)
    if model is None:
        return 1
    out = Path("/tmp") / f"voice-{voice['id']}.wav"
    subprocess.run([str(piper_binary()), "-m", str(model), "-f", str(out),
                    "--length-scale", str(voice["length_scale"]),
                    "--noise-scale", str(voice["noise_scale"]),
                    "--noise-w-scale", str(voice["noise_w"]),
                    "--sentence-silence", "0.35"],
                   input=speakable(args.say).encode("utf-8"), capture_output=True, timeout=300)
    print(f"{voice['id']} ({voice['character']}) -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
