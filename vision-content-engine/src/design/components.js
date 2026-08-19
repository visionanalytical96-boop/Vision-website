/**
 * Shared visual components.
 *
 * Templates are compositions of these; the restraint lives here — one accent
 * colour, hairline rules instead of boxes-inside-boxes, a single grounded hero
 * image, and a quiet footer. Changing a component lifts every template at once.
 */
import { badge, circle, containFit, group, image, line, rect, textBlock } from './svg.js';
import { fitText, measureText, truncate } from './text.js';
import { radius, TRACKING, WEIGHT } from './tokens.js';
import { Stack } from './layout.js';

/* ------------------------------------------------------------------ *
 * Backgrounds
 * ------------------------------------------------------------------ */

/**
 * Background treatments. Gradients stay within a narrow hue range so they read
 * as depth rather than decoration.
 */
export function backdrop(ctx, { variant = 'deep' } = {}) {
	const { canvas, defs, palette, branding } = ctx;
	const { width, height } = canvas;
	const parts = [];

	if (variant === 'light') {
		const g = defs.linearGradient(
			'bg-light',
			[
				{ offset: 0, color: '#FFFFFF' },
				{ offset: 1, color: palette.bg },
			],
			{ x1: 0, y1: 0, x2: 0.4, y2: 1 },
		);
		parts.push(rect({ x: 0, y: 0, width, height, fill: `url(#${g})` }));
		// A single soft accent wash in one corner keeps it from feeling flat.
		const wash = defs.radialGradient(
			'bg-light-wash',
			[
				{ offset: 0, color: branding.colors.primary, opacity: 0.1 },
				{ offset: 1, color: branding.colors.primary, opacity: 0 },
			],
			{ cx: 0.85, cy: 0.1, r: 0.7 },
		);
		parts.push(rect({ x: 0, y: 0, width, height, fill: `url(#${wash})` }));
		parts.push(technicalGrid(ctx, { color: palette.text, opacity: 0.04 }));
		return group(parts);
	}

	const g = defs.linearGradient(
		'bg-deep',
		[
			{ offset: 0, color: palette.bgAlt },
			{ offset: 0.55, color: palette.bg },
			{ offset: 1, color: palette.bg },
		],
		{ x1: 0.1, y1: 0, x2: 0.9, y2: 1 },
	);
	parts.push(rect({ x: 0, y: 0, width, height, fill: `url(#${g})` }));

	// Off-centre accent glow — the single light source in the composition.
	const glow = defs.radialGradient(
		'bg-glow',
		[
			{ offset: 0, color: palette.accent, opacity: variant === 'glass' ? 0.22 : 0.15 },
			{ offset: 1, color: palette.accent, opacity: 0 },
		],
		{ cx: 0.5, cy: 0.5, r: 0.5 },
	);
	parts.push(
		rect({
			x: -width * 0.15,
			y: -height * 0.28,
			width: width * 1.3,
			height: height * 1.0,
			fill: `url(#${glow})`,
		}),
	);

	if (variant === 'glass') {
		const secondary = defs.radialGradient(
			'bg-glow-2',
			[
				{ offset: 0, color: branding.colors.primary, opacity: 0.28 },
				{ offset: 1, color: branding.colors.primary, opacity: 0 },
			],
			{ cx: 0.5, cy: 0.5, r: 0.5 },
		);
		parts.push(
			rect({
				x: width * 0.1,
				y: height * 0.45,
				width: width * 1.1,
				height: height * 0.8,
				fill: `url(#${secondary})`,
			}),
		);
	}

	parts.push(technicalGrid(ctx, { color: palette.accent, opacity: 0.05 }));
	return group(parts);
}

/** Faint measurement grid — a nod to the lab context, kept near-invisible. */
function technicalGrid(ctx, { color, opacity }) {
	const { canvas } = ctx;
	const { width, height } = canvas;
	const step = Math.round(Math.min(width, height) / 14);
	const lines = [];
	for (let x = step; x < width; x += step) {
		lines.push(line({ x1: x, y1: 0, x2: x, y2: height, stroke: color, strokeWidth: 1 }));
	}
	for (let y = step; y < height; y += step) {
		lines.push(line({ x1: 0, y1: y, x2: width, y2: y, stroke: color, strokeWidth: 1 }));
	}
	return group(lines, { opacity });
}

