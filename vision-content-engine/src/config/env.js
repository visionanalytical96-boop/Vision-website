/**
 * Runtime configuration. Everything is environment driven so that no secret or
 * deployment-specific path is ever committed to source.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Load a .env file if present. Real deployments may instead inject env vars
// directly (systemd, Docker, n8n) — both paths are supported.
loadDotEnv(resolve(PACKAGE_ROOT, '.env'));

function loadDotEnv(file) {
	if (!existsSync(file)) return;
	for (const rawLine of readFileSync(file, 'utf8').split('\n')) {
		const line = rawLine.trim();
		if (!line || line.startsWith('#')) continue;
		const eq = line.indexOf('=');
		if (eq === -1) continue;
		const key = line.slice(0, eq).trim();
		if (key in process.env) continue; // real env always wins
		let value = line.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		process.env[key] = value;
	}
}

const str = (key, fallback) => process.env[key]?.trim() || fallback;
const int = (key, fallback) => {
	const parsed = Number.parseInt(process.env[key] ?? '', 10);
	return Number.isFinite(parsed) ? parsed : fallback;
};
const bool = (key, fallback) => {
	const value = process.env[key]?.trim().toLowerCase();
	if (value === undefined || value === '') return fallback;
	return value === '1' || value === 'true' || value === 'yes' || value === 'on';
};

function resolveWorkspace() {
	const configured = str('CONTENT_ENGINE_WORKSPACE', '');
	if (configured) return isAbsolute(configured) ? configured : resolve(PACKAGE_ROOT, configured);
	// Production default matches the documented layout; falls back to a local
	// directory when that path is not writable (development machines, CI).
	const production = '/srv/vision-workspace/content-engine';
	return existsSync(dirname(production)) ? production : resolve(PACKAGE_ROOT, '.data');
}

const workspace = resolveWorkspace();

export const config = {
	env: str('NODE_ENV', 'development'),
	workspace,
	paths: {
		templates: resolve(workspace, 'templates'),
		products: resolve(workspace, 'products'),
		generated: resolve(workspace, 'generated'),
		uploads: resolve(workspace, 'uploads'),
		exports: resolve(workspace, 'exports'),
		archives: resolve(workspace, 'archives'),
		logs: resolve(workspace, 'logs'),
		database: str('CONTENT_ENGINE_DB', resolve(workspace, 'content-engine.sqlite')),
		fonts: resolve(PACKAGE_ROOT, 'assets/fonts'),
		brandAssets: resolve(PACKAGE_ROOT, 'assets/brand'),
	},
	server: {
		host: str('CONTENT_ENGINE_HOST', '127.0.0.1'),
		port: int('CONTENT_ENGINE_PORT', 4310),
		// Public origin used when building absolute URLs for the website feed.
		publicUrl: str('CONTENT_ENGINE_PUBLIC_URL', ''),
		trustProxy: bool('CONTENT_ENGINE_TRUST_PROXY', false),
	},
	auth: {
		// Admin credentials. The bootstrap admin is only created when both are set.
		adminEmail: str('CONTENT_ENGINE_ADMIN_EMAIL', ''),
		adminPassword: str('CONTENT_ENGINE_ADMIN_PASSWORD', ''),
		sessionSecret: str('CONTENT_ENGINE_SESSION_SECRET', ''),
		sessionTtlHours: int('CONTENT_ENGINE_SESSION_TTL_HOURS', 12),
		// Machine-to-machine key used by n8n. Never logged.
		apiKey: str('CONTENT_ENGINE_API_KEY', ''),
	},
	render: {
		// 'auto' picks the best available backend at runtime.
		backend: str('CONTENT_ENGINE_RENDER_BACKEND', 'auto'),
		chromiumPath: str('CONTENT_ENGINE_CHROMIUM', ''),
		timeoutMs: int('CONTENT_ENGINE_RENDER_TIMEOUT_MS', 30_000),
		concurrency: int('CONTENT_ENGINE_RENDER_CONCURRENCY', 2),
		defaultFormat: str('CONTENT_ENGINE_DEFAULT_FORMAT', 'png'),
		jpegQuality: int('CONTENT_ENGINE_JPEG_QUALITY', 90),
		webpQuality: int('CONTENT_ENGINE_WEBP_QUALITY', 88),
	},
	uploads: {
		maxBytes: int('CONTENT_ENGINE_MAX_UPLOAD_BYTES', 12 * 1024 * 1024),
		allowedMime: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
	},
	scheduler: {
		enabled: bool('CONTENT_ENGINE_SCHEDULER_ENABLED', false),
		tickSeconds: int('CONTENT_ENGINE_SCHEDULER_TICK_SECONDS', 60),
	},
	publishing: {
		// Automatic publishing is opt-in by design: generated content stays in
		// review until an administrator explicitly enables it.
		autoPublish: bool('CONTENT_ENGINE_AUTO_PUBLISH', false),
		websiteFeedEnabled: bool('CONTENT_ENGINE_WEBSITE_FEED', true),
		webhookUrl: str('CONTENT_ENGINE_PUBLISH_WEBHOOK', ''),
		webhookToken: str('CONTENT_ENGINE_PUBLISH_WEBHOOK_TOKEN', ''),
		maxRetries: int('CONTENT_ENGINE_PUBLISH_MAX_RETRIES', 3),
	},
	ai: {
		// Optional and fully independent. Core generation never depends on it.
		enabled: bool('CONTENT_ENGINE_AI_ENABLED', false),
		provider: str('CONTENT_ENGINE_AI_PROVIDER', ''),
		endpoint: str('CONTENT_ENGINE_AI_ENDPOINT', ''),
		apiKey: str('CONTENT_ENGINE_AI_API_KEY', ''),
		model: str('CONTENT_ENGINE_AI_MODEL', ''),
	},
	logging: {
		level: str('CONTENT_ENGINE_LOG_LEVEL', 'info'),
		retainDays: int('CONTENT_ENGINE_LOG_RETAIN_DAYS', 30),
	},
};

/** Public URL for a stored asset, never exposing filesystem paths. */
export function publicAssetUrl(relativePath) {
	const clean = String(relativePath).replace(/^\/+/, '');
	const base = config.server.publicUrl.replace(/\/+$/, '');
	return base ? `${base}/media/${clean}` : `/media/${clean}`;
}
