/**
 * Unit tests for the pure logic: text fitting, layout, image inspection,
 * storage naming, content mapping, validation and scheduling.
 *
 * These run without a browser or database. Rendering is covered separately by
 * tests/render.test.js, which is skipped when no rasteriser is present.
 *
 *   node --test tests/
 */
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { fitText, measureText, truncate, wrapText } from '../src/design/text.js';
import { columns, grid, resolveLayout, Stack } from '../src/design/layout.js';
import { safeArea, themePalette, typeScale } from '../src/design/tokens.js';
import { containFit, escapeXml } from '../src/design/svg.js';
import { DEFAULT_BRANDING, mergeBranding } from '../src/config/branding.js';
import { buildContent } from '../src/domain/content.js';
import { fileExtension, normaliseOutputFormat, resolveCanvas, shapeFor } from '../src/domain/formats.js';
import { slugify } from '../src/domain/categories.js';
import { inspectImage } from '../src/render/image-info.js';
import { validateEncodedImage, validateMeasurements } from '../src/render/validate.js';
import { buildFileName } from '../src/engine/storage.js';
import { dueSlots, zonedParts } from '../src/engine/scheduler.js';

/* ------------------------------------------------------------------ */

describe('text measurement and fitting', () => {
	it('measures wider strings as wider', () => {
		const opts = { fontSize: 40, weight: 700 };
		assert.ok(measureText('WWWWW', opts) > measureText('iiiii', opts));
	});

	it('scales linearly with font size', () => {
		const a = measureText('Vision Analytical', { fontSize: 20 });
		const b = measureText('Vision Analytical', { fontSize: 40 });
		assert.ok(Math.abs(b / a - 2) < 0.01, `expected ~2x, got ${b / a}`);
	});

	it('adds letter spacing between glyphs only', () => {
		const plain = measureText('ABCD', { fontSize: 10 });
		const tracked = measureText('ABCD', { fontSize: 10, tracking: 0.1 });
		assert.ok(Math.abs(tracked - plain - 3) < 0.001, 'three gaps at 1px each');
	});

	it('wraps within the given width', () => {
		const lines = wrapText('Agilent 1260 Infinity II HPLC System for pharmaceutical QC', {
			maxWidth: 200,
			fontSize: 20,
		});
		assert.ok(lines.length > 1);
		for (const line of lines) {
			assert.ok(measureText(line, { fontSize: 20 }) <= 200, `"${line}" exceeds the column`);
		}
	});

	it('hard-splits a single word too wide to fit', () => {
		const lines = wrapText('Supercalifragilisticexpialidocious', { maxWidth: 40, fontSize: 20 });
		assert.ok(lines.length > 1);
		assert.ok(lines.every((l) => measureText(l, { fontSize: 20 }) <= 40));
	});

	it('shrinks to honour the line limit', () => {
		const long = 'Shimadzu Nexera X2 UHPLC High Throughput Analytical Platform System';
		const fit = fitText(long, { maxWidth: 300, maxLines: 2, fontSize: 48, minFontSize: 10 });
		assert.ok(fit.lines.length <= 2);
		assert.ok(fit.fontSize < 48, 'expected the size to be reduced');
		assert.ok(fit.width <= 300);
	});

	it('truncates with an ellipsis rather than overflowing', () => {
		const out = truncate('Deuterium Lamp for Ultraviolet Detectors', { maxWidth: 80, fontSize: 16 });
		assert.ok(out.endsWith('…'));
		assert.ok(measureText(out, { fontSize: 16 }) <= 80);
	});

	it('returns an empty result for blank input', () => {
		assert.deepEqual(fitText('', { maxWidth: 100, fontSize: 20 }).lines, []);
		assert.deepEqual(wrapText(null, { maxWidth: 100, fontSize: 20 }), []);
	});
});

/* ------------------------------------------------------------------ */

