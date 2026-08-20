/**
 * REST API.
 *
 * Everything the admin UI and n8n use. Admin-only by default; the published
 * feed and the images it references are the sole public surface.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config, publicAssetUrl } from '../config/env.js';
import { categories, content, logs, products, publications, settings, templates } from '../db/repositories.js';
import { CATEGORY_KINDS } from '../domain/categories.js';
import { FORMAT_PRESETS, normaliseOutputFormat, OUTPUT_FORMATS } from '../domain/formats.js';
import { FAMILY_KEYS } from '../design/templates/index.js';
import { clearFontCache } from '../design/fonts.js';
import { currentBranding, generate, generateNext, previewSvg, regenerate } from '../engine/generator.js';
import { log } from '../engine/logger.js';
import { publishDestinations, publishedFeed, publish, retryPublish } from '../engine/publisher.js';
import { classifyMedia, instagramConfigured } from '../engine/publishers/instagram.js';
import { getSchedule, setSchedule, tick } from '../engine/scheduler.js';
import { DEFAULT_ROTATION } from '../engine/rotation.js';
import { contentTypeFor, formatBytes, readStored, saveUpload, statStored, workspaceUsage } from '../engine/storage.js';
import { detectBackends } from '../render/renderer.js';
import { inspectImage } from '../render/image-info.js';
import { DOCUMENT_FIELDS, DOCUMENT_KEYS } from '../documents/fields.js';
import { composeDocument, generateDocument } from '../documents/generator.js';
import { documents } from '../db/repositories.js';
import { identify, login, logout, requireAdmin } from './auth.js';
import { fail, json, noContent, readBuffer, readJson, Router, send, toId } from './http.js';
import { parseMultipart } from './multipart.js';

export const router = new Router();

/* ------------------------------------------------------------------ *
 * Authentication
 * ------------------------------------------------------------------ */

router.post('/api/auth/login', async (req, res) => {
	const body = await readJson(req);
	const user = await login(res, body);
	if (!user) {
		log.warn('auth.failed', 'Failed login attempt', { email: String(body.email ?? '').slice(0, 80) });
		return fail(res, 401, 'Incorrect email or password');
	}
	log.info('auth.login', `${user.email} signed in`);
	return json(res, 200, { user });
});

router.post('/api/auth/logout', async (req, res) => {
	logout(req, res);
	return noContent(res);
});

router.get('/api/auth/me', async (req, res) => {
	const identity = identify(req);
	if (!identity) return fail(res, 401, 'Not signed in');
	return json(res, 200, { user: { email: identity.email ?? null, role: identity.role, kind: identity.kind } });
});

/* ------------------------------------------------------------------ *
 * Dashboard
 * ------------------------------------------------------------------ */

router.get('/api/dashboard', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const templateList = templates.list();
	const stats = content.stats();
	const usage = await workspaceUsage();
	const { backends } = await detectBackends();
	const schedule = getSchedule();

	return json(res, 200, {
		templates: { total: templateList.length, active: templateList.filter((t) => t.active).length },
		products: { total: products.count(), published: products.count({ status: 'published' }) },
		content: {
			scheduled: stats.byStatus.scheduled ?? 0,
			publishedToday: stats.publishedToday,
			publishedThisMonth: stats.publishedThisMonth,
			failed: stats.failed,
			generated: stats.generated,
			nextScheduled: stats.nextScheduled,
			byStatus: stats.byStatus,
		},
		storage: { bytes: usage.bytes, files: usage.files, human: formatBytes(usage.bytes) },
		renderer: { backends: backends.map((b) => b.name), primary: backends[0]?.name ?? 'none' },
		schedule: { enabled: schedule.enabled, times: schedule.times, timezone: schedule.timezone, autoPublish: schedule.autoPublish },
		autoPublishAllowed: config.publishing.autoPublish,
	});
});

/* ------------------------------------------------------------------ *
 * Reference data
 * ------------------------------------------------------------------ */

router.get('/api/formats', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	return json(res, 200, { presets: FORMAT_PRESETS, outputFormats: OUTPUT_FORMATS, families: FAMILY_KEYS });
});

router.get('/api/categories', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	return json(res, 200, { categories: categories.list(), kinds: CATEGORY_KINDS });
});

router.post('/api/categories', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (!body.name) return fail(res, 400, 'A category name is required');
	if (body.kind && !CATEGORY_KINDS.includes(body.kind)) return fail(res, 400, `kind must be one of: ${CATEGORY_KINDS.join(', ')}`);
	return json(res, 201, { category: categories.create(body) });
});

