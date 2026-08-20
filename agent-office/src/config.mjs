import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** @typedef {{company:string,dryRun:boolean,provider:string,models:Record<string,string>,limits:Record<string,any>,policy:Record<string,any>,paths:{root:string,data:string,roles:string,out:string,runs:string,drafts:string}}} OfficeConfig */

const DEFAULTS = {
	company: 'Vision Analytical',
	dryRun: true,
	provider: 'anthropic',
	models: { planner: 'claude-opus-5', worker: 'claude-sonnet-5', reviewer: 'claude-opus-5' },
	limits: {
		concurrency: 3,
		maxWorkItems: 40,
		maxHandoffDepth: 3,
		maxStepsPerAgent: 8,
		maxTokensPerAgent: 4000,
	},
	policy: {},
};

function deepMerge(base, override) {
	const out = { ...base };
	for (const [key, value] of Object.entries(override ?? {})) {
		out[key] =
			value && typeof value === 'object' && !Array.isArray(value)
				? deepMerge(base?.[key] ?? {}, value)
				: value;
	}
	return out;
}

/**
 * Load office config: defaults < office.config.json < env < explicit overrides.
 * `OFFICE_PROVIDER=stub` runs the whole office without an API key (tests and demos).
 * @param {Record<string, any>} [overrides]
 * @returns {OfficeConfig}
 */
export function loadConfig(overrides = {}) {
	const file = join(ROOT, 'office.config.json');
	const fromFile = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
	const cfg = deepMerge(deepMerge(DEFAULTS, fromFile), overrides);

	if (process.env.OFFICE_PROVIDER) cfg.provider = process.env.OFFICE_PROVIDER;
	if (process.env.OFFICE_DRY_RUN === 'false') cfg.dryRun = false;
	if (cfg.provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) cfg.provider = 'stub';

	const out = process.env.OFFICE_OUT_DIR ? resolve(process.env.OFFICE_OUT_DIR) : join(ROOT, 'out');
	cfg.paths = {
		root: ROOT,
		data: join(ROOT, 'data'),
		roles: join(ROOT, 'roles'),
		out,
		runs: join(out, 'runs'),
		drafts: join(out, 'drafts'),
	};
	return cfg;
}
