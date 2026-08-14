#!/usr/bin/env bash
#
# Server inventory — READ ONLY.
#
# Prints what is on this machine and sorts it into three buckets: what is
# serving live traffic, what holds data, and what is a leftover build copy.
# It deletes nothing, moves nothing and writes nothing outside /tmp. Run it
# as often as you like.
#
#   bash scripts/server-inventory.sh
#
set -uo pipefail

BOLD=$'\033[1m'; DIM=$'\033[2m'; RED=$'\033[31m'; GRN=$'\033[32m'
YEL=$'\033[33m'; CYN=$'\033[36m'; OFF=$'\033[0m'

rule() { printf '%s\n' "────────────────────────────────────────────────────────────"; }
head1() { printf '\n%s%s%s\n' "$BOLD$CYN" "$1" "$OFF"; rule; }

# Size of a path, or "-" when it does not exist. Never follows out of the tree.
size_of() { [ -e "$1" ] && du -sh --one-file-system "$1" 2>/dev/null | cut -f1 || echo "-"; }

printf '%s\n' "${BOLD}SERVER INVENTORY — READ ONLY, NOTHING IS DELETED${OFF}"
printf '%s\n' "${DIM}$(date)  |  $(hostname)  |  $(uname -m)${OFF}"

# --- 1. Disk ---------------------------------------------------------------
head1 "1. DISK SPACE"
df -h / /home 2>/dev/null | awk 'NR==1 || /\/$|\/home/'

# --- 2. Live containers ----------------------------------------------------
head1 "2. WHAT IS RUNNING RIGHT NOW  ${GRN}[KEEP — live]${OFF}"
docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}' 2>/dev/null \
  | awk -F'|' '{printf "  %-24s %-26s %s\n", $1, $2, $3}' \
  || echo "  (docker not reachable)"

