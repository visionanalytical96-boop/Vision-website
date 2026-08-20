/**
 * Shared A4 page shell: letterhead, footer, and the print stylesheet every
 * document is composed into.
 *
 * Deliberately a light page. The website and the social posters are dark, but a
 * dark A4 sheet is wrong for print — it drains toner, photocopies badly and
 * reads as a screenshot rather than a document. The brand carries through the
 * accent rule, the wordmark and the typography instead of the background.
 */
import { loadFonts, fontStacks } from '../design/fonts.js';

export function escapeHtml(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Turns a textarea value into paragraphs, preserving intentional blank lines. */
export function paragraphs(value) {
	return String(value ?? '')
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.filter(Boolean)
		.map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
		.join('');
}

/** Splits a "one per line" field into an array. */
export function lines(value) {
	if (Array.isArray(value)) return value.filter(Boolean);
	return String(value ?? '')
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean);
}

export function formatDate(value) {
	if (!value) return '';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return String(value);
	return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** A labelled value pair, the basic unit of every form-like document block. */
export function pair(label, value, { span = 1 } = {}) {
	if (!value) return '';
	return `<div class="pair${span > 1 ? ' span' : ''}">
		<span class="pair-l">${escapeHtml(label)}</span>
		<span class="pair-v">${escapeHtml(value)}</span>
	</div>`;
}

/** Data table with a header row. Empty rows are dropped. */
export function dataTable(columns, rows, { numbered = true } = {}) {
	const body = (rows ?? []).filter((row) => row.some((cell) => String(cell ?? '').trim()));
	if (!body.length) return '';
	return `<table class="grid">
		<thead><tr>${numbered ? '<th class="num">#</th>' : ''}${columns
			.map((c) => `<th>${escapeHtml(c)}</th>`)
			.join('')}</tr></thead>
		<tbody>${body
			.map(
				(row, i) =>
					`<tr>${numbered ? `<td class="num">${i + 1}</td>` : ''}${columns
						.map((_, ci) => `<td>${escapeHtml(row[ci] ?? '')}</td>`)
						.join('')}</tr>`,
			)
			.join('')}</tbody>
	</table>`;
}

/** Signature block. Two or three columns depending on what is supplied. */
export function signatures(blocks) {
	const present = blocks.filter((b) => b && b.name);
	if (!present.length) return '';
	return `<div class="signs">${present
		.map(
			(b) => `<div class="sign">
			<div class="sign-line"></div>
			<div class="sign-name">${escapeHtml(b.name)}</div>
			${b.title ? `<div class="sign-title">${escapeHtml(b.title)}</div>` : ''}
			${b.role ? `<div class="sign-role">${escapeHtml(b.role)}</div>` : ''}
		</div>`,
		)
		.join('')}</div>`;
}

/**
 * Wraps document content in the branded A4 sheet.
 *
 * @param {object} params
 * @param {object} params.branding
 * @param {string} params.title      document title shown under the letterhead
 * @param {string} params.body       document-specific HTML
 * @param {string} [params.reference]
 * @param {string} [params.date]
 * @param {string} [params.accent]   override the accent colour
 */
export function documentShell({ branding, title, body, reference, date, watermark }) {
	const { css: fontCss } = loadFonts(branding);
	const fonts = fontStacks(branding);
	const c = branding.colors;
	const contact = branding.contact;

	// Print-safe versions of the brand colours: the screen cyan is too light to
	// read on white, so the rules and headings use the deeper brand blue.
	const accentInk = c.primary;
	const accentRule = c.accent;

	const contactLine = [contact.phone, contact.email, contact.website].filter(Boolean).join('  ·  ');

	return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>
${fontCss}
@page { size: A4; margin: 16mm 15mm 18mm; }

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
	font-family: ${fonts.body};
	font-size: 10.2pt;
	line-height: 1.58;
	color: #16202B;
	background: #FFFFFF;
	-webkit-print-color-adjust: exact;
	print-color-adjust: exact;
}

/* ---- letterhead ---- */
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14mm; }
.mark { font-family: ${fonts.display}; line-height: 1; }
.mark-a { font-size: 21pt; font-weight: 800; letter-spacing: -0.02em; color: #0B1520; display: block; }
.mark-b {
	font-family: ${fonts.body};
	font-size: 7.2pt; font-weight: 600; letter-spacing: 0.24em;
	color: ${accentInk}; display: block; margin-top: 1.5mm;
}
.tagline { font-size: 8pt; color: #64748B; margin-top: 2.5mm; max-width: 62mm; line-height: 1.4; }
.head-right { text-align: right; font-size: 8.2pt; color: #4A5A6A; line-height: 1.65; }
.head-right .row { white-space: nowrap; }
.rule { height: 2.2pt; background: ${accentInk}; margin: 5mm 0 0; }
.rule-thin { height: 0.6pt; background: ${accentRule}; margin-top: 1.1pt; opacity: 0.55; }

/* ---- title ---- */
.doc-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 10mm; margin: 8mm 0 5mm; }
h1 {
	font-family: ${fonts.display};
	font-size: 15.5pt; font-weight: 700; letter-spacing: -0.01em;
	margin: 0; color: #0B1520; text-transform: uppercase;
}
.meta { text-align: right; font-size: 8.4pt; color: #5A6B7C; line-height: 1.6; white-space: nowrap; }
.meta b { color: #16202B; font-weight: 600; }

/* ---- content ---- */
h2 {
	font-family: ${fonts.body};
	font-size: 8.2pt; font-weight: 700; letter-spacing: 0.13em; text-transform: uppercase;
	color: ${accentInk};
	margin: 6.5mm 0 2.5mm; padding-bottom: 1.2mm;
	border-bottom: 0.5pt solid #D9E2EA;
}
p { margin: 0 0 3mm; }
p:last-child { margin-bottom: 0; }

.pairs { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 8mm; }
.pair { display: grid; grid-template-columns: 30mm 1fr; gap: 3mm; align-items: baseline; }
.pair.span { grid-column: 1 / -1; }
.pair-l { font-size: 7.8pt; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #7A8B9C; }
.pair-v { font-size: 9.8pt; color: #16202B; }

.block { border-left: 2pt solid #E2E9EF; padding-left: 4mm; }

table.grid { width: 100%; border-collapse: collapse; margin: 2mm 0 0; font-size: 9.2pt; }
table.grid th {
	text-align: left; font-size: 7.6pt; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
	color: #5A6B7C; padding: 2mm 2.5mm; border-bottom: 0.8pt solid #C9D5DF; white-space: nowrap;
}
table.grid td { padding: 2.2mm 2.5mm; border-bottom: 0.4pt solid #E6ECF1; vertical-align: top; }
table.grid .num { width: 8mm; color: #8B9AA8; font-variant-numeric: tabular-nums; }
table.grid tr:last-child td { border-bottom: 0.8pt solid #C9D5DF; }
.amount { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }

.totals { margin-top: 3mm; display: flex; justify-content: flex-end; }
.totals table { border-collapse: collapse; min-width: 72mm; font-size: 9.4pt; }
.totals td { padding: 1.8mm 2.5mm; }
.totals td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
.totals tr.grand td {
	border-top: 0.8pt solid #16202B; font-weight: 700; font-size: 10.6pt;
	color: #0B1520; padding-top: 2.2mm;
}

ul.ticks { list-style: none; padding: 0; margin: 2mm 0 0; }
ul.ticks li { position: relative; padding-left: 5.5mm; margin-bottom: 1.8mm; }
ul.ticks li::before {
	content: ''; position: absolute; left: 0; top: 1.6mm;
	width: 2mm; height: 2mm; border-radius: 50%; background: ${accentRule};
}
ol.terms { margin: 2mm 0 0; padding-left: 5mm; }
ol.terms li { margin-bottom: 1.8mm; padding-left: 1mm; }

.callout {
	background: #F2F7FA; border-left: 2.5pt solid ${accentInk};
	padding: 3mm 4mm; margin: 3mm 0 0; font-size: 9.4pt;
}

/* ---- signatures ---- */
.signs {
	display: flex; gap: 12mm; margin-top: 14mm;
	page-break-inside: avoid; break-inside: avoid;
}
.sign { flex: 1; }
.sign-line { border-top: 0.7pt solid #16202B; margin-bottom: 2mm; }
.sign-name { font-size: 9.6pt; font-weight: 600; color: #0B1520; }
.sign-title { font-size: 8.2pt; color: #5A6B7C; }
.sign-role { font-size: 7.4pt; letter-spacing: 0.1em; text-transform: uppercase; color: #8B9AA8; margin-top: 0.8mm; }

/* ---- certificate variant ---- */
.cert { text-align: center; padding: 4mm 0 0; }
.cert .cert-eyebrow { font-size: 8.4pt; letter-spacing: 0.3em; text-transform: uppercase; color: ${accentInk}; }
.cert h1 { font-size: 26pt; letter-spacing: 0.02em; margin: 4mm 0 0; text-transform: none; }
.cert .name {
	font-family: ${fonts.display}; font-size: 24pt; font-weight: 700;
	color: #0B1520; margin: 7mm 0 2mm; border-bottom: 0.7pt solid #D9E2EA;
	display: inline-block; padding: 0 8mm 3mm;
}
.cert .lead { font-size: 10.6pt; color: #4A5A6A; max-width: 130mm; margin: 0 auto; }
.cert .course { font-size: 14pt; font-weight: 600; color: ${accentInk}; margin: 4mm 0 1mm; }

/* ---- footer ---- */
.foot {
	position: fixed; bottom: -11mm; left: 0; right: 0;
	border-top: 0.5pt solid #D9E2EA; padding-top: 2mm;
	font-size: 7.4pt; color: #8B9AA8;
	display: flex; justify-content: space-between; gap: 6mm;
}
${watermark ? `.watermark{position:fixed;top:42%;left:0;right:0;text-align:center;font-family:${fonts.display};font-size:64pt;font-weight:800;color:rgba(11,21,32,0.055);letter-spacing:0.06em;transform:rotate(-18deg);z-index:0;}` : ''}
.sheet { position: relative; z-index: 1; }
</style></head><body>
${watermark ? `<div class="watermark">${escapeHtml(watermark)}</div>` : ''}
<div class="foot">
	<span>${escapeHtml(branding.name)}${contact.address ? ` · ${escapeHtml(contact.address)}` : ''}</span>
	<span>${escapeHtml(contactLine)}</span>
</div>
<div class="sheet">
	<header class="head">
		<div>
			<span class="mark-a">${escapeHtml(branding.logoWordmark)}</span>
			<span class="mark-b">${escapeHtml(branding.logoWordmarkAccent)}</span>
			${branding.tagline ? `<div class="tagline">${escapeHtml(branding.tagline)}</div>` : ''}
		</div>
		<div class="head-right">
			${contact.phone ? `<div class="row">${escapeHtml(contact.phone)}</div>` : ''}
			${contact.email ? `<div class="row">${escapeHtml(contact.email)}</div>` : ''}
			${contact.website ? `<div class="row">${escapeHtml(contact.website)}</div>` : ''}
			${contact.address ? `<div class="row">${escapeHtml(contact.address)}</div>` : ''}
		</div>
	</header>
	<div class="rule"></div><div class="rule-thin"></div>

	<div class="doc-head">
		<h1>${escapeHtml(title)}</h1>
		<div class="meta">
			${reference ? `<div>Ref: <b>${escapeHtml(reference)}</b></div>` : ''}
			${date ? `<div>Date: <b>${escapeHtml(formatDate(date))}</b></div>` : ''}
		</div>
	</div>

	${body}
</div>
</body></html>`;
}
