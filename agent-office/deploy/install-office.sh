#!/usr/bin/env bash
# Install the agent office on a headless Debian/Ubuntu VPS:
#   Munder Difflin (Electron) on a virtual display, viewable in a browser over noVNC.
#
#   sudo bash install-office.sh                 # install, bound to localhost (safe default)
#   sudo bash install-office.sh --public        # also expose noVNC on all interfaces (needs a password)
#
# Upstream ships this app as a local-first DESKTOP application. Running it headless is
# an unsupported configuration; this script is our own wrapper, not vendor-blessed.
set -euo pipefail

OFFICE_USER="${OFFICE_USER:-office}"
OFFICE_HOME="${OFFICE_HOME:-/opt/office}"
APP_DIR="$OFFICE_HOME/munder-difflin"
REPO="${REPO:-https://github.com/chaitanyagiri/munder-difflin.git}"
DISPLAY_NUM="${DISPLAY_NUM:-99}"
SCREEN="${SCREEN:-1600x900x24}"
VNC_PORT="${VNC_PORT:-5900}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
PUBLIC=0
[ "${1:-}" = "--public" ] && PUBLIC=1

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32mOK\033[0m  %s\n' "$1"; }
die()  { printf '\n\033[31mFAILED: %s\033[0m\n\n' "$1" >&2; exit 1; }
[ "$(id -u)" -eq 0 ] || die "run as root (sudo bash install-office.sh)"

log "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
# Base toolchain, virtual display, VNC bridge.
apt-get install -y -qq --no-install-recommends \
	build-essential python3 git curl ca-certificates \
	xvfb x11vnc websockify novnc openssl \
	fonts-dejavu-core fonts-liberation || die "apt install failed"
# Electron's shared-library needs. Package names differ across releases (libasound2 vs
# libasound2t64), so install what exists and keep going.
for pkg in libgtk-3-0 libgtk-3-0t64 libnotify4 libnss3 libxss1 libxtst6 xdg-utils \
	libatspi2.0-0 libatspi2.0-0t64 libdrm2 libgbm1 libxcb-dri3-0 \
	libasound2 libasound2t64 libsecret-1-0 libcups2 libcups2t64; do
	apt-get install -y -qq --no-install-recommends "$pkg" >/dev/null 2>&1 || true
done
ok "packages installed"

log "Checking Node"
NODE_OK=0
if command -v node >/dev/null; then
	[ "$(node -v | tr -dc '0-9.' | cut -d. -f1)" -ge 20 ] && NODE_OK=1
fi
if [ "$NODE_OK" -eq 0 ]; then
	curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null 2>&1
	apt-get install -y -qq nodejs || die "Node install failed"
fi
ok "node $(node -v), npm $(npm -v)"

log "Creating service user and directories"
id -u "$OFFICE_USER" >/dev/null 2>&1 || useradd -r -m -d "$OFFICE_HOME" -s /bin/bash "$OFFICE_USER"
mkdir -p "$OFFICE_HOME"
chown -R "$OFFICE_USER:$OFFICE_USER" "$OFFICE_HOME"
ok "user '$OFFICE_USER', home $OFFICE_HOME"

log "Fetching Munder Difflin"
if [ -d "$APP_DIR/.git" ]; then
	sudo -u "$OFFICE_USER" git -C "$APP_DIR" pull --ff-only || die "git pull failed"
else
	sudo -u "$OFFICE_USER" git clone --depth 1 "$REPO" "$APP_DIR" || die "git clone failed"
fi
ok "source at $APP_DIR ($(sudo -u "$OFFICE_USER" git -C "$APP_DIR" rev-parse --short HEAD))"

log "Installing dependencies (compiles better-sqlite3 and node-pty - takes 5-15 min)"
sudo -u "$OFFICE_USER" bash -lc "cd '$APP_DIR' && npm install --no-audit --no-fund" \
	|| die "npm install failed - check RAM (needs 4 GB+) and re-run"
ok "dependencies built"

log "Building the app"
sudo -u "$OFFICE_USER" bash -lc "cd '$APP_DIR' && npm run build" || die "build failed"
[ -f "$APP_DIR/out/main/index.js" ] || die "build produced no entry point"
ok "built"

log "Installing Claude Code CLI"
if ! command -v claude >/dev/null; then
	npm install -g @anthropic-ai/claude-code >/dev/null 2>&1 || die "Claude Code install failed"
fi
ok "claude $(claude --version 2>/dev/null | head -1)"

# The app reads the agent token from the service environment. Generate the token on a
# machine WITH a browser (`claude setup-token`) and drop it in this file.
TOKEN_FILE="$OFFICE_HOME/.office-env"
if [ ! -f "$TOKEN_FILE" ]; then
	cat > "$TOKEN_FILE" <<'ENVEOF'
# Paste the token from `claude setup-token` (run that on your laptop, it needs a browser):
CLAUDE_CODE_OAUTH_TOKEN=
ENVEOF
	chown "$OFFICE_USER:$OFFICE_USER" "$TOKEN_FILE"; chmod 600 "$TOKEN_FILE"
fi

log "Setting the VNC password"
VNC_PASS_FILE="$OFFICE_HOME/.vncpass"
if [ ! -f "$VNC_PASS_FILE" ]; then
	GENERATED=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-12)
	sudo -u "$OFFICE_USER" x11vnc -storepasswd "$GENERATED" "$VNC_PASS_FILE" >/dev/null 2>&1
	echo "$GENERATED" > "$OFFICE_HOME/.vncpass.txt"
	chown "$OFFICE_USER:$OFFICE_USER" "$OFFICE_HOME/.vncpass.txt"; chmod 600 "$OFFICE_HOME/.vncpass.txt"
	ok "password generated (shown at the end)"
