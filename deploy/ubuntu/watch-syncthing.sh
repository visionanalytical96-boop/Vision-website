#!/usr/bin/env bash
# Long-polls the local Syncthing REST API and runs deploy.sh whenever a
# watched folder finishes an actual sync (syncing -> idle). Intended to run
# as a persistent service (see syncthing-deploy-watch.service).
#
# Requires: curl, jq.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "$SCRIPT_DIR/lib.sh"

ENV_FILE="$SCRIPT_DIR/deploy.env"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE (copy deploy.env.example and fill it in)" >&2; exit 1; }
# shellcheck source=deploy.env.example
source "$ENV_FILE"
LOG_DIR="${LOG_DIR:-/var/log/site-deploy}"

LOG_FILE="$LOG_DIR/watch.log"
mkdir -p "$LOG_DIR"

declare -A FOLDER_TO_SITE=(
    ["$VISION_ANALYTICAL_FOLDER_ID"]="vision-analytical"
    ["$BHARATSTAY_FOLDER_ID"]="bharatstay"
)

api() {
    curl -fsS -H "X-API-Key: $SYNCTHING_API_KEY" "$SYNCTHING_URL$1"
}

# A StateChanged event can fire a moment before the folder is fully settled;
# confirm via db/status before actually deploying.
folder_is_idle() {
    local status
    status="$(api "/rest/db/status?folder=$1")" || return 1
    [[ "$(jq -r '.state' <<<"$status")" == "idle" && "$(jq -r '.needTotalItems' <<<"$status")" == "0" ]]
}

log INFO "Watching Syncthing folders: ${!FOLDER_TO_SITE[*]}"

SINCE=0
while true; do
    EVENTS="$(api "/rest/events?since=$SINCE&timeout=60&events=StateChanged")" || {
        log WARN "Syncthing API unreachable, retrying in 10s"
        sleep 10
        continue
    }
    [[ -z "$EVENTS" || "$EVENTS" == "[]" ]] && continue

    while IFS= read -r ev; do
        SINCE="$(jq -r '.id' <<<"$ev")"
        folder="$(jq -r '.data.folder // empty' <<<"$ev")"
        to="$(jq -r '.data.to // empty' <<<"$ev")"
        from="$(jq -r '.data.from // empty' <<<"$ev")"
        [[ -n "$folder" && -n "${FOLDER_TO_SITE[$folder]:-}" ]] || continue
        [[ "$to" == "idle" && "$from" == "syncing" ]] || continue

        site="${FOLDER_TO_SITE[$folder]}"
        log INFO "Folder $folder ($site) finished syncing, confirming settle"
        sleep 5
        if folder_is_idle "$folder"; then
            log INFO "Triggering deploy for $site"
            "$SCRIPT_DIR/deploy.sh" "$site" || log ERROR "deploy.sh $site exited non-zero"
        else
            log WARN "$folder not settled yet, skipping — next idle transition will retry"
        fi
    done < <(jq -c '.[]' <<<"$EVENTS")
done
