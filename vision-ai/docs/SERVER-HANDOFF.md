# Handoff report

## 1. What was inspected

This session runs in an ephemeral Claude Code container holding a clone of the
`Vision-website` repository - **not** the Vision Analytical Ubuntu server.
Everything the specification asked to be inspected was checked here, and none
of it exists in this environment:

| Checked | Result |
|---|---|
| `/srv/vision-workspace`, `/srv/vision-mobile` | absent (`/srv` is empty) |
| `/usr/local/bin/vision-ai-content` | absent |
| `docker ps`, `docker inspect ollama` | no Docker daemon / socket |
| `ollama list`, `ollama ps`, `ss -ltnp \| grep 11434` | no Ollama, nothing listening |
| `systemctl` timers `vision-content-studio`, `vision-media-studio` | units not found |
| `creative-pack`, `vision-design-brain`, `vision-media-studio`, `ComfyUI` | absent |
| repository history (`master`, prior `claude/vision-*` branches) | no Vision engine code - the branches are n8n trees plus a landing page |

So there was no existing engine in reach to modify in place. Nothing on the
real server was touched, changed, disabled or deleted by this session.

Container facts used for the CPU work: 4 cores, 15 GB RAM, **no GPU**,
Python 3.11.15, ffmpeg/ffprobe 6.1.1, Pillow 12.3.

## 2. What already existed

In the repository: an n8n fork with a Vision Analytical landing page and some
plugin/skill scaffolding. No creative pack, no design history, no generation
engine, no service definitions.

## 3. What changed

A complete, self-contained engine was written and tested here, in `vision-ai/`.
It is deployed to the server by its own installer, which does the in-place,
non-destructive work the specification requires (reuse existing directories,
back up the current command, keep operator edits, create no timers).

## 4. Files added

```
vision-ai/
  README.md                     usage, contracts, libraries
  install.sh                    safe in-place installer (--dry-run/--with-deps/--disable-timers)
  bin/vision-ai-content         launcher installed to /usr/local/bin
  engine/vision_ai/
    config.py library.py pipeline.py cli.py
    skills/instrument.py imaging.py selector.py history.py brand.py
    skills/copywriter.py ollama_client.py render_still.py motion.py
    skills/reel.py audio.py validate.py
  creative-pack/
    designs/ layouts/ colors/ animations/ transitions/ effects/
    music/ voice/ skills/instruments.json config/engine.json
    history/ images/ workflows/
  tests/test_engine.py          18 tests incl. an ffmpeg filtergraph sweep
  docs/SKILLS.md  docs/SERVER-HANDOFF.md  docs/sample-Info.txt
```

## 5. Services changed

**None.** This package contains no systemd unit, no timer and no cron entry.
`install.sh` reports the state of `vision-content-studio.timer` and
`vision-media-studio.timer` and will only ever *disable* them (when explicitly
asked with `--disable-timers`). The engine additionally refuses to run when it
sees a systemd invocation (`INVOCATION_ID`, `JOURNAL_STREAM`,
`SYSTEMD_EXEC_PID`), so a timer added by accident still cannot produce content.

## 6. Models installed

None. Nothing was downloaded: no LLM, no checkpoint, no voice model, no music.
Ollama stays optional and is used only for a headline and a call to action
(a few words, hard 8 s timeout, low `num_predict`); if it is unreachable the
run completes on local templates. Voice-over uses `piper` or `espeak-ng` only
if one is already installed.

## 7. Skills added

The 20 specified skills, each as an importable module - see `docs/SKILLS.md`
for the full table.

## 8. Creative libraries added

20 design families, 15 backgrounds, 15 compositions, 20 layouts, 18 palettes,
8 typography sets, 25 animations, 10 camera framings, 15 transitions,
20 effects, 12 music styles, 6 voice styles, and an instrument knowledge base
of 12 manufacturers, 12 techniques, 30 exact models and 8 service lines. All
plain JSON, editable on the server without touching code.

