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
  say "removing $BRAIN"
  run rm -rf "$BRAIN"
  say "creative-pack, history, outputs and .txt presets are untouched"
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
for name, pattern in [
    ("PIL import",  r"from PIL import Image, ImageDraw, ImageFont, ImageFilter"),
    ("source pick", r"source\s*=\s*random\.choice\(images if images else videos\)"),
    ("style pick",  r"style\s*=\s*random\.choice\(styles\)"),
    ("layout pick", r"layout\s*=\s*random\.choice\(layouts\)"),
    ("ollama call", r"\[\"ollama\",\"run\""),
    ("copy assign", r"title\s*=\s*str\(data\.get\("),
    ("reel length", r'"-t"\s*,\s*"12"\s*,'),
]:
    print(f"  anchor {'OK ' if re.search(pattern, source) else 'MISSING'}  {name}")
    if not re.search(pattern, source):
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
run mkdir -p "$BRAIN"
run cp -a "$SRC_DIR/brain/." "$BRAIN/"
run rm -rf "$BRAIN/vision_ai" "$BRAIN/creative-pack"
run cp -a "$SRC_DIR/engine/vision_ai" "$BRAIN/"
run cp -a "$SRC_DIR/creative-pack" "$BRAIN/creative-pack"
say "installed $BRAIN (engine modules + bundled library defaults)"

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

step "7/7 done"
say "test  :  sudo vision-ai-content \"Agilent 1260 II HPLC\""
say "verify:  sudo $SRC_DIR/verify.sh"
say "revert:  sudo $SRC_DIR/integrate.sh --revert"
