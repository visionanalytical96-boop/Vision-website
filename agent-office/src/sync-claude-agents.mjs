import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config.mjs';
import { loadRoles } from './roles.mjs';
import { log } from './log.mjs';

/** Map office tools onto the Claude Code tools a subagent can realistically use. */
const CLAUDE_TOOLS = 'Read, Grep, Glob, Bash, Write';

/**
 * Mirror each office role into `.claude/agents/` so the same charters can be invoked
 * as Claude Code subagents. The harness stays the source of truth - these are generated.
 */
export function syncClaudeAgents({ repoRoot } = {}) {
	const config = loadConfig();
	const roles = loadRoles(config.paths.roles);
	const root = repoRoot ?? join(config.paths.root, '..');
	const outDir = join(root, '.claude', 'agents');
	mkdirSync(outDir, { recursive: true });

	const company = JSON.parse(readFileSync(join(config.paths.data, 'company.json'), 'utf8'));
	const written = [];

	for (const role of roles) {
		const file = join(outDir, `vision-${role.name}.md`);
		const body = [
			'---',
			`name: vision-${role.name}`,
			`description: ${company.name} office - ${role.description}`,
			`tools: ${CLAUDE_TOOLS}`,
			'---',
			'',
			`<!-- Generated from agent-office/roles/${role.name}.md by \`office sync-agents\`. Edit the role, not this file. -->`,
			'',
			`You are the ${role.name} clone in the ${company.name} agent office - ${role.title}.`,
			'',
			`The office data lives in \`agent-office/data/\` (leads, customers, instruments, amc-contracts, service-tickets, pricebook, engineers, company).`,
			'Read what you need from there with Read/Grep. Write deliverables into `agent-office/out/drafts/` and nowhere else.',
			'',
			`${company.name} - ${company.tagline}`,
			`Territory: ${company.territory.join(', ')}.`,
			'',
			'## Voice',
			'',
			company.voice,
			'',
			'## Your charter',
			'',
			role.body,
			'',
			'## Hard rules',
			'',
			'- Never invent a price, a lead time, a serial number or a compliance claim.',
			'- Every figure must trace to a record in `agent-office/data/`. Cite the record id.',
			'- Everything you produce is a draft for a human. Nothing is sent.',
			'',
		].join('\n');
		writeFileSync(file, body);
		written.push(file);
	}

	log.title(`Synced ${written.length} subagent(s) to .claude/agents/`);
	for (const f of written) log.info(f);
	return written;
}

if (import.meta.url === `file://${process.argv[1]}`) syncClaudeAgents();
