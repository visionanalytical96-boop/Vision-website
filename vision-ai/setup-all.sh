#!/usr/bin/env bash
# One command that finishes the whole setup and proves it works.
#
#   sudo ./vision-ai/setup-all.sh \
#        --phone "+91 98765 43210" --email "info@visionanalytical.in" \
#        --website "visionanalytical.in" --instagram "@visionanalytical" \
#        --address "Mumbai"
#
# Every step is skipped when it is already done, so re-running is safe and fast.
# Contact details you leave out keep whatever is already in config.env.
set -Eeuo pipefail

PREFIX="${VISION_AI_PREFIX:-/srv/vision-workspace/vision-ai}"
BRAIN="$PREFIX/brain"
PACK="$PREFIX/creative-pack"
ENV_FILE="$PACK/config.env"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_VOICES=0; SKIP_CUTOUT=0; SKIP_MUSIC=0; NO_TEST=0
PHONE=""; EMAIL=""; WEBSITE=""; INSTAGRAM=""; ADDRESS=""; LOGO=""; VOICE_LANG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --phone) PHONE="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --website) WEBSITE="$2"; shift 2 ;;
    --instagram) INSTAGRAM="$2"; shift 2 ;;
    --address) ADDRESS="$2"; shift 2 ;;
    --logo) LOGO="$2"; shift 2 ;;
    --voice-lang) VOICE_LANG="$2"; shift 2 ;;
    --skip-voices) SKIP_VOICES=1; shift ;;
    --skip-cutout) SKIP_CUTOUT=1; shift ;;
    --skip-music) SKIP_MUSIC=1; shift ;;
    --no-test) NO_TEST=1; shift ;;
    -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

[[ $EUID -ne 0 ]] && { echo "run with sudo" >&2; exit 1; }
step(){ printf '\n\033[1m== %s\033[0m\n' "$*"; }
say(){ printf '   %s\n' "$*"; }

set_key(){  # set_key KEY VALUE - only when a value was given
  local key="$1" value="$2"
  [[ -z "$value" ]] && return 0
  touch "$ENV_FILE"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
  say "$key=$value"
}

step "1/7  engine"
if grep -q "vision brain integration" /usr/local/bin/vision-ai-content 2>/dev/null; then
  say "already integrated - refreshing"
  "$SRC_DIR/integrate.sh" --revert >/dev/null
fi
"$SRC_DIR/integrate.sh" | grep -E "anchor MISSING|patched |installed |write |keep " || true

step "2/7  contact details and options"
set_key BRAND_PHONE "$PHONE"
set_key BRAND_EMAIL "$EMAIL"
set_key WEBSITE "$WEBSITE"
set_key BRAND_INSTAGRAM "$INSTAGRAM"
set_key BRAND_ADDRESS "$ADDRESS"
set_key BRAND_LOGO "$LOGO"
set_key VOICE_LANG "${VOICE_LANG:-mix}"
grep -q "^VOICE=" "$ENV_FILE" || echo "VOICE=1" >> "$ENV_FILE"
grep -q "^TURBO_MODE=" "$ENV_FILE" || echo "TURBO_MODE=1" >> "$ENV_FILE"
say "config: $ENV_FILE"

step "3/7  background removal (rembg, own venv)"
if [[ $SKIP_CUTOUT -eq 1 ]]; then say "skipped"
elif [[ -x "$BRAIN/rembg-venv/bin/python" ]]; then say "already installed"
else
  python3 -m venv "$BRAIN/rembg-venv"
  "$BRAIN/rembg-venv/bin/pip" install -q --upgrade pip
  "$BRAIN/rembg-venv/bin/pip" install -q "rembg[cpu]" onnxruntime pillow pillow-heif
  say "installed"
fi

step "4/7  voices (piper, own venv)"
if [[ $SKIP_VOICES -eq 1 ]]; then say "skipped"
else
  if [[ ! -x "$BRAIN/piper-venv/bin/piper" ]]; then
    python3 -m venv "$BRAIN/piper-venv"
    "$BRAIN/piper-venv/bin/pip" install -q --upgrade pip
    "$BRAIN/piper-venv/bin/pip" install -q piper-tts
    say "piper installed"
  else
    say "piper already installed"
  fi
  python3 "$BRAIN/voices.py" --warm | tail -3
fi

step "5/7  music beds"
if [[ $SKIP_MUSIC -eq 1 ]]; then say "skipped"
else python3 "$BRAIN/music_gen.py" --warm "$PACK/music/generated" --variants 2 | tail -2
fi

step "6/7  clearing stale cutouts"
find "$PACK/images" -name '*-studio.png' -delete 2>/dev/null || true
find "$PACK/images" \( -name '*.mp4' -o -name '*.MP4' -o -name '*.zip' \) -delete 2>/dev/null || true
say "done"

step "7/7  test"
if [[ $NO_TEST -eq 1 ]]; then
  say "skipped - run: sudo vision-ai-content \"Agilent 1260 II HPLC\""
else
  "$SRC_DIR/verify.sh" "Agilent 1260 II HPLC"
fi

step "ready"
say "generate  :  sudo vision-ai-content \"AMC for Shimadzu LC-2010CHT\""
say "outputs   :  /srv/vision-mobile/OUTPUT/READY   ->  /srv/vision-mobile/IPAD"
say "settings  :  $ENV_FILE"
say "undo all  :  sudo $SRC_DIR/integrate.sh --revert"
