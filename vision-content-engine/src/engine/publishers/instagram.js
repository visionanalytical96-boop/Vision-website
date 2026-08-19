/**
 * Instagram publishing via the official Instagram Graph API.
 *
 * The flow is two-phase: create a media container pointing at a public image
 * URL, wait for Instagram to finish downloading it, then publish the container.
 *
 * IMPORTANT: Instagram fetches the image from `image_url` on its own servers.
 * The URL must be publicly reachable over HTTPS — a localhost, LAN or Tailscale
 * address will not work, and the container will fail with a media-download
 * error. `CONTENT_ENGINE_PUBLIC_URL` must point at a genuinely public origin.
 *
 * No credentials are stored in source; everything comes from the environment.
 */
import { config } from '../../config/env.js';
import { log } from '../logger.js';

const GRAPH = 'https://graph.facebook.com';

/** Instagram's accepted aspect ratios for a feed image. */
const FEED_MIN_RATIO = 0.8; // 4:5 portrait
const FEED_MAX_RATIO = 1.91; // 1.91:1 landscape

/** A 9:16 canvas is a story, not a feed post. */
const STORY_RATIO_MAX = 0.62;

export function instagramConfigured() {
	return Boolean(config.instagram.userId && config.instagram.accessToken);
}

/**
 * Checks the image can actually be posted before spending an API call.
 * @returns {{mediaType:'IMAGE'|'STORIES', ratio:number}}
 */
export function classifyMedia({ width, height, format }) {
	if (!width || !height) throw new Error('Content is missing its dimensions');
	const ratio = width / height;

	if (ratio <= STORY_RATIO_MAX) {
		return { mediaType: 'STORIES', ratio };
	}
	if (ratio < FEED_MIN_RATIO || ratio > FEED_MAX_RATIO) {
		throw new Error(
			`Instagram rejects this aspect ratio (${ratio.toFixed(2)}:1). ` +
				'Feed posts must be between 4:5 and 1.91:1 — use a square, portrait or story format.',
		);
	}
	// Instagram only accepts JPEG for feed images; PNG and WebP are refused.
	if (format && format !== 'jpeg') {
		throw new Error(`Instagram requires JPEG, but this item is ${format}. Regenerate it as JPEG first.`);
	}
	return { mediaType: 'IMAGE', ratio };
}

/** Builds the caption: headline, detail, call to action, then hashtags. */
export function buildCaption(payload, branding) {
	const lines = [payload.title];

	if (payload.description) lines.push('', payload.description.trim());

	const contact = branding?.contact ?? {};
	const reach = [contact.phone, contact.website].filter(Boolean).join('  ·  ');
	if (reach) lines.push('', `📩 ${reach}`);

	const tags = (payload.tags ?? [])
		.map((t) => `#${String(t).replace(/[^a-zA-Z0-9]/g, '')}`)
		.filter((t) => t.length > 1);
	const standard = ['#VisionAnalytical', '#AnalyticalInstruments', '#LabEquipment', '#HPLC'];
	const hashtags = [...new Set([...tags, ...standard])].slice(0, 30);
	if (hashtags.length) lines.push('', hashtags.join(' '));

	// Instagram truncates captions beyond 2 200 characters.
	return lines.join('\n').slice(0, 2200);
}

async function graph(path, params, { method = 'POST' } = {}) {
	const version = config.instagram.apiVersion;
	const url = new URL(`${GRAPH}/${version}/${path}`);
	const body = new URLSearchParams({ ...params, access_token: config.instagram.accessToken });

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 30_000);
	try {
		const response = await fetch(method === 'GET' ? `${url}?${body}` : url, {
			method,
			body: method === 'GET' ? undefined : body,
			signal: controller.signal,
		});
		const text = await response.text();
		let data;
		try {
			data = JSON.parse(text);
		} catch {
			throw new Error(`Instagram returned a non-JSON response (${response.status})`);
		}
		if (!response.ok || data.error) {
			const e = data.error ?? {};
			// Surface Instagram's own message — it is far more useful than a status code.
			throw new Error(
				`Instagram API: ${e.message ?? response.status}` +
					(e.code ? ` (code ${e.code}${e.error_subcode ? `/${e.error_subcode}` : ''})` : ''),
			);
		}
		return data;
	} finally {
		clearTimeout(timer);
	}
}

