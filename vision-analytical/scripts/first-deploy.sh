#!/usr/bin/env bash
#
# First deployment on a server that is already running something else.
#
# Brings this build up on its own compose project and its own port, so an
# existing site keeps serving throughout. Nothing is stopped, removed or
# overwritten — if you don't like the result, `down -v` this project and the
# original is exactly where it was.
#
#   ./scripts/first-deploy.sh
#   HOST_PORT=8091 ./scripts/first-deploy.sh
#
# Re-running is safe: an existing deploy/.env is never overwritten.

set -euo pipefail

PROJECT="${PROJECT:-vision-new}"
HOST_PORT="${HOST_PORT:-8090}"
COMPOSE_FILES="-f deploy/docker-compose.yml -f deploy/docker-compose.ports.yml"

bold() { printf '\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$1" >&2; exit 1; }

# --- Where am I -------------------------------------------------------------
[ -f deploy/docker-compose.yml ] || die "Run this from the vision-analytical/ directory (deploy/docker-compose.yml not found here)."

bold "1. Checking prerequisites"
command -v docker >/dev/null 2>&1 || die "docker is not installed. See DEPLOYMENT.md section 3.1."
docker compose version >/dev/null 2>&1 || die "'docker compose' is not available. You may have the old docker-compose; see DEPLOYMENT.md section 3.1."
docker info >/dev/null 2>&1 || die "Cannot talk to the Docker daemon. Try: sudo systemctl start docker — or run this with sudo."
ok "docker $(docker version --format '{{.Server.Version}}' 2>/dev/null || echo '(version unknown)')"

# Refuse to fight over a port something else is already using — the whole
# point of this script is not disturbing what is already running.
#
# Checked three ways because the obvious one fails open: `ss` is present on
# plenty of systems where it returns nothing (containers with a restricted
# /proc), so `ss | grep` silently reports a busy port as free. /proc/net/tcp
# is the one that is actually authoritative, and anything listening answers
# a request.
port_in_use() {
  local p="$1" hex
  hex=$(printf '%04X' "$p")
  if [ -r /proc/net/tcp ] && awk -v h=":$hex" '$4=="0A" && $2 ~ h" *$"' /proc/net/tcp 2>/dev/null | grep -q .; then
    return 0
  fi
  if command -v ss >/dev/null 2>&1 && ss -ltn 2>/dev/null | grep -q ":${p}\b"; then return 0; fi
  if curl -s -o /dev/null --max-time 2 "http://localhost:${p}/" 2>/dev/null; then return 0; fi
  return 1
}

# Our own stack holding the port is not a conflict — re-running is how you
# apply a settings change. Only somebody else's listener should stop us.
ours=$(docker ps --filter "name=${PROJECT}-nginx" --filter "publish=${HOST_PORT}" --format '{{.Names}}' 2>/dev/null | head -1 || true)
if [ -n "$ours" ]; then
  ok "port ${HOST_PORT} is held by this stack (${ours}) — re-running to apply changes"
elif port_in_use "$HOST_PORT"; then
  die "Port ${HOST_PORT} is already in use by something else, and this script will not disturb it.
   Pick another:  HOST_PORT=8091 ./scripts/first-deploy.sh"
else
  ok "port ${HOST_PORT} is free"
fi

# --- Settings ---------------------------------------------------------------
bold "2. Settings (deploy/.env)"
if [ -f deploy/.env ]; then
  ok "deploy/.env already exists — leaving it untouched"

  # POSTGRES_USER and POSTGRES_DB are read only when Postgres initialises an
  # empty data directory. Change either afterwards and the database keeps the
  # old names while everything else starts asking for the new ones, and the
  # only symptom is Prisma's P1000 — which reads like a wrong password rather
  # than a user that was never created. Catch it here, where it is still cheap.
  # Ask the running database whether the configured user can actually log in.
  # Guessing the old name from the volume is not possible; proving the current
  # name does not work is, and that is the whole finding.
  pg=$(docker ps --filter "name=${PROJECT}-postgres" --format '{{.Names}}' 2>/dev/null | head -1 || true)
  if [ -n "$pg" ]; then
    env_user=$(grep -E "^POSTGRES_USER=" deploy/.env | cut -d= -f2- | tr -d '"' || true)
    env_user="${env_user:-vision_analytical}"
    if ! docker exec "$pg" psql -U "$env_user" -d postgres -c 'SELECT 1' >/dev/null 2>&1; then
      die "POSTGRES_USER in deploy/.env is '${env_user}', but no such user exists in this stack's database.

   Postgres creates its user only when it first initialises an empty data
   directory. Renaming POSTGRES_USER or POSTGRES_DB afterwards leaves the old
   database in place with nothing that can log in — Prisma then reports P1000,
   which reads like a wrong password rather than a user that was never made.

   Pick one:
     a) put POSTGRES_USER back to what it was (the default is
        'vision_analytical') in deploy/.env, then re-run this script; or
     b) start the database over with the new name — this deletes only this
        stack's data, and nothing else on the server:
          docker compose -p ${PROJECT} ${COMPOSE_FILES} --env-file deploy/.env down -v
          ./scripts/first-deploy.sh"
    fi
    ok "database user '${env_user}' can log in"
  fi
