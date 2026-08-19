#!/usr/bin/env bash
# Generate a reel on a timer, delivered through the existing mobile sync chain.
#
# Automatic generation was deliberately off until now. This turns it on for one
# named timer only, and --off removes it completely. It creates no container, no
# new sync script and no second engine; it calls the same vision-ai-content the
# operator runs by hand.
#
#   sudo ./schedule.sh --every 2h --requests requests-shimadzu.txt
#   sudo ./schedule.sh --status
#   sudo ./schedule.sh --run-now
#   sudo ./schedule.sh --keep 12      # keep the last 12 reels on the phone
#   sudo ./schedule.sh --keep off     # back to newest-only
#   sudo ./schedule.sh --off
set -Eeuo pipefail

PREFIX="${VISION_AI_PREFIX:-/srv/vision-workspace/vision-ai}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENGINE="${VISION_ENGINE:-/usr/local/bin/vision-ai-content}"
UNIT="vision-ai-reel"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
REQUEST_FILE="$PREFIX/creative-pack/schedule-requests.txt"
STATE_FILE="$PREFIX/creative-pack/history/schedule-position"
RUNNER="$PREFIX/brain/run-scheduled.sh"

EVERY="2h"; REQUESTS=""; ACTION="install"; VOICE_LANG_ARG=""; KEEP=""
IPAD_SYNC="${VISION_IPAD_SYNC:-/usr/local/bin/vision-ipad-sync}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --every) EVERY="$2"; shift 2 ;;
    --requests) REQUESTS="$2"; shift 2 ;;
    --voice-lang) VOICE_LANG_ARG="$2"; shift 2 ;;
    --keep) KEEP="$2"; shift 2 ;;
    --off) ACTION="off"; shift ;;
    --status) ACTION="status"; shift ;;
    --run-now) ACTION="run"; shift ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

say(){ printf '  %s\n' "$*"; }

# systemctl can exist on a box where systemd is not the init system - inside a
# container, for instance - and then every call fails with "Host is down".
systemd_running(){ command -v systemctl >/dev/null && [[ -d /run/systemd/system ]]; }

need_systemd(){
  systemd_running || {
    echo "systemd is not running here, so no timer can be installed." >&2
    echo "On the Vision server it is; run this there." >&2
    exit 1
  }
}

count_requests(){ grep -cve '^[[:space:]]*$' -e '^[[:space:]]*#' "$1" 2>/dev/null || echo 0; }

# The operator's own vision-ipad-sync empties the phone folder before each copy,
# so a reel every couple of hours deletes the one before it. Their script is
# theirs: this touches one line, keeps a backup, and puts it back on request.
apply_keep(){
  local wanted="$1"
  [[ -f "$IPAD_SYNC" ]] || { echo "no sync script at $IPAD_SYNC" >&2; return 1; }
  if [[ "$wanted" == "off" ]]; then
    python3 "$PREFIX/brain/patch_sync.py" "$IPAD_SYNC" --revert
  else
    [[ "$wanted" =~ ^[0-9]+$ ]] || { echo "--keep takes a number, or 'off'" >&2; return 1; }
    python3 "$PREFIX/brain/patch_sync.py" "$IPAD_SYNC" --keep "$wanted"
  fi
}

if [[ -n "$KEEP" && "$ACTION" == "install" && -z "$REQUESTS" ]]; then
  apply_keep "$KEEP"
  exit $?
fi

case "$ACTION" in
status)
  need_systemd
  echo "== $UNIT"
  say "enabled: $(systemctl is-enabled "$UNIT.timer" 2>/dev/null || echo no)"
  say "active : $(systemctl is-active "$UNIT.timer" 2>/dev/null || echo no)"
  systemctl list-timers --all "$UNIT.timer" --no-pager 2>/dev/null | sed -n '1p;2p' || true
  echo
  echo "== requests it cycles through"
  if [[ -f "$REQUEST_FILE" ]]; then
    nl -ba "$REQUEST_FILE"
    if [[ -f "$STATE_FILE" ]]; then
      TOTAL="$(count_requests "$REQUEST_FILE")"
      [[ "$TOTAL" -gt 0 ]] && say "next: line $(( ($(cat "$STATE_FILE") % TOTAL) + 1 ))"
    fi
  else
    say "none - $REQUEST_FILE is missing"
  fi
  echo
  echo "== the phone folder"
  python3 "$PREFIX/brain/patch_sync.py" "$IPAD_SYNC" --status 2>/dev/null | sed 's/^/  /' \
    || say "could not read $IPAD_SYNC"
  echo
  echo "== last run"
  journalctl -u "$UNIT.service" -n 12 --no-pager 2>/dev/null || say "no journal yet"
  exit 0
  ;;
off)
  need_systemd
  systemctl disable --now "$UNIT.timer" 2>/dev/null || true
  rm -f "$SYSTEMD_DIR/$UNIT.timer" "$SYSTEMD_DIR/$UNIT.service"
  systemctl daemon-reload
  say "timer removed - automatic generation is off again"
  say "nothing else was touched: engine, photos and history are as they were"
  exit 0
  ;;
esac

# ---- install / run-now -------------------------------------------------------

