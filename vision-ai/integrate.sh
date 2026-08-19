#!/usr/bin/env bash
# Vision Analytical - integrate the brain into the EXISTING engine.
#
# Adds:    /srv/vision-workspace/vision-ai/brain/           (new, additive)
# Patches: /usr/local/bin/vision-ai-content                 (backed up first)
# Reuses:  creative-pack, config.env, design-history.jsonl, Docker Ollama,
#          qwen2.5:1.5b, ffmpeg, vision-mobile-drop -> OUTBOX -> IPAD sync chain
#
# Creates no container, no model, no timer, no cron. Deletes nothing.
set -Eeuo pipefail

# Anchors are reported at the top, so a failure further down scrolls past and
# the run looks like it worked. It did not: the engine is then unpatched and
# generation dies on the engine's own bugs. Say so, loudly, at the end.
INTEGRATION_DONE=0
on_exit() {
  local code=$?
  if [[ $code -ne 0 && $INTEGRATION_DONE -eq 0 ]]; then
    echo >&2
    echo "  ================================================================" >&2
    echo "  INTEGRATION DID NOT COMPLETE - the engine was NOT patched." >&2
    echo "  Fix what is reported above and run this again. Nothing was lost;" >&2
    echo "  backups are in ${BACKUP_DIR:-/root/vision-backups}." >&2
    echo "  ================================================================" >&2
  fi
  exit $code
}
trap on_exit EXIT

PREFIX="${VISION_AI_PREFIX:-/srv/vision-workspace/vision-ai}"
PACK="$PREFIX/creative-pack"
BRAIN="$PREFIX/brain"
ENGINE="${VISION_ENGINE:-/usr/local/bin/vision-ai-content}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="${VISION_BACKUP_DIR:-/root/vision-backups}"

DRY_RUN=0; REVERT=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --revert)  REVERT=1 ;;
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}"; echo; echo "usage: sudo ./integrate.sh [--dry-run|--revert]"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

say(){ printf '  %s\n' "$*"; }
step(){ printf '\n== %s\n' "$*"; }
run(){ if [[ $DRY_RUN -eq 1 ]]; then say "[dry-run] $*"; else "$@"; fi; }

[[ $DRY_RUN -eq 0 && $EUID -ne 0 ]] && { echo "run as root or pass --dry-run" >&2; exit 1; }

if [[ $REVERT -eq 1 ]]; then
  step "revert"
  LATEST="$(ls -1t "$BACKUP_DIR"/vision-ai-content.* 2>/dev/null | head -1 || true)"
  [[ -n "$LATEST" ]] || { echo "no backup found in $BACKUP_DIR" >&2; exit 1; }
  say "restoring $ENGINE from $LATEST"
  run cp -a "$LATEST" "$ENGINE"
  MANIFEST="$BRAIN/.vision-layer-manifest"
  if [[ -f "$MANIFEST" ]]; then
    say "removing only what this layer installed (per $MANIFEST):"
    while IFS= read -r entry; do
      [[ -z "$entry" ]] && continue
      if [[ -e "$BRAIN/$entry" ]]; then say "  - $entry"; run rm -rf "$BRAIN/$entry"; fi
    done < "$MANIFEST"
    run rm -f "$MANIFEST"
    run rmdir "$BRAIN" 2>/dev/null || say "kept $BRAIN (your own modules are still there)"
  elif [[ -d "$BRAIN" ]]; then
    say "no manifest found - leaving $BRAIN untouched (remove it by hand if you want it gone)"
  fi
  say "creative-pack, history, outputs, .txt presets and your brain modules are untouched"
  say "done - the engine is byte-identical to before integration"
  exit 0
fi

step "1/7 preconditions"
[[ -f "$ENGINE" ]] || { echo "engine not found at $ENGINE" >&2; exit 1; }
[[ -d "$PACK"   ]] || { echo "creative-pack not found at $PACK" >&2; exit 1; }
for binary in python3 ffmpeg ffprobe; do command -v "$binary" >/dev/null || { echo "missing: $binary" >&2; exit 1; }; done
python3 -c 'import PIL' 2>/dev/null || { echo "missing: python3-pil (Pillow)" >&2; exit 1; }
python3 - "$ENGINE" <<'PY' || exit 1
import re, sys
source = open(sys.argv[1], encoding="utf-8").read()
if "vision brain integration" in source:
    print("  engine is already patched - run ./integrate.sh --revert first"); sys.exit(1)
missing = []
for name, pattern, required in [
    ("PIL import",  r"from PIL import Image, ImageDraw, ImageFont, ImageFilter", True),
    ("source pick", r"source\s*=\s*random\.choice\(images if images else videos\)", True),
    ("style pick",  r"style\s*=\s*random\.choice\(styles\)", False),
    ("layout pick", r"layout\s*=\s*random\.choice\(layouts\)", False),
    ("ollama call", r'\["ollama"\s*,\s*"run"', True),
    ("brain identity", r"instrument = detect_instrument\(source\.name\)", False),
    ("orphaned styles.index", r"style_index\s*=\s*styles\.index\(style\)", False),
    ("copy assign", r"title\s*=\s*str\(data\.get\(", True),
    ("reel length", r'"-t"\s*,\s*"12"\s*,', False),
]:
    found = bool(re.search(pattern, source))
    state = "OK     " if found else ("MISSING" if required else "absent ")
    note = "" if found else ("  <- REQUIRED" if required else "  (optional - this engine revision does it itself)")
    print(f"  anchor {state}  {name}{note}")
    if required and not found:
        missing.append(name)
if missing:
    print()
    print("  cannot patch: " + ", ".join(missing))
    print("  nothing was changed - send this output plus the engine source to update the anchors.")
    sys.exit(1)
