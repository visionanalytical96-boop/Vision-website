/**
 * Output presets. `shape` is what the layout engine keys off — a template is
 * written once and re-composes itself per shape rather than being stretched.
 */
export const FORMAT_PRESETS = [
	{
		slug: 'instagram-square',
		name: 'Instagram Square',
		width: 1080,
		height: 1080,
		shape: 'square',
		platform: 'instagram',
	},
	{
		slug: 'instagram-portrait',
		name: 'Instagram Portrait',
		width: 1080,
		height: 1350,
		shape: 'portrait',
		platform: 'instagram',
	},
	{
		slug: 'story',
		name: 'Instagram / Facebook Story',
		width: 1080,
		height: 1920,
		shape: 'vertical',
		platform: 'story',
	},
	{
		slug: 'facebook-post',
		name: 'Facebook Post',
		width: 1200,
		height: 630,
		shape: 'landscape',
		platform: 'facebook',
	},
	{
		slug: 'linkedin-post',
		name: 'LinkedIn Post',
		width: 1200,
		height: 627,
		shape: 'landscape',
		platform: 'linkedin',
	},
	{
		slug: 'whatsapp-post',
		name: 'WhatsApp Post',
		width: 1080,
		height: 1080,
		shape: 'square',
		platform: 'whatsapp',
	},
	{
		slug: 'website-banner',
		name: 'Website Banner',
		width: 1920,
		height: 640,
		shape: 'wide',
		platform: 'website',
	},
	{
		slug: 'product-card',
		name: 'Product Card',
		width: 800,
		height: 1000,
		shape: 'portrait',
		platform: 'website',
	},
];

export const OUTPUT_FORMATS = ['png', 'jpeg', 'webp'];

/** Normalises `jpg` and any casing to the canonical encoder name. */
export function normaliseOutputFormat(value) {
	const format = String(value || 'png').toLowerCase();
	if (format === 'jpg') return 'jpeg';
	return OUTPUT_FORMATS.includes(format) ? format : 'png';
}

export function fileExtension(outputFormat) {
	return normaliseOutputFormat(outputFormat) === 'jpeg' ? 'jpg' : normaliseOutputFormat(outputFormat);
}

export function getFormatPreset(slug) {
	return FORMAT_PRESETS.find((preset) => preset.slug === slug) ?? null;
}

/** Classifies an arbitrary width/height so custom sizes still lay out sensibly. */
export function shapeFor(width, height) {
	const ratio = width / height;
	if (ratio >= 2.2) return 'wide';
	if (ratio >= 1.25) return 'landscape';
	if (ratio > 0.92) return 'square';
	if (ratio > 0.68) return 'portrait';
	return 'vertical';
}

export function resolveCanvas({ formatPreset, width, height }) {
	if (formatPreset) {
		const preset = getFormatPreset(formatPreset);
		if (preset) {
			return { width: preset.width, height: preset.height, shape: preset.shape, preset: preset.slug };
		}
	}
	const w = Number(width) || 1080;
	const h = Number(height) || 1080;
	return { width: w, height: h, shape: shapeFor(w, h), preset: null };
}