router.put('/api/categories/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const updated = categories.update(toId(params.id), await readJson(req));
	return updated ? json(res, 200, { category: updated }) : fail(res, 404, 'Category not found');
});

router.delete('/api/categories/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	return categories.remove(toId(params.id)) ? noContent(res) : fail(res, 404, 'Category not found');
});

/* ------------------------------------------------------------------ *
 * Templates
 * ------------------------------------------------------------------ */

router.get('/api/templates', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	return json(res, 200, { templates: templates.list() });
});

router.post('/api/templates', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (!body.name) return fail(res, 400, 'A template name is required');
	if (!FAMILY_KEYS.includes(body.family)) {
		return fail(res, 400, `family must be one of: ${FAMILY_KEYS.join(', ')}`);
	}
	const created = templates.create(body);
	log.info('template.created', `Template "${created.name}" created`, { templateId: created.id });
	return json(res, 201, { template: created });
});

router.get('/api/templates/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const template = templates.find(toId(params.id));
	return template ? json(res, 200, { template }) : fail(res, 404, 'Template not found');
});

router.put('/api/templates/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (body.family && !FAMILY_KEYS.includes(body.family)) {
		return fail(res, 400, `family must be one of: ${FAMILY_KEYS.join(', ')}`);
	}
	const updated = templates.update(toId(params.id), body);
	return updated ? json(res, 200, { template: updated }) : fail(res, 404, 'Template not found');
});

router.post('/api/templates/:id/duplicate', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req).catch(() => ({}));
	const copy = templates.duplicate(toId(params.id), body.name);
	return copy ? json(res, 201, { template: copy }) : fail(res, 404, 'Template not found');
});

router.delete('/api/templates/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	return templates.remove(toId(params.id)) ? noContent(res) : fail(res, 404, 'Template not found');
});

/* ------------------------------------------------------------------ *
 * Products
 * ------------------------------------------------------------------ */

router.get('/api/products', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const url = new URL(req.url, 'http://local');
	return json(res, 200, {
		products: products.list({
			status: url.searchParams.get('status'),
			categoryId: toId(url.searchParams.get('categoryId')),
			search: url.searchParams.get('search'),
			includeArchived: url.searchParams.get('archived') === 'true',
			limit: Math.min(500, Number(url.searchParams.get('limit')) || 200),
			offset: Number(url.searchParams.get('offset')) || 0,
		}),
		total: products.count(),
	});
});

router.post('/api/products', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (!body.name) return fail(res, 400, 'A product name is required');
	const created = products.create(body);
	log.info('product.created', `Product "${created.name}" created`, { productId: created.id });
	return json(res, 201, { product: created });
});

router.get('/api/products/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const product = products.find(toId(params.id));
	return product ? json(res, 200, { product }) : fail(res, 404, 'Product not found');
});

router.put('/api/products/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const updated = products.update(toId(params.id), await readJson(req));
	return updated ? json(res, 200, { product: updated }) : fail(res, 404, 'Product not found');
});

router.post('/api/products/:id/duplicate', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req).catch(() => ({}));
	const copy = products.duplicate(toId(params.id), body.name);
	return copy ? json(res, 201, { product: copy }) : fail(res, 404, 'Product not found');
});

router.post('/api/products/:id/archive', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const archived = products.archive(toId(params.id));
	return archived ? json(res, 200, { product: archived }) : fail(res, 404, 'Product not found');
});

router.post('/api/products/:id/restore', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const restored = products.restore(toId(params.id));
	return restored ? json(res, 200, { product: restored }) : fail(res, 404, 'Product not found');
});

router.delete('/api/products/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	return products.remove(toId(params.id)) ? noContent(res) : fail(res, 404, 'Product not found');
});

/** Image upload. The declared MIME type is not trusted — bytes are sniffed. */
router.post('/api/products/:id/images', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const product = products.find(toId(params.id));
	if (!product) return fail(res, 404, 'Product not found');

	const body = await readBuffer(req);
	const { files } = parseMultipart(body, req.headers['content-type']);
	if (!files.length) return fail(res, 400, 'No file was uploaded');

	const stored = [];
	for (const file of files) {
		const info = inspectImage(file.data);
		if (!info) return fail(res, 415, `"${file.filename}" is not a readable image`);
		if (!config.uploads.allowedMime.includes(info.mime)) {
			return fail(res, 415, `${info.mime} is not an accepted image type`);
		}
		const saved = saveUpload(file.data, { originalName: file.filename });
		stored.push({ key: saved.key, width: info.width, height: info.height, mime: info.mime });
	}

	const images = [...(product.images ?? []), ...stored.map((s) => s.key)];
	const updated = products.update(product.id, { images });
	log.info('product.image', `Uploaded ${stored.length} image(s)`, { productId: product.id });
	return json(res, 201, { product: updated, uploaded: stored });
});

