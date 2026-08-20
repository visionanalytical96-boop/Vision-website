#!/usr/bin/env bash
#
# Publishes the Content Studio through nginx, without touching any site that is
# already configured.
#
#   sudo bash scripts/install-nginx.sh                      # Tailscale / LAN only
#   sudo bash scripts/install-nginx.sh studio.example.in    # plus a public name
#
# Existing server blocks are left exactly as they are; this adds one more.
set -euo pipefail

SITE="vision-content-studio"
PORT="${CONTENT_ENGINE_PORT:-4310}"
EXTRA_NAME="${1:-}"

if [[ $EUID -ne 0 ]]; then
	echo "This needs root. Run:  sudo bash scripts/install-nginx.sh" >&2
	exit 1
fi

if ! command -v nginx >/dev/null; then
	echo "nginx is not installed." >&2
	exit 1
fi

# Answer on whatever names this machine actually has, so the studio is reachable
# over Tailscale and the LAN without needing DNS.
NAMES=("localhost")
if command -v tailscale >/dev/null; then
	TS_NAME="$(tailscale status --json 2>/dev/null | grep -o '"DNSName":"[^"]*"' | head -1 | cut -d'"' -f4 | sed 's/\.$//')" || true
	TS_IP="$(tailscale ip -4 2>/dev/null | head -1)" || true
	[[ -n "${TS_NAME:-}" ]] && NAMES+=("$TS_NAME")
	[[ -n "${TS_IP:-}" ]] && NAMES+=("$TS_IP")
fi
LAN_IP="$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -v '^100\.' | head -1)" || true
[[ -n "${LAN_IP:-}" ]] && NAMES+=("$LAN_IP")
[[ -n "$EXTRA_NAME" ]] && NAMES+=("$EXTRA_NAME")

SERVER_NAMES="${NAMES[*]}"

echo "Serving the studio on : $SERVER_NAMES"
echo "Proxying to           : 127.0.0.1:$PORT"
echo

cat > "/etc/nginx/sites-available/${SITE}" <<CONF
# Vision AutoContent Engine — Content Studio.
# Added by scripts/install-nginx.sh. Other sites on this server are untouched.
server {
	listen 80;
	listen [::]:80;
	server_name ${SERVER_NAMES};

	# Product photography and brand assets are uploaded through this proxy;
	# nginx's 1 MB default would reject them long before the app's own limit.
	client_max_body_size 20m;

	# Generating a poster or a PDF takes several seconds, and the browser used
	# to render them is started on first use, which is slower still.
	proxy_read_timeout 180s;
	proxy_send_timeout 180s;

	location / {
		proxy_pass http://127.0.0.1:${PORT};
		proxy_http_version 1.1;
		proxy_set_header Host \$host;
		proxy_set_header X-Real-IP \$remote_addr;
		proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
		proxy_set_header X-Forwarded-Proto \$scheme;
		proxy_set_header Upgrade \$http_upgrade;
		proxy_set_header Connection "upgrade";
	}
}
CONF

ln -sf "/etc/nginx/sites-available/${SITE}" "/etc/nginx/sites-enabled/${SITE}"

if ! nginx -t 2>/tmp/nginx-test.log; then
	echo "nginx rejected the configuration:" >&2
	cat /tmp/nginx-test.log >&2
	rm -f "/etc/nginx/sites-enabled/${SITE}"
	exit 1
fi

systemctl reload nginx

echo "─────────────────────────────────────────────"
if curl -fsS -o /dev/null --max-time 5 "http://127.0.0.1:${PORT}/healthz"; then
	echo "  READY — the studio is answering behind nginx."
else
	echo "  nginx is configured, but nothing is listening on ${PORT}."
	echo "  Start the engine:  sudo systemctl restart vision-content-engine"
fi
echo "─────────────────────────────────────────────"
echo
for name in "${NAMES[@]}"; do
	[[ "$name" == "localhost" ]] && continue
	echo "  http://${name}"
done
echo
if [[ -n "$EXTRA_NAME" ]]; then
	echo "  For HTTPS on ${EXTRA_NAME} (needed for Instagram and Google sign-in):"
	echo "    sudo apt install -y certbot python3-certbot-nginx"
	echo "    sudo certbot --nginx -d ${EXTRA_NAME}"
	echo
fi
