# Skills map

The 20 skills from the handoff specification, and where each one lives. Every
module is importable on its own - none of them needs the CLI.

| # | Skill | Module | Entry point |
|---|---|---|---|
| 1 | Instrument identification | `skills/instrument.py` | `identify(request, library, filename_hints)` |
| 2 | Exact image search | `skills/instrument.py`, `skills/imaging.py` | `Instrument.image_search_query()`, `imaging.search_brief()` |
| 3 | Design selection | `skills/selector.py` | `DesignSelector.select()` |
| 4 | Anti-repetition | `skills/selector.py`, `skills/history.py` | `DesignSelector.select()`, `DesignHistory.is_repeat()` |
| 5 | Layout selection | `skills/selector.py` + `creative-pack/layouts` | `_weighted_choice` over 20 layouts |
| 6 | Animation selection | `skills/selector.py` | `pick_two_animations()` - always two different |
| 7 | Transition selection | `skills/selector.py` + `skills/motion.py` | `transition_filter()` |
| 8 | Effects selection | `skills/selector.py` + `skills/motion.py` | `effect_filter()`, `uses_sprite()` |
| 9 | Colour selection | `skills/selector.py` + `creative-pack/colors` | palette constrained by design family |
| 10 | Typography selection | `skills/render_still.py` | `load_font()`, `_font_path()` with host fallbacks |
| 11 | Reel construction | `skills/reel.py` | `build_command()`, `render()` |
| 12 | Caption generation | `skills/copywriter.py` | `caption()` |
| 13 | Voice-over generation | `skills/copywriter.py`, `skills/audio.py` | `voice_script()`, `synthesize_voice()` |
| 14 | Music selection | `skills/audio.py` | `select_music()` |
| 15 | Phone compatibility | `skills/reel.py`, `skills/validate.py` | encoder flags + `validate_video()` |
| 16 | Quality validation | `skills/validate.py` | `validate_video()`, `validate_image()` |
| 17 | Design history | `skills/history.py` | `DesignHistory`, `fingerprint()` |
| 18 | Asset management | `skills/imaging.py` | `resolve()`, `model_dir()`, `_least_used()` |
| 19 | Instrument marketing | `skills/brand.py`, `skills/copywriter.py` | `SERVICE_ANGLES`, `TECHNIQUE_ANGLES` |
| 20 | Vision Analytical brand style | `skills/brand.py` | `BRAND_NAME`, `hashtags()`, footer rendering |

Supporting modules:

| Module | Role |
|---|---|
| `config.py` | config precedence (env > installed > bundled), path sandboxing |
| `library.py` | JSON creative-library loader (installed pack wins, bundle is fallback) |
| `skills/ollama_client.py` | tiny-prompt client: hard timeout, word cap, silent fallback |
| `skills/render_still.py` | backgrounds, instrument placement, still effects, typography |
| `skills/motion.py` | zoompan camera moves, text-layer moves, xfade, motion effects |
| `pipeline.py` | the orchestration in the order the specification defines |
| `cli.py` | `vision-ai-content` argument handling, `--doctor`, `--history`, `--benchmark` |

## Adding to the libraries

Everything the engine picks from is JSON under `creative-pack/`. To add a design
family, palette, layout, animation, transition, effect, music or voice style,
append an entry with a new `id` - no code change, and the installer will keep
your edits on the next update.

Animations carry both a camera move and a text-layer move:

```json
{
  "id": "hero_rise",
  "label": "Hero Rise",
  "camera": {"type": "pan_v", "z_from": 1.16, "z_to": 1.06, "dir": -1},
  "layer":  {"type": "slide_up", "delay": 0.30, "duration": 0.9, "distance": 110}
}
```

Camera types: `zoom`, `pan_h`, `pan_v`, `pan_diag`, `drift`, `pulse`, `static`
(optional `blur_in` for a focus pull). Layer types: `fade`, `slide_up`,
`slide_down`, `slide_left`, `slide_right`, `scale_in`, `float`, `sweep`,
`mask_wipe`.

Transitions name an ffmpeg `xfade` transition; effects declare
`stage: still` (drawn by Pillow) or `stage: motion` (an ffmpeg filter or an
overlay sprite).