router.delete('/api/products/:id/images/:index', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const product = products.find(toId(params.id));
	if (!product) return fail(res, 404, 'Product not found');
	const index = Number.parseInt(params.index, 10);
	const images = [...(product.images ?? [])];
	if (!Number.isInteger(index) || index < 0 || index >= images.length) {
		return fail(res, 404, 'Image not found');
	}
	images.splice(index, 1);
	// The file itself is retained — generated posts may still reference it.
	return json(res, 200, { product: products.update(product.id, { images }) });
});

/* ------------------------------------------------------------------ *
 * Preview and generation
 * ------------------------------------------------------------------ */

router.post('/api/preview', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (!body.productId || !body.templateId) return fail(res, 400, 'productId and templateId are required');
	try {
		const { svg } = previewSvg({
			productId: toId(body.productId),
			templateId: toId(body.templateId),
			categoryId: toId(body.categoryId),
			formatPreset: body.formatPreset,
			width: body.width,
			height: body.height,
			overrides: body.overrides ?? {},
		});
		// SVG so the preview is instant and costs no rasterisation.
		return send(res, 200, svg, { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'no-store' });
	} catch (err) {
		return fail(res, 400, err.message);
	}
});

router.post('/api/generate', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	try {
		// With no product/template supplied this becomes "pick the next item".
		const outcome =
			body.productId && body.templateId
				? await generate({
						productId: toId(body.productId),
						templateId: toId(body.templateId),
						categoryId: toId(body.categoryId),
						formatPreset: body.formatPreset,
						outputFormat: body.outputFormat ? normaliseOutputFormat(body.outputFormat) : null,
						width: body.width,
						height: body.height,
						overrides: body.overrides ?? {},
						origin: body.origin ?? 'manual',
						scheduledFor: body.scheduledFor ?? null,
					})
				: await generateNext({ categoryId: toId(body.categoryId), origin: body.origin ?? 'manual' });

		if (!outcome) return fail(res, 409, 'No eligible product and template combination was available');

		if (body.publish === true) {
			const published = await publish(outcome.content.id);
			return json(res, 201, { content: published, validation: outcome.validation });
		}
		return json(res, 201, { content: outcome.content, validation: outcome.validation, backend: outcome.backend });
	} catch (err) {
		return fail(res, 422, err.message, { contentId: err.contentId ?? null });
	}
});

/* ------------------------------------------------------------------ *
 * Content items
 * ------------------------------------------------------------------ */

router.get('/api/content', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const url = new URL(req.url, 'http://local');
	const status = url.searchParams.getAll('status');
	const items = content.list({
		status: status.length ? status : null,
		from: url.searchParams.get('from'),
		to: url.searchParams.get('to'),
		limit: Math.min(500, Number(url.searchParams.get('limit')) || 200),
		offset: Number(url.searchParams.get('offset')) || 0,
	});
	return json(res, 200, {
		content: items.map((item) => ({ ...item, imageUrl: item.file_name ? publicAssetUrl(item.file_name) : null })),
	});
});

router.get('/api/content/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const item = content.find(toId(params.id));
	if (!item) return fail(res, 404, 'Content item not found');
	return json(res, 200, {
		content: { ...item, imageUrl: item.file_name ? publicAssetUrl(item.file_name) : null },
		product: item.product_id ? products.find(item.product_id) : null,
		template: item.template_id ? templates.find(item.template_id) : null,
		publications: publications.forContent(item.id),
	});
});

router.post('/api/content/:id/regenerate', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req).catch(() => ({}));
	try {
		const outcome = await regenerate(toId(params.id), body);
		return json(res, 200, { content: outcome.content, validation: outcome.validation });
	} catch (err) {
		return fail(res, 422, err.message);
	}
});

router.post('/api/content/:id/publish', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req).catch(() => ({}));
	const allowed = publishDestinations().map((d) => d.id);
	if (body.destination && !allowed.includes(body.destination)) {
		return fail(res, 400, `destination must be one of: ${allowed.join(', ')}`);
	}
	try {
		const item = await publish(toId(params.id), { destination: body.destination ?? null });
		return item.status === 'published'
			? json(res, 200, { content: item })
			: fail(res, 502, item.error ?? 'Publishing failed', { content: item });
	} catch (err) {
		return fail(res, 422, err.message);
	}
});

router.post('/api/content/:id/retry', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	try {
		const item = await retryPublish(toId(params.id));
		return item.status === 'published'
			? json(res, 200, { content: item })
			: fail(res, 502, item.error ?? 'Publishing failed again', { content: item });
	} catch (err) {
		return fail(res, 422, err.message);
	}
});

