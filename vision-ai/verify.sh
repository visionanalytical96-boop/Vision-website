#!/usr/bin/env bash
# Post-integration verification: one real generation, then every check the
# handoff asks for. Read-only apart from the generation it performs.
set -Eeuo pipefail

REQUEST="${1:-Agilent 1260 II HPLC}"
READY="${VISION_READY:-/srv/vision-mobile/OUTPUT/READY}"
IPAD="${VISION_IPAD:-/srv/vision-mobile/IPAD}"
DROP="${VISION_DROP:-/srv/vision-workspace/vision-mobile-drop}"
HISTORY="${VISION_HISTORY:-/srv/vision-workspace/vision-ai/creative-pack/history/design-history.jsonl}"
SRC_DIR="${VISION_SRC:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"

PASS=0; FAIL=0
check(){ if [[ "$2" == "$3" ]]; then printf '  [PASS] %-26s %s\n' "$1" "$2"; PASS=$((PASS+1));
         else printf '  [FAIL] %-26s got %s, want %s\n' "$1" "$2" "$3"; FAIL=$((FAIL+1)); fi; }
probe(){ ffprobe -v error -select_streams "$1" -show_entries "$2" -of default=nw=1:nk=1 "$3" | head -1; }

ENGINE="${VISION_ENGINE:-/usr/local/bin/vision-ai-content}"
if ! grep -q "vision brain integration" "$ENGINE" 2>/dev/null; then
  echo "engine at $ENGINE is not integrated yet - run integrate.sh first" >&2
  exit 2
fi

echo "== generating: $REQUEST"
vision-ai-content "$REQUEST"

REEL="$(ls -t "$READY"/*Reel.mp4 2>/dev/null | head -1)"
POST="$(ls -t "$READY"/*POST.png 2>/dev/null | head -1)"
INFO="$(ls -t "$READY"/*Info.txt 2>/dev/null | head -1)"
echo; echo "== files"
check "reel exists"  "$([[ -f "$REEL" ]] && echo yes || echo no)" yes
check "poster exists" "$([[ -f "$POST" ]] && echo yes || echo no)" yes

echo; echo "== video contract ($(basename "${REEL:-none}"))"
check "video codec"  "$(probe v stream=codec_name "$REEL")" h264
check "pixel format" "$(probe v stream=pix_fmt "$REEL")" yuv420p
check "width"        "$(probe v stream=width "$REEL")" 1080
check "height"       "$(probe v stream=height "$REEL")" 1920
check "frame rate"   "$(probe v stream=avg_frame_rate "$REEL")" 30/1
check "audio codec"  "$(probe a stream=codec_name "$REEL")" aac
DURATION="$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$REEL")"
printf '  [INFO] %-26s %s s\n' "duration" "$DURATION"

echo; echo "== instrument identity"
MODEL="$(grep -m1 '^Instrument ' "$INFO" | cut -d: -f2- | xargs || true)"
MATCH="$(grep -m1 '^Image Exact Match' "$INFO" | cut -d: -f2- | xargs || true)"
printf '  [INFO] %-26s %s\n' "model in Info.txt" "$MODEL"
printf '  [INFO] %-26s %s\n' "authentic photo" "$MATCH"

echo; echo "== delivery"
check "package in mobile-drop" "$(ls -1d "$DROP"/[0-9][0-9][0-9][0-9]-* 2>/dev/null | wc -l | awk '{print ($1>0)?"yes":"no"}')" yes
echo "  running the existing sync chain..."
vision-mobile-final-sync >/dev/null 2>&1 || true
vision-ipad-sync >/dev/null 2>&1 || true
check "reel on IPAD" "$(ls -1 "$IPAD"/*Reel.mp4 2>/dev/null | wc -l | awk '{print ($1>0)?"yes":"no"}')" yes

echo; echo "== creative memory"
printf '  [INFO] %-26s %s records\n' "design history" "$(wc -l < "$HISTORY" 2>/dev/null || echo 0)"
LAST_TWO="$(tail -3 "$HISTORY" 2>/dev/null | python3 -c '
import sys, json
rows = [json.loads(line) for line in sys.stdin if line.strip()]
print("  |  ".join(r["design_family"] + "/" + r["background"] + "/" + r["layout"] for r in rows))
' 2>/dev/null || true)"
printf '  [INFO] %-26s %s\n' "last designs" "$LAST_TWO"

# How much of each creative library the last 30 runs actually reached. A low
# number here is what "every post looks the same" looks like in the data.
VARIETY="$(python3 - "$HISTORY" "$SRC_DIR" <<'PYEOF' 2>/dev/null || true
import json, sys
from pathlib import Path
history, src = Path(sys.argv[1]), Path(sys.argv[2])
sys.path[:0] = [str(src), str(src / "engine")]
from vision_ai.config import load_config
from vision_ai.library import Library
rows = [json.loads(l) for l in history.read_text().splitlines() if l.strip()][-30:]
if not rows:
    raise SystemExit
lib = Library(load_config({}))
pairs = (("layout", "layouts"), ("design_family", "families"), ("color_palette", "palettes"),
         ("background", "backgrounds"), ("animation_1", "animations"), ("transition", "transitions"),
         ("effect", "effects"))
weak = []
out = []
for field, key in pairs:
    total = len(lib.get(key))
    used = len({r.get(field) for r in rows if r.get(field)})
    out.append(f"{field}={used}/{total}")
    if total and used / total < 0.35:
        weak.append(field)
print(" ".join(out))
print("WEAK " + ",".join(weak) if weak else "WEAK")
PYEOF
)"
if [[ -n "$VARIETY" ]]; then
  printf '  [INFO] %-26s %s\n' "library coverage (30)" "$(echo "$VARIETY" | head -1)"
  WEAK="$(echo "$VARIETY" | sed -n 's/^WEAK //p')"
  if [[ -n "$WEAK" ]]; then
    printf '  [WARN] %-26s %s\n' "repeating" "$WEAK - set BRAIN_PRESET_POOL higher"
  else
    printf '  [PASS] %-26s %s\n' "design variety" "every library well spread"
  fi
fi

echo; echo "== automatic generation"
systemctl is-enabled vision-5min-content.timer 2>/dev/null | sed 's/^/  vision-5min-content.timer: /' || true
systemctl is-enabled vision-mobile-content.timer 2>/dev/null | sed 's/^/  vision-mobile-content.timer: /' || true

echo; echo "RESULT: $PASS passed, $FAIL failed"
exit $(( FAIL > 0 ))
