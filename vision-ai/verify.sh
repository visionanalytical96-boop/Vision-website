#!/usr/bin/env bash
# Post-integration verification: one real generation, then every check the
# handoff asks for. Read-only apart from the generation it performs.
set -Eeuo pipefail

REQUEST="${1:-Agilent 1260 II HPLC}"
READY="${VISION_READY:-/srv/vision-mobile/OUTPUT/READY}"
IPAD="${VISION_IPAD:-/srv/vision-mobile/IPAD}"
DROP="${VISION_DROP:-/srv/vision-workspace/vision-mobile-drop}"
HISTORY="${VISION_HISTORY:-/srv/vision-workspace/vision-ai/creative-pack/history/design-history.jsonl}"

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

echo; echo "== automatic generation"
systemctl is-enabled vision-5min-content.timer 2>/dev/null | sed 's/^/  vision-5min-content.timer: /' || true
systemctl is-enabled vision-mobile-content.timer 2>/dev/null | sed 's/^/  vision-mobile-content.timer: /' || true

echo; echo "RESULT: $PASS passed, $FAIL failed"
exit $(( FAIL > 0 ))