describe('layout', () => {
	const canvases = [
		{ width: 1080, height: 1080, shape: 'square' },
		{ width: 1080, height: 1350, shape: 'portrait' },
		{ width: 1080, height: 1920, shape: 'vertical' },
		{ width: 1200, height: 630, shape: 'landscape' },
		{ width: 1920, height: 640, shape: 'wide' },
	];

	it('keeps every region inside the canvas', () => {
		for (const canvas of canvases) {
			const l = resolveLayout(canvas);
			for (const [name, box] of Object.entries({ header: l.header, footer: l.footer, media: l.media, content: l.content })) {
				if (!box) continue;
				assert.ok(box.x >= 0, `${canvas.shape} ${name} x`);
				assert.ok(box.y >= 0, `${canvas.shape} ${name} y`);
				assert.ok(box.x + box.width <= canvas.width + 1, `${canvas.shape} ${name} right edge`);
				assert.ok(box.y + box.height <= canvas.height + 1, `${canvas.shape} ${name} bottom edge`);
				assert.ok(box.width > 0 && box.height > 0, `${canvas.shape} ${name} is empty`);
			}
		}
	});

	it('splits into columns for wide shapes and stacks otherwise', () => {
		assert.equal(resolveLayout(canvases[0]).mode, 'stack');
		assert.equal(resolveLayout(canvases[4]).mode, 'split');
	});

	it('never overlaps media and content', () => {
		for (const canvas of canvases) {
			const { media, content } = resolveLayout(canvas);
			if (!media) continue;
			const disjoint =
				media.x + media.width <= content.x + 1 ||
				content.x + content.width <= media.x + 1 ||
				media.y + media.height <= content.y + 1 ||
				content.y + content.height <= media.y + 1;
			assert.ok(disjoint, `${canvas.shape}: media and content overlap`);
		}
	});

	it('omits the media region when medialess', () => {
		const l = resolveLayout(canvases[0], { medialess: true });
		assert.equal(l.media, null);
		assert.equal(l.content, l.inner);
	});

	it('Stack hands out non-overlapping boxes and tracks capacity', () => {
		const stack = new Stack({ x: 0, y: 0, width: 100, height: 100 }, 10);
		const a = stack.take(30);
		const b = stack.take(30);
		assert.equal(a.y, 0);
		assert.equal(b.y, 40, 'second box sits below the first plus the gap');
		assert.equal(stack.remaining, 30);
		assert.ok(!stack.fits(40));
		assert.ok(stack.fits(20));
	});

	it('columns and grid tile without overlap', () => {
		const box = { x: 0, y: 0, width: 100, height: 100 };
		const cols = columns(box, 3, 10);
		assert.equal(cols.length, 3);
		assert.ok(cols[1].x >= cols[0].x + cols[0].width);
		const cells = grid(box, { cols: 2, rows: 2, gutterX: 10, gutterY: 10 });
		assert.equal(cells.length, 4);
		assert.ok(cells[3].x + cells[3].width <= 100.001);
	});

	it('gives every shape a positive safe area', () => {
		for (const canvas of canvases) {
			const safe = safeArea(canvas);
			assert.ok(safe.width > 0 && safe.height > 0);
			assert.ok(safe.right <= canvas.width && safe.bottom <= canvas.height);
		}
	});

	it('scales type with the canvas', () => {
		const small = typeScale({ width: 540, height: 540, shape: 'square' });
		const large = typeScale({ width: 1080, height: 1080, shape: 'square' });
		assert.ok(large.h1 > small.h1);
	});
});

/* ------------------------------------------------------------------ */

describe('image handling', () => {
	it('never distorts: contain-fit preserves aspect ratio', () => {
		const fit = containFit({ box: { x: 0, y: 0, width: 100, height: 100 }, naturalWidth: 200, naturalHeight: 100 });
		assert.equal(fit.width / fit.height, 2);
		assert.ok(fit.width <= 100 && fit.height <= 100);
	});

	it('centres the fitted image in its box', () => {
		const fit = containFit({ box: { x: 0, y: 0, width: 100, height: 100 }, naturalWidth: 200, naturalHeight: 100 });
		assert.equal(fit.x, 0);
		assert.equal(fit.y, 25);
	});

	it('reads PNG dimensions', () => {
		// 1x1 transparent PNG.
		const png = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
			'base64',
		);
		assert.deepEqual(inspectImage(png), { format: 'png', mime: 'image/png', width: 1, height: 1 });
	});

	it('reads SVG dimensions from a viewBox', () => {
		const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 150"></svg>');
		const info = inspectImage(svg);
		assert.equal(info.width, 300);
		assert.equal(info.height, 150);
	});

	it('rejects non-image bytes', () => {
		assert.equal(inspectImage(Buffer.from('this is not an image at all')), null);
		assert.equal(inspectImage(Buffer.alloc(0)), null);
	});

	it('escapes XML so product text cannot break the document', () => {
		assert.equal(escapeXml('A & B <tag> "q"'), 'A &amp; B &lt;tag&gt; &quot;q&quot;');
	});
});

/* ------------------------------------------------------------------ */

