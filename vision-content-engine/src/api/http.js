/**
 * Small HTTP helpers over node:http — request parsing, responses and a router.
 */
import { config } from '../config/env.js';

const MAX_JSON_BYTES = 2 * 1024 * 1024;

export function send(res, status, body, headers = {}) {
	const payload = typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body);
	res.writeHead(status, {
		'Content-Length': Buffer.byteLength(payload),
		'X-Content-Type-Options': 'nosniff',
		...headers,
	});
	res.end(payload);
}

export function json(res, status, body, headers = {}) {
	send(res, status, body, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
}

export function fail(res, status, message, extra = {}) {
	json(res, status, { error: message, ...extra });
}

export function noContent(res) {
	res.writeHead(204);
	res.end();
}

/** Reads and parses a JSON body, enforcing a size cap. */
export async function readJson(req, { limit = MAX_JSON_BYTES } = {}) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > limit) throw Object.assign(new Error('Request body too large'), { status: 413 });
		chunks.push(chunk);
	}
	if (!chunks.length) return {};
	try {
		return JSON.parse(Buffer.concat(chunks).toString('utf8'));
	} catch {
		throw Object.assign(new Error('Invalid JSON body'), { status: 400 });
	}
}

/** Reads a raw body (uploads), enforcing the configured cap. */
export async function readBuffer(req, { limit = config.uploads.maxBytes } = {}) {
	const chunks = [];
	let size = 0;
	for await (const chunk of req) {
		size += chunk.length;
		if (size > limit) throw Object.assign(new Error('Upload exceeds the maximum allowed size'), { status: 413 });
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

export function parseCookies(req) {
	const header = req.headers.cookie;
	if (!header) return {};
	const out = {};
	for (const part of header.split(';')) {
		const idx = part.indexOf('=');
		if (idx === -1) continue;
		out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
	}
	return out;
}

export function setCookie(res, name, value, { maxAgeSeconds, httpOnly = true, sameSite = 'Lax', secure } = {}) {
	const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/'];
	if (httpOnly) parts.push('HttpOnly');
	if (sameSite) parts.push(`SameSite=${sameSite}`);
	// Secure is implied in production; over plain HTTP on localhost it would
	// stop the cookie being stored at all.
	if (secure ?? config.env === 'production') parts.push('Secure');
	if (maxAgeSeconds !== undefined) parts.push(`Max-Age=${maxAgeSeconds}`);
	const existing = res.getHeader('Set-Cookie');
	const cookie = parts.join('; ');
	res.setHeader('Set-Cookie', existing ? [].concat(existing, cookie) : cookie);
}

export function clearCookie(res, name) {
	setCookie(res, name, '', { maxAgeSeconds: 0 });
}

/**
 * Trivial pattern router. Patterns use `:name` segments, e.g. /api/products/:id
 */
export class Router {
	constructor() {
		this.routes = [];
	}

	add(method, pattern, handler) {
		const segments = pattern.split('/').filter(Boolean);
		this.routes.push({ method, segments, handler, pattern });
		return this;
	}

	get(pattern, handler) {
		return this.add('GET', pattern, handler);
	}

	post(pattern, handler) {
		return this.add('POST', pattern, handler);
	}

	put(pattern, handler) {
		return this.add('PUT', pattern, handler);
	}

	patch(pattern, handler) {
		return this.add('PATCH', pattern, handler);
	}

	delete(pattern, handler) {
		return this.add('DELETE', pattern, handler);
	}

	/** @returns {{handler:Function, params:object}|null} */
	match(method, pathname) {
		const parts = pathname.split('/').filter(Boolean);
		for (const route of this.routes) {
			if (route.method !== method) continue;
			// A trailing :rest* segment swallows the remainder of the path.
			const wildcard = route.segments.at(-1)?.endsWith('*');
			if (!wildcard && route.segments.length !== parts.length) continue;
			if (wildcard && parts.length < route.segments.length - 1) continue;

			const params = {};
			let matched = true;
			for (let i = 0; i < route.segments.length; i += 1) {
				const segment = route.segments[i];
				if (segment.endsWith('*')) {
					params[segment.slice(1, -1)] = parts.slice(i).join('/');
					break;
				}
				if (segment.startsWith(':')) {
					params[segment.slice(1)] = decodeURIComponent(parts[i]);
					continue;
				}
				if (segment !== parts[i]) {
					matched = false;
					break;
				}
			}
			if (matched) return { handler: route.handler, params };
		}
		return null;
	}
}

/** Coerces a query/param value to a positive integer, or null. */
export function toId(value) {
	const n = Number.parseInt(value, 10);
	return Number.isFinite(n) && n > 0 ? n : null;
}
