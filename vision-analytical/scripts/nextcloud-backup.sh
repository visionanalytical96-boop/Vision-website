#!/usr/bin/env bash
#
# Nextcloud full backup — files + database, consistent with each other.
#
#   bash scripts/nextcloud-backup.sh [DESTINATION_DIR]
#
# Default destination: /home/$USER/backups
#
# What it does, in order:
#   1. finds the Nextcloud containers and everything they store
#   2. refuses to start unless the destination has room, with margin
#   3. puts Nextcloud into maintenance mode so files and database agree
#   4. dumps the database, then archives every mount
#   5. takes Nextcloud out of maintenance mode — even if a step fails
#   6. verifies each archive is readable and records checksums
#
# It reads the source and writes only into the destination. It deletes
# nothing, and it never writes inside a Nextcloud volume.
#
set -uo pipefail

DEST="${1:-$HOME/backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DEST/nextcloud-$STAMP"

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'
GRN=$'\033[32m'; YEL=$'\033[33m'; OFF=$'\033[0m'

say()  { printf '%s\n' "$*"; }
ok()   { printf '  %s✓%s %s\n' "$GRN" "$OFF" "$*"; }
warn() { printf '  %s!%s %s\n' "$YEL" "$OFF" "$*"; }
die()  { printf '\n%sSTOPPED:%s %s\n' "$RED$BOLD" "$OFF" "$*" >&2; exit 1; }
step() { printf '\n%s%s%s\n────────────────────────────────────────────────\n' "$BOLD" "$*" "$OFF"; }

APP_C=""; DB_C=""
MAINTENANCE_ON=0

# Always leave Nextcloud usable, whatever happened above.
cleanup() {
  if [ "$MAINTENANCE_ON" = "1" ] && [ -n "$APP_C" ]; then
    say ""
    say "Taking Nextcloud out of maintenance mode..."
    docker exec -u www-data "$APP_C" php occ maintenance:mode --off 2>/dev/null \
      && ok "Nextcloud is live again" \
      || warn "COULD NOT DISABLE MAINTENANCE MODE. Run this yourself:
      docker exec -u www-data $APP_C php occ maintenance:mode --off"
  fi
}
trap cleanup EXIT INT TERM

say "${BOLD}NEXTCLOUD BACKUP${OFF}"
say "${DIM}$(date)  |  destination: $OUT${OFF}"

# --- 1. Find the containers ------------------------------------------------
step "1. Finding Nextcloud"

for c in $(docker ps --format '{{.Names}}' 2>/dev/null); do
  img=$(docker inspect "$c" --format '{{.Config.Image}}' 2>/dev/null)
  case "$img" in
    *nextcloud*) [ -z "$APP_C" ] && APP_C="$c" ;;
    *mariadb*|*mysql*|*postgres*)
      case "$c" in *nextcloud*|*nc-*) [ -z "$DB_C" ] && DB_C="$c" ;; esac ;;
  esac
done

[ -n "$APP_C" ] || die "No running Nextcloud container found. Is it up? Check: docker ps"
ok "app container:      $APP_C"
[ -n "$DB_C" ] && ok "database container: $DB_C" || warn "no database container matched — files will still be backed up"

# --- 2. What has to be copied ---------------------------------------------
step "2. What will be backed up"

