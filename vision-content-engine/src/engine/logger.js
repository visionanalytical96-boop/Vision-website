/**
 * Structured logging.
 *
 * Events go to the database so the admin UI can show them, and to a daily file
 * so they survive a database reset. Context is scrubbed of anything secret
 * before it is written.
 */
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config/env.js';
import { logs } from '../db/repositories.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const SECRET_KEYS = /(password|token|secret|apikey|api_key|authorization|cookie)/i;

function threshold() {
	return LEVELS[config.logging.level] ?? LEVELS.info;
}

/** Recursively redacts secret-looking keys and truncates oversized values. */
function scrub(value, depth = 0) {
	if (value === null || value === undefined) return value;
	if (depth > 4) return '[truncated]';
	if (typeof value === 'string') return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
	if (typeof value !== 'object') return value;
	if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1));
	const out = {};
	for (const [key, val] of Object.entries(value)) {
		out[key] = SECRET_KEYS.test(key) ? '[redacted]' : scrub(val, depth + 1);
	}
	return out;
}

function writeFile(level, event, message, context) {
	try {
		mkdirSync(config.paths.logs, { recursive: true });
		const day = new Date().toISOString().slice(0, 10);
		const line = JSON.stringify({ ts: new Date().toISOString(), level, event, message, context });
		appendFileSync(join(config.paths.logs, `content-engine-${day}.log`), `${line}\n`);
	} catch {
		// Logging must never break generation.
	}
}

function emit(level, event, message, context) {
	if ((LEVELS[level] ?? 20) < threshold()) return;
	const safeContext = context ? scrub(context) : null;
	try {
		logs.write({ level, event, message, context: safeContext });
	} catch {
		// Database may not be migrated yet during bootstrap.
	}
	writeFile(level, event, message, safeContext);
	if (level === 'error') console.error(`[${event}] ${message}`);
	else if (level === 'warn') console.warn(`[${event}] ${message}`);
	else if (config.env !== 'production') console.log(`[${event}] ${message}`);
}

export const log = {
	debug: (event, message, context) => emit('debug', event, message, context),
	info: (event, message, context) => emit('info', event, message, context),
	warn: (event, message, context) => emit('warn', event, message, context),
	error: (event, message, context) => emit('error', event, message, context),
};

/** Drops log rows older than the configured retention. */
export function pruneLogs() {
	try {
		return logs.prune(config.logging.retainDays);
	} catch {
		return 0;
	}
}