/** Subtle glass panel. Used sparingly — one per composition at most. */
export function glassPanel(ctx, box, { rx, tint = 0.06, borderOpacity = 0.16 } = {}) {
	const { defs, palette, canvas } = ctx;
	const r = rx ?? radius(canvas, 'lg');
	const g = defs.linearGradient(
		`glass-${Math.round(box.y)}-${Math.round(box.x)}`,
		[
			{ offset: 0, color: '#FFFFFF', opacity: tint },
			{ offset: 1, color: '#FFFFFF', opacity: tint * 0.25 },
		],
		{ x1: 0, y1: 0, x2: 0.6, y2: 1 },
	);
	const shadow = defs.softShadow('glass-shadow', { dy: canvas.height * 0.012, blur: canvas.height * 0.05, color: palette.shadow });
	return group([
		rect({ ...box, rx: r, fill: `url(#${g})`, filter: shadow }),
		rect({
			...box,
			rx: r,
			fill: 'none',
			stroke: palette.theme === 'light' ? palette.border : `rgba(255,255,255,${borderOpacity})`,
			strokeWidth: Math.max(1, canvas.width * 0.0012),
		}),
	]);
}

/* ------------------------------------------------------------------ *
 * Brand elements
 * ------------------------------------------------------------------ */

/**
 * Logo lockup. Uses the uploaded logo when configured, otherwise renders the
 * wordmark — deliberately never inventing a new mark.
 */
export function logoLockup(ctx, { box, align = 'left', maxHeight }) {
	const { branding, fonts, palette, canvas, assets } = ctx;
	const height = maxHeight ?? Math.min(box.height, canvas.height * 0.045);

	if (assets?.logo?.dataUri) {
		const fit = containFit({
			box: { x: box.x, y: box.y, width: box.width * 0.45, height },
			naturalWidth: assets.logo.width,
			naturalHeight: assets.logo.height,
		});
		const x = align === 'right' ? box.x + box.width - fit.width : fit.x === undefined ? box.x : box.x;
		return image({ href: assets.logo.dataUri, x, y: box.y, width: fit.width, height: fit.height });
	}

	const size = height * 0.72;
	const markWidth = measureText(branding.logoWordmark, {
		fontSize: size,
		weight: WEIGHT.black,
		tracking: TRACKING.heading,
		uppercase: true,
		family: fonts.names.display,
	});
	const accentSize = size * 0.42;
	const accentWidth = measureText(branding.logoWordmarkAccent, {
		fontSize: accentSize,
		weight: WEIGHT.semibold,
		tracking: TRACKING.eyebrow,
		uppercase: true,
		family: fonts.names.body,
	});
	const totalWidth = Math.max(markWidth, accentWidth);
	const x = align === 'right' ? box.x + box.width - totalWidth : box.x;

	return group([
		textBlock({
			lines: [branding.logoWordmark],
			x,
			y: box.y,
			fontSize: size,
			fontFamily: fonts.display,
			weight: WEIGHT.black,
			fill: palette.text,
			tracking: TRACKING.heading,
			uppercase: true,
			role: 'logo',
		}),
		textBlock({
			lines: [branding.logoWordmarkAccent],
			x,
			y: box.y + size * 1.0,
			fontSize: accentSize,
			fontFamily: fonts.body,
			weight: WEIGHT.semibold,
			fill: palette.accent,
			tracking: TRACKING.eyebrow,
			uppercase: true,
			role: 'logo-accent',
		}),
	]);
}

/** Small uppercase label preceded by a short accent rule. */
export function eyebrow(ctx, { box, text, color, align = 'left' }) {
	if (!text) return { markup: '', height: 0 };
	const { fonts, palette, type, canvas } = ctx;
	const fontSize = type.caption;
	const ruleWidth = canvas.width * 0.028;
	const gap = fontSize * 0.7;
	const label = truncate(text, {
		maxWidth: box.width - ruleWidth - gap,
		fontSize,
		weight: WEIGHT.semibold,
		tracking: TRACKING.eyebrow,
		uppercase: true,
		family: fonts.names.body,
	});
	const y = box.y;
	return {
		height: fontSize * 1.4,
		markup: group([
			line({
				x1: box.x,
				y1: y + fontSize * 0.55,
				x2: box.x + ruleWidth,
				y2: y + fontSize * 0.55,
				stroke: color ?? palette.accent,
				strokeWidth: Math.max(2, canvas.width * 0.0022),
			}),
			textBlock({
				lines: [label],
				x: box.x + ruleWidth + gap,
				y,
				fontSize,
				fontFamily: fonts.body,
				weight: WEIGHT.semibold,
				fill: color ?? palette.accent,
				tracking: TRACKING.eyebrow,
				uppercase: true,
				anchor: align === 'right' ? 'end' : 'start',
				boxWidth: box.width - ruleWidth - gap,
				role: 'eyebrow',
			}),
		]),
	};
}

