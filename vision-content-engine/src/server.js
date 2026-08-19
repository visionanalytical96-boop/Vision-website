#!/usr/bin/env node
/**
 * HTTP entry point: REST API, admin UI and the public published feed.
 */
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bootstrap } from './bootstrap.js';
import { config } from './config/env.js';
import { closeDatabase } from './db/database.js';
import { sessions } from './db/repositories.js';
import { log, pruneLogs } from './engine/logger.js';
import { startScheduler, stopScheduler } from './engine/scheduler.js';
import { closeChromium, detectBackends } from './render/renderer.js';
import { identify } from './api/auth.js';
import { fail, send } from './api/http.js';
import { router } from './api/routes.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ADMIN_HTML = resolve(HERE, 'admin/index.html');

// Read once at startup — the admin bundle is a single static file.
const adminPage = readFileSync(ADMIN_HTML, 'utf8');

const SECURITY_HEADERS = {
	'X-Content-Type-Options': 'nosniff',
	'X-Frame-Options': 'DENY',
	'Referrer-Policy': 'same-origin',
};

// The admin page is self-contained; nothing external may be loaded or called.
const ADMIN_CSP =
	"default-src 'none'; img-src 'self' blob: data:; font-src 'self'; style-src 'unsafe-inline'; " +
	"script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'";

async function handle(req, res) {
	const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
	const pathname = url.pathname.replace(/\/+$/, '') || '/';

	// Admin UI.
	if (pathname === '/' || pathname === '/admin') {
		return send(res, 200, adminPage, {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Security-Policy': ADMIN_CSP,
			'Cache-Control': 'no-cache',
			...SECURITY_HEADERS,
		});
	}

	const match = router.match(req.method, pathname);
	if (!match) return fail(res, 404, 'Not found');

	try {
		await match.handler(req, res, match.params);
	} catch (err) {
		const status = err.status ?? 500;
		if (status >= 500) {
			log.error('http.error', err.message, { path: pathname, method: req.method });
		}
		if (!res.headersSent) {
			// Internal failures are never echoed verbatim to the client.
			fail(res, status, status >= 500 ? 'Internal server error' : err.message);
		}
	}
}

const server = createServer((req, res) => {
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(key, value);
	handle(req, res).catch(() => {
		if (!res.headersSent) fail(res, 500, 'Internal server error');
	});
});

async function main() {
	await bootstrap();

	const { backends } = await detectBackends();
	if (!backends.some((b) => b.name !== 'svg')) {
		log.warn('startup.renderer', 'No rasteriser available — output will be SVG only. Install Chromium or sharp.');
	}
	if (!config.auth.adminEmail && !config.auth.apiKey) {
		log.warn('startup.auth', 'Neither an admin account nor an API key is configured; the studio cannot be signed into.');
	}

	sessions.purgeExpired();
	pruneLogs();
	if (config.scheduler.enabled) startScheduler();

	server.listen(config.server.port, config.server.host, () => {
		log.info('startup', `Content Studio listening on http://${config.server.host}:${config.server.port}`, {
			renderer: backends[0]?.name,
			scheduler: config.scheduler.enabled,
		});
	});
}

async function shutdown(signal) {
	log.info('shutdown', `Received ${signal}, closing`);
	stopScheduler();
	server.close();
	await closeChromium();
	closeDatabase();
	process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
	console.error('Failed to start:', err.message);
	process.exit(1);
});
