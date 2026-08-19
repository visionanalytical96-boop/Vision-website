#!/usr/bin/env node
/**
 * One-command diagnose-and-repair.
 *
 *   npm run setup
 *
 * Checks the environment, fixes what it can, and prints a single report with
 * the exact next action. Safe to run repeatedly — every step is idempotent and
 * an optional step failing never stops the essential ones. This exists because
 * chaining setup steps with `&&` in a shell stops at the first failure, which
 * repeatedly left the database unmigrated when only font calibration had failed.
 */
import { spawn } from 'node:child_process';
import { accessSync, constants, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_FILE = join(ROOT, '.env');

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const warn = (m) => console.log(`  \x1b[33m!\x1b[0m ${m}`);
const bad = (m) => console.log(`  \x1b[31m✗\x1b[0m ${m}`);
const head = (m) => console.log(`\n\x1b[1m${m}\x1b[0m`);

const notes = [];
let fatal = false;

/* ------------------------------------------------------------------ *
 * .env helpers
 * ------------------------------------------------------------------ */

function readEnv() {
	if (!existsSync(ENV_FILE)) return {};
	const out = {};
	for (const raw of readFileSync(ENV_FILE, 'utf8').split('\n')) {
		const line = raw.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
	}
	return out;
}

/** Adds or replaces keys without disturbing anything else in the file. */
function writeEnv(updates) {
	const lines = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, 'utf8').split('\n') : [];
	for (const [key, value] of Object.entries(updates)) {
		const index = lines.findIndex((l) => l.trim().startsWith(`${key}=`));
		if (index === -1) lines.push(`${key}=${value}`);
		else lines[index] = `${key}=${value}`;
	}
	writeFileSync(ENV_FILE, `${lines.join('\n').replace(/\n+$/, '')}\n`, { mode: 0o600 });
}

/* ------------------------------------------------------------------ *
 * 1. Node
 * ------------------------------------------------------------------ */

head('1. Node');
const [major, minor] = process.versions.node.split('.').map(Number);
if (major > 22 || (major === 22 && minor >= 5)) {
	ok(`v${process.versions.node}`);
} else {
	bad(`v${process.versions.node} — 22.5 or newer is required (node:sqlite)`);
	notes.push('Install Node 22: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs');
	fatal = true;
}

/* ------------------------------------------------------------------ *
 * 2. Credentials
 * ------------------------------------------------------------------ */

head('2. Credentials');
let env = readEnv();
const updates = {};
let generatedPassword = null;

if (!env.CONTENT_ENGINE_ADMIN_EMAIL) updates.CONTENT_ENGINE_ADMIN_EMAIL = 'admin@visionanalytical.in';
if (!env.CONTENT_ENGINE_ADMIN_PASSWORD) {
	generatedPassword = randomBytes(15).toString('base64url');
	updates.CONTENT_ENGINE_ADMIN_PASSWORD = generatedPassword;
}
if (!env.CONTENT_ENGINE_SESSION_SECRET) updates.CONTENT_ENGINE_SESSION_SECRET = randomBytes(32).toString('hex');
if (!env.CONTENT_ENGINE_API_KEY) updates.CONTENT_ENGINE_API_KEY = randomBytes(32).toString('hex');

if (Object.keys(updates).length) {
	writeEnv(updates);
	env = readEnv();
	ok(`wrote ${Object.keys(updates).length} missing value(s) to .env`);
} else {
	ok('.env already complete');
}

/* ------------------------------------------------------------------ *
 * 3. Browser — find one that actually launches
 * ------------------------------------------------------------------ */

head('3. Browser');

// The engine's own detector runs first so this report can never disagree with
// what generation will actually use; the explicit list then covers anything it
// ranks lower, so a broken first choice can fall through to a working one.
const { findChromium } = await import('../src/render/chromium.js');

const CANDIDATES = [
	env.CONTENT_ENGINE_CHROMIUM,
	findChromium(),
	'/usr/bin/google-chrome-stable',
	'/usr/bin/google-chrome',
	'/opt/google/chrome/chrome',
	'/usr/bin/chromium',
	'/usr/bin/chromium-browser',
	'/snap/bin/chromium',
].filter(Boolean);

