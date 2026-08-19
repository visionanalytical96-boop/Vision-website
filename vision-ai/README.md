# Vision Analytical - AI Creative Media System

Local-first generator for premium analytical-instrument social content: one
command produces a square post, a portrait post, a story, a phone reel, a
caption and a full metadata/validation report.

> **Automatic generation is off and stays off.** There is no timer, no service
> and no cron entry in this package, and the engine refuses to run when it
> detects a systemd invocation. Content is produced only when a person runs the
> command.

## Where it runs

The engine is designed for the Vision Analytical Ubuntu server (no GPU) and
installs alongside what is already there:

| Path | Role |
|---|---|
| `/usr/local/bin/vision-ai-content` | the command (backed up before replacement) |
| `/srv/vision-workspace/vision-ai/engine` | Python engine |
| `/srv/vision-workspace/vision-ai/creative-pack` | creative libraries + design history |
| `/srv/vision-mobile/INPUT/{PHOTOS,VIDEOS,MUSIC}` | operator input (never deleted) |
| `/srv/vision-mobile/OUTPUT/READY` | finished files |
| `/srv/vision-workspace/vision-media-studio/{tmp,audio}` | working files |

Every path is configurable in `creative-pack/config/engine.json` or by
environment variable (`VISION_AI_OUTPUT_READY`, `VISION_AI_ROOT`, …).

## Install

```bash
cd vision-ai
sudo ./install.sh --dry-run     # show exactly what would change
sudo ./install.sh               # install (reuses existing dirs, backs up the old command)
sudo ./install.sh --with-deps   # also apt-installs ffmpeg / Pillow / fonts if missing
vision-ai-content --doctor      # verify paths, libraries, ffmpeg, ollama, timer state
```

The installer never overwrites a creative-pack file you have edited, never
touches `INPUT/` or `OUTPUT/`, and never creates or enables a timer.

## Generate

```bash
sudo vision-ai-content "AMC for Agilent 1260 II HPLC"
sudo vision-ai-content "IQ/OQ/PQ for Shimadzu UV-1900i" --no-ollama
sudo vision-ai-content "Refurbished Waters Alliance e2695" --voice --no-music
vision-ai-content "Agilent 8890 GC" --dry-run          # pick a design, render nothing
vision-ai-content --history 20                          # what has been generated
vision-ai-content --benchmark 200                       # local selection speed
```

Output lands in `/srv/vision-mobile/OUTPUT/READY`:

```
Vision-Analytical-YYYYMMDD-HHMMSS-POST.png     1080x1350 portrait
Vision-Analytical-YYYYMMDD-HHMMSS-SQUARE.png   1080x1080 square
Vision-Analytical-YYYYMMDD-HHMMSS-STORY.png    1080x1920 story
Vision-Analytical-YYYYMMDD-HHMMSS-Reel.mp4     1080x1920 H.264/AAC 30fps 15-30s
Vision-Analytical-YYYYMMDD-HHMMSS-Caption.txt
Vision-Analytical-YYYYMMDD-HHMMSS-Info.txt     design + validation report
```

## How a run works

```mermaid
flowchart TD
    A[operator request + INPUT media] --> B[instrument identification]
    B --> C[exact image search query<br/>manufacturer + model]
    C --> D[local creative brain<br/>family, background, composition,<br/>palette, layout, type, camera,<br/>2 animations, transition, effect]
    D --> E{history check<br/>fingerprint + structure}
    E -- repeat --> D
    E -- unique --> F[authentic image resolution]
    F --> G[Pillow stills:<br/>post, square, story, reel scenes]
    G --> H[ffmpeg reel:<br/>2 scenes, 2 motions, transition, effect]
    H --> I[optional Ollama short copy]
    I --> J[optional CPU voice-over + music]
    J --> K[ffprobe validation]
    K -- pass --> L[write design history]
    K -- fail --> M[report failure, history untouched]
```

