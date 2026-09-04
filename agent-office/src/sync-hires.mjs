import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config.mjs';
import { loadRoles } from './roles.mjs';
import { log } from './log.mjs';

/**
 * Generate Munder Difflin hire manifests from the office's role charters.
 * The charter stays the single source of truth: `roles/*.md` feeds the headless
 * harness, the Claude Code subagents, and these importable hires.
 *
 * Schema: munder-difflin/hire@1 - importing a manifest never auto-spawns anything,
 * it only pre-fills the Add Agent dialog for a human to review.
 */

const GOAL_MAX = 4000;
const DESCRIPTION_MAX = 200;

/** Charters are written for a system prompt; a goal field is one prose block. */
export function charterToGoal(role, company) {
	const prose = role.body
		.split('\n')
		.filter((line) => !line.startsWith('##')) // section headings carry no meaning inline
		.join('\n')
		.replace(/\*\*/g, '')
		.replace(/`/g, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	const preamble = `You are the ${role.name} desk at ${company.name}, ${company.tagline}. Territory: ${company.territory.join('; ')}.`;
	const hardRules = [
		'Hard rules that outrank everything else:',
		'- Never invent a price, lead time, serial number or compliance claim. If it is not in a record, say so or escalate.',
		'- Every figure must trace to a source. Cite the record id inline.',
		'- You draft, the human sends. Nothing you write goes to a customer by itself.',
	].join('\n');

	const goal = `${preamble}\n\n${prose}\n\n${hardRules}`;
	if (goal.length <= GOAL_MAX) return goal;

	// Trim the charter body, never the hard rules.
	const room = GOAL_MAX - preamble.length - hardRules.length - 20;
	const cut = prose.slice(0, room);
	const trimmed = cut.slice(0, cut.lastIndexOf('\n') > 0 ? cut.lastIndexOf('\n') : cut.length);
	return `${preamble}\n\n${trimmed}\n\n${hardRules}`;
}

/** @param {{provider?:string, model?:string, outDir?:string}} [opts] */
export function syncHires(opts = {}) {
	const config = loadConfig();
	const roles = loadRoles(config.paths.roles);
	const company = JSON.parse(readFileSync(join(config.paths.data, 'company.json'), 'utf8'));
	const outDir = opts.outDir ?? join(config.paths.root, 'hires');
	mkdirSync(outDir, { recursive: true });

	const provider = opts.provider ?? 'claude';
	// The app's own suggestion list; a newer model can be picked in the Add Agent dialog.
	const modelFor = (role) =>
		opts.model ?? (role.tier === 'planner' || role.tier === 'reviewer' ? 'claude-opus-4-8' : 'claude-sonnet-4-6');

	const written = [];
	for (const role of roles) {
		// Name the clone after its office-floor sprite, as the upstream gallery does;
		// the desk it runs is what the card's description says.
		const person = capitalise(role.character ?? role.name);
		const manifest = {
			spec: 'munder-difflin/hire@1',
			name: person,
			description: `${role.title.split(' - ')[0]} - ${role.description}`.slice(0, DESCRIPTION_MAX),
			goal: charterToGoal(role, company),
			character: role.character ?? 'oscar',
			accent: role.accent ?? 'sky',
			provider,
			model: modelFor(role),
			capabilities: [role.name, ...(role.capabilities ?? [])].slice(0, 12),
			isolate: false,
			author: company.name,
		};
		const file = join(outDir, `${role.name}.hire.json`);
		writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
		written.push({ file, manifest });
	}

	writeFileSync(
		join(outDir, 'index.json'),
		`${JSON.stringify(
			{
				office: company.name,
				generated: new Date().toISOString().slice(0, 10),
				note: 'Generated from agent-office/roles/*.md by `office sync-hires`. Edit the charter, not these files.',
				hires: written.map((w) => ({
					file: w.file.split('/').pop(),
					name: w.manifest.name,
					desk: w.manifest.capabilities[0],
					description: w.manifest.description,
				})),
			},
			null,
			2,
		)}\n`,
	);

	log.title(`Generated ${written.length} hire manifest(s) in hires/`);
	for (const w of written) log.info(`${w.manifest.name.padEnd(26)} ${w.manifest.character}/${w.manifest.accent}  ${w.manifest.model}`);
	return written;
}

function capitalise(name) {
	return name
		.split('-')
		.map((part) => part[0].toUpperCase() + part.slice(1))
		.join('-');
}

if (import.meta.url === `file://${process.argv[1]}`) syncHires();