# name<TAB>type<TAB>destination-inside-container
MOUNTS=$(docker inspect "$APP_C" --format \
  '{{range .Mounts}}{{if eq .Type "bind"}}{{.Source}}{{else}}{{.Name}}{{end}}	{{.Type}}	{{.Destination}}
{{end}}' 2>/dev/null | grep -v '^	')

[ -n "$MOUNTS" ] || die "The Nextcloud container reports no mounts. Nothing to back up — this is unexpected, stop and tell me."

printf '%s\n' "$MOUNTS" | while IFS=$'\t' read -r name type dest; do
  [ -n "$name" ] || continue
  printf '  %-34s %-7s -> %s\n' "$name" "$type" "$dest"
done

say ""
say "Measuring (this can take a minute on a large library)..."
SRC_KB=0
while IFS=$'\t' read -r name type dest; do
  [ -n "$name" ] || continue
  if [ "$type" = "bind" ]; then
    kb=$(du -sk --one-file-system "$name" 2>/dev/null | cut -f1)
  else
    kb=$(docker run --rm -v "$name":/src:ro alpine:3 du -sk /src 2>/dev/null | cut -f1)
  fi
  kb=${kb:-0}
  SRC_KB=$((SRC_KB + kb))
  printf '  %-34s %s\n' "$name" "$(numfmt --to=iec --from-unit=1024 "$kb" 2>/dev/null || echo "${kb}K")"
done <<< "$MOUNTS"

say ""
ok "total to copy: $(numfmt --to=iec --from-unit=1024 "$SRC_KB" 2>/dev/null || echo "${SRC_KB}K")"

# --- 3. Room to land it ----------------------------------------------------
step "3. Checking space"

mkdir -p "$DEST" || die "Cannot create $DEST"
FREE_KB=$(df -Pk "$DEST" | awk 'NR==2 {print $4}')
NEED_KB=$(( SRC_KB + SRC_KB / 5 + 1048576 ))   # source + 20% + 1GB headroom

say "  free at destination: $(numfmt --to=iec --from-unit=1024 "$FREE_KB" 2>/dev/null || echo "${FREE_KB}K")"
say "  required (with margin): $(numfmt --to=iec --from-unit=1024 "$NEED_KB" 2>/dev/null || echo "${NEED_KB}K")"

if [ "$FREE_KB" -lt "$NEED_KB" ]; then
  die "Not enough free space at $DEST.
      Attach a USB disk or another drive and pass it as the destination:
        bash scripts/nextcloud-backup.sh /mnt/mydisk/backups
      Nothing has been changed. Nextcloud was never touched."
fi
ok "enough space"

mkdir -p "$OUT" || die "Cannot create $OUT"

# --- 4. Maintenance mode ---------------------------------------------------
step "4. Pausing Nextcloud (maintenance mode)"
say "${DIM}  Users see a maintenance page for a few minutes. Nothing is lost —${OFF}"
say "${DIM}  this is what makes the files and the database match each other.${OFF}"

if docker exec -u www-data "$APP_C" php occ maintenance:mode --on 2>/dev/null; then
  MAINTENANCE_ON=1
  ok "maintenance mode on"
else
  warn "could not enable maintenance mode (occ unavailable)"
  warn "continuing — the copy may catch a file mid-write if someone is uploading right now"
fi

# --- 5. Database -----------------------------------------------------------
step "5. Database dump"

if [ -n "$DB_C" ]; then
  DUMP="$OUT/database.sql"
  if docker exec "$DB_C" sh -c '
      PW="${MARIADB_ROOT_PASSWORD:-${MYSQL_ROOT_PASSWORD:-}}"
      [ -n "$PW" ] || exit 3
      if command -v mariadb-dump >/dev/null 2>&1; then
        exec mariadb-dump --single-transaction --routines --triggers \
             --all-databases -u root -p"$PW"
      else
        exec mysqldump --single-transaction --routines --triggers \
             --all-databases -u root -p"$PW"
      fi' > "$DUMP" 2>"$OUT/database.err"; then
    SZ=$(stat -c %s "$DUMP" 2>/dev/null || echo 0)
    if [ "$SZ" -lt 1024 ]; then
      die "Database dump is only ${SZ} bytes — that is not a real dump.
      See $OUT/database.err
      Nextcloud will be taken out of maintenance mode automatically."
    fi
    gzip -f "$DUMP" && ok "database.sql.gz  ($(du -h "$DUMP.gz" | cut -f1))"
    rm -f "$OUT/database.err"
  else
    die "Database dump failed. See $OUT/database.err
      Most likely the root password env var has a different name.
      Check with: docker exec $DB_C printenv | grep -i pass"
  fi
else
  warn "skipped — no database container identified"
fi

# --- 6. Files --------------------------------------------------------------
step "6. Archiving files"
say "${DIM}  Plain tar, no compression: photos and videos do not compress, and${OFF}"
say "${DIM}  gzip on them would only cost hours of CPU for nothing.${OFF}"
say ""

: > "$OUT/manifest.txt"
while IFS=$'\t' read -r name type dest; do
  [ -n "$name" ] || continue
  safe=$(printf '%s' "$name" | tr '/' '_' | sed 's/^_//')
  tarball="$OUT/$safe.tar"

  printf '  %-34s ' "$name"
  if [ "$type" = "bind" ]; then
    tar -cf "$tarball" -C "$(dirname "$name")" "$(basename "$name")" 2>/dev/null
  else
    docker run --rm -v "$name":/src:ro -v "$OUT":/backup alpine:3 \
      tar -cf "/backup/$safe.tar" -C /src . 2>/dev/null
  fi

  if [ -s "$tarball" ]; then
    n=$(tar -tf "$tarball" 2>/dev/null | wc -l)
    printf '%s✓%s  %s, %s files\n' "$GRN" "$OFF" "$(du -h "$tarball" | cut -f1)" "$n"
    printf '%s\t%s\t%s\t%s files\n' "$safe.tar" "$type" "$dest" "$n" >> "$OUT/manifest.txt"
  else
    printf '%s✗ FAILED%s\n' "$RED" "$OFF"
    printf '%s\tFAILED\t%s\n' "$safe.tar" "$dest" >> "$OUT/manifest.txt"
  fi
done <<< "$MOUNTS"

# --- 7. Verify -------------------------------------------------------------
step "7. Verifying"

FAILED=$(grep -c FAILED "$OUT/manifest.txt" 2>/dev/null || echo 0)
say "  Reading every archive back..."
BAD=0
for t in "$OUT"/*.tar; do
  [ -e "$t" ] || continue
  if tar -tf "$t" >/dev/null 2>&1; then
    ok "$(basename "$t") reads cleanly"
  else
    printf '  %s✗ %s IS CORRUPT%s\n' "$RED" "$(basename "$t")" "$OFF"; BAD=1
  fi
done

if [ -f "$OUT/database.sql.gz" ]; then
  gzip -t "$OUT/database.sql.gz" 2>/dev/null \
    && ok "database.sql.gz reads cleanly" \
    || { printf '  %s✗ database.sql.gz IS CORRUPT%s\n' "$RED" "$OFF"; BAD=1; }
fi

say ""
say "  Writing checksums (slow on large backups, but this is what proves"
say "  the copy is intact later)..."
( cd "$OUT" && sha256sum ./* > SHA256SUMS 2>/dev/null )
ok "SHA256SUMS written"

cat > "$OUT/HOW-TO-RESTORE.txt" <<RESTORE
Nextcloud backup taken $(date)
Source host: $(hostname)
App container: $APP_C
DB container:  $DB_C

CONTENTS
$(cat "$OUT/manifest.txt")
database.sql.gz  - full database dump (all databases)

VERIFY THIS BACKUP AT ANY TIME
  cd "$OUT" && sha256sum -c SHA256SUMS

RESTORE (only onto a machine where you intend to overwrite Nextcloud)
  1. docker exec -u www-data <app> php occ maintenance:mode --on
  2. Restore the database:
       gunzip -c database.sql.gz | docker exec -i <db> sh -c \\
         'mariadb -u root -p"\$MARIADB_ROOT_PASSWORD"'
  3. Restore each volume, one at a time:
       docker run --rm -v <volume>:/dst -v "$OUT":/backup alpine:3 \\
         sh -c 'cd /dst && tar -xf /backup/<file>.tar'
  4. docker exec -u www-data <app> php occ maintenance:mode --off

Restoring overwrites live data. Read step 3 twice before running it.
RESTORE

# --- 8. Result -------------------------------------------------------------
step "8. Result"

TOTAL=$(du -sh "$OUT" 2>/dev/null | cut -f1)
if [ "$BAD" = "0" ] && [ "${FAILED:-0}" = "0" ]; then
  printf '  %s%sBACKUP COMPLETE AND VERIFIED%s\n' "$GRN" "$BOLD" "$OFF"
  printf '  %s  (%s)\n' "$OUT" "$TOTAL"
  say ""
  say "  Every archive was read back and checksummed. Nextcloud is live again."
  say "  ${BOLD}Keep a second copy on a different disk before any cleanup.${OFF}"
else
  printf '  %s%sBACKUP INCOMPLETE — DO NOT DELETE ANYTHING%s\n' "$RED" "$BOLD" "$OFF"
  printf '  Check %s and send me the output.\n' "$OUT/manifest.txt"
  exit 1
fi
