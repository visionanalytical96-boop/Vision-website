# Integrating with the existing server engine

The server already has a working engine at `/usr/local/bin/vision-ai-content`
and a creative-pack whose `config.env` is the real contract for this system.
This package does **not** replace either. It adds a `brain/` directory and
patches six anchored points in the existing engine.

```
/usr/local/bin/vision-ai-content        patched (6 anchors, backed up first)
/srv/vision-workspace/vision-ai/brain/  new, additive
/srv/vision-workspace/vision-ai/creative-pack/   reused; .txt presets converted to .json beside them
```

## What the patch changes

| Engine line today | After |
|---|---|
| `source = random.choice(images if images else videos)` | `_bridge.pick_source(...)` — the requested model, or a typographic base; never another instrument |
| `style = random.choice(styles)` | `_bridge.pick_style(...)` — still one of *your* ten styles, chosen with history |
| `layout = random.choice(layouts)` | `_bridge.pick_layout(...)` — same, for *your* ten layouts |
| `subprocess.run(["ollama","run",…], timeout=120)` | bypassed (line kept, unreachable); two ≤6-word HTTP prompts with an 8 s cap |
| `data = {…}` fallback | `_bridge.copy_pack(D, data)` |
| `"-t","12"` | `_bridge.legacy_seconds()` — 12 by default, 1 with `BRAIN_SKIP_LEGACY_REEL=1` |
| *(end of file)* | `_bridge.finish(...)` — real reel, ffprobe gate, history, delivery |

`finish()` renders the deliverable reel over the engine's stub: two scenes,
two different camera moves, a transition, an effect, 1080×1920 @ 30 fps, no
letterbox padding — then validates it, appends `design-history.jsonl`, and
copies the package to `vision-mobile-drop/YYYY-MM-DD_HH-MM-SS/` so the
existing `vision-mobile-final-sync` → `OUTBOX/LATEST` → `vision-ipad-sync` →
`IPAD` chain delivers it. No new timer, no new sync script.

## config.env keys the brain honours

Already present: `VISION_AI_PACK`, `DESIGN_HISTORY`, `OLLAMA_MODEL`,
`RECENT_DESIGNS_BLOCK`, `EXACT_MODEL_IMAGE_REQUIRED`, `PHONE_VIDEO_WIDTH/HEIGHT/FPS`.

Optional additions:

```sh
PHONE_VIDEO_SECONDS=15
OLLAMA_URL=http://127.0.0.1:11434     # or the litellm gateway
OLLAMA_TIMEOUT=8
OLLAMA_ENABLED=1
BRAIN_SKIP_LEGACY_REEL=0              # 1 = engine's own 12 s reel becomes a 1 s stub
MOBILE_DROP=/srv/vision-workspace/vision-mobile-drop
NEXTCLOUD_CONTAINER=nextcloud
NEXTCLOUD_DATA_DIR=/path/to/nextcloud/data
NEXTCLOUD_TARGET=<user>/files/Vision Analytical/AI Videos
```

Nextcloud delivery stays off until all three `NEXTCLOUD_*` values are set.

## Commands

```bash
sudo ./integrate.sh --dry-run     # anchors, backups, diff - changes nothing
sudo ./integrate.sh               # backup, install brain, convert presets, patch
sudo vision-ai-content "Agilent 1260 II HPLC"
sudo ./verify.sh                  # generation + ffprobe + IPAD + history checks
sudo ./integrate.sh --revert      # engine byte-identical again, brain removed
```

`--revert` restores the newest backup from `/root/vision-backups/` and deletes
only `brain/`. Converted JSON, history, outputs and your `.txt` presets stay.

## Tested before shipping

Against a faithful replica of the production engine (same anchors, both reel
branches), in a directory tree mirroring the server:

- patch applies, compiles, and is refused on a second run
- five consecutive runs → five unique fingerprints, zero repeated animations,
  exact `Agilent 1260 Infinity II` identity and exact-model photo every time
- reel: H.264 High / yuv420p / 1080×1920 / 30 fps / AAC 48 kHz / 14.97 s
- package reached `IPAD` through the real `vision-mobile-final-sync` and
  `vision-ipad-sync` scripts
- revert produced a byte-identical engine
