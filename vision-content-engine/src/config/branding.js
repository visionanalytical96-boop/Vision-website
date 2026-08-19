/**
 * Brand defaults, derived from the existing Vision Analytical website so that
 * generated content is visually continuous with the live site. Every value here
 * is overridable from Admin Settings (persisted in the `settings` table).
 */

export const DEFAULT_BRANDING = {
	name: 'Vision Analytical',
	tagline: 'Precision Instruments. Maharashtra’s Trusted Lab Partner.',
	// The existing site ships a wordmark rather than a raster logo. `logoPath`
	// may point at an uploaded PNG/SVG; when empty the wordmark is drawn.
	logoPath: '',
	logoWordmark: 'VISION',
	logoWordmarkAccent: 'ANALYTICAL',
	colors: {
		background: '#040608',
		backgroundAlt: '#060A0E',
		surface: 'rgba(255,255,255,0.03)',
		surfaceStrong: 'rgba(255,255,255,0.055)',
		border: 'rgba(0,229,255,0.12)',
		borderStrong: 'rgba(0,229,255,0.22)',
		primary: '#2563EB',
		accent: '#00E5FF',
		text: '#F0F4FF',
		muted: 'rgba(240,244,255,0.45)',
		mutedStrong: 'rgba(240,244,255,0.65)',
		success: '#22C55E',
		warning: '#F59E0B',
		// Light-surface tokens for the "Clean White Laboratory" family.
		lightBackground: '#F6F8FC',
		lightSurface: '#FFFFFF',
		lightText: '#0A1220',
		lightMuted: '#5A6779',
		lightBorder: 'rgba(10,18,32,0.10)',
	},
	typography: {
		display: 'Syne',
		body: 'Space Grotesk',
		mono: 'JetBrains Mono',
		// Used when the brand webfonts are not present on disk.
		displayFallback: "'Liberation Sans', 'DejaVu Sans', sans-serif",
		bodyFallback: "'Liberation Sans', 'DejaVu Sans', sans-serif",
		monoFallback: "'DejaVu Sans Mono', monospace",
	},
	contact: {
		phone: '+91 98765 43210',
		whatsapp: '+919876543210',
		email: 'info@visionanalytical.in',
		website: 'visionanalytical.in',
		address: 'Maharashtra & Gujarat, India',
		serviceArea: 'Maharashtra · Gujarat',
	},
	social: {
		linkedin: '',
		instagram: '',
		facebook: '',
	},
	/** Short trust markers shown in template footers. */
	credentials: ['8+ Years Experience', 'Shimadzu · Waters · Agilent', 'IQ/OQ/PQ Certified'],
};

/** Deep-merge stored settings over the defaults. */
export function mergeBranding(stored) {
	if (!stored || typeof stored !== 'object') return structuredClone(DEFAULT_BRANDING);
	const merged = structuredClone(DEFAULT_BRANDING);
	for (const [key, value] of Object.entries(stored)) {
		if (value === null || value === undefined) continue;
		if (typeof value === 'object' && !Array.isArray(value) && typeof merged[key] === 'object') {
			Object.assign(merged[key], value);
		} else {
			merged[key] = value;
		}
	}
	return merged;
}
