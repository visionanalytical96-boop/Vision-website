/**
 * Template families.
 *
 * Each family is a composition function. The *configuration* of a template
 * (theme, spec count, CTA wording, image treatment, output size) lives in the
 * database so administrators can create, duplicate and edit templates without a
 * code change; the family supplies the layout grammar.
 */
import {
	backdrop,
	contactFooter,
	ctaButton,
	eyebrow as eyebrowComponent,
	featureList,
	glassPanel,
	headline,
	heroImage,
	logoLockup,
	priceBlock,
	specList,
	subheading,
} from '../components.js';
import { columns, grid, resolveLayout, Stack } from '../layout.js';
import { badge, group, line, rect, textBlock } from '../svg.js';
import { fitText, truncate } from '../text.js';
import { radius, TRACKING, WEIGHT } from '../tokens.js';
import { insetBox, standardComposition } from './shared.js';

/* ------------------------------------------------------------------ *
 * Configuration-driven families
 * ------------------------------------------------------------------ */

export function premiumProduct(ctx, content, tpl) {
	return standardComposition(ctx, content, {
		background: 'deep',
		imageTreatment: 'grounded',
		maxSpecs: tpl.config.maxSpecs ?? 4,
		showFeatures: false,
		...tpl.config,
	});
}

export function instrumentSale(ctx, content, tpl) {
	return standardComposition(ctx, content, {
		background: 'deep',
		imageTreatment: 'grounded',
		maxSpecs: tpl.config.maxSpecs ?? 5,
		showFeatures: true,
		maxFeatures: 2,
		...tpl.config,
	});
}

export function darkLaboratory(ctx, content, tpl) {
	return standardComposition(ctx, content, {
		background: 'deep',
		imageTreatment: 'spotlight',
		maxSpecs: tpl.config.maxSpecs ?? 4,
		headlineUppercase: true,
		...tpl.config,
	});
}

export function modernGlass(ctx, content, tpl) {
	return standardComposition(ctx, content, {
		background: 'glass',
		imageTreatment: 'grounded',
		glassContent: true,
		maxSpecs: tpl.config.maxSpecs ?? 3,
		...tpl.config,
	});
}

export function cleanWhiteLaboratory(ctx, content, tpl) {
	return standardComposition(ctx, content, {
		background: 'light',
		imageTreatment: 'grounded',
		maxSpecs: tpl.config.maxSpecs ?? 4,
		showFeatures: true,
		maxFeatures: 2,
		...tpl.config,
	});
}

export function refurbishedInstrument(ctx, content, tpl) {
	const enriched = {
		...content,
		badgeLabel: content.badgeLabel || 'Certified Refurbished',
		specs: prioritiseSpecs(content.specs, ['Condition', 'Year', 'Warranty', 'Configuration']),
	};
	return standardComposition(ctx, enriched, {
		background: 'deep',
		imageTreatment: 'grounded',
		maxSpecs: tpl.config.maxSpecs ?? 5,
		...tpl.config,
	});
}

/* ------------------------------------------------------------------ *
 * Structurally distinct families
 * ------------------------------------------------------------------ */

