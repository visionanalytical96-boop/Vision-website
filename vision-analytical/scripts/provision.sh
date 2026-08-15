#!/usr/bin/env bash
#
# One server, two companies — take it from wherever it is to a clean build.
#
#   bash scripts/provision.sh                      # show the plan, change nothing
#   bash scripts/provision.sh --reset --execute    # tear the WEBSITES down first
#   bash scripts/provision.sh --build --execute    # lay out /srv, clone, build, start
#
# Nextcloud is never touched. Not its containers, not its volumes, not
# /opt/vision or /srv/platform. The reset phase works from an explicit list of
# website stacks and refuses anything whose name or mounts reach Nextcloud, so
# there is no path through this script that removes your files.
#
#   Vision Analytical  (Vishal)  ->  /srv/vision-analytical  port 8090
#   Bharat Tech        (Kiran)   ->  /srv/bharatstey         port 8091
#   Nextcloud          (shared)  ->  left exactly as it is
#
set -uo pipefail

EXECUTE=0; DO_RESET=0; DO_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --execute) EXECUTE=1 ;;
    --reset)   DO_RESET=1 ;;
    --build)   DO_BUILD=1 ;;
    -h|--help) sed -n '2,18p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done
[ "$DO_RESET" = "0" ] && [ "$DO_BUILD" = "0" ] && { DO_RESET=1; DO_BUILD=1; }

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'
GRN=$'\033[32m'; YEL=$'\033[33m'; CYN=$'\033[36m'; OFF=$'\033[0m'

step() { printf '\n%s%s%s\n────────────────────────────────────────────────\n' "$BOLD$CYN" "$1" "$OFF"; }
ok()   { printf '  %s✓%s %s\n' "$GRN" "$OFF" "$*"; }
warn() { printf '  %s!%s %s\n' "$YEL" "$OFF" "$*"; }
die()  { printf '\n%sSTOPPED:%s %s\n' "$RED$BOLD" "$OFF" "$*" >&2; exit 1; }
run()  { if [ "$EXECUTE" = "1" ]; then eval "$@"; else printf '  %s$ %s%s\n' "$DIM" "$*" "$OFF"; fi; }

REPO_URL="https://github.com/visionanalytical96-boop/Vision-website.git"
BRANCH="claude/vision-analytical-server-arch-3jjosh"

# Website stacks only. Nextcloud's project name is deliberately absent, and the
# guard below double-checks before anything is removed.
WEBSITE_PROJECTS=("vision-new" "bharatstey")

printf '%s\n' "${BOLD}PROVISION — ONE SERVER, TWO COMPANIES${OFF}"
if [ "$EXECUTE" = "1" ]; then
  printf '%sMODE: EXECUTE%s\n' "$RED$BOLD" "$OFF"
else
  printf '%sMODE: DRY RUN — nothing will be changed%s\n' "$GRN$BOLD" "$OFF"
fi

# --- Guard -----------------------------------------------------------------
# A resource is off limits if its name mentions Nextcloud, or if any container
# using it mounts a Nextcloud path. Names alone are not enough: a volume could
# be attached to Nextcloud under any name at all.
touches_nextcloud() {
  local name="$1"
  case "$name" in *nextcloud*|*NEXTCLOUD*|*Nextcloud*) return 0 ;; esac
  docker ps -a --format '{{.Names}}' 2>/dev/null | while read -r c; do
    case "$c" in *nextcloud*) ;; *) continue ;; esac
    docker inspect "$c" --format '{{range .Mounts}}{{if eq .Type "bind"}}{{.Source}}{{else}}{{.Name}}{{end}}
{{end}}' 2>/dev/null | grep -qxF "$name" && exit 0
  done && return 0
  return 1
}

step "0. Where things stand"
docker ps --format '  {{.Names}}  {{.Status}}' 2>/dev/null || die "docker is not reachable"
echo ""
df -h / | awk 'NR==2 {printf "  disk: %s used of %s, %s free\n", $3, $2, $4}'

if docker ps --format '{{.Names}}' 2>/dev/null | grep -q nextcloud; then
  ok "Nextcloud is running — it will not be touched"
else
  warn "Nextcloud is not running. That is fine, it is still not touched."
fi

# --- Reset -----------------------------------------------------------------
if [ "$DO_RESET" = "1" ]; then
  step "1. Tear down the website stacks"
  echo "${DIM}  Containers, their volumes and their images. Nextcloud excluded.${OFF}"

  for proj in "${WEBSITE_PROJECTS[@]}"; do
    if touches_nextcloud "$proj"; then
      warn "refusing $proj — it reaches Nextcloud"
      continue
    fi
    printf '\n  %s%s%s\n' "$BOLD" "$proj" "$OFF"

    for c in $(docker ps -a --filter "label=com.docker.compose.project=$proj" --format '{{.Names}}' 2>/dev/null); do
      printf '    container  %s\n' "$c"
      run "docker rm -f '$c' >/dev/null 2>&1"
    done

    for v in $(docker volume ls -q 2>/dev/null | grep "^${proj}_" || true); do
      if touches_nextcloud "$v"; then warn "refusing volume $v"; continue; fi
      printf '    volume     %s  %s(database / uploads — gone for good)%s\n' "$v" "$YEL" "$OFF"
      run "docker volume rm '$v' >/dev/null 2>&1"
    done

    for i in $(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep "^${proj}-" || true); do
      printf '    image      %s\n' "$i"
      run "docker rmi -f '$i' >/dev/null 2>&1"
    done
  done

  echo ""
  run "docker builder prune -a -f >/dev/null 2>&1"
  ok "build cache cleared"

  if [ "$EXECUTE" = "1" ]; then
    echo ""
    warn "Website databases are now gone. They are rebuilt empty by the seed"
    warn "in the build phase. Nextcloud is untouched."
  fi