/** Headline that shrinks to fit rather than overflowing. */
export function headline(ctx, { box, text, maxLines = 3, size, color, weight = WEIGHT.black, fontFamily, uppercase = false }) {
	if (!text) return { markup: '', height: 0, fontSize: 0 };
	const { fonts, palette, type } = ctx;
	const fontSize = size ?? type.h1;
	const fit = fitText(text, {
		maxWidth: box.width,
		maxLines,
		fontSize,
		minFontSize: fontSize * 0.5,
		lineHeight: 1.06,
		weight,
		tracking: TRACKING.display,
		uppercase,
		family: fonts.names.display,
	});
	return {
		fontSize: fit.fontSize,
		height: fit.height,
		markup: textBlock({
			lines: fit.lines,
			x: box.x,
			y: box.y,
			fontSize: fit.fontSize,
			fontFamily: fontFamily ?? fonts.display,
			weight,
			fill: color ?? palette.text,
			tracking: TRACKING.display,
			lineHeight: 1.06,
			uppercase,
			boxWidth: box.width,
			role: 'headline',
		}),
	};
}

/** Secondary line: brand · model, or a short descriptor. */
export function subheading(ctx, { box, text, maxLines = 2, size, color, weight = WEIGHT.regular }) {
	if (!text) return { markup: '', height: 0 };
	const { fonts, palette, type } = ctx;
	const fontSize = size ?? type.lead;
	const fit = fitText(text, {
		maxWidth: box.width,
		maxLines,
		fontSize,
		minFontSize: fontSize * 0.7,
		lineHeight: 1.25,
		weight,
		family: fonts.names.body,
	});
	return {
		height: fit.height,
		markup: textBlock({
			lines: fit.lines,
			x: box.x,
			y: box.y,
			fontSize: fit.fontSize,
			fontFamily: fonts.body,
			weight,
			fill: color ?? palette.mutedStrong,
			lineHeight: 1.25,
			boxWidth: box.width,
			role: 'subheading',
		}),
	};
}

/* ------------------------------------------------------------------ *
 * Product imagery
 * ------------------------------------------------------------------ */

/**
 * Hero product image, grounded with a soft elliptical shadow so cut-out
 * instrument photography does not float. Aspect ratio is always preserved.
 */
export function heroImage(ctx, { box, asset, treatment = 'grounded', align = 'center' }) {
	const { defs, palette, canvas } = ctx;
	if (!asset?.dataUri) return placeholderImage(ctx, { box });

	const inset = Math.min(box.width, box.height) * 0.04;
	const innerBox = {
		x: box.x + inset,
		y: box.y + inset,
		width: box.width - inset * 2,
		height: box.height - inset * 2,
	};
	const fit = containFit({
		box: innerBox,
		naturalWidth: asset.width,
		naturalHeight: asset.height,
		align: treatment === 'grounded' ? 'center' : align,
	});

	const parts = [];

	if (treatment === 'grounded') {
		// Contact shadow beneath the instrument.
		const shadowGrad = defs.radialGradient(
			'hero-ground',
			[
				{ offset: 0, color: palette.theme === 'light' ? 'rgba(10,18,32,0.30)' : 'rgba(0,0,0,0.65)' },
				{ offset: 1, color: 'rgba(0,0,0,0)' },
			],
			{ cx: 0.5, cy: 0.5, r: 0.5 },
		);
		const shadowW = fit.width * 0.92;
		const shadowH = Math.max(8, fit.height * 0.1);
		parts.push(
			`<ellipse cx="${fit.x + fit.width / 2}" cy="${fit.y + fit.height + shadowH * 0.15}" rx="${shadowW / 2}" ry="${shadowH / 2}" fill="url(#${shadowGrad})"/>`,
		);
	}

	if (treatment === 'spotlight') {
		const spot = defs.radialGradient(
			'hero-spot',
			[
				{ offset: 0, color: palette.accent, opacity: 0.2 },
				{ offset: 1, color: palette.accent, opacity: 0 },
			],
			{ cx: 0.5, cy: 0.5, r: 0.5 },
		);
		parts.push(
			rect({
				x: fit.x - fit.width * 0.3,
				y: fit.y - fit.height * 0.2,
				width: fit.width * 1.6,
				height: fit.height * 1.5,
				fill: `url(#${spot})`,
			}),
		);
	}

	const dropShadow = defs.softShadow('hero-shadow', {
		dy: canvas.height * 0.014,
		blur: canvas.height * 0.045,
		color: palette.theme === 'light' ? 'rgba(10,18,32,0.22)' : 'rgba(0,0,0,0.6)',
	});
	// Softened corners. Invisible on a cut-out with a transparent background, and
	// it stops a photo shot against white from reading as a hard pasted rectangle.
	const corner = defs.clipRect(`hero-clip-${Math.round(fit.x)}-${Math.round(fit.y)}`, {
		...fit,
		rx: Math.min(fit.width, fit.height) * 0.035,
	});
	parts.push(image({ href: asset.dataUri, ...fit, filter: dropShadow, clipPath: corner }));
	return group(parts);
}

