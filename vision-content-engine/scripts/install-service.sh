#!/usr/bin/env bash
#
# Installs the Content Studio as a systemd service so it starts on boot and
# survives an SSH disconnect. Running it from a terminal means the server dies
# whenever that terminal closes, which is the usual reason the site "stops
# working" for no apparent reason.
#
#   sudo bash scripts/install-service.sh
#
set -euo pipefail

SERVICE_NAME="vision-content-engine"
ENGINE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $EUID -ne 0 ]]; then
	echo "This needs root. Run:  sudo bash scripts/install-service.sh" >&2
	exit 1
fi

# The service must run as the account that owns the files, not as root, so the
# workspace and database keep their existing ownership.
RUN_USER="$(stat -c '%U' "$ENGINE_DIR")"
USER_HOME="$(getent passwd "$RUN_USER" | cut -d: -f6)"
NODE_BIN="$(command -v node || true)"

# Created up front so systemd can grant write access to a path that exists.
install -d -o "$RUN_USER" -g "$RUN_USER" "${USER_HOME}/.cache/vision-content-engine"

if [[ -z "$NODE_BIN" ]]; then
	echo "node was not found on PATH. Install Node 22 first." >&2
	exit 1
fi

echo "Engine directory : $ENGINE_DIR"
echo "Run as user      : $RUN_USER"
echo "Bind address     : $(grep -E '^CONTENT_ENGINE_HOST=' "$ENGINE_DIR/.env" 2>/dev/null | cut -d= -f2 || echo '127.0.0.1 (default)')"
echo "Node binary      : $NODE_BIN"
echo

# Free the port if a hand-started copy is still holding it, otherwise the
# service starts, hits EADDRINUSE and restart-loops.
if ss -ltnp 2>/dev/null | grep -q ':4310'; then
	echo "Port 4310 is busy — stopping the process holding it."
	fuser -k 4310/tcp 2>/dev/null || true
	sleep 1
fi

cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<UNIT
[Unit]
Description=Vision AutoContent Engine — Content Studio
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${RUN_USER}
WorkingDirectory=${ENGINE_DIR}
# The application reads its own .env from WorkingDirectory, so no
# EnvironmentFile is needed and systemd never has to parse those values.
ExecStart=${NODE_BIN} ${ENGINE_DIR}/src/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# Basic hardening. ProtectHome makes /home read-only, so both paths the engine
# writes to have to be granted back explicitly: its own directory (database,
# generated images) and the cache where the headless browser puts its throwaway
# profile. Without the second, rendering fails with a permission error.
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=${ENGINE_DIR} ${USER_HOME}/.cache/vision-content-engine

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}" >/dev/null
systemctl restart "${SERVICE_NAME}"

sleep 2

echo "─────────────────────────────────────────────"
if systemctl is-active --quiet "${SERVICE_NAME}"; then
	echo "  RUNNING — the studio is up and will restart"
	echo "  automatically on boot or after a crash."
else
	echo "  FAILED TO START. Recent log:"
	journalctl -u "${SERVICE_NAME}" -n 20 --no-pager
	exit 1
fi
echo "─────────────────────────────────────────────"
echo
echo "  Check it:    curl -I http://127.0.0.1:4310"
echo "  See logs:    sudo journalctl -u ${SERVICE_NAME} -f"
echo "  Stop it:     sudo systemctl stop ${SERVICE_NAME}"
echo "  Start it:    sudo systemctl start ${SERVICE_NAME}"
echo