/** Hero image plus a grid of specification cards. */
export function technicalSpecification(ctx, content, tpl) {
	const cfg = tpl.config ?? {};
	const layout = resolveLayout(ctx.canvas, {
		mediaWeight: cfg.mediaWeight ?? (ctx.canvas.shape === 'wide' ? 0.32 : 0.36),
		headerRatio: 0.1,
		footerRatio: 0.095,
	});
	const { space, type, palette, canvas, fonts } = ctx;
	const parts = [backdrop(ctx, { variant: cfg.background ?? 'deep' })];

	parts.push(logoLockup(ctx, { box: layout.header, maxHeight: layout.header.height * 0.72 }));
	if (content.badgeLabel) {
		parts.push(
			badge({
				label: content.badgeLabel,
				x: layout.header.x + layout.header.width,
				y: layout.header.y,
				fontSize: type.caption,
				fontFamily: fonts.body,
				weight: WEIGHT.bold,
				fill: palette.accent,
				background: palette.surface,
				border: palette.borderStrong,
				anchor: 'end',
				metricFamily: fonts.names.body,
			}).markup,
		);
	}
	parts.push(heroImage(ctx, { box: layout.media, asset: ctx.assets?.product, treatment: 'grounded' }));

	const stack = new Stack(layout.content, space.sm);
	const eb = eyebrowComponent(ctx, { box: stack.take(type.caption * 1.4), text: content.eyebrow });
	parts.push(eb.markup);

	const titleBox = stack.take(0);
	const h = headline(ctx, { box: titleBox, text: content.title, maxLines: 2, size: type.h2 });
	parts.push(h.markup);
	stack.syncTo(titleBox.y + h.height);

	if (content.subtitle) {
		const sub = subheading(ctx, { box: stack.take(0), text: content.subtitle, maxLines: 1, size: type.body });
		parts.push(sub.markup);
		stack.syncTo(stack.cursor + sub.height);
	}

	// Specification cards — the defining element of this family.
	const ctaHeight = type.h4 * 2.1;
	const cardsRegion = {
		x: layout.content.x,
		y: stack.cursor + space.md,
		width: layout.content.width,
		height: Math.max(0, layout.content.y + layout.content.height - stack.cursor - space.md - ctaHeight - space.sm),
	};

	const specs = content.specs.slice(0, cfg.maxSpecs ?? 6);
	if (specs.length && cardsRegion.height > type.small * 3) {
		const cols = canvas.shape === 'vertical' || canvas.shape === 'square' ? 2 : 3;
		const rows = Math.max(1, Math.min(Math.ceil(specs.length / cols), Math.floor(cardsRegion.height / (type.small * 3.6))));
		const cells = grid(cardsRegion, { cols, rows, gutterX: space.sm, gutterY: space.sm });
		specs.slice(0, cols * rows).forEach((spec, index) => {
			const cell = cells[index];
			parts.push(specCard(ctx, cell, spec));
		});
	}

	const rowY = layout.content.y + layout.content.height - ctaHeight;
	if (content.cta) {
		parts.push(
			ctaButton(ctx, {
				box: { x: layout.content.x, y: rowY, width: layout.content.width * 0.55, height: ctaHeight },
				label: content.cta,
			}).markup,
		);
	}
	if (content.price || content.stockStatus) {
		parts.push(
			priceBlock(ctx, {
				box: {
					x: layout.content.x + layout.content.width * 0.55,
					y: rowY,
					width: layout.content.width * 0.45,
					height: ctaHeight,
				},
				price: content.price,
				priceType: content.priceType,
				stockStatus: content.stockStatus,
			}).markup,
		);
	}

	parts.push(contactFooter(ctx, { box: layout.footer }));
	return group(parts);
}

function specCard(ctx, box, spec) {
	const { palette, fonts, type, canvas } = ctx;
	const pad = Math.min(box.width, box.height) * 0.14;
	return group([
		rect({
			...box,
			rx: radius(canvas, 'md'),
			fill: palette.surface,
			stroke: palette.border,
			strokeWidth: 1,
		}),
		textBlock({
			lines: [truncate(spec.label, { maxWidth: box.width - pad * 2, fontSize: type.micro, weight: WEIGHT.medium, tracking: TRACKING.label, uppercase: true, family: fonts.names.body })],
			x: box.x + pad,
			y: box.y + pad,
			fontSize: type.micro,
			fontFamily: fonts.body,
			weight: WEIGHT.medium,
			fill: palette.muted,
			tracking: TRACKING.label,
			uppercase: true,
			boxWidth: box.width - pad * 2,
			role: 'spec-label',
		}),
		textBlock({
			lines: fitText(spec.value, {
				maxWidth: box.width - pad * 2,
				maxLines: 2,
				fontSize: type.small,
				minFontSize: type.micro,
				weight: WEIGHT.semibold,
				family: fonts.names.body,
			}).lines,
			x: box.x + pad,
			y: box.y + pad + type.micro * 1.7,
			fontSize: type.small,
			fontFamily: fonts.body,
			weight: WEIGHT.semibold,
			fill: palette.text,
			lineHeight: 1.2,
			boxWidth: box.width - pad * 2,
			role: 'spec-value',
		}),
	]);
}

