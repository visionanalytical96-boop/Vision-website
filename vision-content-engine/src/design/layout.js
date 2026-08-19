/**
 * Adaptive layout.
 *
 * A template declares intent (a hero image, a content column, a footer) and this
 * module resolves that intent into concrete boxes for the target aspect ratio.
 * Square and portrait stack; landscape and wide split into columns; stories get
 * a tall centred composition. This is what stops one design being stretched
 * across every platform.
 */
import { safeArea, spacing as spacingScale, typeScale } from './tokens.js';

/**
 * @param {{width:number,height:number,shape:string}} canvas
 * @param {{mediaWeight?:number, headerRatio?:number, footerRatio?:number, reverse?:boolean, medialess?:boolean}} [options]
 */
export function resolveLayout(canvas, options = {}) {
	const safe = safeArea(canvas);
	const space = spacingScale(canvas);
	const type = typeScale(canvas);
	const { shape } = canvas;

	const headerRatio = options.headerRatio ?? 0.1;
	const footerRatio = options.footerRatio ?? 0.095;
	const reverse = Boolean(options.reverse);

	const headerHeight = Math.round(safe.height * headerRatio);
	const footerHeight = Math.round(safe.height * footerRatio);

	const header = { x: safe.left, y: safe.top, width: safe.width, height: headerHeight };
	const footer = {
		x: safe.left,
		y: safe.bottom - footerHeight,
		width: safe.width,
		height: footerHeight,
	};

	const innerTop = header.y + header.height + space.md;
	const innerBottom = footer.y - space.md;
	const innerHeight = Math.max(0, innerBottom - innerTop);
	const inner = { x: safe.left, y: innerTop, width: safe.width, height: innerHeight };

	if (options.medialess) {
		return { mode: 'stack', canvas, safe, space, type, header, footer, inner, media: null, content: inner };
	}

	const splitShapes = new Set(['landscape', 'wide']);
	if (splitShapes.has(shape)) {
		const mediaWeight = options.mediaWeight ?? (shape === 'wide' ? 0.34 : 0.44);
		const gutter = space.lg;
		const mediaWidth = Math.round((inner.width - gutter) * mediaWeight);
		const contentWidth = inner.width - gutter - mediaWidth;
		const mediaX = reverse ? inner.x + contentWidth + gutter : inner.x;
		const contentX = reverse ? inner.x : inner.x + mediaWidth + gutter;
		return {
			mode: 'split',
			canvas,
			safe,
			space,
			type,
			header,
			footer,
			inner,
			media: { x: mediaX, y: inner.y, width: mediaWidth, height: inner.height },
			content: { x: contentX, y: inner.y, width: contentWidth, height: inner.height },
		};
	}

	// Stacked shapes. Stories give the image more room; square gives text more.
	const defaultMediaWeight = shape === 'vertical' ? 0.46 : shape === 'portrait' ? 0.42 : 0.38;
	const mediaWeight = options.mediaWeight ?? defaultMediaWeight;
	const gutter = space.md;
	const mediaHeight = Math.round((inner.height - gutter) * mediaWeight);
	const contentHeight = inner.height - gutter - mediaHeight;
	const mediaY = reverse ? inner.y + contentHeight + gutter : inner.y;
	const contentY = reverse ? inner.y : inner.y + mediaHeight + gutter;

	return {
		mode: 'stack',
		canvas,
		safe,
		space,
		type,
		header,
		footer,
		inner,
		media: { x: inner.x, y: mediaY, width: inner.width, height: mediaHeight },
		content: { x: inner.x, y: contentY, width: inner.width, height: contentHeight },
	};
}

/**
 * Vertical stack helper — hands out sub-boxes from a region and tracks the
 * cursor so templates never hand-compute Y offsets (the usual source of
 * overlapping elements).
 */
export class Stack {
	constructor(box, gap = 0) {
		this.box = box;
		this.gap = gap;
		this.cursor = box.y;
		this.first = true;
	}

	get remaining() {
		return Math.max(0, this.box.y + this.box.height - this.cursor);
	}

	/** Reserves `height` and returns the box for it. */
	take(height, { gap = this.gap } = {}) {
		if (!this.first) this.cursor += gap;
		this.first = false;
		const box = { x: this.box.x, y: this.cursor, width: this.box.width, height };
		this.cursor += height;
		return box;
	}

	/** Reserves everything that is left. */
	rest({ gap = this.gap } = {}) {
		if (!this.first) this.cursor += gap;
		this.first = false;
		const box = { x: this.box.x, y: this.cursor, width: this.box.width, height: this.remaining };
		this.cursor = this.box.y + this.box.height;
		return box;
	}

	/** True when at least `height` still fits — used to drop optional sections. */
	fits(height, { gap = this.gap } = {}) {
		return this.remaining - (this.first ? 0 : gap) >= height;
	}

	/** Pushes the cursor to the bottom of `box`. */
	syncTo(y) {
		this.cursor = Math.max(this.cursor, y);
		this.first = false;
	}
}

/** Splits a box into `count` columns with a gutter. */
export function columns(box, count, gutter) {
	const width = (box.width - gutter * (count - 1)) / count;
	return Array.from({ length: count }, (_, i) => ({
		x: box.x + i * (width + gutter),
		y: box.y,
		width,
		height: box.height,
	}));
}

/** Splits a box into a grid, filling row by row. */
export function grid(box, { cols, rows, gutterX, gutterY }) {
	const width = (box.width - gutterX * (cols - 1)) / cols;
	const height = (box.height - gutterY * (rows - 1)) / rows;
	const cells = [];
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			cells.push({
				x: box.x + c * (width + gutterX),
				y: box.y + r * (height + gutterY),
				width,
				height,
			});
		}
	}
	return cells;
}