/** Neutral stand-in when a product has no image — never a broken image box. */
function placeholderImage(ctx, { box }) {
	const { palette, canvas, fonts, type } = ctx;
	const size = Math.min(box.width, box.height) * 0.42;
	const cx = box.x + box.width / 2;
	const cy = box.y + box.height / 2;
	return group([
		rect({
			x: box.x,
			y: box.y,
			width: box.width,
			height: box.height,
			rx: radius(canvas, 'lg'),
			fill: palette.surface,
			stroke: palette.border,
			strokeWidth: 1,
		}),
		circle({ cx, cy: cy - size * 0.1, r: size * 0.5, fill: 'none', stroke: palette.border, strokeWidth: 2 }),
		textBlock({
			lines: ['IMAGE PENDING'],
			x: cx,
			y: cy + size * 0.55,
			fontSize: type.caption,
			fontFamily: fonts.mono,
			weight: WEIGHT.medium,
			fill: palette.muted,
			tracking: TRACKING.label,
			anchor: 'middle',
			role: 'placeholder',
		}),
	]);
}

/* ------------------------------------------------------------------ *
 * Information display
 * ------------------------------------------------------------------ */

/**
 * Specification list. Hairline-separated label/value rows — deliberately not a
 * grid of boxes. Rows that do not fit are dropped rather than squeezed.
 */