/** Part-focused layout: part number is the hero data point. */
export function spareParts(ctx, content, tpl) {
	const cfg = tpl.config ?? {};
	const layout = resolveLayout(ctx.canvas, {
		mediaWeight: cfg.mediaWeight ?? 0.4,
		headerRatio: 0.1,
		footerRatio: 0.095,
	});
	const { space, type, palette, fonts } = ctx;
	const parts = [backdrop(ctx, { variant: cfg.background ?? 'deep' })];

	parts.push(logoLockup(ctx, { box: layout.header, maxHeight: layout.header.height * 0.72 }));
	parts.push(
		badge({
			label: content.badgeLabel || 'Genuine Spare Part',
			x: layout.header.x + layout.header.width,
			y: layout.header.y,
			fontSize: type.caption,
			fontFamily: fonts.body,
			weight: WEIGHT.bold,
			fill: palette.accent,
			background: palette.surface,
			border: palette.borderStrong,
			anchor: 'end',
			metricFamily: fonts.names.body,
		}).markup,
	);
	parts.push(heroImage(ctx, { box: layout.media, asset: ctx.assets?.product, treatment: 'grounded' }));

	const stack = new Stack(layout.content, space.sm);
	parts.push(eyebrowComponent(ctx, { box: stack.take(type.caption * 1.4), text: content.eyebrow }).markup);

	const titleBox = stack.take(0);
	const h = headline(ctx, { box: titleBox, text: content.title, maxLines: 2, size: type.h2 });
	parts.push(h.markup);
	stack.syncTo(titleBox.y + h.height);

	// Part number rendered in mono — the detail a buyer actually needs.
	if (content.partNumber) {
		const row = stack.take(type.lead * 1.8);
		parts.push(
			rect({
				x: row.x,
				y: row.y,
				width: Math.min(row.width, ctx.canvas.width * 0.62),
				height: type.lead * 1.55,
				rx: radius(ctx.canvas, 'sm'),
				fill: palette.surface,
				stroke: palette.border,
				strokeWidth: 1,
			}),
			textBlock({
				lines: [truncate(`PART NO. ${content.partNumber}`, { maxWidth: ctx.canvas.width * 0.56, fontSize: type.small, weight: WEIGHT.medium, tracking: 0.06, family: fonts.names.mono })],
				x: row.x + type.small * 0.9,
				y: row.y + type.lead * 0.42,
				fontSize: type.small,
				fontFamily: fonts.mono,
				weight: WEIGHT.medium,
				fill: palette.accent,
				tracking: 0.06,
				boxWidth: ctx.canvas.width * 0.56,
				role: 'part-number',
			}),
		);
	}

	const ctaHeight = type.h4 * 2.1;
	const listBox = {
		x: layout.content.x,
		y: stack.cursor + space.sm,
		width: layout.content.width,
		height: Math.max(0, layout.content.y + layout.content.height - stack.cursor - space.sm - ctaHeight - space.sm),
	};
	if (content.compatibleWith.length && listBox.height > type.small * 2) {
		parts.push(
			textBlock({
				lines: ['COMPATIBLE WITH'],
				x: listBox.x,
				y: listBox.y,
				fontSize: type.micro,
				fontFamily: fonts.body,
				weight: WEIGHT.semibold,
				fill: palette.muted,
				tracking: TRACKING.label,
				boxWidth: listBox.width,
				role: 'label',
			}),
		);
		parts.push(
			featureList(ctx, {
				box: { ...listBox, y: listBox.y + type.micro * 2, height: listBox.height - type.micro * 2 },
				items: content.compatibleWith,
				maxItems: cfg.maxCompatible ?? 4,
			}).markup,
		);
	}

	parts.push(
		ctaButton(ctx, {
			box: {
				x: layout.content.x,
				y: layout.content.y + layout.content.height - ctaHeight,
				width: layout.content.width * 0.6,
				height: ctaHeight,
			},
			label: content.cta || 'Enquire Availability',
		}).markup,
	);
	parts.push(contactFooter(ctx, { box: layout.footer }));
	return group(parts);
}

