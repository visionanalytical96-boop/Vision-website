"""Instrumental beds generated locally - no downloads, no licence questions.

Pure-Python additive synthesis (no numpy, no models, no GPU): slow pads, a
soft bell arpeggio and a sub bass, run through a cheap reverb. Around 2-4 s of
CPU for a 20 s bed, then cached, so a reel never waits for it twice.

    python3 brain/music_gen.py --style cinematic --preview
"""

from __future__ import annotations

import argparse
import math
import random
import sys
import wave
from array import array
from pathlib import Path

RATE = 44100
_TABLE_BITS = 12
_TABLE_SIZE = 1 << _TABLE_BITS
_TABLE_MASK = _TABLE_SIZE - 1
# One sine table, read with an integer phase accumulator: same sound as
# math.sin() per sample, roughly an order of magnitude less CPU.
_SINE = array("d", [math.sin(2.0 * math.pi * i / _TABLE_SIZE) for i in range(_TABLE_SIZE)])
_PHASE_SCALE = _TABLE_SIZE / RATE

# style -> (chord degrees, root note, brightness, bell density, bass level)
STYLES = {
    "cinematic":          ([(0, 3, 7, 10), (-2, 3, 7, 10), (-4, 3, 7, 12), (-5, 2, 7, 11)], 48, 0.55, 0.5, 0.9),
    "premium_corporate":  ([(0, 4, 7, 11), (2, 5, 9, 12), (-3, 4, 7, 11), (-1, 4, 8, 11)], 52, 0.75, 0.6, 0.6),
    "ambient_science":    ([(0, 7, 12, 16), (-2, 5, 12, 14), (0, 7, 12, 19), (-4, 3, 10, 15)], 55, 0.85, 0.35, 0.5),
    "soft_piano":         ([(0, 4, 7, 12), (-3, 4, 9, 12), (-5, 4, 7, 11), (-1, 3, 8, 12)], 57, 0.65, 0.9, 0.4),
    "luxury":             ([(0, 3, 7, 10), (-3, 3, 8, 10), (-5, 3, 7, 10), (-7, 4, 7, 11)], 45, 0.5, 0.45, 1.0),
    "minimal_electronic": ([(0, 3, 7, 10), (0, 3, 7, 12), (-2, 3, 7, 10), (-2, 5, 7, 10)], 50, 0.7, 0.7, 0.8),
    "deep_ambient":       ([(0, 7, 12, 19), (-5, 7, 12, 17), (0, 5, 12, 17), (-7, 7, 12, 19)], 43, 0.4, 0.25, 1.0),
    "technology":         ([(0, 4, 7, 11), (-2, 4, 7, 11), (-4, 3, 7, 10), (-2, 5, 9, 12)], 53, 0.8, 0.75, 0.7),
    "pharmaceutical":     ([(0, 4, 7, 11), (-1, 4, 7, 12), (-3, 4, 9, 11), (0, 5, 7, 12)], 56, 0.8, 0.5, 0.45),
    "modern_editorial":   ([(0, 3, 7, 10), (-4, 3, 7, 10), (-2, 4, 7, 11), (-5, 3, 7, 12)], 51, 0.7, 0.65, 0.7),
    "future_tech":        ([(0, 3, 7, 14), (-2, 3, 7, 12), (-4, 5, 7, 14), (-2, 3, 8, 12)], 49, 0.9, 0.8, 0.85),
    "clean_corporate":    ([(0, 4, 7, 12), (-3, 4, 7, 11), (-1, 5, 8, 12), (-5, 4, 7, 11)], 54, 0.8, 0.6, 0.5),
}
DEFAULT_STYLE = "cinematic"


def midi_hz(note: float) -> float:
    return 440.0 * (2.0 ** ((note - 69) / 12.0))


def _pad(buffer: array, start: int, length: int, freq: float, level: float, brightness: float) -> None:
    """Detuned sine stack with a slow swell - the bed everything sits on."""
    partials = ((1.0, 1.0), (2.0, 0.30 * brightness), (3.0, 0.14 * brightness), (4.0, 0.06 * brightness))
    detune = (0.0, 0.13, -0.11)
    attack, release = max(1, int(length * 0.35)), max(1, int(length * 0.45))
    end = min(length, len(buffer) - start)
    if end <= 0:
        return
    envelope = array("d", [0.0]) * end          # shaped once, shared by every partial
    for i in range(end):
        value = min(1.0, i / attack) if i < attack else 1.0
        if i > length - release:
            value *= max(0.0, (length - i) / release)
        envelope[i] = value
    table = _SINE
    for offset in detune:
        for multiple, weight in partials:
            step = (freq + offset) * multiple * _PHASE_SCALE
            phase = random.random() * _TABLE_SIZE
            amp = level * weight / len(detune)
            if amp < 1e-4:
                continue
            position = start
            for i in range(end):
                buffer[position] += amp * envelope[i] * table[int(phase) & _TABLE_MASK]
                phase += step
                position += 1


