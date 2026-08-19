/**
 * Product → renderable content model.
 *
 * Templates never read raw product rows. This module decides what is worth
 * showing for a given category and template, and caps list lengths so designs
 * stay uncrowded regardless of how much data a product carries.
 */
import { displayCase } from '../design/text.js';

/** Fields that make good specification rows, in priority order. */
const DERIVED_SPEC_FIELDS = [
	['detector', 'Detector'],
	['pump', 'Pump'],
	['autosampler', 'Autosampler'],
	['software', 'Software'],
	['configuration', 'Configuration'],
	['condition', 'Condition'],
	['year', 'Year'],
	['warranty', 'Warranty'],
];

const SERVICE_SPEC_FIELDS = [
	['warranty', 'Coverage'],
	['calibration', 'Calibration'],
	['iqOqPq', 'Qualification'],
	['installation', 'Installation'],
	['training', 'Training'],
];

function normaliseSpecList(raw) {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw
			.map((entry) => {
				if (!entry) return null;
				if (typeof entry === 'string') {
					const idx = entry.indexOf(':');
					if (idx === -1) return { label: 'Spec', value: entry.trim() };
					return { label: entry.slice(0, idx).trim(), value: entry.slice(idx + 1).trim() };
				}
				const label = entry.label ?? entry.name ?? entry.key;
				const value = entry.value ?? entry.val;
				return label && value ? { label: String(label), value: String(value) } : null;
			})
			.filter(Boolean);
	}
	if (typeof raw === 'object') {
		return Object.entries(raw)
			.filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
			.map(([label, value]) => ({ label: displayCase(label), value: String(value) }));
	}
	return [];
}

function toArray(raw) {
	if (!raw) return [];
	if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
	return String(raw)
		.split(/[\n;•]+/)
		.map((v) => v.trim())
		.filter(Boolean);
}

/**
 * Builds the content model.
 *
 * @param {object} product
 * @param {object} options - { category, template, branding, overrides }
 */
export function buildContent(product, { category, template, branding, overrides = {} } = {}) {
	const config = template?.config ?? {};
	const kind = category?.kind ?? 'product';

	const brandModel = [product.brand, product.model].filter(Boolean).join(' · ');

	// Specifications: explicit list first, then derived fields to fill the gap.
	const explicit = normaliseSpecList(product.specifications);
	const derivedSource = kind === 'service' ? SERVICE_SPEC_FIELDS : DERIVED_SPEC_FIELDS;
	const derived = derivedSource
		.map(([field, label]) => {
			const value = product[field];
			return value !== null && value !== undefined && String(value).trim() !== ''
				? { label, value: String(value).trim() }
				: null;
		})
		.filter(Boolean);

	const seen = new Set();
	const specs = [...explicit, ...derived].filter((spec) => {
		const key = spec.label.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	const features = toArray(product.features);
	const applications = toArray(product.applications);

	const eyebrow = overrides.eyebrow ?? config.eyebrow ?? category?.name ?? product.category ?? '';

	const title = overrides.title ?? product.name ?? 'Untitled';
	const subtitle =
		overrides.subtitle ??
		(brandModel || product.description ? brandModel || truncateWords(product.description, 18) : '');

	const cta = overrides.cta ?? config.ctaLabel ?? defaultCta(kind);

	const badgeLabel =
		overrides.badge ??
		config.badgeLabel ??
		(kind === 'refurbished' ? 'Certified Refurbished' : product.stockStatus === 'In Stock' ? 'In Stock' : '');

	return {
		kind,
		eyebrow,
		title,
		subtitle,
		description: overrides.description ?? product.description ?? '',
		brand: product.brand ?? '',
		model: product.model ?? '',
		condition: product.condition ?? '',
		specs,
		features,
		applications,
		price: config.showPrice === false ? '' : (overrides.price ?? product.price ?? ''),
		priceType: product.priceType ?? '',
		stockStatus: product.stockStatus ?? '',
		warranty: product.warranty ?? '',
		partNumber: product.partNumber ?? product.model ?? '',
		compatibleWith: toArray(product.compatibleWith ?? product.applications),
		badgeLabel,
		cta,
		website: branding?.contact?.website ?? '',
		footerItems: overrides.footerItems ?? null,
	};
}

function defaultCta(kind) {
	switch (kind) {
		case 'service':
			return 'Book a Service Visit';
		case 'part':
			return 'Enquire Availability';
		case 'update':
			return 'Learn More';
		default:
			return 'Request a Quote';
	}
}

function truncateWords(value, count) {
	const words = String(value ?? '').split(/\s+/).filter(Boolean);
	if (words.length <= count) return words.join(' ');
	return `${words.slice(0, count).join(' ')}…`;
}