fi

# --- Build -----------------------------------------------------------------
if [ "$DO_BUILD" = "1" ]; then
  step "2. Lay out /srv"
  run "sudo mkdir -p /srv/platform /srv/vision-analytical /srv/bharatstey /srv/backups"
  run "sudo chown -R \"$USER\":\"$USER\" /srv/vision-analytical /srv/bharatstey /srv/backups"
  ok "/srv/{platform,vision-analytical,bharatstey,backups}"

  step "3. Vision Analytical — clone and configure"
  APP=/srv/vision-analytical/app
  if [ -d "$APP/.git" ]; then
    ok "already cloned — pulling"
    run "git -C '$APP' fetch origin '$BRANCH' && git -C '$APP' checkout '$BRANCH' && git -C '$APP' pull origin '$BRANCH'"
  else
    run "git clone --branch '$BRANCH' '$REPO_URL' '$APP'"
  fi

  DEPLOY="$APP/vision-analytical/deploy"
  echo ""
  echo "${DIM}  .env carries the compose flags, so plain 'docker compose up -d'${OFF}"
  echo "${DIM}  always brings up the right project with its host port. Forgetting${OFF}"
  echo "${DIM}  -f docker-compose.ports.yml is what took the site down before.${OFF}"

  if [ "$EXECUTE" = "1" ]; then
    if [ ! -f "$DEPLOY/.env" ]; then
      for candidate in "$HOME/env-archive"/*deploy_.env "$HOME"/va-new/vision-analytical/deploy/.env; do
        [ -f "$candidate" ] && { cp "$candidate" "$DEPLOY/.env"; ok "reused existing .env from $candidate"; break; }
      done
    fi
    [ -f "$DEPLOY/.env" ] || die "No .env for Vision Analytical.
      Copy one in and re-run:
        cp <your old deploy/.env> $DEPLOY/.env"

    for line in \
      'COMPOSE_PROJECT_NAME=vision-new' \
      'COMPOSE_FILE=docker-compose.yml:docker-compose.ports.yml' \
      'HOST_PORT=8090'
    do
      key="${line%%=*}"
      grep -q "^${key}=" "$DEPLOY/.env" || printf '%s\n' "$line" >> "$DEPLOY/.env"
    done
    ok "compose flags set in .env"
  else
    printf '  %s$ ensure COMPOSE_PROJECT_NAME / COMPOSE_FILE / HOST_PORT in %s/.env%s\n' "$DIM" "$DEPLOY" "$OFF"
  fi

  step "4. Vision Analytical — build and start"
  run "cd '$DEPLOY' && docker compose build"
  run "cd '$DEPLOY' && docker compose up -d"

  if [ "$EXECUTE" = "1" ]; then
    echo "  waiting for the app to answer..."
    for i in $(seq 1 30); do
      code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8090 2>/dev/null)
      [ "$code" = "200" ] && { ok "http://localhost:8090 -> 200 OK"; break; }
      [ "$i" = "30" ] && die "Site did not come up. Look at:
      docker compose -p vision-new logs --tail 60 app"
      sleep 3
    done
  fi

  step "5. Bharat Tech"
  if docker volume ls -q 2>/dev/null | grep -q '^bharatstey_'; then
    warn "bharatstey volumes still present — its data survived"
  fi
  echo "${DIM}  Kiran's site needs its own repository. Once you give me the URL I${OFF}"
  echo "${DIM}  will add it here as a mirror of the block above, on port 8091 with${OFF}"
  echo "${DIM}  COMPOSE_PROJECT_NAME=bharatstey.${OFF}"
fi

# --- Done ------------------------------------------------------------------
step "Result"
if [ "$EXECUTE" = "1" ]; then
  docker ps --format '  {{.Names}}  {{.Status}}' 2>/dev/null
  echo ""
  df -h / | awk 'NR==2 {printf "  disk: %s used of %s, %s free\n", $3, $2, $4}'
  echo ""
  ok "From here on, from /srv/vision-analytical/app/vision-analytical/deploy:"
  echo "      docker compose up -d          ${DIM}# no flags needed, ever${OFF}"
else
  printf '  %sNothing was changed.%s Add --execute when the plan looks right:\n' "$GRN$BOLD" "$OFF"
  echo "    bash scripts/provision.sh --reset --execute     # websites down"
  echo "    bash scripts/provision.sh --build --execute     # and back up"
fi
echo ""
