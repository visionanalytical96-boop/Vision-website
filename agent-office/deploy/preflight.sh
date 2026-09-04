#!/usr/bin/env bash
# Vision Analytical - VPS readiness check.
# Read-only: installs nothing, changes nothing. Run this FIRST.
#   ssh root@your-vps 'bash -s' < preflight.sh
set -uo pipefail

pass=0; warn=0; fail=0
ok()   { echo "  [ OK ]  $*"; pass=$((pass+1)); }
note() { echo "  [WARN]  $*"; warn=$((warn+1)); }
bad()  { echo "  [FAIL]  $*"; fail=$((fail+1)); }

echo
echo "Vision Analytical - VPS readiness check"
echo "======================================="

echo
echo "Machine"
os_name=$(. /etc/os-release 2>/dev/null && echo "${PRETTY_NAME:-unknown}")
echo "  os:     ${os_name}"
echo "  kernel: $(uname -r)"
echo "  arch:   $(uname -m)"

case "$(uname -m)" in
	x86_64|amd64) ok "64-bit x86 - Electron ships prebuilt binaries for this" ;;
	aarch64|arm64) note "ARM64 - Electron works but some prebuilt native modules need compiling" ;;
	*) bad "$(uname -m) is not a supported architecture" ;;
esac

ram_mb=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
if [ -n "${ram_mb:-}" ]; then
	echo "  ram:    ${ram_mb} MB"
	if   [ "$ram_mb" -ge 7500 ]; then ok "RAM is comfortable for the GUI plus several agents"
	elif [ "$ram_mb" -ge 3500 ]; then note "${ram_mb} MB works for 2-3 agents; the office floor will feel slow"
	else bad "${ram_mb} MB is not enough - Electron alone wants ~1.5 GB, each agent more"; fi
fi

disk_gb=$(df -BG --output=avail / 2>/dev/null | tail -1 | tr -dc '0-9')
if [ -n "${disk_gb:-}" ]; then
	echo "  disk:   ${disk_gb} GB free"
	if [ "$disk_gb" -ge 15 ]; then ok "disk is fine (build + node_modules ~4 GB)"
	else bad "${disk_gb} GB free - the build alone needs about 4 GB"; fi
fi

swap_mb=$(free -m 2>/dev/null | awk '/^Swap:/{print $2}')
[ "${swap_mb:-0}" -gt 0 ] && ok "swap present (${swap_mb} MB)" || note "no swap - add 2 GB, the Electron build is memory-hungry"

echo
echo "Toolchain"
if command -v node >/dev/null 2>&1; then
	nv=$(node -v); major=$(echo "$nv" | tr -dc '0-9.' | cut -d. -f1)
	if [ "$major" -ge 20 ]; then ok "node $nv"
	elif [ "$major" -ge 18 ]; then note "node $nv meets the minimum; 20 LTS is safer for the native rebuild"
	else bad "node $nv is too old - need 18+, install 20 LTS"; fi
else
	bad "node not installed - install.sh will add 20 LTS"
fi

command -v npm  >/dev/null 2>&1 && ok "npm $(npm -v)"        || bad "npm missing"
command -v git  >/dev/null 2>&1 && ok "git $(git --version | awk '{print $3}')" || bad "git missing"
command -v make >/dev/null 2>&1 && command -v g++ >/dev/null 2>&1 \
	&& ok "C/C++ toolchain present (node-pty compiles against it)" \
	|| bad "build-essential missing - node-pty will not compile"

echo
echo "Headless display stack"
command -v Xvfb   >/dev/null 2>&1 && ok "Xvfb installed"   || note "Xvfb missing - install.sh adds it (no display = no Electron)"
command -v x11vnc >/dev/null 2>&1 && ok "x11vnc installed" || note "x11vnc missing - install.sh adds it"
[ -d /usr/share/novnc ] && ok "noVNC installed" || note "noVNC missing - install.sh adds it (this is what you open in the browser)"

echo
echo "Agent CLI"
if command -v claude >/dev/null 2>&1; then
	ok "claude CLI found: $(command -v claude)"
	if claude --version >/dev/null 2>&1; then ok "claude runs ($(claude --version 2>/dev/null | head -1))"; else note "claude is installed but did not run cleanly"; fi
else
	note "claude CLI not installed - install.sh adds it; you log in afterwards"
fi
[ -n "${ANTHROPIC_API_KEY:-}" ] && note "ANTHROPIC_API_KEY is set in this shell - the headless harness can use it" \
	|| note "no ANTHROPIC_API_KEY - fine for the GUI (it uses your Claude Code login), needed for the headless harness"

echo
echo "Networking"
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -qi "Status: active"; then
	ok "ufw firewall is active - keep VNC ports closed, reach them over an SSH tunnel"
else
	note "no active firewall - do NOT open ports 5900/6080 to the internet"
fi

echo
echo "======================================="
echo "  pass: $pass   warnings: $warn   blockers: $fail"
echo
if [ "$fail" -gt 0 ]; then
	echo "  Blockers found. Fix those first, or run install.sh which handles most of them."
	exit 1
fi
echo "  No blockers. Next: sudo bash install.sh"