PY
say "python $(python3 -c 'import sys,PIL;print(sys.version.split()[0], "Pillow", PIL.__version__)')"

step "2/7 backups"
run mkdir -p "$BACKUP_DIR"
say "engine       -> $BACKUP_DIR/vision-ai-content.$STAMP"
run cp -a "$ENGINE" "$BACKUP_DIR/vision-ai-content.$STAMP"
say "creative-pack-> $BACKUP_DIR/creative-pack-$STAMP.tgz"
run tar czf "$BACKUP_DIR/creative-pack-$STAMP.tgz" -C "$(dirname "$PACK")" "$(basename "$PACK")"

step "3/7 install the brain (additive, never touches ComfyUI or creative-pack contents)"
if [[ -d "$BRAIN" ]]; then
  say "existing brain found -> backing it up to $BACKUP_DIR/brain-$STAMP"
  run cp -a "$BRAIN" "$BACKUP_DIR/brain-$STAMP"
  # A file this layer installed before is ours to update - that is an upgrade,
  # not a collision. The manifest says which those are. Only a file we never
  # installed may block, because that one belongs to the operator.
  MANIFEST="$BRAIN/.vision-layer-manifest"
  COLLISIONS="$(cd "$SRC_DIR/brain" && for f in *.py; do
      [[ -e "$BRAIN/$f" ]] || continue
      grep -qxF "$f" "$MANIFEST" 2>/dev/null && continue
      echo "$f"
    done || true)"
  if [[ -n "${COLLISIONS:-}" ]]; then
    echo "  refusing to overwrite brain modules this layer did not install: $COLLISIONS" >&2
    echo "  rename them, or move this layer elsewhere with VISION_AI_PREFIX" >&2
    echo "  (if they are leftovers from an older copy of this package, delete them and re-run)" >&2
    exit 1
  fi
  say "safe to upgrade - no files outside this layer would be overwritten"
fi
run mkdir -p "$BRAIN"
run cp -a "$SRC_DIR/brain/." "$BRAIN/"
run rm -rf "$BRAIN/vision_ai" "$BRAIN/creative-pack"
run cp -a "$SRC_DIR/engine/vision_ai" "$BRAIN/"
run cp -a "$SRC_DIR/creative-pack" "$BRAIN/creative-pack"
if [[ $DRY_RUN -eq 0 ]]; then
  : > "$BRAIN/.vision-layer-manifest"
  (cd "$SRC_DIR/brain" && ls -1 *.py) >> "$BRAIN/.vision-layer-manifest"
  printf 'vision_ai\ncreative-pack\n__pycache__\n' >> "$BRAIN/.vision-layer-manifest"
fi
say "installed $BRAIN (engine modules + bundled library defaults)"
say "manifest: $BRAIN/.vision-layer-manifest (revert removes only these entries)"

step "4/7 convert your .txt presets to JSON (your names kept, .txt never modified)"
if [[ $DRY_RUN -eq 1 ]]; then
  python3 - "$SRC_DIR" "$PACK" <<'PY'
import sys
sys.path.insert(0, sys.argv[1]); sys.path.insert(0, f"{sys.argv[1]}/engine")
from pathlib import Path
from brain import pack_convert
from vision_ai.config import load_config
from vision_ai.library import Library
lib = Library(load_config({"paths": {"creative_pack": sys.argv[2]}}))
for line in pack_convert.convert(Path(sys.argv[2]), lib.get, dry_run=True):
    print("  ", line)
PY
else
  python3 - "$BRAIN" "$PACK" <<'PY'
import sys
sys.path.insert(0, str(__import__("pathlib").Path(sys.argv[1]).parent)); sys.path.insert(0, sys.argv[1])
from pathlib import Path
from brain import pack_convert
from vision_ai.config import load_config
from vision_ai.library import Library
lib = Library(load_config({"paths": {"creative_pack": sys.argv[2]}}))
for line in pack_convert.convert(Path(sys.argv[2]), lib.get, dry_run=False):
    print("  ", line)
PY
fi

step "5/7 patch the engine (anchored - aborts if anything does not match)"
if [[ $DRY_RUN -eq 1 ]]; then
  (cd "$SRC_DIR" && python3 -m brain.patch_engine "$ENGINE" --brain-parent "$PREFIX" --dry-run)
else
  TMP_ENGINE="$(mktemp)"
  (cd "$SRC_DIR" && python3 -m brain.patch_engine "$ENGINE" --brain-parent "$PREFIX" --out "$TMP_ENGINE")
  if python3 -m py_compile "$TMP_ENGINE"; then
    install -m 0755 "$TMP_ENGINE" "$ENGINE"
    rm -f "$TMP_ENGINE"
    say "patched $ENGINE (backup: $BACKUP_DIR/vision-ai-content.$STAMP)"
  else
    rm -f "$TMP_ENGINE"
    echo "patched engine failed to compile - original left in place" >&2
    exit 1
  fi
fi

step "6/7 automatic generation (reported only - nothing changed here)"
if command -v systemctl >/dev/null; then
  systemctl list-timers --all 2>/dev/null | grep -iE 'vision|content|media' || say "no vision timers"
  say ""
  say "generation timers should be OFF (config.env says TIMER=OFF):"
  say "  sudo systemctl disable --now vision-5min-content.timer vision-mobile-content.timer"
  say "delivery timers should stay ON (the brain delivers through them):"
  say "  vision-mobile-final.timer, vision-ipad-sync.timer"
fi

INTEGRATION_DONE=1
step "7/7 done"
say "test  :  sudo vision-ai-content \"Agilent 1260 II HPLC\""
say "verify:  sudo $SRC_DIR/verify.sh"
say "revert:  sudo $SRC_DIR/integrate.sh --revert"
