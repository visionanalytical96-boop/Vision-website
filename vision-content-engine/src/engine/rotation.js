/**
 * Smart content rotation.
 *
 * Picks the next product / template / category so the feed stays varied:
 * never-published content first, then the least recently published, and a
 * product+template+category combination is not repeated until the configured
 * rotation window has passed.
 */
import { categories, products, rotation, templates } from '../db/repositories.js';
import { KIND_TEMPLATE_PREFERENCE } from '../domain/categories.js';

export const DEFAULT_ROTATION = {
	windowDays: 30,
	categoryRotation: true,
	templateRotation: true,
	productRotation: true,
};

/**
 * @param {object} options
 * @param {number} [options.categoryId] pin a category
 * @param {number} [options.productId]  pin a product
 * @param {number} [options.templateId] pin a template
 * @param {object} [options.settings]   rotation settings
 * @returns {{product:object, template:object, category:object|null, relaxed:boolean}|null}
 */
export function selectNext({ categoryId = null, productId = null, templateId = null, settings = {} } = {}) {
	const cfg = { ...DEFAULT_ROTATION, ...settings };
	const recentCombos = rotation.recentCombos(cfg.windowDays);

	const pinnedProduct = productId ? products.find(productId) : null;
	const pinnedTemplate = templateId ? templates.find(templateId) : null;

	// Category order: pinned, else least recently used first.
	const categoryOrder = categoryId
		? [categories.find(categoryId)].filter(Boolean)
		: orderCategories(cfg);

	// Two passes: honour the rotation window first, then relax it rather than
	// producing nothing when the library is small.
	for (const relaxed of [false, true]) {
		for (const category of categoryOrder.length ? categoryOrder : [null]) {
			const candidateProducts = pinnedProduct
				? [pinnedProduct]
				: products.rotationCandidates({ categoryId: category?.id ?? null });
			if (!candidateProducts.length) continue;

			for (const product of candidateProducts) {
				const effectiveCategory = category ?? (product.category_id ? categories.find(product.category_id) : null);
				const candidateTemplates = pinnedTemplate
					? [pinnedTemplate]
					: templatesFor(effectiveCategory, cfg);
				if (!candidateTemplates.length) continue;

				for (const template of candidateTemplates) {
					const key = rotation.comboKey(product.id, template.id, effectiveCategory?.id ?? null);
					if (!relaxed && recentCombos.has(key)) continue;
					return { product, template, category: effectiveCategory, relaxed };
				}
			}
		}
	}
	return null;
}

/** Active categories that actually have publishable products, LRU first. */
function orderCategories(cfg) {
	const all = categories.list({ activeOnly: true });
	const withStock = all.filter((category) => products.rotationCandidates({ categoryId: category.id }).length > 0);
	const pool = withStock.length ? withStock : all;
	if (!cfg.categoryRotation) return pool;
	return [...pool].sort((a, b) => {
		if (a.usage_count !== b.usage_count) return a.usage_count - b.usage_count;
		return String(a.last_used_at ?? '').localeCompare(String(b.last_used_at ?? ''));
	});
}

/** Templates suited to the category kind, least recently used first. */
function templatesFor(category, cfg) {
	const preferred = KIND_TEMPLATE_PREFERENCE[category?.kind ?? 'product'] ?? [];
	const candidates = templates.rotationCandidates(preferred);
	if (!cfg.templateRotation) return candidates;
	// rotationCandidates already orders by usage; keep preferred families ahead
	// of the rest so a service post does not land on a spare-parts layout.
	const rank = (template) => {
		const index = preferred.indexOf(template.family);
		return index === -1 ? preferred.length : index;
	};
	return [...candidates].sort((a, b) => rank(a) - rank(b) || a.usage_count - b.usage_count);
}

/** Records a selection so it is not repeated inside the rotation window. */
export function recordSelection({ product, template, category }) {
	rotation.record({
		productId: product?.id ?? null,
		templateId: template?.id ?? null,
		categoryId: category?.id ?? null,
	});
	if (template?.id) templates.markUsed(template.id);
	if (category?.id) categories.markUsed(category.id);
}