router.post('/api/content/:id/schedule', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (!body.scheduledFor) return fail(res, 400, 'scheduledFor (ISO timestamp) is required');
	if (Number.isNaN(Date.parse(body.scheduledFor))) return fail(res, 400, 'scheduledFor is not a valid timestamp');
	const item = content.reschedule(toId(params.id), body.scheduledFor);
	return item ? json(res, 200, { content: item }) : fail(res, 404, 'Content item not found');
});

router.post('/api/content/:id/cancel', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const item = content.setStatus(toId(params.id), 'cancelled');
	return item ? json(res, 200, { content: item }) : fail(res, 404, 'Content item not found');
});

router.delete('/api/content/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	// Only the record is removed; generated files are never deleted implicitly.
	return content.remove(toId(params.id)) ? noContent(res) : fail(res, 404, 'Content item not found');
});


/* ------------------------------------------------------------------ *
 * Documents (A4 PDFs)
 * ------------------------------------------------------------------ */

/** The form schema the admin UI builds its fill-in form from. */
router.get('/api/document-types', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	return json(res, 200, {
		types: DOCUMENT_KEYS.map((key) => ({
			key,
			name: DOCUMENT_FIELDS[key].name,
			description: DOCUMENT_FIELDS[key].description,
			fields: DOCUMENT_FIELDS[key].fields,
		})),
	});
});

router.get('/api/documents', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const url = new URL(req.url, 'http://local');
	const list = documents.list({
		kind: url.searchParams.get('kind'),
		limit: Math.min(300, Number(url.searchParams.get('limit')) || 100),
	});
	return json(res, 200, {
		documents: list.map((d) => ({
			...d,
			typeName: DOCUMENT_FIELDS[d.kind]?.name ?? d.kind,
			fileUrl: d.file_name ? publicAssetUrl(d.file_name) : null,
		})),
	});
});

router.get('/api/documents/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const doc = documents.find(toId(params.id));
	if (!doc) return fail(res, 404, 'Document not found');
	return json(res, 200, {
		document: { ...doc, fileUrl: doc.file_name ? publicAssetUrl(doc.file_name) : null },
	});
});

/** HTML preview — instant, and costs no PDF rendering. */
router.post('/api/documents/preview', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (!DOCUMENT_FIELDS[body.kind]) return fail(res, 400, 'Unknown document type');
	try {
		const html = composeDocument(body.kind, body.values ?? {});
		return send(res, 200, html, {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'no-store',
			// The preview is self-contained; it may not reach anything external.
			'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:",
		});
	} catch (err) {
		return fail(res, 400, err.message);
	}
});

router.post('/api/documents', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (!DOCUMENT_FIELDS[body.kind]) return fail(res, 400, 'Unknown document type');
	try {
		const out = await generateDocument({
			kind: body.kind,
			values: body.values ?? {},
			title: body.title ?? null,
			documentId: toId(body.documentId),
		});
		return json(res, 201, {
			document: { ...out.document, fileUrl: publicAssetUrl(out.document.file_name) },
		});
	} catch (err) {
		return fail(res, 422, err.message, { validation: err.validation ?? null });
	}
});

router.delete('/api/documents/:id', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	// Record only; the generated PDF stays on disk.
	return documents.remove(toId(params.id)) ? noContent(res) : fail(res, 404, 'Document not found');
});

/* ------------------------------------------------------------------ *
 * Schedule, settings, logs
 * ------------------------------------------------------------------ */

router.get('/api/destinations', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const destinations = publishDestinations();
	// Instagram fetches the image itself, so a non-public origin is a hard block.
	const publicOrigin = config.server.publicUrl;
	return json(res, 200, {
		destinations,
		instagram: {
			configured: instagramConfigured(),
			publicUrlSet: /^https:\/\//i.test(publicOrigin),
			publicUrl: publicOrigin || null,
			note: /^https:\/\//i.test(publicOrigin)
				? null
				: 'Instagram downloads the image from CONTENT_ENGINE_PUBLIC_URL. Set it to a public HTTPS origin.',
		},
	});
});

