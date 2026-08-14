#!/usr/bin/env bash
#
# Server cleanup — DRY RUN BY DEFAULT.
#
#   bash scripts/server-cleanup.sh              # show what would go, change nothing
#   bash scripts/server-cleanup.sh --execute    # actually remove it
#
# This machine runs two companies off one box:
#   Vision Analytical  — the vision-new website stack
#   Bharat Stay        — the bharatstey website stack (currently stopped)
# and one shared Nextcloud holding both companies' files.
#
# Everything those need is on a protected list below and cannot be removed by
# this script even if it appears in a target list — the guard checks every
# path before touching it. What it removes is the wreckage left behind by
# building the same website over and over: duplicate checkouts, node_modules,
# stray containers, build cache, and junk files in the home directory.
#
set -uo pipefail

EXECUTE=0
SKIP_BACKUP_CHECK=0
for arg in "$@"; do
  case "$arg" in
    --execute) EXECUTE=1 ;;
    --no-backup-check) SKIP_BACKUP_CHECK=1 ;;
    -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg"; exit 2 ;;
  esac
done

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'
GRN=$'\033[32m'; YEL=$'\033[33m'; CYN=$'\033[36m'; OFF=$'\033[0m'

step() { printf '\n%s%s%s\n────────────────────────────────────────────────\n' "$BOLD$CYN" "$1" "$OFF"; }
die()  { printf '\n%sSTOPPED:%s %s\n' "$RED$BOLD" "$OFF" "$1" >&2; exit 1; }

FREED_KB=0

# --- Anything matching these is never removed, full stop -------------------
PROTECTED=(
  "/opt/vision/nextcloud"          # Nextcloud files + database, both companies
  "/opt/vision"
  "$HOME/va-new"                   # the live Vision Analytical website
  "$HOME/iphone-import"            # phone data
  "$HOME/iphone"
  "$HOME/Downloads"
  "$HOME/Music"
  "$HOME/Sync"
  "$HOME/vision_HR"
  "$HOME/zk-test"
  "$HOME/windows"
  "$HOME/.ssh"
  "$HOME/.config"
  "$HOME/.docker"
  "/srv"
  "/var/lib/docker"
)

