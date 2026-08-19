/**
 * Image inspection without native dependencies.
 *
 * Intrinsic dimensions are required up front so the layout can contain-fit
 * product photography instead of distorting it, and the format sniffing doubles
 * as upload validation — the declared MIME type is never trusted.
 */

const SVG_MIME = 'image/svg+xml';

/**
 * @param {Buffer} buffer
 * @returns {{format:string, mime:string, width:number, height:number}|null}
 */
export function inspectImage(buffer) {
	if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
	return (
		readPng(buffer) ?? readJpeg(buffer) ?? readWebp(buffer) ?? readGif(buffer) ?? readSvg(buffer) ?? null
	);
}

function readPng(buf) {
	const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
	if (!signature.every((byte, i) => buf[i] === byte)) return null;
	// IHDR is always the first chunk: length(4) type(4) width(4) height(4)
	if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
	return {
		format: 'png',
		mime: 'image/png',
		width: buf.readUInt32BE(16),
		height: buf.readUInt32BE(20),
	};
}

function readJpeg(buf) {
	if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
	let offset = 2;
	while (offset < buf.length - 9) {
		if (buf[offset] !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = buf[offset + 1];
		// Standalone markers carry no payload.
		if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
			offset += 2;
			continue;
		}
		const length = buf.readUInt16BE(offset + 2);
		// SOF0..SOF15, excluding DHT (c4), JPGA (c8) and DAC (cc).
		const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
		if (isSof) {
			return {
				format: 'jpeg',
				mime: 'image/jpeg',
				height: buf.readUInt16BE(offset + 5),
				width: buf.readUInt16BE(offset + 7),
			};
		}
		offset += 2 + length;
	}
	return null;
}

function readWebp(buf) {
	if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
	const chunk = buf.toString('ascii', 12, 16);
	const base = { format: 'webp', mime: 'image/webp' };
	if (chunk === 'VP8 ') {
		// Lossy: 14-bit dimensions after the 3-byte start code.
		return { ...base, width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
	}
	if (chunk === 'VP8L') {
		const bits = buf.readUInt32LE(21);
		return { ...base, width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
	}
	if (chunk === 'VP8X') {
		const width = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
		const height = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
		return { ...base, width, height };
	}
	return null;
}

function readGif(buf) {
	if (buf.toString('ascii', 0, 3) !== 'GIF') return null;
	return { format: 'gif', mime: 'image/gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function readSvg(buf) {
	const head = buf.subarray(0, 2048).toString('utf8');
	if (!/<svg[\s>]/i.test(head)) return null;
	const attr = (name) => {
		const match = head.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
		return match ? Number.parseFloat(match[1]) : Number.NaN;
	};
	let width = attr('width');
	let height = attr('height');
	if (!Number.isFinite(width) || !Number.isFinite(height)) {
		const viewBox = head.match(/viewBox\s*=\s*["']([^"']+)["']/i);
		if (viewBox) {
			const nums = viewBox[1].trim().split(/[\s,]+/).map(Number);
			if (nums.length === 4) {
				width = nums[2];
				height = nums[3];
			}
		}
	}
	if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
	return { format: 'svg', mime: SVG_MIME, width, height };
}

/** Builds a data URI for embedding into generated SVG. */
export function toDataUri(buffer, mime) {
	return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Loads an image file into a renderable asset.
 * @returns {{dataUri:string, width:number, height:number, mime:string, format:string}|null}
 */
export function toImageAsset(buffer) {
	const info = inspectImage(buffer);
	if (!info) return null;
	return { ...info, dataUri: toDataUri(buffer, info.mime) };
}
