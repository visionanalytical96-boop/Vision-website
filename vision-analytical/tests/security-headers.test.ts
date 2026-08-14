import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * The app and the reverse proxy both set Permissions-Policy, and nginx's is the
 * one the browser actually sees. They drifted once already: `geolocation=()`
 * silently disabled engineer check-in with no error anywhere except the browser
 * console, on a page nobody runs a browser console against.
 */
function permissionsPolicy(path: string): string {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');

  // One file is an nginx directive, the other a JS object, and the nginx one
  // also names the header on a proxy_hide_header line. Matching on the value's
  // own shape rather than on the header name sidesteps all of that.
  const match = source.match(/["']((?:[\w-]+=\([^)]*\)(?:,\s*)?)+)["']/);
  assert.ok(match, `no Permissions-Policy value found in ${path}`);
  return match[1];
}

const APP = '../next.config.ts';
const PROXY = '../deploy/nginx/security-headers.conf';

test('the app and the proxy send the same permissions policy', () => {
  assert.equal(permissionsPolicy(APP), permissionsPolicy(PROXY));
});

test('geolocation is allowed to this origin, so check-in can read a location', () => {
  for (const path of [APP, PROXY]) {
    assert.match(
      permissionsPolicy(path),
      /geolocation=\(self\)/,
      `${path} blocks geolocation; engineer check-in cannot record where it happened`,
    );
  }
});

test('upgrade-insecure-requests is never baked into the build', () => {
  // This is the bug that rendered the whole site as unstyled plain HTML.
  // The directive makes the browser re-fetch every stylesheet, script and
  // font over https. Deciding it at build time from NEXT_PUBLIC_SITE_URL bakes
  // one scheme into an image that has to answer several: the public https
  // domain, the LAN IP over http, and localhost health probes. On any http
  // route the upgraded requests hit a port with no TLS listener and every
  // asset fails — while curl still reports 200 for those same files, because
  // curl ignores CSP. It has to be decided per request instead.
  const config = readFileSync(new URL('../next.config.ts', import.meta.url), 'utf8');
  const csp = config.slice(config.indexOf('const cspHeader'), config.indexOf('const nextConfig'));
  assert.doesNotMatch(csp, /upgrade-insecure-requests/, 'the static CSP must not carry this directive');
});

test('upgrade-insecure-requests is applied per request, only on https', () => {
  const proxy = readFileSync(new URL('../deploy/nginx/nginx.conf', import.meta.url), 'utf8');
  const snippet = readFileSync(new URL('../deploy/nginx/security-headers.conf', import.meta.url), 'utf8');

  // Keyed off the forwarded scheme, which is the only place the browser's
  // real protocol is known.
  assert.match(proxy, /map \$forwarded_proto \$csp_upgrade_insecure/);
  assert.match(proxy, /https\s+"upgrade-insecure-requests"/);
  assert.match(proxy, /default\s+""/, 'plain http must get an empty value so nginx omits the header');
  assert.match(snippet, /add_header Content-Security-Policy \$csp_upgrade_insecure/);
});

test('nginx hides the upstream copy of every header it sets itself', () => {
  // add_header appends rather than replaces, so without this the response
  // carries two of each. Where the two disagree — an older app image saying
  // geolocation=() while nginx says geolocation=(self) — the browser resolves
  // it restrictively and the feature silently stops working.
  const snippet = readFileSync(new URL('../deploy/nginx/security-headers.conf', import.meta.url), 'utf8');
  const set = [...snippet.matchAll(/^add_header ([\w-]+) /gm)].map((m) => m[1]);
  const hidden = [...snippet.matchAll(/^proxy_hide_header ([\w-]+);/gm)].map((m) => m[1]);

  for (const header of set) {
    // The conditional CSP is additive on purpose: the app owns the main
    // policy and nginx only appends the upgrade directive.
    if (header === 'Content-Security-Policy') continue;
    assert.ok(hidden.includes(header), `${header} is added but the upstream copy is not hidden`);
  }
});

test('the static-asset locations do not silently drop the security headers', () => {
  // nginx does not merge add_header across levels: a location declaring any
  // add_header of its own discards every one inherited from the server block.
  // Both static locations set Cache-Control, so each must re-include them.
  const proxy = readFileSync(new URL('../deploy/nginx/nginx.conf', import.meta.url), 'utf8');
  const blocks = [...proxy.matchAll(/location ([^\s]+) \{([\s\S]*?)\n    \}/g)];
  assert.ok(blocks.length >= 3, `expected at least 3 location blocks, found ${blocks.length}`);

  for (const [, path, body] of blocks) {
    assert.match(body, /include .*security-headers\.conf/, `location ${path} drops the security headers`);
  }
});

test('camera and microphone stay off', () => {
  // Photo documentation uses a file input, which opens the camera app rather
  // than the getUserMedia stream this header governs. Nothing needs these.
  for (const path of [APP, PROXY]) {
    const policy = permissionsPolicy(path);
    assert.match(policy, /camera=\(\)/, path);
    assert.match(policy, /microphone=\(\)/, path);
  }
});
