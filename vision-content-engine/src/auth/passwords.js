/**
 * Password hashing with scrypt from node:crypto — no dependency, and the
 * parameters are stored alongside the hash so they can be raised later without
 * invalidating existing credentials.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

const PARAMS = { N: 16384, r: 8, p: 1, keylen: 64 };

export async function hashPassword(password) {
	if (typeof password !== 'string' || password.length < 8) {
		throw new Error('Password must be at least 8 characters');
	}
	const salt = randomBytes(16);
	const derived = await scryptAsync(password, salt, PARAMS.keylen, {
		N: PARAMS.N,
		r: PARAMS.r,
		p: PARAMS.p,
		// scrypt needs headroom above the default 32MB for these parameters.
		maxmem: 256 * 1024 * 1024,
	});
	return `scrypt$${PARAMS.N}$${PARAMS.r}$${PARAMS.p}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
	if (typeof password !== 'string' || typeof stored !== 'string') return false;
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [, n, r, p, saltB64, hashB64] = parts;
	try {
		const salt = Buffer.from(saltB64, 'base64');
		const expected = Buffer.from(hashB64, 'base64');
		const derived = await scryptAsync(password, salt, expected.length, {
			N: Number(n),
			r: Number(r),
			p: Number(p),
			maxmem: 256 * 1024 * 1024,
		});
		return derived.length === expected.length && timingSafeEqual(derived, expected);
	} catch {
		return false;
	}
}