else
  [ -f deploy/.env.example ] || die "deploy/.env.example is missing; cannot generate deploy/.env."
  cp deploy/.env.example deploy/.env
  chmod 600 deploy/.env

  # Generated, not asked for: a secret a human invents is a weak one, and
  # this one only ever has to be pasted by machines.
  secret=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')
  dbpass=$(openssl rand -hex 16 2>/dev/null || head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n')

  # The address people will actually type. Everything canonical is built from
  # it, so guessing wrong here shows up later as wrong links in the sitemap.
  ip=$(hostname -I 2>/dev/null | awk '{print $1}')
  [ -n "${ip:-}" ] || ip="localhost"
  site_url="${SITE_URL:-http://${ip}:${HOST_PORT}}"

  set_var() { # key value
    if grep -qE "^${1}=" deploy/.env; then
      sed -i "s|^${1}=.*|${1}=${2}|" deploy/.env
    else
      printf '%s=%s\n' "$1" "$2" >> deploy/.env
    fi
  }
  set_var SESSION_SECRET "$secret"
  set_var POSTGRES_PASSWORD "$dbpass"
  set_var NEXT_PUBLIC_SITE_URL "$site_url"
  set_var HOST_PORT "$HOST_PORT"

  ok "generated deploy/.env (mode 600)"
  ok "site URL set to ${site_url}"
  warn "SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD are still the example values."
  warn "Edit deploy/.env now if you want your own, then re-run this script."
fi

admin_pw=$(grep -E "^SEED_ADMIN_PASSWORD=" deploy/.env | cut -d= -f2- | tr -d '"' || true)
[ -n "${admin_pw:-}" ] || warn "SEED_ADMIN_PASSWORD is empty — the seed will skip creating an admin."

# --- Build and start --------------------------------------------------------
bold "3. Building and starting (first build takes 5-15 minutes)"
echo "  project: ${PROJECT}   port: ${HOST_PORT}"
echo "  Nothing else on this server is touched."
echo

# No --profile tunnel: Cloudflare stays out of it until you choose to point a
# domain here. See DEPLOYMENT.md.
#
# SKIP_BUILD=1 restarts from the image already built, for when you are
# changing configuration rather than code and don't want to wait for a rebuild.
if [ "${SKIP_BUILD:-}" = "1" ]; then
  warn "SKIP_BUILD=1 — reusing the existing image, not rebuilding"
  docker compose -p "$PROJECT" $COMPOSE_FILES --env-file deploy/.env up -d --no-build
else
  docker compose -p "$PROJECT" $COMPOSE_FILES --env-file deploy/.env up -d --build
fi

# --- Wait for it to answer --------------------------------------------------
bold "4. Waiting for the site to answer"
url="http://localhost:${HOST_PORT}"
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$url/" 2>/dev/null || echo 000)
  if [ "$code" = "200" ]; then ok "homepage returned 200"; break; fi
  [ "$i" = "60" ] && {
    warn "still not answering after 2 minutes. Logs:"
    docker compose -p "$PROJECT" $COMPOSE_FILES --env-file deploy/.env logs --tail=40 app migrate
    die "Site did not come up. The migrate logs above usually say why."
  }
  sleep 2
done

# --- Prove the CSS actually applies ----------------------------------------
bold "5. Checking CSS and headers"
if [ -x ./scripts/diagnose-css.sh ]; then
  PROJECT="$PROJECT" ./scripts/diagnose-css.sh "$url" || warn "diagnose-css.sh reported a problem — read it above."
else
  warn "scripts/diagnose-css.sh not found or not executable; skipping."
fi

# --- Done -------------------------------------------------------------------
site=$(grep -E "^NEXT_PUBLIC_SITE_URL=" deploy/.env | cut -d= -f2- | tr -d '"')
printf '\n'
bold "Done."
echo "  Open:  ${site}"
echo "  Admin: ${site}/login"
echo
echo "  Logs:    docker compose -p ${PROJECT} ${COMPOSE_FILES} --env-file deploy/.env logs -f app"
echo "  Stop:    docker compose -p ${PROJECT} ${COMPOSE_FILES} --env-file deploy/.env down"
echo "  Remove:  docker compose -p ${PROJECT} ${COMPOSE_FILES} --env-file deploy/.env down -v   (deletes this stack's data only)"
