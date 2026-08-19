/**
 * Minimal multipart/form-data parser for file uploads.
 *
 * Only what this engine needs: modest numbers of small parts, already size
 * capped by the caller. Buffers are handled as bytes throughout so binary
 * uploads are never corrupted by string conversion.
 */

/**
 * @param {Buffer} body
 * @param {string} contentType
 * @returns {{fields:Record<string,string>, files:Array<{field:string,filename:string,contentType:string,data:Buffer}>}}
 */
export function parseMultipart(body, contentType) {
	const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType ?? '');
	if (!boundaryMatch) throw Object.assign(new Error('Missing multipart boundary'), { status: 400 });
	const boundary = `--${(boundaryMatch[1] ?? boundaryMatch[2]).trim()}`;

	const fields = {};
	const files = [];

	const delimiter = Buffer.from(`\r\n${boundary}`);
	// Prefixing lets the first boundary be found by the same search.
	const buffer = Buffer.concat([Buffer.from('\r\n'), body]);

	let position = buffer.indexOf(delimiter);
	if (position === -1) throw Object.assign(new Error('Malformed multipart body'), { status: 400 });

	while (position !== -1) {
		const partStart = position + delimiter.length;
		// `--` after a boundary marks the end of the payload.
		if (buffer.subarray(partStart, partStart + 2).toString() === '--') break;

		const headerStart = partStart + 2; // skip CRLF
		const headerEnd = buffer.indexOf('\r\n\r\n', headerStart);
		if (headerEnd === -1) break;

		const headers = buffer.subarray(headerStart, headerEnd).toString('utf8');
		const bodyStart = headerEnd + 4;
		const next = buffer.indexOf(delimiter, bodyStart);
		if (next === -1) break;

		const data = buffer.subarray(bodyStart, next);
		const disposition = /content-disposition:[^\n]*/i.exec(headers)?.[0] ?? '';
		const field = /name="([^"]*)"/i.exec(disposition)?.[1];
		const filename = /filename="([^"]*)"/i.exec(disposition)?.[1];
		const partType = /content-type:\s*([^\s;]+)/i.exec(headers)?.[1] ?? 'application/octet-stream';

		if (field) {
			if (filename !== undefined) {
				// An empty filename means the file input was left blank.
				if (filename) files.push({ field, filename, contentType: partType, data: Buffer.from(data) });
			} else {
				fields[field] = data.toString('utf8');
			}
		}
		position = next;
	}

	return { fields, files };
}
