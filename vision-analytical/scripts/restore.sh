#!/usr/bin/env bash
# Restores a database dump and (optionally) the uploaded files.
#
#   ./scripts/restore.sh ~/backups/vision-analytical/db-2026-08-13-140000.sql.gz
#   ./scripts/restore.sh <db.sql.gz> <uploads.tar.gz>
#
# This OVERWRITES the current database. It asks first, and it takes a safety
# dump of what is there now before touching anything — a restore of the wrong
# file is a common way to turn one bad day into two.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose -f $PROJECT_DIR/deploy/docker-compose.yml --env-file $PROJECT_DIR/deploy/.env"

DB_DUMP="${1:-}"
UPLOADS_ARCHIVE="${2:-}"

if [[ -z "$DB_DUMP" ]]; then
  echo "Usage: $0 <db-dump.sql.gz> [uploads.tar.gz]" >&2
  echo "" >&2
  echo "Available backups:" >&2
  ls -1t "$HOME/backups/vision-analytical"/db-*.sql.gz 2>/dev/null | head -10 >&2 || echo "  (none found)" >&2
  exit 1
fi

if [[ ! -f "$DB_DUMP" ]]; then
  echo "Not found: $DB_DUMP" >&2
  exit 1
fi

DB_USER="$(grep -E '^POSTGRES_USER=' "$PROJECT_DIR/deploy/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
DB_NAME="$(grep -E '^POSTGRES_DB=' "$PROJECT_DIR/deploy/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
DB_USER="${DB_USER:-vision_analytical}"
DB_NAME="${DB_NAME:-vision_analytical}"

echo "About to restore into database '$DB_NAME'."
echo "  from: $DB_DUMP"
[[ -n "$UPLOADS_ARCHIVE" ]] && echo "  uploads: $UPLOADS_ARCHIVE"
echo ""
read -r -p "This replaces the current data. Type 'restore' to continue: " CONFIRM
[[ "$CONFIRM" == "restore" ]] || { echo "Aborted."; exit 1; }

# --- Safety net ---------------------------------------------------------------
SAFETY="$HOME/backups/vision-analytical/pre-restore-$(date +%Y-%m-%d-%H%M%S).sql.gz"
mkdir -p "$(dirname "$SAFETY")"
echo "==> Dumping current state first: $SAFETY"
$COMPOSE exec -T postgres pg_dump --username="$DB_USER" \
  --clean --if-exists --no-owner --no-privileges "$DB_NAME" | gzip > "$SAFETY"

# --- Stop the app so nothing writes mid-restore --------------------------------
echo "==> Stopping app"
$COMPOSE stop app

echo "==> Restoring database"
# ON_ERROR_STOP so a broken dump fails loudly instead of leaving a half-restored
# database that looks like it worked.
gunzip -c "$DB_DUMP" | $COMPOSE exec -T postgres \
  psql --username="$DB_USER" --dbname="$DB_NAME" --set ON_ERROR_STOP=on --quiet

if [[ -n "$UPLOADS_ARCHIVE" ]]; then
  if [[ ! -f "$UPLOADS_ARCHIVE" ]]; then
    echo "Uploads archive not found: $UPLOADS_ARCHIVE" >&2
    exit 1
  fi
  echo "==> Restoring uploads"
  $COMPOSE start app
  sleep 3
  gunzip -c "$UPLOADS_ARCHIVE" | $COMPOSE exec -T app tar -xf - -C /app/public
else
  $COMPOSE start app
fi

echo "==> Waiting for the app"
sleep 5
"$PROJECT_DIR/scripts/healthcheck.sh" || {
  echo ""
  echo "Health check failed after restore. The pre-restore state is at:"
  echo "  $SAFETY"
  exit 1
}

echo "==> Restore complete."
