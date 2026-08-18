#!/usr/bin/env bash
# Vision Analytical creative engine - in-place installer.
#
# What it does:            what it deliberately does NOT do:
#   - reuses existing        - never creates a systemd unit, timer or cron entry
#     /srv directories       - never enables vision-content-studio.timer or
#   - backs up the current     vision-media-studio.timer
#     /usr/local/bin engine  - never overwrites creative-pack files you edited
#   - installs the engine    - never deletes anything in INPUT/ or OUTPUT/
#     and any missing        - never downloads an AI model or music
#     library files
set -euo pipefail

SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PREFIX_ENGINE="${VISION_AI_PREFIX:-/srv/vision-workspace/vision-ai}"
PACK_DIR="$PREFIX_ENGINE/creative-pack"
ENGINE_DIR="$PREFIX_ENGINE/engine"
LAUNCHER="/usr/local/bin/vision-ai-content"
MOBILE="${VISION_MOBILE:-/srv/vision-mobile}"
STUDIO="${VISION_STUDIO:-/srv/vision-workspace/vision-media-studio}"
TIMERS=(vision-content-studio.timer vision-media-studio.timer)

DRY_RUN=0
WITH_DEPS=0
DISABLE_TIMERS=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --with-deps) WITH_DEPS=1 ;;
    --disable-timers) DISABLE_TIMERS=1 ;;
    -h|--help)
      sed -n '2,14p' "${BASH_SOURCE[0]}"
      echo
      echo "usage: sudo ./install.sh [--dry-run] [--with-deps] [--disable-timers]"
      exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

say()  { printf '  %s\n' "$*"; }
step() { printf '\n== %s\n' "$*"; }
run()  { if [[ $DRY_RUN -eq 1 ]]; then say "[dry-run] $*"; else "$@"; fi; }

if [[ $DRY_RUN -eq 0 && $EUID -ne 0 ]]; then
  echo "run as root (sudo ./install.sh) or pass --dry-run" >&2
  exit 1
fi

step "1/7 inspecting what already exists"
for path in "$PREFIX_ENGINE" "$PACK_DIR" "$MOBILE" "$MOBILE/INPUT/PHOTOS" "$MOBILE/INPUT/MUSIC" \
            "$MOBILE/OUTPUT/READY" "$STUDIO" "$LAUNCHER"; do
  if [[ -e "$path" ]]; then say "found    $path"; else say "missing  $path (will be created)"; fi
done

step "2/7 checking dependencies"
MISSING=()
command -v python3 >/dev/null || MISSING+=("python3")
command -v ffmpeg  >/dev/null || MISSING+=("ffmpeg")
command -v ffprobe >/dev/null || MISSING+=("ffmpeg (ffprobe)")
python3 - <<'PY' >/dev/null 2>&1 || MISSING+=("python3-pil (Pillow)")
import PIL  # noqa: F401
PY
if [[ ${#MISSING[@]} -eq 0 ]]; then
  say "all dependencies present"
elif [[ $WITH_DEPS -eq 1 ]]; then
  say "installing: ${MISSING[*]}"
  run apt-get update
  run apt-get install -y ffmpeg python3-pil fontconfig fonts-dejavu-core
else
  say "MISSING: ${MISSING[*]}"
  say "install them with:  sudo apt-get install -y ffmpeg python3-pil fontconfig fonts-dejavu-core"
  say "or re-run this installer with --with-deps"
fi

step "3/7 creating only the directories that are absent"
for path in "$PREFIX_ENGINE" "$PACK_DIR" "$PACK_DIR/history" "$PACK_DIR/images" \
            "$MOBILE/INPUT/PHOTOS" "$MOBILE/INPUT/VIDEOS" "$MOBILE/INPUT/MUSIC" \
            "$MOBILE/OUTPUT/READY" "$STUDIO/tmp" "$STUDIO/audio"; do
  if [[ -d "$path" ]]; then say "reusing  $path"; else say "creating $path"; run mkdir -p "$path"; fi
done

step "4/7 installing the engine"
if [[ -d "$ENGINE_DIR" ]]; then
  BACKUP="$ENGINE_DIR.backup-$(date +%Y%m%d-%H%M%S)"
  say "backing up existing engine to $BACKUP"
  run cp -a "$ENGINE_DIR" "$BACKUP"
fi
run mkdir -p "$ENGINE_DIR"
run cp -a "$SRC_DIR/engine/vision_ai" "$ENGINE_DIR/"
say "engine installed at $ENGINE_DIR/vision_ai"

step "5/7 installing creative-pack files that are missing (existing files are left untouched)"
while IFS= read -r -d '' file; do
  rel="${file#"$SRC_DIR/creative-pack/"}"
  target="$PACK_DIR/$rel"
  if [[ -e "$target" ]]; then
    say "keeping  $rel (already present - your edits are preserved)"
  else
    run mkdir -p "$(dirname "$target")"
    run cp -a "$file" "$target"
    say "added    $rel"
  fi
done < <(find "$SRC_DIR/creative-pack" -type f -print0)

step "6/7 installing the launcher"
if [[ -e "$LAUNCHER" ]]; then
  BACKUP="$LAUNCHER.backup-$(date +%Y%m%d-%H%M%S)"
  say "backing up existing command to $BACKUP"
  run cp -a "$LAUNCHER" "$BACKUP"
fi
run install -m 0755 "$SRC_DIR/bin/vision-ai-content" "$LAUNCHER"
say "installed $LAUNCHER"

step "7/7 automatic generation must stay OFF"
if command -v systemctl >/dev/null; then
  for unit in "${TIMERS[@]}"; do
    state="$(systemctl is-enabled "$unit" 2>&1 | head -1) / $(systemctl is-active "$unit" 2>&1 | head -1)"
    say "$unit: $state"
    if [[ $DISABLE_TIMERS -eq 1 && "$state" == enabled* ]]; then
      say "disabling $unit as requested"
      run systemctl disable --now "$unit"
    fi
  done
else
  say "systemctl not available - nothing to check"
fi
say "this installer created no timer, no service and no cron entry"

step "done"
say "check the installation :  vision-ai-content --doctor"
say "generate one post+reel :  sudo vision-ai-content \"AMC for Agilent 1260 II HPLC\""
say "outputs                :  $MOBILE/OUTPUT/READY"
