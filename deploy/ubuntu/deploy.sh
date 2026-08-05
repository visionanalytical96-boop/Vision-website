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
        ROLLBACK_CMD="$VISION_ANALYTICAL_RELOAD_CMD"
        BUILD_TRIGGER_FILES=""
        BUILD_CMD=""
        FAST_RELOAD_CMD=""
        CONFIG_CHECK_CMD=""
        HEALTHCHECK_CMD="${VISION_ANALYTICAL_HEALTHCHECK_CMD:-}"
        ;;
    bharatstay)
        STAGING="$BHARATSTAY_STAGING"
        RELEASES="$BHARATSTAY_RELEASES"
        CURRENT="$BHARATSTAY_CURRENT"
        REQUIRED_FILES="$BHARATSTAY_REQUIRED_FILES"
        OWNER="$BHARATSTAY_OWNER"
        RELOAD_CMD=""
        ROLLBACK_CMD="$BHARATSTAY_BUILD_CMD"
        BUILD_TRIGGER_FILES="$BHARATSTAY_BUILD_TRIGGER_FILES"
        BUILD_CMD="$BHARATSTAY_BUILD_CMD"
        FAST_RELOAD_CMD="$BHARATSTAY_FAST_RELOAD_CMD"
        CONFIG_CHECK_CMD="${BHARATSTAY_CONFIG_CHECK_CMD:-docker compose config -q}"
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

if [[ -n "$CONFIG_CHECK_CMD" ]]; then
    if ! (cd "$STAGING" && eval "$CONFIG_CHECK_CMD") >>"$LOG_FILE" 2>&1; then
        log ERROR "Config validation failed for $SITE — aborting (live release untouched)"
        exit 1
    fi
    log INFO "Config validation passed for $SITE"
fi

PREVIOUS_RELEASE=""
[[ -L "$CURRENT" ]] && PREVIOUS_RELEASE="$(readlink -f "$CURRENT")"

rollback_and_exit() {
    log ERROR "$1"
    if [[ -n "$PREVIOUS_RELEASE" ]]; then
        ln -sfn "$PREVIOUS_RELEASE" "$CURRENT.tmp" && mv -Tf "$CURRENT.tmp" "$CURRENT"
        if (cd "$CURRENT" && eval "$ROLLBACK_CMD") >>"$LOG_FILE" 2>&1; then
            log WARN "Rolled back $SITE to previous release $(basename "$PREVIOUS_RELEASE")"
        else
            log ERROR "Rollback reload failed for $SITE — manual intervention required"
        fi
    else
        log ERROR "No previous release for $SITE to roll back to — manual intervention required"
    fi
    exit 1
}

# Compares a build-trigger file between releases via inode identity: rsync
# --link-dest hardlinks files it considers unchanged, so a differing
# device:inode means rsync actually copied a new version of that file.
build_trigger_changed() {
    local prev="$1" new="$2" files="$3" rel old_f new_f
    [[ -z "$prev" ]] && return 0

    for rel in $files; do
        old_f="$prev/$rel"
        new_f="$new/$rel"
        if [[ -e "$old_f" && -e "$new_f" ]]; then
            [[ "$(stat -c '%d:%i' "$old_f")" != "$(stat -c '%d:%i' "$new_f")" ]] && return 0
        elif [[ -e "$old_f" || -e "$new_f" ]]; then
            return 0
        fi
    done
    return 1
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

if [[ -n "$BUILD_TRIGGER_FILES" ]]; then
    if build_trigger_changed "$PREVIOUS_RELEASE" "$NEW_RELEASE" "$BUILD_TRIGGER_FILES"; then
        ACTIVE_RELOAD_CMD="$BUILD_CMD"
        log INFO "Build-related files changed for $SITE — rebuilding"
    else
        ACTIVE_RELOAD_CMD="$FAST_RELOAD_CMD"
        log INFO "No build-related changes for $SITE — fast reload, no rebuild"
    fi
else
    ACTIVE_RELOAD_CMD="$RELOAD_CMD"
fi

ln -sfn "$NEW_RELEASE" "$CURRENT.tmp"
mv -Tf "$CURRENT.tmp" "$CURRENT"
log INFO "Switched $CURRENT -> $RELEASE_TS"

if ! (cd "$CURRENT" && eval "$ACTIVE_RELOAD_CMD") >>"$LOG_FILE" 2>&1; then
    rollback_and_exit "Reload command failed for $SITE"
fi

if [[ -n "$HEALTHCHECK_CMD" ]]; then
    consecutive=0
    elapsed=0
    healthy=false
    while (( elapsed < 30 )); do
        if (cd "$CURRENT" && eval "$HEALTHCHECK_CMD") >>"$LOG_FILE" 2>&1; then
            consecutive=$((consecutive + 1))
            log INFO "Health check $consecutive/3 passed for $SITE"
            if (( consecutive >= 3 )); then
                healthy=true
                break
            fi
        else
            [[ "$consecutive" -gt 0 ]] && log WARN "Health check failed for $SITE, resetting streak"
            consecutive=0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    if [[ "$healthy" != true ]]; then
        rollback_and_exit "Health check for $SITE did not reach 3 consecutive passes within 30s"
    fi
fi

log INFO "Deploy of $SITE succeeded ($RELEASE_TS)"

mapfile -t OLD_RELEASES < <(ls -1t "$RELEASES" | tail -n +"$((KEEP_RELEASES + 1))")
for old in "${OLD_RELEASES[@]:-}"; do
    [[ -n "$old" ]] && rm -rf "${RELEASES:?}/$old" && log INFO "Pruned old release $old"
done
