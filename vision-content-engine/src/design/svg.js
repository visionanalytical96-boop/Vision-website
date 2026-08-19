/**
 * SVG primitives.
 *
 * Templates compose from these helpers rather than emitting raw markup, which is
 * what keeps alignment, spacing and image handling consistent across families.
 */
import { measureText } from './text.js';

export function escapeXml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
}

const round = (n) => Math.round(Number(n) * 100) / 100;

/** Collects <defs> entries, de-duplicating by id. */
export class Defs {
	constructor() {
		this.entries = new Map();
	}

	add(id, markup) {
		if (!this.entries.has(id)) this.entries.set(id, markup);
		return id;
	}

	linearGradient(id, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
		const body = stops
			.map((s) => `<stop offset="${round(s.offset)}" stop-color="${s.color}"${s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ''}/>`)
			.join('');
		return this.add(id, `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${body}</linearGradient>`);
	}

	radialGradient(id, stops, { cx = 0.5, cy = 0.5, r = 0.6 } = {}) {
		const body = stops
			.map((s) => `<stop offset="${round(s.offset)}" stop-color="${s.color}"${s.opacity !== undefined ? ` stop-opacity="${s.opacity}"` : ''}/>`)
			.join('');
		return this.add(id, `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${body}</radialGradient>`);
	}

	/** Soft ambient shadow — restrained, never a hard drop shadow. */
	softShadow(id, { dy = 18, blur = 34, color = 'rgba(0,0,0,0.45)' } = {}) {
		return this.add(
			id,
			`<filter id="${id}" x="-40%" y="-40%" width="180%" height="180%">` +
				`<feDropShadow dx="0" dy="${round(dy)}" stdDeviation="${round(blur / 2)}" flood-color="${color}"/>` +
				`</filter>`,
		);
	}

	glow(id, { blur = 24, color = '#00E5FF', opacity = 0.55 } = {}) {
		return this.add(
			id,
			`<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%">` +
				`<feDropShadow dx="0" dy="0" stdDeviation="${round(blur / 2)}" flood-color="${color}" flood-opacity="${opacity}"/>` +
				`</filter>`,
		);
	}

	blur(id, amount = 40) {
		return this.add(id, `<filter id="${id}"><feGaussianBlur stdDeviation="${round(amount)}"/></filter>`);
	}

	clipRect(id, { x, y, width, height, rx = 0 }) {
		return this.add(
			id,
			`<clipPath id="${id}"><rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" rx="${round(rx)}"/></clipPath>`,
		);
	}

	render() {
		return this.entries.size ? `<defs>${[...this.entries.values()].join('')}</defs>` : '';
	}
}

export function rect({ x, y, width, height, rx = 0, fill = 'none', stroke, strokeWidth = 1, opacity, filter, clipPath }) {
	const attrs = [
		`x="${round(x)}"`,
		`y="${round(y)}"`,
		`width="${round(width)}"`,
		`height="${round(height)}"`,
		rx ? `rx="${round(rx)}"` : '',
		`fill="${fill}"`,
		stroke ? `stroke="${stroke}" stroke-width="${round(strokeWidth)}"` : '',
		opacity !== undefined ? `opacity="${opacity}"` : '',
		filter ? `filter="url(#${filter})"` : '',
		clipPath ? `clip-path="url(#${clipPath})"` : '',
	].filter(Boolean);
	return `<rect ${attrs.join(' ')}/>`;
}

export function line({ x1, y1, x2, y2, stroke, strokeWidth = 1, opacity, linecap = 'round' }) {
	return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" stroke="${stroke}" stroke-width="${round(strokeWidth)}" stroke-linecap="${linecap}"${opacity !== undefined ? ` opacity="${opacity}"` : ''}/>`;
}

