/**
 * Field definitions for each A4 document.
 *
 * The admin form is generated from these definitions rather than hand-built per
 * document, so adding a field to a document means editing one array here and
 * nothing else. `type` drives the input control; `key` is what the template
 * reads.
 */

/** @typedef {{key:string,label:string,type:string,required?:boolean,hint?:string,options?:string[],width?:'full'|'half'}} Field */

const text = (key, label, extra = {}) => ({ key, label, type: 'text', width: 'half', ...extra });
const area = (key, label, extra = {}) => ({ key, label, type: 'textarea', width: 'full', ...extra });
const date = (key, label, extra = {}) => ({ key, label, type: 'date', width: 'half', ...extra });
const list = (key, label, extra = {}) => ({ key, label, type: 'lines', width: 'full', ...extra });
const table = (key, label, columns, extra = {}) => ({ key, label, type: 'table', columns, width: 'full', ...extra });

/** Fields every document carries. */
const COMMON = [
	text('reference', 'Reference No.', { hint: 'e.g. VA/2026/0142' }),
	date('date', 'Date', { required: true }),
];

export const DOCUMENT_FIELDS = {
	letterhead: {
		name: 'Company Letterhead',
		description: 'Blank branded letterhead for any office letter you write yourself.',
		fields: [
			...COMMON,
			text('recipient', 'To (name)', { width: 'half' }),
			area('recipientAddress', 'To (address)', { width: 'full' }),
			text('subject', 'Subject', { width: 'full' }),
			area('body', 'Letter body', {
				required: true,
				hint: 'Write the letter. Leave a blank line between paragraphs.',
			}),
			text('signatoryName', 'Signed by (name)'),
			text('signatoryTitle', 'Designation'),
		],
	},

	'service-report': {
		name: 'Service Report',
		description: 'Field service report for an instrument visit — work done, parts used, engineer sign-off.',
		fields: [
			...COMMON,
			text('customer', 'Customer / Company', { required: true }),
			area('customerAddress', 'Customer address'),
			text('contactPerson', 'Contact person'),
			text('instrument', 'Instrument', { required: true, hint: 'e.g. Agilent 1260 Infinity II HPLC' }),
			text('model', 'Model'),
			text('serialNumber', 'Serial number'),
			text('callType', 'Type of call', {
				type: 'select',
				options: ['Breakdown', 'Preventive Maintenance', 'Installation', 'Calibration', 'IQ/OQ/PQ', 'AMC Visit', 'Training'],
			}),
			date('visitDate', 'Visit date'),
			area('problemReported', 'Problem reported', { hint: 'What the customer reported.' }),
			area('workDone', 'Work carried out', { required: true }),
			table('partsUsed', 'Parts used', ['Part name', 'Part number', 'Qty']),
			text('instrumentStatus', 'Instrument status', {
				type: 'select',
				options: ['Working — handed over', 'Working — under observation', 'Pending spare parts', 'Not repaired'],
			}),
			area('recommendations', 'Recommendations'),
			text('engineerName', 'Service engineer', { required: true }),
			text('customerSignatory', 'Received by (customer)'),
		],
	},

	'offer-letter': {
		name: 'Offer / Appointment Letter',
		description: 'Employment offer or appointment letter on company letterhead.',
		fields: [
			...COMMON,
			text('candidateName', 'Candidate name', { required: true }),
			area('candidateAddress', 'Candidate address'),
			text('designation', 'Designation', { required: true }),
			text('department', 'Department'),
			text('location', 'Place of posting'),
			date('joiningDate', 'Date of joining', { required: true }),
			text('ctc', 'Annual CTC', { hint: 'e.g. ₹ 4,80,000 per annum' }),
			text('probation', 'Probation period', { hint: 'e.g. 6 months' }),
			text('reportingTo', 'Reporting to'),
			list('terms', 'Terms and conditions', {
				hint: 'One per line. Leave blank to use the standard set.',
			}),
			text('signatoryName', 'Signed by (name)', { required: true }),
			text('signatoryTitle', 'Designation'),
		],
	},

	invoice: {
		name: 'Invoice / Quotation',
		description: 'Tax invoice, quotation or payment receipt with line items and totals.',
		fields: [
			{
				key: 'documentKind',
				label: 'Document type',
				type: 'select',
				width: 'half',
				options: ['Tax Invoice', 'Quotation', 'Proforma Invoice', 'Payment Receipt'],
				required: true,
			},
			...COMMON,
			text('billTo', 'Bill to (company)', { required: true }),
			area('billToAddress', 'Billing address'),
			text('gstin', 'Customer GSTIN'),
			text('poNumber', 'PO / Reference'),
			date('dueDate', 'Payment due by'),
			table('items', 'Line items', ['Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount']),
			text('taxRate', 'GST rate (%)', { hint: 'e.g. 18' }),
			area('paymentTerms', 'Payment terms / bank details'),
			text('signatoryName', 'Authorised signatory'),
		],
	},

	'training-certificate': {
		name: 'Training Certificate',
		description: 'Certificate of completion for operator or maintenance training.',
		fields: [
			...COMMON,
			text('participantName', 'Participant name', { required: true }),
			text('organisation', 'Organisation'),
			text('courseTitle', 'Training title', {
				required: true,
				width: 'full',
				hint: 'e.g. HPLC Operation and Preventive Maintenance',
			}),
			text('instrument', 'Instrument covered'),
			date('fromDate', 'Training from'),
			date('toDate', 'Training to'),
			text('durationHours', 'Duration', { hint: 'e.g. 16 hours' }),
			text('venue', 'Venue'),
			list('topics', 'Topics covered', { hint: 'One per line.' }),
			text('trainerName', 'Trainer', { required: true }),
			text('signatoryName', 'Countersigned by'),
			text('signatoryTitle', 'Designation'),
		],
	},
};

export const DOCUMENT_KEYS = Object.keys(DOCUMENT_FIELDS);

/** Flat field list for a document, for validation and form building. */
export function fieldsFor(key) {
	return DOCUMENT_FIELDS[key]?.fields ?? [];
}

/**
 * Checks the submitted values against the schema.
 * @returns {{ok:boolean, errors:string[]}}
 */
export function validateFields(key, values = {}) {
	const errors = [];
	for (const field of fieldsFor(key)) {
		if (!field.required) continue;
		const value = values[field.key];
		const empty =
			value === undefined ||
			value === null ||
			(typeof value === 'string' && !value.trim()) ||
			(Array.isArray(value) && value.length === 0);
		if (empty) errors.push(`${field.label} is required`);
	}
	return { ok: errors.length === 0, errors };
}
