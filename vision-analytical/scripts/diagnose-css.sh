#!/usr/bin/env bash
# Find out why a deployed page renders unstyled.
#
# Written because the obvious check gives a false negative: `grep
# _next/static/css` finds nothing on a perfectly healthy site. That path is
# webpack's layout. This app builds with Turbopack (the Next 16 default),
# which emits CSS to /_next/static/chunks/*.css instead.
#
#   ./scripts/diagnose-css.sh                    # defaults to localhost:8088
#   ./scripts/diagnose-css.sh https://example.com

set -uo pipefail

BASE="${1:-http://localhost:8088}"
PAGE="${2:-/}"
fails=0

say()  { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32mOK\033[0m    %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; fails=$((fails + 1)); }
info() { printf '        %s\n' "$1"; }

html=$(curl -fsS "$BASE$PAGE" 2>/dev/null)
if [ -z "$html" ]; then
  bad "$BASE$PAGE returned nothing. The app is not answering; CSS is not the problem yet."
  exit 1
fi
ok "page fetched (${#html} bytes)"

say "1. Does the HTML reference a stylesheet?"
css_href=$(printf '%s' "$html" | grep -oE '/_next/static/[^"]*\.css' | head -1)

if [ -n "$css_href" ]; then
  ok "stylesheet referenced: $css_href"
else
  bad "no stylesheet link in the HTML"
  info "The build produced no CSS. Rebuild the image and watch for errors:"
  info "  docker compose -f deploy/docker-compose.yml --env-file deploy/.env build --no-cache app"
  info "Check that postcss.config.mjs reached the image (it must NOT be in .dockerignore)."
  exit 1
fi

say "2. Does that stylesheet actually serve?"
read -r status bytes ctype <<<"$(curl -s -o /tmp/diag.css -w '%{http_code} %{size_download} %{content_type}' "$BASE$css_href")"

if [ "$status" = "200" ]; then
  ok "$status · $bytes bytes · $ctype"
else
  bad "$status when fetching $css_href"
  info "The HTML asks for a file the server will not give it."
  info "Usually a stale container: the HTML came from a new build, the static"
  info "files from an old one. Rebuild and recreate:"
  info "  docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build"
  exit 1
fi

say "3. Is it really Tailwind, or an empty file?"
# No ^ anchor: the production stylesheet is minified onto very few lines.
utilities=$(grep -oE '\.(flex|grid|block|hidden|absolute|relative)\{' /tmp/diag.css 2>/dev/null | sort -u | wc -l)
if [ "${bytes:-0}" -gt 10000 ] && [ "${utilities:-0}" -gt 0 ]; then
  ok "$utilities core utility rules present"
else
  bad "the stylesheet is present but looks empty ($bytes bytes, $utilities utilities)"
  info "Tailwind ran but produced nothing. Check that src/app/globals.css still"
  info "starts with: @import \"tailwindcss\";"
  exit 1
fi

say "4. Could a header be blocking it?"
headers=$(curl -sI "$BASE$PAGE")
csp=$(printf '%s' "$headers" | grep -i '^content-security-policy:' || true)

# The one that actually broke this site. upgrade-insecure-requests makes the
# browser re-fetch every stylesheet, script and font over https. On a page
# served over http those requests go to a port with no TLS listener and every
# asset fails — while curl still reports 200 for the same files, because curl
# ignores CSP entirely. That is why "the CSS returns 200" and "the page is
# unstyled" can both be true at once.
if printf '%s' "$headers" | grep -qi 'upgrade-insecure-requests' && [ "${BASE#https://}" = "$BASE" ]; then
  bad "upgrade-insecure-requests is set on a page served over plain http"
  info "Every asset is being re-requested over https, against a port that"
  info "serves none. This renders the page completely unstyled."
  info ""
  info "It must be applied per request from the forwarded scheme, never baked"
  info "into the build. Confirm deploy/nginx/ is current on this server and"
  info "that the container actually picked it up:"
  info "  docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --force-recreate nginx"
  exit 1
fi

if [ -z "$csp" ]; then
  ok "no CSP header (nothing to block it)"
elif printf '%s' "$csp" | grep -q "style-src[^;]*'self'"; then
  ok "CSP allows stylesheets from this origin"
  ok "no upgrade-insecure-requests on a plain-http page"
else
  bad "CSP may be blocking the stylesheet"
  info "$csp"
fi

# Two copies with different values resolve restrictively, which silently
# disables whatever the stricter one forbids.
for header in Permissions-Policy Cache-Control X-Content-Type-Options; do
  count=$(printf '%s' "$headers" | grep -ci "^$header:" || true)
  [ "$count" -gt 1 ] && bad "$header sent $count times — nginx is appending to the app's copy instead of replacing it"
done

say "5. What is actually running?"
if command -v docker >/dev/null 2>&1; then
  docker compose -f deploy/docker-compose.yml ps --format '        {{.Service}}  {{.Image}}  {{.Status}}' 2>/dev/null \
    || info "(compose not reachable from here)"
  built=$(docker inspect --format '{{.Created}}' "$(docker compose -f deploy/docker-compose.yml images -q app 2>/dev/null | head -1)" 2>/dev/null || true)
  [ -n "$built" ] && info "app image built: $built"
fi

printf '\n'
if [ "$fails" -eq 0 ]; then
  printf '\033[32mCSS is being built, served and applied correctly.\033[0m\n'
  printf 'If the page still looks unstyled in a browser, it is the browser:\n'
  printf '  hard-reload (Ctrl+Shift+R), or open in a private window.\n'
  exit 0
fi

printf '\033[31m%s check(s) failed — see above.\033[0m\n' "$fails"
exit "$fails"