def _bell(buffer: array, start: int, freq: float, level: float, decay: float = 1.6) -> None:
    """Short struck tone - reads as a piano/mallet without sampling anything."""
    length = min(int(decay * RATE), len(buffer) - start)
    if length <= 0:
        return
    table = _SINE
    step, step2 = freq * _PHASE_SCALE, freq * 2.01 * _PHASE_SCALE
    phase = phase2 = 0.0
    decay_step = math.exp(-3.2 / length)
    envelope = 1.0
    position = start
    for _ in range(length):
        buffer[position] += level * envelope * (table[int(phase) & _TABLE_MASK]
                                                + 0.25 * table[int(phase2) & _TABLE_MASK])
        phase += step
        phase2 += step2
        envelope *= decay_step
        position += 1


def _reverb(buffer: array, mix: float = 0.32) -> None:
    """Three taps and a one-pole lowpass - cheap, and enough for space."""
    for delay_ms, gain in ((71, 0.42), (113, 0.30), (191, 0.22)):
        delay = int(RATE * delay_ms / 1000)
        for i in range(delay, len(buffer)):
            buffer[i] += buffer[i - delay] * gain * mix
    previous = 0.0
    for i in range(len(buffer)):
        previous = previous + 0.35 * (buffer[i] - previous)
        buffer[i] = previous


def render(style: str = DEFAULT_STYLE, seconds: float = 20.0, seed: int | None = None) -> array:
    chords, root, brightness, bell_density, bass = STYLES.get(style, STYLES[DEFAULT_STYLE])
    rng = random.Random(seed if seed is not None else style)
    random.seed(rng.random())

    total = int(seconds * RATE)
    buffer = array("d", [0.0]) * total
    bar = total // len(chords)

    for index, chord in enumerate(chords):
        start = index * bar
        for degree in chord:
            _pad(buffer, start, int(bar * 1.25), midi_hz(root + degree), 0.16, brightness)
        _pad(buffer, start, int(bar * 1.15), midi_hz(root + chord[0] - 12), 0.20 * bass, 0.25)

        steps = max(2, int(6 * bell_density))
        for step in range(steps):
            if rng.random() > bell_density:
                continue
            degree = chord[rng.randrange(len(chord))] + rng.choice((0, 12, 12, 24))
            _bell(buffer, start + int(bar * step / steps), midi_hz(root + degree), 0.10 * bell_density)

    _reverb(buffer)

    peak = max(1e-9, max(abs(sample) for sample in buffer))
    target = 0.72 / peak
    fade = int(1.5 * RATE)
    for i in range(total):
        value = buffer[i] * target
        if i < fade:
            value *= i / fade
        if i > total - fade:
            value *= max(0.0, (total - i) / fade)
        buffer[i] = math.tanh(value * 1.05) * 0.92  # soft clip, no harsh peaks
    return buffer


def write_wav(buffer: array, path: Path) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    mono = array("h", (int(max(-1.0, min(1.0, sample)) * 32767) for sample in buffer))
    stereo = array("h", [0]) * (2 * len(mono))
    stereo[0::2] = mono
    stereo[1::2] = mono
    with wave.open(str(path), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(stereo.tobytes())
    return path


def ensure(style: str, cache_dir: Path, seconds: float = 14.0, seed: int | None = None) -> Path:
    """Return a cached bed for this style, rendering it once if needed.

    Beds are looped by ffmpeg, so a short one covers any reel length; two
    variants per style keep the cold-start cost near a minute for the whole
    library while still giving the same style two different readings.
    """
    style = style if style in STYLES else DEFAULT_STYLE
    variant = (seed if seed is not None else 0) % 2
    path = Path(cache_dir) / f"vision-{style}-{variant}.wav"
    if path.is_file() and path.stat().st_size > 100_000:
        return path
    return write_wav(render(style, seconds, seed), path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--style", default=DEFAULT_STYLE, choices=sorted(STYLES))
    parser.add_argument("--seconds", type=float, default=20.0)
    parser.add_argument("--seed", type=int)
    parser.add_argument("--out", default="")
    parser.add_argument("--all", action="store_true", help="render one bed per style")
    parser.add_argument("--warm", metavar="DIR", help="fill the engine's music cache (correct filenames)")
    parser.add_argument("--variants", type=int, default=2, help="with --warm: beds per style (default 2)")
    args = parser.parse_args(argv)

    if args.warm:
        import time
        cache = Path(args.warm)
        started = time.perf_counter()
        made = 0
        for style in sorted(STYLES):
            for variant in range(max(1, args.variants)):
                path = ensure(style, cache, args.seconds, seed=variant)
                print(f"  {style:20s} {path.name}")
                made += 1
        print(f"\n{made} beds ready in {cache}  ({time.perf_counter() - started:.0f}s)")
        return 0

    out_dir = Path(args.out).parent if args.out else Path.cwd()
    styles = sorted(STYLES) if args.all else [args.style]
    for style in styles:
        import time
        started = time.perf_counter()
        path = Path(args.out) if (args.out and not args.all) else out_dir / f"vision-{style}.wav"
        write_wav(render(style, args.seconds, args.seed), path)
        print(f"{style:20s} {path}  ({time.perf_counter() - started:.1f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