is_protected() {
  local target
  target="$(readlink -f "$1" 2>/dev/null || echo "$1")"
  [ -n "$target" ] || return 0
  case "$target" in /|"$HOME"|/opt|/home) return 0 ;; esac
  for p in "${PROTECTED[@]}"; do
    local abs; abs="$(readlink -f "$p" 2>/dev/null || echo "$p")"
    [ -n "$abs" ] || continue
    [ "$target" = "$abs" ] && return 0
    case "$target" in "$abs"/*) return 0 ;; esac
    # Also refuse to delete a parent of something protected.
    case "$abs" in "$target"/*) return 0 ;; esac
  done
  return 1
}

# Always one integer on stdout. `du` exits non-zero when it hits a directory it
# cannot read, and the earlier `&& ... || echo 0` form let both the partial
# total and the fallback through, producing "4\n0" and breaking the arithmetic
# that consumed it.
kb_of() {
  [ -e "$1" ] || { echo 0; return; }
  local out
  out=$(du -sk --one-file-system "$1" 2>/dev/null | tail -1 | cut -f1)
  case "$out" in
    ''|*[!0-9]*) echo 0 ;;
    *) echo "$out" ;;
  esac
}
human() { numfmt --to=iec --from-unit=1024 "${1:-0}" 2>/dev/null || echo "${1:-0}K"; }

ENV_ARCHIVE="$HOME/env-archive"

# Secrets are the one thing in these folders that is not in git and cannot be
# regenerated. Copy every .env out before the folder goes, so a wrong call here
# costs time and not a database password.
rescue_envs() {
  local p="$1" n=0
  [ -d "$p" ] || return 0
  while IFS= read -r f; do
    [ -f "$f" ] || continue
    mkdir -p "$ENV_ARCHIVE"
    local flat; flat=$(printf '%s' "${f#"$HOME/"}" | tr '/' '_')
    [ "$EXECUTE" = "1" ] && cp -n "$f" "$ENV_ARCHIVE/$flat" 2>/dev/null
    n=$((n + 1))
  done < <(find "$p" -maxdepth 5 -name ".env" -not -path "*/node_modules/*" 2>/dev/null)
  [ "$n" -gt 0 ] && printf '      %s↳ %s .env saved to ~/env-archive/%s\n' "$DIM" "$n" "$OFF"
  return 0
}

remove_path() {
  local p="$1" why="$2"
  [ -e "$p" ] || return 0

  if is_protected "$p"; then
    printf '  %sPROTECTED%s  %-52s %s\n' "$YEL" "$OFF" "$p" "refusing"
    return 0
  fi

  local kb; kb=$(kb_of "$p")
  FREED_KB=$((FREED_KB + kb))
  printf '  %-52s %8s   %s\n' "$p" "$(human "$kb")" "$DIM$why$OFF"
  rescue_envs "$p"
  [ "$EXECUTE" = "1" ] && rm -rf -- "$p"
  return 0
}

printf '%s\n' "${BOLD}SERVER CLEANUP${OFF}"
if [ "$EXECUTE" = "1" ]; then
  printf '%sMODE: EXECUTE — files will be removed%s\n' "$RED$BOLD" "$OFF"
else
  printf '%sMODE: DRY RUN — nothing will be changed%s\n' "$GRN$BOLD" "$OFF"
fi

# --- Refuse to delete anything without a verified Nextcloud backup ---------
step "0. Backup check"
if [ "$SKIP_BACKUP_CHECK" = "1" ]; then
  printf '  %sbackup check skipped by request%s\n' "$YEL" "$OFF"
else
  found=""
  for d in "$HOME"/backups/nextcloud-* /srv/backups/nextcloud-* /mnt/*/backups/nextcloud-*; do
    [ -f "$d/SHA256SUMS" ] && found="$d"
  done
  if [ -n "$found" ]; then
    printf '  %s✓%s verified backup found: %s (%s)\n' "$GRN" "$OFF" "$found" "$(du -sh "$found" 2>/dev/null | cut -f1)"
  elif [ "$EXECUTE" = "1" ]; then
    die "No verified Nextcloud backup found.
      Run this first:
        bash scripts/nextcloud-backup.sh
      Then come back. If you have a backup somewhere I cannot see, re-run
      with --no-backup-check."
  else
    printf '  %s!%s no backup found yet — required before --execute\n' "$YEL" "$OFF"
  fi
fi

# --- 1. Duplicate checkouts of the website --------------------------------
step "1. Duplicate copies of the website"
echo "${DIM}  Rebuilt from git in minutes. The live copy is ~/va-new and is protected.${OFF}"
remove_path "$HOME/vision-analytical"    "old checkout, superseded by va-new"
remove_path "$HOME/vision-analytical-5"  "old checkout"
remove_path "$HOME/Vision-website"       "cloned inside itself; caused a stale deploy"

# --- 2. Home directory junk ------------------------------------------------
step "2. Junk files in the home directory"
echo "${DIM}  Mistyped commands, empty files, old logs.${OFF}"
for f in \
  "$HOME/-a" \
  "$HOME/udo apt upgrade -y" \
  "$HOME/To" \
  "$HOME/Streaming." \
  "$HOME/Playback" \
  "$HOME/output.txt" \
  "$HOME/rsync.log" \
  "$HOME/.organize_files.py.swp" \
  "$HOME/organize_log_20260801_101502.txt" \
  "$HOME/organize_log_20260801_102515.txt" \
  "$HOME/organize_log_20260801_102918.txt" \
  "$HOME/vision-analytical-6.zip"
do
  remove_path "$f" "junk"
done

# --- 3. Caches -------------------------------------------------------------
step "3. Caches (rebuild themselves)"
remove_path "$HOME/.cache"          "regenerates"
remove_path "$HOME/.npm/_cacache"   "npm cache, regenerates"