## 9. Performance (measured in this container, 4 CPU cores, no GPU)

| Step | Time |
|---|---|
| instrument identification | 0.0005 - 0.001 s |
| local design selection (target < 0.1 s) | **0.0009 s** per design; 200 designs in 0.037 s (0.185 ms each) |
| authentic image resolution | 0.0003 s |
| copy (local templates) | 0.002 s |
| stills (post + square + story) | 0.65 - 1.5 s |
| reel render (15 s, 1080x1920, 30 fps) | 21 - 26 s |
| **full run** | **~25 s wall clock** |
| test suite (incl. ffmpeg sweep of 25 animations, 15 transitions, 20 effects) | 43 s, 18/18 pass |

Anti-repetition, over 200 consecutive selections: 200/200 unique fingerprints,
0 identical animation pairs, 0 repeats of `background+composition+layout` inside
a 10-design window, 15/15 backgrounds and 12 palettes exercised.

Reel files: typically 0.5 - 3 MB. A grain-heavy effect initially produced a
61 MB file; the encoder now runs with an 8 Mbit/s ceiling and the grain effects
were toned down, bringing the worst case to 1.9 MB. Validation rejects anything
above 25 MB.

Ollama itself could not be exercised here (no Ollama in this container). The
failure path was tested: an unreachable endpoint returns in ~0.3 ms and the run
completes on local copy.

## 10. Command to generate one post + reel

```bash
sudo vision-ai-content "AMC for Agilent 1260 II HPLC"
```

Useful variants: `--no-ollama`, `--no-music`, `--voice`, `--no-reel`,
`--dry-run`, `--seed N`, `--json`, `--doctor`, `--history 20`, `--benchmark 200`.

## 11. Output location

`/srv/vision-mobile/OUTPUT/READY/`

```
Vision-Analytical-YYYYMMDD-HHMMSS-POST.png     1080x1350
Vision-Analytical-YYYYMMDD-HHMMSS-SQUARE.png   1080x1080
Vision-Analytical-YYYYMMDD-HHMMSS-STORY.png    1080x1920
Vision-Analytical-YYYYMMDD-HHMMSS-Reel.mp4     1080x1920 H.264 High/yuv420p, AAC-LC 192k, 30 fps, ~15 s, +faststart
Vision-Analytical-YYYYMMDD-HHMMSS-Caption.txt
Vision-Analytical-YYYYMMDD-HHMMSS-Info.txt
```

A full example of the Info file is in `docs/sample-Info.txt`.

## 12. Automatic generation

Confirmed off, three ways: nothing in this package schedules anything, the
installer only reports (or on request disables) the two timers, and the engine
itself refuses to run under systemd unless `VISION_AI_ALLOW_AUTOMATION=1` is
set deliberately.

## What still needs to happen on the server

This session could not reach the server, so these steps are yours to run there:

```bash
git clone <this repo> && cd Vision-website/vision-ai
sudo ./install.sh --dry-run          # review
sudo ./install.sh                    # install
vision-ai-content --doctor           # confirm paths, ffmpeg, ollama, timers
sudo vision-ai-content "AMC for Agilent 1260 II HPLC"
```

Then verify against the live server, which this session could not:

1. `docker ps` still shows only one Ollama container on 127.0.0.1:11434, and
   the host `ollama.service` is still disabled.
2. `vision-ai-content --doctor` reports Ollama reachable, and a real generation
   shows `Copy Source: ollama` in the Info file with a short call latency.
3. The two timers still read `disabled / inactive`.
4. Drop authentic instrument photographs into
   `/srv/vision-workspace/vision-ai/creative-pack/images/<manufacturer>/<model>/`
   so that reels use real hardware rather than the typographic fallback.
5. If an older `/usr/local/bin/vision-ai-content` existed, its backup is beside
   it with a timestamp suffix - compare before deleting anything.
