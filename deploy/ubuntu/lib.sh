#!/usr/bin/env bash
# Shared logging helper, sourced by deploy.sh and watch-syncthing.sh.

log() {
    local level="$1"; shift
    printf '%s [%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$level" "$*" | tee -a "${LOG_FILE:-/dev/stderr}"
}
