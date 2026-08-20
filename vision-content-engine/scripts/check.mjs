#!/usr/bin/env node
/**
 * Answers one question in one command: is the studio actually reachable?
 *
 *   npm run check
 *
 * Distinguishes "the server is down" from "the server is up but something in
 * front of it is not", which is the difference that matters when a Tailscale or
 * proxy URL does not load.
 */
import { execFileSync } from 'node:child_process';
import { config } from '../src/config/env.js';

const line = (label, value) => console.log(`  ${label.padEnd(22)} ${value}`);
const sh = (cmd, args) => {
  try {
    // stderr is swallowed: a missing systemctl or tailscale is an expected
    // answer here, not something to print raw at the user.
    return execFileSync(cmd, args, { encoding: 'utf8', timeout: 8000, stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

console.log('\nContent Studio — connectivity check\n');

// 1. Is the local server answering?
let localOk = false;
try {
  const res = await fetch(`http://127.0.0.1:${config.server.port}/healthz`, {
    signal: AbortSignal.timeout(5000),
  });
  localOk = res.ok;
  line('Local server', localOk ? `UP on port ${config.server.port}` : `responded ${res.status}`);
} catch {
  line('Local server', `DOWN — nothing listening on ${config.server.port}`);
}

// 2. Is it running as a managed service, or by hand in a terminal?
const unit = sh('systemctl', ['is-active', 'vision-content-engine']);
line('systemd service', unit === 'active' ? 'active (survives logout)' : unit || 'not installed');

// 3. Tailscale exposure.
const serveStatus = sh('tailscale', ['serve', 'status']);
line('Tailscale serve', serveStatus ? 'configured' : 'not configured (or needs sudo)');
if (serveStatus) {
  for (const l of serveStatus.split('\n').slice(0, 4)) console.log(`      ${l}`);
}

console.log('');
if (!localOk) {
  console.log('  The server is not running. Install it as a service so it stays up:');
  console.log('    sudo bash scripts/install-service.sh\n');
} else if (unit !== 'active') {
  console.log('  Running, but by hand — it will stop when you close the terminal.');
  console.log('  Make it permanent:');
  console.log('    sudo bash scripts/install-service.sh\n');
} else {
  console.log('  All good. If a Tailscale URL still will not load, check that');
  console.log('  MagicDNS and HTTPS are enabled in the Tailscale admin console.\n');
}
