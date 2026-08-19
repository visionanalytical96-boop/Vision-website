/**
 * Rasterisation.
 *
 * Backends are detected at runtime and used in order of capability. Chromium is
 * the reference backend because it also measures rendered text, which is what
 * makes the "no overflow, no overlap" guarantee enforceable. `sharp` and
 * `resvg` are used when installed. If nothing can rasterise, the SVG is still
 * produced so no work is lost.
 */
import { composeTemplate } from '../design/templates/index.js';
import { config } from '../config/env.js';
import { normaliseOutputFormat } from '../domain/formats.js';
import { closeChromium, findChromium, getChromium } from './chromium.js';
import { validateEncodedImage, validateMeasurements } from './validate.js';

const MAX_FIT_ATTEMPTS = 3;

let detected = null;

/** Probes the environment once and caches what is available. */
export async function detectBackends() {
	if (detected) return detected;
	const backends = [];

	const chromiumPath = findChromium();
	if (chromiumPath) {
		backends.push({ name: 'chromium', measures: true, formats: ['png', 'jpeg', 'webp'], detail: chromiumPath });
	}

	const sharp = await optionalImport('sharp');
	if (sharp) backends.push({ name: 'sharp', measures: false, formats: ['png', 'jpeg', 'webp'], module: sharp });

	const resvg = await optionalImport('@resvg/resvg-js');
	if (resvg) backends.push({ name: 'resvg', measures: false, formats: ['png'], module: resvg });

	backends.push({ name: 'svg', measures: false, formats: ['svg'] });

	detected = { backends, chromiumPath };
	return detected;
}

async function optionalImport(specifier) {
	try {
		return await import(specifier);
	} catch {
		return null;
	}
}

function pickBackend(backends, outputFormat) {
	const preference = config.render.backend;
	if (preference && preference !== 'auto') {
		const forced = backends.find((b) => b.name === preference);
		if (forced) return forced;
	}
	return backends.find((b) => b.formats.includes(outputFormat)) ?? backends.at(-1);
}

/**
 * Composes and rasterises a template.
 *
 * @returns {Promise<{buffer:Buffer, format:string, svg:string, backend:string,
 *   validation:object, attempts:number, warnings:string[]}>}
 */
export async function renderComposition({
	template,
	content,
	canvas,
	branding,
	assets = {},
	outputFormat = config.render.defaultFormat,
	validate = true,
}) {
	const format = normaliseOutputFormat(outputFormat);
	const { backends } = await detectBackends();
	const backend = pickBackend(backends, format);

	let typeScaleFactor = 1;
	let lastResult = null;

	for (let attempt = 1; attempt <= MAX_FIT_ATTEMPTS; attempt += 1) {
		const svg = composeTemplate({ template, content, canvas, branding, assets, typeScaleFactor });

		if (backend.name === 'svg') {
			return {
				buffer: Buffer.from(svg, 'utf8'),
				format: 'svg',
				svg,
				backend: 'svg',
				attempts: attempt,
				validation: { ok: true, errors: [], warnings: ['No rasteriser available; SVG emitted instead.'] },
				warnings: ['No rasteriser available; SVG emitted instead.'],
			};
		}

		const { buffer, measurements } = await rasterise(backend, svg, { canvas, format, measure: validate });

		const encoded = validateEncodedImage(buffer, format);
		if (!encoded.ok) throw new Error(encoded.error);

		const validation = validate && measurements ? validateMeasurements(measurements) : { ok: true, errors: [], warnings: [] };
		lastResult = { buffer, svg, validation, attempt };

		if (validation.ok || attempt === MAX_FIT_ATTEMPTS) break;

		// Shrink type just enough to clear the worst overflow, with a floor so a
		// pathological input cannot shrink the design into illegibility.
		const shrink = Math.min(0.92, 1 / (validation.overflowRatio || 1.08));
		typeScaleFactor = Math.max(0.68, typeScaleFactor * shrink);
	}

	const { buffer, svg, validation, attempt } = lastResult;
	return {
		buffer,
		format,
		svg,
		backend: backend.name,
		attempts: attempt,
		validation,
		warnings: validation.warnings ?? [],
	};
}

async function rasterise(backend, svg, { canvas, format, measure }) {
	if (backend.name === 'chromium') {
		const chromium = getChromium();
		if (!chromium) throw new Error('Chromium backend selected but no binary was found');
		return chromium.render(svg, {
			width: canvas.width,
			height: canvas.height,
			format,
			quality: format === 'jpeg' ? config.render.jpegQuality : config.render.webpQuality,
			measure,
		});
	}

	if (backend.name === 'sharp') {
		const sharp = backend.module.default ?? backend.module;
		let pipeline = sharp(Buffer.from(svg), { density: 144 });
		if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: config.render.jpegQuality, mozjpeg: true });
		else if (format === 'webp') pipeline = pipeline.webp({ quality: config.render.webpQuality });
		else pipeline = pipeline.png({ compressionLevel: 9 });
		return { buffer: await pipeline.toBuffer(), measurements: null };
	}

	if (backend.name === 'resvg') {
		const { Resvg } = backend.module;
		const instance = new Resvg(svg, { fitTo: { mode: 'width', value: canvas.width } });
		return { buffer: instance.render().asPng(), measurements: null };
	}

	throw new Error(`Unsupported render backend: ${backend.name}`);
}

/** Renders to SVG only — used by the preview endpoint, which needs no raster. */
export function renderSvgOnly(params) {
	return composeTemplate(params);
}

export { closeChromium };