export function specList(ctx, { box, specs, maxRows, variant = 'rows' }) {
	const { fonts, palette, type, canvas } = ctx;
	const entries = (specs ?? []).filter((s) => s && s.label && s.value);
	if (!entries.length) return { markup: '', height: 0, rendered: 0 };

	const labelSize = type.caption;
	const valueSize = type.small;
	// Floor keeps rows from crowding on tall canvases without starving the list
	// of rows on square ones, where the content column is tightest.
	const rowHeight = Math.max(labelSize + valueSize * 1.55, canvas.height * 0.038);
	const capacity = Math.max(0, Math.floor(box.height / rowHeight));
	const count = Math.min(entries.length, maxRows ?? capacity, capacity);
	if (count <= 0) return { markup: '', height: 0, rendered: 0 };

	const parts = [];
	const visible = entries.slice(0, count);

	if (variant === 'chips') {
		// Compact inline chips for wide/short compositions.
		let x = box.x;
		let y = box.y;
		const gap = canvas.width * 0.012;
		const chipHeight = valueSize * 2.4;
		for (const entry of visible) {
			const label = `${entry.label}: ${entry.value}`;
			const chip = badge({
				label,
				x,
				y,
				fontSize: valueSize * 0.82,
				fontFamily: fonts.body,
				weight: WEIGHT.medium,
				fill: palette.mutedStrong,
				background: palette.surface,
				border: palette.border,
				tracking: 0.02,
				uppercase: false,
			});
			if (x + chip.width > box.x + box.width) {
				x = box.x;
				y += chipHeight + gap;
				if (y + chipHeight > box.y + box.height) break;
			}
			parts.push(
				badge({
					label,
					x,
					y,
					fontSize: valueSize * 0.82,
					fontFamily: fonts.body,
					weight: WEIGHT.medium,
					fill: palette.mutedStrong,
					background: palette.surface,
					border: palette.border,
					tracking: 0.02,
					uppercase: false,
				}).markup,
			);
			x += chip.width + gap;
		}
		return { markup: group(parts), height: y + chipHeight - box.y, rendered: visible.length };
	}

	visible.forEach((entry, index) => {
		const y = box.y + index * rowHeight;
		if (index > 0) {
			parts.push(
				line({
					x1: box.x,
					y1: y - rowHeight * 0.14,
					x2: box.x + box.width,
					y2: y - rowHeight * 0.14,
					stroke: palette.border,
					strokeWidth: 1,
					opacity: palette.theme === 'light' ? 0.8 : 1,
				}),
			);
		}
		const label = truncate(entry.label, {
			maxWidth: box.width * 0.45,
			fontSize: labelSize,
			weight: WEIGHT.medium,
			tracking: TRACKING.label,
			uppercase: true,
			family: fonts.names.body,
		});
		const value = truncate(entry.value, {
			maxWidth: box.width * 0.98,
			fontSize: valueSize,
			weight: WEIGHT.semibold,
			family: fonts.names.body,
		});
		parts.push(
			textBlock({
				lines: [label],
				x: box.x,
				y,
				fontSize: labelSize,
				fontFamily: fonts.body,
				weight: WEIGHT.medium,
				fill: palette.muted,
				tracking: TRACKING.label,
				uppercase: true,
				boxWidth: box.width * 0.45,
				role: 'spec-label',
			}),
			textBlock({
				lines: [value],
				x: box.x,
				y: y + labelSize * 1.35,
				fontSize: valueSize,
				fontFamily: fonts.body,
				weight: WEIGHT.semibold,
				fill: palette.text,
				boxWidth: box.width,
				role: 'spec-value',
			}),
		);
	});

	return { markup: group(parts), height: count * rowHeight, rendered: count };
}

/** Feature bullets with accent markers. */
export function featureList(ctx, { box, items, maxItems }) {
	const { fonts, palette, type, canvas } = ctx;
	const entries = (items ?? []).filter(Boolean);
	if (!entries.length) return { markup: '', height: 0 };

	const fontSize = type.small;
	const rowHeight = fontSize * 1.9;
	const capacity = Math.max(0, Math.floor(box.height / rowHeight));
	const count = Math.min(entries.length, maxItems ?? capacity, capacity);
	if (count <= 0) return { markup: '', height: 0 };

	const markerR = Math.max(2, canvas.width * 0.0035);
	const indent = markerR * 5;
	const parts = [];
	entries.slice(0, count).forEach((item, index) => {
		const y = box.y + index * rowHeight;
		parts.push(
			circle({ cx: box.x + markerR, cy: y + fontSize * 0.55, r: markerR, fill: palette.accent }),
			textBlock({
				lines: [truncate(item, { maxWidth: box.width - indent, fontSize, weight: WEIGHT.regular, family: fonts.names.body })],
				x: box.x + indent,
				y,
				fontSize,
				fontFamily: fonts.body,
				weight: WEIGHT.regular,
				fill: palette.mutedStrong,
				boxWidth: box.width - indent,
				role: 'feature',
			}),
		);
	});
	return { markup: group(parts), height: count * rowHeight };
}

/* ------------------------------------------------------------------ *
 * Call to action and footer
 * ------------------------------------------------------------------ */

