#!/usr/bin/env bash
# Checks that production is actually working, not merely running.
#
#   ./scripts/healthcheck.sh            human-readable
#   ./scripts/healthcheck.sh --quiet    only failures (for cron)
#
# Exit code 0 = every check passed. Non-zero = the number that failed, so this
# can be wired straight into monitoring.

set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose -f $PROJECT_DIR/deploy/docker-compose.yml --env-file $PROJECT_DIR/deploy/.env"
QUIET=false
[[ "${1:-}" == "--quiet" ]] && QUIET=true

DB_USER="$(grep -E '^POSTGRES_USER=' "$PROJECT_DIR/deploy/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
DB_NAME="$(grep -E '^POSTGRES_DB=' "$PROJECT_DIR/deploy/.env" 2>/dev/null | cut -d= -f2- | tr -d '"' || true)"
DB_USER="${DB_USER:-vision_analytical}"
DB_NAME="${DB_NAME:-vision_analytical}"

PASSED=0
FAILED=0

pass() { PASSED=$((PASSED + 1)); $QUIET || echo "  OK    $1"; }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL  $1${2:+ — $2}"; }

$QUIET || echo "Vision Analytical health check — $(date '+%Y-%m-%d %H:%M:%S')"
$QUIET || echo ""

# 1. Containers ---------------------------------------------------------------
# `migrate` is a one-shot job: "Exited (0)" is success, not a fault.
for service in postgres app nginx cloudflared; do
  STATE="$($COMPOSE ps --format '{{.Service}} {{.State}}' 2>/dev/null | awk -v s="$service" '$1==s {print $2}')"
  if [[ "$STATE" == "running" ]]; then
    pass "container $service is running"
  else
    fail "container $service" "state: ${STATE:-not found}"
  fi
done

MIGRATE_EXIT="$($COMPOSE ps -a --format '{{.Service}} {{.ExitCode}}' 2>/dev/null | awk '$1=="migrate" {print $2}')"
if [[ "$MIGRATE_EXIT" == "0" ]]; then
  pass "migrate job finished cleanly"
elif [[ -z "$MIGRATE_EXIT" ]]; then
  fail "migrate job" "never ran"
else
  fail "migrate job" "exit code $MIGRATE_EXIT — check: docker compose logs migrate"
fi

# 2. Database -----------------------------------------------------------------
if $COMPOSE exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
  pass "database accepting connections"
else
  fail "database" "pg_isready failed"
fi

# Any migration left unfinished means the schema is in an unknown state.
PENDING="$($COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NULL;" 2>/dev/null | tr -d '[:space:]')"
if [[ "$PENDING" == "0" ]]; then
  pass "all migrations applied"
else
  fail "migrations" "${PENDING:-?} unfinished"
fi

# An empty core table means a seed or restore did not complete.
PRODUCTS="$($COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  'SELECT count(*) FROM "Product";' 2>/dev/null | tr -d '[:space:]')"
if [[ -n "$PRODUCTS" && "$PRODUCTS" -gt 0 ]]; then
  pass "catalogue has data ($PRODUCTS products)"
else
  fail "catalogue" "no products — seed or restore may not have completed"
fi

# Nobody can log in without an admin account.
ADMINS="$($COMPOSE exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT count(*) FROM \"User\" WHERE role = 'ADMIN' AND \"isActive\" = true;" 2>/dev/null | tr -d '[:space:]')"
if [[ -n "$ADMINS" && "$ADMINS" -gt 0 ]]; then
  pass "active admin account exists ($ADMINS)"
else
  fail "admin account" "none — see DEPLOYMENT.md §5"
fi

# 3. Application ---------------------------------------------------------------
# Through nginx, which is how real traffic arrives.
HTTP_CODE="$($COMPOSE exec -T nginx wget -q -S -O /dev/null http://app:3000/ 2>&1 \
  | awk '/HTTP\//{code=$2} END{print code}')"
if [[ "$HTTP_CODE" == "200" ]]; then
  pass "homepage responds 200 through nginx"
else
  fail "homepage" "HTTP ${HTTP_CODE:-no response}"
fi

LOGIN_CODE="$($COMPOSE exec -T nginx wget -q -S -O /dev/null http://app:3000/login 2>&1 \
  | awk '/HTTP\//{code=$2} END{print code}')"
if [[ "$LOGIN_CODE" == "200" ]]; then
  pass "login page responds 200"
else
  fail "login page" "HTTP ${LOGIN_CODE:-no response}"
fi

# The admin section must NOT be reachable without a session. A 200 here is a
# security failure, not a success.
ADMIN_CODE="$($COMPOSE exec -T nginx wget -q -S -O /dev/null http://app:3000/admin 2>&1 \
  | awk '/HTTP\//{code=$2} END{print code}')"
if [[ "$ADMIN_CODE" == "307" || "$ADMIN_CODE" == "302" ]]; then
  pass "admin redirects anonymous visitors ($ADMIN_CODE)"
else
  fail "admin access control" "expected a redirect, got HTTP ${ADMIN_CODE:-no response}"
fi

# 4. Disk ----------------------------------------------------------------------
# Postgres stops accepting writes when the disk fills, and the first symptom is
# usually a site that looks fine until someone tries to save something.
DISK_PCT="$(df --output=pcent / 2>/dev/null | tail -1 | tr -dc '0-9')"
if [[ -n "$DISK_PCT" && "$DISK_PCT" -lt 90 ]]; then
  pass "disk at ${DISK_PCT}%"
else
  fail "disk" "${DISK_PCT:-?}% used — clean up before Postgres stops accepting writes"
fi

# 5. Backups -------------------------------------------------------------------
# A backup system nobody checks is discovered to be broken at restore time.
LATEST_BACKUP="$(ls -1t "$HOME/backups/vision-analytical"/db-*.sql.gz 2>/dev/null | head -1)"
if [[ -n "$LATEST_BACKUP" ]]; then
  AGE_HOURS=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))
  if [[ "$AGE_HOURS" -lt 48 ]]; then
    pass "most recent backup is ${AGE_HOURS}h old"
  else
    fail "backups" "most recent is ${AGE_HOURS}h old — is the cron job running?"
  fi
else
  fail "backups" "none found in ~/backups/vision-analytical — see BACKUP.md"
fi

# ------------------------------------------------------------------------------
$QUIET || echo ""
if [[ "$FAILED" -eq 0 ]]; then
  $QUIET || echo "All $PASSED checks passed."
  exit 0
fi

echo ""
echo "$FAILED of $((PASSED + FAILED)) checks FAILED."
exit "$FAILED"
