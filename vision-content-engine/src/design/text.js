/**
 * Typography measurement, wrapping and shrink-to-fit.
 *
 * Composition happens outside the browser. Where a font has been calibrated
 * (`scripts/calibrate-fonts.mjs` → assets/fonts/metrics.json) real per-glyph
 * advances are used and wrapping is exact; otherwise a heuristic table stands in.
 * Either way the renderer re-measures the finished layout in the browser and
 * asks for a recompose if anything actually overflows, so text is never clipped.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from '../config/env.js';

/** Calibrated advances: family → weight → char → em width. */
const CALIBRATED = loadMetrics();

function loadMetrics() {
	try {
		const file = join(config.paths.fonts, 'metrics.json');
		if (!existsSync(file)) return {};
		return JSON.parse(readFileSync(file, 'utf8')).metrics ?? {};
	} catch {
		return {};
	}
}

/** Picks the calibrated table for a family, snapping to the nearest weight. */
function metricsFor(family, weight) {
	if (!family) return null;
	const byWeight = CALIBRATED[family];
	if (!byWeight) return null;
	if (byWeight[weight]) return byWeight[weight];
	const available = Object.keys(byWeight).map(Number).filter(Number.isFinite);
	if (!available.length) return null;
	const nearest = available.reduce((a, b) => (Math.abs(b - weight) < Math.abs(a - weight) ? b : a));
	return byWeight[nearest];
}

// Advance widths in em units at weight 400.
const NARROW = "iíìjl.,'’`!|:;[]{}()/\\ft ";
const WIDE = 'mwMW@%';
const UPPER = /[A-ZÀ-ÞĀ-Ž]/;
const DIGIT = /[0-9]/;

const CHAR_WIDTHS = {
	' ': 0.26,
	i: 0.26,
	j: 0.29,
	l: 0.27,
	I: 0.31,
	t: 0.36,
	f: 0.34,
	r: 0.4,
	'.': 0.29,
	',': 0.29,
	':': 0.29,
	';': 0.29,
	'!': 0.3,
	"'": 0.22,
	'’': 0.22,
	'"': 0.36,
	'|': 0.28,
	'(': 0.35,
	')': 0.35,
	'[': 0.35,
	']': 0.35,
	'/': 0.4,
	'\\': 0.4,
	'-': 0.38,
	'–': 0.55,
	'—': 0.85,
	'·': 0.32,
	m: 0.88,
	w: 0.78,
	M: 0.92,
	W: 0.95,
	'@': 1.0,
	'%': 0.88,
};

function charWidth(ch) {
	const known = CHAR_WIDTHS[ch];
	if (known !== undefined) return known;
	if (DIGIT.test(ch)) return 0.57;
	if (UPPER.test(ch)) return 0.68;
	if (NARROW.includes(ch)) return 0.3;
	if (WIDE.includes(ch)) return 0.88;
	// Default lowercase / unknown glyph.
	return 0.55;
}

const WEIGHT_FACTOR = { 300: 0.982, 400: 1, 500: 1.012, 600: 1.028, 700: 1.045, 800: 1.062 };

// Calibrated advances ignore kerning, which pulls real strings very slightly
// tighter. A small margin keeps the estimate on the safe side of the truth.
const KERN_MARGIN = 1.01;

/**
 * Rendered width in px. Exact for calibrated families, estimated otherwise.
 * @param {string} text
 * @param {{fontSize:number, weight?:number, tracking?:number, uppercase?:boolean, family?:string}} opts
 */
export function measureText(text, { fontSize, weight = 400, tracking = 0, uppercase = false, family } = {}) {
	if (!text) return 0;
	const value = uppercase ? String(text).toUpperCase() : String(text);
	const table = metricsFor(family, weight);

	let em = 0;
	if (table) {
		for (const ch of value) em += table[ch] ?? table.n ?? charWidth(ch);
		em *= KERN_MARGIN;
	} else {
		for (const ch of value) em += charWidth(ch);
		em *= WEIGHT_FACTOR[weight] ?? 1;
	}
	// tracking is in em and applies between glyphs.
	return em * fontSize + tracking * fontSize * Math.max(0, value.length - 1);
}

