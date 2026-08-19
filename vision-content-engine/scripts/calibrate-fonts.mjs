#!/usr/bin/env node
/**
 * Measures real glyph advance widths for the embedded brand fonts and writes
 * assets/fonts/metrics.json.
 *
 * Composition happens outside the browser, so without this the engine has to
 * guess how wide a headline will be. Guessing costs re-render attempts and, at
 * the margins, clipped text. Measuring once makes wrapping exact.
 *
 * Re-run after changing or adding font files:
 *   node scripts/calibrate-fonts.mjs
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DEFAULT_BRANDING } from '../src/config/branding.js';
import { loadFonts } from '../src/design/fonts.js';
import { config } from '../src/config/env.js';
import { closeChromium, getChromium } from '../src/render/chromium.js';

const WEIGHTS = [300, 400, 500, 600, 700, 800];
const EXTRA_CHARS = ['·', '–', '—', '…', '°', 'μ', '₹', '×', '±', '’', '“', '”'];
const SAMPLE_SIZE = 100; // measure at 100px so results are em-normalised cleanly

function charset() {
	const chars = [];
	for (let code = 32; code <= 126; code += 1) chars.push(String.fromCharCode(code));
	return [...chars, ...EXTRA_CHARS];
}

async function main() {
	const branding = DEFAULT_BRANDING;
	const { css, families, missing } = loadFonts(branding);

	if (!families.size) {
		console.error('No brand fonts embedded. Run `node scripts/fetch-fonts.mjs` first.');
		process.exitCode = 1;
		return;
	}
	if (missing.length) console.warn(`! not embedded, skipping: ${missing.join(', ')}`);

	const chromium = getChromium();
	if (!chromium) {
		console.error('Chromium not found; cannot calibrate. Metrics will fall back to estimates.');
		process.exitCode = 1;
		return;
	}

	const chars = charset();
	const metrics = {};

	for (const family of families) {
		metrics[family] = {};
		for (const weight of WEIGHTS) {
			const widths = await measureFamily(chromium, css, family, weight, chars);
			if (widths) metrics[family][weight] = widths;
		}
		console.log(`✓ ${family} (${Object.keys(metrics[family]).length} weights)`);
	}

	const out = resolve(config.paths.fonts, 'metrics.json');
	writeFileSync(out, `${JSON.stringify({ unitsPerEm: 1, sampleSize: SAMPLE_SIZE, metrics }, null, '\t')}\n`);
	console.log(`\nWrote ${out}`);
	await closeChromium();
}

/**
 * Renders an SVG carrying one <text> per character and reads back each advance
 * from the browser, normalised to em units.
 */
async function measureFamily(chromium, fontCss, family, weight, chars) {
	const markup = `<style>${fontCss}</style>`;

	// Fonts are fetched lazily, so the face must be explicitly loaded before it
	// can be measured — otherwise the canvas silently reports fallback metrics.
	const expression = `(async () => {
		const spec = '${weight} ${SAMPLE_SIZE}px "${family}"';
		await document.fonts.load(spec, 'ABCWMgq0123');
		await document.fonts.ready;
		const chars = ${JSON.stringify(chars)};
		const canvas = document.createElement('canvas').getContext('2d');
		canvas.font = spec;
		// Compare against a deliberately absent family so a silent fallback is
		// never recorded as real metrics.
		const control = document.createElement('canvas').getContext('2d');
		control.font = '${weight} ${SAMPLE_SIZE}px "__vce_missing_face__"';
		const loaded = canvas.measureText('ABCWMgq').width !== control.measureText('ABCWMgq').width;
		const out = {};
		for (const ch of chars) out[ch] = canvas.measureText(ch).width / ${SAMPLE_SIZE};
		return JSON.stringify({ loaded, out });
	})()`;

	const result = await chromium.evaluate(markup, expression);
	if (!result) return null;
	const parsed = JSON.parse(result);
	if (!parsed.loaded) {
		console.warn(`! ${family} ${weight} did not load; skipping`);
		return null;
	}
	// Round to 4dp — plenty of precision, keeps the file readable.
	const rounded = {};
	for (const [ch, width] of Object.entries(parsed.out)) rounded[ch] = Math.round(width * 10000) / 10000;
	return rounded;
}

if (!existsSync(config.paths.fonts)) {
	console.error(`Font directory not found: ${config.paths.fonts}`);
	process.exitCode = 1;
} else {
	main().catch(async (err) => {
		console.error('Calibration failed:', err.message);
		await closeChromium();
		process.exitCode = 1;
	});
}
