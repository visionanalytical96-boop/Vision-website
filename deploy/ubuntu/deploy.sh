#!/usr/bin/env bash
# Atomically deploys one site from its Syncthing staging folder to a
# timestamped release, with automatic rollback on failure. Safe to run
# manually, or have watch-syncthing.sh call it after a sync completes.
#
# Usage: deploy.sh <vision-analytical|bharatstay>

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)"
source "$SCRIPT_DIR/lib.sh"

ENV_FILE="$SCRIPT_DIR/deploy.env"
[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE (copy deploy.env.example and fill it in)" >&2; exit 1; }
# shellcheck source=deploy.env.example
source "$ENV_FILE"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
LOG_DIR="${LOG_DIR:-/var/log/site-deploy}"

SITE="${1:?Usage: deploy.sh <vision-analytical|bharatstay>}"

case "$SITE" in
    vision-analytical)
        STAGING="$VISION_ANALYTICAL_STAGING"
        RELEASES="$VISION_ANALYTICAL_RELEASES"
        CURRENT="$VISION_ANALYTICAL_CURRENT"
        REQUIRED_FILES="$VISION_ANALYTICAL_REQUIRED_FILES"
        OWNER="$VISION_ANALYTICAL_OWNER"
        RELOAD_CMD="$VISION_ANALYTICAL_RELOAD_CMD"
        HEALTHCHECK_CMD="${VISION_ANALYTICAL_HEALTHCHECK_CMD:-}"
        ;;
    bharatstay)
        STAGING="$BHARATSTAY_STAGING"
        RELEASES="$BHARATSTAY_RELEASES"
        CURRENT="$BHARATSTAY_CURRENT"
        REQUIRED_FILES="$BHARATSTAY_REQUIRED_FILES"
        OWNER="$BHARATSTAY_OWNER"
        RELOAD_CMD="$BHARATSTAY_RELOAD_CMD"
        HEALTHCHECK_CMD="${BHARATSTAY_HEALTHCHECK_CMD:-}"
        ;;
    *)
        echo "Unknown site: $SITE (expected vision-analytical or bharatstay)" >&2
        exit 1
        ;;
esac

LOG_FILE="$LOG_DIR/$SITE.log"
mkdir -p "$LOG_DIR" "$RELEASES" "$(dirname "$CURRENT")"

# Serialize deploys per site so a fast second sync can't overlap a running one.
LOCK_FILE="/tmp/deploy-$SITE.lock"
exec 200>"$LOCK_FILE"
flock -n 200 || { log WARN "Deploy already running for $SITE, skipping"; exit 0; }

log INFO "Deploying $SITE from $STAGING"

for f in $REQUIRED_FILES; do
    if [[ ! -e "$STAGING/$f" ]]; then
        log ERROR "Required file missing in staging: $f — aborting (source not fully synced?)"
        exit 1
    fi
done

PREVIOUS_RELEASE=""
[[ -L "$CURRENT" ]] && PREVIOUS_RELEASE="$(readlink -f "$CURRENT")"

rollback_and_exit() {
    log ERROR "$1"
    if [[ -n "$PREVIOUS_RELEASE" ]]; then
        ln -sfn "$PREVIOUS_RELEASE" "$CURRENT.tmp" && mv -Tf "$CURRENT.tmp" "$CURRENT"
        if (cd "$CURRENT" && eval "$RELOAD_CMD") >>"$LOG_FILE" 2>&1; then
            log WARN "Rolled back $SITE to previous release $(basename "$PREVIOUS_RELEASE")"
        else
            log ERROR "Rollback reload failed for $SITE — manual intervention required"
        fi
    else
        log ERROR "No previous release for $SITE to roll back to — manual intervention required"
    fi
    exit 1
}

# Each release is both the atomic-swap unit and the timestamped backup of
# whatever was live before it.
RELEASE_TS="$(date -u +'%Y%m%dT%H%M%SZ')"
NEW_RELEASE="$RELEASES/$RELEASE_TS"

LINK_DEST_ARGS=()
[[ -n "$PREVIOUS_RELEASE" ]] && LINK_DEST_ARGS=(--link-dest="$PREVIOUS_RELEASE")

log INFO "Copying changed files into new release $RELEASE_TS"
mkdir -p "$NEW_RELEASE"
if ! rsync -a "${LINK_DEST_ARGS[@]}" "$STAGING"/ "$NEW_RELEASE"/; then
    log ERROR "rsync failed for $SITE — leaving live release untouched"
    rm -rf "$NEW_RELEASE"
    exit 1
fi

# Unchanged files are hardlinked to the previous release by --link-dest, so
# this chown also touches them there — harmless since every release is
# normalized to the same $OWNER.
chown -R "$OWNER" "$NEW_RELEASE"

ln -sfn "$NEW_RELEASE" "$CURRENT.tmp"
mv -Tf "$CURRENT.tmp" "$CURRENT"
log INFO "Switched $CURRENT -> $RELEASE_TS"

if ! (cd "$CURRENT" && eval "$RELOAD_CMD") >>"$LOG_FILE" 2>&1; then
    rollback_and_exit "Reload command failed for $SITE"
fi

if [[ -n "$HEALTHCHECK_CMD" ]]; then
    healthy=false
    for _ in 1 2 3 4 5; do
        if (cd "$CURRENT" && eval "$HEALTHCHECK_CMD") >>"$LOG_FILE" 2>&1; then
            healthy=true
            break
        fi
        sleep 3
    done
    if [[ "$healthy" != true ]]; then
        rollback_and_exit "Health check failed for $SITE after deploy"
    fi
fi

log INFO "Deploy of $SITE succeeded ($RELEASE_TS)"

mapfile -t OLD_RELEASES < <(ls -1t "$RELEASES" | tail -n +"$((KEEP_RELEASES + 1))")
for old in "${OLD_RELEASES[@]:-}"; do
    [[ -n "$old" ]] && rm -rf "${RELEASES:?}/$old" && log INFO "Pruned old release $old"
done