describe('output formats', () => {
	it('normalises jpg to jpeg and rejects unknowns', () => {
		assert.equal(normaliseOutputFormat('jpg'), 'jpeg');
		assert.equal(normaliseOutputFormat('JPEG'), 'jpeg');
		assert.equal(normaliseOutputFormat('gif'), 'png');
	});

	it('maps jpeg back to a .jpg extension', () => {
		assert.equal(fileExtension('jpeg'), 'jpg');
		assert.equal(fileExtension('webp'), 'webp');
	});

	it('classifies aspect ratios', () => {
		assert.equal(shapeFor(1080, 1080), 'square');
		assert.equal(shapeFor(1080, 1920), 'vertical');
		assert.equal(shapeFor(1920, 640), 'wide');
		assert.equal(shapeFor(1200, 630), 'landscape');
		assert.equal(shapeFor(1080, 1350), 'portrait');
	});

	it('resolves a named preset', () => {
		const canvas = resolveCanvas({ formatPreset: 'story' });
		assert.deepEqual([canvas.width, canvas.height, canvas.shape], [1080, 1920, 'vertical']);
	});

	it('falls back to explicit dimensions', () => {
		const canvas = resolveCanvas({ formatPreset: 'nope', width: 800, height: 400 });
		assert.equal(canvas.width, 800);
		assert.equal(canvas.shape, 'landscape');
	});
});

/* ------------------------------------------------------------------ */

describe('content model', () => {
	const product = {
		name: 'Agilent 1260 HPLC',
		brand: 'Agilent',
		model: '1260',
		detector: 'DAD',
		pump: 'Quaternary',
		specifications: [{ label: 'Detector', value: 'Should win over the derived value' }],
		features: ['One', 'Two'],
		price: 'On Request',
		stockStatus: 'In Stock',
	};

	it('derives specs from product fields', () => {
		const c = buildContent(product, { category: { kind: 'product' }, template: { config: {} }, branding: DEFAULT_BRANDING });
		const labels = c.specs.map((s) => s.label);
		assert.ok(labels.includes('Pump'));
		assert.equal(c.subtitle, 'Agilent · 1260');
	});

	it('prefers explicit specifications over derived duplicates', () => {
		const c = buildContent(product, { category: { kind: 'product' }, template: { config: {} }, branding: DEFAULT_BRANDING });
		const detector = c.specs.filter((s) => s.label.toLowerCase() === 'detector');
		assert.equal(detector.length, 1, 'no duplicate label');
		assert.match(detector[0].value, /Should win/);
	});

	it('chooses a CTA appropriate to the category kind', () => {
		const base = { template: { config: {} }, branding: DEFAULT_BRANDING };
		assert.match(buildContent(product, { ...base, category: { kind: 'service' } }).cta, /Service/i);
		assert.match(buildContent(product, { ...base, category: { kind: 'part' } }).cta, /Enquire/i);
	});

	it('lets template config and overrides win', () => {
		const c = buildContent(product, {
			category: { kind: 'product' },
			template: { config: { ctaLabel: 'Call Now' } },
			branding: DEFAULT_BRANDING,
			overrides: { title: 'Custom Headline' },
		});
		assert.equal(c.cta, 'Call Now');
		assert.equal(c.title, 'Custom Headline');
	});

	it('suppresses price when the template disables it', () => {
		const c = buildContent(product, {
			category: { kind: 'product' },
			template: { config: { showPrice: false } },
			branding: DEFAULT_BRANDING,
		});
		assert.equal(c.price, '');
	});

	it('tolerates a sparse product', () => {
		const c = buildContent({ name: 'Bare' }, { template: { config: {} }, branding: DEFAULT_BRANDING });
		assert.equal(c.title, 'Bare');
		assert.deepEqual(c.specs, []);
	});
});

/* ------------------------------------------------------------------ */

describe('branding', () => {
	it('merges nested overrides over the defaults', () => {
		const merged = mergeBranding({ name: 'Custom', contact: { phone: '+91 1' } });
		assert.equal(merged.name, 'Custom');
		assert.equal(merged.contact.phone, '+91 1');
		assert.equal(merged.contact.email, DEFAULT_BRANDING.contact.email, 'untouched keys survive');
	});

	it('returns the defaults for empty input', () => {
		assert.equal(mergeBranding(null).name, DEFAULT_BRANDING.name);
	});

	it('produces distinct light and dark palettes', () => {
		const dark = themePalette(DEFAULT_BRANDING, 'dark');
		const light = themePalette(DEFAULT_BRANDING, 'light');
		assert.notEqual(dark.bg, light.bg);
		assert.equal(light.theme, 'light');
	});
});

/* ------------------------------------------------------------------ */

