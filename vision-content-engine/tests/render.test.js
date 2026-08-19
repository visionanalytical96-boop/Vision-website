/**
 * Rendering integration tests: every template family, at every shape, in every
 * output format, must produce a valid image that passes layout validation.
 *
 * Skipped automatically when no rasteriser is installed, so the suite still runs
 * on a machine without Chromium.
 */
import { strict as assert } from 'node:assert';
import { after, before, describe, it } from 'node:test';

import { DEFAULT_BRANDING } from '../src/config/branding.js';
import { buildContent } from '../src/domain/content.js';
import { resolveCanvas } from '../src/domain/formats.js';
import { FAMILY_KEYS } from '../src/design/templates/index.js';
import { closeChromium, detectBackends, renderComposition } from '../src/render/renderer.js';
import { inspectImage } from '../src/render/image-info.js';

const PRODUCT = {
	name: 'Agilent 1260 Infinity II HPLC System',
	brand: 'Agilent',
	model: '1260 Infinity II',
	description: 'Refurbished quaternary HPLC with diode array detection for pharmaceutical QC.',
	detector: 'DAD (G7115A)',
	pump: 'Quaternary G7111B',
	autosampler: 'Vialsampler G7129A',
	software: 'OpenLab CDS 2.x',
	condition: 'Refurbished — Excellent',
	warranty: '12 Months',
	partNumber: 'VA-1260-002',
	price: 'On Request',
	stockStatus: 'In Stock',
	features: ['Installation and qualification included', 'On-site training', '12-month warranty'],
	applications: ['Pharmaceutical QC', 'Method development'],
};

const CATEGORY = { name: 'Refurbished HPLC', kind: 'product', slug: 'hplc' };

let available = false;

before(async () => {
	const { backends } = await detectBackends();
	available = backends.some((b) => b.name !== 'svg');
});

after(async () => {
	await closeChromium();
});

const render = (family, formatPreset, outputFormat = 'png', product = PRODUCT) => {
	const template = { slug: family, family, theme: family.includes('white') ? 'light' : 'dark', config: {} };
	const canvas = resolveCanvas({ formatPreset });
	const content = buildContent(product, { category: CATEGORY, template, branding: DEFAULT_BRANDING });
	return renderComposition({ template, content, canvas, branding: DEFAULT_BRANDING, outputFormat });
};

describe('rendering', { concurrency: false }, () => {
	it('every template family renders and validates', async (t) => {
		if (!available) return t.skip('no rasteriser available');
		for (const family of FAMILY_KEYS) {
			const preset = family === 'social-story' ? 'story' : 'instagram-square';
			const result = await render(family, preset);
			assert.ok(result.validation.ok, `${family}: ${result.validation.errors.join('; ')}`);
			assert.ok(result.buffer.length > 5000, `${family}: output is implausibly small`);
			const info = inspectImage(result.buffer);
			assert.equal(info.format, 'png', `${family}: wrong encoding`);
			assert.equal(info.width, 1080, `${family}: wrong width`);
		}
	});

	it('produces PNG, JPEG and WebP at the requested dimensions', async (t) => {
		if (!available) return t.skip('no rasteriser available');
		for (const [format, expected] of [['png', 'png'], ['jpeg', 'jpeg'], ['webp', 'webp'], ['jpg', 'jpeg']]) {
			const result = await render('premium-product', 'instagram-square', format);
			const info = inspectImage(result.buffer);
			assert.equal(info.format, expected, `${format} produced ${info.format}`);
			assert.equal(info.width, 1080);
			assert.equal(info.height, 1080);
		}
	});

	it('adapts to every aspect ratio without overflow', async (t) => {
		if (!available) return t.skip('no rasteriser available');
		const presets = ['instagram-square', 'instagram-portrait', 'story', 'facebook-post', 'website-banner', 'product-card'];
		for (const preset of presets) {
			const result = await render('premium-product', preset);
			assert.ok(result.validation.ok, `${preset}: ${result.validation.errors.join('; ')}`);
			const canvas = resolveCanvas({ formatPreset: preset });
			const info = inspectImage(result.buffer);
			assert.equal(info.width, canvas.width, `${preset} width`);
			assert.equal(info.height, canvas.height, `${preset} height`);
		}
	});

	it('fits an unreasonably long headline rather than clipping it', async (t) => {
		if (!available) return t.skip('no rasteriser available');
		const result = await render('premium-product', 'instagram-square', 'png', {
			...PRODUCT,
			name: 'Agilent 1260 Infinity II Quaternary High Performance Liquid Chromatography System With Diode Array Detection And Vialsampler',
		});
		assert.ok(result.validation.ok, result.validation.errors.join('; '));
	});

	it('renders a product with no image and warns rather than failing', async (t) => {
		if (!available) return t.skip('no rasteriser available');
		const result = await render('premium-product', 'instagram-square', 'png', { name: 'Bare Product' });
		assert.ok(result.validation.ok, result.validation.errors.join('; '));
		assert.ok(result.buffer.length > 5000);
	});
});
