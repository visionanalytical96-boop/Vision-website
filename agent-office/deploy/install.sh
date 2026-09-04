#!/usr/bin/env bash
# Vision Analytical - install the agent office on a Linux VPS.
#
#   sudo bash install.sh
#
# What it does: installs Node 20, the Electron/X11 libraries, Xvfb + x11vnc +
# noVNC, builds Munder Difflin from source, installs the Claude Code CLI, and
# registers systemd services so the office survives a reboot.
#
# Security posture: VNC and noVNC bind to 127.0.0.1 ONLY. You reach the office
# floor through an SSH tunnel from your laptop or phone. Nothing is exposed to
# the internet, because whoever reaches that screen gets a terminal with your
# Claude Code login inside it.
set -euo pipefail

OFFICE_USER="${OFFICE_USER:-office}"
APP_DIR="${APP_DIR:-/opt/munder-difflin}"
HARNESS_DIR="${HARNESS_DIR:-/opt/agent-office}"
DISPLAY_NUM="${DISPLAY_NUM:-:99}"
SCREEN_GEOMETRY="${SCREEN_GEOMETRY:-1600x900x24}"
VNC_PORT="${VNC_PORT:-5900}"
NOVNC_PORT="${NOVNC_PORT:-6080}"
REPO_URL="https://github.com/chaitanyagiri/munder-difflin.git"

step() { echo; echo "==> $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run with sudo"
command -v apt-get >/dev/null 2>&1 || die "this installer targets Debian/Ubuntu. On another distro, install the same packages by hand."

step "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
# Build toolchain, git, and everything Electron needs to open a window on a headless box.
apt-get install -y -qq \
	curl ca-certificates git build-essential python3 \
	xvfb x11vnc novnc websockify \
	libgtk-3-0 libnss3 libatk-bridge2.0-0 libatk1.0-0 libcups2 libdrm2 \
	libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
	libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libxshmfence1 \
	>/dev/null 2>&1 || apt-get install -y -qq libasound2 >/dev/null 2>&1 || true

step "Checking Node.js"
need_node=1
if command -v node >/dev/null 2>&1; then
	major=$(node -v | tr -dc '0-9.' | cut -d. -f1)
	[ "$major" -ge 18 ] && { echo "    node $(node -v) is fine"; need_node=0; }
fi
if [ "$need_node" -eq 1 ]; then
	echo "    installing Node 20 LTS"
	curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
	apt-get install -y -qq nodejs >/dev/null 2>&1
fi
node -v

step "Creating the ${OFFICE_USER} user"
# Agents get a shell. They must not have one as root.
if id "$OFFICE_USER" >/dev/null 2>&1; then
	echo "    ${OFFICE_USER} already exists"
else
	useradd -m -s /bin/bash "$OFFICE_USER"
	echo "    created"
fi

step "Fetching Munder Difflin into ${APP_DIR}"
if [ -d "$APP_DIR/.git" ]; then
	sudo -u "$OFFICE_USER" git -C "$APP_DIR" pull --ff-only || echo "    (pull skipped - local changes)"
else
	mkdir -p "$APP_DIR"
	chown "$OFFICE_USER:$OFFICE_USER" "$APP_DIR"
	sudo -u "$OFFICE_USER" git clone --depth 1 "$REPO_URL" "$APP_DIR"
fi

step "Building the app (this takes a while - Electron plus a native rebuild)"
# postinstall runs electron-rebuild for node-pty; it needs the toolchain above.
sudo -u "$OFFICE_USER" bash -lc "cd '$APP_DIR' && npm install --no-audit --no-fund"
sudo -u "$OFFICE_USER" bash -lc "cd '$APP_DIR' && npm run build"
[ -f "$APP_DIR/out/main/index.js" ] || die "build did not produce out/main/index.js"

step "Installing the Claude Code CLI"
if command -v claude >/dev/null 2>&1; then
	echo "    already installed: $(claude --version 2>/dev/null | head -1)"
else
	npm install -g @anthropic-ai/claude-code >/dev/null 2>&1 || die "could not install the Claude Code CLI"
	echo "    installed"
fi

step "Installing the headless harness into ${HARNESS_DIR}"
# The harness is the directory this script lives in, one level up from deploy/.
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -f "$SRC_DIR/bin/office.mjs" ]; then
	mkdir -p "$HARNESS_DIR"
	tar -C "$SRC_DIR" --exclude=out --exclude=node_modules --exclude=.git -cf - . \
		| tar -C "$HARNESS_DIR" -xf -
	chown -R "$OFFICE_USER:$OFFICE_USER" "$HARNESS_DIR"
	echo "    copied from $SRC_DIR"
	sudo -u "$OFFICE_USER" bash -lc "cd '$HARNESS_DIR' && node bin/office.mjs doctor" || echo "    (doctor reported problems - check above)"
else
	echo "    skipped - run this script from inside agent-office/deploy/"
fi

step "Registering systemd services"
units_dir="$(dirname "$0")/systemd"
for unit in office-xvfb office-vnc office-novnc munder-difflin; do
	[ -f "$units_dir/$unit.service" ] || die "missing unit file: $units_dir/$unit.service"
	sed -e "s|@USER@|$OFFICE_USER|g" \
		-e "s|@APP_DIR@|$APP_DIR|g" \
		-e "s|@DISPLAY@|$DISPLAY_NUM|g" \
		-e "s|@GEOMETRY@|$SCREEN_GEOMETRY|g" \
		-e "s|@VNC_PORT@|$VNC_PORT|g" \
		-e "s|@NOVNC_PORT@|$NOVNC_PORT|g" \
		"$units_dir/$unit.service" > "/etc/systemd/system/$unit.service"
done
systemctl daemon-reload
systemctl enable --now office-xvfb.service
sleep 2
systemctl enable --now office-vnc.service office-novnc.service
systemctl enable --now munder-difflin.service
sleep 3

step "Status"
for unit in office-xvfb office-vnc office-novnc munder-difflin; do
	state=$(systemctl is-active "$unit.service" 2>/dev/null || true)
	printf '    %-22s %s\n' "$unit" "$state"
done

cat <<NEXT

=====================================================================
 Done. Two things left, both from your laptop.

 1. Log the Claude Code CLI in (once):

      ssh -t ${OFFICE_USER}@<your-vps> 'claude'

    Follow the login prompt. Agents cannot run until this is done.

 2. Open the office floor. VNC is bound to localhost on purpose, so
    tunnel to it - never open port ${NOVNC_PORT} to the internet:

      ssh -L ${NOVNC_PORT}:localhost:${NOVNC_PORT} ${OFFICE_USER}@<your-vps>

    Then in your browser:  http://localhost:${NOVNC_PORT}/vnc.html

 3. Import your ten Vision Analytical clones from the office floor:
    "Add agent" -> "import hire..." -> pick a file from
    ${HARNESS_DIR}/hires/

 Logs:      journalctl -u munder-difflin -f
 Restart:   systemctl restart munder-difflin
=====================================================================
NEXT
