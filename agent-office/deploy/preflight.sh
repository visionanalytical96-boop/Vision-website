#!/usr/bin/env bash
# Preflight check for running the agent office on a Linux VPS.
# Read-only: installs nothing, changes nothing. Run this FIRST.
#   bash preflight.sh
set -uo pipefail

PASS=0; FAIL=0; WARN=0
ok()   { printf '  \033[32mOK\033[0m    %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; FAIL=$((FAIL+1)); }
warn() { printf '  \033[33mWARN\033[0m  %s\n' "$1"; WARN=$((WARN+1)); }
head2(){ printf '\n\033[1;36m%s\033[0m\n' "$1"; }

head2 "System"
. /etc/os-release 2>/dev/null || true
ID_LIKE_ALL="${ID:-unknown} ${ID_LIKE:-}"
case "$ID_LIKE_ALL" in
	*debian*|*ubuntu*) ok "OS: ${PRETTY_NAME:-$ID} (apt-based - supported)" ;;
	*) warn "OS: ${PRETTY_NAME:-unknown} - install script targets Debian/Ubuntu; you will need to map packages yourself" ;;
esac
[ "$(uname -m)" = "x86_64" ] || [ "$(uname -m)" = "aarch64" ] \
	&& ok "Arch: $(uname -m)" || warn "Arch: $(uname -m) - Electron may not ship a build for this"

RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
[ "$RAM_MB" -ge 3800 ] && ok "RAM: ${RAM_MB} MB" || bad "RAM: ${RAM_MB} MB - need 4 GB+ (Electron + native compile will OOM below this)"

DISK_GB=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
[ "${DISK_GB:-0}" -ge 12 ] && ok "Disk free: ${DISK_GB} GB" || bad "Disk free: ${DISK_GB} GB - need 12 GB+ (node_modules + Electron ~4 GB)"

CORES=$(nproc)
[ "$CORES" -ge 2 ] && ok "CPU cores: $CORES" || warn "CPU cores: $CORES - build will be slow but should finish"

SWAP_MB=$(free -m | awk '/^Swap:/{print $2}')
[ "${SWAP_MB:-0}" -ge 1024 ] && ok "Swap: ${SWAP_MB} MB" || warn "Swap: ${SWAP_MB:-0} MB - add 2 GB swap if RAM is 4 GB, npm install is memory hungry"

head2 "Toolchain"
if command -v node >/dev/null; then
	NODE_MAJOR=$(node -v | tr -dc '0-9.' | cut -d. -f1)
	[ "$NODE_MAJOR" -ge 20 ] && ok "Node: $(node -v)" || bad "Node: $(node -v) - need 20+ (installer can upgrade it)"
else
	warn "Node: not installed - the installer will add Node 22"
fi
command -v npm >/dev/null && ok "npm: $(npm -v)" || warn "npm: missing (comes with Node)"
command -v git >/dev/null && ok "git: $(git --version | awk '{print $3}')" || bad "git: missing"

MISSING_BUILD=()
for t in gcc g++ make python3; do command -v "$t" >/dev/null || MISSING_BUILD+=("$t"); done
[ ${#MISSING_BUILD[@]} -eq 0 ] \
	&& ok "Build toolchain present (better-sqlite3 and node-pty compile from source)" \
	|| warn "Build toolchain missing: ${MISSING_BUILD[*]} - installer adds build-essential + python3"

head2 "Display stack (Electron needs a display, even a virtual one)"
for t in Xvfb x11vnc websockify; do
	command -v "$t" >/dev/null && ok "$t: present" || warn "$t: missing - installer will add it"
done
[ -d /usr/share/novnc ] && ok "noVNC: present" || warn "noVNC: missing - installer will add it"

head2 "Agent CLI"
if command -v claude >/dev/null; then
	ok "Claude Code: $(claude --version 2>/dev/null | head -1)"
	if [ -n "${CLAUDE_CODE_OAUTH_TOKEN:-}" ]; then
		ok "CLAUDE_CODE_OAUTH_TOKEN is set"
	else
		warn "No CLAUDE_CODE_OAUTH_TOKEN - run 'claude setup-token' on a machine with a browser, then export it here"
	fi
else
	warn "Claude Code CLI missing - installer adds it"
fi

head2 "Network"
for host in registry.npmjs.org github.com api.anthropic.com; do
	curl -sS -m 8 -o /dev/null "https://$host" 2>/dev/null && ok "reachable: $host" || bad "unreachable: $host"
done

for p in 5900 6080; do
	if ss -ltn 2>/dev/null | grep -q ":$p "; then warn "port $p already in use - installer will need a different one"
	else ok "port $p free"; fi
done

printf '\n\033[1m%d passed, %d warnings, %d blockers\033[0m\n' "$PASS" "$WARN" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
	printf '\033[31mFix the blockers above before running install-office.sh\033[0m\n\n'
	exit 1
fi
printf '\033[32mServer looks ready. Next: sudo bash install-office.sh\033[0m\n\n'
