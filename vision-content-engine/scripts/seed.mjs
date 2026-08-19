#!/usr/bin/env node
/**
 * Seeds a representative product library so the engine can be exercised before
 * real catalogue data is entered.
 *
 * Products are created without images — upload real photography through the
 * admin UI. Templates render a neutral placeholder until then, so nothing
 * breaks and no stand-in imagery is passed off as a product shot.
 *
 *   node scripts/seed.mjs
 */
import { bootstrap } from '../src/bootstrap.js';
import { closeDatabase } from '../src/db/database.js';
import { categories, products } from '../src/db/repositories.js';

const SAMPLES = [
	{
		name: 'Agilent 1260 Infinity II HPLC System',
		brand: 'Agilent',
		model: '1260 Infinity II',
		categorySlug: 'hplc',
		description:
			'Refurbished quaternary HPLC system with diode array detection, suited to routine pharmaceutical QC and method development.',
		detector: 'DAD (G7115A)',
		pump: 'Quaternary G7111B',
		autosampler: 'Vialsampler G7129A',
		software: 'OpenLab CDS 2.x',
		condition: 'Refurbished — Excellent',
		year: '2019',
		configuration: 'Quaternary + DAD',
		warranty: '12 Months',
		installation: 'Included',
		iq_oq_pq: 'Available on request',
		training: 'On-site operator training',
		price: 'On Request',
		stock_status: 'In Stock',
		features: ['Installation and qualification included', 'On-site operator training', '12-month parts warranty'],
		applications: ['Pharmaceutical QC', 'Method development', 'Stability studies'],
		tags: ['hplc', 'agilent', 'refurbished'],
		status: 'published',
	},
	{
		name: 'Shimadzu Nexera X2 UHPLC',
		brand: 'Shimadzu',
		model: 'Nexera X2',
		categorySlug: 'hplc',
		description: 'High-throughput UHPLC platform for demanding analytical workloads.',
		detector: 'SPD-M30A PDA',
		pump: 'LC-30AD Binary',
		autosampler: 'SIL-30AC',
		software: 'LabSolutions',
		condition: 'Refurbished — Very Good',
		year: '2018',
		warranty: '6 Months',
		price: 'On Request',
		stock_status: 'In Stock',
		applications: ['Impurity profiling', 'High-throughput QC'],
		tags: ['uhplc', 'shimadzu'],
		status: 'published',
	},
	{
		name: 'Shimadzu GC-2010 Plus Gas Chromatograph',
		brand: 'Shimadzu',
		model: 'GC-2010 Plus',
		categorySlug: 'gc',
		description: 'Capillary gas chromatograph with FID, configured for residual solvent analysis.',
		detector: 'FID',
		software: 'GCsolution',
		condition: 'Refurbished — Excellent',
		year: '2017',
		warranty: '12 Months',
		price: 'On Request',
		stock_status: 'In Stock',
		applications: ['Residual solvents', 'Purity testing'],
		tags: ['gc', 'shimadzu'],
		status: 'published',
	},
	{
		name: 'UV-1800 UV-Visible Spectrophotometer',
		brand: 'Shimadzu',
		model: 'UV-1800',
		categorySlug: 'uv-visible-spectrophotometer',
		description: 'Double-beam UV-Vis spectrophotometer for routine laboratory measurement.',
		specifications: [
			{ label: 'Wavelength Range', value: '190–1100 nm' },
			{ label: 'Bandwidth', value: '1 nm' },
			{ label: 'Photometric Range', value: '-4 to 4 Abs' },
		],
		condition: 'Refurbished — Good',
		warranty: '6 Months',
		price: 'On Request',
		stock_status: 'In Stock',
		tags: ['uv-vis', 'shimadzu'],
		status: 'published',
	},
	{
		name: 'Deuterium Lamp for UV Detectors',
		brand: 'Compatible',
		model: 'D2-STD',
		categorySlug: 'lamps',
		part_number: 'VA-D2-2000',
		description: 'Long-life deuterium lamp for UV and DAD detectors.',
		compatible_with: ['Agilent 1100 / 1200 / 1260', 'Shimadzu SPD-20A', 'Waters 2489'],
		warranty: '2000 hours',
		price: 'On Request',
		stock_status: 'In Stock',
		tags: ['lamp', 'spare-part'],
		status: 'published',
	},
	{
		name: 'Annual Maintenance Contract',
		brand: 'Vision Analytical',
		model: 'AMC',
		categorySlug: 'amc',
		description:
			'Planned preventive maintenance and priority breakdown support for analytical instruments across Maharashtra and Gujarat.',
		features: [
			'Four preventive maintenance visits per year',
			'Priority breakdown response',
			'Genuine spare parts supply',
			'Calibration and qualification support',
		],
		warranty: 'Contract period',
		calibration: 'Included',
		iq_oq_pq: 'Optional add-on',
		price: 'On Request',
		stock_status: 'Available',
		tags: ['amc', 'service'],
		status: 'published',
	},
	{
		name: 'IQ/OQ/PQ Qualification Service',
		brand: 'Vision Analytical',
		model: 'Qualification',
		categorySlug: 'iq-oq-pq',
		description: 'Documented installation, operational and performance qualification for regulated laboratories.',
		features: [
			'Protocol preparation and execution',
			'Traceable reference standards',
			'Complete documentation pack',
			'Regulatory audit support',
		],
		price: 'On Request',
		stock_status: 'Available',
		tags: ['qualification', 'service'],
		status: 'published',
	},
	{
		name: 'New Refurbished Stock Arrived',
		brand: 'Vision Analytical',
		model: 'Update',
		categorySlug: 'company-updates',
		description:
			'Fresh refurbished HPLC and GC systems are now available, fully tested and ready for installation across Maharashtra and Gujarat.',
		price: '',
		stock_status: '',
		tags: ['update'],
		status: 'published',
	},
];

await bootstrap({ quiet: true });

let created = 0;
let skipped = 0;

for (const sample of SAMPLES) {
	const { categorySlug, ...rest } = sample;
	const category = categories.findBySlug(categorySlug);
	if (!category) {
		console.warn(`! category "${categorySlug}" not found, skipping ${sample.name}`);
		skipped += 1;
		continue;
	}
	// Idempotent: re-running seed does not duplicate the library.
	const existing = products.list({ search: sample.name, limit: 1 });
	if (existing.some((p) => p.name === sample.name)) {
		skipped += 1;
		continue;
	}
	products.create({ ...rest, category_id: category.id });
	created += 1;
}

console.log(`Seeded ${created} product(s); ${skipped} already present.`);
console.log('Upload real product photography through the admin UI to replace the placeholder visual.');
closeDatabase();