/** Pre-flight: would this item be accepted by Instagram? */
router.get('/api/content/:id/instagram-check', async (req, res, params) => {
	if (!requireAdmin(req, res)) return undefined;
	const item = content.find(toId(params.id));
	if (!item) return fail(res, 404, 'Content item not found');
	const problems = [];
	if (!instagramConfigured()) problems.push('Instagram credentials are not configured');
	if (!/^https:\/\//i.test(config.server.publicUrl)) {
		problems.push('CONTENT_ENGINE_PUBLIC_URL is not a public HTTPS origin');
	}
	if (!item.file_name) problems.push('This item has no generated image');
	let mediaType = null;
	try {
		mediaType = classifyMedia(item).mediaType;
	} catch (err) {
		problems.push(err.message);
	}
	return json(res, 200, { ready: problems.length === 0, mediaType, problems });
});

router.get('/api/schedule', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	return json(res, 200, { schedule: getSchedule(), autoPublishAllowed: config.publishing.autoPublish });
});

router.put('/api/schedule', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	if (body.times && (!Array.isArray(body.times) || body.times.some((t) => !/^\d{2}:\d{2}$/.test(t)))) {
		return fail(res, 400, 'times must be an array of HH:MM strings');
	}
	if (body.timezone) {
		try {
			new Intl.DateTimeFormat('en', { timeZone: body.timezone });
		} catch {
			return fail(res, 400, `Unknown timezone: ${body.timezone}`);
		}
	}
	return json(res, 200, { schedule: setSchedule(body) });
});

/** Manual tick — this is what an n8n Schedule Trigger calls. */
router.post('/api/schedule/run', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const results = await tick();
	return json(res, 200, { results });
});

router.get('/api/settings', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	return json(res, 200, {
		branding: currentBranding(),
		rotation: { ...DEFAULT_ROTATION, ...(settings.get('rotation', {}) ?? {}) },
	});
});

router.put('/api/settings/branding', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	settings.set('branding', body);
	clearFontCache(); // typography may have changed
	log.info('settings.branding', 'Branding settings updated');
	return json(res, 200, { branding: currentBranding() });
});

router.put('/api/settings/rotation', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const body = await readJson(req);
	const next = { ...DEFAULT_ROTATION, ...(settings.get('rotation', {}) ?? {}), ...body };
	settings.set('rotation', next);
	return json(res, 200, { rotation: next });
});

router.get('/api/logs', async (req, res) => {
	if (!requireAdmin(req, res)) return undefined;
	const url = new URL(req.url, 'http://local');
	return json(res, 200, {
		logs: logs.recent({
			limit: Math.min(500, Number(url.searchParams.get('limit')) || 100),
			level: url.searchParams.get('level'),
			event: url.searchParams.get('event'),
		}),
	});
});

/* ------------------------------------------------------------------ *
 * Public surface
 * ------------------------------------------------------------------ */

router.get('/api/feed', async (req, res) => {
	const url = new URL(req.url, 'http://local');
	const feed = publishedFeed({
		limit: Math.min(100, Number(url.searchParams.get('limit')) || 24),
		offset: Number(url.searchParams.get('offset')) || 0,
	});
	return json(res, 200, feed, {
		'Cache-Control': 'public, max-age=300',
		'Access-Control-Allow-Origin': '*',
	});
});

/** Brand webfonts for the admin UI. Served from the vendored font directory. */
router.get('/assets/fonts/:file', async (req, res, params) => {
	// Deliberately restrictive: only plain woff2 filenames, no path segments.
	if (!/^[A-Za-z0-9-]+\.woff2$/.test(params.file)) return fail(res, 404, 'Not found');
	const buffer = readFontFile(params.file);
	if (!buffer) return fail(res, 404, 'Not found');
	return send(res, 200, buffer, {
		'Content-Type': 'font/woff2',
		'Cache-Control': 'public, max-age=604800',
	});
});

router.get('/healthz', async (req, res) => {
	return json(res, 200, { status: 'ok', time: new Date().toISOString() });
});

/**
 * Media. Generated images become public once their content item is published;
 * everything else requires an administrator.
 */
router.get('/media/:path*', async (req, res, params) => {
	const key = params.path;
	if (!statStored(key)) return fail(res, 404, 'Not found');

	// A generated file is public only while it belongs to a published item;
	// anything else (drafts, source photography) needs an administrator.
	const owner = content.findByFile(key);
	const published = owner?.status === 'published';
	if (!published && !identify(req)) return fail(res, 404, 'Not found');

	const buffer = readStored(key);
	if (!buffer) return fail(res, 404, 'Not found');
	return send(res, 200, buffer, {
		'Content-Type': contentTypeFor(key),
		// Filenames are unique per generation, so published assets never change.
		'Cache-Control': published ? 'public, max-age=31536000, immutable' : 'private, no-store',
	});
});

/** Reads a vendored font file. The name is validated by the caller. */
function readFontFile(name) {
	const file = join(config.paths.fonts, name);
	return existsSync(file) ? readFileSync(file) : null;
}
