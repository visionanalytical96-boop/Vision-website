#!/usr/bin/env node
/** Environment check: reports what the engine can and cannot do right now. */
import { existsSync } from 'node:fs';
import { config } from '../src/config/env.js';
import { DEFAULT_BRANDING } from '../src/config/branding.js';
import { loadFonts } from '../src/design/fonts.js';
import { detectBackends } from '../src/render/renderer.js';
import { closeDatabase, getDatabase } from '../src/db/database.js';

const ok = (s) => `  ✓ ${s}`;
const warn = (s) => `  ! ${s}`;

console.log('\nVision AutoContent Engine — environment check\n');

console.log('Node');
console.log(ok(`version ${process.version}`));
console.log(Number(process.versions.node.split('.')[0]) >= 22 ? ok('meets the >=22.5 requirement') : warn('Node 22.5+ is required for node:sqlite'));

console.log('\nWorkspace');
console.log(existsSync(config.workspace) ? ok('workspace directory exists') : warn('workspace directory missing — run `npm run migrate`'));
console.log(existsSync(config.paths.database) ? ok('database file exists') : warn('database not created — run `npm run migrate`'));

console.log('\nRender backends');
const { backends } = await detectBackends();
for (const backend of backends) {
  const label = `${backend.name} (${backend.formats.join(', ')})${backend.measures ? ' — measures layout' : ''}`;
  console.log(backend.name === 'svg' ? warn(`${label} — fallback only`) : ok(label));
}
if (!backends.some((b) => b.name !== 'svg')) {
  console.log(warn('No rasteriser found. Install Chromium, or `npm i sharp`, to produce PNG/JPG/WebP.'));
}

console.log('\nTypography');
const fonts = loadFonts(DEFAULT_BRANDING);
console.log(fonts.embedded ? ok(`${fonts.embedded} font face(s) embedded: ${[...fonts.families].join(', ')}`) : warn('no brand fonts embedded — run `npm run fetch-fonts`'));
if (fonts.missing.length) console.log(warn(`falling back to system faces for: ${fonts.missing.join(', ')}`));
console.log(existsSync(`${config.paths.fonts}/metrics.json`) ? ok('glyph metrics calibrated') : warn('metrics.json missing — run `node scripts/calibrate-fonts.mjs` for exact text fitting'));

console.log('\nSecurity');
console.log(config.auth.sessionSecret ? ok('session secret configured') : warn('CONTENT_ENGINE_SESSION_SECRET is not set'));
console.log(config.auth.apiKey ? ok('API key configured for machine access') : warn('CONTENT_ENGINE_API_KEY is not set — n8n cannot authenticate'));
try {
  const n = getDatabase().prepare('SELECT COUNT(*) AS n FROM users').get().n;
  console.log(n ? ok(`${n} admin user(s)`) : warn('no admin user — set CONTENT_ENGINE_ADMIN_EMAIL / _PASSWORD then run `npm run migrate`'));
} catch {
  console.log(warn('users table unavailable — run `npm run migrate`'));
}

console.log('\nPublishing');
console.log(config.publishing.autoPublish ? warn('automatic publishing is ENABLED') : ok('automatic publishing is off (content stays in review)'));
console.log(config.publishing.webhookUrl ? ok('publish webhook configured') : ok('publishing to the built-in website feed'));

console.log('');
closeDatabase();
