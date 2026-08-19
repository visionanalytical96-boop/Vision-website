/**
 * Font loading.
 *
 * Brand webfonts are embedded as data URIs so rendering never touches the
 * network at generation time. When the font files are absent the engine falls
 * back to installed system faces — output still renders, just with a system
 * face — and reports the downgrade so an operator can fix it.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { config } from '../config/env.js';

const MIME = {
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.ttf': 'font/ttf',
	'.otf': 'font/otf',
};

let cache = null;

/**
 * Font files are named `<Family>-<weight>.<ext>`, e.g. `Syne-700.woff2`.
 * Anything unparseable is ignored rather than breaking generation.
 */
function scanFontDir(dir) {
	if (!existsSync(dir)) return [];
	const faces = [];
	for (const file of readdirSync(dir)) {
		const ext = extname(file).toLowerCase();
		if (!MIME[ext]) continue;
		const stem = file.slice(0, -ext.length);
		const match = stem.match(/^(.+?)-(\d{3})$/);
		if (!match) continue;
		const [, rawFamily, weight] = match;
		faces.push({
			family: rawFamily.replace(/[-_]+/g, ' ').trim(),
			weight: Number(weight),
			file: join(dir, file),
			mime: MIME[ext],
			ext,
		});
	}
	return faces;
}

/** @returns {{css:string, families:Set<string>, embedded:number, missing:string[]}} */
export function loadFonts(branding) {
	const wanted = [branding.typography.display, branding.typography.body, branding.typography.mono]
		.filter(Boolean)
		.map((f) => f.trim());

	if (cache && cache.key === wanted.join('|')) return cache.value;

	const faces = scanFontDir(config.paths.fonts).filter((face) =>
		wanted.some((w) => w.toLowerCase() === face.family.toLowerCase()),
	);
	const blocks = [];
	const families = new Set();

	// Group by family so variable fonts — where every weight resolves to the same
	// file — are declared once with a weight *range*. Declaring a variable file
	// separately per weight makes every weight render at the default instance.
	for (const [family, group] of groupBy(faces, (f) => f.family)) {
		const loaded = [];
		for (const face of group) {
			try {
				const bytes = readFileSync(face.file);
				loaded.push({ ...face, bytes, hash: createHash('sha1').update(bytes).digest('hex') });
			} catch {
				/* unreadable file — skip rather than fail generation */
			}
		}
		if (!loaded.length) continue;
		families.add(family);

		for (const [, sameFile] of groupBy(loaded, (f) => f.hash)) {
			const weights = sameFile.map((f) => f.weight).sort((a, b) => a - b);
			const face = sameFile[0];
			const weightRule =
				weights.length > 1 ? `${weights[0]} ${weights.at(-1)}` : String(weights[0]);
			blocks.push(
				`@font-face{font-family:'${family}';font-style:normal;font-weight:${weightRule};` +
					`src:url(data:${face.mime};base64,${face.bytes.toString('base64')}) ` +
					`format('${face.ext === '.ttf' ? 'truetype' : face.ext.slice(1)}');}`,
			);
		}
	}

	const missing = wanted.filter((w) => ![...families].some((f) => f.toLowerCase() === w.toLowerCase()));
	if (missing.length) {
		// Surfaced by `npm run doctor` so an operator can fix typography rather
		// than silently shipping system-font output.
		process.emitWarning(`Brand fonts not embedded: ${missing.join(', ')}`, 'ContentEngineFonts');
	}
	const value = { css: blocks.join(''), families, embedded: blocks.length, missing };
	cache = { key: wanted.join('|'), value };
	return value;
}

function groupBy(items, keyFn) {
	const map = new Map();
	for (const item of items) {
		const key = keyFn(item);
		if (!map.has(key)) map.set(key, []);
		map.get(key).push(item);
	}
	return map;
}

/** Resets the in-process cache; used after an administrator uploads new fonts. */
export function clearFontCache() {
	cache = null;
}

/**
 * Builds the CSS font stacks templates reference. Falls back cleanly when a
 * brand face is not embedded.
 */
export function fontStacks(branding) {
	const { families } = loadFonts(branding);
	const has = (name) => [...families].some((f) => f.toLowerCase() === String(name).toLowerCase());
	const t = branding.typography;
	const stack = (primary, fallback) => (has(primary) ? `'${primary}', ${fallback}` : fallback);
	return {
		display: stack(t.display, t.displayFallback),
		body: stack(t.body, t.bodyFallback),
		mono: stack(t.mono, t.monoFallback),
		// Resolved primary family names, or null when falling back to a system
		// face. Measurement keys off these to find calibrated glyph metrics.
		names: {
			display: has(t.display) ? t.display : null,
			body: has(t.body) ? t.body : null,
			mono: has(t.mono) ? t.mono : null,
		},
	};
}