/** Service families lead with the offer, not a photograph. */
export function serviceHighlight(ctx, content, tpl) {
	const cfg = tpl.config ?? {};
	const hasImage = Boolean(ctx.assets?.product?.dataUri) && cfg.showImage !== false;
	// The offer leads, so the copy is laid out first and any supporting image
	// takes the space that is genuinely left over rather than a fixed share.
	const layout = resolveLayout(ctx.canvas, {
		medialess: true,
		headerRatio: 0.1,
		footerRatio: 0.095,
	});
	const { space, type, palette, fonts, canvas } = ctx;
	const parts = [backdrop(ctx, { variant: cfg.background ?? 'deep' })];

	parts.push(logoLockup(ctx, { box: layout.header, maxHeight: layout.header.height * 0.72 }));

	const region = layout.inner;
	const stack = new Stack(region, space.sm);
	parts.push(eyebrowComponent(ctx, { box: stack.take(type.caption * 1.4), text: content.eyebrow || 'Service' }).markup);

	const titleBox = stack.take(0);
	const h = headline(ctx, {
		box: titleBox,
		text: content.title,
		maxLines: 3,
		size: hasImage ? type.h1 : type.display,
	});
	parts.push(h.markup);
	stack.syncTo(titleBox.y + h.height);

	if (content.subtitle) {
		const sub = subheading(ctx, { box: stack.take(0), text: content.subtitle, maxLines: 2 });
		parts.push(sub.markup);
		stack.syncTo(stack.cursor + sub.height);
	}

	const ctaHeight = type.h4 * 2.1;
	const bodyBottom = region.y + region.height - ctaHeight - space.sm;
	const pillarBox = {
		x: region.x,
		y: stack.cursor + space.md,
		width: region.width,
		height: Math.max(0, bodyBottom - stack.cursor - space.md),
	};

	// Numbered pillars read as a service scope rather than a bullet list.
	const pillars = (content.features.length ? content.features : content.specs.map((s) => `${s.label}: ${s.value}`)).slice(
		0,
		cfg.maxPillars ?? 4,
	);
	let pillarsBottom = pillarBox.y;
	if (pillars.length && pillarBox.height > type.small * 2.5) {
		const rowHeight = Math.min(pillarBox.height / pillars.length, type.small * 3.1);
		pillarsBottom = pillarBox.y + rowHeight * pillars.length;
		pillars.forEach((pillar, index) => {
			const y = pillarBox.y + index * rowHeight;
			const num = String(index + 1).padStart(2, '0');
			parts.push(
				textBlock({
					lines: [num],
					x: pillarBox.x,
					y,
					fontSize: type.small,
					fontFamily: fonts.mono,
					weight: WEIGHT.medium,
					fill: palette.accent,
					role: 'pillar-number',
				}),
				textBlock({
					lines: [truncate(pillar, { maxWidth: pillarBox.width - canvas.width * 0.07, fontSize: type.body, weight: WEIGHT.medium, family: fonts.names.body })],
					x: pillarBox.x + canvas.width * 0.07,
					y,
					fontSize: type.body,
					fontFamily: fonts.body,
					weight: WEIGHT.medium,
					fill: palette.text,
					boxWidth: pillarBox.width - canvas.width * 0.07,
					role: 'pillar',
				}),
				index < pillars.length - 1
					? line({
							x1: pillarBox.x,
							y1: y + rowHeight - type.small * 0.55,
							x2: pillarBox.x + pillarBox.width,
							y2: y + rowHeight - type.small * 0.55,
							stroke: palette.border,
							strokeWidth: 1,
						})
					: '',
			);
		});
	}

	// Supporting image occupies whatever remains beneath the pillars.
	if (hasImage) {
		const mediaTop = pillarsBottom + space.md;
		const mediaBox = {
			x: region.x,
			y: mediaTop,
			width: region.width,
			height: Math.max(0, bodyBottom - mediaTop),
		};
		if (mediaBox.height > canvas.height * 0.12) {
			parts.push(heroImage(ctx, { box: mediaBox, asset: ctx.assets.product, treatment: 'grounded' }));
		}
	}

	parts.push(
		ctaButton(ctx, {
			box: {
				x: region.x,
				y: region.y + region.height - ctaHeight,
				width: region.width * 0.6,
				height: ctaHeight,
			},
			label: content.cta || 'Book a Service Visit',
		}).markup,
	);
	parts.push(contactFooter(ctx, { box: layout.footer }));
	return group(parts);
}

