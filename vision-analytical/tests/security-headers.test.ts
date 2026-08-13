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
  const at = source.indexOf('Permissions-Policy');
  assert.notEqual(at, -1, `no Permissions-Policy set in ${path}`);

  // The two files spell it differently — an nginx directive and a JS object —
  // so take the first quoted policy-shaped value after the header name.
  const match = source.slice(at).match(/["']([^"']*=\([^"']*)["']/);
  assert.ok(match, `Permissions-Policy in ${path} has no readable value`);
  return match[1];
}

const APP = '../next.config.ts';
const PROXY = '../deploy/nginx/nginx.conf';

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

test('camera and microphone stay off', () => {
  // Photo documentation uses a file input, which opens the camera app rather
  // than the getUserMedia stream this header governs. Nothing needs these.
  for (const path of [APP, PROXY]) {
    const policy = permissionsPolicy(path);
    assert.match(policy, /camera=\(\)/, path);
    assert.match(policy, /microphone=\(\)/, path);
  }
});
