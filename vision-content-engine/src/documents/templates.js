/**
 * The A4 documents. Each takes the filled field values and returns the body
 * HTML; the shared shell in layout.js supplies the letterhead and footer.
 */
import { rupeesInWords } from './amount-words.js';
import {
	dataTable,
	escapeHtml,
	formatDate,
	lines,
	pair,
	paragraphs,
	signatures,
} from './layout.js';

/** Default employment terms, used when the operator leaves the field blank. */
const STANDARD_TERMS = [
	'Your appointment is subject to verification of the documents and references provided by you.',
	'You shall devote your full working time to the company and shall not engage in any other employment during your tenure.',
	'You shall maintain strict confidentiality of all technical, commercial and customer information.',
	'Either party may terminate this employment by giving one month’s notice in writing, or salary in lieu thereof.',
	'You shall be governed by the service rules and policies of the company as amended from time to time.',
];

/* ------------------------------------------------------------------ */

export function letterhead(v) {
	const address = v.recipientAddress ? paragraphs(v.recipientAddress) : '';
	return `
	${
		v.recipient || address
			? `<div class="block" style="margin-bottom:6mm">
					${v.recipient ? `<p style="font-weight:600;margin-bottom:1mm">${escapeHtml(v.recipient)}</p>` : ''}
					${address}
				</div>`
			: ''
	}
	${v.subject ? `<p style="font-weight:600;margin-bottom:4mm">Subject: ${escapeHtml(v.subject)}</p>` : ''}
	${paragraphs(v.body)}
	${signatures([{ name: v.signatoryName, title: v.signatoryTitle, role: 'For ' + (v.companyName ?? '') }])}`;
}

/* ------------------------------------------------------------------ */

export function serviceReport(v) {
	const parts = dataTable(['Part name', 'Part number', 'Qty'], v.partsUsed ?? []);
	return `
	<h2>Customer</h2>
	<div class="pairs">
		${pair('Company', v.customer, { span: 2 })}
		${pair('Address', v.customerAddress, { span: 2 })}
		${pair('Contact', v.contactPerson)}
		${pair('Visit date', formatDate(v.visitDate))}
	</div>

	<h2>Instrument</h2>
	<div class="pairs">
		${pair('Instrument', v.instrument, { span: 2 })}
		${pair('Model', v.model)}
		${pair('Serial no.', v.serialNumber)}
		${pair('Call type', v.callType)}
		${pair('Status', v.instrumentStatus)}
	</div>

	${
		v.problemReported
			? `<h2>Problem reported</h2><div class="block">${paragraphs(v.problemReported)}</div>`
			: ''
	}

	<h2>Work carried out</h2>
	<div class="block">${paragraphs(v.workDone)}</div>

	${parts ? `<h2>Parts used</h2>${parts}` : ''}

	${
		v.recommendations
			? `<h2>Recommendations</h2><div class="callout">${paragraphs(v.recommendations)}</div>`
			: ''
	}

	${signatures([
		{ name: v.engineerName, title: 'Service Engineer', role: 'Vision Analytical' },
		{ name: v.customerSignatory || ' ', title: 'Received by', role: v.customer ?? 'Customer' },
	])}`;
}

/* ------------------------------------------------------------------ */

export function offerLetter(v, branding) {
	const terms = lines(v.terms).length ? lines(v.terms) : STANDARD_TERMS;
	const company = branding?.name ?? 'the company';

	return `
	${
		v.candidateName
			? `<div class="block" style="margin-bottom:6mm">
					<p style="font-weight:600;margin-bottom:1mm">${escapeHtml(v.candidateName)}</p>
					${v.candidateAddress ? paragraphs(v.candidateAddress) : ''}
				</div>`
			: ''
	}

	<p style="font-weight:600;margin-bottom:4mm">Subject: Offer of Appointment — ${escapeHtml(v.designation ?? '')}</p>

	<p>Dear ${escapeHtml(v.candidateName ?? 'Candidate')},</p>

	<p>Further to our discussions, we are pleased to offer you the position of
	<strong>${escapeHtml(v.designation ?? '')}</strong>${v.department ? ` in the ${escapeHtml(v.department)} department` : ''}
	at ${escapeHtml(company)}${v.location ? `, based at ${escapeHtml(v.location)}` : ''}.</p>

	<h2>Terms of appointment</h2>
	<div class="pairs">
		${pair('Designation', v.designation)}
		${pair('Department', v.department)}
		${pair('Date of joining', formatDate(v.joiningDate))}
		${pair('Place of posting', v.location)}
		${pair('Annual CTC', v.ctc)}
		${pair('Probation', v.probation)}
		${pair('Reporting to', v.reportingTo)}
	</div>

	<h2>Conditions</h2>
	<ol class="terms">${terms.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ol>

	<p style="margin-top:5mm">We look forward to welcoming you to the team. Kindly sign and return a copy of
	this letter as a token of your acceptance.</p>

	${signatures([
		{ name: v.signatoryName, title: v.signatoryTitle, role: `For ${company}` },
		{ name: v.candidateName || ' ', title: 'Accepted by', role: 'Candidate signature and date' },
	])}`;
}

/* ------------------------------------------------------------------ */

