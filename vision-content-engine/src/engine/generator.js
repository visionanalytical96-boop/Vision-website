/**
 * Generation pipeline.
 *
 * Resolves product + template + branding into a rendered, validated and stored
 * image, recording a content item at every state transition so a failure is
 * always inspectable and retryable.
 */
import { mergeBranding } from '../config/branding.js';
import { config } from '../config/env.js';
import { categories, content, products, settings, templates } from '../db/repositories.js';
import { buildContent } from '../domain/content.js';
import { normaliseOutputFormat, resolveCanvas } from '../domain/formats.js';
import { composeTemplate } from '../design/templates/index.js';
import { toImageAsset } from '../render/image-info.js';
import { renderComposition } from '../render/renderer.js';
import { log } from './logger.js';
import { recordSelection, selectNext } from './rotation.js';
import { readStored, saveGenerated } from './storage.js';

/** Branding as configured by the administrator, over the built-in defaults. */
export function currentBranding() {
	return mergeBranding(settings.get('branding', {}));
}

/** Loads the product hero image and the brand logo as embeddable assets. */
function loadAssets(product, branding) {
	const assets = {};

	const imageKey = Array.isArray(product?.images) ? product.images[0] : null;
	if (imageKey) {
		const buffer = readStored(typeof imageKey === 'string' ? imageKey : imageKey?.key);
		if (buffer) {
			const asset = toImageAsset(buffer);
			if (asset) assets.product = asset;
			else log.warn('generate.image', 'Product image could not be decoded', { productId: product.id });
		} else {
			log.warn('generate.image', 'Product image is missing from storage', { productId: product.id });
		}
	}

	if (branding.logoPath) {
		const buffer = readStored(branding.logoPath);
		if (buffer) {
			const asset = toImageAsset(buffer);
			if (asset) assets.logo = asset;
		}
	}

	return assets;
}

/** Resolves the canvas from explicit options, falling back to the template. */
function canvasFor(template, options) {
	return resolveCanvas({
		formatPreset: options.formatPreset ?? template.format_preset,
		width: options.width ?? template.width,
		height: options.height ?? template.height,
	});
}

function buildModel({ product, template, category, overrides }) {
	const branding = currentBranding();
	return {
		branding,
		model: buildContent(product, { category, template, branding, overrides }),
	};
}

/**
 * Renders without persisting — used by the preview screen.
 * @returns {{svg:string, canvas:object}}
 */
export function previewSvg({ productId, templateId, categoryId = null, formatPreset, width, height, overrides = {} }) {
	const product = products.find(productId);
	const template = templates.find(templateId);
	if (!product) throw new Error('Product not found');
	if (!template) throw new Error('Template not found');
	const category = categoryId ? categories.find(categoryId) : product.category_id ? categories.find(product.category_id) : null;

	const canvas = canvasFor(template, { formatPreset, width, height });
	const { branding, model } = buildModel({ product, template, category, overrides });
	const assets = loadAssets(product, branding);

	return {
		canvas,
		svg: composeTemplate({ template, content: model, canvas, branding, assets }),
	};
}

/**
 * Full generation. Creates (or reuses) a content item, renders, validates and
 * stores the artefact.
 *
 * @returns {Promise<{content:object, validation:object, backend:string}>}
 */
export async function generate({
	productId,
	templateId,
	categoryId = null,
	formatPreset = null,
	outputFormat = null,
	width = null,
	height = null,
	overrides = {},
	origin = 'manual',
	contentId = null,
	scheduledFor = null,
} = {}) {
	const product = products.find(productId);
	if (!product) throw new Error('Product not found');
	const template = templates.find(templateId);
	if (!template) throw new Error('Template not found');

	const category = categoryId
		? categories.find(categoryId)
		: product.category_id
			? categories.find(product.category_id)
			: null;

	const canvas = canvasFor(template, { formatPreset, width, height });
	const format = normaliseOutputFormat(outputFormat ?? template.output_format ?? config.render.defaultFormat);
	const { branding, model } = buildModel({ product, template, category, overrides });

	// A content record exists before rendering so a crash mid-render is visible.
	let item =
		(contentId ? content.find(contentId) : null) ??
		content.create({
			productId: product.id,
			templateId: template.id,
			categoryId: category?.id ?? null,
			title: overrides.title ?? product.name,
			description: overrides.description ?? product.description ?? '',
			tags: product.tags ?? [],
			formatPreset: canvas.preset,
			outputFormat: format,
			width: canvas.width,
			height: canvas.height,
			status: 'generating',
			scheduledFor,
			origin,
		});

	item = content.setStatus(item.id, 'generating');
	log.info('generate.start', `Generating "${item.title}"`, {
		contentId: item.id,
		template: template.slug,
		product: product.slug,
		format,
		size: `${canvas.width}x${canvas.height}`,
	});

	try {
		const assets = loadAssets(product, branding);
		const result = await renderComposition({
			template,
			content: model,
			canvas,
			branding,
			assets,
			outputFormat: format,
		});

		if (!result.validation.ok) {
			// Validation failures are a hard stop: nothing half-broken is stored.
			throw new Error(`Layout validation failed: ${result.validation.errors.join('; ')}`);
		}

		const stored = saveGenerated(result.buffer, {
			category: category?.slug ?? 'content',
			product: product.slug,
			template: template.slug,
			outputFormat: result.format,
		});

		item = content.setStatus(item.id, 'generated', {
			fileName: stored.key,
			fileSize: stored.size,
			checksum: stored.checksum,
			generatedAt: new Date().toISOString(),
			validation: { warnings: result.validation.warnings, attempts: result.attempts, backend: result.backend },
			error: null,
		});

		recordSelection({ product, template, category });

		log.info('generate.success', `Generated "${item.title}"`, {
			contentId: item.id,
			file: stored.fileName,
			bytes: stored.size,
			backend: result.backend,
			attempts: result.attempts,
			warnings: result.validation.warnings,
		});

		return { content: item, validation: result.validation, backend: result.backend };
	} catch (err) {
		item = content.setStatus(item.id, 'failed', { error: err.message });
		log.error('generate.failed', err.message, { contentId: item.id, template: template.slug, product: product.slug });
		throw Object.assign(new Error(`Generation failed: ${err.message}`), { contentId: item.id });
	}
}

/**
 * Chooses what to publish next and generates it. Used by the scheduler and by
 * the "surprise me" action in the admin UI.
 */
export async function generateNext({ categoryId = null, origin = 'scheduler', scheduledFor = null } = {}) {
	const rotationSettings = settings.get('rotation', {});
	const selection = selectNext({ categoryId, settings: rotationSettings });
	if (!selection) {
		log.warn('generate.none', 'No eligible product/template combination was found');
		return null;
	}
	return generate({
		productId: selection.product.id,
		templateId: selection.template.id,
		categoryId: selection.category?.id ?? null,
		origin,
		scheduledFor,
	});
}

/** Re-runs generation for a failed or superseded item, keeping its identity. */
export async function regenerate(contentId, overrides = {}) {
	const item = content.find(contentId);
	if (!item) throw new Error('Content item not found');
	return generate({
		productId: item.product_id,
		templateId: overrides.templateId ?? item.template_id,
		categoryId: overrides.categoryId ?? item.category_id,
		formatPreset: overrides.formatPreset ?? item.format_preset,
		outputFormat: overrides.outputFormat ?? item.output_format,
		width: overrides.width ?? item.width,
		height: overrides.height ?? item.height,
		overrides: overrides.content ?? {},
		origin: item.origin,
		contentId: item.id,
	});
}
