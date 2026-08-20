import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @typedef {{name:string,title:string,tier:'planner'|'worker'|'reviewer',tools:string[]|['*'],
 *   description:string,model?:string,body:string,file:string}} Role
 */

/** Deliberately tiny frontmatter reader - scalars and `[a, b]` lists only. */
export function parseFrontmatter(raw) {
	const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
	if (!match) return { meta: {}, body: raw.trim() };

	const meta = {};
	for (const line of match[1].split(/\r?\n/)) {
		const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim());
		if (!kv) continue;
		const [, key, rawValue] = kv;
		const value = rawValue.trim();
		if (value.startsWith('[')) {
			meta[key] = value
				.replace(/^\[|\]$/g, '')
				.split(',')
				.map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
				.filter(Boolean);
		} else {
			meta[key] = value.replace(/^['"]|['"]$/g, '');
		}
	}
	return { meta, body: match[2].trim() };
}

/** @returns {Role[]} */
export function loadRoles(rolesDir) {
	if (!existsSync(rolesDir)) throw new Error(`Roles directory missing: ${rolesDir}`);

	const roles = readdirSync(rolesDir)
		.filter((f) => f.endsWith('.md'))
		.map((file) => {
			const path = join(rolesDir, file);
			const { meta, body } = parseFrontmatter(readFileSync(path, 'utf8'));
			const name = meta.name ?? file.replace(/\.md$/, '');
			if (!meta.title) throw new Error(`Role ${name} is missing a title`);
			if (!body) throw new Error(`Role ${name} has an empty charter`);
			return {
				name,
				title: meta.title,
				tier: meta.tier ?? 'worker',
				tools: Array.isArray(meta.tools) ? meta.tools : meta.tools ? [meta.tools] : ['*'],
				description: meta.description ?? meta.title,
				model: meta.model,
				body,
				file: path,
			};
		});

	const seen = new Set();
	for (const role of roles) {
		if (seen.has(role.name)) throw new Error(`Duplicate role name: ${role.name}`);
		seen.add(role.name);
	}
	return roles.sort((a, b) => a.name.localeCompare(b.name));
}

/** @param {Role} role */
export function toolsFor(role, allTools) {
	if (role.tools.includes('*')) return allTools;
	const granted = allTools.filter((t) => role.tools.includes(t.name));
	const unknown = role.tools.filter((n) => !allTools.some((t) => t.name === n));
	if (unknown.length) throw new Error(`Role ${role.name} grants unknown tools: ${unknown.join(', ')}`);
	return granted;
}

export function modelFor(role, config) {
	return role.model ?? config.models[role.tier] ?? config.models.worker;
}