/** Parses a money-ish string into a number, tolerating ₹, commas and spaces. */
function toNumber(value) {
	const n = Number.parseFloat(String(value ?? '').replace(/[^0-9.-]/g, ''));
	return Number.isFinite(n) ? n : 0;
}

const money = (n) =>
	`₹ ${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function invoice(v) {
	const rows = (v.items ?? []).filter((r) => r.some((c) => String(c ?? '').trim()));

	// The amount column is computed when left blank, so an operator can enter
	// quantity and rate alone and still get correct totals.
	const priced = rows.map((r) => {
		const [description, hsn, qty, rate, amount] = r;
		const computed = amount && String(amount).trim() ? toNumber(amount) : toNumber(qty) * toNumber(rate);
		return { description, hsn, qty, rate, amount: computed };
	});

	const subtotal = priced.reduce((sum, r) => sum + r.amount, 0);
	const taxRate = toNumber(v.taxRate);
	const tax = subtotal * (taxRate / 100);
	const grand = subtotal + tax;

	const table = priced.length
		? `<table class="grid">
			<thead><tr>
				<th class="num">#</th><th>Description</th><th>HSN/SAC</th>
				<th class="amount">Qty</th><th class="amount">Rate</th><th class="amount">Amount</th>
			</tr></thead>
			<tbody>${priced
				.map(
					(r, i) => `<tr>
					<td class="num">${i + 1}</td>
					<td>${escapeHtml(r.description ?? '')}</td>
					<td>${escapeHtml(r.hsn ?? '')}</td>
					<td class="amount">${escapeHtml(r.qty ?? '')}</td>
					<td class="amount">${r.rate ? money(toNumber(r.rate)) : ''}</td>
					<td class="amount">${money(r.amount)}</td>
				</tr>`,
				)
				.join('')}</tbody>
		</table>`
		: '';

	return `
	<div class="pairs">
		${pair('Bill to', v.billTo, { span: 2 })}
		${pair('Address', v.billToAddress, { span: 2 })}
		${pair('GSTIN', v.gstin)}
		${pair('PO / Ref', v.poNumber)}
		${pair('Due by', formatDate(v.dueDate))}
	</div>

	<h2>Items</h2>
	${table || '<p style="color:#8B9AA8">No line items entered.</p>'}

	${
		priced.length
			? `<div class="totals"><table>
					<tr><td>Subtotal</td><td>${money(subtotal)}</td></tr>
					${taxRate ? `<tr><td>GST @ ${taxRate}%</td><td>${money(tax)}</td></tr>` : ''}
					<tr class="grand"><td>Total</td><td>${money(grand)}</td></tr>
				</table></div>`
			: ''
	}

	${
		priced.length
			? `<p style="margin-top:4mm"><strong>Amount in words:</strong> ${escapeHtml(rupeesInWords(grand))}</p>`
			: ''
	}

	${v.paymentTerms ? `<h2>Payment terms</h2><div class="callout">${paragraphs(v.paymentTerms)}</div>` : ''}

	${signatures([{ name: v.signatoryName, title: 'Authorised Signatory' }])}`;
}

/* ------------------------------------------------------------------ */

export function trainingCertificate(v, branding) {
	const topics = lines(v.topics);
	const period = [formatDate(v.fromDate), formatDate(v.toDate)].filter(Boolean).join(' — ');

	return `
	<div class="cert">
		<div class="cert-eyebrow">Certificate of Completion</div>
		<div class="name">${escapeHtml(v.participantName ?? '')}</div>
		<p class="lead">
			${v.organisation ? `of ${escapeHtml(v.organisation)}<br>` : ''}
			has successfully completed the training programme conducted by ${escapeHtml(branding?.name ?? '')}
		</p>
		<div class="course">${escapeHtml(v.courseTitle ?? '')}</div>
		<p class="lead" style="font-size:9.6pt">
			${[v.instrument, period, v.durationHours, v.venue].filter(Boolean).map(escapeHtml).join('  ·  ')}
		</p>
	</div>

	${
		topics.length
			? `<h2 style="margin-top:9mm">Topics covered</h2>
				<ul class="ticks">${topics.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`
			: ''
	}

	${signatures([
		{ name: v.trainerName, title: 'Trainer' },
		{ name: v.signatoryName, title: v.signatoryTitle || 'Authorised Signatory' },
	])}`;
}

/* ------------------------------------------------------------------ */

/** Title shown under the letterhead, and any watermark. */
export const DOCUMENT_META = {
	letterhead: { title: (v) => v.subject || 'Letter', watermark: null },
	'service-report': { title: () => 'Service Report', watermark: null },
	'offer-letter': { title: () => 'Letter of Appointment', watermark: null },
	invoice: {
		title: (v) => v.documentKind || 'Tax Invoice',
		watermark: (v) => (/quotation|proforma/i.test(v.documentKind ?? '') ? v.documentKind.toUpperCase() : null),
	},
	'training-certificate': { title: () => 'Training Certificate', watermark: null },
};

export const DOCUMENT_BUILDERS = {
	letterhead,
	'service-report': serviceReport,
	'offer-letter': offerLetter,
	invoice,
	'training-certificate': trainingCertificate,
};