else
	ok "existing password kept"
fi

log "Writing systemd services"
cat > /etc/systemd/system/office-xvfb.service <<EOF
[Unit]
Description=Virtual display for the agent office
[Service]
User=$OFFICE_USER
ExecStart=/usr/bin/Xvfb :$DISPLAY_NUM -screen 0 $SCREEN -nolisten tcp
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/office-app.service <<EOF
[Unit]
Description=Munder Difflin agent office
After=office-xvfb.service
Requires=office-xvfb.service
[Service]
User=$OFFICE_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$TOKEN_FILE
Environment=DISPLAY=:$DISPLAY_NUM
Environment=ELECTRON_DISABLE_SECURITY_WARNINGS=1
# Headless container-style flags: no GPU, no sandbox (no user namespaces here),
# and /dev/shm is small on most VPSes.
ExecStart=/usr/bin/npx electron . --no-sandbox --disable-gpu --disable-dev-shm-usage
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/office-vnc.service <<EOF
[Unit]
Description=VNC bridge for the agent office
After=office-app.service
Requires=office-xvfb.service
[Service]
User=$OFFICE_USER
ExecStart=/usr/bin/x11vnc -display :$DISPLAY_NUM -rfbauth $VNC_PASS_FILE -rfbport $VNC_PORT -localhost -forever -shared -noxdamage
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF

if [ "$PUBLIC" -eq 1 ]; then BIND=""; else BIND="--listen 127.0.0.1"; fi
cat > /etc/systemd/system/office-novnc.service <<EOF
[Unit]
Description=Browser access to the agent office
After=office-vnc.service
Requires=office-vnc.service
[Service]
User=$OFFICE_USER
ExecStart=/usr/bin/websockify $BIND $NOVNC_PORT localhost:$VNC_PORT --web=/usr/share/novnc
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now office-xvfb office-app office-vnc office-novnc >/dev/null 2>&1
sleep 6

log "Status"
FAILED=0
for s in office-xvfb office-app office-vnc office-novnc; do
	if systemctl is-active --quiet "$s"; then ok "$s running"
	else printf '  \033[31mDOWN\033[0m  %s  (journalctl -u %s -n 40)\n' "$s" "$s"; FAILED=1; fi
done

IP=$(hostname -I 2>/dev/null | awk '{print $1}')
PASS_SHOWN=$(cat "$OFFICE_HOME/.vncpass.txt" 2>/dev/null || echo '(kept from before)')
cat <<EOF

$(printf '\033[1;36m%s\033[0m' "Office installed")

  App:        $APP_DIR
  VNC pass:   $PASS_SHOWN
  Logs:       journalctl -u office-app -f

  View it:
EOF
if [ "$PUBLIC" -eq 1 ]; then
	cat <<EOF
    http://$IP:$NOVNC_PORT/vnc.html      <-- open on your phone

  This port is open to the internet, protected only by the VNC password.
  Put it behind a firewall rule limited to your own IP, or a reverse proxy with TLS.
EOF
else
	cat <<EOF
    From your laptop, tunnel it:
      ssh -L $NOVNC_PORT:localhost:$NOVNC_PORT root@$IP
    then open http://localhost:$NOVNC_PORT/vnc.html

  Bound to localhost on purpose. Re-run with --public only behind a firewall.
EOF
fi
cat <<EOF

  NEXT: put your agent token in $TOKEN_FILE
    1. On your laptop:  claude setup-token
    2. Paste it into that file as CLAUDE_CODE_OAUTH_TOKEN=...
    3. systemctl restart office-app

EOF
[ "$FAILED" -eq 0 ] || die "some services are down - see the journalctl lines above"
