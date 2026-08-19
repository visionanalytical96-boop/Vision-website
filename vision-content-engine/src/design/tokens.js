/**
 * Design tokens.
 *
 * Everything is expressed relative to the canvas so a single template definition
 * produces correctly proportioned output at 1080x1080, 1080x1920 or 1920x640.
 * Nothing here is a hard-coded pixel value at call sites.
 */

/**
 * Base unit derived from the canvas. Using the smaller edge keeps type readable
 * on wide banners instead of ballooning with width.
 */
export function baseUnit({ width, height, shape }) {
	const min = Math.min(width, height);
	// Wide banners get a slightly larger unit so they don't look under-set.
	const factor = shape === 'wide' ? 1.18 : shape === 'landscape' ? 1.06 : 1;
	return (min / 1080) * 16 * factor;
}

/** Modular type scale (1.25 major third) expressed in base units. */
const TYPE_STEPS = {
	micro: 0.62,
	caption: 0.78,
	small: 0.92,
	body: 1.06,
	lead: 1.28,
	h4: 1.55,
	h3: 1.95,
	h2: 2.5,
	h1: 3.25,
	display: 4.1,
	hero: 5.2,
};

export function typeScale(canvas) {
	const unit = baseUnit(canvas);
	const scale = {};
	for (const [name, step] of Object.entries(TYPE_STEPS)) {
		scale[name] = Math.round(unit * step * 100) / 100;
	}
	return scale;
}

/** Spacing scale in base units. */
export function spacing(canvas) {
	const unit = baseUnit(canvas);
	return {
		xs: unit * 0.4,
		sm: unit * 0.75,
		md: unit * 1.25,
		lg: unit * 2,
		xl: unit * 3,
		xxl: unit * 4.5,
	};
}

/**
 * Safe margins. Social crops and platform chrome eat the edges, so the content
 * box is inset generously — this is what stops output looking cramped.
 */
export function safeArea(canvas) {
	const { width, height, shape } = canvas;
	const ratios = {
		square: { x: 0.075, y: 0.075 },
		portrait: { x: 0.075, y: 0.065 },
		// Stories reserve extra top/bottom for platform UI.
		vertical: { x: 0.085, y: 0.075 },
		landscape: { x: 0.06, y: 0.085 },
		wide: { x: 0.045, y: 0.1 },
	};
	const ratio = ratios[shape] ?? ratios.square;
	const x = Math.round(width * ratio.x);
	const y = Math.round(height * ratio.y);
	return { x, y, left: x, top: y, right: width - x, bottom: height - y, width: width - x * 2, height: height - y * 2 };
}

export const RADIUS = {
	sm: 0.5,
	md: 1,
	lg: 1.75,
	xl: 2.5,
	pill: 999,
};

export function radius(canvas, key = 'md') {
	if (key === 'pill') return 9999;
	return Math.round(baseUnit(canvas) * (RADIUS[key] ?? RADIUS.md));
}

/**
 * Resolves a theme (dark / light / glass) into concrete colours from branding.
 * Templates ask for semantic roles, never raw hex.
 */
export function themePalette(branding, theme = 'dark') {
	const c = branding.colors;
	if (theme === 'light') {
		return {
			theme: 'light',
			bg: c.lightBackground,
			bgAlt: c.lightSurface,
			surface: 'rgba(10,18,32,0.035)',
			surfaceStrong: 'rgba(10,18,32,0.06)',
			border: c.lightBorder,
			borderStrong: 'rgba(37,99,235,0.28)',
			text: c.lightText,
			muted: c.lightMuted,
			mutedStrong: 'rgba(10,18,32,0.72)',
			accent: c.primary,
			accentAlt: c.accent,
			onAccent: '#FFFFFF',
			success: c.success,
			shadow: 'rgba(10,18,32,0.18)',
		};
	}
	return {
		theme: 'dark',
		bg: c.background,
		bgAlt: c.backgroundAlt,
		surface: c.surface,
		surfaceStrong: c.surfaceStrong,
		border: c.border,
		borderStrong: c.borderStrong,
		text: c.text,
		muted: c.muted,
		mutedStrong: c.mutedStrong,
		accent: c.accent,
		accentAlt: c.primary,
		onAccent: '#04121A',
		success: c.success,
		shadow: 'rgba(0,0,0,0.55)',
	};
}

/** Letter-spacing presets, in em, tuned per role. */
export const TRACKING = {
	display: -0.022,
	heading: -0.015,
	body: 0,
	label: 0.14,
	eyebrow: 0.2,
};

export const WEIGHT = {
	light: 300,
	regular: 400,
	medium: 500,
	semibold: 600,
	bold: 700,
	black: 800,
};
