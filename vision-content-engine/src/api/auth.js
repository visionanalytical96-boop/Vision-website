/**
 * Authentication and authorisation.
 *
 * Two credentials exist: an admin session cookie for the UI, and a static API
 * key for machine callers such as n8n. Both map to the same admin capability;
 * anonymous access is limited to the public published feed.
 */
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config/env.js';
import { sessions, users } from '../db/repositories.js';
import { verifyPassword } from '../auth/passwords.js';
import { clearCookie, fail, parseCookies, setCookie } from './http.js';

export const SESSION_COOKIE = 'vce_session';

/** Constant-time comparison that tolerates differing lengths. */
function safeEqual(a, b) {
	const left = Buffer.from(String(a ?? ''));
	const right = Buffer.from(String(b ?? ''));
	if (left.length !== right.length) return false;
	return timingSafeEqual(left, right);
}

/**
 * Identifies the caller.
 * @returns {{kind:'session'|'apikey', email?:string, role:string}|null}
 */
export function identify(req) {
	const header = req.headers.authorization ?? '';
	const bearer = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
	const apiKeyHeader = req.headers['x-api-key'];
	const presented = bearer ?? (typeof apiKeyHeader === 'string' ? apiKeyHeader : null);

	if (presented && config.auth.apiKey && safeEqual(presented, config.auth.apiKey)) {
		return { kind: 'apikey', role: 'admin' };
	}

	const cookie = parseCookies(req)[SESSION_COOKIE];
	const session = cookie ? sessions.find(cookie) : null;
	if (session) return { kind: 'session', email: session.email, role: session.role, userId: session.user_id };

	return null;
}

/**
 * Guard for admin-only routes. Returns the identity, or writes a 401/403 and
 * returns null — callers must stop when it returns null.
 */
export function requireAdmin(req, res) {
	const identity = identify(req);
	if (!identity) {
		fail(res, 401, 'Authentication required');
		return null;
	}
	if (identity.role !== 'admin') {
		fail(res, 403, 'Administrator access is required');
		return null;
	}
	return identity;
}

export async function login(res, { email, password }) {
	const user = users.findByEmail(String(email ?? '').trim());
	// Verify against a dummy hash when the user is unknown so the response time
	// does not reveal whether an account exists.
	const hash = user?.password_hash ?? DUMMY_HASH;
	const valid = await verifyPassword(String(password ?? ''), hash);
	if (!user || !valid) return null;

	const session = sessions.create(user.id, config.auth.sessionTtlHours);
	setCookie(res, SESSION_COOKIE, session.id, {
		maxAgeSeconds: config.auth.sessionTtlHours * 3600,
	});
	return { email: user.email, role: user.role };
}

export function logout(req, res) {
	const cookie = parseCookies(req)[SESSION_COOKIE];
	if (cookie) sessions.destroy(cookie);
	clearCookie(res, SESSION_COOKIE);
}

// A well-formed hash of an unguessable value, used only for timing parity.
const DUMMY_HASH =
	'scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' +
	'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
