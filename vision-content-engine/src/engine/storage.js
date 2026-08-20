/**
 * Filesystem layout and safe file handling.
 *
 * Generated files are content-addressed by name and never overwritten, so a
 * regeneration always produces a new artefact and published URLs stay stable.
 * Internal absolute paths are never returned to callers — the API deals in
 * workspace-relative keys only.
 */
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { join, normalize, relative, resolve, sep } from 'node:path';
import { config } from '../config/env.js';
import { fileExtension } from '../domain/formats.js';
import { slugify } from '../domain/categories.js';

/** Creates the workspace tree. Safe to call repeatedly. */
export function ensureWorkspace() {
	for (const dir of Object.values(config.paths)) {
		// `database` is a file path, not a directory.
		if (dir === config.paths.database) continue;
		mkdirSync(dir, { recursive: true });
	}
	mkdirSync(config.paths.database.replace(/\/[^/]+$/, ''), { recursive: true });
}

/**
 * Builds a unique, descriptive filename.
 * e.g. instrument-sale-agilent-1260-premium-20260818-100000-a82f.png
 */
export function buildFileName({ category, product, template, outputFormat, extension, at = new Date() }) {
	// `extension` bypasses the image-format normaliser, which would otherwise
	// coerce a document format such as pdf into png.
	const ext = extension ?? fileExtension(outputFormat);
	// 2026-08-18T10:00:00.000Z → 20260818-100000
	const stamp = at.toISOString().replace(/[-:T]/g, '').slice(0, 14).replace(/^(\d{8})(\d{6})$/, '$1-$2');
	const parts = [
		slugify(category ?? 'content'),
		slugify(product ?? 'item'),
		slugify(template ?? 'template'),
		stamp,
		randomBytes(2).toString('hex'),
	].filter(Boolean);
	return `${parts.join('-').slice(0, 180)}.${ext}`;
}

/** Generated files are foldered by year/month to keep directories browsable. */
function generatedDir(at = new Date()) {
	const dir = join(
		config.paths.generated,
		String(at.getUTCFullYear()),
		String(at.getUTCMonth() + 1).padStart(2, '0'),
	);
	mkdirSync(dir, { recursive: true });
	return dir;
}

/**
 * Writes a generated image.
 * @returns {{key:string, fileName:string, size:number, checksum:string}}
 */
export function saveGenerated(buffer, { category, product, template, outputFormat, extension, at = new Date() }) {
	const dir = generatedDir(at);
	let fileName = buildFileName({ category, product, template, outputFormat, extension, at });
	// Collisions are already improbable; this makes overwriting impossible.
	while (existsSync(join(dir, fileName))) {
		fileName = buildFileName({ category, product, template, outputFormat, extension, at: new Date() });
	}
	const absolute = join(dir, fileName);
	writeFileSync(absolute, buffer, { flag: 'wx' });
	return {
		key: toKey(absolute),
		fileName,
		size: buffer.length,
		checksum: createHash('sha256').update(buffer).digest('hex').slice(0, 32),
	};
}

/** Stores an uploaded asset (product photo, logo, font). */
export function saveUpload(buffer, { originalName, kind = 'products' }) {
	const dir = kind === 'uploads' ? config.paths.uploads : join(config.paths.products);
	mkdirSync(dir, { recursive: true });
	const ext = (originalName?.match(/\.([a-z0-9]+)$/i)?.[1] ?? 'bin').toLowerCase();
	const base = slugify(originalName?.replace(/\.[^.]+$/, '') ?? 'asset') || 'asset';
	let fileName = `${base}-${randomBytes(3).toString('hex')}.${ext}`;
	while (existsSync(join(dir, fileName))) {
		fileName = `${base}-${randomBytes(3).toString('hex')}.${ext}`;
	}
	const absolute = join(dir, fileName);
	writeFileSync(absolute, buffer, { flag: 'wx' });
	return { key: toKey(absolute), fileName, size: buffer.length };
}

/** Workspace-relative key — this is what is stored in the database and API. */
export function toKey(absolutePath) {
	return relative(config.workspace, absolutePath).split(sep).join('/');
}

/**
 * Resolves a stored key back to an absolute path, refusing anything that
 * escapes the workspace.
 */
export function resolveKey(key) {
	if (!key || typeof key !== 'string') return null;
	if (key.includes('\0')) return null;
	const absolute = resolve(config.workspace, normalize(key));
	const root = resolve(config.workspace);
	if (absolute !== root && !absolute.startsWith(root + sep)) return null;
	return absolute;
}

export function readStored(key) {
	const absolute = resolveKey(key);
	if (!absolute || !existsSync(absolute)) return null;
	return readFileSync(absolute);
}

export function statStored(key) {
	const absolute = resolveKey(key);
	if (!absolute || !existsSync(absolute)) return null;
	const info = statSync(absolute);
	return info.isFile() ? { size: info.size, mtime: info.mtime } : null;
}

/** Recursive directory size, used for the storage figure on the dashboard. */
export async function workspaceUsage() {
	let bytes = 0;
	let files = 0;
	async function walk(dir) {
		let entries;
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const full = join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(full);
			} else if (entry.isFile()) {
				try {
					const info = await stat(full);
					bytes += info.size;
					files += 1;
				} catch {
					/* removed mid-walk */
				}
			}
		}
	}
	await walk(config.workspace);
	return { bytes, files };
}

export function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
	return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

const CONTENT_TYPES = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	pdf: 'application/pdf',
};

export function contentTypeFor(fileName) {
	const ext = String(fileName).split('.').pop()?.toLowerCase();
	return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}
