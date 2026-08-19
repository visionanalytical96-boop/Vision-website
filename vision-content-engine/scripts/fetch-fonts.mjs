#!/usr/bin/env node
/**
 * Downloads the brand webfonts into assets/fonts so rendering works offline.
 *
 * Run once per deployment (or commit the resulting files). All three families
 * are SIL Open Font Licence, so self-hosting them is permitted.
 *
 *   node scripts/fetch-fonts.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'assets/fonts');

const REQUESTS = [
	{ family: 'Space Grotesk', weights: [400, 500, 600, 700] },
	{ family: 'Syne', weights: [700, 800] },
	{ family: 'JetBrains Mono', weights: [400, 500] },
];

// A modern browser UA is required for the API to serve woff2 rather than ttf.
const UA =
	'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function main() {
	mkdirSync(OUT_DIR, { recursive: true });
	let written = 0;

	for (const { family, weights } of REQUESTS) {
		const query = `family=${encodeURIComponent(family)}:wght@${weights.join(';')}&display=swap`;
		const cssUrl = `https://fonts.googleapis.com/css2?${query}`;
		const css = await fetchText(cssUrl);

		// Keep only the latin block — the other subsets are dead weight for this use.
		const blocks = css.split('/*').filter((block) => /\blatin\b/.test(block) && !/latin-ext/.test(block));
		if (!blocks.length) {
			console.warn(`! no latin subset found for ${family}`);
			continue;
		}

		for (const weight of weights) {
			const block = blocks.find((b) => new RegExp(`font-weight:\\s*${weight}\\b`).test(b));
			if (!block) {
				console.warn(`! ${family} ${weight} not present in stylesheet`);
				continue;
			}
			const match = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
			if (!match) continue;
			const bytes = await fetchBuffer(match[1]);
			const file = resolve(OUT_DIR, `${family.replace(/\s+/g, '-')}-${weight}.woff2`);
			writeFileSync(file, bytes);
			written += 1;
			console.log(`✓ ${family} ${weight} (${(bytes.length / 1024).toFixed(1)} KB)`);
		}
	}

	console.log(`\nSaved ${written} font file(s) to assets/fonts`);
	if (!written) process.exitCode = 1;
}

async function fetchText(url) {
	const res = await fetch(url, { headers: { 'User-Agent': UA } });
	if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
	return res.text();
}

async function fetchBuffer(url) {
	const res = await fetch(url, { headers: { 'User-Agent': UA } });
	if (!res.ok) throw new Error(`GET ${url} → ${res.status}`);
	return Buffer.from(await res.arrayBuffer());
}

main().catch((err) => {
	console.error('Font download failed:', err.message);
	console.error('The engine still renders using system fallback faces.');
	process.exitCode = 1;
});