export function circle({ cx, cy, r, fill = 'none', stroke, strokeWidth = 1, opacity, filter }) {
	return `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${round(strokeWidth)}"` : ''}${opacity !== undefined ? ` opacity="${opacity}"` : ''}${filter ? ` filter="url(#${filter})"` : ''}/>`;
}

export function group(children, { transform, opacity, clipPath, filter } = {}) {
	const attrs = [
		transform ? `transform="${transform}"` : '',
		opacity !== undefined ? `opacity="${opacity}"` : '',
		clipPath ? `clip-path="url(#${clipPath})"` : '',
		filter ? `filter="url(#${filter})"` : '',
	].filter(Boolean);
	return `<g${attrs.length ? ` ${attrs.join(' ')}` : ''}>${[].concat(children).filter(Boolean).join('')}</g>`;
}

/**
 * A text block. `boxWidth`/`boxHeight` are stamped as data attributes so the
 * renderer's validation pass can verify the real rendered bounds fit.
 */
export function textBlock({
	lines,
	x,
	y,
	fontSize,
	fontFamily,
	weight = 400,
	fill,
	tracking = 0,
	lineHeight = 1.15,
	anchor = 'start',
	uppercase = false,
	opacity,
	boxWidth,
	boxHeight,
	role = 'text',
}) {
	const items = [].concat(lines).filter((l) => l !== undefined && l !== null && String(l) !== '');
	if (!items.length) return '';
	const step = fontSize * lineHeight;
	const tspans = items
		.map((textLine, index) => {
			const value = uppercase ? String(textLine).toUpperCase() : String(textLine);
			return `<tspan x="${round(x)}" dy="${index === 0 ? 0 : round(step)}">${escapeXml(value)}</tspan>`;
		})
		.join('');
	const attrs = [
		`x="${round(x)}"`,
		`y="${round(y + fontSize * 0.82)}"`,
		`font-family="${fontFamily}"`,
		`font-size="${round(fontSize)}"`,
		`font-weight="${weight}"`,
		`fill="${fill}"`,
		tracking ? `letter-spacing="${round(tracking * fontSize)}"` : '',
		anchor !== 'start' ? `text-anchor="${anchor}"` : '',
		opacity !== undefined ? `opacity="${opacity}"` : '',
		`data-role="${role}"`,
		boxWidth ? `data-fit-w="${round(boxWidth)}"` : '',
		boxHeight ? `data-fit-h="${round(boxHeight)}"` : '',
	].filter(Boolean);
	return `<text ${attrs.join(' ')}>${tspans}</text>`;
}

/**
 * Contain-fit an image inside a box without ever distorting it.
 * @returns {{x:number,y:number,width:number,height:number}}
 */
export function containFit({ box, naturalWidth, naturalHeight, align = 'center' }) {
	const nw = Number(naturalWidth) > 0 ? Number(naturalWidth) : box.width;
	const nh = Number(naturalHeight) > 0 ? Number(naturalHeight) : box.height;
	const scale = Math.min(box.width / nw, box.height / nh);
	const width = nw * scale;
	const height = nh * scale;
	const x = box.x + (box.width - width) / 2;
	let y = box.y + (box.height - height) / 2;
	if (align === 'bottom') y = box.y + box.height - height;
	if (align === 'top') y = box.y;
	return { x: round(x), y: round(y), width: round(width), height: round(height) };
}

/** Embeds an image. `href` should already be a data URI to keep rendering offline. */
export function image({ href, x, y, width, height, opacity, filter, clipPath }) {
	if (!href) return '';
	const attrs = [
		`href="${href}"`,
		`x="${round(x)}"`,
		`y="${round(y)}"`,
		`width="${round(width)}"`,
		`height="${round(height)}"`,
		// Geometry is pre-computed by containFit, so never let the renderer scale.
		`preserveAspectRatio="none"`,
		opacity !== undefined ? `opacity="${opacity}"` : '',
		filter ? `filter="url(#${filter})"` : '',
		clipPath ? `clip-path="url(#${clipPath})"` : '',
		'data-role="product-image"',
	].filter(Boolean);
	return `<image ${attrs.join(' ')}/>`;
}

/** Pill-shaped badge that sizes itself to its label. */
export function badge({
	label,
	x,
	y,
	fontSize,
	fontFamily,
	weight = 600,
	fill,
	background,
	border,
	tracking = 0.12,
	paddingX = fontSize * 0.9,
	paddingY = fontSize * 0.55,
	uppercase = true,
	anchor = 'start',
	metricFamily,
}) {
	const text = uppercase ? String(label).toUpperCase() : String(label);
	const textWidth = measureText(text, { fontSize, weight, tracking, uppercase: false, family: metricFamily });
	const width = textWidth + paddingX * 2;
	const height = fontSize + paddingY * 2;
	const boxX = anchor === 'end' ? x - width : anchor === 'middle' ? x - width / 2 : x;
	return {
		width,
		height,
		markup:
			rect({
				x: boxX,
				y,
				width,
				height,
				rx: height / 2,
				fill: background ?? 'none',
				stroke: border,
				strokeWidth: Math.max(1, fontSize * 0.06),
			}) +
			textBlock({
				lines: [text],
				x: boxX + paddingX,
				y: y + paddingY,
				fontSize,
				fontFamily,
				weight,
				fill,
				tracking,
				role: 'badge',
				boxWidth: width - paddingX * 2,
			}),
	};
}

/** Builds the final SVG document. */
export function svgDocument({ width, height, defs, children, fontCss = '', background = 'none' }) {
	const style = fontCss ? `<style>${fontCss}</style>` : '';
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
		`width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
		style +
		(defs ? defs.render() : '') +
		(background !== 'none' ? rect({ x: 0, y: 0, width, height, fill: background }) : '') +
		[].concat(children).filter(Boolean).join('') +
		`</svg>`
	);
}