/** Polls the container until Instagram has finished fetching the image. */
async function waitForContainer(containerId, { attempts = 12, delayMs = 2500 } = {}) {
	for (let i = 0; i < attempts; i += 1) {
		const status = await graph(containerId, { fields: 'status_code,status' }, { method: 'GET' });
		if (status.status_code === 'FINISHED') return;
		if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
			throw new Error(
				`Instagram could not process the image (${status.status_code}). ` +
					`${status.status ?? ''} — check that the image URL is publicly reachable over HTTPS.`,
			);
		}
		await new Promise((r) => setTimeout(r, delayMs));
	}
	throw new Error('Instagram did not finish processing the image in time');
}

/**
 * Publishes one generated item to Instagram.
 *
 * @param {object} payload  from buildPayload()
 * @param {object} branding merged branding, for the caption
 * @returns {Promise<string>} permalink of the published post
 */
export async function publishToInstagram(payload, branding) {
	if (!instagramConfigured()) {
		throw new Error('Instagram is not configured — set CONTENT_ENGINE_IG_USER_ID and CONTENT_ENGINE_IG_ACCESS_TOKEN');
	}

	const imageUrl = payload.image;
	if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
		throw new Error(
			'Instagram needs a public HTTPS image URL. Set CONTENT_ENGINE_PUBLIC_URL to a publicly reachable origin ' +
				`(currently: ${imageUrl || 'not set'}).`,
		);
	}

	const { mediaType } = classifyMedia(payload);
	const caption = buildCaption(payload, branding);
	const userId = config.instagram.userId;

	log.info('publish.instagram.container', `Creating ${mediaType} container`, { title: payload.title });

	const container = await graph(`${userId}/media`, {
		image_url: imageUrl,
		// Stories carry no caption.
		...(mediaType === 'STORIES' ? { media_type: 'STORIES' } : { caption }),
	});

	await waitForContainer(container.id);

	const published = await graph(`${userId}/media_publish`, { creation_id: container.id });

	// Fetch the permalink so the calendar can link straight to the live post.
	let permalink = null;
	try {
		const details = await graph(published.id, { fields: 'permalink' }, { method: 'GET' });
		permalink = details.permalink ?? null;
	} catch {
		// Publishing succeeded; a missing permalink is not worth failing over.
	}

	log.info('publish.instagram.success', 'Published to Instagram', { mediaId: published.id, permalink });
	return permalink ?? `https://www.instagram.com/`;
}

/**
 * Exchanges a long-lived token for a fresh one. Long-lived tokens last 60 days,
 * so an unrefreshed deployment stops publishing silently after two months.
 * Safe to call on a schedule; Instagram only refreshes tokens older than 24h.
 */
export async function refreshAccessToken() {
	if (!config.instagram.accessToken) throw new Error('No Instagram access token configured');
	const url = new URL(`${GRAPH}/${config.instagram.apiVersion}/oauth/access_token`);
	url.search = new URLSearchParams({
		grant_type: 'fb_exchange_token',
		client_id: config.instagram.appId,
		client_secret: config.instagram.appSecret,
		fb_exchange_token: config.instagram.accessToken,
	}).toString();

	if (!config.instagram.appId || !config.instagram.appSecret) {
		throw new Error('Token refresh needs CONTENT_ENGINE_IG_APP_ID and CONTENT_ENGINE_IG_APP_SECRET');
	}

	const response = await fetch(url);
	const data = await response.json().catch(() => ({}));
	if (!response.ok || data.error) {
		throw new Error(`Token refresh failed: ${data.error?.message ?? response.status}`);
	}
	// Returned to the caller rather than written to disk — rotating a secret is
	// an operator decision, not something this process should do silently.
	return { accessToken: data.access_token, expiresIn: data.expires_in };
}
