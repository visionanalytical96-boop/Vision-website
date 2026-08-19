/**
 * Seed categories. Administrators may add more at runtime — nothing here is a
 * closed set; these are simply the rows inserted on first migration.
 *
 * `kind` drives which template families are eligible for a category.
 */
export const SEED_CATEGORIES = [
	{ slug: 'instrument-sale', name: 'Instrument Sale', kind: 'product' },
	{ slug: 'refurbished-instrument', name: 'Refurbished Instrument', kind: 'refurbished' },
	{ slug: 'hplc', name: 'HPLC', kind: 'product' },
	{ slug: 'gc', name: 'GC', kind: 'product' },
	{ slug: 'uv-visible-spectrophotometer', name: 'UV-Visible Spectrophotometer', kind: 'product' },
	{ slug: 'lcms', name: 'LCMS', kind: 'product' },
	{ slug: 'gcms', name: 'GCMS', kind: 'product' },
	{ slug: 'analytical-instruments', name: 'Analytical Instruments', kind: 'product' },
	{ slug: 'spare-parts', name: 'Spare Parts', kind: 'part' },
	{ slug: 'hplc-columns', name: 'HPLC Columns', kind: 'part' },
	{ slug: 'pump-parts', name: 'Pump Parts', kind: 'part' },
	{ slug: 'detector-parts', name: 'Detector Parts', kind: 'part' },
	{ slug: 'lamps', name: 'Lamps', kind: 'part' },
	{ slug: 'filters', name: 'Filters', kind: 'part' },
	{ slug: 'amc', name: 'AMC', kind: 'service' },
	{ slug: 'cmc', name: 'CMC', kind: 'service' },
	{ slug: 'calibration', name: 'Calibration', kind: 'service' },
	{ slug: 'iq-oq-pq', name: 'IQ/OQ/PQ', kind: 'service' },
	{ slug: 'preventive-maintenance', name: 'Preventive Maintenance', kind: 'service' },
	{ slug: 'breakdown-service', name: 'Breakdown Service', kind: 'service' },
	{ slug: 'installation', name: 'Installation', kind: 'service' },
	{ slug: 'training', name: 'Training', kind: 'service' },
	{ slug: 'laboratory-solutions', name: 'Laboratory Solutions', kind: 'service' },
	{ slug: 'software-support', name: 'Software Support', kind: 'service' },
	{ slug: 'service-updates', name: 'Service Updates', kind: 'update' },
	{ slug: 'company-updates', name: 'Company Updates', kind: 'update' },
];

export const CATEGORY_KINDS = ['product', 'refurbished', 'part', 'service', 'update'];

/** Template families that suit each category kind, best match first. */
export const KIND_TEMPLATE_PREFERENCE = {
	product: [
		'premium-product',
		'instrument-sale',
		'technical-specification',
		'dark-laboratory',
		'modern-glass',
		'clean-white-laboratory',
		'social-story',
	],
	refurbished: [
		'refurbished-instrument',
		'premium-product',
		'instrument-sale',
		'dark-laboratory',
		'social-story',
	],
	part: ['spare-parts', 'clean-white-laboratory', 'technical-specification', 'social-story'],
	service: ['service-highlight', 'clean-white-laboratory', 'modern-glass', 'social-story'],
	update: ['company-update', 'modern-glass', 'social-story'],
};

export function slugify(value) {
	return String(value)
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[^\w\s-]/g, '')
		.trim()
		.replace(/[\s_]+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 80);
}
