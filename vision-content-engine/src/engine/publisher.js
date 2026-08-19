/**
 * Publishing.
 *
 * The existing Vision Analytical site is a static page with no CMS API, so the
 * default destination is this engine's own published feed, which the site (or
 * n8n) reads. An optional webhook forwards the same payload to any downstream
 * system. A publishing failure never destroys the generated artefact.
 */
import { config, publicAssetUrl } from '../config/env.js';
import { mergeBranding } from '../config/branding.js';
import { content, products, publications, settings } from '../db/repositories.js';
import { log } from './logger.js';
import { instagramConfigured, publishToInstagram } from './publishers/instagram.js';

/** Payload shared by every destination. */
export function buildPayload(item) {
	const product = item.product_id ? products.find(item.product_id) : null;
	return {
		id: item.uid,
		title: item.title,
		description: item.description ?? '',
		tags: item.tags ?? [],
		category: item.category_id,
		image: item.file_name ? publicAssetUrl(item.file_name) : null,
		width: item.width,
		height: item.height,
		format: item.output_format,
		product: product
			? {
					name: product.name,
					brand: product.brand,
					model: product.model,
					slug: product.slug,
					url: product.website_url ?? null,
				}
			: null,
		publishedAt: item.published_at ?? new Date().toISOString(),
	};
}

/**
 * Publishes a generated item.
 *
 * @param {number} contentId
 * @param {{destination?:string, attempt?:number}} [options]
 */
export async function publish(contentId, { destination = null, attempt = 1 } = {}) {
	const item = content.find(contentId);
	if (!item) throw new Error('Content item not found');
	if (!item.file_name) throw new Error('Nothing to publish: this item has no generated image');

	const target = destination ?? defaultDestination();
	content.setStatus(item.id, 'publishing');

	try {
		const payload = buildPayload(item);
		let url = payload.image;

		if (target === 'webhook') {
			url = await publishToWebhook(payload);
		} else if (target === 'instagram') {
			url = await publishToInstagram(payload, mergeBranding(settings.get('branding', {})));
		}

		const published = content.setStatus(item.id, 'published', {
			publishedAt: new Date().toISOString(),
			publishedUrl: url,
			error: null,
		});

		publications.record({ contentId: item.id, destination: target, status: 'published', url, attempt });
		if (item.product_id) products.markPublished(item.product_id);

		log.info('publish.success', `Published "${item.title}"`, { contentId: item.id, destination: target, url });
		return published;
	} catch (err) {
		// The image and the content record are deliberately preserved.
		const failed = content.setStatus(item.id, 'publishing_failed', {
			error: err.message,
			retryCount: (item.retry_count ?? 0) + 1,
		});
		publications.record({
			contentId: item.id,
			destination: target,
			status: 'failed',
			attempt,
			error: err.message,
		});
		log.error('publish.failed', err.message, { contentId: item.id, destination: target, attempt });
		return failed;
	}
}

/** Available destinations, for the admin UI and API validation. */
export function publishDestinations() {
	return [
		{ id: 'website-feed', name: 'Website feed', available: config.publishing.websiteFeedEnabled },
		{ id: 'instagram', name: 'Instagram', available: instagramConfigured() },
		{ id: 'webhook', name: 'Webhook', available: Boolean(config.publishing.webhookUrl) },
	];
}

function defaultDestination() {
	if (config.publishing.webhookUrl) return 'webhook';
	return 'website-feed';
}

async function publishToWebhook(payload) {
	const { webhookUrl, webhookToken } = config.publishing;
	if (!webhookUrl) throw new Error('No publish webhook is configured');

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 20_000);
	try {
		const response = await fetch(webhookUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
		if (!response.ok) {
			const body = await response.text().catch(() => '');
			throw new Error(`Webhook responded ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`);
		}
		const text = await response.text().catch(() => '');
		try {
			return JSON.parse(text).url ?? payload.image;
		} catch {
			return payload.image;
		}
	} finally {
		clearTimeout(timer);
	}
}

/** Retries a previously failed publish, respecting the configured cap. */
export async function retryPublish(contentId) {
	const item = content.find(contentId);
	if (!item) throw new Error('Content item not found');
	const attempt = (item.retry_count ?? 0) + 1;
	if (attempt > config.publishing.maxRetries) {
		throw new Error(`Retry limit of ${config.publishing.maxRetries} reached for this item`);
	}
	return publish(contentId, { attempt });
}

/**
 * The feed the website reads. Only published items with a stored image appear.
 */
export function publishedFeed({ limit = 24, offset = 0 } = {}) {
	if (!config.publishing.websiteFeedEnabled) return { items: [], total: 0 };
	const items = content.published({ limit, offset }).filter((item) => item.file_name);
	return {
		generatedAt: new Date().toISOString(),
		brand: settings.get('branding', {})?.name ?? 'Vision Analytical',
		total: items.length,
		items: items.map(buildPayload),
	};
}
