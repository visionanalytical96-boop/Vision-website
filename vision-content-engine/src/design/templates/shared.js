/**
 * The standard composition every product-style family builds on.
 *
 * Families differ by theme, background treatment, image handling and which
 * optional blocks they enable — not by re-implementing layout. Optional blocks
 * are dropped when they do not fit rather than being compressed, which is what
 * keeps output uncrowded on smaller canvases.
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
import { resolveLayout, Stack } from '../layout.js';
import { badge, group } from '../svg.js';
import { TRACKING, WEIGHT } from '../tokens.js';

/**
 * @param {object} ctx     render context
 * @param {object} content content model
 * @param {object} opts    composition options supplied by the family
 */
export function standardComposition(ctx, content, opts = {}) {
	const {
		background = 'deep',
		mediaWeight,
		reverse = false,
		headerRatio = 0.1,
		footerRatio = 0.095,
		imageTreatment = 'grounded',
		showLogo = true,
		showBadge = true,
		showEyebrow = true,
		showSubtitle = true,
		showSpecs = true,
		specVariant = 'rows',
		maxSpecs,
		showFeatures = false,
		maxFeatures = 3,
		showPrice = true,
		showCta = true,
		showContact = true,
		glassContent = false,
		headlineWeight = WEIGHT.black,
		headlineUppercase = false,
		accentColor,
	} = opts;

	const layout = resolveLayout(ctx.canvas, { mediaWeight, reverse, headerRatio, footerRatio });
	const { space, type, palette } = ctx;
	const parts = [backdrop(ctx, { variant: background })];

	/* ---- header ---- */
	if (showLogo) {
		parts.push(logoLockup(ctx, { box: layout.header, maxHeight: layout.header.height * 0.72 }));
	}
	if (showBadge && content.badgeLabel) {
		const b = badge({
			label: content.badgeLabel,
			x: layout.header.x + layout.header.width,
			y: layout.header.y,
			fontSize: type.caption,
			fontFamily: ctx.fonts.body,
			weight: WEIGHT.bold,
			fill: accentColor ?? palette.accent,
			background: palette.surface,
			border: accentColor ?? palette.borderStrong,
			anchor: 'end',
			metricFamily: ctx.fonts.names.body,
		});
		parts.push(b.markup);
	}

	/* ---- media ---- */
	if (layout.media) {
		parts.push(heroImage(ctx, { box: layout.media, asset: ctx.assets?.product, treatment: imageTreatment }));
	}

	/* ---- content ---- */
	const contentBox = glassContent ? insetBox(layout.content, space.md) : layout.content;
	if (glassContent) parts.push(glassPanel(ctx, layout.content));

	const stack = new Stack(contentBox, space.sm);

	if (showEyebrow && content.eyebrow) {
		const el = eyebrowComponent(ctx, {
			box: stack.take(type.caption * 1.4),
			text: content.eyebrow,
			color: accentColor,
		});
		parts.push(el.markup);
	}

	// Headline is sized from the space actually available.
	const headlineSize = pickHeadlineSize(ctx, stack.remaining, layout.mode);
	const headlineBox = stack.take(0);
	const h = headline(ctx, {
		box: headlineBox,
		text: content.title,
		maxLines: layout.mode === 'split' ? 3 : 2,
		size: headlineSize,
		weight: headlineWeight,
		uppercase: headlineUppercase,
	});
	parts.push(h.markup);
	stack.syncTo(headlineBox.y + h.height);

	if (showSubtitle && content.subtitle && stack.fits(type.lead * 1.4)) {
		const sub = subheading(ctx, { box: stack.take(0), text: content.subtitle, maxLines: 2 });
		parts.push(sub.markup);
		stack.syncTo(stack.cursor + sub.height);
	}

	// Reserve the bottom row (price + CTA) before handing the rest to specs.
	const bottomRowHeight = showCta || showPrice ? type.h4 * 2.1 : 0;
	const listRegion = {
		x: contentBox.x,
		y: stack.cursor + space.sm,
		width: contentBox.width,
		height: Math.max(0, contentBox.y + contentBox.height - stack.cursor - space.sm - bottomRowHeight - space.sm),
	};

	let listCursor = listRegion.y;
	if (showSpecs && content.specs.length && listRegion.height > type.small * 2) {
		const spec = specList(ctx, {
			box: { ...listRegion, y: listCursor, height: listRegion.height },
			specs: content.specs,
			maxRows: maxSpecs,
			variant: specVariant,
		});
		parts.push(spec.markup);
		listCursor += spec.height;
	}

	if (showFeatures && content.features.length) {
		const remaining = listRegion.y + listRegion.height - listCursor - space.sm;
		if (remaining > type.small * 2) {
			const feats = featureList(ctx, {
				box: { x: listRegion.x, y: listCursor + space.sm, width: listRegion.width, height: remaining },
				items: content.features,
				maxItems: maxFeatures,
			});
			parts.push(feats.markup);
		}
	}

	/* ---- bottom row: CTA left, price right ---- */
	if (bottomRowHeight > 0) {
		const rowY = contentBox.y + contentBox.height - bottomRowHeight;
		const rowBox = { x: contentBox.x, y: rowY, width: contentBox.width, height: bottomRowHeight };
		if (showPrice && (content.price || content.stockStatus)) {
			const price = priceBlock(ctx, {
				box: { ...rowBox, width: rowBox.width * 0.45, x: rowBox.x + rowBox.width * 0.55 },
				price: content.price,
				priceType: content.priceType,
				stockStatus: content.stockStatus,
			});
			parts.push(price.markup);
		}
		if (showCta && content.cta) {
			const cta = ctaButton(ctx, {
				box: { ...rowBox, width: rowBox.width * 0.55 },
				label: content.cta,
			});
			parts.push(cta.markup);
		}
	}

	/* ---- footer ---- */
	if (showContact) {
		parts.push(
			contactFooter(ctx, {
				box: layout.footer,
				items: content.footerItems ?? undefined,
			}),
		);
	}

	return group(parts);
}

/** Headline size adapts to the room left in the content column. */
function pickHeadlineSize(ctx, available, mode) {
	const { type, canvas } = ctx;
	if (mode === 'split') return canvas.shape === 'wide' ? type.h2 : type.h1;
	if (available < canvas.height * 0.2) return type.h3;
	if (canvas.shape === 'vertical') return type.display;
	return type.h1;
}

export function insetBox(box, amount) {
	return {
		x: box.x + amount,
		y: box.y + amount,
		width: box.width - amount * 2,
		height: box.height - amount * 2,
	};
}

export { TRACKING, WEIGHT };