if ! grep -q "vision brain integration" "$ENGINE" 2>/dev/null; then
  echo "engine at $ENGINE is not integrated - run ./integrate.sh first" >&2
  exit 2
fi

if [[ -n "$REQUESTS" ]]; then
  [[ -f "$REQUESTS" ]] || { echo "no such requests file: $REQUESTS" >&2; exit 1; }
  install -m 0644 "$REQUESTS" "$REQUEST_FILE"
  say "requests: $REQUEST_FILE ($(count_requests "$REQUEST_FILE") lines)"
elif [[ ! -f "$REQUEST_FILE" ]]; then
  echo "no requests file yet - pass --requests <file>" >&2
  echo "one instrument per line; requests-shimadzu.txt is bundled" >&2
  exit 1
fi

# The runner walks the request list one line per firing, so consecutive reels
# are for different instruments instead of the same one every two hours.
mkdir -p "$(dirname "$STATE_FILE")"
cat > "$RUNNER" <<RUNNER_EOF
#!/usr/bin/env bash
# Written by schedule.sh - one firing of the timer. Edit schedule.sh, not this.
set -Eeuo pipefail
REQUEST_FILE="$REQUEST_FILE"
STATE_FILE="$STATE_FILE"
ENGINE="$ENGINE"

mapfile -t LINES < <(grep -ve '^[[:space:]]*\$' -e '^[[:space:]]*#' "\$REQUEST_FILE")
[[ \${#LINES[@]} -gt 0 ]] || { echo "request list is empty - nothing to generate"; exit 0; }

POSITION=0
[[ -f "\$STATE_FILE" ]] && POSITION="\$(cat "\$STATE_FILE" 2>/dev/null || echo 0)"
INDEX=\$(( POSITION % \${#LINES[@]} ))
echo "\$(( POSITION + 1 ))" > "\$STATE_FILE"

REQUEST="\${LINES[\$INDEX]}"
echo "scheduled reel \$(( INDEX + 1 ))/\${#LINES[@]}: \$REQUEST"
exec "\$ENGINE" "\$REQUEST"
RUNNER_EOF
chmod 0755 "$RUNNER"
say "runner: $RUNNER"

if [[ -n "$KEEP" ]]; then
  apply_keep "$KEEP" | sed 's/^/  /'
fi

if [[ "$ACTION" == "run" ]]; then
  say "running one now - exactly what the timer will do"
  if [[ -n "$VOICE_LANG_ARG" ]]; then
    VISION_AI_ALLOW_AUTOMATION=1 VOICE_LANG="$VOICE_LANG_ARG" "$RUNNER"
  else
    VISION_AI_ALLOW_AUTOMATION=1 "$RUNNER"
  fi
  exit $?
fi

{
  echo "[Unit]"
  echo "Description=Vision Analytical - generate one reel"
  echo "After=network-online.target"
  echo
  echo "[Service]"
  echo "Type=oneshot"
  echo "# The engine refuses to run unattended unless this is set, so generation"
  echo "# can only ever happen through this unit."
  echo "Environment=VISION_AI_ALLOW_AUTOMATION=1"
  [[ -n "$VOICE_LANG_ARG" ]] && echo "Environment=VOICE_LANG=$VOICE_LANG_ARG"
  echo "ExecStart=$RUNNER"
  echo "# One reel at a time on a 4-core box, never at the expense of the rest."
  echo "Nice=10"
  echo "IOSchedulingClass=idle"
  echo "CPUQuota=300%"
  echo "TimeoutStartSec=1800"
} > "$SYSTEMD_DIR/$UNIT.service"

{
  echo "[Unit]"
  echo "Description=Vision Analytical - a reel every $EVERY"
  echo
  echo "[Timer]"
  echo "OnBootSec=15min"
  echo "OnUnitActiveSec=$EVERY"
  echo "AccuracySec=1min"
  echo "# Missed firings are not made up - a burst of catch-up reels after"
  echo "# downtime is worse than a gap."
  echo "Persistent=false"
  echo
  echo "[Install]"
  echo "WantedBy=timers.target"
} > "$SYSTEMD_DIR/$UNIT.timer"

say "units written: $SYSTEMD_DIR/$UNIT.{service,timer}"

if ! systemd_running; then
  echo
  say "systemd is not running here, so the timer was NOT enabled."
  say "The unit files above are correct - enable them where systemd runs:"
  say "  sudo systemctl daemon-reload && sudo systemctl enable --now $UNIT.timer"
  exit 0
fi

systemctl daemon-reload
systemctl enable --now "$UNIT.timer"
say "timer on: one reel every $EVERY"
systemctl list-timers --all "$UNIT.timer" --no-pager 2>/dev/null | sed -n '2p' || true
echo
say "delivery: the reel lands in OUTPUT/READY and your existing"
say "vision-mobile-final-sync / vision-ipad-sync timers carry it to the phone folder"
if ! python3 "$PREFIX/brain/patch_sync.py" "$IPAD_SYNC" --status 2>/dev/null | grep -q "^patched"; then
  say ""
  say "NOTE: that sync keeps only the newest reel, so each one replaces the last."
  say "      keep more:  sudo $SRC_DIR/schedule.sh --keep 12"
fi
say "turn it off any time:  sudo $SRC_DIR/schedule.sh --off"