head1 "3. WHERE EACH LIVE CONTAINER KEEPS ITS DATA  ${GRN}[KEEP]${OFF}"
echo "${DIM}  Host paths listed here are real data. Do not touch them.${OFF}"
for c in $(docker ps --format '{{.Names}}' 2>/dev/null); do
  printf '\n  %s%s%s\n' "$BOLD" "$c" "$OFF"
  docker inspect "$c" --format '{{range .Mounts}}    {{.Type}}  {{if eq .Type "bind"}}{{.Source}}{{else}}{{.Name}}{{end}}  ->  {{.Destination}}
{{end}}' 2>/dev/null
  wd=$(docker inspect "$c" --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' 2>/dev/null)
  [ -n "$wd" ] && [ "$wd" != "<no value>" ] && printf '    %sbuilt from: %s%s\n' "$YEL" "$wd" "$OFF"
done

# --- 4. Stopped containers -------------------------------------------------
head1 "4. STOPPED CONTAINERS  ${YEL}[review]${OFF}"
stopped=$(docker ps -a --filter status=exited --filter status=created \
  --format '  {{.Names}}  ({{.Image}})  {{.Status}}' 2>/dev/null)
[ -n "$stopped" ] && echo "$stopped" || echo "  none"

# --- 5. Volumes ------------------------------------------------------------
head1 "5. DOCKER VOLUMES"
echo "${BOLD}  In use by a container  ${GRN}[KEEP — this is your data]${OFF}"
inuse=$(docker ps -a --format '{{.Names}}' 2>/dev/null | while read -r c; do
  docker inspect "$c" --format '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}}{{"\n"}}{{end}}{{end}}' 2>/dev/null
done | sort -u | grep -v '^$')
if [ -n "$inuse" ]; then
  echo "$inuse" | while read -r v; do printf '    %s\n' "$v"; done
else
  echo "    none"
fi

echo ""
echo "${BOLD}  Not attached to any container  ${YEL}[review — may be old]${OFF}"
orphan=$(docker volume ls -q 2>/dev/null | grep -vxF "${inuse:-__none__}" 2>/dev/null)
if [ -n "$orphan" ]; then
  echo "$orphan" | while read -r v; do printf '    %s\n' "$v"; done
else
  echo "    none"
fi

# --- 6. Images -------------------------------------------------------------
head1 "6. DOCKER IMAGES"
docker images --format '{{.Repository}}:{{.Tag}}|{{.Size}}|{{.CreatedSince}}' 2>/dev/null \
  | sort | awk -F'|' '{printf "  %-42s %-10s %s\n", $1, $2, $3}'
echo ""
echo "${BOLD}  Untagged / dangling  ${YEL}[review — reclaimable]${OFF}"
dang=$(docker images -qf dangling=true 2>/dev/null | wc -l)
printf '    %s dangling image layers\n' "$dang"
echo ""
echo "${BOLD}  Docker total usage${OFF}"
docker system df 2>/dev/null | sed 's/^/    /'

# --- 7. Home directory -----------------------------------------------------
head1 "7. TOP-LEVEL FOLDERS IN $HOME"
for d in "$HOME"/*/ "$HOME"/.[!.]*/; do
  [ -d "$d" ] || continue
  name=$(basename "$d")
  printf '  %-46s %s\n' "$name" "$(size_of "$d")"
done 2>/dev/null | sort -k1

echo ""
echo "${BOLD}  Loose files sitting directly in $HOME  ${YEL}[review]${OFF}"
find "$HOME" -maxdepth 1 -type f -printf '    %-44f %s bytes\n' 2>/dev/null | sort

# --- 8. Project copies -----------------------------------------------------
head1 "8. COPIES OF THE WEBSITE PROJECT  ${YEL}[the duplicates]${OFF}"
echo "${DIM}  Each block is one full copy. 'LIVE' is the one serving traffic.${OFF}"

live_dir=$(docker inspect vision-new-app-1 \
  --format '{{index .Config.Labels "com.docker.compose.project.working_dir"}}' 2>/dev/null)

while IFS= read -r pkg; do
  root=$(dirname "$pkg")
  [ -d "$root" ] || continue
  case "$root" in *"/node_modules/"*) continue;; esac

  tag="${DIM}leftover copy${OFF}"
  case "$live_dir" in "$root"/deploy|"$root"/deploy/) tag="${GRN}${BOLD}LIVE — serving traffic${OFF}";; esac

  printf '\n  %s%s%s\n' "$BOLD" "$root" "$OFF"
  printf '    status      %b\n' "$tag"
  printf '    total       %s\n' "$(size_of "$root")"
  printf '    node_modules %s      .next %s\n' \
    "$(size_of "$root/node_modules")" "$(size_of "$root/.next")"

  if git -C "$root" rev-parse --git-dir >/dev/null 2>&1; then
    printf '    git         %s  @ %s\n' \
      "$(git -C "$root" rev-parse --abbrev-ref HEAD 2>/dev/null)" \
      "$(git -C "$root" log -1 --format=%cd --date=short 2>/dev/null)"
  else
    printf '    git         %snot a repo — cannot tell how old this code is%s\n' "$YEL" "$OFF"
  fi
  printf '    last touched %s\n' "$(date -r "$root" '+%Y-%m-%d %H:%M' 2>/dev/null)"
  [ -f "$root/deploy/.env" ] && printf '    %shas deploy/.env — check before removing%s\n' "$YEL" "$OFF"
done < <(find "$HOME" -maxdepth 5 -name package.json -path "*vision-analytical*" \
           -not -path "*/node_modules/*" 2>/dev/null | sort)

# --- 9. Summary ------------------------------------------------------------
head1 "9. READ THIS BEFORE REMOVING ANYTHING"
cat <<'NOTE'
  KEEP, always:
    - every volume listed under "In use by a container" (section 5)
    - every bind-mount host path in section 3 — that is Nextcloud's files,
      the database, and your uploaded images
    - the project copy marked LIVE in section 8
    - your own folders: Downloads, documents, anything you put there

  SAFE TO RECLAIM, usually:
    - node_modules and .next inside a NON-live project copy. These are
      rebuilt by `npm ci` and `npm run build`. This is normally where most
      of the wasted space is, and removing them breaks nothing.
    - dangling image layers (section 6)

  DECIDE CAREFULLY:
    - a whole non-live project copy. Check it has no deploy/.env you still
      need and no uncommitted work first:
        git -C <path> status --short
    - volumes NOT attached to a container. One of these could be an old
      database you still want. Check before acting:
        docker run --rm -v <volume>:/v alpine ls -la /v

  Nothing in this report has been changed. Send it to me and I will tell you
  exactly which lines are safe to remove, and give you the commands.
NOTE
echo ""