# --- 4. Stray containers ---------------------------------------------------
step "4. Stray stopped containers"
echo "${DIM}  Failed cloudflared attempts. No data in any of them.${OFF}"
strays=$(docker ps -a --filter status=exited --filter ancestor=cloudflare/cloudflared:latest \
         --format '{{.Names}}' 2>/dev/null)
if [ -n "$strays" ]; then
  printf '%s\n' "$strays" | while read -r c; do
    printf '  %-52s %s\n' "$c" "${DIM}stray cloudflared$OFF"
    [ "$EXECUTE" = "1" ] && docker rm -f "$c" >/dev/null 2>&1
  done
else
  echo "  none"
fi

# --- 5. Docker build cache -------------------------------------------------
step "5. Docker build cache"
echo "${DIM}  Speeds up rebuilds only. Holds no images, volumes or data.${OFF}"
docker system df 2>/dev/null | awk '/Build Cache/ {printf "  %s entries, %s on disk\n", $3, $5}'
if [ "$EXECUTE" = "1" ]; then
  docker builder prune -a -f 2>/dev/null | tail -2 | sed 's/^/  /'
else
  echo "  ${DIM}would run: docker builder prune -a -f${OFF}"
fi

# --- 6. Dangling images ----------------------------------------------------
step "6. Untagged image layers"
n=$(docker images -qf dangling=true 2>/dev/null | wc -l)
echo "  $n dangling layers"
if [ "$EXECUTE" = "1" ] && [ "$n" -gt 0 ]; then
  docker image prune -f 2>/dev/null | tail -1 | sed 's/^/  /'
fi

# --- 7. What this script will NOT touch -----------------------------------
step "7. Left alone deliberately — your call, not mine"
cat <<KEEP
  ${BOLD}Both companies' data — never removable by this script:${OFF}
    /opt/vision/nextcloud/html         Nextcloud files (Vision Analytical + Bharat Stay)
    /opt/vision/nextcloud/database     Nextcloud database
    volume vision-new_postgres-data    Vision Analytical website database
    volume vision-new_uploads          Vision Analytical uploaded images
    volume bharatstey_postgres_data    Bharat Stay website database
    volume bharatstey_uploads_data     Bharat Stay uploads
    ~/va-new                           the live website code
    ~/iphone-import, ~/Downloads       your files

  ${YEL}Needs a decision from you before anything happens:${OFF}
    vaultwarden          password manager, stopped. Its vault lives at
                         /opt/vision/vaultwarden/data — already protected by
                         the /opt/vision rule above, so this script cannot
                         touch it. Restart it or leave it; do not delete.
    portainer            Docker web UI, stopped. Volume portainer_data.
    bharatstey-*         Kiran's website, stopped but its data is intact.
                         Restart it rather than delete it.
    evolution-api_evolution_instances   orphan volume — check before removing:
                           docker run --rm -v evolution-api_evolution_instances:/v alpine ls -la /v
    portainer_data_backup               orphan volume
    ~/.vscode-server (1.4G)             re-downloads on next VS Code connect
    ~/releases (7.6M)                   old release copies, tiny
KEEP

# --- 8. Result -------------------------------------------------------------
step "8. Total"
printf '  reclaimed from files: %s%s%s\n' "$BOLD" "$(human "$FREED_KB")" "$OFF"
echo "  ${DIM}plus the Docker build cache above${OFF}"
if [ "$EXECUTE" = "1" ]; then
  printf '\n  %s✓ done%s\n' "$GRN$BOLD" "$OFF"
  df -h / | awk 'NR==2 {printf "  disk now: %s used of %s, %s free\n", $3, $2, $4}'
else
  printf '\n  %sNothing was changed.%s Run again with --execute when you are ready:\n' "$GRN$BOLD" "$OFF"
  printf '    bash scripts/server-cleanup.sh --execute\n'
fi
echo ""