Local Python makes every design decision (about 0.2 ms per design). Ollama is
asked only for a headline and a call to action, capped at a few words and a few
seconds, and any failure silently falls back to the local templates.

## Instrument identity rules

- The manufacturer and model in the request are the ones used, everywhere.
- `IMAGE_SEARCH_QUERY` always contains the exact manufacturer + exact model.
- A photo is used only when it is the requested model: a file named
  `Agilent-1260-...jpg` is never used for a 1290 request.
- With no authentic photo, the design is rendered typographically and the
  Info file says so - the engine never shows a different instrument and never
  invents hardware.
- Curated authentic photos live in
  `creative-pack/images/<manufacturer>/<model>/` and rotate between runs.

## Anti-repetition

Each design has a SHA-256 fingerprint over manufacturer, model, family,
background, composition, palette, layout, typography, camera, both animations,
transition, effect, music and voice. A run rejects a design when

- the fingerprint already exists in the last 1000 records, or
- `background + composition + layout` was used in the last 10 records, or
- `animation_1 == animation_2` (never possible - the sampler draws without
  replacement).

Recently used values are down-weighted, so families, palettes, backgrounds and
effects rotate rather than clustering.

## Creative libraries

`creative-pack/` is plain JSON and is meant to be edited on the server:

| Library | Count |
|---|---|
| design families | 20 |
| backgrounds | 15 |
| compositions | 15 |
| layouts | 20 |
| palettes | 18 |
| typography sets | 8 |
| animations | 25 |
| camera framings | 10 |
| transitions | 15 |
| effects | 20 |
| music styles | 12 |
| voice styles | 6 |
| instrument knowledge | 12 manufacturers, 12 techniques, 30 models, 8 services |

## Video contract

1080x1920, 30 fps, H.264 High, yuv420p, AAC-LC 192k @ 48 kHz, `+faststart`,
bitrate capped so files stay phone- and WhatsApp-friendly. Every file is
checked with `ffprobe` before it is reported as delivered; a failed check
means nothing is written to design history.

### Length follows the narration

A silent reel is 15 s. With `--voice` the reel is as long as the narration
needs, because a sentence cut in half is worse than a reel that runs a little
long:

| Narration | Reel |
|---|---|
| under ~13 s | 15 s (`REEL_MIN_SECONDS`) |
| 13-28 s | narration + 2.2 s of lead-in and tail |
| over 28 s | the speaker is paced up to 1.18x to fit `REEL_MAX_SECONDS` (30 s) |
| longer than even that allows | the reel runs past 30 s rather than truncating |

The encoder's bitrate ceiling is recalculated from the final length, so a 30 s
reel is still under the size limit. Set `REEL_MIN_SECONDS` / `REEL_MAX_SECONDS`
in the env file to change the window.

## Logo

The brand logo keeps its own colours. A logo file that is artwork on solid
white has the white keyed out per-channel, so the paper and the counters
inside letters go transparent while saturated brand colours stay fully
opaque. When the artwork would otherwise disappear into the background it is
given a tight rounded card instead of being repainted. `LOGO_MONO=1` forces
the old single-colour knockout.

## Tests

```bash
python3 vision-ai/tests/test_engine.py        # full suite (includes an ffmpeg sweep)
python3 vision-ai/tests/test_engine.py -q     # skip the ffmpeg sweep
```

The sweep renders every animation, every transition and every effect through
ffmpeg to prove the filtergraphs are valid.

## Optional pieces

- **Ollama** - short copy only. `--no-ollama` disables it; if the container is
  down the run is unaffected.
- **Voice-over** - off by default. `--voice` uses `piper` (with
  `--piper-model`) or `espeak-ng` if either is installed. Nothing is downloaded.
- **Music** - only tracks in `INPUT/MUSIC` are used. With none, the reel gets a
  silent AAC track so the phone-compatibility contract still holds.
- **ComfyUI** - not required. The pipeline is Pillow + ffmpeg on CPU.