/** Announcement layout — statement typography carries it. */
export function companyUpdate(ctx, content, tpl) {
	const cfg = tpl.config ?? {};
	const hasImage = Boolean(ctx.assets?.product?.dataUri) && cfg.showImage !== false;
	const layout = resolveLayout(ctx.canvas, {
		medialess: !hasImage,
		mediaWeight: cfg.mediaWeight ?? 0.3,
		headerRatio: 0.11,
		footerRatio: 0.095,
	});
	const { space, type, palette } = ctx;
	const parts = [backdrop(ctx, { variant: cfg.background ?? 'glass' })];

	parts.push(logoLockup(ctx, { box: layout.header, maxHeight: layout.header.height * 0.72 }));
	if (hasImage) {
		parts.push(heroImage(ctx, { box: layout.media, asset: ctx.assets.product, treatment: 'grounded' }));
	}

	const region = hasImage ? layout.content : layout.inner;
	const panel = cfg.glass === false ? region : insetBox(region, space.md);
	if (cfg.glass !== false) parts.push(glassPanel(ctx, region));

	const stack = new Stack(panel, space.sm);
	parts.push(
		eyebrowComponent(ctx, { box: stack.take(type.caption * 1.4), text: content.eyebrow || 'Update' }).markup,
	);

	const titleBox = stack.take(0);
	const h = headline(ctx, {
		box: titleBox,
		text: content.title,
		maxLines: 4,
		size: hasImage ? type.h1 : type.display,
	});
	parts.push(h.markup);
	stack.syncTo(titleBox.y + h.height);

	if (content.description && stack.fits(type.body * 3)) {
		const body = subheading(ctx, {
			box: stack.take(0),
			text: content.description,
			maxLines: 4,
			size: type.body,
		});
		parts.push(body.markup);
		stack.syncTo(stack.cursor + body.height);
	}

	const ctaHeight = type.h4 * 2.1;
	if (content.cta) {
		parts.push(
			ctaButton(ctx, {
				box: {
					x: panel.x,
					y: panel.y + panel.height - ctaHeight,
					width: panel.width * 0.6,
					height: ctaHeight,
				},
				label: content.cta,
			}).markup,
		);
	}
	parts.push(contactFooter(ctx, { box: layout.footer }));
	return group(parts);
}

/**
 * Story format. Built for 9:16 first: minimal text, one dominant product visual
 * and a CTA sized for a thumb.
 */