/** Greedy word wrap. Long unbreakable tokens are hard-split so nothing escapes. */
export function wrapText(text, { maxWidth, fontSize, weight = 400, tracking = 0, uppercase = false, family }) {
	const source = String(text ?? '').replace(/\s+/g, ' ').trim();
	if (!source) return [];
	const opts = { fontSize, weight, tracking, uppercase, family };
	const lines = [];
	let current = '';

	const pushCurrent = () => {
		if (current) lines.push(current);
		current = '';
	};

	for (const word of source.split(' ')) {
		const candidate = current ? `${current} ${word}` : word;
		if (measureText(candidate, opts) <= maxWidth) {
			current = candidate;
			continue;
		}
		pushCurrent();
		if (measureText(word, opts) <= maxWidth) {
			current = word;
			continue;
		}
		// Word alone is too wide — split it character by character.
		let chunk = '';
		for (const ch of word) {
			if (measureText(chunk + ch, opts) > maxWidth && chunk) {
				lines.push(chunk);
				chunk = ch;
			} else {
				chunk += ch;
			}
		}
		current = chunk;
	}
	pushCurrent();
	return lines;
}

export function truncate(text, { maxWidth, fontSize, weight = 400, tracking = 0, uppercase = false, family }) {
	const opts = { fontSize, weight, tracking, uppercase, family };
	const source = String(text ?? '').trim();
	if (!source || measureText(source, opts) <= maxWidth) return source;
	let out = '';
	for (const ch of source) {
		if (measureText(`${out + ch}…`, opts) > maxWidth) break;
		out += ch;
	}
	return `${out.trimEnd()}…`;
}

/**
 * Shrink-to-fit: reduces size until the text fits `maxLines` within `maxWidth`,
 * then truncates the final line if it still cannot fit. Returns the chosen size
 * so callers can lay out downstream elements against real values.
 *
 * @returns {{lines:string[], fontSize:number, width:number, height:number, truncated:boolean}}
 */
export function fitText(
	text,
	{
		maxWidth,
		maxLines = 3,
		fontSize,
		minFontSize = fontSize * 0.6,
		lineHeight = 1.12,
		weight = 400,
		tracking = 0,
		uppercase = false,
		family,
		step = 0.96,
	},
) {
	const source = String(text ?? '').trim();
	if (!source) {
		return { lines: [], fontSize, width: 0, height: 0, truncated: false };
	}
	let size = fontSize;
	let lines = [];
	while (size >= minFontSize) {
		lines = wrapText(source, { maxWidth, fontSize: size, weight, tracking, uppercase, family });
		if (lines.length <= maxLines) break;
		size = size * step;
	}
	let truncated = false;
	if (lines.length > maxLines) {
		const kept = lines.slice(0, maxLines);
		const remainder = lines.slice(maxLines - 1).join(' ');
		kept[maxLines - 1] = truncate(remainder, {
			maxWidth,
			fontSize: size,
			weight,
			tracking,
			uppercase,
			family,
		});
		lines = kept;
		truncated = true;
	}
	const width = Math.max(0, ...lines.map((line) => measureText(line, { fontSize: size, weight, tracking, uppercase, family })));
	return {
		lines,
		fontSize: Math.round(size * 100) / 100,
		width,
		height: lines.length * size * lineHeight,
		truncated,
	};
}

/** Title-cases a value for display without mangling model numbers or acronyms. */
export function displayCase(value) {
	const source = String(value ?? '').trim();
	if (!source) return '';
	if (source === source.toUpperCase()) return source;
	return source.replace(/\b[a-z]/g, (m) => m.toUpperCase());
}