const executable = (p) => {
	try {
		accessSync(p, constants.X_OK);
		return true;
	} catch {
		return false;
	}
};

/** Launches a candidate and waits for it to advertise a DevTools endpoint. */
function probe(binary) {
	return new Promise((done) => {
		let profile;
		try {
			const root = join(homedir(), '.cache', 'vision-content-engine');
			mkdirSync(root, { recursive: true });
			profile = mkdtempSync(join(root, 'probe-'));
		} catch {
			return done(false);
		}
		const child = spawn(
			binary,
			['--headless', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage',
			 '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
			{ stdio: ['ignore', 'ignore', 'pipe'] },
		);
		let buffer = '';
		let settled = false;
		const finish = (result) => {
			// Both the stderr match and the exit handler can fire; only the first counts.
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			try {
				child.kill('SIGKILL');
			} catch {
				/* already gone */
			}
			// Deferred and best-effort: the browser is still flushing its profile
			// as it dies, so an immediate delete races it and throws ENOTEMPTY.
			// A failed cleanup must never abort setup.
			setTimeout(() => {
				try {
					rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
				} catch {
					/* left behind; removed by the sweep on the next run */
				}
			}, 500).unref?.();
			done(result);
		};
		const timer = setTimeout(() => finish(false), 20_000);
		child.stderr.on('data', (c) => {
			buffer += c.toString();
			if (/ws:\/\//.test(buffer)) finish(true);
		});
		child.once('error', () => finish(false));
		child.once('exit', () => finish(/ws:\/\//.test(buffer)));
	});
}

// Sweep probe directories left behind by an earlier run.
try {
	const cacheRoot = join(homedir(), '.cache', 'vision-content-engine');
	if (existsSync(cacheRoot)) {
		for (const entry of readdirSync(cacheRoot)) {
			if (entry.startsWith('probe-')) {
				rmSync(join(cacheRoot, entry), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
			}
		}
	}
} catch {
	/* housekeeping only */
}

let workingBrowser = null;
const seen = new Set();
for (const candidate of CANDIDATES) {
	if (seen.has(candidate)) continue;
	seen.add(candidate);
	if (!executable(candidate)) continue;
	process.stdout.write(`  … testing ${candidate}\r`);
	// eslint-disable-next-line no-await-in-loop -- probes must run one at a time
	if (await probe(candidate)) {
		workingBrowser = candidate;
		ok(`${candidate} — launches correctly`.padEnd(60));
		break;
	}
	warn(`${candidate} — installed but will not launch (snap confinement?)`.padEnd(60));
}

if (workingBrowser) {
	if (env.CONTENT_ENGINE_CHROMIUM !== workingBrowser) {
		writeEnv({ CONTENT_ENGINE_CHROMIUM: workingBrowser });
		ok('pinned this browser in .env');
	}
	process.env.CONTENT_ENGINE_CHROMIUM = workingBrowser;
} else {
	bad('no working browser — output will be SVG instead of PNG/JPEG/WebP');
	notes.push(
		'Install Chrome (.deb, not snap):\n' +
			'    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb\n' +
			'    sudo apt install -y ./google-chrome-stable_current_amd64.deb\n' +
			'    npm run setup',
	);
}

/* ------------------------------------------------------------------ *
 * Everything below needs config loaded *after* the browser pin above.
 * ------------------------------------------------------------------ */

if (fatal) {
	report();
	process.exit(1);
}

const { config } = await import('../src/config/env.js');

/* ------------------------------------------------------------------ *
 * 4. Fonts
 * ------------------------------------------------------------------ */

head('4. Typography');
const fontDir = config.paths.fonts;
const hasFonts = existsSync(fontDir) && existsSync(join(fontDir, 'Syne-700.woff2'));

if (!hasFonts) {
	warn('brand fonts missing — downloading');
	await run('scripts/fetch-fonts.mjs');
}
ok(existsSync(join(fontDir, 'Syne-700.woff2')) ? 'brand fonts embedded' : 'using system fallback faces');

const hasMetrics = existsSync(join(fontDir, 'metrics.json'));
if (hasMetrics) {
	ok('glyph metrics calibrated');
} else if (workingBrowser) {
	warn('calibrating glyph metrics (one-off, ~20s)');
	await run('scripts/calibrate-fonts.mjs');
	if (existsSync(join(fontDir, 'metrics.json'))) ok('glyph metrics calibrated');
	else warn('calibration failed — text widths will be estimated (designs still validate)');
} else {
	warn('skipped calibration — needs a working browser. Optional: text is still validated after rendering.');
}

/* ------------------------------------------------------------------ *
 * 5. Database
 * ------------------------------------------------------------------ */

head('5. Database');
const { bootstrap } = await import('../src/bootstrap.js');
const { products, templates } = await import('../src/db/repositories.js');
const { closeDatabase } = await import('../src/db/database.js');

const boot = await bootstrap({ quiet: true });
ok(boot.migrations.length ? `migrations applied: ${boot.migrations.join(', ')}` : 'schema already current');
ok(`${templates.list().length} templates, ${boot.categories} categories seeded`);
ok(boot.adminCreated ? 'admin account created' : 'admin account already exists');

if (products.count() === 0) {
	warn('product library empty — seeding samples');
	await run('scripts/seed.mjs');
}
ok(`${products.count()} products in the library`);

/* ------------------------------------------------------------------ *
 * 6. End-to-end render
 * ------------------------------------------------------------------ */

head('6. Test render');
let rendered = null;
const { closeChromium } = await import('../src/render/renderer.js');
try {
	const { generateNext } = await import('../src/engine/generator.js');
	const outcome = await generateNext({ origin: 'manual' });
	if (outcome) {
		rendered = outcome.content.file_name;
		const isRaster = !rendered.endsWith('.svg');
		(isRaster ? ok : warn)(`generated ${rendered.split('/').pop()}`);
		if (!isRaster) warn('SVG output — install a working browser for PNG/JPEG/WebP');
	} else {
		bad('nothing generated — no eligible product/template combination');
	}
} catch (err) {
	bad(`render failed: ${err.message}`);
	notes.push('Re-run `npm run setup` once a working browser is installed.');
} finally {
	// Must run even when generation throws, or the browser keeps the process alive.
	await closeChromium();
}

closeDatabase();
report();

/* ------------------------------------------------------------------ */

function report() {
	const finalEnv = readEnv();
	console.log(`\n${'─'.repeat(52)}`);

	const rasterWorks = rendered && !rendered.endsWith('.svg');
	// A successful raster render proves a browser works, whatever the probe found.
	if (rasterWorks) notes.length = 0;

	if (rasterWorks) {
		console.log('\x1b[32m\x1b[1m  READY — the engine is working end to end.\x1b[0m');
	} else if (rendered) {
		console.log('\x1b[33m\x1b[1m  WORKING, but producing SVG rather than images.\x1b[0m');
	} else {
		console.log('\x1b[33m\x1b[1m  SETUP INCOMPLETE — see the notes below.\x1b[0m');
	}

	console.log(`${'─'.repeat(52)}\n`);
	console.log('  Sign in');
	console.log(`    Email    : ${finalEnv.CONTENT_ENGINE_ADMIN_EMAIL ?? '(not set)'}`);
	console.log(`    Password : ${finalEnv.CONTENT_ENGINE_ADMIN_PASSWORD ?? '(not set)'}`);
	if (generatedPassword) console.log('               (generated just now — save it)');

	console.log('\n  Start the server');
	console.log('    npm start');
	console.log('\n  Reach it from your phone or laptop (Tailscale)');
	console.log('    tailscale serve --bg 4310');

	if (notes.length) {
		console.log('\n  To fix');
		for (const note of notes) console.log(`    • ${note}`);
	}
	console.log('');
}

/** Runs a sibling script, inheriting stdio, without aborting on failure. */
function run(relative) {
	return new Promise((done) => {
		const child = spawn(process.execPath, [join(ROOT, relative)], {
			stdio: ['ignore', 'ignore', 'pipe'],
			env: process.env,
			cwd: ROOT,
		});
		let stderr = '';
		child.stderr.on('data', (c) => {
			stderr += c.toString();
		});
		child.once('exit', (code) => {
			if (code !== 0 && stderr.trim()) warn(stderr.trim().split('\n').at(-1).slice(0, 120));
			done(code === 0);
		});
		child.once('error', () => done(false));
	});
}