describe('quality validation', () => {
	const canvas = { width: 1080, height: 1080 };

	it('passes a clean layout', () => {
		const result = validateMeasurements({
			canvas,
			nodes: [
				{ role: 'headline', text: 'Fits', x: 80, y: 80, width: 400, height: 60, fitW: 500, fitH: null },
				{ role: 'product-image', x: 100, y: 200, width: 400, height: 400 },
			],
		});
		assert.ok(result.ok, result.errors.join('; '));
	});

	it('flags text that overflows its column', () => {
		const result = validateMeasurements({
			canvas,
			nodes: [{ role: 'headline', text: 'Too wide', x: 80, y: 80, width: 700, height: 60, fitW: 500 }],
		});
		assert.ok(!result.ok);
		assert.match(result.errors[0], /overflows/);
		assert.ok(result.overflowRatio > 1.3);
	});

	it('flags elements past the canvas edge', () => {
		const result = validateMeasurements({
			canvas,
			nodes: [{ role: 'cta', text: 'Off', x: 900, y: 80, width: 400, height: 60 }],
		});
		assert.ok(!result.ok);
		assert.match(result.errors.join(' '), /canvas edge/);
	});

	it('flags overlapping text blocks', () => {
		const result = validateMeasurements({
			canvas,
			nodes: [
				{ role: 'headline', text: 'A', x: 80, y: 80, width: 300, height: 100 },
				{ role: 'subheading', text: 'B', x: 80, y: 100, width: 300, height: 100 },
			],
		});
		assert.ok(!result.ok);
		assert.match(result.errors.join(' '), /overlaps/);
	});

	it('warns rather than fails when the product image is missing', () => {
		const result = validateMeasurements({
			canvas,
			nodes: [{ role: 'headline', text: 'A', x: 0, y: 0, width: 100, height: 20 }],
		});
		assert.ok(result.ok);
		assert.match(result.warnings.join(' '), /No product image/);
	});

	it('rejects empty or malformed encoded output', () => {
		assert.ok(!validateEncodedImage(Buffer.alloc(0), 'png').ok);
		assert.ok(!validateEncodedImage(Buffer.alloc(200), 'png').ok, 'implausibly small');
		const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(2000)]);
		assert.ok(validateEncodedImage(png, 'png').ok);
		assert.ok(!validateEncodedImage(png, 'jpeg').ok, 'signature must match the claimed format');
	});
});

/* ------------------------------------------------------------------ */

describe('storage naming', () => {
	it('builds a descriptive, dated filename', () => {
		const name = buildFileName({
			category: 'Instrument Sale',
			product: 'Agilent 1260',
			template: 'Premium Product',
			outputFormat: 'png',
			at: new Date('2026-08-18T10:00:00Z'),
		});
		assert.match(name, /^instrument-sale-agilent-1260-premium-product-20260818-100000-[0-9a-f]{4}\.png$/);
	});

	it('produces a unique name on each call', () => {
		const args = { category: 'c', product: 'p', template: 't', outputFormat: 'png', at: new Date() };
		const names = new Set(Array.from({ length: 50 }, () => buildFileName(args)));
		assert.ok(names.size > 45, 'filenames should not collide');
	});

	it('uses .jpg for jpeg output', () => {
		assert.ok(buildFileName({ category: 'c', product: 'p', template: 't', outputFormat: 'jpeg' }).endsWith('.jpg'));
	});

	it('slugifies awkward names safely', () => {
		assert.equal(slugify('IQ/OQ/PQ Qualification!'), 'iqoqpq-qualification');
		assert.equal(slugify('  Multiple   Spaces  '), 'multiple-spaces');
	});
});

/* ------------------------------------------------------------------ */

describe('scheduling', () => {
	it('converts UTC to the configured zone', () => {
		// 04:30 UTC is 10:00 in Asia/Kolkata (UTC+5:30).
		const parts = zonedParts(new Date('2026-08-18T04:30:00Z'), 'Asia/Kolkata');
		assert.equal(parts.hour, 10);
		assert.equal(parts.minute, 0);
		assert.equal(parts.date, '2026-08-18');
	});

	it('reports no due slots while the scheduler is disabled', () => {
		const slots = dueSlots(new Date('2026-08-18T09:00:00Z'), {
			enabled: false,
			times: ['10:00'],
			timezone: 'Asia/Kolkata',
			days: [0, 1, 2, 3, 4, 5, 6],
		});
		assert.deepEqual(slots, []);
	});

	it('skips days that are not selected', () => {
		// 2026-08-18 is a Tuesday (weekday 2).
		const slots = dueSlots(new Date('2026-08-18T06:00:00Z'), {
			enabled: true,
			times: ['10:00'],
			timezone: 'Asia/Kolkata',
			days: [0, 6],
		});
		assert.deepEqual(slots, []);
	});
});
