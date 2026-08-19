/**
 * Template composition entry point and the seed template catalogue.
 */
import { mergeBranding } from '../../config/branding.js';
import { fontStacks, loadFonts } from '../fonts.js';
import { Defs, svgDocument } from '../svg.js';
import { spacing, themePalette, typeScale } from '../tokens.js';
import { FAMILIES, FAMILY_KEYS } from './families.js';

export { FAMILIES, FAMILY_KEYS };

/**
 * Renders a template to an SVG document.
 *
 * @param {object} params
 * @param {object} params.template  template row ({ family, theme, config })
 * @param {object} params.content   content model from buildContent()
 * @param {object} params.canvas    { width, height, shape }
 * @param {object} params.branding  merged branding settings
 * @param {object} params.assets    { product?: ImageAsset, logo?: ImageAsset }
 * @param {number} [params.typeScaleFactor] global type shrink applied on retry
 * @returns {string} SVG markup
 */
export function composeTemplate({ template, content, canvas, branding, assets = {}, typeScaleFactor = 1 }) {
	const family = FAMILIES[template.family];
	if (!family) {
		throw new Error(`Unknown template family: ${template.family}`);
	}

	const brand = mergeBranding(branding);
	const palette = themePalette(brand, template.theme ?? 'dark');
	const fonts = fontStacks(brand);
	const { css } = loadFonts(brand);

	const type = typeScale(canvas);
	if (typeScaleFactor !== 1) {
		for (const key of Object.keys(type)) type[key] = Math.round(type[key] * typeScaleFactor * 100) / 100;
	}

	const defs = new Defs();
	const ctx = {
		canvas,
		branding: brand,
		palette,
		fonts,
		defs,
		type,
		space: spacing(canvas),
		assets,
	};

	const body = family(ctx, content, { ...template, config: template.config ?? {} });

	return svgDocument({
		width: canvas.width,
		height: canvas.height,
		defs,
		children: body,
		fontCss: css,
		background: palette.bg,
	});
}

/**
 * Seed templates inserted on first migration. Administrators may edit,
 * duplicate, deactivate or delete any of these — they are ordinary rows.
 */
export const SEED_TEMPLATES = [
	{
		slug: 'premium-product-square',
		name: 'Premium Product — Square',
		family: 'premium-product',
		theme: 'dark',
		description: 'Large instrument hero, minimal headline, four key specifications and a quote CTA.',
		formatPreset: 'instagram-square',
		outputFormat: 'png',
		config: { maxSpecs: 4, ctaLabel: 'Request a Quote' },
	},
	{
		slug: 'premium-product-portrait',
		name: 'Premium Product — Portrait',
		family: 'premium-product',
		theme: 'dark',
		description: 'Portrait variant with more room for specifications.',
		formatPreset: 'instagram-portrait',
		outputFormat: 'png',
		config: { maxSpecs: 5, ctaLabel: 'Request a Quote' },
	},
	{
		slug: 'instrument-sale',
		name: 'Instrument Sale',
		family: 'instrument-sale',
		theme: 'dark',
		description:
			'The reusable instrument sale layout: configuration, detector, pump, warranty and qualification at a glance.',
		formatPreset: 'instagram-portrait',
		outputFormat: 'png',
		config: { maxSpecs: 5, maxFeatures: 2, ctaLabel: 'Request a Quote' },
	},
	{
		slug: 'modern-glass',
		name: 'Modern Glass',
		family: 'modern-glass',
		theme: 'dark',
		description: 'Single glass card over a controlled gradient with a floating product.',
		formatPreset: 'instagram-square',
		outputFormat: 'png',
		config: { maxSpecs: 3, ctaLabel: 'Talk to a Specialist' },
	},
	{
		slug: 'dark-laboratory',
		name: 'Dark Laboratory',
		family: 'dark-laboratory',
		theme: 'dark',
		description: 'Premium dark background with the instrument under a spotlight.',
		formatPreset: 'instagram-square',
		outputFormat: 'png',
		config: { maxSpecs: 4, ctaLabel: 'View Specifications' },
	},
	{
		slug: 'clean-white-laboratory',
		name: 'Clean White Laboratory',
		family: 'clean-white-laboratory',
		theme: 'light',
		description: 'Light, high-readability technical layout with brand blue accents.',
		formatPreset: 'instagram-square',
		outputFormat: 'png',
		config: { maxSpecs: 4, maxFeatures: 2, ctaLabel: 'Request Details' },
	},
	{
		slug: 'technical-specification',
		name: 'Technical Specification',
		family: 'technical-specification',
		theme: 'dark',
		description: 'Hero product with a grid of specification cards.',
		formatPreset: 'instagram-portrait',
		outputFormat: 'png',
		config: { maxSpecs: 6, ctaLabel: 'Download Brochure' },
	},
	{
		slug: 'refurbished-instrument',
		name: 'Refurbished Instrument',
		family: 'refurbished-instrument',
		theme: 'dark',
		description: 'Certified refurbished badge with condition, configuration and warranty.',
		formatPreset: 'instagram-portrait',
		outputFormat: 'png',
		config: { maxSpecs: 5, badgeLabel: 'Certified Refurbished', ctaLabel: 'Check Availability' },
	},
	{
		slug: 'service-highlight',
		name: 'Service Highlight',
		family: 'service-highlight',
		theme: 'dark',
		description: 'AMC, CMC, calibration and qualification offers led by the scope of work.',
		formatPreset: 'instagram-square',
		outputFormat: 'png',
		config: { maxPillars: 4, ctaLabel: 'Book a Service Visit' },
	},
	{
		slug: 'spare-parts',
		name: 'Spare Parts',
		family: 'spare-parts',
		theme: 'dark',
		description: 'Part image, part number and compatible instruments with an enquiry CTA.',
		formatPreset: 'instagram-square',
		outputFormat: 'png',
		config: { maxCompatible: 4, ctaLabel: 'Enquire Availability' },
	},
	{
		slug: 'company-update',
		name: 'Company Update',
		family: 'company-update',
		theme: 'dark',
		description: 'Announcements, new stock and capability updates in statement type.',
		formatPreset: 'instagram-square',
		outputFormat: 'png',
		config: { ctaLabel: 'Learn More' },
	},
	{
		slug: 'social-story',
		name: 'Social Story',
		family: 'social-story',
		theme: 'dark',
		description: '9:16 story format with a dominant product visual and a full-width CTA.',
		formatPreset: 'story',
		outputFormat: 'png',
		config: { maxSpecs: 3, ctaLabel: 'Swipe Up to Enquire' },
	},
	{
		slug: 'website-banner',
		name: 'Website Banner',
		family: 'premium-product',
		theme: 'dark',
		description: 'Wide banner for the Vision Analytical website hero strip.',
		formatPreset: 'website-banner',
		outputFormat: 'webp',
		config: { maxSpecs: 3, ctaLabel: 'Explore Instruments' },
	},
];