export function ctaButton(ctx, { box, label, align = 'left', filled = true, fullWidth = false }) {
	if (!label) return { markup: '', height: 0, width: 0 };
	const { fonts, palette, type, canvas } = ctx;
	const fontSize = type.small;
	const paddingX = fontSize * 1.5;
	const paddingY = fontSize * 0.85;
	const text = truncate(label, {
		maxWidth: box.width - paddingX * 2,
		fontSize,
		weight: WEIGHT.bold,
		tracking: TRACKING.label,
		uppercase: true,
		family: fonts.names.body,
	});
	const width = fullWidth
		? box.width
		: Math.min(
				box.width,
				measureText(text, {
					fontSize,
					weight: WEIGHT.bold,
					tracking: TRACKING.label,
					uppercase: true,
					family: fonts.names.body,
				}) + paddingX * 2,
			);
	const height = fontSize + paddingY * 2;
	const x = align === 'right' ? box.x + box.width - width : align === 'center' ? box.x + (box.width - width) / 2 : box.x;
	const r = radius(canvas, 'sm');

	return {
		width,
		height,
		markup: group([
			rect({
				x,
				y: box.y,
				width,
				height,
				rx: r,
				fill: filled ? palette.accent : 'none',
				stroke: filled ? undefined : palette.accent,
				strokeWidth: Math.max(1.5, canvas.width * 0.0015),
			}),
			textBlock({
				lines: [text],
				x: x + width / 2,
				y: box.y + paddingY,
				fontSize,
				fontFamily: fonts.body,
				weight: WEIGHT.bold,
				fill: filled ? palette.onAccent : palette.accent,
				tracking: TRACKING.label,
				uppercase: true,
				anchor: 'middle',
				boxWidth: width - paddingX * 2,
				role: 'cta',
			}),
		]),
	};
}

/**
 * Contact strip. One quiet row of mono type above a hairline — carries the
 * brand without competing with the product.
 */
export function contactFooter(ctx, { box, showLogo = false, items }) {
	const { branding, fonts, palette, type, canvas } = ctx;
	const fontSize = type.caption;
	const contact = branding.contact;
	const entries =
		items ??
		[contact.phone, contact.email, contact.website].filter(Boolean);

	// Anchored to the bottom of its box so the composition sits on the safe-area
	// edge instead of leaving a band of dead space beneath it.
	const blockHeight = fontSize * 2.4;
	const ruleY = Math.max(box.y, box.y + box.height - blockHeight);

	const parts = [
		line({
			x1: box.x,
			y1: ruleY,
			x2: box.x + box.width,
			y2: ruleY,
			stroke: palette.border,
			strokeWidth: 1,
		}),
	];

	const textY = ruleY + fontSize * 0.9;
	const joined = entries.join('   ·   ');
	const fits =
		measureText(joined, { fontSize, weight: WEIGHT.regular, tracking: 0.04, family: fonts.names.mono }) <=
		box.width * (showLogo ? 0.62 : 1);

	if (showLogo) {
		parts.push(
			logoLockup(ctx, {
				box: { x: box.x, y: textY - fontSize * 0.2, width: box.width * 0.35, height: fontSize * 2.4 },
				maxHeight: fontSize * 2.4,
			}),
		);
	}

	parts.push(
		textBlock({
			lines: [fits ? joined : entries.slice(0, 2).join('   ·   ')],
			x: box.x + box.width,
			y: textY,
			fontSize,
			fontFamily: fonts.mono,
			weight: WEIGHT.regular,
			fill: palette.muted,
			tracking: 0.04,
			anchor: 'end',
			boxWidth: showLogo ? box.width * 0.62 : box.width,
			role: 'contact',
		}),
	);

	return group(parts);
}

/** Price / stock status block, right-aligned by convention. */
export function priceBlock(ctx, { box, price, priceType, stockStatus, align = 'right' }) {
	const { fonts, palette, type } = ctx;
	if (!price && !stockStatus) return { markup: '', height: 0 };
	const parts = [];
	const anchor = align === 'right' ? 'end' : 'start';
	const x = align === 'right' ? box.x + box.width : box.x;
	const stack = new Stack(box, 0);

	if (price) {
		const label = priceType ? `${price} · ${priceType}` : String(price);
		const row = stack.take(type.h4 * 1.25);
		parts.push(
			textBlock({
				lines: [truncate(label, { maxWidth: box.width, fontSize: type.h4, weight: WEIGHT.bold, family: fonts.names.display })],
				x,
				y: row.y,
				fontSize: type.h4,
				fontFamily: fonts.display,
				weight: WEIGHT.bold,
				fill: palette.text,
				anchor,
				boxWidth: box.width,
				role: 'price',
			}),
		);
	}
	if (stockStatus) {
		const row = stack.take(type.caption * 1.6);
		parts.push(
			textBlock({
				lines: [stockStatus],
				x,
				y: row.y,
				fontSize: type.caption,
				fontFamily: fonts.body,
				weight: WEIGHT.semibold,
				fill: palette.success,
				tracking: TRACKING.label,
				uppercase: true,
				anchor,
				boxWidth: box.width,
				role: 'stock',
			}),
		);
	}
	return { markup: group(parts), height: stack.cursor - box.y };
}
