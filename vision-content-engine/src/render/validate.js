/**
 * Visual quality validation.
 *
 * Runs against geometry measured in the browser after rendering, so it catches
 * real overflow and collisions rather than trusting the estimates used during
 * composition. Failures block the save; warnings are recorded with the asset.
 */

// Estimation is a few percent optimistic on some faces; allow a small margin
// before calling something an overflow.
const WIDTH_TOLERANCE = 1.02;
const OVERLAP_AREA_THRESHOLD = 0.12;

// Roles that must never collide. Decorative roles are excluded deliberately.
const COLLIDING_ROLES = new Set([
	'headline',
	'subheading',
	'eyebrow',
	'spec-label',
	'spec-value',
	'cta',
	'contact',
	'price',
	'stock',
	'badge',
	'part-number',
	'feature',
	'pillar',
]);

/**
 * @param {{canvas:{width:number,height:number}, nodes:Array}} measurements
 * @returns {{ok:boolean, errors:string[], warnings:string[], overflowRatio:number}}
 */
export function validateMeasurements(measurements) {
	const errors = [];
	const warnings = [];
	let overflowRatio = 1;

	if (!measurements || !Array.isArray(measurements.nodes)) {
		return { ok: true, errors, warnings: ['Layout could not be measured; skipped geometry checks.'], overflowRatio };
	}

	const { canvas, nodes } = measurements;

	for (const node of nodes) {
		if (!node || !Number.isFinite(node.width)) continue;
		const label = describe(node);

		// 1. Declared box overflow.
		if (node.fitW && node.width > node.fitW * WIDTH_TOLERANCE) {
			const ratio = node.width / node.fitW;
			overflowRatio = Math.max(overflowRatio, ratio);
			errors.push(`${label} overflows its column by ${Math.round((ratio - 1) * 100)}%`);
		}
		if (node.fitH && node.height > node.fitH * WIDTH_TOLERANCE) {
			const ratio = node.height / node.fitH;
			overflowRatio = Math.max(overflowRatio, ratio);
			errors.push(`${label} is taller than its allotted block by ${Math.round((ratio - 1) * 100)}%`);
		}

		// 2. Escaping the canvas entirely.
		if (node.width > 0 && node.height > 0) {
			const overshootRight = node.x + node.width - canvas.width;
			const overshootBottom = node.y + node.height - canvas.height;
			if (node.x < -1 || node.y < -1) {
				errors.push(`${label} is positioned outside the canvas`);
			} else if (overshootRight > 1 || overshootBottom > 1) {
				errors.push(`${label} extends past the canvas edge`);
				overflowRatio = Math.max(
					overflowRatio,
					overshootRight > 1 ? (node.width + overshootRight) / node.width : 1,
				);
			}
		}
	}

	// 3. Collisions between meaningful text blocks.
	const boxes = nodes.filter(
		(n) => n && COLLIDING_ROLES.has(n.role) && n.width > 0 && n.height > 0,
	);
	for (let i = 0; i < boxes.length; i += 1) {
		for (let j = i + 1; j < boxes.length; j += 1) {
			const a = boxes[i];
			const b = boxes[j];
			const overlap = intersectionArea(a, b);
			if (overlap <= 0) continue;
			const smaller = Math.min(a.width * a.height, b.width * b.height);
			if (smaller > 0 && overlap / smaller > OVERLAP_AREA_THRESHOLD) {
				errors.push(`${describe(a)} overlaps ${describe(b)}`);
			}
		}
	}

	if (!nodes.some((n) => n.role === 'product-image' || n.role === 'placeholder')) {
		warnings.push('No product image was rendered');
	}
	if (!nodes.some((n) => n.role === 'logo' || n.role === 'logo-accent')) {
		warnings.push('Brand logo is not visible on this layout');
	}

	return { ok: errors.length === 0, errors: dedupe(errors), warnings: dedupe(warnings), overflowRatio };
}

function intersectionArea(a, b) {
	const x = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
	const y = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
	return x * y;
}

function describe(node) {
	const text = String(node.text ?? '').trim();
	const snippet = text.length > 24 ? `${text.slice(0, 24)}…` : text;
	return snippet ? `${node.role} "${snippet}"` : node.role;
}

function dedupe(list) {
	return [...new Set(list)];
}

/** Basic sanity checks on the encoded bytes before anything is written to disk. */
export function validateEncodedImage(buffer, format) {
	if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
		return { ok: false, error: 'Renderer returned an empty image' };
	}
	// A correctly rendered poster is never this small; a few hundred bytes means
	// a blank or failed paint.
	if (buffer.length < 1024) {
		return { ok: false, error: `Rendered image is suspiciously small (${buffer.length} bytes)` };
	}
	const signatures = {
		png: [0x89, 0x50, 0x4e, 0x47],
		jpeg: [0xff, 0xd8, 0xff],
		webp: [0x52, 0x49, 0x46, 0x46],
	};
	const expected = signatures[format];
	if (expected && !expected.every((byte, i) => buffer[i] === byte)) {
		return { ok: false, error: `Rendered bytes are not valid ${format}` };
	}
	return { ok: true };
}