export function socialStory(ctx, content, tpl) {
	const cfg = tpl.config ?? {};
	const { canvas, space, type, palette, fonts } = ctx;
	// The image is not given a fixed share here: the headline is laid out first
	// and the product then fills whatever vertical space is genuinely left, so a
	// short title yields a bigger product rather than a band of empty canvas.
	const layout = resolveLayout(canvas, {
		medialess: true,
		headerRatio: 0.09,
		footerRatio: 0.095,
	});
	const parts = [backdrop(ctx, { variant: cfg.background ?? 'deep' })];

	parts.push(logoLockup(ctx, { box: layout.header, maxHeight: layout.header.height * 0.7 }));

	const topRegion = layout.inner;
	const stack = new Stack(topRegion, space.sm);
	parts.push(eyebrowComponent(ctx, { box: stack.take(type.caption * 1.4), text: content.eyebrow }).markup);

	const titleBox = stack.take(0);
	const h = headline(ctx, {
		box: titleBox,
		text: content.title,
		maxLines: 3,
		size: canvas.shape === 'vertical' ? type.hero : type.display,
	});
	parts.push(h.markup);
	stack.syncTo(titleBox.y + h.height);

	if (content.subtitle) {
		const sub = subheading(ctx, {
			box: stack.take(0),
			text: content.subtitle,
			maxLines: 1,
			size: type.lead,
		});
		parts.push(sub.markup);
		stack.syncTo(stack.cursor + sub.height);
	}

	// Up to three specs, inline, so the story stays glanceable.
	const specs = content.specs.slice(0, cfg.maxSpecs ?? 3);
	if (specs.length && stack.remaining > type.small * 3) {
		const chipBox = stack.take(Math.min(stack.remaining, type.small * 3.4));
		const cols = columns(chipBox, Math.min(specs.length, 3), space.sm);
		specs.slice(0, 3).forEach((spec, index) => {
			const cell = cols[index];
			parts.push(
				line({ x1: cell.x, y1: cell.y, x2: cell.x + cell.width * 0.5, y2: cell.y, stroke: palette.accent, strokeWidth: 2 }),
				textBlock({
					lines: [truncate(spec.value, { maxWidth: cell.width, fontSize: type.small, weight: WEIGHT.bold, family: fonts.names.body })],
					x: cell.x,
					y: cell.y + type.small * 0.5,
					fontSize: type.small,
					fontFamily: fonts.body,
					weight: WEIGHT.bold,
					fill: palette.text,
					boxWidth: cell.width,
					role: 'spec-value',
				}),
				textBlock({
					lines: [truncate(spec.label, { maxWidth: cell.width, fontSize: type.micro, weight: WEIGHT.medium, tracking: TRACKING.label, uppercase: true, family: fonts.names.body })],
					x: cell.x,
					y: cell.y + type.small * 1.9,
					fontSize: type.micro,
					fontFamily: fonts.body,
					weight: WEIGHT.medium,
					fill: palette.muted,
					tracking: TRACKING.label,
					uppercase: true,
					boxWidth: cell.width,
					role: 'spec-label',
				}),
			);
		});
	}

	// Full-width CTA — stories are tapped, not read.
	const ctaHeight = type.h4 * 2.2;
	const ctaBox = {
		x: topRegion.x,
		y: topRegion.y + topRegion.height - ctaHeight,
		width: topRegion.width,
		height: ctaHeight,
	};

	// Everything between the text and the CTA belongs to the product.
	const mediaTop = stack.cursor + space.md;
	const mediaBox = {
		x: topRegion.x,
		y: mediaTop,
		width: topRegion.width,
		height: Math.max(0, ctaBox.y - space.md - mediaTop),
	};
	if (mediaBox.height > canvas.height * 0.1) {
		parts.push(heroImage(ctx, { box: mediaBox, asset: ctx.assets?.product, treatment: 'spotlight' }));
	}

	if (content.cta) {
		parts.push(ctaButton(ctx, { box: ctaBox, label: content.cta, align: 'center', fullWidth: true }).markup);
	}
	parts.push(contactFooter(ctx, { box: layout.footer }));
	return group(parts);
}

/* ------------------------------------------------------------------ *
 * Registry
 * ------------------------------------------------------------------ */

export const FAMILIES = {
	'premium-product': premiumProduct,
	'modern-glass': modernGlass,
	'dark-laboratory': darkLaboratory,
	'clean-white-laboratory': cleanWhiteLaboratory,
	'technical-specification': technicalSpecification,
	'refurbished-instrument': refurbishedInstrument,
	'service-highlight': serviceHighlight,
	'spare-parts': spareParts,
	'company-update': companyUpdate,
	'social-story': socialStory,
	'instrument-sale': instrumentSale,
};

export const FAMILY_KEYS = Object.keys(FAMILIES);

/** Moves preferred labels to the front so a family shows what matters most. */
function prioritiseSpecs(specs, preferredLabels) {
	const wanted = preferredLabels.map((l) => l.toLowerCase());
	const score = (spec) => {
		const index = wanted.indexOf(spec.label.toLowerCase());
		return index === -1 ? wanted.length : index;
	};
	return [...specs].sort((a, b) => score(a) - score(b));
}
