/**
 * Document generation: validate the filled fields, compose the A4 HTML, render
 * it to PDF and store it alongside everything else the engine produces.
 */
import { documentShell } from './layout.js';
import { DOCUMENT_BUILDERS, DOCUMENT_META } from './templates.js';
import { DOCUMENT_FIELDS, validateFields } from './fields.js';
import { currentBranding } from '../engine/generator.js';
import { log } from '../engine/logger.js';
import { saveGenerated } from '../engine/storage.js';
import { getChromium } from '../render/chromium.js';
import { documents } from '../db/repositories.js';

/** Builds the full A4 HTML for a document without rendering it. */
export function composeDocument(kind, values, branding = currentBranding()) {
	const build = DOCUMENT_BUILDERS[kind];
	if (!build) throw new Error(`Unknown document type: ${kind}`);

	const meta = DOCUMENT_META[kind] ?? {};
	return documentShell({
		branding,
		title: meta.title ? meta.title(values) : (DOCUMENT_FIELDS[kind]?.name ?? 'Document'),
		reference: values.reference,
		date: values.date,
		watermark: meta.watermark ? meta.watermark(values) : null,
		body: build(values, branding),
	});
}

/**
 * Validates, renders and stores a document.
 *
 * @param {{kind:string, values:object, title?:string, documentId?:number}} params
 * @returns {Promise<{document:object, bytes:number}>}
 */
export async function generateDocument({ kind, values = {}, title = null, documentId = null }) {
	if (!DOCUMENT_FIELDS[kind]) throw new Error(`Unknown document type: ${kind}`);

	const check = validateFields(kind, values);
	if (!check.ok) {
		throw Object.assign(new Error(check.errors.join('; ')), { validation: check.errors });
	}

	const branding = currentBranding();
	const displayTitle = title || documentTitle(kind, values);

	// The record exists before rendering so a failure is inspectable, matching
	// how generated posters are handled.
	let record =
		(documentId ? documents.find(documentId) : null) ??
		documents.create({ kind, title: displayTitle, fields: values, status: 'generating' });

	try {
		const chromium = getChromium();
		if (!chromium) {
			throw new Error('No browser available to render PDFs. Install Chrome or Chromium.');
		}

		const html = composeDocument(kind, values, branding);
		const pdf = await chromium.renderPdf(html);

		if (!pdf || pdf.length < 1000 || pdf.subarray(0, 4).toString() !== '%PDF') {
			throw new Error('Renderer did not return a valid PDF');
		}

		const stored = saveGenerated(pdf, {
			category: 'documents',
			product: kind,
			template: slugPart(displayTitle),
			extension: 'pdf',
		});

		record = documents.setStatus(record.id, 'generated', {
			fileName: stored.key,
			fileSize: stored.size,
			error: null,
		});

		log.info('document.generated', `Generated ${DOCUMENT_FIELDS[kind].name}`, {
			documentId: record.id,
			kind,
			bytes: stored.size,
		});

		return { document: record, bytes: stored.size };
	} catch (err) {
		record = documents.setStatus(record.id, 'failed', { error: err.message });
		log.error('document.failed', err.message, { documentId: record.id, kind });
		throw Object.assign(new Error(`Document generation failed: ${err.message}`), {
			documentId: record.id,
		});
	}
}

/** A readable title derived from the most identifying field of each document. */
function documentTitle(kind, v) {
	const name = DOCUMENT_FIELDS[kind].name;
	const subject =
		v.customer || v.candidateName || v.participantName || v.billTo || v.recipient || v.subject;
	return subject ? `${name} — ${subject}` : name;
}

function slugPart(value) {
	return String(value)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 50);
}
