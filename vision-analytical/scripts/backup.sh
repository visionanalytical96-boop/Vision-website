#!/usr/bin/env bash
# Backs up everything that cannot be rebuilt from git: the database and the
# uploaded files. Code is not backed up — it lives in the repository.
#
#   ./scripts/backup.sh [destination-directory]
#
# Default destination: ~/backups/vision-analytical
#
# Safe to run while the site is live. pg_dump takes a consistent snapshot and
# does not lock the application out.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${1:-$HOME/backups/vision-analytical}"
STAMP="$(date +%Y-%m-%d-%H%M%S)"
COMPOSE="docker compose -f $PROJECT_DIR/deploy/docker-compose.yml --env-file $PROJECT_DIR/deploy/.env"

DB_USER="$(grep -E '^POSTGRES_USER=' "$PROJECT_DIR/deploy/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
DB_NAME="$(grep -E '^POSTGRES_DB=' "$PROJECT_DIR/deploy/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
DB_USER="${DB_USER:-vision_analytical}"
DB_NAME="${DB_NAME:-vision_analytical}"

mkdir -p "$DEST"

echo "==> Backing up to $DEST"

# --- Database -----------------------------------------------------------------
# --clean --if-exists so the dump can be restored over an existing database
# without hand-dropping it first.
echo "--> Database ($DB_NAME)"
$COMPOSE exec -T postgres pg_dump \
  --username="$DB_USER" \
  --clean --if-exists --no-owner --no-privileges \
  "$DB_NAME" | gzip > "$DEST/db-$STAMP.sql.gz"

DB_SIZE="$(du -h "$DEST/db-$STAMP.sql.gz" | cut -f1)"
echo "    $DEST/db-$STAMP.sql.gz ($DB_SIZE)"

# --- Uploaded files -----------------------------------------------------------
# Read out of the running container rather than off the host: the files live in
# a Docker volume whose host path is an implementation detail.
echo "--> Uploads"
$COMPOSE exec -T app tar -cf - -C /app/public uploads 2>/dev/null \
  | gzip > "$DEST/uploads-$STAMP.tar.gz"

UPLOAD_SIZE="$(du -h "$DEST/uploads-$STAMP.tar.gz" | cut -f1)"
echo "    $DEST/uploads-$STAMP.tar.gz ($UPLOAD_SIZE)"

# --- Secrets ------------------------------------------------------------------
# deploy/.env is not in git and cannot be regenerated. Without it a restore
# cannot even start, so it is copied with restrictive permissions.
echo "--> Environment"
install -m 600 "$PROJECT_DIR/deploy/.env" "$DEST/env-$STAMP.backup"
echo "    $DEST/env-$STAMP.backup (contains secrets — keep this directory private)"

# --- Provenance ---------------------------------------------------------------
# Which commit produced this data. A restore against the wrong code version is
# how a "successful" restore still leaves the site broken.
git -C "$PROJECT_DIR" rev-parse HEAD > "$DEST/commit-$STAMP.txt"
echo "    $DEST/commit-$STAMP.txt ($(cat "$DEST/commit-$STAMP.txt" | cut -c1-8))"

# --- Retention ----------------------------------------------------------------
# Keep 14 of each. Deliberately not "delete anything older than N days": a
# machine that was off for a month would wake up and delete every backup it has.
for pattern in 'db-*.sql.gz' 'uploads-*.tar.gz' 'env-*.backup' 'commit-*.txt'; do
  # shellcheck disable=SC2012
  ls -1t "$DEST"/$pattern 2>/dev/null | tail -n +15 | xargs -r rm --
done

echo "==> Done. $(ls -1 "$DEST"/db-*.sql.gz 2>/dev/null | wc -l) database backup(s) retained."
